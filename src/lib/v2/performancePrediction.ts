/**
 * =============================================
 * PERFORMANCE PREDICTION ENGINE – INSCYD-style
 * Two For Coaching Lab
 * =============================================
 *
 * Predicts race times, power/pace targets for:
 * - Cycling: TT 20km, TT 40km, Gran Fondo 100km, Gran Fondo 160km
 * - Running: 10k, Semi-Marathon, Marathon
 * - Triathlon: Sprint, Olympique, 70.3, Ironman
 *
 * Based on VO2max × VLamax × Economy interaction
 * With 3 scenarios: Conservative (95%), Optimal (80%), Aggressive (60%)
 *
 * ── Corrections V2 (2026-07) ──────────────────────────────────────────────────
 *  (A) Fraction d'intensité soutenable pilotée par VLamax + durée cible
 *      (au lieu du max de la plage figée) — crossover glucidique
 *      VLamax-dépendant, Mader 1990. Un athlète VLamax haute paie plus cher
 *      la longue distance (déplétion accélérée), quasi-neutre sur 10k.
 *  (B) La VLamax est effectivement branchée dans le pace run (avant :
 *      calculée dans enduranceIndex mais jamais utilisée pour le chrono cap).
 *  (C) Recalage optionnel sur records réels (Riegel exponent 1.06 —
 *      Riegel 1977, Peronnet 1993). Un chrono mesuré bat toujours
 *      une estimation physiologique. Pour marathon extrapolé depuis 10k,
 *      exposant effectif 1.07 (mur non linéaire, marathon runner classic).
 * ──────────────────────────────────────────────────────────────────────────────
 */

import type { RaceRecordsInput } from "@/lib/v2/vlamaxRunV2Enhanced";
import { estimateCdA, solveSpeed, BIKE_KIT_KG, type BikeAmbition } from "@/lib/v2/bikeSplitEstimator";

/** Niveau aéro/matériel déduit du rapport poids-puissance (CdA réaliste). */
function bikeAmbitionFromWkg(wkg: number): BikeAmbition {
  if (wkg >= 4.5) return "elite";
  if (wkg >= 3.8) return "competitor";
  if (wkg >= 3.0) return "age_group";
  return "finisher";
}

// =============================================
// TYPES
// =============================================

export type ScenarioLevel = "conservative" | "optimal" | "aggressive";

export interface RacePrediction {
  raceId: string;
  raceName: string;
  distance: string;
  sport: "velo" | "cap" | "triathlon";
  timeFormatted: string;        // "3h45"
  timeMinutes: number;
  powerWatts?: number;          // bike power target
  paceSecPerKm?: number;        // run pace target
  paceFormatted?: string;       // "5:15/km"
  intensityPctFTP?: number;     // % FTP for bike
  intensityPctVMA?: number;     // % VMA for run
  carbsNeeded?: number;         // g/h estimated
  glycogenRisk: "low" | "moderate" | "high";
  /** Origine de la prédiction (physio pure, ou recalé sur record + ancre). */
  anchorNote?: string;
}

export interface ScenarioPrediction {
  scenario: ScenarioLevel;
  label: string;
  probability: string;
  predictions: RacePrediction[];
}

export interface PerformancePredictionInput {
  vo2max: number;
  vlamax: number;
  weight: number;
  ftp?: number | null;
  vma?: number | null;            // km/h
  runEconomyScore?: number | null; // 0-1
  css?: number | null;             // swim CSS sec/100m
  confidence?: number;
  /**
   * Records de course réels (fenêtre récente). Si fournis, la prédiction
   * running (10k / semi / marathon) est recalée via Riegel sur l'ancre
   * la plus proche en distance de la course cible. Optionnel : sans records,
   * la prédiction reste purement physiologique.
   */
  raceRecords?: RaceRecordsInput | null;
}

export interface PerformancePredictionOutput {
  scenarios: ScenarioPrediction[];
  modelNote: string;
  confidence: number;
}

// =============================================
// RACE DEFINITIONS
// =============================================

