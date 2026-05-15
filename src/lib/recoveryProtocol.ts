/**
 * Recovery NUTRITION Protocol — F7
 *
 * F40 disambiguation: this module computes post-effort NUTRITION targets
 * (CHO, protein, fluids, sodium) following the 4R model. It is unrelated to
 * `enrichedWorkoutsRecovery.ts`, which is the TRAINING catalog of REST/Récup
 * sessions used by the workout library / AI plan generator. The two files
 * are intentionally separate (nutrition prescription vs. workout catalog).
 *
 * Post-effort 4R model: Rehydrate, Refuel, Repair, Rest
 *
 * Scientific basis:
 * - Burke et al. (2017) — IOC consensus: post-exercise refuelling
 * - Ivy (2004) — Glycogen resynthesis: 1.0–1.2 g/kg/h CHO first 4h
 * - Moore et al. (2014) — 0.4 g/kg leucine-rich protein per meal × 4 (≈1.6–2.0 g/kg/d)
 * - Phillips & Van Loon (2011) — Protein recommendations for athletes
 * - Shirreffs & Sawka (2011) — 150% of body mass deficit in fluids over 4h
 * - Areta et al. (2013) — 20–40g protein every 3–4h optimizes MPS
 * - Kerksick et al. (2018) — ISSN nutrient timing position stand
 *
 * Three windows:
 *  1. Acute (0–60 min): rapid CHO + protein, fluids + sodium
 *  2. Refuel (1–4h): repeated CHO 1.0–1.2 g/kg/h + 20–40g protein
 *  3. 24h: full daily targets (CHO 7–10 g/kg, PRO 1.6–2.0 g/kg)
 */

export type RecoveryGoal = "next_day_session" | "full_recovery_48h" | "race_block";
export type EffortIntensity = "low" | "moderate" | "high" | "depleting";

export interface RecoveryInput {
  weightKg: number | null;
  durationMin: number;
  intensity: EffortIntensity;
  goal?: RecoveryGoal;
  /** Estimated body mass loss (kg) — defaults to 2% of weight */
  bodyMassLossKg?: number;
  hotConditions?: boolean;
}

export interface RecoveryProtocol {
  acuteWindow: {
    cho_g: number;
    protein_g: number;
    fluid_ml: number;
    sodium_mg: number;
    examples: string[];
  };
  refuelWindow: {
    cho_g_per_h: number;
    cho_total_g: number;
    protein_per_meal_g: number;
    meals: number;
    durationH: number;
  };
  daily24h: {
    cho_g: number;
    protein_g: number;
    fluid_ml: number;
  };
  recommendations: string[];
  warnings: string[];
}

const CHO_REFUEL_RATE: Record<EffortIntensity, number> = {
  low: 0.6,
  moderate: 0.8,
  high: 1.0,
  depleting: 1.2,
};

const DAILY_CHO_PER_KG: Record<EffortIntensity, number> = {
  low: 5,
  moderate: 7,
  high: 9,
  depleting: 10,
};

export function computeRecoveryProtocol(input: RecoveryInput): RecoveryProtocol {
  const { weightKg, durationMin, intensity, goal = "next_day_session", hotConditions } = input;
  const w = weightKg ?? 70;

  // Acute window (0–60 min): 1.0–1.2 g/kg CHO + 0.3–0.4 g/kg protein
  const acuteChoPerKg = intensity === "depleting" ? 1.2 : intensity === "high" ? 1.0 : 0.8;
  const acuteProteinPerKg = 0.3;

  // Fluid replacement: 150% of mass deficit (Shirreffs 2011)
  const massLossKg = input.bodyMassLossKg ?? (w * 0.02);
  const acuteFluidMl = Math.round(massLossKg * 1500); // 150% over 4h, ~40% in first hour
  const sodiumMg = Math.round(massLossKg * 800 * (hotConditions ? 1.3 : 1));

  const refuelHours = goal === "race_block" ? 6 : 4;
  const refuelRate = CHO_REFUEL_RATE[intensity];
  const cho_total = Math.round(refuelRate * w * refuelHours);

  const proteinPerMeal = Math.round(0.3 * w);
  const meals = Math.ceil(refuelHours / 1.5);

  const dailyChoPerKg = DAILY_CHO_PER_KG[intensity];
  const dailyProteinPerKg = goal === "race_block" ? 1.8 : 1.6;

  const recommendations: string[] = [];
  recommendations.push("0–30 min: shake CHO+PRO ratio 3:1 ou 4:1 (ex: lait chocolaté 500 mL)");
  if (intensity === "depleting" || durationMin >= 180) {
    recommendations.push("Prioriser CHO à index glycémique élevé pendant 4h (riz blanc, pâtes, compote)");
  }
  recommendations.push(`Protéine ${proteinPerMeal}g par prise toutes les 1h30–2h × ${meals} (leucine ≥2.5g/repas)`);
  recommendations.push("Hydratation: viser urines claires en 4h (peser avant/après si possible)");
  if (goal === "race_block" || intensity === "depleting") {
    recommendations.push("30g caséine au coucher → MPS nocturne (Res et al. 2012)");
  }
  if (hotConditions) {
    recommendations.push("Conditions chaudes: +30% sodium, boissons fraîches, électrolytes étalés sur 4h");
  }

  const warnings: string[] = [];
  if (!weightKg) {
    warnings.push("Poids manquant — recommandations basées sur 70 kg par défaut");
  }
  if (durationMin >= 240 && intensity !== "depleting") {
    warnings.push("Effort >4h: envisager profil 'depleting' si glycogène vide subjectif");
  }
  if (goal === "next_day_session" && intensity === "depleting") {
    warnings.push("Récup 24h limitée après effort déplétant — performance J+1 probablement réduite");
  }

  return {
    acuteWindow: {
      cho_g: Math.round(acuteChoPerKg * w),
      protein_g: Math.round(acuteProteinPerKg * w),
      fluid_ml: Math.round(acuteFluidMl * 0.4),
      sodium_mg: Math.round(sodiumMg * 0.4),
      examples: [
        "500 mL lait chocolaté + banane",
        "Smoothie: 1 banane + 250 mL lait + 30g whey + miel",
        "Bowl riz blanc + 100g poulet + compote",
      ],
    },
    refuelWindow: {
      cho_g_per_h: Math.round(refuelRate * w),
      cho_total_g: cho_total,
      protein_per_meal_g: proteinPerMeal,
      meals,
      durationH: refuelHours,
    },
    daily24h: {
      cho_g: Math.round(dailyChoPerKg * w),
      protein_g: Math.round(dailyProteinPerKg * w),
      fluid_ml: Math.round(massLossKg * 1500 + 35 * w),
    },
    recommendations,
    warnings,
  };
}
