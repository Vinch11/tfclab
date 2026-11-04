/**
 * Voie commune d'adaptation (patch / régénération de fenêtre) :
 * 1. refus explicite des plans DET structurés (aucun recalcul/validation DET
 *    depuis les sources/ancres revues n'existe sur cette voie) ;
 * 2. archive append-only du plan courant via `AppendOnlyPlanVersionSaver`
 *    (identité = contenu hors `_provenance.generatedAt`, read-back exact,
 *    jamais d'UPDATE) ; tout état non CONFIRMED bloque l'écriture du courant ;
 * 3. écriture du courant ; un échec après archive confirmée est un état
 *    PARTIEL explicite (archive présente, courant non confirmé).
 * Les anciennes archives à UUID aléatoire ne sont ni rapprochées ni supprimées.
 */
import type { AppendOnlyPlanVersionSaver, SaveResult } from "./appendOnlyPlanVersionSave";
import { isDetPlanProvenance, isDetCoachInputsProvenance } from "./planProvenance";

type PlanLike = { weeks?: Array<{ sessions?: unknown[] }>; totalWeeks?: number; _provenance?: unknown };

export const DET_ADAPTATION_REFUSAL =
  "Adaptation refusée : ce plan provient de DET Engine. Ses séances structurées sont liées aux sources et ancres revues ; " +
  "cette adaptation ne sait pas les recalculer ni les revalider. Régénérez le plan avec DET Engine depuis les entrées coach. " +
  "Aucune modification n'a été enregistrée.";

/** Plan DET (provenance DET ou au moins une séance `detStructuredWorkout`) ⇒ message de refus, sinon null. */
export function detAdaptationRefusal(plan: unknown): string | null {
  const p = (plan ?? {}) as PlanLike;
  const prov = p._provenance;
  const detProv = isDetPlanProvenance(prov) || isDetCoachInputsProvenance(prov);
  const structured = Array.isArray(p.weeks) && p.weeks.some((w) => Array.isArray(w?.sessions) &&
    w.sessions.some((s) => !!s && typeof s === "object" && (s as { detStructuredWorkout?: unknown }).detStructuredWorkout != null));
  return detProv || structured ? DET_ADAPTATION_REFUSAL : null;
}

export class AdaptationWriteError extends Error {
  constructor(public readonly stage: "archive_not_confirmed" | "current_not_confirmed", message: string, public readonly archive: SaveResult | null) {
    super(message); this.name = "AdaptationWriteError";
  }
}

export async function archiveForAdaptation(saver: AppendOnlyPlanVersionSaver, a: { athleteId: string; coachId: string; plan: PlanLike; reason: string }): Promise<SaveResult> {
  const weeks = Array.isArray(a.plan.weeks) ? a.plan.weeks : [];
  const r = await saver.save({
    athlete_id: a.athleteId, coach_id: a.coachId, plan_json: a.plan,
    objective: `[ADAPTATION] ${a.reason}`,
    weeks_count: typeof a.plan.totalWeeks === "number" ? a.plan.totalWeeks : weeks.length,
    sessions_count: weeks.reduce((n, w) => n + (w.sessions?.length ?? 0), 0),
    validator_score: null, validator_grade: null, validator_summary: null,
  });
  if (r.status !== "CONFIRMED")
    throw new AdaptationWriteError("archive_not_confirmed",
      `Archive du plan courant non confirmée (${r.status}, ${r.reason}) : le plan courant n'a PAS été modifié.`, r);
  return r;
}

/** Archive confirmée puis écriture du courant ; jamais de succès global sans les deux. */
export async function persistAdaptation(input: {
  saver: AppendOnlyPlanVersionSaver; athleteId: string; coachId: string;
  currentPlan: PlanLike; nextPlan: unknown; reason: string;
  writeCurrent: (plan: unknown) => Promise<void>;
}): Promise<{ archive: SaveResult }> {
  const archive = await archiveForAdaptation(input.saver, { athleteId: input.athleteId, coachId: input.coachId, plan: input.currentPlan, reason: input.reason });
  try { await input.writeCurrent(input.nextPlan); }
  catch (e) {
    throw new AdaptationWriteError("current_not_confirmed",
      `État partiel : archive confirmée (${archive.attemptId}), mais le plan courant n'est pas confirmé (${(e as Error)?.message ?? "erreur"}). Rechargez avant de réessayer.`, archive);
  }
  return { archive };
}
