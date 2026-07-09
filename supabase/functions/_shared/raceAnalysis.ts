// ⚠️ DUPLIQUÉ dans src/lib/raceAnalysis.ts — toute modif doit être appliquée aux deux
// =============================================
// RACE ANALYSIS — pure functions (Deno + browser)
// Scenarios Finish→World-class + Riegel projection
// + Comparison observed-vs-predicted
// =============================================

export type Ambition = "finish" | "perf" | "sub" | "elite" | "world_class";

export type ComplexiteSeances = "simple" | "intermediaire" | "avance";

/**
 * Fourchette de fraction VMA (course à pied) par famille de distance.
 * Consommé par computeRaceScenarios / deriveRaceTargets (milieu de fourchette par défaut).
 * Familles :
 *  - short  : 5K → ≤10K
 *  - middle : ~10K → semi
 *  - long   : marathon+
 */
export type DistanceFamily = "short" | "middle" | "long";

export interface FractionVMARange { lo: number; hi: number }

export interface AmbitionDef {
  key: Ambition;
  label: string;
  /** ⚠️ Legacy scalaire — conservé pour compat. Utiliser fractionVMA[family] en priorité. */
  pctVMA: number;
  pctThreshold: number;
  /** Fourchette bornée par famille de distance. Le milieu est utilisé par défaut. */
  fractionVMA: Record<DistanceFamily, FractionVMARange>;
  /** Qualités (séances clés) par semaine attendues pour l'ambition. */
  qualitesParSemaine: number;
  /** Multiplicateur appliqué à weeklyHours pour dériver volumeCible. */
  multiplicateurVolume: number;
  /** Complexité maximale des séances autorisée (filtre bibliothèque). */
  complexiteSeances: ComplexiteSeances;
}

// Anchor scenarios (running). Calibrated on TFCL méthod.
export const AMBITIONS: AmbitionDef[] = [
  {
    key: "finish", label: "Finish", pctVMA: 0.72, pctThreshold: 0.80,
    fractionVMA: { short: { lo: 0.74, hi: 0.78 }, middle: { lo: 0.70, hi: 0.74 }, long: { lo: 0.66, hi: 0.70 } },
    qualitesParSemaine: 1, multiplicateurVolume: 0.8, complexiteSeances: "simple",
  },
  {
    key: "perf", label: "Perf / age-group", pctVMA: 0.78, pctThreshold: 0.87,
    fractionVMA: { short: { lo: 0.82, hi: 0.86 }, middle: { lo: 0.76, hi: 0.80 }, long: { lo: 0.72, hi: 0.76 } },
    qualitesParSemaine: 2, multiplicateurVolume: 0.9, complexiteSeances: "intermediaire",
  },
  {
    key: "sub", label: "Sub / competitor", pctVMA: 0.84, pctThreshold: 0.93,
    fractionVMA: { short: { lo: 0.88, hi: 0.92 }, middle: { lo: 0.82, hi: 0.86 }, long: { lo: 0.76, hi: 0.80 } },
    qualitesParSemaine: 3, multiplicateurVolume: 1.0, complexiteSeances: "intermediaire",
  },
  {
    key: "elite", label: "Elite", pctVMA: 0.88, pctThreshold: 0.98,
    fractionVMA: { short: { lo: 0.92, hi: 0.96 }, middle: { lo: 0.86, hi: 0.90 }, long: { lo: 0.80, hi: 0.84 } },
    qualitesParSemaine: 3, multiplicateurVolume: 1.1, complexiteSeances: "avance",
  },
  {
    key: "world_class", label: "World-class", pctVMA: 0.92, pctThreshold: 1.02,
    fractionVMA: { short: { lo: 0.96, hi: 1.00 }, middle: { lo: 0.90, hi: 0.94 }, long: { lo: 0.84, hi: 0.88 } },
    qualitesParSemaine: 4, multiplicateurVolume: 1.2, complexiteSeances: "avance",
  },
];

