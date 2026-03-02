/**
 * Glycolytic Profile Refinement Layer
 * 
 * Uses the glycolytic profile signals (P5s/FTP index, decay rates 1s→5s, 5s→30s, 30s→60s)
 * as an independent validation and refinement of the Score G-based VLamax estimation.
 * 
 * PRINCIPLE:
 * The Score G formula uses normalized power ratios weighted linearly.
 * The glycolytic profile provides nonlinear, shape-based signals that capture
 * the SHAPE of the power curve, not just individual ratios.
 * 
 * When both converge → confidence boost + narrower range
 * When they diverge → warning + wider range
 * 
 * REFINEMENT FORMULA:
 *   VLamax_glyco = f(glycolyticIndex, decayRate5to30, decayRate30to60)
 *   delta = VLamax_glyco - VLamax_scoreG
 *   adjustment = delta × blending_weight (0.15 for bike, 0.20 for run)
 *   VLamax_refined = VLamax_scoreG + adjustment
 *
 * Two For Coaching Lab Method™
 */

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// =============================================
// TYPES
// =============================================

export interface GlycolyticRefinementInput {
  /** VLamax from Score G formula */
  vlamaxScoreG: number;
  /** Confidence from Score G */
  confidenceScoreG: number;
  /** Range width from Score G */
  rangeWidth: number;
  /** P5s / threshold ratio (glycolytic index) */
  glycolyticIndex: number | null;
  /** Decay rate 1s→5s in % */
  decayRate1to5: number | null;
  /** Decay rate 5s→30s in % */
  decayRate5to30: number | null;
  /** Decay rate 30s→60s in % */
  decayRate30to60: number | null;
  /** Sport context */
  sport: "bike" | "run";
}

export interface GlycolyticRefinementResult {
  /** Refined VLamax */
  vlamaxRefined: number;
  /** Refined confidence */
  confidenceRefined: number;
  /** Refined range width */
  rangeWidthRefined: number;
  /** VLamax estimated from glycolytic profile alone */
  vlamaxGlyco: number | null;
  /** Delta between glyco and scoreG */
  delta: number | null;
  /** Convergence assessment */
  convergence: "strong" | "moderate" | "weak" | "divergent" | "insufficient";
  /** Adjustment applied */
  adjustment: number;
  /** Explanation */
  explanation: string;
  /** Additional sources */
  additionalSources: string[];
}

// =============================================
// GLYCOLYTIC INDEX → VLAMAX MAPPING
// =============================================

/**
 * Estimate VLamax from the glycolytic index (P5s / threshold)
 * 
 * BIKE calibration (P5s / FTP):
 *   Index 1.5 → VLamax ~0.25 (diesel)
 *   Index 2.0 → VLamax ~0.40 (equilibre)
 *   Index 2.5 → VLamax ~0.55 (puissant)
 *   Index 3.0 → VLamax ~0.70 (explosif)
 *   Index 3.5 → VLamax ~0.85 (sprinter)
 * 
 * RUN calibration (P5s / RPT):
 *   Index 1.6 → VLamax ~0.25
 *   Index 2.0 → VLamax ~0.38
 *   Index 2.5 → VLamax ~0.50
 *   Index 3.0 → VLamax ~0.65
 */
function glycolyticIndexToVlamax(index: number, sport: "bike" | "run"): number {
  if (sport === "bike") {
    // Linear mapping: VLamax = 0.25 + (index - 1.5) * 0.30
    return clamp(0.25 + (index - 1.5) * 0.30, 0.20, 1.05);
  } else {
    // Running: slightly different calibration
    // VLamax = 0.25 + (index - 1.6) * 0.286
    return clamp(0.25 + (index - 1.6) * 0.286, 0.20, 0.90);
  }
}

/**
 * Estimate VLamax adjustment from decay rate 5s→30s
 * 
 * Low decay (<20%) = sustained glycolytic output → higher VLamax
 * High decay (>40%) = poor anaerobic endurance → lower VLamax
 * 
 * This captures the SHAPE of the glycolytic system response,
 * not just peak output.
 */
function decayRateToAdjustment(decay5to30: number): number {
  // Inverted: low decay = high VLamax sustain
  // Neutral at 30% decay
  // Adjustment range: -0.06 to +0.06
  return clamp((30 - decay5to30) / 100 * 0.60, -0.06, 0.06);
}

