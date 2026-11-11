/**
 * Clés localStorage du cache navigateur "dernier plan IA généré" par
 * athlète (AITrainingPlanPage.tsx) — entièrement séparées de la table
 * Supabase `training_plan` (planning enregistré, affiché par
 * SavedPlanCalendar.tsx).
 *
 * Bug réel (retour coach : "j'ai effacé tous les plans de Mamou mais quand
 * je vais sur Plan il y a toujours un plan ouvert") : "Tout supprimer" dans
 * SavedPlanCalendar ne vide QUE `training_plan` en base — ce cache
 * navigateur, lu au chargement de AITrainingPlanPage pour restaurer le
 * dernier plan généré, n'était jamais informé de cette suppression et
 * continuait donc d'afficher un plan "fantôme" déjà supprimé côté coach.
 * `clearLocalAIPlanCache` centralise le nettoyage des 3 clés pour qu'une
 * suppression complète du planning (n'importe où dans l'app) puisse aussi
 * vider ce cache, sans dupliquer le format des clés.
 */
import { normalizeObjectiveKey } from "@/lib/normalizeObjectiveKey";

export interface ObjectiveBoundCacheState {
  /** Objectif du profil athlète au moment où cette préparation a été enregistrée. */
  athleteGoal?: unknown;
  /** Objectif choisi pour cette préparation ou ce brouillon. */
  objective?: unknown;
  /** Une version d'historique ne doit pas redevenir la préparation courante. */
  objectiveSource?: unknown;
}

function objectiveKey(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? normalizeObjectiveKey(value.trim())
    : null;
}

/**
 * Une ancienne configuration ne doit pas écraser le nouvel objectif du profil.
 * Avec provenance, on compare l'objectif du profil au moment de la sauvegarde :
 * le coach peut donc préparer volontairement un autre objectif sans le perdre
 * au rechargement. Les anciens caches sans provenance sont acceptés seulement
 * si leur objectif correspond encore au profil.
 */
export function canRestoreObjectiveBoundState(
  currentAthleteGoal: string | null | undefined,
  saved: ObjectiveBoundCacheState | null | undefined,
): boolean {
  const current = objectiveKey(currentAthleteGoal);
  if (!current || !saved) return true;

  const planned = objectiveKey(saved.objective);
  if (saved.objectiveSource === "history" && planned && planned !== current) return false;

  const athleteGoalAtSave = objectiveKey(saved.athleteGoal);
  if (athleteGoalAtSave) return athleteGoalAtSave === current;
  if (planned) return planned === current;
  return true;
}

export function aiPlanCacheKeys(athleteId: string): {
  /** Dernier formulaire + réponse IA (persistance de session, peut être écrasé). */
  persistKey: string;
  /** Plan "actif" complet (JSON + horodatage) — restauré en priorité au chargement. */
  activePlanKey: string;
  /** Brouillon local d'une régénération ciblée non encore enregistrée en base. */
  draftKey: string;
} {
  return {
    persistKey: `tfcl_ai_plan_${athleteId}`,
    activePlanKey: `plan_active_${athleteId}`,
    draftKey: `tfcl_ai_plan_draft_${athleteId}`,
  };
}

/** Vide le cache navigateur du plan IA pour un athlète (les 3 clés ci-dessus). */
export function clearLocalAIPlanCache(athleteId: string): void {
  const keys = aiPlanCacheKeys(athleteId);
  for (const key of Object.values(keys)) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore (localStorage indisponible — navigation privée stricte, etc.)
    }
  }
}
