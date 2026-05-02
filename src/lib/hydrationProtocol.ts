/**
 * Hydration Protocol — F6
 * Individualized sweat rate + adaptive sodium model
 *
 * Scientific basis:
 * - Baker LB (2017) Sweating rate and sweat sodium concentration in athletes
 * - ACSM Position Stand (Sawka et al. 2007) — Exercise & Fluid Replacement
 * - Burke & Hawley (2018) Swifter, higher, stronger — fluid strategies
 * - Hew-Butler et al. (2015) Statement on EAH (exercise-associated hyponatremia)
 * - McCubbin et al. (2020) Sports Dietitians Australia position — endurance nutrition
 *
 * Key principles:
 * - Fluid replacement target: 100% of sweat losses for efforts >2h, 60–80% for shorter
 * - Cap at ~800 mL/h to avoid GI distress / hyponatremia (Hew-Butler 2015)
 * - Sodium: 300–1000 mg/L sweat depending on phenotype (low/avg/high/salty sweater)
 * - Heat & humidity multipliers (Sawka 2007): +20% per 5°C above 20°C WBGT
 */

export type SweatRateLevel = "low" | "average" | "high" | "very_high";
export type SodiumPhenotype = "low" | "average" | "high" | "salty";

export interface HydrationInput {
  weightKg: number | null;
  durationMin: number;
  sport: "run" | "bike" | "tri" | "trail";
  /** Measured sweat rate in mL/h, or null to estimate */
  measuredSweatRateMlH?: number | null;
  sweatLevel?: SweatRateLevel;
  sodiumPhenotype?: SodiumPhenotype;
  /** Ambient temperature °C */
  tempC?: number;
  /** Relative humidity 0–100 */
  humidity?: number;
}

export interface HydrationProtocol {
  sweatRateMlH: number;
  sweatRateSource: "measured" | "estimated";
  fluidTargetMlH: number;
  fluidCapWarning: boolean;
  sodiumMgPerL: number;
  sodiumMgPerH: number;
  totalFluidMl: number;
  totalSodiumMg: number;
  heatMultiplier: number;
  recommendations: string[];
  warnings: string[];
  schedule: Array<{ timeMin: number; fluidMl: number; sodiumMg: number; note?: string }>;
}

const ESTIMATED_SWEAT_RATE: Record<SweatRateLevel, number> = {
  low: 500,
  average: 800,
  high: 1100,
  very_high: 1500,
};

const SODIUM_CONCENTRATION: Record<SodiumPhenotype, number> = {
  low: 400,    // mg Na+ / L
  average: 700,
  high: 1000,
  salty: 1400, // "salty sweater" — visible salt residue
};

function estimateSweatRate(sport: HydrationInput["sport"], level: SweatRateLevel, weightKg: number | null): number {
  let base = ESTIMATED_SWEAT_RATE[level];
  // Bike tends to have higher sweat rate due to less evaporative cooling at lower wind
  // Run has more evaporation but higher metabolic heat
  if (sport === "bike") base *= 0.95;
  if (sport === "run" || sport === "trail") base *= 1.05;
  // Body mass scaling (Baker 2017): larger athletes sweat more
  if (weightKg && weightKg > 0) {
    const scale = weightKg / 70;
    base *= Math.pow(scale, 0.6);
  }
  return Math.round(base);
}

function computeHeatMultiplier(tempC?: number, humidity?: number): number {
  if (tempC == null) return 1;
  let mult = 1;
  if (tempC > 20) {
    const above = tempC - 20;
    mult += (above / 5) * 0.2;
  }
  if (humidity != null && humidity > 60) {
    mult += ((humidity - 60) / 100) * 0.15;
  }
  return Math.min(mult, 1.6);
}

