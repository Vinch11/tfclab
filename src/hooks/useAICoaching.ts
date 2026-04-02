/**
 * Hook for streaming AI coaching recommendations
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coaching`;

export interface AICoachingAthleteContext {
  nom?: string;
  objectif?: string;
  ambition?: string;
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
  p30s?: number | null;
  p60s?: number | null;
  map5min?: number | null;
  snapshotCount?: number;
  lastSnapshotAge?: number;

  // VLamax V2 components (diagnostic context)
  vlamaxComponents?: {
    mader_mlss: number | null;
    mader_tte: number | null;
    scoreG: number | null;
    vlamax_from_wprime: number | null;
    fusion_method: string | null;
    divergence: number | null;
    S_pmax: number | null;
    S30: number | null;
    S60: number | null;
    E: number | null;
    D: number | null;
    W: number | null;
    wprimeKJ: number | null;
  } | null;
  vlamaxConfidence?: number | null;
  vlamaxConfidenceLabel?: string | null;
  vlamaxFormula?: string | null;
  vlamaxWarnings?: string[];

  // Limiter & lever context
  primaryLimiter?: string | null;
  primaryLimiterGap?: number | null;
  secondaryLimiters?: string[];
  primaryLever?: string | null;

  // Coaching Compass context
  compassLimiter?: {
    type: string;
    label: string;
    description: string;
    impactScore: number;
    confidence: string;
  } | null;
  compassLeverage?: {
    type: string;
    label: string;
    description: string;
    expectedAdaptations: string[];
    workoutExamples: string[];
    priority: number;
  } | null;
  compassDecision?: {
    recommendedBlock: string;
    durationWeeks: number;
    primaryWorkouts: string[];
    physiologicalTargets: string[];
    prohibitions: string[];
    athleteMessage: string;
    coachRationale: string;
  } | null;
  compassReadiness?: {
    potential: number;
    availability: number;
    governingFactor: string;
  } | null;
}

export function useAICoaching() {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const generateRecommendations = useCallback(async (athleteData: AICoachingAthleteContext) => {
    setResponse("");
    setIsLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ athleteData }),
      });

      if (resp.status === 429) {
        toast.error("Rate limit dépassé, réessayez dans quelques instants.");
        setIsLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast.error("Crédits IA épuisés. Ajoutez des crédits dans les paramètres.");
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

      // Flush remaining buffer
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
      console.error("AI coaching error:", e);
      toast.error("Impossible de générer les recommandations IA");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResponse("");
    setIsLoading(false);
  }, []);

  return { response, isLoading, generateRecommendations, reset };
}
