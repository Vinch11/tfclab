/**
 * Reprise après un marathon intermédiaire dans un plan triathlon (plan Ironman d'Emanuela, 27/11/2026) :
 * la protection de récupération n'imposait aucun minimum, et le plan donnait 1 h puis 2h45 avant de
 * remonter d'un coup à 14 h. Les plafonds par séance et les jours de repos complet restent ceux de
 * `raceCalendarProtection` ; on ajoute seulement un minimum de séances faciles en vélo et natation
 * (sans impact), la course restant au choix (« seulement sans douleur », jamais imposée). Plans de course à pied : inchangés.
 */
import { normalizeSizingObjective } from "@/engines/plan/sessionSizingMatrix";

const TRIATHLON = new Set(["IM", "703", "TRI_OLYMPIQUE", "TRI_SPRINT"]);
export interface RecoveryProtection { stage: string; objective: string; daysToRace: number }

/** Minimum de séances faciles par sport la semaine qui suit un marathon (null = rien à imposer). */
export function postMarathonCrossTrainingMinimum(planObjective: string | null | undefined, protections: readonly (RecoveryProtection | null | undefined)[]): { bike: number; swim: number; run: number } | null {
  const key = normalizeSizingObjective(planObjective ?? "");
  if (!key || !TRIATHLON.has(key)) return null;
  const after = protections.filter((p): p is RecoveryProtection => !!p && p.stage === "recovery" && p.objective === "marathon").map(p => -p.daysToRace);
  if (!after.length) return null;
  const last = Math.max(...after);
  if (last <= 7) return { bike: 2, swim: 2, run: 0 };
  if (last <= 14) return { bike: 3, swim: 2, run: 0 };
  return null;
}