interface RaceDefinition {
  id: string;
  name: string;
  distance: string;
  sport: "velo" | "cap" | "triathlon";
  durationFactor: number;     // base factor for time calculation
  intensityRange: [number, number]; // typical %FTP or %VMA range
  /** Distance réelle en km (vélo) — utilisée par le modèle physique. */
  distanceKm?: number;
  /** Position aéro par défaut (vélo). */
  position?: "tri" | "road";
  /** Perte parcours (relances, virages, vent, dénivelé). 1 = plat parfait. */
  terrainFactor?: number;
  segments?: { sport: "swim" | "velo" | "cap"; distanceKm: number }[];
}

const RACES: RaceDefinition[] = [
  // Cycling
  { id: "tt20", name: "Chrono 20km", distance: "20km", sport: "velo", durationFactor: 0.45, intensityRange: [95, 105], distanceKm: 20, position: "tri", terrainFactor: 0.96 },
  { id: "tt40", name: "Chrono 40km", distance: "40km", sport: "velo", durationFactor: 0.92, intensityRange: [90, 100], distanceKm: 40, position: "tri", terrainFactor: 0.95 },
  { id: "gf100", name: "Gran Fondo 100km", distance: "100km", sport: "velo", durationFactor: 2.8, intensityRange: [75, 85], distanceKm: 100, position: "road", terrainFactor: 0.90 },
  { id: "gf160", name: "Gran Fondo 160km", distance: "160km", sport: "velo", durationFactor: 4.8, intensityRange: [68, 78], distanceKm: 160, position: "road", terrainFactor: 0.88 },
  // Running
  { id: "10k", name: "10 km", distance: "10km", sport: "cap", durationFactor: 0.65, intensityRange: [90, 98] },
  { id: "semi", name: "Semi-Marathon", distance: "21.1km", sport: "cap", durationFactor: 1.45, intensityRange: [85, 92] },
  { id: "marathon", name: "Marathon", distance: "42.2km", sport: "cap", durationFactor: 3.2, intensityRange: [78, 85] },
  // Triathlon
  {
    id: "tri_sprint", name: "Tri Sprint", distance: "750m/20km/5km", sport: "triathlon", durationFactor: 1.1, intensityRange: [88, 95],
    segments: [{ sport: "swim", distanceKm: 0.75 }, { sport: "velo", distanceKm: 20 }, { sport: "cap", distanceKm: 5 }]
  },
  {
    id: "tri_oly", name: "Tri Olympique", distance: "1.5km/40km/10km", sport: "triathlon", durationFactor: 2.2, intensityRange: [82, 90],
    segments: [{ sport: "swim", distanceKm: 1.5 }, { sport: "velo", distanceKm: 40 }, { sport: "cap", distanceKm: 10 }]
  },
  {
    id: "tri_703", name: "70.3 / Half-IM", distance: "1.9km/90km/21.1km", sport: "triathlon", durationFactor: 5.0, intensityRange: [72, 82],
    segments: [{ sport: "swim", distanceKm: 1.9 }, { sport: "velo", distanceKm: 90 }, { sport: "cap", distanceKm: 21.1 }]
  },
  {
    id: "tri_im", name: "Ironman", distance: "3.8km/180km/42.2km", sport: "triathlon", durationFactor: 10.5, intensityRange: [65, 75],
    segments: [{ sport: "swim", distanceKm: 3.8 }, { sport: "velo", distanceKm: 180 }, { sport: "cap", distanceKm: 42.2 }]
  },
];

// =============================================
// SCENARIO MULTIPLIERS
// =============================================

const SCENARIO_CONFIG: Record<ScenarioLevel, { label: string; probability: string; timeFactor: number; intensityShift: number }> = {
  conservative: { label: "Conservateur", probability: "95%", timeFactor: 1.08, intensityShift: -0.08 },
  optimal: { label: "Optimal", probability: "80%", timeFactor: 1.0, intensityShift: 0 },
  aggressive: { label: "Agressif", probability: "60%", timeFactor: 0.94, intensityShift: 0.06 },
};

// =============================================
// (A + B) FRACTION D'INTENSITÉ SOUTENABLE — VLamax + Durée
// =============================================

