/**
 * VLamax Run V2 Enhanced — Formule TFCL™ Course à Pied
 * Two For Coaching Lab Method™
 * 
 * ARCHITECTURE SCIENTIFIQUE (recalibrée):
 * ─────────────────────────────────────────
 * M1 (PRIMARY)    : Cross-validation VMA/Seuil → ratio allure seuil/VMA
 *                   Plus le seuil est proche de VMA, plus VLamax est basse.
 *                   Réf: Jones & Vanhatalo 2017, Billat 2001
 * 
 * M2 (POWER-BASED): Score G normalisé (puissance running)
 *                   Indices P1s, P5s, P30s, P60s, P5min, TTE
 *                   Normalisations recalibrées + TTE élargi (60-TTE)/30
 * 
 * FUSION           : VMA/seuil (40%) + Score G (60%) si les deux disponibles
 *                   Score G seul si pas de VMA
 *                   VMA/seuil seul en fallback
 * 
 * FORMULE Score G CAP RECALIBRÉE:
 * Normalisations :
 *   S1  = clamp((r1 - 2.0) / 1.5, 0, 1)       — Neuromuscular power
 *   S5  = clamp((r5 - 1.6) / 1.2, 0, 1)        — Anaerobic peak [recalibré]
 *   S30 = clamp((r30 - 1.20) / 0.80, 0, 1)     — Glycolytic capacity [recalibré]
 *   S60 = clamp((r60 - 1.08) / 0.55, 0, 1)     — Glycolytic endurance [recalibré]
 *   E   = clamp((0.92 - rfm) / 0.22, 0, 1)     — Aerobic efficiency gap [ajusté]
 *   D   = clamp((60 - TTE) / 30, 0, 1)          — Durability [élargi: moins agressif]
 * 
 * Poids Score G (recalibrés) :
 *   S1: 0.08, S5: 0.22, S30: 0.28, S60: 0.15, E: 0.15, D: 0.12
 * 
 * VLamax_raw = 0.20 + 0.70 * G   (cap range: 0.20 → 0.90)
 * VLamax_final = clamp(VLamax_raw, 0.20, 0.90)
 * 
 * CROSS-VALIDATION VMA/SEUIL (Billat 2001):
 * ratio = allure_seuil_kmh / VMA
 *   ratio > 0.92 → VLamax très basse (< 0.28)
 *   ratio 0.85-0.92 → VLamax basse-modérée (0.28-0.40)
 *   ratio 0.78-0.85 → VLamax modérée (0.40-0.55)
 *   ratio < 0.78 → VLamax haute (> 0.55)
 * Formule continue: VLamax_pace = 0.20 + 0.70 * clamp((0.92 - ratio) / 0.20, 0, 1)
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
  // VMA/Seuil cross-validation
  vma_seuil_ratio: number | null;
  vlamax_from_pace: number | null;
  
  // Power ratios
  r1: number | null;
  r5: number | null;
  r30: number | null;
  r60: number | null;
  rfm: number | null;
  
  // Normalized scores
  S1: number | null;
  S5: number | null;
  S30: number | null;
  S60: number | null;
  E: number | null;
  D: number | null;
  
  // Score G
  scoreG: number | null;
  vlamax_from_scoreG: number | null;
  
  // Fusion
  vlamax_raw: number;
  vlamax_final: number;
  fusion_method: "dual_validation" | "scoreG_only" | "pace_only" | "insufficient";
  divergence: number | null;
  
  /** Legacy compat */
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
  runGlycolyticProfile: RunGlycolyticProfile | null;
}

