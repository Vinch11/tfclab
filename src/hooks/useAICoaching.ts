/**
 * Hook for streaming AI coaching recommendations + Q&A chat
 */

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

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

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

async function streamFromEdge(
  body: Record<string, unknown>,
  onDelta: (chunk: string) => void,
  onError: (status: number) => void,
) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (resp.status === 429 || resp.status === 402 || !resp.ok || !resp.body) {
    onError(resp.status);
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";

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
      if (jsonStr === "[DONE]") return;

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
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
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }
}

export function useAICoaching() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const athleteDataRef = useRef<AICoachingAthleteContext | null>(null);

  const handleError = useCallback((status: number) => {
    if (status === 429) toast.error("Rate limit dépassé, réessayez dans quelques instants.");
    else if (status === 402) toast.error("Crédits IA épuisés. Ajoutez des crédits dans les paramètres.");
    else toast.error("Erreur du service IA");
  }, []);

  // Initial analysis (one-shot)
  const generateRecommendations = useCallback(async (athleteData: AICoachingAthleteContext) => {
    athleteDataRef.current = athleteData;
    setMessages([]);
    setIsLoading(true);

    let fullText = "";
    try {
      await streamFromEdge(
        { athleteData },
        (chunk) => {
          fullText += chunk;
          setMessages([{ role: "assistant", content: fullText }]);
        },
        (status) => { handleError(status); setIsLoading(false); },
      );
    } catch (e) {
      console.error("AI coaching error:", e);
      toast.error("Impossible de générer les recommandations IA");
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  // Follow-up Q&A question
  const askFollowUp = useCallback(async (question: string) => {
    if (!athleteDataRef.current) return;

    const userMsg: ChatMessage = { role: "user", content: question };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // Build conversation history for the edge function (skip initial assistant analysis)
    const chatHistory = [...messages.slice(1), userMsg]; // slice(1) = skip initial analysis response

    let fullText = "";
    try {
      await streamFromEdge(
        { athleteData: athleteDataRef.current, messages: chatHistory },
        (chunk) => {
          fullText += chunk;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && prev.length > 1 && prev[prev.length - 2]?.role === "user" && prev[prev.length - 2]?.content === question) {
              return [...prev.slice(0, -1), { role: "assistant", content: fullText }];
            }
            return [...prev, { role: "assistant", content: fullText }];
          });
        },
        (status) => { handleError(status); setIsLoading(false); },
      );
    } catch (e) {
      console.error("AI coaching follow-up error:", e);
      toast.error("Impossible de répondre à la question");
    } finally {
      setIsLoading(false);
    }
  }, [messages, handleError]);

  const reset = useCallback(() => {
    setMessages([]);
    setIsLoading(false);
    athleteDataRef.current = null;
  }, []);

  // Legacy compat: response = first assistant message content
  const response = messages.length > 0 && messages[0].role === "assistant" ? messages[0].content : "";

  return { response, messages, isLoading, generateRecommendations, askFollowUp, reset };
}