/**
 * Fraction %VMA (0-1) soutenable pour une course cap, pilotée par
 * la durée de la course ET la VLamax.
 *
 * Base par durée (ancres physiologiques littérature) :
 *   10k  (df ≈ 0.65) → ~93% VMA
 *   semi (df ≈ 1.45) → ~88% VMA
 *   mara (df ≈ 3.20) → ~81% VMA
 * Interpolation linéaire par durationFactor plutôt que « top de la plage ».
 *
 * Modulation VLamax :
 *   VLamax haute ⇒ crossover glucidique plus bas, déplétion plus rapide
 *   ⇒ pénalité qui croît avec la durée (k_dist quasi nul à 10k, ~0.30 marathon).
 *   fraction_ajustée = fraction_base × (1 − (VLamax − 0.40) × k_dist)
 *
 * Bornes : jamais > intensityRange[1], jamais < intensityRange[0] − 5.
 * Réf : Mader (1990) partitionnement lactate/lipides ; Coyle (1988) glycogen depletion.
 */
export function computeSustainableFraction(
  race: RaceDefinition,
  vlamax: number,
): number {
  const df = race.durationFactor;

  // Interpolation base sur ancres (df, %VMA)
  const anchors: [number, number][] = [
    [0.65, 0.93],  // 10k
    [1.45, 0.88],  // semi
    [3.20, 0.81],  // marathon
  ];

  let baseFraction: number;
  if (df <= anchors[0][0]) {
    baseFraction = anchors[0][1];
  } else if (df >= anchors[anchors.length - 1][0]) {
    baseFraction = anchors[anchors.length - 1][1];
  } else {
    // interpolation linéaire par segments
    baseFraction = anchors[anchors.length - 1][1];
    for (let i = 0; i < anchors.length - 1; i++) {
      const [d0, f0] = anchors[i];
      const [d1, f1] = anchors[i + 1];
      if (df >= d0 && df <= d1) {
        const t = (df - d0) / (d1 - d0);
        baseFraction = f0 + t * (f1 - f0);
        break;
      }
    }
  }

  // Facteur k_dist : ~0 sur 10k, ~0.30 sur marathon.
  // À df=0.65 → 0.015, df=1.45 → 0.095, df=3.20 → 0.27.
  const kDist = Math.max(0, Math.min(0.30, (df - 0.5) * 0.10));

  // Pivot VLamax = 0.40 mmol/L/s (moyenne endurance).
  // VLamax 0.60 (glycolytique) → pénalité marathon ~5.4%. VLamax 0.30 → bonus léger.
  const vlamaxAdjust = 1 - (vlamax - 0.40) * kDist;
  let fraction = baseFraction * vlamaxAdjust;

  // Bornes physiologiques (plage définie par race)
  const rMax = race.intensityRange[1] / 100;
  const rMin = Math.max(0.30, (race.intensityRange[0] - 5) / 100);
  fraction = Math.max(rMin, Math.min(rMax, fraction));

  return fraction;
}

// =============================================
// (C) RECALAGE RIEGEL — records réels
// =============================================

interface RiegelAnchor {
  distanceKm: number;
  timeMin: number;
  label: string;
}

/** Extrait les ancres disponibles d'un RaceRecordsInput. */
function extractAnchors(records: RaceRecordsInput | null | undefined): RiegelAnchor[] {
  if (!records) return [];
  const out: RiegelAnchor[] = [];
  if (records.pace400m_sec && records.pace400m_sec > 0) {
    out.push({ distanceKm: 0.4, timeMin: records.pace400m_sec / 60, label: "400m" });
  }
  if (records.pace1km_sec && records.pace1km_sec > 0) {
    out.push({ distanceKm: 1, timeMin: records.pace1km_sec / 60, label: "1 km" });
  }
  if (records.pace5km_sec && records.pace5km_sec > 0) {
    out.push({ distanceKm: 5, timeMin: records.pace5km_sec / 60, label: "5 km" });
  }
  if (records.pace10km_sec && records.pace10km_sec > 0) {
    out.push({ distanceKm: 10, timeMin: records.pace10km_sec / 60, label: "10 km" });
  }
  return out;
}

/** Choisit l'ancre la plus proche en log-distance de la cible. */
function pickNearestAnchor(anchors: RiegelAnchor[], targetKm: number): RiegelAnchor | null {
  if (anchors.length === 0) return null;
  let best = anchors[0];
  let bestDist = Math.abs(Math.log(best.distanceKm / targetKm));
  for (const a of anchors.slice(1)) {
    const d = Math.abs(Math.log(a.distanceKm / targetKm));
    if (d < bestDist) { best = a; bestDist = d; }
  }
  return best;
}

