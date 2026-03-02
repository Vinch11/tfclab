/**
 * VLamax Run V2 Enhanced — Formule TFCL™ Course à Pied
 * Basée sur la courbe de puissance running (Stryd / Garmin Running Power)
 * 
 * FORMULE V2 CAP OFFICIELLE:
 * Inputs : RunPowerThreshold (RPT), P1s, P5s, P30s, P60s, P5min, TTE
 * Ratios : r1=P1s/RPT ; r5=P5s/RPT ; r30=P30s/RPT ; r60=P60s/RPT ; rfm=RPT/P5min
 * Normalisation :
 *   S1  = clamp((r1 - 2.0) / 1.5, 0, 1)     — Neuromuscular power
 *   S5  = clamp((r5 - 1.8) / 1.2, 0, 1)      — Anaerobic peak
 *   S30 = clamp((r30 - 1.30) / 0.70, 0, 1)   — Glycolytic capacity
 *   S60 = clamp((r60 - 1.15) / 0.55, 0, 1)   — Glycolytic endurance
 *   E   = clamp((0.90 - rfm) / 0.20, 0, 1)   — Aerobic efficiency gap
 *   D   = clamp((50 - TTE) / 20, 0, 1)        — Durability
 * Score G = 0.10*S1 + 0.25*S5 + 0.30*S30 + 0.15*S60 + 0.10*E + 0.10*D
 * VLamax_raw = 0.22 + 0.68 * G   (cap range: 0.20 → 0.90)
 * VLamax_final = clamp(VLamax_raw, 0.20, 0.90)
 * 
 * NOTE: Running power ratios are lower than cycling because
 * running power has less neuromuscular headroom above threshold.
 */

import { PHYSIOLOGICAL_BOUNDS } from "./vlamaxV2Engine";

// =============================================
// TYPES
// =============================================

export interface VLamaxRunV2EnhancedInput {
  /** Running power at threshold (~20-30min best) in Watts */
  runPowerThreshold: number;
  /** Peak 1s running power (W) */
  runPower1s?: number | null;
  /** Peak 5s running power (W) */
  runPower5s?: number | null;
  /** Best 30s running power (W) */
  runPower30s?: number | null;
  /** Best 60s running power (W) */
  runPower60s?: number | null;
  /** Best 5min running power (W) — aerobic reference */
  runPower5min?: number | null;
  /** TTE in minutes */
  tteMin?: number | null;
  /** Weight in kg (for W/kg context) */
  weightKg?: number | null;
  /** Protocol quality 1-5 */
  protocolQuality?: 1 | 2 | 3 | 4 | 5;
  /** Pace-based cross-validation */
  vma?: number | null;
  paceThresholdSecPerKm?: number | null;
}

export interface VLamaxRunV2Components {
  r1: number | null;
  r5: number | null;
  r30: number | null;
  r60: number | null;
  rfm: number | null;
  S1: number | null;
  S5: number | null;
  S30: number | null;
  S60: number | null;
  E: number | null;
  D: number | null;
  scoreG: number;
  vlamax_raw: number;
  vlamax_final: number;
  /** Cross-validation from pace ratio (if available) */
  paceRatioVlamax?: number | null;
  paceRatioDelta?: number | null;
}

export interface VLamaxRunV2EnhancedResult {
  value: number;
  rangeMin: number;
  rangeMax: number;
  confidence: number;
  confidenceLabel: "Élevée" | "Moyenne" | "Faible" | "Très faible";
  formula: "tfcl_run_v2_enhanced" | "tfcl_run_v2_partial" | "tfcl_run_v1_fallback" | "insufficient";
  formulaLabel: string;
  components: VLamaxRunV2Components | null;
  pedagogicalMessage: string;
  warnings: string[];
  sources: string[];
  /** Running-specific glycolytic profile */
  runGlycolyticProfile: RunGlycolyticProfile | null;
}

