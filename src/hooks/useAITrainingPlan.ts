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

export interface PlanConfig {
  objective: string;
  raceName?: string;
  raceDate?: string;
  weeksAvailable?: number;
  weeklyHours?: number;
  sessionsPerWeek?: number;
  maxSessionsPerDay?: number;
  ambition?: string;
  constraints?: string;
  identifiedLimiters?: string[];
  activeLevers?: string[];
}

export function useAITrainingPlan() {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const generatePlan = useCallback(async (athleteData: PlanAthleteData, planConfig: PlanConfig) => {
    setResponse("");
    setIsLoading(true);

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
        return;
      }
      if (resp.status === 402) {
        toast.error("Crédits IA épuisés.");
        setIsLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) {
        throw new Error("Erreur du service IA");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";

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
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullText += content;
              setResponse(fullText);
            }
          } catch {
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
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullText += content;
              setResponse(fullText);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.error("AI training plan error:", e);
      toast.error("Impossible de générer le plan d'entraînement");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResponse("");
    setIsLoading(false);
  }, []);

  return { response, isLoading, generatePlan, reset, setResponse };
}
