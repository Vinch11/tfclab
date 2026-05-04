/**
 * useRunMLSSDriftDetection — charge les traces RUN_MLSS_MODEL_C_TRACE
 * sur 42 jours et calcule le rapport de dérive (CE / VLamax / MLSS%).
 *
 * Auto-refresh : à chaque changement d'athlete + à chaque persistance
 * d'une nouvelle trace (event window "runmlss-trace-persisted").
 */

import { useCallback, useEffect, useState } from "react";
import { loadRunMLSSTraces } from "@/lib/v2/runMLSSTracePersistence";
import {
  analyzeRunMLSSDrift,
  type RunMLSSDriftReport,
} from "@/lib/calibration/runMLSSContinuous";

export interface UseRunMLSSDriftResult {
  report: RunMLSSDriftReport | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useRunMLSSDriftDetection(
  athleteId: string | null | undefined,
): UseRunMLSSDriftResult {
  const [report, setReport] = useState<RunMLSSDriftReport | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!athleteId) {
      setReport(null);
      return;
    }
    setLoading(true);
    try {
      // Charge un peu plus que la fenêtre pour permettre tri + filtre interne
      const traces = await loadRunMLSSTraces(athleteId, 80);
      const r = analyzeRunMLSSDrift(traces);
      setReport(r);
    } catch (err) {
      if (import.meta.env.DEV) console.error("[useRunMLSSDriftDetection]", err);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Auto-refresh quand une nouvelle trace est persistée (broadcast léger)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ athleteId?: string }>).detail;
      if (!detail?.athleteId || detail.athleteId === athleteId) {
        void refresh();
      }
    };
    window.addEventListener("runmlss-trace-persisted", handler);
    return () => window.removeEventListener("runmlss-trace-persisted", handler);
  }, [athleteId, refresh]);

  return { report, loading, refresh };
}
