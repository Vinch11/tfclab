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
 */

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
  segments?: { sport: "swim" | "velo" | "cap"; distanceKm: number }[];
}

const RACES: RaceDefinition[] = [
  // Cycling
  { id: "tt20", name: "Chrono 20km", distance: "20km", sport: "velo", durationFactor: 0.45, intensityRange: [95, 105] },
  { id: "tt40", name: "Chrono 40km", distance: "40km", sport: "velo", durationFactor: 0.92, intensityRange: [90, 100] },
  { id: "gf100", name: "Gran Fondo 100km", distance: "100km", sport: "velo", durationFactor: 2.8, intensityRange: [75, 85] },
  { id: "gf160", name: "Gran Fondo 160km", distance: "160km", sport: "velo", durationFactor: 4.8, intensityRange: [68, 78] },
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
// CORE PREDICTION FUNCTIONS
// =============================================

/**
 * Estimate base race time (minutes) from metabolic profile
 * Core model: time ∝ durationFactor / metabolicPower
 * metabolicPower = VO2max × (1 - VLamax_penalty) × economy
 */
function estimateBaseTime(
  race: RaceDefinition,
  input: PerformancePredictionInput
): number {
  const { vo2max, vlamax, weight, ftp, vma } = input;

  // Metabolic endurance index: higher VO2max + lower VLamax = better endurance
  const enduranceIndex = vo2max * (1 - vlamax * 0.6);

  // Economy factor (0.85 – 1.0)
  const economy = input.runEconomyScore != null
    ? 0.85 + input.runEconomyScore * 0.15
    : 0.92;

  if (race.sport === "velo") {
    // Bike: time derived from FTP and distance
    const effectiveFTP = ftp ?? (vo2max * 0.075 - vlamax * 0.45) * weight;
    const ftpWkg = effectiveFTP / weight;
    // Higher FTP/kg = faster
    const baseMin = race.durationFactor * 60 / (ftpWkg * 1.1);
    return Math.max(race.durationFactor * 15, baseMin);
  }

  if (race.sport === "cap") {
    // Run: time derived from VMA (or estimated from VO2max)
    const effectiveVMA = vma ?? vo2max * 0.29; // VMA ≈ VO2max × 0.29
    // Time for distance at fraction of VMA
    const distKm = parseFloat(race.distance);
    const fraction = race.intensityRange[1] / 100;
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
        const effectiveFTP = ftp ?? (vo2max * 0.075 - vlamax * 0.45) * weight;
        const ftpWkg = effectiveFTP / weight;
        // Long-course bike at fraction of FTP
        const bikeFraction = race.durationFactor > 4 ? 0.72 : 0.82;
        const avgSpeed = 20 + ftpWkg * bikeFraction * 8;
        totalMin += (seg.distanceKm / avgSpeed) * 60;
      } else {
        // Run off bike (degraded economy ~5-8%)
        const effectiveVMA = vma ?? vo2max * 0.29;
        const degradation = race.durationFactor > 4 ? 0.88 : 0.92;
        const runFraction = race.durationFactor > 4 ? 0.75 : 0.82;
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
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
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

  const scenarios: ScenarioPrediction[] = (["conservative", "optimal", "aggressive"] as ScenarioLevel[]).map(level => {
    const cfg = SCENARIO_CONFIG[level];

    const predictions: RacePrediction[] = races.map(race => {
      const baseTime = estimateBaseTime(race, input);
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

      // Pace target (run)
      let paceSecPerKm: number | undefined;
      let paceFormatted: string | undefined;
      let intensityPctVMA: number | undefined;
      if (race.sport === "cap" || race.sport === "triathlon") {
        const effectiveVMA = input.vma ?? input.vo2max * 0.29;
        const midIntensity = (race.intensityRange[0] + race.intensityRange[1]) / 2 / 100;
        const adjustedIntensity = midIntensity + cfg.intensityShift;
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
      };
    });

    return {
      scenario: level,
      label: cfg.label,
      probability: cfg.probability,
      predictions,
    };
  });

  return {
    scenarios,
    confidence,
    modelNote: "Prédictions basées sur le modèle VO₂max × VLamax × Économie. Les 3 scénarios reflètent la probabilité de succès physiologique.",
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
