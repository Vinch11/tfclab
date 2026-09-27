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
