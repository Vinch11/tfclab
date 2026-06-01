// =============================================
// RACE ANALYSIS — pure functions (Deno + browser)
// Scenarios Finish→World-class + Riegel projection
// + Comparison observed-vs-predicted
// =============================================

export type Ambition = "finish" | "perf" | "sub" | "elite" | "world_class";

export interface AmbitionDef {
  key: Ambition;
  label: string;
  pctVMA: number;        // percentage of VMA (run) — anchor reference
  pctThreshold: number;  // percentage of threshold speed
}

// Anchor scenarios (running). Calibrated on TFCL méthod.
export const AMBITIONS: AmbitionDef[] = [
  { key: "finish",     label: "Finish",            pctVMA: 0.72, pctThreshold: 0.80 },
  { key: "perf",       label: "Perf / age-group",  pctVMA: 0.78, pctThreshold: 0.87 },
  { key: "sub",        label: "Sub / competitor",  pctVMA: 0.84, pctThreshold: 0.93 },
  { key: "elite",      label: "Elite",             pctVMA: 0.88, pctThreshold: 0.98 },
  { key: "world_class",label: "World-class",       pctVMA: 0.92, pctThreshold: 1.02 },
];

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

  // Derive both VMA and threshold if only one is available
  let vmaKmh = snapshot.vmaKmh;
  let thrPace = snapshot.thresholdPaceSecPerKm;
  if (vmaKmh && !thrPace) {
    // Assume threshold ≈ 90% VMA (Daniels classic)
    thrPace = 3600 / (vmaKmh * 0.90);
  } else if (thrPace && !vmaKmh) {
    // Assume VMA ≈ threshold_speed / 0.90
    vmaKmh = (3600 / thrPace) / 0.90;
  }
  if (!vmaKmh || !thrPace) return { error: "Données insuffisantes" };

  // Riegel exponent applied if distance > anchor
  const ANCHOR_KM = 21.1; // semi-marathon anchor
  const RIEGEL_EXP = 1.06;

  return AMBITIONS.map(amb => {
    // Direct pace at pct VMA (valid up to ~25km)
    const speedKmh = vmaKmh! * amb.pctVMA;
    let paceSecPerKm = 3600 / speedKmh;

    // For long distances, apply Riegel from anchor
    let timeSec = paceSecPerKm * distanceKm;
    if (distanceKm > ANCHOR_KM) {
      const anchorTime = paceSecPerKm * ANCHOR_KM;
      timeSec = anchorTime * Math.pow(distanceKm / ANCHOR_KM, RIEGEL_EXP);
      paceSecPerKm = timeSec / distanceKm;
    }

    return {
      ambition: amb.key,
      label: amb.label,
      pctVMA: amb.pctVMA,
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
  errorPct: number;          // (observed - predicted) / predicted × 100, signed
  errorSec: number;          // signed
  pctVMA: number | null;     // observed pct of VMA
  pctThreshold: number | null; // observed pct of threshold
  scenarios: ScenarioRow[];
  recalibrationSignal: string | null; // human hint
}

export function analyzeRacePerformance(
  snapshot: RaceSnapshotInput,
  distanceKm: number,
  timeSec: number,
): PerformanceAnalysis | { error: string } {
  const scenarios = computeRaceScenarios(snapshot, distanceKm);
  if ("error" in scenarios) return scenarios;

  // Find closest scenario by time
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

  // Recalibration heuristics
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

/**
 * Parse time strings like "1h33", "1:33:00", "1h33:00", "93:00", "5580"(sec).
 * Returns seconds, or null.
 */
export function parseTimeToSec(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s/g, "");
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return n > 0 ? n : null;
  }
  // 1h33, 1h33m, 1h33:00
  const hm = s.match(/^(\d+)h(\d+)(?::(\d+))?$/);
  if (hm) {
    const h = parseInt(hm[1], 10);
    const m = parseInt(hm[2], 10);
    const sec = hm[3] ? parseInt(hm[3], 10) : 0;
    return h * 3600 + m * 60 + sec;
  }
  // 1:33:00 or 93:00 or 5:30
  const colon = s.match(/^(\d+):(\d+)(?::(\d+))?$/);
  if (colon) {
    if (colon[3]) {
      return parseInt(colon[1], 10) * 3600 + parseInt(colon[2], 10) * 60 + parseInt(colon[3], 10);
    }
    // mm:ss or hh:mm? Assume mm:ss when first <60 and we infer from value range later
    const a = parseInt(colon[1], 10);
    const b = parseInt(colon[2], 10);
    // If first > 10, more likely mm:ss for a race
    return a * 60 + b;
  }
  return null;
}