/**
 * Riegel : T2 = T1 × (D2/D1)^exp.
 * exp = 1.06 par défaut ; 1.07 quand la cible est marathon et l'ancre ≤ 10km
 * (le "mur" n'est pas linéaire en log, Riegel brut sous-estime).
 */
function riegelProject(anchor: RiegelAnchor, targetKm: number): { timeMin: number; expUsed: number } {
  const isMarathonExtrapolation = targetKm >= 40 && anchor.distanceKm <= 10;
  const exp = isMarathonExtrapolation ? 1.07 : 1.06;
  return {
    timeMin: anchor.timeMin * Math.pow(targetKm / anchor.distanceKm, exp),
    expUsed: exp,
  };
}

/** Poids Riegel selon la proximité de l'ancre (log-space) et l'extrapolation marathon. */
function riegelBlendWeight(anchor: RiegelAnchor, targetKm: number): number {
  const ratio = Math.max(anchor.distanceKm, targetKm) / Math.min(anchor.distanceKm, targetKm);
  const isMarathonFar = targetKm >= 40 && anchor.distanceKm <= 5;
  if (isMarathonFar) return 0.45;  // 5k → marathon, poids physio ≥ 55%
  if (ratio <= 3) return 0.70;      // ex. 10k → semi, 5k → 10k
  if (ratio <= 5) return 0.55;      // ex. 10k → marathon
  return 0.50;                      // ex. 5k → marathon (garde poids physio élevé)
}

/**
 * Recale une prédiction physio via Riegel sur la meilleure ancre disponible.
 * Retourne { timeMin, note } où note documente l'ancre utilisée.
 */
function applyRiegelRecalibration(
  physioTimeMin: number,
  targetKm: number,
  anchors: RiegelAnchor[],
): { timeMin: number; note: string } {
  const anchor = pickNearestAnchor(anchors, targetKm);
  if (!anchor) {
    return { timeMin: physioTimeMin, note: "Estimation physiologique, aucun record disponible" };
  }
  const { timeMin: riegelMin, expUsed } = riegelProject(anchor, targetKm);
  const w = riegelBlendWeight(anchor, targetKm);
  const blended = w * riegelMin + (1 - w) * physioTimeMin;
  const expNote = expUsed === 1.07 ? " (exposant 1.07, sécurité marathon)" : "";
  return {
    timeMin: blended,
    note: `Recalé sur ton ${anchor.label} récent — Riegel ${Math.round(w * 100)}% / physio ${Math.round((1 - w) * 100)}%${expNote}`,
  };
}

// =============================================
// CORE PREDICTION FUNCTIONS
// =============================================

/**
 * Estimate base race time (minutes) from metabolic profile.
 * Core model: time ∝ durationFactor / metabolicPower
 * metabolicPower = VO2max × (1 − VLamax_penalty) × economy
 */