export function computeHydrationProtocol(input: HydrationInput): HydrationProtocol {
  const {
    weightKg,
    durationMin,
    sport,
    measuredSweatRateMlH,
    sweatLevel = "average",
    sodiumPhenotype = "average",
    tempC,
    humidity,
  } = input;

  const baseSweat = measuredSweatRateMlH && measuredSweatRateMlH > 0
    ? measuredSweatRateMlH
    : estimateSweatRate(sport, sweatLevel, weightKg);

  const heatMultiplier = computeHeatMultiplier(tempC, humidity);
  const sweatRateMlH = Math.round(baseSweat * heatMultiplier);

  // Replacement target: longer race → closer to 100% of losses
  const replacementRatio = durationMin >= 180 ? 0.85 : durationMin >= 90 ? 0.75 : 0.65;
  let fluidTargetMlH = Math.round(sweatRateMlH * replacementRatio);

  // Safety cap (Hew-Butler 2015): avoid >800 mL/h sustained for most athletes
  const fluidCap = 900;
  const fluidCapWarning = fluidTargetMlH > fluidCap;
  if (fluidCapWarning) fluidTargetMlH = fluidCap;

  const sodiumMgPerL = SODIUM_CONCENTRATION[sodiumPhenotype];
  // Sodium replacement: 50–80% of sweat sodium concentration applied to fluid intake
  const sodiumReplaceRatio = sodiumPhenotype === "salty" ? 0.8 : 0.6;
  const sodiumMgPerH = Math.round((fluidTargetMlH / 1000) * sodiumMgPerL * sodiumReplaceRatio);

  const totalFluidMl = Math.round((fluidTargetMlH * durationMin) / 60);
  const totalSodiumMg = Math.round((sodiumMgPerH * durationMin) / 60);

  const recommendations: string[] = [
    `Boire ~${Math.round(fluidTargetMlH / 4)} mL toutes les 15 min (≈${fluidTargetMlH} mL/h)`,
    `Sodium: ${sodiumMgPerH} mg/h (${sodiumPhenotype === "salty" ? "salty sweater" : sodiumPhenotype})`,
  ];

  if (durationMin >= 120) {
    recommendations.push("Alterner boisson glucidique-électrolytes (CHO 6–8%) et eau plate");
  }
  if (sport === "bike" || sport === "tri") {
    recommendations.push("Bidons pré-pesés pour suivre l'apport réel (objectif: <2% perte de masse)");
  }
  if (sport === "run" || sport === "trail") {
    recommendations.push("Flasks souples 250–500 mL — boire toutes les 10–15 min en petites gorgées");
  }

  const warnings: string[] = [];
  if (fluidCapWarning) {
    warnings.push(`Sueur estimée >1000 mL/h: l'apport est plafonné à ${fluidCap} mL/h pour éviter hyponatrémie/GI`);
  }
  if (heatMultiplier >= 1.3) {
    warnings.push("Conditions chaudes/humides: pré-refroidissement (slushie 7 mL/kg) recommandé");
  }
  if (totalFluidMl > (weightKg ?? 70) * 1000 * 0.04) {
    warnings.push("Volume total élevé — fractionner et tester en entraînement");
  }
  if (sodiumPhenotype === "salty" && durationMin >= 240) {
    warnings.push("Salty sweater + effort >4h: envisager capsules sodium concentrées (Salt Stick, etc.)");
  }

  // Schedule every 15 min
  const schedule: HydrationProtocol["schedule"] = [];
  const fluidPer15 = Math.round(fluidTargetMlH / 4);
  const sodiumPer15 = Math.round(sodiumMgPerH / 4);
  for (let t = 15; t <= durationMin; t += 15) {
    schedule.push({
      timeMin: t,
      fluidMl: fluidPer15,
      sodiumMg: sodiumPer15,
      note: t === 15 ? "Première gorgée — ne pas attendre la soif" : undefined,
    });
  }

  return {
    sweatRateMlH,
    sweatRateSource: measuredSweatRateMlH ? "measured" : "estimated",
    fluidTargetMlH,
    fluidCapWarning,
    sodiumMgPerL,
    sodiumMgPerH,
    totalFluidMl,
    totalSodiumMg,
    heatMultiplier: Math.round(heatMultiplier * 100) / 100,
    recommendations,
    warnings,
    schedule,
  };
}
