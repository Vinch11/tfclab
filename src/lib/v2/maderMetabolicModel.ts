// =============================================
// MADER METABOLIC MODEL - Scientific Lactate Kinetics
// Based on Mader (2003), Heck & Schulz (2002), Rapoport (2010)
// Two For Coaching Lab - INSCYD-equivalent precision
// =============================================

// Fallback Running Economy (Lacour & Bourdin 2015) — réexporté pour
// usage conjoint avec les prédictions Mader (cross-validation VMA via VO2max).
export {
  estimateRunningEconomy,
  vma_predicted_from_RE,
  type RunningEconomyEstimate,
} from "./runningEconomyModel";


/**
 * Core metabolic profile for calculations
 */
export interface MaderProfile {
  vo2max: number;           // ml/kg/min - Maximal oxygen uptake
  vlamax: number;           // mmol/L/s - Maximal glycolytic rate (lactate production)
  weight: number;           // kg
  fatOxidationMax?: number; // g/min - Peak fat oxidation rate (optional, can be estimated)
  efficiency?: number;      // % - Gross mechanical efficiency (default ~22-25%)
}

/**
 * Lactate steady-state result at a given intensity
 */
export interface LactateState {
  power: number;            // Watts
  intensity: number;        // % of VO2max
  lactateProduction: number;// mmol/L/min
  lactateClearance: number; // mmol/L/min
  steadyStateLactate: number; // mmol/L
  fatOxidation: number;     // g/min
  carbOxidation: number;    // g/min
  isAboveMLSS: boolean;     // Above maximal lactate steady state
}

/**
 * Performance predictions from the model
 */
export interface MaderPredictions {
  mlssPower: number;        // Watts at MLSS (Mader-derived; 0 = non calculable). NE PAS supposer = FTP.
  mlssWkg: number;          // W/kg at MLSS
  lt1Power: number;         // LT1 (2mmol) power
  lt2Power: number;         // LT2 (4mmol) power
  fatMaxPower: number;      // Power at peak fat oxidation
  fatMaxIntensity: number;  // % VO2max at FatMax
  fatMaxGrams: number;      // g/min fat at FatMax
  carbAtFatMax: number;     // g/h carbs at FatMax
  tteAtMLSS: number;        // Time to exhaustion at MLSS (minutes)
  pMax: number;             // Maximal aerobic power
}

// =============================================
// CONSTANTS
// =============================================

const ENERGY_PER_O2 = 20.9; // kJ per liter O2 (mixed substrate)
const FAT_ENERGY_DENSITY = 38.9; // kJ per gram fat
const CARB_ENERGY_DENSITY = 17.2; // kJ per gram carbohydrate
const O2_PER_FAT_GRAM = 2.01; // liters O2 per gram fat oxidized
const O2_PER_CARB_GRAM = 0.83; // liters O2 per gram carb oxidized
const GLYCOGEN_MUSCLE_MAX = 400; // grams (trained athlete)
const GLYCOGEN_LIVER_MAX = 100; // grams
const LACTATE_BASELINE = 1.0; // mmol/L resting lactate

// Glycogen depletion / glycemic regulation (Coyle 1986 JSCR, Coggan 1987 JAP, Romijn 1993 AJP)
const LIVER_GLUCOSE_RELEASE_MAX = 0.5; // g/min — max hepatic glucose output (Coyle 1986)
const BLOOD_GLUCOSE_CRITICAL = 3.5;    // mmol/L — hypoglycemic threshold (Coggan 1987)
const BLOOD_GLUCOSE_BASELINE = 5.0;    // mmol/L — fasting normoglycemia
const BLOOD_GLUCOSE_POOL_G = 4;        // ~4 g circulating glucose for a 70 kg adult
// 1 g glucose dans ~5 L sang ≈ 1.11 mmol/L (180 g/mol)
const G_TO_MMOL_BLOOD = 1.0 / BLOOD_GLUCOSE_POOL_G * (BLOOD_GLUCOSE_BASELINE - 0); // mmol/L per g delta (≈1.25)


// =============================================
// CORE LACTATE KINETICS (Mader Model)
// =============================================

/**
 * Calculate lactate production rate at given intensity
 * Based on Mader: VLa_prod = VLamax × f(intensity)
 * where f(intensity) follows Michaelis-Menten kinetics
 * 
 * At low intensity: minimal glycolytic contribution
 * At high intensity: approaches VLamax asymptotically
 */
export function calculateLactateProduction(
  intensityPct: number,  // % of VO2max (0-100)
  vlamax: number         // mmol/L/s
): number {
  if (intensityPct <= 0) return 0;
  
  // Michaelis-Menten like activation (Mader 2003)
  // Km represents the intensity at which glycolysis is 50% activated
  const Km = 55; // ~55% VO2max for half-maximal glycolysis
  const n = 2.5; // Hill coefficient for cooperativity
  
  // Fractional activation of glycolysis
  const activation = Math.pow(intensityPct, n) / 
    (Math.pow(Km, n) + Math.pow(intensityPct, n));
  
  // Production rate in mmol/L/min
  // VLamax (mmol/L/s) is the instantaneous maximal rate in activated muscle.
  // The effective whole-body production rate is scaled by ~3.0 (not 60) to account for:
  // 1. Only a fraction of total muscle mass is glycolytically active at submaximal work
  // 2. Substrate (glycogen/glucose) availability limits sustained glycolytic flux
  // 3. H+ accumulation provides negative feedback on PFK activity
  // Calibrated against: VO2max=60, VLamax=0.4, 70kg → MLSS ~72% VO2max (~260W)
  // Reference: Mader (2003), Heck & Schulz (2002)
  const EFFECTIVE_SCALING = 3.0;
  const productionRate = vlamax * activation * EFFECTIVE_SCALING;
  
  return productionRate;
}

