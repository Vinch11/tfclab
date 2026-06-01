/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TRAIL PROFILE — Pré-calcul des contraintes course trail
 *
 * Pattern : on calcule TOUT côté code (D+/km, profil, D+ hebdo cible, etc.)
 * pour que l'IA reçoive des VALEURS FINALES, pas des règles à inférer.
 * Coût prompt : ~80 tokens dans chunk 1 uniquement.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type TrailTerrain = "rolling" | "valley" | "mountain" | "highMountain";

export interface TrailProfileInput {
  objective: string;
  distanceKm: number | null;
  elevationGainM: number | null;
  targetTimeMinutes?: number | null;
  maxAltitudeM?: number | null;
}

export interface TrailProfile {
  distanceKm: number;
  elevationGainM: number;
  dPlusPerKm: number;            // mètres D+ par km
  terrain: TrailTerrain;
  terrainLabel: string;          // ex: "Montagne (50-80 m/km)"
  weeklyDPlusPeakM: number;      // D+ hebdo cible au peak (≈ 10-15% du D+ total)
  weeklyDPlusBaseM: number;      // D+ hebdo cible en base
  descentTechnicalRequired: boolean; // descente technique obligatoire ?
  estimatedRaceDurationMin: number | null;
  needsAcclimatation: boolean;
  needsNightSimulation: boolean;
  gutTrainingTargetGPerH: number; // CHO cible h-1 testé en simu
  summary: string;
}

/**
 * Classe le terrain selon D+/km (référence trail running).
 *  - <20 m/km   → roulant
 *  - 20-35      → vallonné
 *  - 35-55      → montagne
 *  - >55        → haute montagne
 */
function classifyTerrain(dPlusPerKm: number): { terrain: TrailTerrain; label: string } {
  if (dPlusPerKm < 20) return { terrain: "rolling", label: "Roulant (<20 m/km)" };
  if (dPlusPerKm < 35) return { terrain: "valley", label: "Vallonné (20-35 m/km)" };
  if (dPlusPerKm < 55) return { terrain: "mountain", label: "Montagne (35-55 m/km)" };
  return { terrain: "highMountain", label: "Haute montagne (>55 m/km)" };
}

/**
 * Estime la durée de course (min) si pas fournie.
 * Modèle simple : base d'allure trail + pénalité D+ (≈10s/km par 100m D+).
 */
function estimateRaceDuration(distanceKm: number, elevationGainM: number): number {
  // Base trail pace ~5'30/km en montagne pour niveau intermédiaire
  const basePaceSecPerKm = 330;
  const elevationPenaltySec = (elevationGainM / 100) * 10 * distanceKm / Math.max(distanceKm, 1);
  // Approx total seconds
  const secPerKm = basePaceSecPerKm + (elevationGainM / Math.max(distanceKm, 1)) * 10;
  return Math.round((secPerKm * distanceKm) / 60);
}

const TRAIL_OBJ_REGEX = /trail|ultra|utmb|ccc|occ|skyrun/i;

export function isTrailObjective(objective: string | undefined | null): boolean {
  if (!objective) return false;
  return TRAIL_OBJ_REGEX.test(objective);
}

/**
 * Calcule le profil trail à partir des inputs du formulaire.
 * Retourne null si données insuffisantes (politique "Insufficient Data No Fake Defaults").
 */
export function computeTrailProfile(input: TrailProfileInput): TrailProfile | null {
  if (!isTrailObjective(input.objective)) return null;
  const km = input.distanceKm;
  const dPlus = input.elevationGainM;
  if (!km || km <= 0 || dPlus === null || dPlus === undefined || dPlus < 0) {
    return null;
  }

  const dPlusPerKm = Math.round(dPlus / km);
  const { terrain, label } = classifyTerrain(dPlusPerKm);

  // D+ hebdo cible (trail science / Lorang / Jornet) :
  //   Peak ≈ 1.0–1.5× D+ course (cap 8000 m/sem)
  //   Build ≈ 0.7–1.0× D+ course
  //   Base ≈ 0.25–0.35× D+ course
  // Multiplicateur réduit pour ultra >5000m (volume D+ irréaliste sinon).
  const peakMultiplier = dPlus >= 5000 ? 0.8 : dPlus >= 2000 ? 1.2 : 1.5;
  const baseMultiplier = dPlus >= 5000 ? 0.2 : 0.3;
  const weeklyDPlusPeakM = Math.min(8000, Math.round(dPlus * peakMultiplier));
  const weeklyDPlusBaseM = Math.round(dPlus * baseMultiplier);

  const descentTechnicalRequired = dPlusPerKm >= 35;
  const estimatedRaceDurationMin = input.targetTimeMinutes ?? estimateRaceDuration(km, dPlus);
  const needsAcclimatation = (input.maxAltitudeM ?? 0) >= 2000;
  const needsNightSimulation = estimatedRaceDurationMin >= 360; // ≥6h
  // Gut Training : 60g/h <6h, 80-90g/h ≥6h
  const gutTrainingTargetGPerH = estimatedRaceDurationMin >= 360 ? 85 : 60;

  const hours = Math.floor(estimatedRaceDurationMin / 60);
  const mins = estimatedRaceDurationMin % 60;
  const durationStr = `${hours}h${mins.toString().padStart(2, "0")}`;
  const summary = `${km}km / ${dPlus}m D+ (${dPlusPerKm} m/km — ${label}) — durée estimée ${durationStr}`;

  return {
    distanceKm: km,
    elevationGainM: dPlus,
    dPlusPerKm,
    terrain,
    terrainLabel: label,
    weeklyDPlusPeakM,
    weeklyDPlusBaseM,
    descentTechnicalRequired,
    estimatedRaceDurationMin,
    needsAcclimatation,
    needsNightSimulation,
    gutTrainingTargetGPerH,
    summary,
  };
}
