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

/**
 * Normalise une valeur d'ambition brute (AmbitionLevel à 5 paliers, incluant
 * "world_class") vers les 4 paliers de ce module.
 *
 * Bug réel corrigé (audit "estimations physiologiques", chantier simulation
 * de course) : RaceSimulationPage.tsx castait `selectedAthlete.ambition`
 * directement `as RunSplitAmbition` sans passer par cette fonction — pour
 * "world_class" (absent de RunSplitAmbition/BikeAmbition), le lookup dans
 * V_SEUIL_FRACTION_BY_AMBITION échouait silencieusement et retombait sur
 * "age_group" (fraction 0.76/0.82), alors que raceTimePredictor.ts (Coaching
 * Compass) traite déjà "world_class" comme "elite" (0.89/0.95) — jusqu'à 17%
 * d'écart de temps de course prédit entre les deux écrans pour un athlète
 * Elite top 3%. "world_class" est ici collapsé sur "elite" pour rester
 * cohérent avec ce traitement existant côté raceTimePredictor.ts — PAS une
 * nouvelle calibration physiologique propre à "world_class" (qui resterait à
 * valider séparément si ce palier doit un jour être distingué ici aussi).
 */
export function normalizeToRunSplitAmbition(raw: string | null | undefined): RunSplitAmbition {
  if (raw === "world_class") return "elite";
  if (raw === "finisher" || raw === "age_group" || raw === "competitor" || raw === "elite") return raw;
  return "age_group";
}

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
