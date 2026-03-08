/**
 * Hook for streaming AI training plan generation
 */
import { useState, useCallback } from "react";
import { toast } from "sonner";

const PLAN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-training-plan`;

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

export interface RaceGoal {
  objective: string;
  raceName?: string;
  raceDate?: string;
  priority: "A" | "B" | "C";
}

export interface PlanConfig {
  objective: string;
  raceName?: string;
  raceDate?: string;
  raceGoals?: RaceGoal[];
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

export function useAITrainingPlan() {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chunkProgress, setChunkProgress] = useState<ChunkProgress | null>(null);

  const generatePlan = useCallback(async (athleteData: PlanAthleteData, planConfig: PlanConfig) => {
    setResponse("");
    setIsLoading(true);

    const totalWeeks = planConfig.weeksAvailable || 12;
    const CHUNK_SIZE = 8;
    const totalChunks = totalWeeks > 12 ? Math.ceil(totalWeeks / CHUNK_SIZE) : 1;
    setChunkProgress(totalChunks > 1 ? { currentWeek: 0, totalWeeks, currentChunk: 1, totalChunks } : null);

    try {
      const resp = await fetch(PLAN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ athleteData, planConfig }),
      });

      if (resp.status === 429) {
        toast.error("Rate limit dépassé, réessayez dans quelques instants.");
        setIsLoading(false);
        setChunkProgress(null);
        return;
      }
      if (resp.status === 402) {
        toast.error("Crédits IA épuisés.");
        setIsLoading(false);
        setChunkProgress(null);
        return;
      }
      if (!resp.ok || !resp.body) {
        throw new Error("Erreur du service IA");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";
      let maxWeekSeen = 0;
      

      const updateWeekProgress = (text: string) => {
        // Detect ### Semaine N patterns to track progress
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
              fullText += content;
              setResponse(fullText);
              updateWeekProgress(fullText);
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
              fullText += content;
              setResponse(fullText);
            }
          } catch (err) {
            if (err instanceof Error && err.message === "__STREAM_ABORT__") throw err;
            /* ignore */
          }
        }
      }
    } catch (e) {
      console.error("AI training plan error:", e);
      if (!(e instanceof Error && e.message === "__STREAM_ABORT__")) {
        toast.error("Impossible de générer le plan d'entraînement");
      }
    } finally {
      setIsLoading(false);
      setChunkProgress(null);
    }
  }, []);

  const reset = useCallback(() => {
    setResponse("");
    setIsLoading(false);
    setChunkProgress(null);
  }, []);

  return { response, isLoading, chunkProgress, generatePlan, reset, setResponse };
}
