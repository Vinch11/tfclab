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

/**
 * Canonical 0-100 score derived from 1-10 mapping (×10).
 * fresh=20, ok=40, fatigued=60, high=80, injured=100.
 * Higher = more fatigue.
 */
export function fatigueStateToScore100(state: string | null | undefined): number | null {
  const s = fatigueStateToScore(state);
  return s == null ? null : s * 10;
}

export function fatigueStateToScore100OrDefault(state: string | null | undefined): number {
  return fatigueStateToScore100(state) ?? FATIGUE_STATE_DEFAULT_SCORE * 10;
}

/** Canonical labels for fatigue_state */
export const FATIGUE_STATE_LABELS: Record<string, string> = {
  fresh: "Frais",
  ok: "Normal",
  fatigued: "Fatigué",
  high: "Très fatigué",
  injured: "Blessé",
};

/**
 * Disponibilité dérivée d'un fatigue_state — mêmes composantes que le
 * questionnaire TFCL_READINESS_QUESTIONS (disponibiliteTFCL.ts), sur une
 * échelle standard "plus haut = pire" pour fatigue/douleur/stress, et
 * "plus haut = mieux" pour sommeil/motivation.
 *
 * Source unique : avant ce helper, RunningGuidancePage et RunningProfilePage
 * dérivaient chacun leur propre table ad hoc à partir de fatigue_state, avec
 * des échelles et parfois des SENS opposés pour le même champ (fatigue_level
 * tantôt "plus haut = plus frais", tantôt "plus haut = plus fatigué) — ce qui
 * faussait silencieusement tout calcul en aval consommant ces valeurs.
 */
export interface FatigueStateAvailability {
  /** 1-5, plus haut = meilleur sommeil perçu (pas de donnée quotidienne réelle → valeur neutre dérivée de l'état). */
  sleep_quality: number;
  /** 1-5, plus haut = plus fatigué (aligné sur l'échelle attendue par WeeklyInputs/computeWeeklyDecision). */
  fatigue_level: number;
  /** 0-10, plus haut = plus de courbatures/raideur. */
  muscle_soreness: number;
  /** 1-5, plus haut = plus stressé. */
  mental_stress: number;
  /** 1-5, plus haut = plus motivé. */
  motivation: number;
  /** Vrai uniquement pour l'état "injured" — jamais déduit d'un autre champ. */
  pain_flag: boolean;
}

const FATIGUE_STATE_AVAILABILITY: Record<string, FatigueStateAvailability> = {
  fresh:    { sleep_quality: 5, fatigue_level: 1, muscle_soreness: 0, mental_stress: 2, motivation: 5, pain_flag: false },
  ok:       { sleep_quality: 4, fatigue_level: 2, muscle_soreness: 2, mental_stress: 3, motivation: 3, pain_flag: false },
  fatigued: { sleep_quality: 3, fatigue_level: 3, muscle_soreness: 4, mental_stress: 3, motivation: 3, pain_flag: false },
  high:     { sleep_quality: 2, fatigue_level: 4, muscle_soreness: 6, mental_stress: 4, motivation: 2, pain_flag: false },
  injured:  { sleep_quality: 2, fatigue_level: 5, muscle_soreness: 8, mental_stress: 4, motivation: 2, pain_flag: true },
};

const FATIGUE_STATE_AVAILABILITY_DEFAULT = FATIGUE_STATE_AVAILABILITY.ok;

/**
 * Convertit fatigue_state en disponibilité complète (toutes composantes,
 * sens standard documenté ci-dessus). `null`/état inconnu → valeurs neutres
 * de "ok", jamais une valeur alarmiste ou optimiste inventée.
 */
export function fatigueStateToAvailability(state: string | null | undefined): FatigueStateAvailability {
  if (state == null) return FATIGUE_STATE_AVAILABILITY_DEFAULT;
  return FATIGUE_STATE_AVAILABILITY[state] ?? FATIGUE_STATE_AVAILABILITY_DEFAULT;
}
