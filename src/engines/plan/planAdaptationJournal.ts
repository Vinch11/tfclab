/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PLAN ADAPTATION JOURNAL — Garde-fou anti-cascade
 *
 * Persiste chaque adaptation dans `plan_adaptations` et applique les règles :
 *  - Max 2 window-regens / 28 jours
 *  - Max 5 patches consécutifs sans window-regen
 *
 * Permet à l'UI d'afficher l'historique + de bloquer/avertir le coach.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { supabase } from "@/integrations/supabase/client";
import type { PatchDiff } from "./planPatcher";

export type AdaptationType = "patch" | "window_regen" | "full_regen";

export type AdaptationTrigger =
  | "fatigue"
  | "missed_session"
  | "injury"
  | "physio_drift"
  | "race_date_shift"
  | "coach_manual"
  | "other";

export interface AdaptationRecord {
  id: string;
  athlete_id: string;
  coach_id: string;
  adaptation_type: AdaptationType;
  triggered_by: AdaptationTrigger;
  reason: string | null;
  from_week: number | null;
  to_week: number | null;
  diff_json: { changes: PatchDiff[] } | Record<string, unknown>;
  warnings: string[];
  applied: boolean;
  created_at: string;
}

export interface AdaptationGuard {
  allowed: boolean;
  reason?: string;
  windowRegens28d: number;
  consecutivePatches: number;
  forceFullRegen?: boolean;
}

const MAX_WINDOW_REGENS_28D = 2;
const MAX_CONSECUTIVE_PATCHES = 5;

export async function listRecentAdaptations(
  athleteId: string,
  days = 60
): Promise<AdaptationRecord[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("plan_adaptations")
    .select("*")
    .eq("athlete_id", athleteId)
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[planAdaptationJournal] listRecent failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as AdaptationRecord[];
}

export async function checkAdaptationGuard(
  athleteId: string,
  desired: AdaptationType
): Promise<AdaptationGuard> {
  const recent = await listRecentAdaptations(athleteId, 28);
  const windowRegens28d = recent.filter((r) => r.adaptation_type === "window_regen").length;

  // Compter patches consécutifs (depuis la dernière window/full regen)
  let consecutivePatches = 0;
  for (const r of recent) {
    if (r.adaptation_type === "patch") consecutivePatches++;
    else break;
  }

  if (desired === "window_regen" && windowRegens28d >= MAX_WINDOW_REGENS_28D) {
    return {
      allowed: false,
      reason: `Maximum ${MAX_WINDOW_REGENS_28D} régénérations partielles atteint sur 28 jours. Régénération complète recommandée.`,
      windowRegens28d,
      consecutivePatches,
      forceFullRegen: true,
    };
  }
  if (desired === "patch" && consecutivePatches >= MAX_CONSECUTIVE_PATCHES) {
    return {
      allowed: true,
      reason: `${consecutivePatches} patches consécutifs — envisager une régénération partielle.`,
      windowRegens28d,
      consecutivePatches,
    };
  }
  return { allowed: true, windowRegens28d, consecutivePatches };
}

export interface JournalAdaptationInput {
  athleteId: string;
  coachId: string;
  type: AdaptationType;
  triggeredBy: AdaptationTrigger;
  reason?: string;
  fromWeek?: number;
  toWeek?: number;
  diff?: PatchDiff[];
  warnings?: string[];
  applied?: boolean;
}

export async function journalAdaptation(
  input: JournalAdaptationInput
): Promise<AdaptationRecord | null> {
  const { data, error } = await supabase
    .from("plan_adaptations")
    .insert([
      {
        athlete_id: input.athleteId,
        coach_id: input.coachId,
        adaptation_type: input.type,
        triggered_by: input.triggeredBy,
        reason: input.reason ?? null,
        from_week: input.fromWeek ?? null,
        to_week: input.toWeek ?? null,
        diff_json: { changes: input.diff ?? [] } as any,
        warnings: (input.warnings ?? []) as any,
        applied: input.applied ?? true,
      },
    ])
    .select()
    .single();
  if (error) {
    console.error("[planAdaptationJournal] insert failed:", error.message);
    return null;
  }
  return data as unknown as AdaptationRecord;
}
