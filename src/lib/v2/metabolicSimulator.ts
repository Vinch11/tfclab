// =============================================
// METABOLIC SIMULATOR - INSCYD-inspired What-If & Lactate Models
// Two For Coaching Lab
// =============================================

import { ObjectifType } from "@/types/athlete";

// =============================================
// TYPES
// =============================================

export interface MetabolicProfile {
  vo2max: number;        // ml/kg/min
  vlamax: number;        // mmol/L/s
  weight: number;        // kg
  ftp: number;           // watts
  fcMax: number;         // bpm
  fatMax?: number;       // % VO2max (default ~65%)
}

export interface WhatIfScenario {
  label: string;
  vo2max: number;
  vlamax: number;
  weight: number;
  color: string;
}

export interface PerformancePrediction {
  ftpWatts: number;
  ftpWkg: number;
  lt1Watts: number;
  lt2Watts: number;
  fatMaxWatts: number;
  fatMaxIntensity: number;
  tteAtFTP: number;       // minutes
  marathon: string;       // estimated time
  halfMarathon: string;   // estimated time
  ironman70_3: string;    // estimated time
  ironman: string;        // estimated time
}

export interface LactatePoint {
  intensity: number;      // % of FTP or VO2max
  watts: number;          // absolute power
  lactate: number;        // mmol/L
  zone: string;           // training zone name
  color: string;          // zone color
}

// =============================================
// LACTATE PREDICTION MODEL
// Based on simplified Mader model
// =============================================

/**
 * Calculate steady-state lactate at a given intensity
 * Using simplified Mader model: La = VLamax × (1 - (VO2/VO2max)^k)
 */
export function predictLactate(
  intensityPct: number,   // 0-100 % of VO2max
  vo2max: number,         // ml/kg/min
  vlamax: number          // mmol/L/s
): number {
  if (intensityPct <= 0) return 1.0; // Baseline lactate
  if (intensityPct >= 100) return 20; // Max lactate
  
  // Simplified lactate kinetics based on VLamax
  // Higher VLamax = faster lactate production at submaximal intensities
  const fraction = intensityPct / 100;
  
  // Lactate production rate (simplified exponential model)
  const productionRate = vlamax * Math.pow(fraction, 3) * 60; // mmol/L/min
  
  // Lactate clearance capacity (inversely related to VLamax)
  // Lower VLamax = better clearance at same intensity
  const clearanceCapacity = (1 - (vlamax - 0.2) / 0.8) * 0.08; // mmol/L/min
  
  // Steady-state lactate = production / clearance at that intensity
  const baseLactate = 1.0;
  
  // Exponential rise with intensity, modulated by VLamax
  const k = 3.5 - (vlamax * 2); // Curvature factor
  const lactate = baseLactate + vlamax * 8 * Math.pow(fraction, k);
  
  return Math.min(20, Math.max(1, lactate));
}

/**
 * Generate full lactate curve from 0-120% intensity
 */
export function generateLactateCurve(
  vo2max: number,
  vlamax: number,
  ftp: number
): LactatePoint[] {
  const points: LactatePoint[] = [];
  
  // Calculate approximate power at VO2max
  const pMax = ftp * 1.18; // ~118% of FTP at VO2max
  
  for (let intensity = 30; intensity <= 120; intensity += 5) {
    const watts = (intensity / 100) * pMax;
    const lactate = predictLactate(intensity, vo2max, vlamax);
    
    // Determine training zone
    let zone: string;
    let color: string;
    
    if (lactate < 2.0) {
      zone = "Z1 - Récupération";
      color = "hsl(217, 91%, 60%)";
    } else if (lactate < 2.5) {
      zone = "Z2 - Endurance";
      color = "hsl(142, 71%, 45%)";
    } else if (lactate < 4.0) {
      zone = "Z3 - Tempo";
      color = "hsl(45, 93%, 47%)";
    } else if (lactate < 6.0) {
      zone = "Z4 - Seuil";
      color = "hsl(24, 95%, 53%)";
    } else if (lactate < 10.0) {
      zone = "Z5 - VO2max";
      color = "hsl(0, 84%, 60%)";
    } else {
      zone = "Z6 - Anaérobie";
      color = "hsl(280, 87%, 60%)";
    }
    
    points.push({ intensity, watts, lactate, zone, color });
  }
  
  return points;
}

/**
 * Find lactate threshold intensities (LT1 at 2mmol, LT2 at 4mmol)
 */
export function findLactateThresholds(
  vo2max: number,
  vlamax: number
): { lt1Pct: number; lt2Pct: number } {
  let lt1Pct = 0;
  let lt2Pct = 0;
  
  // Binary search for thresholds
  for (let i = 30; i < 100; i++) {
    const lactate = predictLactate(i, vo2max, vlamax);
    if (lt1Pct === 0 && lactate >= 2.0) {
      lt1Pct = i;
    }
    if (lt2Pct === 0 && lactate >= 4.0) {
      lt2Pct = i;
      break;
    }
  }
  
  return { lt1Pct: lt1Pct || 60, lt2Pct: lt2Pct || 80 };
}

