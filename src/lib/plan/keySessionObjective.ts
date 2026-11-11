/**
 * Étape 4 : une fiche conçue pour un autre objectif (ex. « semi » dans un plan
 * 10 km) ne peut pas porter une séance clé. Elle reste utilisable comme séance
 * secondaire. Mécanisme commun à toutes les disciplines : on compare l'objectif
 * des métadonnées (goals[]) ou, à défaut, la distance nommée dans le titre/ID.
 */
import { normalizeRepairGoal } from "../../../supabase/functions/_shared/repairSportingEquivalence";
import { WorkoutLibrary } from "../workoutLibrary";

const byId = new Map(WorkoutLibrary.map(w => [w.id, w]));

/** Objectifs propres à la fiche ; vide = fiche neutre. */
export function catalogObjectiveKeys(catalogId: string | null | undefined): string[] {
  if (!catalogId) return [];
  const w = byId.get(catalogId) as { goals?: string[]; title?: string; name?: string } | undefined;
  const fromGoals = (w?.goals ?? []).map(g => normalizeRepairGoal(g)).filter((g): g is string => !!g);
  if (fromGoals.length) return [...new Set(fromGoals)];
  const fromName = normalizeRepairGoal(`${catalogId.replace(/_/g, " ")} ${w?.title ?? w?.name ?? ""}`);
  return fromName ? [fromName] : [];
}

export function isKeySessionObjectiveMismatch(catalogId: string | null | undefined, objective: string | null | undefined): boolean {
  const target = normalizeRepairGoal(objective ?? "");
  if (!target) return false;
  const keys = catalogObjectiveKeys(catalogId);
  return keys.length > 0 && !keys.includes(target);
}

interface Plan { weeks: Array<{ weekNumber: number; cycleObjective?: string; sessions: Array<{ catalogId?: string | null; isKeySession?: boolean; title?: string }> }> }

/** Retire le statut « clé » des fiches d'un autre objectif ; retourne les traces. */
export function demoteMismatchedKeySessions(plan: Plan, objective: string): string[] {
  const traces: string[] = [];
  for (const w of plan.weeks) for (const s of w.sessions) {
    if (s.isKeySession && isKeySessionObjectiveMismatch(s.catalogId, w.cycleObjective || objective)) {
      s.isKeySession = false;
      traces.push(`S${w.weekNumber} « ${s.title ?? s.catalogId} » [${s.catalogId}] : fiche prévue pour ${catalogObjectiveKeys(s.catalogId).join("/")}, retirée des séances clés.`);
    }
  }
  return traces;
}
