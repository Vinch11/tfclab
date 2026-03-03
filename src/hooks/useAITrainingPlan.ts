/**
 * Hook for streaming AI training plan generation
 * Persists streaming state to localStorage to survive tab switches / navigation
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";

const PLAN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-training-plan`;
const STREAM_KEY = "tfcl_ai_plan_streaming";

export interface PlanAthleteData {
  nom?: string;
  ftp?: number | null;
  weightKg?: number | null;
  vlamax?: number | null;
  vlamaxRun?: number | null;
  vo2max?: number | null;
  vma?: number | null;
  css?: number | null;
  fcMax?: number | null;
  tte?: number | null;
  pmax5s?: number | null;
}

export interface PlanConfig {
  objective: string;
  raceName?: string;
  raceDate?: string;
  weeksAvailable?: number;
  weeklyHours?: number;
  sessionsPerWeek?: number;
  maxSessionsPerDay?: number;
  strengthSessionsPerWeek?: number;
  ambition?: string;
  constraints?: string;
  identifiedLimiters?: string[];
  activeLevers?: string[];
  prohibitions?: string[];
}

export interface ChunkProgress {
  currentWeek: number;
  totalWeeks: number;
  currentChunk: number;
  totalChunks: number;
}

interface StreamingState {
  response: string;
  isLoading: boolean;
  athleteId?: string;
  startedAt: number;
}

function saveStreamingState(state: StreamingState) {
  try {
    localStorage.setItem(STREAM_KEY, JSON.stringify(state));
  } catch { /* quota exceeded */ }
}

function loadStreamingState(): StreamingState | null {
  try {
    const raw = localStorage.getItem(STREAM_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as StreamingState;
    // Expire after 10 minutes (stale generation)
    if (Date.now() - state.startedAt > 10 * 60 * 1000) {
      localStorage.removeItem(STREAM_KEY);
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

function clearStreamingState() {
  localStorage.removeItem(STREAM_KEY);
}

export function useAITrainingPlan() {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chunkProgress, setChunkProgress] = useState<ChunkProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fullTextRef = useRef("");

  // On mount, check if there's a completed streaming state to restore
  useEffect(() => {
    const saved = loadStreamingState();
    if (saved && !saved.isLoading && saved.response) {
      // Generation finished while we were away — restore it
      setResponse(saved.response);
      clearStreamingState();
    } else if (saved && saved.isLoading && saved.response) {
      // Generation was in progress but we lost the stream — show partial + mark done
      setResponse(saved.response);
      // Mark as no longer loading since we can't resume the stream
      saveStreamingState({ ...saved, isLoading: false });
      clearStreamingState();
      toast.info("La génération précédente a été interrompue. Le contenu partiel est affiché.");
    }
  }, []);

  const generatePlan = useCallback(async (athleteData: PlanAthleteData, planConfig: PlanConfig, athleteId?: string) => {
    setResponse("");
    setIsLoading(true);
    fullTextRef.current = "";

    const totalWeeks = planConfig.weeksAvailable || 12;
    const CHUNK_SIZE = 8;
    const totalChunks = totalWeeks > 12 ? Math.ceil(totalWeeks / CHUNK_SIZE) : 1;
    setChunkProgress(totalChunks > 1 ? { currentWeek: 0, totalWeeks, currentChunk: 1, totalChunks } : null);

    const streamState: StreamingState = {
      response: "",
      isLoading: true,
      athleteId,
      startedAt: Date.now(),
    };
    saveStreamingState(streamState);

    // Abort controller for cleanup
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(PLAN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ athleteData, planConfig }),
        signal: controller.signal,
      });

      if (resp.status === 429) {
        toast.error("Rate limit dépassé, réessayez dans quelques instants.");
        setIsLoading(false);
        setChunkProgress(null);
        clearStreamingState();
        return;
      }
      if (resp.status === 402) {
        toast.error("Crédits IA épuisés.");
        setIsLoading(false);
        setChunkProgress(null);
        clearStreamingState();
        return;
      }
      if (!resp.ok || !resp.body) {
        throw new Error("Erreur du service IA");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let maxWeekSeen = 0;
      let lastPersistTime = 0;

      const updateWeekProgress = (text: string) => {
        const matches = text.match(/###\s*Semaine\s*(\d+)/gi);
        if (matches) {
          for (const m of matches) {
            const num = parseInt(m.replace(/\D/g, ""), 10);
            if (num > maxWeekSeen) maxWeekSeen = num;
          }
          if (totalChunks > 1) {
            const currentChunk = Math.min(Math.ceil(maxWeekSeen / CHUNK_SIZE), totalChunks);
            setChunkProgress({ currentWeek: maxWeekSeen, totalWeeks, currentChunk, totalChunks });
          }
        }
      };

      const persistPartial = () => {
        const now = Date.now();
        // Persist at most every 2 seconds to avoid localStorage thrashing
        if (now - lastPersistTime > 2000) {
          lastPersistTime = now;
          saveStreamingState({
            response: fullTextRef.current,
            isLoading: true,
            athleteId,
            startedAt: streamState.startedAt,
          });
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const streamError = parsed.error as string | undefined;
            const streamCode = parsed.code as number | undefined;

            if (streamError) {
              if (streamCode === 402) toast.error("Crédits IA épuisés.");
              else if (streamCode === 429) toast.error("Rate limit dépassé, réessayez dans quelques instants.");
              else toast.error(streamError);
              throw new Error("__STREAM_ABORT__");
            }

            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullTextRef.current += content;
              setResponse(fullTextRef.current);
              updateWeekProgress(fullTextRef.current);
              persistPartial();
            }
          } catch (err) {
            if (err instanceof Error && err.message === "__STREAM_ABORT__") throw err;
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const streamError = parsed.error as string | undefined;
            const streamCode = parsed.code as number | undefined;

            if (streamError) {
              if (streamCode === 402) toast.error("Crédits IA épuisés.");
              else if (streamCode === 429) toast.error("Rate limit dépassé, réessayez dans quelques instants.");
              else toast.error(streamError);
              throw new Error("__STREAM_ABORT__");
            }

            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullTextRef.current += content;
              setResponse(fullTextRef.current);
            }
          } catch (err) {
            if (err instanceof Error && err.message === "__STREAM_ABORT__") throw err;
            /* ignore */
          }
        }
      }

      // Save final completed state
      saveStreamingState({
        response: fullTextRef.current,
        isLoading: false,
        athleteId,
        startedAt: streamState.startedAt,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // User-initiated abort — keep partial content
        saveStreamingState({
          response: fullTextRef.current,
          isLoading: false,
          athleteId,
          startedAt: streamState.startedAt,
        });
      } else {
        console.error("AI training plan error:", e);
        if (!(e instanceof Error && e.message === "__STREAM_ABORT__")) {
          toast.error("Impossible de générer le plan d'entraînement");
        }
        clearStreamingState();
      }
    } finally {
      setIsLoading(false);
      setChunkProgress(null);
      abortRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setResponse("");
    setIsLoading(false);
    setChunkProgress(null);
    fullTextRef.current = "";
    clearStreamingState();
  }, []);

  return { response, isLoading, chunkProgress, generatePlan, reset, setResponse };
}