// =============================================
// PERFORMANCE PREDICTION MODEL
// =============================================

/**
 * Predict FTP from VO2max and VLamax
 * Based on: FTP ≈ (VO2max × 0.8 - VLamax × 50) × weight × 0.075
 */
export function predictFTP(
  vo2max: number,
  vlamax: number,
  weight: number
): number {
  // Higher VO2max = higher FTP
  // Higher VLamax = lower sustainable power (more glycolytic)
  const vlamaxPenalty = vlamax * 45;
  const ftpWkg = (vo2max * 0.075) - (vlamaxPenalty * 0.01);
  const ftp = ftpWkg * weight;
  return Math.max(100, Math.round(ftp));
}

/**
 * Predict FatMax intensity (% of VO2max where fat oxidation peaks)
 * Lower VLamax = higher FatMax intensity
 */
export function predictFatMax(vlamax: number): number {
  // FatMax typically between 45-75% VO2max
  // Lower VLamax allows higher FatMax
  const fatMax = 80 - (vlamax * 40);
  return Math.max(45, Math.min(75, fatMax));
}

/**
 * Predict TTE at FTP (Time To Exhaustion)
 * Based on VLamax and metabolic efficiency
 */
export function predictTTEatFTP(
  vo2max: number,
  vlamax: number
): number {
  // Lower VLamax = longer TTE at threshold
  // Higher VO2max = better oxygen delivery
  const baseTTE = 45; // minutes at FTP baseline
  const vlamaxBonus = (0.6 - vlamax) * 80; // Lower VLamax = longer
  const vo2Bonus = (vo2max - 50) * 0.5;   // Higher VO2 = longer
  
  const tte = baseTTE + vlamaxBonus + vo2Bonus;
  return Math.max(20, Math.min(90, Math.round(tte)));
}

/**
 * Predict race times based on metabolic profile
 */
export function predictRaceTimes(
  vo2max: number,
  vlamax: number,
  weight: number
): { marathon: string; halfMarathon: string; ironman70_3: string; ironman: string } {
  // Higher VO2max + lower VLamax = faster endurance times
  const enduranceScore = vo2max * (1 - vlamax);
  
  // Marathon time (minutes) - simplified model
  // Elite: ~130min, Age group: 180-240min
  const marathonMin = Math.max(120, 320 - (enduranceScore * 3.5));
  
  // Half marathon
  const halfMin = marathonMin * 0.47;
  
  // 70.3 (including swim/bike)
  const im703Min = marathonMin * 1.8;
  
  // Full Ironman
  const imMin = marathonMin * 4;
  
  const formatTime = (min: number): string => {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return `${h}h${m.toString().padStart(2, "0")}`;
  };
  
  return {
    marathon: formatTime(marathonMin),
    halfMarathon: formatTime(halfMin),
    ironman70_3: formatTime(im703Min),
    ironman: formatTime(imMin)
  };
}

/**
 * Full performance prediction from metabolic profile
 */
export function predictPerformance(profile: MetabolicProfile): PerformancePrediction {
  const { vo2max, vlamax, weight, ftp } = profile;
  
  const predictedFTP = predictFTP(vo2max, vlamax, weight);
  const { lt1Pct, lt2Pct } = findLactateThresholds(vo2max, vlamax);
  const fatMaxPct = predictFatMax(vlamax);
  const tte = predictTTEatFTP(vo2max, vlamax);
  const raceTimes = predictRaceTimes(vo2max, vlamax, weight);
  
  // Use actual FTP if provided, else predicted
  const actualFTP = ftp > 0 ? ftp : predictedFTP;
  const pMax = actualFTP * 1.18;
  
  return {
    ftpWatts: actualFTP,
    ftpWkg: Math.round((actualFTP / weight) * 100) / 100,
    lt1Watts: Math.round((lt1Pct / 100) * pMax),
    lt2Watts: Math.round((lt2Pct / 100) * pMax),
    fatMaxWatts: Math.round((fatMaxPct / 100) * pMax),
    fatMaxIntensity: fatMaxPct,
    tteAtFTP: tte,
    ...raceTimes
  };
}

// =============================================
// WHAT-IF SCENARIO COMPARISON
// =============================================

/**
 * Generate default What-If scenarios based on current profile
 */
export function generateWhatIfScenarios(current: MetabolicProfile): WhatIfScenario[] {
  return [
    {
      label: "Actuel",
      vo2max: current.vo2max,
      vlamax: current.vlamax,
      weight: current.weight,
      color: "hsl(var(--primary))"
    },
    {
      label: "+5% VO2max",
      vo2max: current.vo2max * 1.05,
      vlamax: current.vlamax,
      weight: current.weight,
      color: "hsl(142, 71%, 45%)"
    },
    {
      label: "-0.1 VLamax",
      vo2max: current.vo2max,
      vlamax: Math.max(0.2, current.vlamax - 0.1),
      weight: current.weight,
      color: "hsl(217, 91%, 60%)"
    },
    {
      label: "-2kg Poids",
      vo2max: current.vo2max,
      vlamax: current.vlamax,
      weight: current.weight - 2,
      color: "hsl(45, 93%, 47%)"
    },
    {
      label: "Optimal IM",
      vo2max: current.vo2max * 1.05,
      vlamax: Math.max(0.25, current.vlamax - 0.1),
      weight: current.weight - 1,
      color: "hsl(280, 87%, 60%)"
    }
  ];
}