/**
 * Estimate VLamax adjustment from decay rate 30s→60s
 * 
 * This captures glycolytic endurance:
 * Low decay 30→60 = good glycolytic capacity sustained
 * High decay 30→60 = rapid glycolytic depletion
 */
function decayRate30to60Adjustment(decay30to60: number): number {
  // Neutral at 25% decay
  // Adjustment range: -0.04 to +0.04
  return clamp((25 - decay30to60) / 100 * 0.40, -0.04, 0.04);
}

// =============================================
// MAIN REFINEMENT FUNCTION
// =============================================

export function refineVlamaxWithGlycolyticProfile(input: GlycolyticRefinementInput): GlycolyticRefinementResult {
  const {
    vlamaxScoreG, confidenceScoreG, rangeWidth,
    glycolyticIndex, decayRate1to5, decayRate5to30, decayRate30to60,
    sport,
  } = input;

  const additionalSources: string[] = [];

  // Check if we have enough glycolytic data
  const hasGI = glycolyticIndex != null && glycolyticIndex > 0;
  const hasD530 = decayRate5to30 != null;
  const hasD3060 = decayRate30to60 != null;

  if (!hasGI && !hasD530) {
    return {
      vlamaxRefined: vlamaxScoreG,
      confidenceRefined: confidenceScoreG,
      rangeWidthRefined: rangeWidth,
      vlamaxGlyco: null,
      delta: null,
      convergence: "insufficient",
      adjustment: 0,
      explanation: "Données glycolytiques insuffisantes pour affinage",
      additionalSources: [],
    };
  }

  // 1. Estimate VLamax from glycolytic index
  let vlamaxGlyco: number | null = null;
  if (hasGI) {
    vlamaxGlyco = glycolyticIndexToVlamax(glycolyticIndex!, sport);
    additionalSources.push("GI");
  }

  // 2. Apply decay rate adjustments
  let decayAdj = 0;
  if (hasD530) {
    decayAdj += decayRateToAdjustment(decayRate5to30!);
    additionalSources.push("DR5→30");
  }
  if (hasD3060) {
    decayAdj += decayRate30to60Adjustment(decayRate30to60!);
    additionalSources.push("DR30→60");
  }

  if (vlamaxGlyco != null) {
    vlamaxGlyco += decayAdj;
    vlamaxGlyco = clamp(vlamaxGlyco, sport === "bike" ? 0.20 : 0.20, sport === "bike" ? 1.05 : 0.90);
  }

  // 3. Compute delta and convergence
  const delta = vlamaxGlyco != null ? vlamaxGlyco - vlamaxScoreG : null;
  const absDelta = delta != null ? Math.abs(delta) : null;

  let convergence: GlycolyticRefinementResult["convergence"];
  if (absDelta == null) {
    convergence = "insufficient";
  } else if (absDelta <= 0.04) {
    convergence = "strong";
  } else if (absDelta <= 0.08) {
    convergence = "moderate";
  } else if (absDelta <= 0.15) {
    convergence = "weak";
  } else {
    convergence = "divergent";
  }

  // 4. Compute blending adjustment
  // Blending weight: how much the glycolytic profile pulls the estimate
  // Bike: 15% blend (Score G already captures most), Run: 20% (glycolytic shape more informative)
  const blendWeight = sport === "bike" ? 0.15 : 0.20;
  let adjustment = 0;

  if (delta != null) {
    switch (convergence) {
      case "strong":
        // Strong convergence → small pull + confidence boost
        adjustment = delta * blendWeight;
        break;
      case "moderate":
        // Moderate → standard pull
        adjustment = delta * blendWeight;
        break;
      case "weak":
        // Weak → reduced pull, widen range
        adjustment = delta * blendWeight * 0.5;
        break;
      case "divergent":
        // Divergent → no adjustment, just widen range + warn
        adjustment = 0;
        break;
    }
  }

  // Also add pure decay adjustments if no glycolytic index
  if (!hasGI && hasD530) {
    adjustment = decayAdj * blendWeight * 2; // Amplify since it's the only signal
  }

  // 5. Compute refined values
  const boundsMax = sport === "bike" ? 1.05 : 0.90;
  const vlamaxRefined = clamp(vlamaxScoreG + adjustment, 0.20, boundsMax);

  // Confidence adjustment
  let confidenceBonus = 0;
  let rangeMultiplier = 1.0;

  switch (convergence) {
    case "strong":
      confidenceBonus = 0.08; // Strong convergence → +8% confidence
      rangeMultiplier = 0.75; // Narrow range by 25%
      break;
    case "moderate":
      confidenceBonus = 0.04; // +4%
      rangeMultiplier = 0.88;
      break;
    case "weak":
      confidenceBonus = 0;
      rangeMultiplier = 1.0;
      break;
    case "divergent":
      confidenceBonus = -0.05; // Penalize
      rangeMultiplier = 1.30; // Widen range
      break;
    case "insufficient":
      break;
  }

  const confidenceRefined = clamp(confidenceScoreG + confidenceBonus, 0.20, 0.95);
  const rangeWidthRefined = rangeWidth * rangeMultiplier;

  // 6. Build explanation
  let explanation = "";
  if (convergence === "strong") {
    explanation = `Convergence forte entre Score G (${vlamaxScoreG.toFixed(2)}) et profil glycolytique (${vlamaxGlyco?.toFixed(2) ?? "—"}).`;
    explanation += ` Confiance renforcée (+${(confidenceBonus * 100).toFixed(0)}%), plage resserrée.`;
  } else if (convergence === "moderate") {
    explanation = `Convergence modérée. Score G: ${vlamaxScoreG.toFixed(2)}, profil glycolytique: ${vlamaxGlyco?.toFixed(2) ?? "—"}.`;
    explanation += ` Ajustement: ${adjustment > 0 ? "+" : ""}${adjustment.toFixed(3)}`;
  } else if (convergence === "weak") {
    explanation = `Convergence faible (Δ=${absDelta?.toFixed(2)}). L'indice glycolytique suggère un profil différent du Score G.`;
    explanation += ` Vérifier les conditions de test.`;
  } else if (convergence === "divergent") {
    explanation = `⚠️ Divergence importante (Δ=${absDelta?.toFixed(2)}) entre Score G et profil glycolytique.`;
    explanation += ` Possible : fatigue résiduelle, données capteur incohérentes, ou conditions de test non standardisées.`;
  } else {
    explanation = "Données glycolytiques insuffisantes pour affinage.";
  }

  // Add decay rate interpretation
  if (hasD530 && decayRate5to30 != null) {
    if (decayRate5to30 < 20) {
      explanation += ` Decay 5→30s faible (${decayRate5to30.toFixed(0)}%) → bonne capacité glycolytique soutenue.`;
    } else if (decayRate5to30 > 40) {
      explanation += ` Decay 5→30s élevé (${decayRate5to30.toFixed(0)}%) → capacité anaérobie limitée en durée.`;
    }
  }

  return {
    vlamaxRefined: Number(vlamaxRefined.toFixed(2)),
    confidenceRefined: Number(confidenceRefined.toFixed(2)),
    rangeWidthRefined: Number(rangeWidthRefined.toFixed(4)),
    vlamaxGlyco: vlamaxGlyco != null ? Number(vlamaxGlyco.toFixed(2)) : null,
    delta: delta != null ? Number(delta.toFixed(3)) : null,
    convergence,
    adjustment: Number(adjustment.toFixed(4)),
    explanation,
    additionalSources,
  };
}

// =============================================
// CONVERGENCE UI HELPERS
// =============================================

export function getConvergenceColor(conv: GlycolyticRefinementResult["convergence"]): string {
  switch (conv) {
    case "strong": return "text-emerald-600 dark:text-emerald-400";
    case "moderate": return "text-blue-600 dark:text-blue-400";
    case "weak": return "text-amber-600 dark:text-amber-400";
    case "divergent": return "text-destructive";
    case "insufficient": return "text-muted-foreground";
  }
}

export function getConvergenceBadgeVariant(conv: GlycolyticRefinementResult["convergence"]): "default" | "secondary" | "destructive" | "outline" {
  switch (conv) {
    case "strong": return "default";
    case "moderate": return "secondary";
    case "weak": return "outline";
    case "divergent": return "destructive";
    case "insufficient": return "outline";
  }
}

export function getConvergenceLabel(conv: GlycolyticRefinementResult["convergence"]): string {
  switch (conv) {
    case "strong": return "Convergence forte";
    case "moderate": return "Convergence modérée";
    case "weak": return "Convergence faible";
    case "divergent": return "Divergence détectée";
    case "insufficient": return "Données insuffisantes";
  }
}