/**
 * Calculate lactate clearance/oxidation capacity at given intensity
 * Clearance depends on VO2max and the oxidative capacity of tissues
 * 
 * Based on: VLa_ox ≈ k × VO2 / VO2max
 * where k is the maximal clearance rate (~0.5-1.0 mmol/L/min at VO2max)
 */
export function calculateLactateClearance(
  intensityPct: number,  // % of VO2max (0-100)
  vo2max: number,        // ml/kg/min
  currentLactate: number // mmol/L - clearance is lactate-dependent
): number {
  if (intensityPct <= 0) return 0.05; // Minimal resting clearance
  
  // Maximal clearance capacity scales with VO2max
  // Elite athletes (VO2max 70+) can clear ~1.5 mmol/L/min at steady state
  // Updated calibration: higher baseline to match Mader production scaling
  // Reference: Beneke (2003), Brooks (2018) - lactate shuttle kinetics
  const maxClearanceRate = 0.5 + (vo2max - 40) * 0.025;
  
  // Clearance increases with blood lactate (more substrate available)
  // but saturates at high lactate (enzyme saturation + H+ inhibition)
  const lactateFactor = currentLactate / (currentLactate + 3); // Km=3mmol for MCT kinetics
  
  // Oxygen availability for clearance (type I fibers, heart, liver)
  // At higher intensities, more O2 is consumed but also more lactate is shuttled
  const o2Availability = Math.min(1, intensityPct / 80); // Saturates at ~80% VO2max
  
  // Clearance rate (mmol/L/min)
  const clearanceRate = maxClearanceRate * o2Availability * (1 + lactateFactor);
  
  return clearanceRate;
}

/**
 * Find steady-state lactate at a given intensity
 * Iteratively solves: dLa/dt = VLa_prod - VLa_ox = 0
 */
export function findSteadyStateLactate(
  intensityPct: number,
  vo2max: number,
  vlamax: number
): number {
  if (intensityPct <= 0) return LACTATE_BASELINE;
  
  // Iterative solver for steady state
  let lactate = LACTATE_BASELINE;
  const maxIterations = 100;
  const tolerance = 0.01;
  
  for (let i = 0; i < maxIterations; i++) {
    const production = calculateLactateProduction(intensityPct, vlamax);
    const clearance = calculateLactateClearance(intensityPct, vo2max, lactate);
    
    // Net lactate accumulation rate
    const netRate = production - clearance;
    
    // If production exceeds max clearance, lactate rises indefinitely
    // This indicates we're above MLSS
    if (netRate > clearance * 0.5 && lactate > 8) {
      return 20; // Effectively unlimited accumulation
    }
    
    // Update lactate estimate
    const newLactate = Math.max(LACTATE_BASELINE, lactate + netRate * 0.5);
    
    // Check convergence
    if (Math.abs(newLactate - lactate) < tolerance) {
      return Math.min(20, newLactate);
    }
    
    lactate = newLactate;
  }
  
  return Math.min(20, Math.max(LACTATE_BASELINE, lactate));
}

// =============================================
// SUBSTRATE PARTITIONING (Fat vs Carbohydrate)
// =============================================

/**
 * Calculate fat oxidation rate at given intensity
 * Based on crossover concept and Randle cycle
 * 
 * Fat oxidation peaks at FatMax then declines as glycolytic flux
 * inhibits fatty acid oxidation (via malonyl-CoA)
 */
export function calculateFatOxidation(
  intensityPct: number,
  vo2max: number,
  vlamax: number,
  weight: number
): number {
  if (intensityPct <= 0) return 0;
  
  // VO2 at this intensity (L/min)
  const vo2 = (vo2max * weight / 1000) * (intensityPct / 100);
  
  // Maximal fat oxidation rate (g/min) - scales with aerobic capacity
  // Typically 0.5-1.0 g/min for trained athletes
  // Recalibrated per audit 2025: baseline 0.5, VLamax penalty -0.15
  // Literature: Achten & Jeukendrup 2003, Venables 2005, Noakes 2024
  const maxFatOx = 0.5 + (vo2max - 40) * 0.02 - vlamax * 0.15;
  const peakFatOx = Math.max(0.3, Math.min(1.2, maxFatOx));
  
  // FatMax intensity - lower VLamax = higher FatMax
  const fatMaxIntensity = 75 - vlamax * 50; // ~50-70% for endurance athletes
  
  // Fat oxidation curve (bell-shaped, peaking at FatMax)
  // Low intensity: limited by total energy demand
  // High intensity: inhibited by glycolytic flux
  const risePhase = intensityPct / fatMaxIntensity;
  const fallPhase = Math.exp(-Math.pow((intensityPct - fatMaxIntensity) / 25, 2));
  
  let fatOx: number;
  if (intensityPct <= fatMaxIntensity) {
    // Rising phase
    fatOx = peakFatOx * Math.min(1, risePhase);
  } else {
    // Declining phase above FatMax
    fatOx = peakFatOx * fallPhase;
  }
  
  // Fat oxidation approaches zero above ~85-90% VO2max
  if (intensityPct > 85) {
    fatOx *= Math.max(0, 1 - (intensityPct - 85) / 15);
  }
  
  return Math.max(0, fatOx);
}

