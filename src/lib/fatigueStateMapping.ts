/**
 * Mapping centralisé : fatigue_state (snapshot) → score numérique (1-10)
 * 
 * Utilisé par tous les modules (Dashboard, Diagnostic Engine, Rapport, Profil CAP)
 * pour garantir la cohérence des calculs de fatigue.
 */

export const FATIGUE_STATE_TO_SCORE: Record<string, number> = {
  fresh: 2,
  ok: 4,
  fatigued: 6,
  high: 8,
  injured: 10,
};

/** Default score when fatigue_state is missing or unknown */
export const FATIGUE_STATE_DEFAULT_SCORE = 4;

/**
 * Converts a fatigue_state string to a numeric score (1-10).
 * Returns null if state is null/undefined, default score if unknown.
 */
export function fatigueStateToScore(state: string | null | undefined): number | null {
  if (state == null) return null;
  return FATIGUE_STATE_TO_SCORE[state] ?? FATIGUE_STATE_DEFAULT_SCORE;
}

/**
 * Same as fatigueStateToScore but never returns null (defaults to FATIGUE_STATE_DEFAULT_SCORE).
 */
export function fatigueStateToScoreOrDefault(state: string | null | undefined): number {
  return fatigueStateToScore(state) ?? FATIGUE_STATE_DEFAULT_SCORE;
}
