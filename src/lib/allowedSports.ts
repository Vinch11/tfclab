/**
 * Fix E4 (audit "génération de plan IA") : ce module contenait un jeu
 * complet de ratios sport/objectif (getRatiosSport, getAllowedSports...)
 * jamais branché au pipeline réel de génération — un seul appel dans tout
 * le codebase, `runningFocusMode.ts::isRunningOnlyGoal` ci-dessous. La
 * vraie source de vérité pour les ratios sport vit dans
 * `planValidator.ts::SPORT_RATIO_TARGETS`, plus complète (couvre
 * Sprint/Olympique, ignorés ici) — les fonctions mortes ont été retirées
 * pour ne pas induire un futur correctif en erreur sur la source de
 * vérité réelle. Seul `isRunningOnlyGoal` (utilisé) est conservé.
 */

// Objectifs 100% course (+ renfo)
const RUNNING_ONLY_GOALS = [
  "5K", "5k", "10K", "10k", "10km",
  "Semi", "Marathon", "StartToRun", "starttorun",
  "Trail", "TrailShort", "TrailMountain", "TrailUltra"
];

/**
 * Vérifie si l'objectif est running-only par défaut
 */
export function isRunningOnlyGoal(objectif: string): boolean {
  return RUNNING_ONLY_GOALS.includes(objectif);
}