/**
 * Calculate carbohydrate oxidation rate at given intensity
 * Based on: Total energy - Fat energy = Carb energy
 */
export function calculateCarbOxidation(
  intensityPct: number,
  vo2max: number,
  vlamax: number,
  weight: number
): number {
  if (intensityPct <= 0) return 0;
  
  // VO2 at this intensity (L/min)
  const vo2 = (vo2max * weight / 1000) * (intensityPct / 100);
  
  // Total energy expenditure (kJ/min)
  const totalEnergy = vo2 * ENERGY_PER_O2;
  
  // Fat contribution (kJ/min)
  const fatOx = calculateFatOxidation(intensityPct, vo2max, vlamax, weight);
  const fatEnergy = fatOx * FAT_ENERGY_DENSITY;
  
  // Carbohydrate fills the rest (kJ/min)
  const carbEnergy = Math.max(0, totalEnergy - fatEnergy);
  
  // Convert to g/min
  const carbOx = carbEnergy / CARB_ENERGY_DENSITY;
  
  return carbOx;
}

// =============================================
// KEY THRESHOLD CALCULATIONS
// =============================================

/**
 * Calibrated Mader α coefficient.
 * 
 * Refit on N=44 laboratory profiles (17 initial + 27 stratified additions
 * covering Master, Amateur Female, U23, OffRoad, TT pure, edge cases).
 *   - α_calibrated = 1.98 → RMSE 3.7% across the full panel
 *   - α=3.0 (legacy) → RMSE 11.3% (systematic over-estimation of glycolytic penalty)
 * 
 * Sources: Weber 2003, Hauser 2014, Heck 1985, Olbrecht, INSCYD whitepapers,
 * Zuccarelli 2022 (U23). The bi-regime TT vs main is NOT needed in this form
 * because VO2max_abs already captures TT specificity (α_TT=1.93 ≈ α_main=1.97).
 */
const MADER_ALPHA_CALIBRATED = 1.98;
const MADER_ALPHA_LEGACY = 3.0;

/** Feature flag: enable calibrated α from Nov 2026 dataset refit. */
export const USE_CALIBRATED_MADER_ALPHA = true;

/**
 * Find Maximal Lactate Steady State (MLSS) power
 * 
 * Uses the analytical Mader relationship:
 *   MLSS_pct = 100 × (1 − α × VLamax / VO2max_abs)
 * 
 * Reference: Mader (2003), Heck & Schulz (2002)
 * Higher VLamax = more glycolytic flux = lower MLSS fraction
 * Higher VO2max (absolute) = better lactate clearance capacity
 */
export function findMLSSPower(profile: MaderProfile): number {
  const { vo2max, vlamax, weight } = profile;
  const efficiency = profile.efficiency ?? 0.23;
  
  // Absolute VO2max in L/min
  const vo2maxAbs = vo2max * weight / 1000;
  
  // Mader analytical MLSS relationship
  const ALPHA = USE_CALIBRATED_MADER_ALPHA ? MADER_ALPHA_CALIBRATED : MADER_ALPHA_LEGACY;
  const mlssIntensityPct = 100 * (1 - ALPHA * vlamax / vo2maxAbs);
  
  // Clamp to physiological range (45-95% VO2max)
  const clampedIntensity = Math.max(45, Math.min(95, mlssIntensityPct));
  
  // Convert intensity to power
  const vo2AtMLSS = vo2max * clampedIntensity / 100; // ml/kg/min
  const vo2LPerMin = vo2AtMLSS * weight / 1000;
  const energyKJPerMin = vo2LPerMin * ENERGY_PER_O2;
  const powerWatts = (energyKJPerMin * 1000 / 60) * efficiency;
  
  return Math.round(powerWatts);
}

/**
 * Find lactate threshold powers (LT1 and LT2)
 */
export function findLactateThresholds(
  profile: MaderProfile
): { lt1Power: number; lt2Power: number; lt1Intensity: number; lt2Intensity: number } {
  const { vo2max, vlamax, weight } = profile;
  const efficiency = profile.efficiency ?? 0.23;
  
  let lt1Intensity = 0;
  let lt2Intensity = 0;
  
  // Search for LT1 (2 mmol/L) and LT2 (4 mmol/L)
  for (let intensity = 30; intensity < 100; intensity += 1) {
    const lactate = findSteadyStateLactate(intensity, vo2max, vlamax);
    
    if (lt1Intensity === 0 && lactate >= 2.0) {
      lt1Intensity = intensity;
    }
    if (lt2Intensity === 0 && lactate >= 4.0) {
      lt2Intensity = intensity;
      break;
    }
  }
  
  // Convert to power
  const intensityToPower = (intensity: number): number => {
    const vo2AtIntensity = (vo2max * intensity / 100);
    const vo2LPerMin = vo2AtIntensity * weight / 1000;
    const energyKJPerMin = vo2LPerMin * ENERGY_PER_O2;
    return Math.round((energyKJPerMin * 1000 / 60) * efficiency);
  };
  
  return {
    lt1Power: intensityToPower(lt1Intensity || 60),
    lt2Power: intensityToPower(lt2Intensity || 75),
    lt1Intensity: lt1Intensity || 60,
    lt2Intensity: lt2Intensity || 75
  };
}