export function distanceFamilyFromKm(distanceKm: number): DistanceFamily {
  if (distanceKm <= 10) return "short";
  if (distanceKm <= 25) return "middle";
  return "long";
}

/** Milieu de fourchette pour la fraction VMA (source unique dans computeRaceScenarios). */
export function fractionVMAForAmbition(amb: AmbitionDef, distanceKm: number): number {
  const fam = distanceFamilyFromKm(distanceKm);
  const range = amb.fractionVMA[fam];
  return (range.lo + range.hi) / 2;
}

export interface RaceSnapshotInput {
  vmaKmh?: number | null;            // VMA in km/h
  thresholdPaceSecPerKm?: number | null; // MLSS / LT2 pace
  ageYears?: number | null;
}

export interface ScenarioRow {
  ambition: Ambition;
  label: string;
  pctVMA: number;
  pctThreshold: number;
  paceSecPerKm: number;   // predicted pace
  timeSec: number;        // predicted time for the requested distance
}

/**
 * Compute the 5 race scenarios for a given distance.
 * Priority: use VMA when available, fallback to threshold pace.
 * For distance >25km, apply Riegel correction from a 21.1km anchor.
 * Depuis v2 : consomme le MILIEU de fourchette `fractionVMA[family]` (remplace pctVMA scalaire).
 */
export function computeRaceScenarios(
  snapshot: RaceSnapshotInput,
  distanceKm: number,
): ScenarioRow[] | { error: string } {
  if (!snapshot.vmaKmh && !snapshot.thresholdPaceSecPerKm) {
    return { error: "Données insuffisantes : VMA et allure seuil manquantes" };
  }
  if (distanceKm < 1 || distanceKm > 250) {
    return { error: `Distance invalide : ${distanceKm}km` };
  }

  let vmaKmh = snapshot.vmaKmh;
  let thrPace = snapshot.thresholdPaceSecPerKm;
  if (vmaKmh && !thrPace) {
    thrPace = 3600 / (vmaKmh * 0.90);
  } else if (thrPace && !vmaKmh) {
    vmaKmh = (3600 / thrPace) / 0.90;
  }
  if (!vmaKmh || !thrPace) return { error: "Données insuffisantes" };

  const ANCHOR_KM = 21.1;
  const RIEGEL_EXP = 1.06;

  return AMBITIONS.map(amb => {
    const frac = fractionVMAForAmbition(amb, distanceKm);
    const speedKmh = vmaKmh! * frac;
    let paceSecPerKm = 3600 / speedKmh;
    let timeSec = paceSecPerKm * distanceKm;
    if (distanceKm > ANCHOR_KM) {
      const anchorTime = paceSecPerKm * ANCHOR_KM;
      timeSec = anchorTime * Math.pow(distanceKm / ANCHOR_KM, RIEGEL_EXP);
      paceSecPerKm = timeSec / distanceKm;
    }

    return {
      ambition: amb.key,
      label: amb.label,
      pctVMA: Number(frac.toFixed(3)),
      pctThreshold: amb.pctThreshold,
      paceSecPerKm: Math.round(paceSecPerKm),
      timeSec: Math.round(timeSec),
    };
  });
}

/**
 * Riegel projection between two distances.
 * t2 = t1 * (d2/d1)^1.06
 */
export function projectRiegel(
  fromDistanceKm: number,
  fromTimeSec: number,
  toDistanceKm: number,
  exponent = 1.06,
): number {
  return fromTimeSec * Math.pow(toDistanceKm / fromDistanceKm, exponent);
}

export interface PerformanceAnalysis {
  distanceKm: number;
  observedTimeSec: number;
  observedPaceSecPerKm: number;
  closestAmbition: Ambition;
  closestLabel: string;
  closestPredictedTimeSec: number;
  errorPct: number;
  errorSec: number;
  pctVMA: number | null;
  pctThreshold: number | null;
  scenarios: ScenarioRow[];
  recalibrationSignal: string | null;
}