function estimateBaseTime(
  race: RaceDefinition,
  input: PerformancePredictionInput
): number {
  const { vo2max, vlamax, weight, ftp, vma } = input;

  // Metabolic endurance index (fallback global uniquement)
  const enduranceIndex = vo2max * (1 - vlamax * 0.6);

  // Economy factor (0.85 – 1.0)
  const economy = input.runEconomyScore != null
    ? 0.85 + input.runEconomyScore * 0.15
    : 0.92;

  if (race.sport === "velo") {
    // Modèle physique (Martin 1998) : P = ½·ρ·CdA·v³ + Crr·m·g·v
    const effectiveFTP = ftp ?? (vo2max * 0.075 - vlamax * 0.45) * weight;
    const distKm = race.distanceKm ?? parseFloat(race.distance);
    const frac = ((race.intensityRange[0] + race.intensityRange[1]) / 2) / 100;
    const np = effectiveFTP * frac;
    const cda = estimateCdA(weight, race.position ?? "road", bikeAmbitionFromWkg(effectiveFTP / weight));
    const v = solveSpeed(np, weight + BIKE_KIT_KG, cda, race.terrainFactor ?? 0.92);
    const speedKmh = v * 3.6;
    return (distKm / speedKmh) * 60;
  }

  if (race.sport === "cap") {
    // (A+B) Fraction soutenable = f(durée, VLamax) au lieu du max plage
    const effectiveVMA = vma ?? vo2max * 0.29; // VMA ≈ VO2max × 0.29
    const distKm = parseFloat(race.distance);
    const fraction = computeSustainableFraction(race, vlamax);
    const paceMinPerKm = 60 / (effectiveVMA * fraction * economy);
    return distKm * paceMinPerKm;
  }

  // Triathlon: sum of segments
  if (race.segments) {
    let totalMin = 0;
    for (const seg of race.segments) {
      if (seg.sport === "swim") {
        const cssSecPer100 = input.css ?? (200 - vo2max * 1.2);
        totalMin += (seg.distanceKm * 1000 / 100) * cssSecPer100 / 60;
      } else if (seg.sport === "velo") {
        // Modèle physique identique au vélo standalone (position triathlon).
        const effectiveFTP = ftp ?? (vo2max * 0.075 - vlamax * 0.45) * weight;
        const bikeFraction = race.durationFactor > 8 ? 0.68
          : race.durationFactor > 4 ? 0.74
            : race.durationFactor > 2 ? 0.82
              : 0.88;
        const np = effectiveFTP * bikeFraction;
        const cda = estimateCdA(weight, "tri", bikeAmbitionFromWkg(effectiveFTP / weight));
        const terrain = race.durationFactor > 4 ? 0.90 : 0.92;
        const v = solveSpeed(np, weight + BIKE_KIT_KG, cda, terrain);
        totalMin += (seg.distanceKm / (v * 3.6)) * 60;
      } else {
        // Run off bike : réutilise la fraction soutenable + dégradation
        // (crossover VLamax-dépendant s'applique aussi, on la reflète
        // via une "race virtuelle" équivalente au segment run).
        const effectiveVMA = vma ?? vo2max * 0.29;
        const degradation = race.durationFactor > 4 ? 0.88 : 0.92;
        // race virtuelle : durationFactor du tri (long), intensityRange dégradée
        const virtualRunRace: RaceDefinition = {
          ...race,
          durationFactor: race.durationFactor,
          intensityRange: [
            Math.max(50, race.intensityRange[0] - 10),
            Math.max(55, race.intensityRange[1] - 5),
          ],
        };
        const runFraction = computeSustainableFraction(virtualRunRace, vlamax);
        const paceMinPerKm = 60 / (effectiveVMA * runFraction * economy * degradation);
        totalMin += seg.distanceKm * paceMinPerKm;
      }
    }
    // Transition time
    totalMin += race.segments.length > 2 ? 8 : 4;
    return totalMin;
  }

  // Fallback
  return race.durationFactor * 60 / (enduranceIndex * 0.03);
}

/**
 * Compute carb needs g/h based on intensity and duration
 */
function estimateCarbsGH(
  durationMin: number,
  intensityPct: number,
  vo2max: number,
  vlamax: number,
  weight: number
): number {
  const vo2Lmin = (vo2max * (intensityPct / 100) * weight) / 1000;
  const totalKcalMin = vo2Lmin * 5;
  const carbFraction = 0.3 + (intensityPct / 100) * 0.65 + vlamax * 0.15;
  const carbGmin = (totalKcalMin * Math.min(1, carbFraction)) / 4;
  return Math.round(carbGmin * 60);
}

/**
 * Determine glycogen risk level
 */
function assessGlycogenRisk(durationMin: number, carbsGH: number): "low" | "moderate" | "high" {
  if (durationMin < 90) return "low";
  const totalCarbs = (carbsGH * durationMin) / 60;
  const glycogenStore = 400; // g typical
  const absorbable = Math.min(90, carbsGH) * (durationMin / 60);
  const deficit = totalCarbs - glycogenStore - absorbable;
  if (deficit < 50) return "low";
  if (deficit < 150) return "moderate";
  return "high";
}

// =============================================
// FORMAT HELPERS
// =============================================