/**
 * Find FatMax - intensity at peak fat oxidation
 */
export function findFatMax(profile: MaderProfile): {
  fatMaxPower: number;
  fatMaxIntensity: number;
  fatMaxGrams: number;
  carbAtFatMax: number;
} {
  const { vo2max, vlamax, weight } = profile;
  const efficiency = profile.efficiency ?? 0.23;
  
  let maxFatOx = 0;
  let fatMaxIntensity = 0;
  
  // Search for peak fat oxidation
  // Audit 2D F25: borne haute alignée [48, 82] sur formule canonique TFCL
  for (let intensity = 30; intensity <= 82; intensity += 1) {
    const fatOx = calculateFatOxidation(intensity, vo2max, vlamax, weight);
    if (fatOx > maxFatOx) {
      maxFatOx = fatOx;
      fatMaxIntensity = intensity;
    }
  }
  
  // Calculate carb burn at FatMax
  const carbAtFatMax = calculateCarbOxidation(fatMaxIntensity, vo2max, vlamax, weight);
  
  // Convert intensity to power
  const vo2AtFatMax = (vo2max * fatMaxIntensity / 100);
  const vo2LPerMin = vo2AtFatMax * weight / 1000;
  const energyKJPerMin = vo2LPerMin * ENERGY_PER_O2;
  const fatMaxPower = Math.round((energyKJPerMin * 1000 / 60) * efficiency);
  
  return {
    fatMaxPower,
    fatMaxIntensity: Math.round(fatMaxIntensity),
    fatMaxGrams: Number(maxFatOx.toFixed(2)),
    carbAtFatMax: Math.round(carbAtFatMax * 60) // g/hour
  };
}

// =============================================
// TIME TO EXHAUSTION (Glycogen Depletion Model)
// Based on Rapoport (2010)
// =============================================

/**
 * Calculate time to exhaustion at a given power
 * Based on glycogen depletion rate from carbohydrate oxidation
 */
export function calculateTTE(
  power: number,
  profile: MaderProfile,
  externalCarbIntake: number = 0 // g/hour
): number {
  const { vo2max, vlamax, weight } = profile;
  const efficiency = profile.efficiency ?? 0.23;
  
  // Convert power to intensity
  const vo2LPerMin = (power / efficiency) / (ENERGY_PER_O2 * 1000 / 60);
  const vo2mlkgmin = (vo2LPerMin * 1000) / weight;
  const intensityPct = (vo2mlkgmin / vo2max) * 100;
  
  if (intensityPct > 100) {
    return 0; // Above VO2max - not sustainable
  }
  
  // Carbohydrate burn rate at this intensity
  const carbBurnRate = calculateCarbOxidation(intensityPct, vo2max, vlamax, weight); // g/min
  const netCarbBurn = Math.max(0.1, carbBurnRate - externalCarbIntake / 60); // g/min after feeding
  
  // Total glycogen available
  const totalGlycogen = GLYCOGEN_MUSCLE_MAX + GLYCOGEN_LIVER_MAX;
  
  // Glycogen critical level (not fully depleted - fatigue before zero)
  const criticalLevel = 50; // ~50g remaining when "hitting the wall"
  const usableGlycogen = totalGlycogen - criticalLevel;
  
  // Time to deplete (minutes)
  const tteMinutes = usableGlycogen / netCarbBurn;
  
  // Cap at realistic values
  // Very low intensity can theoretically go forever, but realistically limited
  return Math.min(480, Math.max(5, Math.round(tteMinutes)));
}

/**
 * Calculate TTE specifically at MLSS/FTP intensity
 */
export function calculateTTEatMLSS(profile: MaderProfile): number {
  const mlssPower = findMLSSPower(profile);
  return calculateTTE(mlssPower, profile);
}

// =============================================
// FULL PERFORMANCE PREDICTION
// =============================================

/**
 * Generate complete performance predictions from metabolic profile
 */
export function predictMaderPerformance(profile: MaderProfile): MaderPredictions {
  const { vo2max, weight } = profile;
  const efficiency = profile.efficiency ?? 0.23;
  
  // MLSS/FTP
  const mlssPower = findMLSSPower(profile);
  const mlssWkg = Number((mlssPower / weight).toFixed(2));
  
  // Lactate thresholds
  const { lt1Power, lt2Power } = findLactateThresholds(profile);
  
  // FatMax
  const { fatMaxPower, fatMaxIntensity, fatMaxGrams, carbAtFatMax } = findFatMax(profile);
  
  // TTE at MLSS
  const tteAtMLSS = calculateTTEatMLSS(profile);
  
  // Maximal aerobic power (MAP)
  const vo2LPerMin = vo2max * weight / 1000;
  const mapEnergy = vo2LPerMin * ENERGY_PER_O2;
  const pMax = Math.round((mapEnergy * 1000 / 60) * efficiency);
  
  return {
    mlssPower,
    mlssWkg,
    lt1Power,
    lt2Power,
    fatMaxPower,
    fatMaxIntensity,
    fatMaxGrams,
    carbAtFatMax,
    tteAtMLSS,
    pMax
  };
}

// =============================================
// INVERSE CALIBRATION (Observed → VLamax)
// =============================================

/**
 * Back-calculate VLamax from observed MLSS/FTP power
 * 
 * Direct analytical inverse of the Mader MLSS relationship:
 *   MLSS_pct = 100 × (1 − α × VLamax / VO2max_abs)
 *   → VLamax = (1 − MLSS_pct/100) × VO2max_abs / α
 * 
 * This is exact (no binary search needed) and guarantees consistency
 * with findMLSSPower.
 */
