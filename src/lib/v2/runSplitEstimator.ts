/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTIMATEUR DE SPLIT COURSE (segment run — triathlon ou course pure) — TFCL™
 *
 * Modèle : pace_run = pace_seuil / fraction_vSeuil, où la fraction de vitesse
 * seuil soutenable dépend de l'ambition et de la distance (semi vs marathon),
 * avec pénalités additives si le profil est glycolytique (VLamax élevée) ou si
 * la durabilité observée (Riegel semi→marathon) est faible.
 *
 * Source unique — extrait de RaceSimulationPage.tsx (segmentDurationMin), où
 * cette formule était dupliquée avant d'être aussi nécessaire dans
 * raceTimePredictor.ts (audit "rapport staff" : l'estimation du temps course
 * pour un objectif triathlon ignorait jusque-là les données réelles de
 * l'athlète). Les deux call sites partagent maintenant ce calcul — plus de
 * risque de dérive entre les deux comme observé ailleurs dans l'app.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type RunSplitAmbition = "finisher" | "age_group" | "competitor" | "elite";

/**
 * Fraction de vSeuil soutenable sur un semi ("half") ou un marathon ("full"),
 * par ambition. Calibration TFCL — cf. RaceSimulationPage.tsx historique.
 */
export const V_SEUIL_FRACTION_BY_AMBITION: Record<RunSplitAmbition, { half: number; full: number }> = {
  elite: { half: 0.95, full: 0.89 },
  competitor: { half: 0.88, full: 0.82 },
  age_group: { half: 0.82, full: 0.76 },
  finisher: { half: 0.75, full: 0.70 },
};

export interface RunSplitInput {
  distanceKm: number;
  /** Allure au seuil lactique (sec/km) — mesurée, snapshot, ou dérivée de chronos. */
  thresholdPaceSecPerKm: number | null | undefined;
  /** Fraction de vSeuil déjà résolue (cf. V_SEUIL_FRACTION_BY_AMBITION) pour la distance visée. */
  vSeuilFraction: number;
  /** VLamax course (pas vélo) — pénalité -2 pts vSeuil si profil glycolytique (≥0.55). */
  vlamaxRun?: number | null;
  /** Indice de durabilité Riegel semi→marathon (estimateFromRaceChronos) — pénalité si >1.04. */
  durabilityIndex?: number | null;
}

export function estimateRunSplitMin(input: RunSplitInput): number | null {
  const { distanceKm, thresholdPaceSecPerKm: paceThr, vSeuilFraction, vlamaxRun, durabilityIndex } = input;
  if (!paceThr || paceThr <= 0) return null;

  const vlamaxHigh = vlamaxRun != null && vlamaxRun >= 0.55;
  const vlamaxVSeuilPenalty = vlamaxHigh ? 0.02 : 0;

  const durabilityPenalty = durabilityIndex == null ? 0
    : durabilityIndex <= 1.04 ? 0
    : durabilityIndex <= 1.08 ? 0.015
    : 0.03;

  const effectiveFraction = Math.max(0.5, vSeuilFraction - vlamaxVSeuilPenalty - durabilityPenalty);
  const paceRunSecKm = paceThr / effectiveFraction;
  return (paceRunSecKm * distanceKm) / 60;
}