function formatTime(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

function formatPace(secPerKm: number): string {
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")}/km`;
}

// =============================================
// MAIN PREDICTION FUNCTION
// =============================================

export function computePerformancePredictions(
  input: PerformancePredictionInput,
  sportFilter?: "velo" | "cap" | "triathlon"
): PerformancePredictionOutput {
  const confidence = input.confidence ?? 0.7;
  const races = sportFilter ? RACES.filter(r => r.sport === sportFilter) : RACES;
  const anchors = extractAnchors(input.raceRecords);
  const hasAnchors = anchors.length > 0;

  const scenarios: ScenarioPrediction[] = (["conservative", "optimal", "aggressive"] as ScenarioLevel[]).map(level => {
    const cfg = SCENARIO_CONFIG[level];

    const predictions: RacePrediction[] = races.map(race => {
      const physioTime = estimateBaseTime(race, input);

      // (C) Recalage Riegel sur ancres réelles — cap uniquement
      let baseTime = physioTime;
      let anchorNote: string | undefined;
      if (race.sport === "cap") {
        const targetKm = parseFloat(race.distance);
        const { timeMin, note } = applyRiegelRecalibration(physioTime, targetKm, anchors);
        baseTime = timeMin;
        anchorNote = note;
      }

      const timeMin = baseTime * cfg.timeFactor;

      // Power target (bike)
      let powerWatts: number | undefined;
      let intensityPctFTP: number | undefined;
      if (race.sport === "velo" || race.sport === "triathlon") {
        const effectiveFTP = input.ftp ?? ((input.vo2max * 0.075 - input.vlamax * 0.45) * input.weight);
        const midIntensity = (race.intensityRange[0] + race.intensityRange[1]) / 2 / 100;
        intensityPctFTP = Math.round((midIntensity + cfg.intensityShift) * 100);
        powerWatts = Math.round(effectiveFTP * (midIntensity + cfg.intensityShift));
      }

      // Pace target (run) — reflète maintenant la fraction soutenable pilotée VLamax
      let paceSecPerKm: number | undefined;
      let paceFormatted: string | undefined;
      let intensityPctVMA: number | undefined;
      if (race.sport === "cap" || race.sport === "triathlon") {
        const effectiveVMA = input.vma ?? input.vo2max * 0.29;
        const sustainable = race.sport === "cap"
          ? computeSustainableFraction(race, input.vlamax)
          : (race.intensityRange[0] + race.intensityRange[1]) / 2 / 100;
        const adjustedIntensity = Math.max(0.30, Math.min(1.05, sustainable + cfg.intensityShift));
        intensityPctVMA = Math.round(adjustedIntensity * 100);
        const speedKmH = effectiveVMA * adjustedIntensity;
        paceSecPerKm = speedKmH > 0 ? 3600 / speedKmH : 600;
        paceFormatted = formatPace(paceSecPerKm);
      }

      // Carbs & glycogen risk
      const avgIntensity = ((race.intensityRange[0] + race.intensityRange[1]) / 2) + cfg.intensityShift * 100;
      const carbsNeeded = estimateCarbsGH(timeMin, avgIntensity, input.vo2max, input.vlamax, input.weight);
      const glycogenRisk = assessGlycogenRisk(timeMin, carbsNeeded);

      return {
        raceId: race.id,
        raceName: race.name,
        distance: race.distance,
        sport: race.sport,
        timeFormatted: formatTime(timeMin),
        timeMinutes: Math.round(timeMin),
        powerWatts,
        paceSecPerKm,
        paceFormatted,
        intensityPctFTP,
        intensityPctVMA,
        carbsNeeded,
        glycogenRisk,
        anchorNote,
      };
    });

    return {
      scenario: level,
      label: cfg.label,
      probability: cfg.probability,
      predictions,
    };
  });

  const baseNote = "Prédictions basées sur le modèle VO₂max × VLamax × Économie. Fraction soutenable pilotée par la durée cible et la VLamax (crossover glucidique Mader).";
  const recalNote = hasAnchors
    ? ` Recalage Riegel actif sur ${anchors.length} record(s) : ${anchors.map(a => a.label).join(", ")}.`
    : " Aucun record de course fourni : estimation purement physiologique pour le run.";

  return {
    scenarios,
    confidence,
    modelNote: baseNote + recalNote,
  };
}

/**
 * Get available race IDs
 */
export function getAvailableRaces(sport?: "velo" | "cap" | "triathlon") {
  return (sport ? RACES.filter(r => r.sport === sport) : RACES).map(r => ({
    id: r.id,
    name: r.name,
    distance: r.distance,
    sport: r.sport,
  }));
}