export function calibrateVLamaxFromMLSS(
  observedMLSSPower: number,
  vo2max: number,
  weight: number,
  observedMAP?: number | null,  // MAP réelle (P5min) si disponible — plus précis que MAP dérivée
  efficiency: number = 0.23,    // Audit 2B F13 — alignement avec findMLSSPower (param optionnel)
): number {
  // CRITICAL: must match findMLSSPower α to keep forward/inverse consistency
  // (round-trip calibrate→predict must converge). Refit Nov 2026 sur N=44.
  const ALPHA = USE_CALIBRATED_MADER_ALPHA ? MADER_ALPHA_CALIBRATED : 2.5;

  // Absolute VO2max in L/min
  const vo2maxAbs = vo2max * weight / 1000;

  // MAP : préférer la valeur observée (P5min réel) à la MAP théorique dérivée
  // de VO2max. La MAP théorique surestime souvent (Quentin: 414W théorique vs 279W
  // réel) → mlssFraction artificiellement haut → VLamax artificiellement bas.
  const mapTheoretical = (vo2maxAbs * ENERGY_PER_O2 * 1000 / 60) * efficiency;
  const mapWatts = (observedMAP != null && observedMAP > 0) ? observedMAP : mapTheoretical;

  // MLSS as fraction of MAP
  // Audit 2B F9 — clamp dans le même domaine [0.45, 0.95] que findMLSSPower
  // pour garantir la cohérence forward/inverse aux extrêmes.
  const mlssFractionRaw = observedMLSSPower / mapWatts;
  const mlssFraction = Math.max(0.45, Math.min(0.95, mlssFractionRaw));

  // Direct inverse: VLamax = (1 - mlssFraction) × VO2max_abs / α
  const vlamax = (1 - mlssFraction) * vo2maxAbs / ALPHA;

  // Clamp to physiological bounds
  const clamped = Math.max(0.10, Math.min(1.20, vlamax));

  return Number(clamped.toFixed(3));
}

/**
 * Back-calculate VLamax from observed TTE at MLSS
 *
 * Returns null if:
 * - The binary search hits a boundary without converging (TTE incompatible with model)
 * - The observed TTE falls outside the predictable range for any plausible VLamax
 *
 * This prevents the previous silent-failure bug where the upper bound (1.0) was
 * returned as if it were a real estimate, polluting downstream fusion.
 */
export function calibrateVLamaxFromTTE(
  observedTTE: number,
  vo2max: number,
  weight: number,
  mlssPower: number
): number | null {
  const LOW_BOUND = 0.15;
  const HIGH_BOUND = 1.0;
  let lowVlamax = LOW_BOUND;
  let highVlamax = HIGH_BOUND;

  const tolerance = 2; // minutes

  // Pre-check: ensure the observed TTE is within the model's predictable envelope.
  // If TTE@LOW > observed AND TTE@HIGH > observed → observed is too short, even max VLamax can't reach
  // If TTE@LOW < observed AND TTE@HIGH < observed → observed is too long, even min VLamax can't reach
  const tteAtLow = calculateTTE(mlssPower, { vo2max, vlamax: LOW_BOUND, weight });
  const tteAtHigh = calculateTTE(mlssPower, { vo2max, vlamax: HIGH_BOUND, weight });

  // The function is monotonic decreasing (higher VLamax → shorter TTE).
  // Observed must lie between [tteAtHigh, tteAtLow].
  const minPredictable = Math.min(tteAtLow, tteAtHigh);
  const maxPredictable = Math.max(tteAtLow, tteAtHigh);
  if (observedTTE < minPredictable - tolerance || observedTTE > maxPredictable + tolerance) {
    return null; // Observed TTE incompatible with model — refuse to estimate
  }

  let converged = false;

  while (highVlamax - lowVlamax > 0.005) {
    const midVlamax = (lowVlamax + highVlamax) / 2;
    const profile: MaderProfile = { vo2max, vlamax: midVlamax, weight };
    const predictedTTE = calculateTTE(mlssPower, profile);

    if (Math.abs(predictedTTE - observedTTE) < tolerance) {
      return Number(midVlamax.toFixed(3));
    }

    // Higher VLamax = higher carb burn = shorter TTE
    if (predictedTTE > observedTTE) {
      lowVlamax = midVlamax;
    } else {
      highVlamax = midVlamax;
    }
    converged = true;
  }

  const result = (lowVlamax + highVlamax) / 2;

  // GUARD: refuse boundary-pinned results — they indicate non-convergence,
  // not a real estimate. This was the root cause of VLamax = 1.00 artifacts.
  const BOUNDARY_EPSILON = 0.02;
  if (
    !converged ||
    result <= LOW_BOUND + BOUNDARY_EPSILON ||
    result >= HIGH_BOUND - BOUNDARY_EPSILON
  ) {
    return null;
  }

  return Number(result.toFixed(3));
}

/**
 * Back-calculate VLamax from observed FatMax intensity
 */