export interface RunGlycolyticProfile {
  glycolyticIndex: number | null;
  decayRate1to5: number | null;
  decayRate5to30: number | null;
  decayRate30to60: number | null;
  thresholdWkg: number | null;
  p5sWkg: number | null;
  category: "explosive" | "puissant" | "equilibre" | "endurant" | "diesel" | "unknown";
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
// VMA/SEUIL → VLAMAX ESTIMATION (Billat 2001, Jones 2017)
// =============================================

/**
 * Estimation continue de VLamax CAP via le ratio allure seuil / VMA.
 * Plus le ratio est élevé (seuil proche de VMA), plus VLamax est basse.
 * 
 * Rationale: un athlète avec un seuil à 92% de VMA a une très faible
 * contribution glycolytique à l'intensité seuil → VLamax basse.
 * 
 * Réf: Billat 2001, Jones & Vanhatalo 2017
 */
function estimateVLamaxFromPaceRatio(ratio: number): number {
  // ratio = allure_seuil_kmh / VMA
  // ratio 0.92+ → VLamax ~0.20 (très basse)
  // ratio 0.72  → VLamax ~0.90 (très haute)
  // Interpolation linéaire continue
  return clamp(0.20 + 0.70 * clamp((0.92 - ratio) / 0.20, 0, 1), 0.20, 0.90);
}

// =============================================
// MAIN COMPUTATION (Scientific recalibration)
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

  // =============================================
  // ÉTAPE 1: Cross-validation VMA/Seuil
  // =============================================
  let vlamaxFromPace: number | null = null;
  let vmaSeuratio: number | null = null;
  
  if (vma && vma > 0 && paceThresholdSecPerKm && paceThresholdSecPerKm > 0) {
    const paceKmh = 3600 / paceThresholdSecPerKm;
    vmaSeuratio = paceKmh / vma;
    vlamaxFromPace = estimateVLamaxFromPaceRatio(vmaSeuratio);
    sources.push("VMA/Seuil");
  }

  // =============================================
  // ÉTAPE 2: Score G puissance running
  // =============================================
  let scoreGValue: number | null = null;
  let vlamaxFromScoreG: number | null = null;
  let scoreGComponents: {
    r1: number | null; r5: number | null; r30: number | null; r60: number | null; rfm: number | null;
    S1: number | null; S5: number | null; S30: number | null; S60: number | null; E: number | null; D: number | null;
    scoreG: number;
  } | null = null;
  
  // Validation: threshold power required for Score G
  if (runPowerThreshold && runPowerThreshold > 0) {
    sources.push("RPT");
    const RPT = runPowerThreshold;
    
    const hasP1 = runPower1s != null && runPower1s > 0;
    const hasP5 = runPower5s != null && runPower5s > 0;
    const hasP30 = runPower30s != null && runPower30s > 0;
    const hasP60 = runPower60s != null && runPower60s > 0;
    const hasP5min = runPower5min != null && runPower5min > 0;
    const hasTTE = tteMin != null && tteMin > 0;
    
    const fullDataCount = [hasP1, hasP5, hasP30, hasP60, hasP5min, hasTTE].filter(Boolean).length;
    
    if (fullDataCount >= 2 && (hasP5 || hasP30)) {
      const r1 = hasP1 ? runPower1s! / RPT : null;
      const r5 = hasP5 ? runPower5s! / RPT : null;
      const r30 = hasP30 ? runPower30s! / RPT : null;
      const r60 = hasP60 ? runPower60s! / RPT : null;
      const rfm = hasP5min ? RPT / runPower5min! : null;
      
      // Normalized scores (RECALIBRATED v2 — synthetic cohort N=40, RMSE 0.024)
      const S1 = r1 !== null ? clamp((r1 - 2.0) / 1.5, 0, 1) : null;
      const S5 = r5 !== null ? clamp((r5 - 1.6) / 1.0, 0, 1) : null;        // range 1.2 → 1.0
      const S30 = r30 !== null ? clamp((r30 - 1.30) / 0.65, 0, 1) : null;   // 1.20/0.80 → 1.30/0.65
      const S60 = r60 !== null ? clamp((r60 - 0.95) / 0.45, 0, 1) : null;   // 1.08/0.55 → 0.95/0.45
      const E = rfm !== null ? clamp((0.92 - rfm) / 0.18, 0, 1) : null;     // range 0.22 → 0.18
      const D = hasTTE ? clamp((60 - tteMin!) / 30, 0, 1) : null;
      
      // Weighted Score G (RECALIBRATED weights)
      let scoreG = 0;
      let totalWeight = 0;
      
      const addScore = (s: number | null, w: number, label: string) => {
        if (s !== null) { scoreG += w * s; totalWeight += w; sources.push(label); }
      };
      
      // S1: 0.08, S5: 0.22, S30: 0.28, S60: 0.15, E: 0.15, D: 0.12
      addScore(S1, 0.08, "P1s");
      addScore(S5, 0.22, "P5s");
      addScore(S30, 0.28, "P30s");
      addScore(S60, 0.15, "P60s");
      addScore(E, 0.15, "P5min");
      addScore(D, 0.12, "TTE");
      
      if (totalWeight > 0 && totalWeight < 1) {
        scoreG = scoreG / totalWeight;
      }
      
      // VLamax_raw = 0.20 + 0.70 * G (recalibrated: floor 0.20, range 0.70)
      const vlamaxRaw = clamp(0.20 + 0.70 * scoreG, 0.20, 0.90);
      
      scoreGValue = Number(scoreG.toFixed(3));
      vlamaxFromScoreG = Number(vlamaxRaw.toFixed(3));
      scoreGComponents = { r1, r5, r30, r60, rfm, S1, S5, S30, S60, E, D, scoreG: Number(scoreG.toFixed(3)) };
      
      // Warnings
      if (!hasP5) warnings.push("P5s manquant : donnée clé du profil glycolytique");
      if (!hasP30) warnings.push("P30s manquant : donnée clé de la capacité glycolytique");
      if (!hasP5min) warnings.push("P5min manquant : référence aérobie");
    }
  }
  