/**
 * Compare multiple scenarios
 */
export function compareScenarios(
  scenarios: WhatIfScenario[],
  baseFTP: number,
  baseFcMax: number
): { scenario: WhatIfScenario; prediction: PerformancePrediction }[] {
  return scenarios.map(scenario => {
    const profile: MetabolicProfile = {
      vo2max: scenario.vo2max,
      vlamax: scenario.vlamax,
      weight: scenario.weight,
      ftp: baseFTP,
      fcMax: baseFcMax
    };
    
    return {
      scenario,
      prediction: predictPerformance(profile)
    };
  });
}

// =============================================
// INVERSE CALIBRATION - Back-calculate base params from targets
// =============================================

/**
 * Inverse calibration: Given target FTP, find required VLamax
 * Rearranging: FTP = (VO2max * 0.075 - VLamax * 0.45) * weight
 * => VLamax = (VO2max * 0.075 - FTP/weight) / 0.45
 */
export function calibrateVLamaxFromFTP(
  targetFTP: number,
  vo2max: number,
  weight: number
): number {
  const ftpWkg = targetFTP / weight;
  const requiredVlamax = (vo2max * 0.075 - ftpWkg) / 0.45;
  return Math.max(0.15, Math.min(1.0, Number(requiredVlamax.toFixed(3))));
}

/**
 * Inverse calibration: Given target TTE, find required VLamax
 * From: TTE = 45 + (0.6 - VLamax) * 80 + (VO2max - 50) * 0.5
 * => VLamax = 0.6 - (TTE - 45 - (VO2max - 50) * 0.5) / 80
 */
export function calibrateVLamaxFromTTE(
  targetTTE: number,
  vo2max: number
): number {
  const vo2Bonus = (vo2max - 50) * 0.5;
  const requiredVlamax = 0.6 - (targetTTE - 45 - vo2Bonus) / 80;
  return Math.max(0.15, Math.min(1.0, Number(requiredVlamax.toFixed(3))));
}

/**
 * Inverse calibration: Given target FatMax %, find required VLamax
 * From: FatMax = 80 - VLamax * 40
 * => VLamax = (80 - FatMax) / 40
 */
export function calibrateVLamaxFromFatMax(
  targetFatMaxPct: number
): number {
  const requiredVlamax = (80 - targetFatMaxPct) / 40;
  return Math.max(0.15, Math.min(1.0, Number(requiredVlamax.toFixed(3))));
}

/**
 * Calculate required VO2max to achieve target FTP with current VLamax
 * From: FTP = (VO2max * 0.075 - VLamax * 0.45) * weight
 * => VO2max = (FTP/weight + VLamax * 0.45) / 0.075
 */
export function calibrateVO2maxFromFTP(
  targetFTP: number,
  vlamax: number,
  weight: number
): number {
  const ftpWkg = targetFTP / weight;
  const requiredVO2 = (ftpWkg + vlamax * 0.45) / 0.075;
  return Math.max(35, Math.min(90, Number(requiredVO2.toFixed(1))));
}

/**
 * Full inverse calibration result
 */
export interface InverseCalibrationResult {
  requiredVLamax: number;
  requiredVO2max: number;
  feasible: boolean;
  note: string;
}

/**
 * Check if a target is physiologically achievable
 */
export function validateTargetFeasibility(
  targetFTP: number,
  targetTTE: number,
  targetFatMax: number,
  currentVO2max: number,
  currentWeight: number
): InverseCalibrationResult {
  const vlamaxFromFTP = calibrateVLamaxFromFTP(targetFTP, currentVO2max, currentWeight);
  const vlamaxFromTTE = calibrateVLamaxFromTTE(targetTTE, currentVO2max);
  const vlamaxFromFatMax = calibrateVLamaxFromFatMax(targetFatMax);
  
  // Check for consistency across metrics
  const dispersion = Math.abs(vlamaxFromFTP - vlamaxFromTTE) + Math.abs(vlamaxFromTTE - vlamaxFromFatMax);
  const avgVlamax = (vlamaxFromFTP + vlamaxFromTTE + vlamaxFromFatMax) / 3;
  
  let feasible = true;
  let note = "";
  
  if (avgVlamax < 0.18) {
    feasible = false;
    note = "VLamax cible trop basse (<0.18) - irréaliste physiologiquement";
  } else if (avgVlamax > 0.95) {
    feasible = false;
    note = "VLamax cible trop haute (>0.95) - profil non-endurance";
  } else if (dispersion > 0.2) {
    feasible = false;
    note = "Objectifs incohérents entre eux - ajustez un seul paramètre à la fois";
  }
  
  return {
    requiredVLamax: avgVlamax,
    requiredVO2max: calibrateVO2maxFromFTP(targetFTP, avgVlamax, currentWeight),
    feasible,
    note
  };
}