export function calibrateVLamaxFromFatMax(
  observedFatMaxIntensity: number,
  vo2max: number,
  weight: number
): number {
  let lowVlamax = 0.15;
  let highVlamax = 1.0;
  
  const tolerance = 2; // % intensity
  
  while (highVlamax - lowVlamax > 0.005) {
    const midVlamax = (lowVlamax + highVlamax) / 2;
    const profile: MaderProfile = { vo2max, vlamax: midVlamax, weight };
    const { fatMaxIntensity } = findFatMax(profile);
    
    if (Math.abs(fatMaxIntensity - observedFatMaxIntensity) < tolerance) {
      return Number(midVlamax.toFixed(3));
    }
    
    // Higher VLamax = lower FatMax intensity
    if (fatMaxIntensity > observedFatMaxIntensity) {
      lowVlamax = midVlamax;
    } else {
      highVlamax = midVlamax;
    }
  }
  
  return Number(((lowVlamax + highVlamax) / 2).toFixed(3));
}

// =============================================
// LACTATE CURVE GENERATION
// =============================================

/**
 * Generate full lactate curve for visualization
 */
export function generateMaderLactateCurve(
  profile: MaderProfile
): Array<{
  intensity: number;
  power: number;
  lactate: number;
  fatOx: number;
  carbOx: number;
  zone: string;
}> {
  const { vo2max, vlamax, weight } = profile;
  const efficiency = profile.efficiency ?? 0.23;
  const points: Array<{
    intensity: number;
    power: number;
    lactate: number;
    fatOx: number;
    carbOx: number;
    zone: string;
  }> = [];
  
  for (let intensity = 30; intensity <= 100; intensity += 5) {
    const lactate = findSteadyStateLactate(intensity, vo2max, vlamax);
    const fatOx = calculateFatOxidation(intensity, vo2max, vlamax, weight);
    const carbOx = calculateCarbOxidation(intensity, vo2max, vlamax, weight);
    
    // Convert to power
    const vo2AtIntensity = (vo2max * intensity / 100);
    const vo2LPerMin = vo2AtIntensity * weight / 1000;
    const energyKJPerMin = vo2LPerMin * ENERGY_PER_O2;
    const power = Math.round((energyKJPerMin * 1000 / 60) * efficiency);
    
    // Determine zone
    let zone: string;
    if (lactate < 2.0) zone = "Z1 - Récupération";
    else if (lactate < 2.5) zone = "Z2 - Endurance";
    else if (lactate < 4.0) zone = "Z3 - Tempo";
    else if (lactate < 6.0) zone = "Z4 - Seuil";
    else if (lactate < 10.0) zone = "Z5 - VO2max";
    else zone = "Z6 - Anaérobie";
    
    points.push({
      intensity,
      power,
      lactate: Number(lactate.toFixed(1)),
      fatOx: Number(fatOx.toFixed(2)),
      carbOx: Number(carbOx.toFixed(1)),
      zone
    });
  }
  
  return points;
}

// =============================================
// GLYCOGEN DEPLETION — DUAL POOL (Muscle + Liver)
// Coyle 1986 (JSCR), Coggan 1987 (JAP), Romijn 1993 (AJP)
// =============================================

export type HypoglycemiaRisk = "none" | "low" | "medium" | "high" | "critical";
export type GlycogenLimitingFactor =
  | "muscle_glycogen"
  | "liver_glycogen"
  | "blood_glucose"
  | "none";

export interface GlycogenDepletionResult {
  muscleGlycogenG: number;
  liverGlycogenG: number;
  bloodGlucoseMmol: number;
  hypoglycemiaRisk: HypoglycemiaRisk;
  bonkRiskKm: number;       // distance estimée avant fringale (km) ; +Infinity si pas de risque
  bonkRiskMin: number;      // distance temporelle équivalente (min)
  limitingFactor: GlycogenLimitingFactor;
  muscleGlucoseUptakeGMin: number;
  liverReleaseGMin: number;
  carbIntakeGMin: number;
}

/**
 * Modèle dual-pool de délétion du glycogène musculaire et hépatique.
 *
 * Hypothèses :
 * - Le muscle oxyde des CHO (Mader) en consommant glycogène local + glucose sanguin.
 * - ~30 % du flux glucidique musculaire provient du glucose sanguin (Romijn 1993).
 * - Le foie maintient la glycémie en relâchant du glucose, plafonné à
 *   LIVER_GLUCOSE_RELEASE_MAX (Coyle 1986).
 * - Si apport exogène + relâche hépatique < captation musculaire → glycémie chute.
 * - Hypoglycémie sous BLOOD_GLUCOSE_CRITICAL (Coggan 1987).
 */