export function analyzeRacePerformance(
  snapshot: RaceSnapshotInput,
  distanceKm: number,
  timeSec: number,
): PerformanceAnalysis | { error: string } {
  const scenarios = computeRaceScenarios(snapshot, distanceKm);
  if ("error" in scenarios) return scenarios;

  let closest = scenarios[0];
  let minDiff = Math.abs(timeSec - closest.timeSec);
  for (const s of scenarios) {
    const d = Math.abs(timeSec - s.timeSec);
    if (d < minDiff) { minDiff = d; closest = s; }
  }

  const observedPaceSec = timeSec / distanceKm;
  const observedSpeedKmh = 3600 / observedPaceSec;
  const pctVMA = snapshot.vmaKmh ? observedSpeedKmh / snapshot.vmaKmh : null;
  const pctThreshold = snapshot.thresholdPaceSecPerKm
    ? snapshot.thresholdPaceSecPerKm / observedPaceSec : null;

  const errorSec = timeSec - closest.timeSec;
  const errorPct = (errorSec / closest.timeSec) * 100;

  let recalibrationSignal: string | null = null;
  if (pctThreshold !== null && pctThreshold > 0.97 && distanceKm >= 18) {
    const sustainedMin = Math.round(timeSec / 60);
    recalibrationSignal = `Performance soutenue à ${(pctThreshold*100).toFixed(1)}% du seuil sur ${distanceKm}km (${sustainedMin}min). Suggère tte_observed_min_run ≥ ${sustainedMin} OU seuil légèrement sous-estimé (~${(((1/pctThreshold)-1)*-100).toFixed(1)}%).`;
  } else if (Math.abs(errorPct) < 1) {
    recalibrationSignal = `Performance dans le mille du scénario "${closest.label}" (écart ${errorPct >= 0 ? "+" : ""}${errorSec}s, ${errorPct.toFixed(2)}%). Modèle calibré correctement.`;
  } else if (errorPct < -3) {
    recalibrationSignal = `Performance ${Math.abs(errorPct).toFixed(1)}% plus rapide que la prédiction "${closest.label}". VMA ou seuil possiblement sous-estimés.`;
  } else if (errorPct > 5) {
    recalibrationSignal = `Performance ${errorPct.toFixed(1)}% plus lente que la prédiction "${closest.label}". Contexte (fatigue/parcours/conditions) à vérifier avant recalibration.`;
  }

  return {
    distanceKm,
    observedTimeSec: timeSec,
    observedPaceSecPerKm: Math.round(observedPaceSec),
    closestAmbition: closest.ambition,
    closestLabel: closest.label,
    closestPredictedTimeSec: closest.timeSec,
    errorPct: Number(errorPct.toFixed(2)),
    errorSec: Math.round(errorSec),
    pctVMA: pctVMA !== null ? Number(pctVMA.toFixed(3)) : null,
    pctThreshold: pctThreshold !== null ? Number(pctThreshold.toFixed(3)) : null,
    scenarios,
    recalibrationSignal,
  };
}

// =============================================
// FORMAT HELPERS
// =============================================

export function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

export function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function parseTimeToSec(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s/g, "");
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return n > 0 ? n : null;
  }
  const hm = s.match(/^(\d+)h(\d+)(?::(\d+))?$/);
  if (hm) {
    const h = parseInt(hm[1], 10);
    const m = parseInt(hm[2], 10);
    const sec = hm[3] ? parseInt(hm[3], 10) : 0;
    return h * 3600 + m * 60 + sec;
  }
  const colon = s.match(/^(\d+):(\d+)(?::(\d+))?$/);
  if (colon) {
    if (colon[3]) {
      return parseInt(colon[1], 10) * 3600 + parseInt(colon[2], 10) * 60 + parseInt(colon[3], 10);
    }
    const a = parseInt(colon[1], 10);
    const b = parseInt(colon[2], 10);
    return a * 60 + b;
  }
  return null;
}
