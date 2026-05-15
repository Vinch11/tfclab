/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * USE RUNNING PROFILE CLOUD — Cloud persistence for CAP physiological profile
 * 
 * Connects RunningPhysioProfile to Cloud via the snapshots table.
 * Ensures profile data persists between sessions.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { toast } from "sonner";
import type { DbSnapshot } from "@/hooks/useCloudData";
import {
  type RunningPhysioProfile,
  type RunningObjectiveDistance,
  type RunningPriorityLever,
  type MetricSource,
  type LockedMetric,
  createRunningPhysioProfile,
} from "@/lib/v2/runningDoubleLoop";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface SaveRunningProfileInput {
  vo2max_run: number | null;
  vlamax_run: number | null;
  durability_run?: number | null;
  economy_run?: number | null;
  fatmax_run?: number | null;
  objective_distance: RunningObjectiveDistance;
  priority_lever?: RunningPriorityLever;
  lever_rationale?: string;
  source?: MetricSource;
  confidence?: number;
  lock_duration_days?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Convert snapshot to RunningPhysioProfile
// ═══════════════════════════════════════════════════════════════════════════════

function snapshotToRunningProfile(
  snapshot: DbSnapshot,
  athleteId: string
): RunningPhysioProfile | null {
  // Check if we have essential running data
  if (snapshot.vlamax_run == null && snapshot.vo2max == null) {
    return null;
  }

  const source: MetricSource = snapshot.source === "lab" ? "lab" : 
                               snapshot.source === "field_test" ? "field_test" : 
                               "snapshot";
  const confidence = snapshot.confidence ?? 0.7;

  // Parse objective from cycle_tag or default
  const objectiveDistance = parseObjectiveDistance(snapshot.cycle_tag);

  // Parse priority lever from coach notes or default
  const priorityLever = parsePriorityLever(snapshot.coach_notes);

  // Create locked metrics
  // ⚠️ Politique TFCL "Insufficient Data" (Core rule):
  // jamais de valeur neutre fictive. Si la donnée est absente, on retourne 0
  // + confidence 0 → l'UI doit afficher "Données insuffisantes" (test conf=0).
  const vo2max_run: LockedMetric = {
    value: snapshot.vo2max ?? 0,
    confidence: snapshot.vo2max != null ? confidence : 0,
    source,
  };

  const vlamax_run: LockedMetric = {
    value: snapshot.vlamax_run ?? 0,
    confidence: snapshot.vlamax_run != null ? confidence : 0,
    source,
  };

  const durability_run: LockedMetric = {
    value: snapshot.tte_observed_min ?? 0,
    confidence: snapshot.tte_observed_min != null ? confidence * 0.9 : 0,
    source,
  };

  const economy_run: LockedMetric | undefined = snapshot.run_economy_score != null
    ? { value: snapshot.run_economy_score, confidence: confidence * 0.8, source }
    : undefined;

  // Calculate lock dates
  const createdDate = new Date(snapshot.created_at ?? snapshot.date);
  const lockDays = 28; // Default 4 weeks
  const nextRecalDate = new Date(createdDate);
  nextRecalDate.setDate(nextRecalDate.getDate() + lockDays);

  return {
    athlete_id: athleteId,
    objective_distance: objectiveDistance,
    vo2max_run,
    vlamax_run,
    durability_run,
    economy_run,
    priority_lever: priorityLever,
    lever_rationale: snapshot.coach_notes ?? "Levier défini automatiquement",
    last_calibration_date: snapshot.date,
    lock_duration_days: lockDays,
    next_recalibration_date: nextRecalDate.toISOString().split("T")[0],
    locked: new Date() < nextRecalDate,
    created_at: snapshot.created_at ?? new Date().toISOString(),
    updated_at: snapshot.updated_at ?? new Date().toISOString(),
    calibration_source: snapshot.source === "manual" ? "manual" : "auto",
  };
}

function parseObjectiveDistance(cycleTag: string | null | undefined): RunningObjectiveDistance {
  if (!cycleTag) return "Marathon";
  const tag = cycleTag.toLowerCase();
  if (tag.includes("5k")) return "5K";
  if (tag.includes("10k")) return "10K";
  if (tag.includes("semi") || tag.includes("half")) return "Semi";
  if (tag.includes("trail")) return "Trail";
  return "Marathon";
}

function parsePriorityLever(notes: string | null | undefined): RunningPriorityLever {
  if (!notes) return "reduce_vlamax";
  const n = notes.toLowerCase();
  if (n.includes("durability") || n.includes("tte")) return "increase_durability";
  if (n.includes("economy") || n.includes("économie")) return "improve_economy";
  if (n.includes("vo2")) return "boost_vo2max";
  if (n.includes("specific") || n.includes("allure")) return "race_specific";
  if (n.includes("maintain")) return "maintain_profile";
  return "reduce_vlamax";
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Convert RunningPhysioProfile to snapshot update
// ═══════════════════════════════════════════════════════════════════════════════

function runningProfileToSnapshotUpdate(profile: RunningPhysioProfile): Partial<DbSnapshot> {
  return {
    vlamax_run: profile.vlamax_run.value,
    vo2max: profile.vo2max_run.value,
    tte_observed_min: Math.round(profile.durability_run.value),
    run_economy_score: profile.economy_run?.value ?? null,
    confidence: profile.vo2max_run.confidence,
    cycle_tag: profile.objective_distance,
    coach_notes: `Levier: ${profile.priority_lever}. ${profile.lever_rationale}`,
    source: profile.calibration_source,
    updated_at: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useRunningProfileCloud(athleteId: string | null) {
  const {
    snapshots,
    addSnapshot,
    updateSnapshot,
    setActiveSnapshot,
    athletes,
    loading: cloudLoading,
  } = useCloudDataContext();

  const [saving, setSaving] = useState(false);

  // Get athlete's active snapshot
  const athlete = useMemo(
    () => athletes.find((a) => a.id === athleteId) ?? null,
    [athletes, athleteId]
  );

  // Get athlete's running snapshots (sorted by date, newest first)
  const athleteSnapshots = useMemo(
    () =>
      snapshots
        .filter((s) => s.athlete_id === athleteId && s.vlamax_run != null)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [snapshots, athleteId]
  );

  // Get active running profile from active snapshot
  const activeSnapshot = useMemo(() => {
    if (!athlete?.active_snapshot_id) {
      // Fall back to most recent running snapshot
      return athleteSnapshots[0] ?? null;
    }
    return snapshots.find((s) => s.id === athlete.active_snapshot_id) ?? athleteSnapshots[0] ?? null;
  }, [athlete, snapshots, athleteSnapshots]);

  // Convert to RunningPhysioProfile
  const runningProfile = useMemo(() => {
    if (!activeSnapshot || !athleteId) return null;
    return snapshotToRunningProfile(activeSnapshot, athleteId);
  }, [activeSnapshot, athleteId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE RUNNING PROFILE
  // ═══════════════════════════════════════════════════════════════════════════

  const saveRunningProfile = useCallback(
    async (input: SaveRunningProfileInput): Promise<boolean> => {
      if (!athleteId) {
        toast.error("Aucun athlète sélectionné");
        return false;
      }

      setSaving(true);

      try {
        // Create a full RunningPhysioProfile
        const newProfile = createRunningPhysioProfile({
          athlete_id: athleteId,
          objective_distance: input.objective_distance,
          vo2max: input.vo2max_run ?? 50,
          vo2max_confidence: input.confidence ?? 0.7,
          vo2max_source: input.source ?? "snapshot",
          vlamax_cap: input.vlamax_run ?? 0.45,
          vlamax_confidence: input.confidence ?? 0.7,
          vlamax_source: input.source ?? "snapshot",
          durability_min: input.durability_run ?? 45,
          durability_confidence: input.confidence ?? 0.7,
          economy_score: input.economy_run ?? undefined,
          lock_duration_days: input.lock_duration_days ?? 28,
        });

        // Convert to snapshot data
        const snapshotData = runningProfileToSnapshotUpdate(newProfile);

        // Check if we should update existing or create new
        if (activeSnapshot) {
          // Update existing snapshot
          const success = await updateSnapshot(activeSnapshot.id, snapshotData);
          if (success) {
            toast.success("Profil CAP mis à jour dans le Cloud");
          }
          return success;
        } else {
          // Create new snapshot
          const today = new Date().toISOString().split("T")[0];
          const created = await addSnapshot({
            athlete_id: athleteId,
            coach_id: "", // Will be set by hook
            date: today,
            source: "manual",
            ...snapshotData,
          });

          if (created) {
            // Set as active snapshot
            await setActiveSnapshot(athleteId, created.id);
            toast.success("Profil CAP créé et activé dans le Cloud");
            return true;
          }
          return false;
        }
      } catch (error) {
        console.error("Error saving running profile:", error);
        toast.error("Erreur lors de la sauvegarde du profil CAP");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [athleteId, activeSnapshot, addSnapshot, updateSnapshot, setActiveSnapshot]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE INDIVIDUAL METRICS
  // ═══════════════════════════════════════════════════════════════════════════

  const updateVlamaxRun = useCallback(
    async (value: number, source?: MetricSource, confidence?: number) => {
      if (!activeSnapshot) {
        toast.error("Aucun profil actif à mettre à jour");
        return false;
      }
      return updateSnapshot(activeSnapshot.id, {
        vlamax_run: value,
        confidence: confidence ?? activeSnapshot.confidence,
        updated_at: new Date().toISOString(),
      });
    },
    [activeSnapshot, updateSnapshot]
  );

  const updateVo2maxRun = useCallback(
    async (value: number, source?: MetricSource, confidence?: number) => {
      if (!activeSnapshot) {
        toast.error("Aucun profil actif à mettre à jour");
        return false;
      }
      return updateSnapshot(activeSnapshot.id, {
        vo2max: value,
        confidence: confidence ?? activeSnapshot.confidence,
        updated_at: new Date().toISOString(),
      });
    },
    [activeSnapshot, updateSnapshot]
  );

  const updateDurabilityRun = useCallback(
    async (tteMinutes: number) => {
      if (!activeSnapshot) {
        toast.error("Aucun profil actif à mettre à jour");
        return false;
      }
      return updateSnapshot(activeSnapshot.id, {
        tte_observed_min: Math.round(tteMinutes),
        updated_at: new Date().toISOString(),
      });
    },
    [activeSnapshot, updateSnapshot]
  );

  const updateEconomyRun = useCallback(
    async (score: number) => {
      if (!activeSnapshot) {
        toast.error("Aucun profil actif à mettre à jour");
        return false;
      }
      return updateSnapshot(activeSnapshot.id, {
        run_economy_score: Math.round(score),
        updated_at: new Date().toISOString(),
      });
    },
    [activeSnapshot, updateSnapshot]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // GET HISTORICAL PROFILES
  // ═══════════════════════════════════════════════════════════════════════════

  const profileHistory = useMemo(() => {
    if (!athleteId) return [];
    return athleteSnapshots
      .map((s) => snapshotToRunningProfile(s, athleteId))
      .filter((p): p is RunningPhysioProfile => p !== null);
  }, [athleteSnapshots, athleteId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Current profile
    runningProfile,
    activeSnapshot,
    
    // Profile history
    profileHistory,
    
    // Save operations
    saveRunningProfile,
    updateVlamaxRun,
    updateVo2maxRun,
    updateDurabilityRun,
    updateEconomyRun,
    
    // State
    loading: cloudLoading,
    saving,
    hasProfile: runningProfile !== null,
  };
}