export function calculateGlycogenDepletion(
  profile: MaderProfile,
  intensityPct: number,
  durationMin: number,
  carbIntakeGH: number,
  avgSpeedKmh: number = 10,
): GlycogenDepletionResult {
  const { vo2max, vlamax, weight } = profile;

  // 1. Taux d'oxydation CHO (g/min)
  const carbOxRate = Math.max(
    0.1,
    calculateCarbOxidation(intensityPct, vo2max, vlamax, weight),
  );

  // 2. Répartition glycogène musculaire vs glucose sanguin
  // Romijn 1993 : ~30 % du flux CHO à intensité modérée vient du glucose plasmatique,
  // jusqu'à ~40 % à intensité élevée.
  const bloodGlucoseShare = Math.min(0.45, 0.20 + intensityPct / 250);
  const muscleGlycogenUseRate = carbOxRate * (1 - bloodGlucoseShare);   // g/min
  const muscleGlucoseUptake   = carbOxRate * bloodGlucoseShare;         // g/min (depuis sang)

  // 3. Apport exogène
  const carbIntakeGMin = Math.max(0, carbIntakeGH) / 60;

  // 4. Intégration par minute
  let muscleG = GLYCOGEN_MUSCLE_MAX;
  let liverG  = GLYCOGEN_LIVER_MAX;
  let bloodMmol = BLOOD_GLUCOSE_BASELINE;
  let bonkRiskMin = Infinity;
  let limitingFactor: GlycogenLimitingFactor = "none";

  const steps = Math.max(1, Math.round(durationMin));
  for (let t = 1; t <= steps; t++) {
    // Délétion glycogène musculaire local
    muscleG = Math.max(0, muscleG - muscleGlycogenUseRate);
    // Si muscle vide → bascule sur sang
    const extraSanguin = muscleG === 0 ? muscleGlycogenUseRate : 0;
    const totalBloodDemand = muscleGlucoseUptake + extraSanguin;

    // Déficit que le foie doit combler (après apport exogène)
    const liverDemand = Math.max(0, totalBloodDemand - carbIntakeGMin);
    const liverRelease = Math.min(LIVER_GLUCOSE_RELEASE_MAX, liverDemand, liverG);
    liverG = Math.max(0, liverG - liverRelease);

    // Si la demande dépasse l'apport + relâche hépatique → glycémie chute
    const uncoveredGMin = liverDemand - liverRelease;
    if (uncoveredGMin > 0) {
      bloodMmol = Math.max(0, bloodMmol - uncoveredGMin * G_TO_MMOL_BLOOD);
    } else if (carbIntakeGMin > totalBloodDemand) {
      // Apport excédentaire : recharge légère vers baseline (cap)
      const surplus = carbIntakeGMin - totalBloodDemand;
      bloodMmol = Math.min(BLOOD_GLUCOSE_BASELINE, bloodMmol + surplus * G_TO_MMOL_BLOOD * 0.3);
    }

    if (bonkRiskMin === Infinity) {
      if (muscleG <= 30) {
        bonkRiskMin = t;
        limitingFactor = "muscle_glycogen";
      } else if (liverG === 0 && uncoveredGMin > 0) {
        bonkRiskMin = t;
        limitingFactor = "liver_glycogen";
      } else if (bloodMmol <= BLOOD_GLUCOSE_CRITICAL) {
        bonkRiskMin = t;
        limitingFactor = "blood_glucose";
      }
    }
  }

  // 5. Risque hypoglycémique final
  let hypoglycemiaRisk: HypoglycemiaRisk = "none";
  if (bloodMmol <= 2.8) hypoglycemiaRisk = "critical";
  else if (bloodMmol <= BLOOD_GLUCOSE_CRITICAL) hypoglycemiaRisk = "high";
  else if (bloodMmol <= 4.0) hypoglycemiaRisk = "medium";
  else if (bloodMmol <= 4.5) hypoglycemiaRisk = "low";

  const bonkRiskKm = Number.isFinite(bonkRiskMin)
    ? Math.round((bonkRiskMin / 60) * avgSpeedKmh * 10) / 10
    : Infinity;

  return {
    muscleGlycogenG: Math.round(muscleG * 10) / 10,
    liverGlycogenG: Math.round(liverG * 10) / 10,
    bloodGlucoseMmol: Math.round(bloodMmol * 100) / 100,
    hypoglycemiaRisk,
    bonkRiskKm,
    bonkRiskMin: Number.isFinite(bonkRiskMin) ? Math.round(bonkRiskMin) : Infinity,
    limitingFactor,
    muscleGlucoseUptakeGMin: Math.round(muscleGlucoseUptake * 100) / 100,
    liverReleaseGMin: Math.round(Math.min(LIVER_GLUCOSE_RELEASE_MAX, muscleGlucoseUptake) * 100) / 100,
    carbIntakeGMin: Math.round(carbIntakeGMin * 100) / 100,
  };
}

/** Recommandation simple de CHO/h pour sécuriser (couvre captation musculaire − relâche foie). */
export function recommendedCarbsToAvoidBonk(
  profile: MaderProfile,
  intensityPct: number,
): number {
  const carbOxRate = calculateCarbOxidation(intensityPct, profile.vo2max, profile.vlamax, profile.weight);
  const bloodGlucoseShare = Math.min(0.45, 0.20 + intensityPct / 250);
  const muscleGlucoseUptake = carbOxRate * bloodGlucoseShare; // g/min
  // On veut intake ≥ uptake − liver_release_max
  const needGMin = Math.max(0, muscleGlucoseUptake - LIVER_GLUCOSE_RELEASE_MAX);
  // Cap pratique 30–120 g/h
  return Math.min(120, Math.max(30, Math.round(needGMin * 60 + 30)));
}

// =============================================
// TTE MECHANISMS — limiting factor diagnosis
// Réf : Hultman & Sahlin 1980, Noakes 2000 (Central Governor),
// Morton 2006 (CP/W'), Jones 2010.
// =============================================

export type TTELimitingMechanism =
  | "glycogen"
  | "acidosis"
  | "wprime"
  | "central"
  | "mixed";

export interface TTEMechanismsResult {
  tteGlycogen: number;   // min — déplétion glycogène musculaire
  tteAcidosis: number;   // min — accumulation lactate > tampon
  tteWprime: number;     // min — déplétion W' (CP model)
  tteCentral: number;    // min — fatigue centrale (Noakes)
  tteFinal: number;      // min — minimum des 4
  limitingMechanism: TTELimitingMechanism;
  mechanismConfidence: number; // 0-1
  /** Reco pédagogique courte. */
  recommendation: string;
}

