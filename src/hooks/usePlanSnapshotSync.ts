/**
 * usePlanSnapshotSync — Detects when key physiological metrics change
 * and alerts the coach that the active AI plan may need regeneration.
 * 
 * Key metrics: FTP, VLamax, VO2max, VMA
 * Thresholds: FTP ±5W, VLamax ±0.05, VO2max ±2, VMA ±0.3
 */

import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DbSnapshot } from "@/hooks/useCloudData";

export interface MetricChange {
  metric: string;
  label: string;
  oldValue: number;
  newValue: number;
  delta: string;
}

interface PlanSyncState {
  athleteId: string;
  athleteName: string;
  changes: MetricChange[];
  detectedAt: Date;
}

const KEY_METRICS: {
  key: keyof DbSnapshot;
  label: string;
  threshold: number;
  unit: string;
}[] = [
  { key: "ftp", label: "FTP", threshold: 5, unit: "W" },
  { key: "vlamax", label: "VLamax", threshold: 0.05, unit: "" },
  { key: "vo2max", label: "VO2max", threshold: 2, unit: "ml/kg/min" },
  { key: "vma", label: "VMA", threshold: 0.3, unit: "km/h" },
];

export function usePlanSnapshotSync() {
  const [pendingSync, setPendingSync] = useState<PlanSyncState | null>(null);
  const [dismissedAthletes, setDismissedAthletes] = useState<Set<string>>(new Set());

  /**
   * Call this after a snapshot update to detect if key metrics changed significantly.
   * Returns the list of significant changes, or null if none.
   */
  const detectKeyMetricChanges = useCallback(
    (
      oldSnapshot: DbSnapshot,
      updates: Partial<DbSnapshot>,
      athleteId: string,
      athleteName: string,
      hasPlan: boolean
    ): MetricChange[] | null => {
      if (!hasPlan) return null;

      const changes: MetricChange[] = [];

      for (const { key, label, threshold, unit } of KEY_METRICS) {
        const oldVal = oldSnapshot[key] as number | null | undefined;
        const newVal = updates[key] as number | null | undefined;

        if (newVal == null || oldVal == null) continue;
        if (newVal === oldVal) continue;

        const delta = Math.abs(newVal - oldVal);
        if (delta >= threshold) {
          const sign = newVal > oldVal ? "+" : "";
          changes.push({
            metric: key,
            label,
            oldValue: oldVal,
            newValue: newVal,
            delta: `${sign}${(newVal - oldVal).toFixed(key === "vlamax" ? 2 : 1)}${unit ? " " + unit : ""}`,
          });
        }
      }

      if (changes.length > 0) {
        setPendingSync({ athleteId, athleteName, changes, detectedAt: new Date() });
        setDismissedAthletes((prev) => {
          const next = new Set(prev);
          next.delete(athleteId);
          return next;
        });
        return changes;
      }
      return null;
    },
    []
  );

  /**
   * Archive the current plan before regeneration
   */
  const archiveCurrentPlan = useCallback(
    async (athleteId: string, coachId: string, reason: string) => {
      // Fetch current plan
      const { data: plan } = await supabase
        .from("plans")
        .select("*")
        .eq("athlete_id", athleteId)
        .maybeSingle();

      if (!plan?.plan_json) return false;

      // Archive to plan_versions
      const { error } = await supabase.from("plan_versions").insert({
        athlete_id: athleteId,
        coach_id: coachId,
        plan_json: plan.plan_json,
        objective: reason,
        weeks_count: null,
        sessions_count: null,
      });

      if (error) {
        console.error("Archive plan error:", error);
        toast.error("Erreur lors de l'archivage du plan");
        return false;
      }

      return true;
    },
    []
  );

  const dismissSync = useCallback((athleteId: string) => {
    setDismissedAthletes((prev) => new Set(prev).add(athleteId));
    setPendingSync(null);
  }, []);

  const clearSync = useCallback(() => {
    setPendingSync(null);
  }, []);

  const isAlertVisible = useMemo(() => {
    if (!pendingSync) return false;
    return !dismissedAthletes.has(pendingSync.athleteId);
  }, [pendingSync, dismissedAthletes]);

  return {
    pendingSync,
    isAlertVisible,
    detectKeyMetricChanges,
    archiveCurrentPlan,
    dismissSync,
    clearSync,
  };
}