  // =============================================
  // ÉTAPE 3: FUSION
  // =============================================
  let finalValue: number;
  let confidence: number;
  let fusionMethod: VLamaxRunV2Components["fusion_method"];
  let divergence: number | null = null;
  let formulaType: VLamaxRunV2EnhancedResult["formula"];
  let formulaLabel: string;
  
  const qualityFactor = protocolQuality ? (protocolQuality - 1) / 4 : 0.5;
  
  if (vlamaxFromPace !== null && vlamaxFromScoreG !== null) {
    // DUAL VALIDATION: VMA/Seuil (50%) + Score G (50%) — recalibré N=40
    finalValue = vlamaxFromPace * 0.50 + vlamaxFromScoreG * 0.50;
    fusionMethod = "dual_validation";
    divergence = Number(Math.abs(vlamaxFromPace - vlamaxFromScoreG).toFixed(3));
    
    const dataCount = scoreGComponents ? Object.values(scoreGComponents).filter(v => v !== null).length : 0;
    confidence = 0.70 + 0.12 * qualityFactor;
    
    if (divergence > 0.12) {
      warnings.push(`Divergence puissance vs allure (Δ=${divergence.toFixed(2)}) — vérifier calibration capteur puissance`);
      confidence = Math.max(0.50, confidence - 0.12);
    } else if (divergence > 0.06) {
      warnings.push(`Écart modéré puissance vs allure (Δ=${divergence.toFixed(2)})`);
      confidence = Math.max(0.55, confidence - 0.05);
    } else {
      // Convergence bonus
      confidence = Math.min(0.90, confidence + 0.05);
    }
    
    formulaType = "tfcl_run_v2_enhanced";
    formulaLabel = "TFCL Run V2 (VMA/Seuil + Score G)";
    
  } else if (vlamaxFromScoreG !== null) {
    // Score G seul
    finalValue = vlamaxFromScoreG;
    fusionMethod = "scoreG_only";
    confidence = 0.55 + 0.10 * qualityFactor;
    formulaType = "tfcl_run_v2_partial";
    formulaLabel = "TFCL Run V2 (puissance seule)";
    warnings.push("VMA manquante : ajouter VMA pour cross-validation allure/puissance");
    
  } else if (vlamaxFromPace !== null) {
    // VMA/Seuil seul
    finalValue = vlamaxFromPace;
    fusionMethod = "pace_only";
    confidence = 0.48;
    formulaType = "tfcl_run_v1_fallback";
    formulaLabel = "TFCL Run V1 (allure seule)";
    warnings.push("Puissance running manquante — estimation basée sur allure uniquement");
    
  } else {
    // Insufficient
    return {
      value: 0, rangeMin: 0, rangeMax: 0,
      confidence: 0, confidenceLabel: "Très faible",
      formula: "insufficient", formulaLabel: "Données insuffisantes",
      components: null,
      pedagogicalMessage: "Données insuffisantes — importer les records de puissance running (Stryd/Garmin) ou renseigner VMA + allure seuil",
      warnings: ["Données insuffisantes pour estimer VLamax CAP"],
      sources: [], runGlycolyticProfile: null,
    };
  }
  