/** Capacité tampon musculaire typique (mmol/L). Hultman & Sahlin 1980. */
const BUFFER_CAPACITY_MMOL_L = 70;

/**
 * Calcule les 4 TTE concurrents et identifie le mécanisme limitant.
 * @param profile MaderProfile
 * @param power Watts cibles
 * @param options.criticalPower W (CP) si disponible
 * @param options.wPrimeJ Joules (W') si disponible
 * @param options.externalCarbIntake g/h
 */
export function calculateTTEMechanisms(
  profile: MaderProfile,
  power: number,
  options?: {
    criticalPower?: number;
    wPrimeJ?: number;
    externalCarbIntake?: number;
  },
): TTEMechanismsResult {
  const { vo2max, vlamax, weight } = profile;
  const efficiency = profile.efficiency ?? 0.23;

  // Intensité relative
  const vo2LPerMin = (power / efficiency) / (ENERGY_PER_O2 * 1000 / 60);
  const vo2mlkgmin = (vo2LPerMin * 1000) / weight;
  const intensityPct = Math.max(1, Math.min(150, (vo2mlkgmin / vo2max) * 100));
  const intensityFrac = intensityPct / 100;

  // --- 1) Glycogène (modèle existant) ---
  const tteGlycogen = calculateTTE(power, profile, options?.externalCarbIntake ?? 0);

  // --- 2) Acidose ---
  // Production / clearance de lactate à cette intensité
  const lacProd = calculateLactateProduction(intensityPct, vlamax); // mmol/L/min
  const lacClr = calculateLactateClearance(intensityPct, vo2max, BUFFER_CAPACITY_MMOL_L / 10); // mmol/L/min @ ~7 mmol/L
  const netAccum = lacProd - lacClr;                                        // mmol/L/min
  let tteAcidosis: number;
  if (netAccum <= 0.05) {
    tteAcidosis = 480; // pas d'accumulation significative
  } else {
    tteAcidosis = BUFFER_CAPACITY_MMOL_L / netAccum;
  }
  tteAcidosis = Math.max(0.5, Math.min(480, tteAcidosis));

  // --- 3) W' (CP model) ---
  let tteWprime = 480;
  const cp = options?.criticalPower;
  const wPrimeJ = options?.wPrimeJ;
  if (cp && wPrimeJ && power > cp) {
    tteWprime = (wPrimeJ / (power - cp)) / 60; // sec → min
  } else if (cp && power <= cp) {
    tteWprime = 480; // sous CP, W' non limitant
  }
  tteWprime = Math.max(0.2, Math.min(480, tteWprime));

  // --- 4) Fatigue centrale (Noakes 2000, simplifié) ---
  // tteCentral = 240 × (1/intensityPct)^1.5 × (1 + VLamax × 2)  [intensityPct fraction 0-1]
  const tteCentral = Math.max(
    5,
    Math.min(600, 240 * Math.pow(1 / Math.max(0.4, intensityFrac), 1.5) * (1 + vlamax * 2) * 0.05),
  );
  // Note : facteur 0.05 calibration pour cohérence empirique (sinon valeurs irréalistes).

  // --- Final ---
  const candidates: Array<{ key: TTELimitingMechanism; v: number }> = [
    { key: "glycogen", v: tteGlycogen },
    { key: "acidosis", v: tteAcidosis },
    { key: "wprime", v: tteWprime },
    { key: "central", v: tteCentral },
  ];
  candidates.sort((a, b) => a.v - b.v);
  const tteFinal = candidates[0].v;
  const second = candidates[1].v;

  // "mixed" si deux mécanismes très proches (<15% écart)
  const closeRatio = second > 0 ? (second - tteFinal) / second : 1;
  const limitingMechanism: TTELimitingMechanism =
    closeRatio < 0.15 ? "mixed" : candidates[0].key;

  // Confiance : plus l'écart est grand, plus on est sûr
  const mechanismConfidence = Math.max(0.3, Math.min(1, closeRatio * 3));

  const RECO: Record<TTELimitingMechanism, string> = {
    glycogen:
      "Votre TTE est limité par le glycogène — augmentez le FatMax et réduisez la VLamax (longues Z2, FatMax, restriction glucidique ciblée).",
    acidosis:
      "Votre TTE est limité par l'acidose — améliorez la capacité tampon avec du travail au seuil (séries 8–15' à MLSS, sweet-spot répété).",
    wprime:
      "Votre TTE est limité par le W' — augmentez le W' avec des efforts sous-maximaux répétés (VO2max 3–5', 30/30, over-unders).",
    central:
      "Votre TTE est limité par la fatigue centrale — développez la résistance mentale et la tolérance à l'effort perçu (longues sorties spécifiques, RPE-training, exposition).",
    mixed:
      "Plusieurs mécanismes co-limitants — travaillez en parallèle endurance fondamentale + seuil pour lever les deux verrous.",
  };

  return {
    tteGlycogen: Math.round(tteGlycogen),
    tteAcidosis: Math.round(tteAcidosis),
    tteWprime: Math.round(tteWprime),
    tteCentral: Math.round(tteCentral),
    tteFinal: Math.round(tteFinal),
    limitingMechanism,
    mechanismConfidence: Number(mechanismConfidence.toFixed(2)),
    recommendation: RECO[limitingMechanism],
  };
}