export interface RunGlycolyticProfile {
  /** Glycolytic index: P5s / RPT */
  glycolyticIndex: number | null;
  /** Decay 1s→5s (neuromuscular) */
  decayRate1to5: number | null;
  /** Decay 5s→30s (glycolytic sustain) */
  decayRate5to30: number | null;
  /** Decay 30s→60s (glycolytic endurance) */
  decayRate30to60: number | null;
  /** W/kg at threshold */
  thresholdWkg: number | null;
  /** W/kg at P5s */
  p5sWkg: number | null;
  /** Category */
  category: "explosive" | "puissant" | "equilibre" | "endurant" | "diesel" | "unknown";
  /** Interpretation text */
  interpretation: string;
}

// =============================================
// HELPERS
// =============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function getConfidenceLabel(conf: number): "Élevée" | "Moyenne" | "Faible" | "Très faible" {
  if (conf >= 0.80) return "Élevée";
  if (conf >= 0.65) return "Moyenne";
  if (conf >= 0.50) return "Faible";
  return "Très faible";
}

// =============================================
// MAIN COMPUTATION
// =============================================

export function computeVLamaxRunV2Enhanced(input: VLamaxRunV2EnhancedInput): VLamaxRunV2EnhancedResult {
  const warnings: string[] = [];
  const sources: string[] = [];

  const {
    runPowerThreshold,
    runPower1s, runPower5s, runPower30s, runPower60s, runPower5min,
    tteMin, weightKg, protocolQuality,
    vma, paceThresholdSecPerKm,
  } = input;

  // Validation: threshold power required
  if (!runPowerThreshold || runPowerThreshold <= 0) {
    return {
      value: 0.42,
      rangeMin: 0.25,
      rangeMax: 0.60,
      confidence: 0.20,
      confidenceLabel: "Très faible",
      formula: "insufficient",
      formulaLabel: "Données insuffisantes",
      components: null,
      pedagogicalMessage: "Puissance seuil course (RPT) requise pour estimer VLamax CAP",
      warnings: ["Puissance seuil course non renseignée"],
      sources: [],
      runGlycolyticProfile: null,
    };
  }

  sources.push("RPT");
  const RPT = runPowerThreshold;

  // Check available data
  const hasP1 = runPower1s != null && runPower1s > 0;
  const hasP5 = runPower5s != null && runPower5s > 0;
  const hasP30 = runPower30s != null && runPower30s > 0;
  const hasP60 = runPower60s != null && runPower60s > 0;
  const hasP5min = runPower5min != null && runPower5min > 0;
  const hasTTE = tteMin != null && tteMin > 0;

  const fullDataCount = [hasP1, hasP5, hasP30, hasP60, hasP5min, hasTTE].filter(Boolean).length;

  // =============================================
  // CAS V2 ENHANCED: au moins 2 sources court-terme
  // =============================================
  if (fullDataCount >= 2 && (hasP5 || hasP30)) {
    const r1 = hasP1 ? runPower1s! / RPT : null;
    const r5 = hasP5 ? runPower5s! / RPT : null;
    const r30 = hasP30 ? runPower30s! / RPT : null;
    const r60 = hasP60 ? runPower60s! / RPT : null;
    const rfm = hasP5min ? RPT / runPower5min! : null;

    // Normalized scores
    const S1 = r1 !== null ? clamp((r1 - 2.0) / 1.5, 0, 1) : null;
    const S5 = r5 !== null ? clamp((r5 - 1.8) / 1.2, 0, 1) : null;
    const S30 = r30 !== null ? clamp((r30 - 1.30) / 0.70, 0, 1) : null;
    const S60 = r60 !== null ? clamp((r60 - 1.15) / 0.55, 0, 1) : null;
    const E = rfm !== null ? clamp((0.90 - rfm) / 0.20, 0, 1) : null;
    const D = hasTTE ? clamp((50 - tteMin!) / 20, 0, 1) : null;

    // Weighted Score G
    let scoreG = 0;
    let totalWeight = 0;

    const addScore = (s: number | null, w: number, label: string) => {
      if (s !== null) {
        scoreG += w * s;
        totalWeight += w;
        sources.push(label);
      }
    };

    addScore(S1, 0.10, "P1s");
    addScore(S5, 0.25, "P5s");
    addScore(S30, 0.30, "P30s");
    addScore(S60, 0.15, "P60s");
    addScore(E, 0.10, "P5min");
    addScore(D, 0.10, "TTE");

    if (totalWeight > 0 && totalWeight < 1) {
      scoreG = scoreG / totalWeight;
    }

    // VLamax_raw = 0.22 + 0.68 * G (running range: 0.22 → 0.90)
    const vlamax_raw = 0.22 + 0.68 * scoreG;
    const vlamax_final = clamp(vlamax_raw, PHYSIOLOGICAL_BOUNDS.cap.min, PHYSIOLOGICAL_BOUNDS.cap.max);

    // Pace-based cross-validation
    let paceRatioVlamax: number | null = null;
    let paceRatioDelta: number | null = null;
    if (vma && vma > 0 && paceThresholdSecPerKm && paceThresholdSecPerKm > 0) {
      const paceKmh = 3600 / paceThresholdSecPerKm;
      const ratio = paceKmh / vma;
      paceRatioVlamax = ratio >= 0.95 ? 0.22 : ratio <= 0.70 ? 0.72 : 0.72 - (ratio - 0.70) * 2.0;
      paceRatioDelta = vlamax_final - paceRatioVlamax;
      if (Math.abs(paceRatioDelta) > 0.10) {
        warnings.push(`Écart puissance vs allure: Δ${paceRatioDelta > 0 ? '+' : ''}${paceRatioDelta.toFixed(2)} — vérifier calibration capteur`);
      }
      sources.push("Pace/VMA");
    }

    // Confidence
    const qualityFactor = protocolQuality ? (protocolQuality - 1) / 4 : 0.5;
    let confidence: number;
    if (fullDataCount >= 5) confidence = 0.78 + 0.12 * qualityFactor;
    else if (fullDataCount >= 4) confidence = 0.70 + 0.12 * qualityFactor;
    else if (fullDataCount >= 3) confidence = 0.62 + 0.12 * qualityFactor;
    else confidence = 0.52 + 0.12 * qualityFactor;

    // Cross-validation bonus
    if (paceRatioVlamax !== null && Math.abs(paceRatioDelta!) <= 0.05) {
      confidence = Math.min(0.95, confidence + 0.05);
    }

    const rangeWidth = confidence >= 0.75 ? 0.05 : confidence >= 0.60 ? 0.08 : 0.12;
    const rangeMin = clamp(vlamax_final - rangeWidth, PHYSIOLOGICAL_BOUNDS.cap.min, PHYSIOLOGICAL_BOUNDS.cap.max);
    const rangeMax = clamp(vlamax_final + rangeWidth, PHYSIOLOGICAL_BOUNDS.cap.min, PHYSIOLOGICAL_BOUNDS.cap.max);

    // Warnings
    if (!hasP1) warnings.push("P1s manquant");
    if (!hasP5) warnings.push("P5s manquant : donnée clé du profil glycolytique");
    if (!hasP30) warnings.push("P30s manquant : donnée clé de la capacité glycolytique");
    if (!hasP5min) warnings.push("P5min manquant : référence aérobie");

    // Components
    const components: VLamaxRunV2Components = {
      r1, r5, r30, r60, rfm,
      S1, S5, S30, S60, E, D,
      scoreG: Number(scoreG.toFixed(3)),
      vlamax_raw: Number(vlamax_raw.toFixed(3)),
      vlamax_final: Number(vlamax_final.toFixed(2)),
      paceRatioVlamax: paceRatioVlamax ? Number(paceRatioVlamax.toFixed(2)) : null,
      paceRatioDelta: paceRatioDelta ? Number(paceRatioDelta.toFixed(2)) : null,
    };

    // Pedagogical message
    const topContrib: string[] = [];
    if (S1 !== null && S1 > 0.5) topContrib.push("P1s explosif");
    if (S5 !== null && S5 > 0.5) topContrib.push("P5s élevé");
    if (S30 !== null && S30 > 0.5) topContrib.push("P30s dominant");
    if (S60 !== null && S60 > 0.5) topContrib.push("P60s élevé");
    if (E !== null && E > 0.5) topContrib.push("Gap RPT/P5min important");
    if (D !== null && D > 0.5) topContrib.push("TTE court");

    const pedagogicalMessage = topContrib.length > 0
      ? `Facteurs principaux : ${topContrib.join(", ")}`
      : "Profil running équilibré sur la courbe de puissance";

    // Glycolytic profile
    const runGlycolyticProfile = buildRunGlycolyticProfile(
      runPower1s ?? null, runPower5s ?? null, runPower30s ?? null, runPower60s ?? null,
      RPT, weightKg ?? null
    );

    return {
      value: Number(vlamax_final.toFixed(2)),
      rangeMin: Number(rangeMin.toFixed(2)),
      rangeMax: Number(rangeMax.toFixed(2)),
      confidence: Number(confidence.toFixed(2)),
      confidenceLabel: getConfidenceLabel(confidence),
      formula: fullDataCount >= 4 ? "tfcl_run_v2_enhanced" : "tfcl_run_v2_partial",
      formulaLabel: fullDataCount >= 4 ? "TFCL Run V2 Enhanced" : "TFCL Run V2 Partiel",
      components,
      pedagogicalMessage,
      warnings,
      sources,
      runGlycolyticProfile,
    };
  }

  // =============================================
  // FALLBACK: pace-based only
  // =============================================
  if (vma && vma > 0 && paceThresholdSecPerKm && paceThresholdSecPerKm > 0) {
    const paceKmh = 3600 / paceThresholdSecPerKm;
    const ratio = paceKmh / vma;
    const estimated = ratio >= 0.95 ? 0.22 : ratio <= 0.70 ? 0.72 : 0.72 - (ratio - 0.70) * 2.0;
    const value = clamp(estimated, PHYSIOLOGICAL_BOUNDS.cap.min, PHYSIOLOGICAL_BOUNDS.cap.max);

    sources.push("Seuil/VMA");
    warnings.push("Estimation basée sur l'allure uniquement — ajouter données puissance pour plus de précision");

    return {
      value: Number(value.toFixed(2)),
      rangeMin: Number(clamp(value - 0.12, 0.20, 0.90).toFixed(2)),
      rangeMax: Number(clamp(value + 0.12, 0.20, 0.90).toFixed(2)),
      confidence: 0.45,
      confidenceLabel: "Faible",
      formula: "tfcl_run_v1_fallback",
      formulaLabel: "TFCL Run V1 (allure seule)",
      components: null,
      pedagogicalMessage: "Estimation approximative — importer les records de puissance pour affiner",
      warnings,
      sources,
      runGlycolyticProfile: null,
    };
  }

  // =============================================
  // INSUFFICIENT
  // =============================================
  return {
    value: 0.42,
    rangeMin: 0.25,
    rangeMax: 0.60,
    confidence: 0.20,
    confidenceLabel: "Très faible",
    formula: "insufficient",
    formulaLabel: "Données insuffisantes",
    components: null,
    pedagogicalMessage: "Importer les records de puissance running (Stryd/Garmin) pour estimer VLamax CAP",
    warnings: ["Données de puissance running insuffisantes"],
    sources: [],
    runGlycolyticProfile: null,
  };
}