  // Clamp final
  finalValue = Number(clamp(finalValue, 0.20, 0.90).toFixed(2));
  
  // =============================================
  // ÉTAPE 4: PLAGE D'INCERTITUDE
  // =============================================
  const baseRange = confidence >= 0.75 ? 0.04 : confidence >= 0.60 ? 0.07 : confidence >= 0.50 ? 0.10 : 0.14;
  const divergenceBonus = divergence != null && divergence > 0.06 ? divergence * 0.5 : 0;
  const rangeWidth = baseRange + divergenceBonus;
  const rangeMin = Number(clamp(finalValue - rangeWidth, 0.20, 0.90).toFixed(2));
  const rangeMax = Number(clamp(finalValue + rangeWidth, 0.20, 0.90).toFixed(2));
  
  // =============================================
  // ÉTAPE 5: PEDAGOGICAL + GLYCOLYTIC PROFILE
  // =============================================
  const topContrib: string[] = [];
  if (vlamaxFromPace !== null) topContrib.push(`VMA/Seuil: ${vlamaxFromPace.toFixed(2)} (ratio ${vmaSeuratio?.toFixed(2)})`);
  if (vlamaxFromScoreG !== null) topContrib.push(`Score G: ${vlamaxFromScoreG.toFixed(2)}`);
  
  const pedagogicalMessage = topContrib.length > 0
    ? `Méthodes : ${topContrib.join(" | ")}`
    : "Estimation limitée — données insuffisantes";
  
  const RPT = runPowerThreshold || 0;
  const runGlycolyticProfile = RPT > 0
    ? buildRunGlycolyticProfile(runPower1s ?? null, runPower5s ?? null, runPower30s ?? null, runPower60s ?? null, RPT, weightKg ?? null)
    : null;
  
  // Build components
  const components: VLamaxRunV2Components = {
    vma_seuil_ratio: vmaSeuratio,
    vlamax_from_pace: vlamaxFromPace,
    r1: scoreGComponents?.r1 ?? null,
    r5: scoreGComponents?.r5 ?? null,
    r30: scoreGComponents?.r30 ?? null,
    r60: scoreGComponents?.r60 ?? null,
    rfm: scoreGComponents?.rfm ?? null,
    S1: scoreGComponents?.S1 ?? null,
    S5: scoreGComponents?.S5 ?? null,
    S30: scoreGComponents?.S30 ?? null,
    S60: scoreGComponents?.S60 ?? null,
    E: scoreGComponents?.E ?? null,
    D: scoreGComponents?.D ?? null,
    scoreG: scoreGValue,
    vlamax_from_scoreG: vlamaxFromScoreG,
    vlamax_raw: finalValue,
    vlamax_final: finalValue,
    fusion_method: fusionMethod,
    divergence,
    paceRatioVlamax: vlamaxFromPace,
    paceRatioDelta: vlamaxFromScoreG !== null && vlamaxFromPace !== null
      ? Number((vlamaxFromScoreG - vlamaxFromPace).toFixed(2))
      : null,
  };
  
  return {
    value: finalValue,
    rangeMin,
    rangeMax,
    confidence: Number(Math.min(0.92, confidence).toFixed(2)),
    confidenceLabel: getConfidenceLabel(confidence),
    formula: formulaType,
    formulaLabel,
    components,
    pedagogicalMessage,
    warnings,
    sources,
    runGlycolyticProfile,
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