// =============================================
// RUNNING GLYCOLYTIC PROFILE
// =============================================

function buildRunGlycolyticProfile(
  p1s: number | null,
  p5s: number | null,
  p30s: number | null,
  p60s: number | null,
  rpt: number,
  weightKg: number | null,
): RunGlycolyticProfile {
  const glycolyticIndex = p5s && rpt > 0 ? p5s / rpt : null;
  const decayRate1to5 = p1s && p5s && p1s > 0 ? ((p1s - p5s) / p1s) * 100 : null;
  const decayRate5to30 = p5s && p30s && p5s > 0 ? ((p5s - p30s) / p5s) * 100 : null;
  const decayRate30to60 = p30s && p60s && p30s > 0 ? ((p30s - p60s) / p30s) * 100 : null;
  const thresholdWkg = weightKg && weightKg > 0 ? rpt / weightKg : null;
  const p5sWkg = p5s && weightKg && weightKg > 0 ? p5s / weightKg : null;

  let category: RunGlycolyticProfile["category"] = "unknown";
  let interpretation = "";

  if (glycolyticIndex !== null) {
    if (glycolyticIndex >= 3.0) {
      category = "explosive";
      interpretation = "Profil explosif. Capacité neuromusculaire dominante. VLamax CAP probablement élevée (> 0.55).";
    } else if (glycolyticIndex >= 2.5) {
      category = "puissant";
      interpretation = "Profil puissant. Bon potentiel anaérobie. VLamax modérée à haute (0.45-0.55).";
    } else if (glycolyticIndex >= 2.0) {
      category = "equilibre";
      interpretation = "Profil équilibré. Compromis puissance/endurance optimal pour demi-fond. VLamax modérée (0.35-0.48).";
    } else if (glycolyticIndex >= 1.6) {
      category = "endurant";
      interpretation = "Profil endurant. Excellente économie de course. VLamax basse (0.28-0.38).";
    } else {
      category = "diesel";
      interpretation = "Profil diesel. Ratio anaérobie/aérobie très faible. VLamax très basse (< 0.30).";
    }
  }

  if (decayRate5to30 !== null) {
    if (decayRate5to30 < 20) {
      interpretation += " Faible décroissance 5s→30s = bonne capacité glycolytique soutenue en course.";
    } else if (decayRate5to30 > 40) {
      interpretation += " Forte décroissance 5s→30s = capacité anaérobie limitée en durée.";
    }
  }

  if (thresholdWkg !== null) {
    interpretation += ` RPT: ${thresholdWkg.toFixed(1)} W/kg.`;
  }

  return {
    glycolyticIndex: glycolyticIndex ? Number(glycolyticIndex.toFixed(2)) : null,
    decayRate1to5: decayRate1to5 ? Number(decayRate1to5.toFixed(1)) : null,
    decayRate5to30: decayRate5to30 ? Number(decayRate5to30.toFixed(1)) : null,
    decayRate30to60: decayRate30to60 ? Number(decayRate30to60.toFixed(1)) : null,
    thresholdWkg: thresholdWkg ? Number(thresholdWkg.toFixed(1)) : null,
    p5sWkg: p5sWkg ? Number(p5sWkg.toFixed(1)) : null,
    category,
    interpretation: interpretation.trim(),
  };
}

// =============================================
// UI HELPERS
// =============================================

export function getRunVLamaxColor(value: number): string {
  if (value < 0.30) return "text-cyan-600 dark:text-cyan-400";
  if (value < 0.45) return "text-green-600 dark:text-green-400";
  if (value < 0.60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function getRunVLamaxCategory(value: number): string {
  if (value < 0.30) return "Ultra-endurant";
  if (value < 0.40) return "Endurant";
  if (value < 0.50) return "Équilibré";
  if (value < 0.60) return "Puissant";
  return "Explosif";
}

export function getRunGlycolyticCategoryColor(cat: RunGlycolyticProfile["category"]): string {
  switch (cat) {
    case "diesel": return "text-cyan-600 dark:text-cyan-400";
    case "endurant": return "text-green-600 dark:text-green-400";
    case "equilibre": return "text-emerald-600 dark:text-emerald-400";
    case "puissant": return "text-amber-600 dark:text-amber-400";
    case "explosive": return "text-red-600 dark:text-red-400";
    default: return "text-muted-foreground";
  }
}
