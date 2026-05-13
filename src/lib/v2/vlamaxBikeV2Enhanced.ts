/**
 * VLamax Bike V2 Enhanced — Formule TFCL™ scientifiquement rigoureuse
 * Two For Coaching Lab Method™
 * 
 * ARCHITECTURE SCIENTIFIQUE (Mader-First):
 * ─────────────────────────────────────────
 * M1 (PRIMARY)  : Mader MLSS inverse → calibrateVLamaxFromMLSS(FTP, VO2max, poids)
 *                 Gold standard physiologique. Résout l'équation métabolique inverse.
 *                 Réf: Mader (2003), Heck & Schulz (2002)
 * 
 * M2 (CROSS)    : Mader TTE inverse → calibrateVLamaxFromTTE(TTE, VO2max, poids, FTP)
 *                 Validation croisée via durabilité glycogénique.
 *                 Réf: Rapoport (2010)
 * 
 * M3 (EMPIRICAL): Score G normalisé → indices de puissance (P30s, P60s, MAP, W')
 *                 Faisceau d'indices de la courbe de puissance, pondérations
 *                 ajustées selon littérature: Spragg 2023, van Erp 2021.
 * 
 * M4 (CROSS-VAL): W' → VLamax cross-validation via CP/W' model
 *                 W' = VLamax × poids × k (Mader), donc VLamax_implied = W'/(poids×320)
 *                 Divergence détectée → warning + ajustement confiance.
 * 
 * FUSION        : Moyenne pondérée multi-index avec détection de divergence.
 *                 Si écart Mader vs Score G > 0.10 → alerte + marge élargie.
 * 
 * FORMULE Score G RECALIBRÉE:
 * Normalisations :
 *   S_pmax = clamp((Pmax/FTP - 3.0) / 2.0, 0, 1)     [Spragg 2023]
 *   S30    = clamp((P30s/FTP - 1.30) / 0.90, 0, 1)    [élargi]
 *   S60    = clamp((P60s/FTP - 1.10) / 0.60, 0, 1)    [ajusté]
 *   E      = clamp((0.90 - FTP/MAP) / 0.25, 0, 1)     [fractional utilization]
 *   D      = clamp((65 - TTE) / 35, 0, 1)             [élargi, moins agressif]
 *   W      = clamp((W'kJ - 10) / 20, 0, 1)            [W' anaerobic capacity]
 * 
 * Poids Score G (Spragg-optimized + W') :
 *   S_pmax: 0.25, S30: 0.18, S60: 0.09, E: 0.22, D: 0.14, W: 0.12
 *   Si FTP/MAP > 0.80 (profil hybride) :
 *   S_pmax: 0.25, S30: 0.08↓, S60: 0.09, E: 0.27↑, D: 0.19↑, W: 0.12
 * 
 * VLamax_raw = 0.20 + 0.80 * G
 * VLamax_final = clamp(VLamax_raw, 0.20, 1.05)
 */

import { ClusterSelectionEnvelope, buildClusterSelectionEnvelope } from "../reference/clusterSelector";
import { calibrateVLamaxFromMLSS, calibrateVLamaxFromTTE } from "./maderMetabolicModel";
import { analyzeCriticalPower, type CriticalPowerResult } from "./criticalPowerModel";

// =============================================
// TYPES
// =============================================

export interface VLamaxBikeV2EnhancedInput {
  // Données puissance (en Watts)
  ftp: number;
  p30s_w?: number | null;
  p60s_w?: number | null;
  map5min_w?: number | null;
  
  // TTE et Pmax (ancienne formule fallback)
  tte_min?: number | null;
  pmax_5s?: number | null;
  
  // Contexte
  weight_kg?: number | null;
  protocol_quality?: 1 | 2 | 3 | 4 | 5;
  
  // Pour Mader et calibration cluster
  objectif?: string;
  vo2max?: number | null;
  sex?: "H" | "F";
}

export interface VLamaxBikeV2Components {
  // Mader values
  mader_mlss: number | null;
  mader_tte: number | null;
  
  // CP/W' cross-validation
  cpResult: CriticalPowerResult | null;
  wprimeKJ: number | null;
  vlamax_from_wprime: number | null;
  
  // Ratios bruts (Score G)
  r_pmax: number | null;
  r30: number | null;
  r60: number | null;
  rfm: number | null;
  
  // Scores normalisés
  S_pmax: number | null;
  S30: number | null;
  S60: number | null;
  E: number | null;
  D: number | null;
  W: number | null;
  
  // Score G final
  scoreG: number | null;
  
  // Fusion
  vlamax_raw: number;
  vlamax_final: number;
  fusion_method: "mader_primary" | "mader_cross" | "scoreG_only" | "pmax_fallback";
  divergence: number | null;
}

export interface VLamaxBikeV2EnhancedResult {
  value: number;
  rangeMin: number;
  rangeMax: number;
  confidence: number;
  confidenceLabel: "Élevée" | "Moyenne" | "Faible" | "Très faible";
  formula: "tfcl_v2_mader" | "tfcl_v2_enhanced" | "tfcl_v2_partial" | "tfcl_v1_fallback" | "insufficient";
  formulaLabel: string;
  components: VLamaxBikeV2Components | null;
  pedagogicalMessage: string;
  warnings: string[];
  sources: string[];
  cluster?: ClusterSelectionEnvelope;
  percentile?: number;
  isOutlier?: boolean;
}

// =============================================
// HELPER FUNCTIONS
// =============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function getConfidenceLabel(conf: number): "Élevée" | "Moyenne" | "Faible" | "Très faible" {
  if (conf >= 0.80) return "Élevée";
  if (conf >= 0.65) return "Moyenne";
  if (conf >= 0.50) return "Faible";
  return "Très faible";
}

// =============================================
// CALIBRATION CLUSTER - PERCENTILE LOOKUP
// =============================================

const CLUSTER_VLAMAX_STATS: Record<string, { p10: number; p25: number; p50: number; p75: number; p90: number }> = {
  Pro_Long: { p10: 0.22, p25: 0.28, p50: 0.35, p75: 0.42, p90: 0.50 },
  AG_Perf_Long: { p10: 0.28, p25: 0.35, p50: 0.42, p75: 0.52, p90: 0.62 },
  AG_Finisher: { p10: 0.35, p25: 0.42, p50: 0.52, p75: 0.65, p90: 0.78 },
  Pro_Short: { p10: 0.35, p25: 0.42, p50: 0.52, p75: 0.62, p90: 0.72 },
  AG_Sprint: { p10: 0.40, p25: 0.48, p50: 0.58, p75: 0.68, p90: 0.80 },
  Elite_Marathon: { p10: 0.20, p25: 0.25, p50: 0.32, p75: 0.40, p90: 0.48 },
  Sub3_Marathon: { p10: 0.25, p25: 0.32, p50: 0.40, p75: 0.50, p90: 0.60 },
  Sub330_Marathon: { p10: 0.30, p25: 0.38, p50: 0.48, p75: 0.58, p90: 0.70 },
  Finisher_Marathon: { p10: 0.35, p25: 0.45, p50: 0.55, p75: 0.68, p90: 0.82 },
  Elite_5K10K: { p10: 0.35, p25: 0.45, p50: 0.55, p75: 0.65, p90: 0.78 },
  Ultra_Trail: { p10: 0.20, p25: 0.26, p50: 0.34, p75: 0.42, p90: 0.52 },
  Elite_Road: { p10: 0.28, p25: 0.35, p50: 0.45, p75: 0.55, p90: 0.68 },
  Amateur_Perf: { p10: 0.35, p25: 0.42, p50: 0.52, p75: 0.62, p90: 0.75 },
  Amateur_Loisir: { p10: 0.40, p25: 0.50, p50: 0.60, p75: 0.72, p90: 0.85 },
  Track_Sprint: { p10: 0.55, p25: 0.65, p50: 0.78, p75: 0.90, p90: 1.02 },
};

function computePercentileFromCluster(vlamax: number, clusterId: string): { percentile: number; isOutlier: boolean } {
  const stats = CLUSTER_VLAMAX_STATS[clusterId];
  if (!stats) return { percentile: 50, isOutlier: false };
  
  if (vlamax <= stats.p10) {
    const pct = 10 * (vlamax / stats.p10);
    return { percentile: Math.round(Math.max(1, pct)), isOutlier: true };
  }
  if (vlamax <= stats.p25) {
    const pct = 10 + 15 * ((vlamax - stats.p10) / (stats.p25 - stats.p10));
    return { percentile: Math.round(pct), isOutlier: false };
  }
  if (vlamax <= stats.p50) {
    const pct = 25 + 25 * ((vlamax - stats.p25) / (stats.p50 - stats.p25));
    return { percentile: Math.round(pct), isOutlier: false };
  }
  if (vlamax <= stats.p75) {
    const pct = 50 + 25 * ((vlamax - stats.p50) / (stats.p75 - stats.p50));
    return { percentile: Math.round(pct), isOutlier: false };
  }
  if (vlamax <= stats.p90) {
    const pct = 75 + 15 * ((vlamax - stats.p75) / (stats.p90 - stats.p75));
    return { percentile: Math.round(pct), isOutlier: false };
  }
  
  const pct = 90 + 10 * ((vlamax - stats.p90) / (stats.p90 * 0.2));
  return { percentile: Math.round(Math.min(99, pct)), isOutlier: true };
}

function getClusterStats(clusterId: string) {
  return CLUSTER_VLAMAX_STATS[clusterId] || null;
}

// =============================================
// SCORE G COMPUTATION (recalibrated)
// =============================================

interface ScoreGResult {
  scoreG: number;
  vlamax: number;
  components: {
    S_pmax: number | null;
    S30: number | null;
    S60: number | null;
    E: number | null;
    D: number | null;
    W: number | null;
    r_pmax: number | null;
    r30: number | null;
    r60: number | null;
    rfm: number | null;
  };
  sources: string[];
  dataCount: number;
}

function computeScoreG(
  ftp: number,
  p30s_w: number | null | undefined,
  p60s_w: number | null | undefined,
  map5min_w: number | null | undefined,
  tte_min: number | null | undefined,
  pmax_5s: number | null | undefined,
  wprimeKJ: number | null | undefined,
  cpDataQuality: "good" | "suspect" | "implausible" = "good",
): ScoreGResult | null {
  const sources: string[] = ["FTP"];
  
  const hasPmax = pmax_5s != null && pmax_5s > 0;
  const hasP30 = p30s_w != null && p30s_w > 0;
  const hasP60 = p60s_w != null && p60s_w > 0;
  const hasMAP = map5min_w != null && map5min_w > 0;
  const hasTTE = tte_min != null && tte_min > 0;
  const hasWprime = wprimeKJ != null && wprimeKJ > 0;
  
  const dataCount = [hasPmax, hasP30, hasP60, hasMAP, hasTTE, hasWprime].filter(Boolean).length;
  if (dataCount < 2) return null;
  
  // Compute ratios
  const r_pmax = hasPmax ? pmax_5s! / ftp : null;
  const r30 = hasP30 ? p30s_w! / ftp : null;
  const r60 = hasP60 ? p60s_w! / ftp : null;
  const rfm = hasMAP ? ftp / map5min_w! : null;
  
  // Normalized scores (recalibrated ranges — literature-aligned)
  const S_pmax = r_pmax !== null ? clamp((r_pmax - 3.0) / 2.0, 0, 1) : null;
  const S30 = r30 !== null ? clamp((r30 - 1.30) / 0.90, 0, 1) : null;
  const S60 = r60 !== null ? clamp((r60 - 1.10) / 0.60, 0, 1) : null;
  const E = rfm !== null ? clamp((0.90 - rfm) / 0.25, 0, 1) : null;
  const D = hasTTE ? clamp((65 - tte_min!) / 35, 0, 1) : null;
  
  // W: W' anaerobic capacity index
  // Typical range: 10 kJ (low glycolytic/endurance) to 30 kJ (sprinter)
  // Higher W' → higher glycolytic capacity → higher VLamax
  // Ref: W' ≈ VLamax × weight × 320 (Mader), Burnley & Jones 2018
  // GUARD: Exclude W' entirely if CP data is implausible, keep with reduced weight if suspect
  const W_score = (hasWprime && cpDataQuality !== "implausible") ? clamp((wprimeKJ! - 10) / 20, 0, 1) : null;
  
  // Adaptive weights (recalibrated with W' index)
  // Original: S_pmax=0.30, S30=0.20, S60=0.10, E=0.25, D=0.15
  // With W': redistribute to accommodate 0.12 for W'
  //
  // HYBRID PROFILE TIERING (recalibré post-audit empirique 2026-05):
  // L'ancien P1 (tiers endurance_pp/rfm_suspect avec dampening fort + re-cap)
  // sous-estimait systématiquement la VLamax sur 4 profils-types sur 5
  // (Quentin: 0.24 vs labo ~0.37 ; sprinteurs: 0.34 vs labo ~0.85).
  // On garde un dampening DOUX pour les profils hybrides mais on supprime
  // les tiers extrêmes qui amputaient le signal Pmax/P30s.
  //
  //   rfm ≤ 0.85 → "pur"          : weights nominaux
  //   rfm > 0.85 → "hybrid"       : léger dampening S30, léger boost E/D
  //
  // Refs: Spragg 2023 (neuromuscular vs glycolytic dissociation).
  const hybridTier =
    rfm === null  ? "unknown" :
    rfm > 0.85    ? "hybrid"  :
                    "pure";

  // CP data quality guard: reduce weight of CP-derived indices when suspect
  const cpSuspectPenalty = cpDataQuality === "suspect" ? 0.5 : 1.0;

  // Tiered weights (douces)
  let w_pmax: number, w_s30_base: number, w_s60_base: number, w_E: number, w_D: number, w_W: number;
  switch (hybridTier) {
    case "hybrid":
      w_pmax = 0.25; w_s30_base = 0.12; w_s60_base = 0.09;
      w_E    = 0.25; w_D = 0.17; w_W = 0.12;
      break;
    case "pure":
    case "unknown":
    default:
      w_pmax = 0.25; w_s30_base = 0.18; w_s60_base = 0.09;
      w_E    = 0.22; w_D = 0.14; w_W = 0.12;
  }

  const w_s30 = w_s30_base * (cpDataQuality === "implausible" ? 0 : cpSuspectPenalty);
  const w_s60 = w_s60_base * (cpDataQuality === "implausible" ? 0 : cpSuspectPenalty);
  
  let scoreG = 0;
  let totalWeight = 0;
  
  if (S_pmax !== null) { scoreG += w_pmax * S_pmax; totalWeight += w_pmax; sources.push("Pmax5s"); }
  if (S30 !== null) { scoreG += w_s30 * S30; totalWeight += w_s30; sources.push(hybridTier === "pure" || hybridTier === "unknown" ? "P30s" : `P30s↓(${hybridTier})`); }
  if (S60 !== null) { scoreG += w_s60 * S60; totalWeight += w_s60; sources.push("P60s"); }
  if (E !== null) { scoreG += w_E * E; totalWeight += w_E; sources.push("MAP5min"); }
  if (D !== null) { scoreG += w_D * D; totalWeight += w_D; sources.push("TTE"); }
  if (W_score !== null) { scoreG += w_W * W_score; totalWeight += w_W; sources.push("W'"); }
  
  // Normalize
  if (totalWeight > 0 && totalWeight < 1) {
    scoreG = scoreG / totalWeight;
  }
  
  // VLamax_raw = 0.20 + 0.80 × G  (range complète restaurée post-audit)
  const vlamax = clamp(0.20 + 0.80 * scoreG, 0.20, 1.05);
  
  return {
    scoreG: Number(scoreG.toFixed(3)),
    vlamax: Number(vlamax.toFixed(3)),
    components: { S_pmax, S30, S60, E, D, W: W_score, r_pmax, r30, r60, rfm },
    sources,
    dataCount,
  };
}

// =============================================
// MAIN COMPUTATION FUNCTION (Mader-First Architecture)
// =============================================

export function computeVLamaxBikeV2Enhanced(input: VLamaxBikeV2EnhancedInput): VLamaxBikeV2EnhancedResult {
  const warnings: string[] = [];
  const sources: string[] = [];
  
  const { ftp, p30s_w, p60s_w, map5min_w, tte_min, pmax_5s, weight_kg, protocol_quality, objectif, vo2max, sex } = input;
  
  // Validation FTP obligatoire
  if (!ftp || ftp <= 0) {
    return {
      value: 0, rangeMin: 0, rangeMax: 0,
      confidence: 0, confidenceLabel: "Très faible",
      formula: "insufficient", formulaLabel: "Données insuffisantes",
      components: null,
      pedagogicalMessage: "Données insuffisantes — renseigner FTP pour estimer VLamax vélo",
      warnings: ["FTP non renseigné"], sources: [],
    };
  }
  
  sources.push("FTP");

  // =============================================
  // P1 — FTP/MAP COHERENCE GUARD
  // A FTP/MAP5min ratio above ~0.92 is physiologically rare (literature: elite
  // pros plateau around 0.88–0.90; Coggan/Allen). Above 0.95 it is almost
  // always an artefact: FTP overestimated (recent test, fresh state, short
  // protocol) or MAP under-tested. We surface this explicitly so the coach
  // can re-test rather than blindly trusting the downstream VLamax.
  // =============================================
  if (map5min_w != null && map5min_w > 0) {
    const rfmGlobal = ftp / map5min_w;
    if (rfmGlobal > 0.95) {
      warnings.push(
        `FTP/MAP5min = ${rfmGlobal.toFixed(2)} (anormalement élevé > 0.95). ` +
        `Probable surestimation FTP ou sous-test MAP. ` +
        `Recommandation : re-tester FTP (20-min ou ramp) à froid avant de fier la VLamax.`
      );
    } else if (rfmGlobal > 0.92) {
      warnings.push(
        `FTP/MAP5min = ${rfmGlobal.toFixed(2)} (élevé). ` +
        `Profil endurance pure ou FTP légèrement surestimé — VLamax dampée en conséquence.`
      );
    }
  }

  // =============================================
  // ÉTAPE 1: Calcul Mader MLSS (PRIMARY — gold standard)
  // =============================================
  let maderMLSS: number | null = null;
  const hasMaderData = vo2max != null && vo2max > 0 && weight_kg != null && weight_kg > 0;
  
  if (hasMaderData) {
    maderMLSS = calibrateVLamaxFromMLSS(ftp, vo2max!, weight_kg!, map5min_w);
    // Sanity check: Mader should return physiologically plausible values
    if (maderMLSS < 0.10 || maderMLSS > 1.20) {
      warnings.push(`Mader MLSS hors bornes (${maderMLSS.toFixed(2)}) — vérifier VO2max/FTP`);
      maderMLSS = null;
    } else {
      sources.push("Mader MLSS");
    }
  }
  
  // =============================================
  // ÉTAPE 2a: CP/W' ANALYSIS (must run BEFORE Mader TTE so we can guard it)
  // =============================================
  let cpResult: CriticalPowerResult | null = null;
  let wprimeKJ: number | null = null;
  let vlamaxFromWprime: number | null = null;

  cpResult = analyzeCriticalPower({
    pmax_5s: pmax_5s,
    p30s_w: p30s_w,
    p60s_w: p60s_w,
    map5min_w: map5min_w,
    ftp: ftp,
    weight_kg: weight_kg,
  });

  if (cpResult) {
    wprimeKJ = cpResult.wprimeKJ;
    sources.push("W'bal");

    if (cpResult.dataQuality === "implausible") {
      warnings.push("Données CP implausibles — W' et indices P30s/P60s exclus du Score G");
    } else if (cpResult.dataQuality === "suspect") {
      warnings.push("Données CP suspectes — poids de W'/P30s/P60s réduit dans le Score G");
    }

    if (weight_kg && weight_kg > 0 && cpResult.dataQuality !== "implausible") {
      vlamaxFromWprime = Number(clamp(cpResult.wprime / (weight_kg * 320), 0.15, 1.10).toFixed(3));
    }
  }

  // =============================================
  // ÉTAPE 2b: Calcul Mader TTE (CROSS-VALIDATION)
  //
  // P0.3 GUARD: Mader TTE uses the same FTP/VO2max/weight inputs as Mader MLSS.
  // If CP data is implausible (FTP likely overestimated relative to MAP5min),
  // Mader TTE will diverge wildly. Skip it entirely in that case.
  //
  // P0.1 GUARD: calibrateVLamaxFromTTE now returns null when the binary search
  // hits a boundary (TTE incompatible with model). We honor that null instead
  // of treating it as a real estimate.
  // =============================================
  let maderTTE: number | null = null;
  const cpImplausible = cpResult?.dataQuality === "implausible";
  const hasTTEData = hasMaderData && tte_min != null && tte_min > 0;

  if (hasTTEData && cpImplausible) {
    warnings.push("Mader TTE désactivé — données CP/FTP incohérentes (TTE n'apporte pas de signal fiable)");
  } else if (hasTTEData) {
    const tteResult = calibrateVLamaxFromTTE(tte_min!, vo2max!, weight_kg!, ftp);
    if (tteResult === null) {
      warnings.push("Mader TTE non concluant — TTE observée incompatible avec le modèle (écartée)");
      maderTTE = null;
    } else if (tteResult < 0.10 || tteResult > 1.20) {
      warnings.push(`Mader TTE hors bornes (${tteResult.toFixed(2)}) — écartée`);
      maderTTE = null;
    } else {
      maderTTE = tteResult;
      sources.push("Mader TTE");
    }
  }

  // =============================================
  // ÉTAPE 3: Score G empirique (CONFIRMATORY — now includes W')
  // =============================================
  const cpDataQuality = cpResult?.dataQuality ?? "good";
  const scoreGResult = computeScoreG(ftp, p30s_w, p60s_w, map5min_w, tte_min, pmax_5s, wprimeKJ, cpDataQuality);
  let scoreGValue: number | null = null;

  if (scoreGResult) {
    scoreGValue = scoreGResult.vlamax;
    sources.push(...scoreGResult.sources.filter(s => !sources.includes(s)));
  }

  // =============================================
  // ÉTAPE 4: FUSION MULTI-INDEX (recalibré post-audit empirique 2026-05)
  //
  // Mader MLSS inversé sous-estime systématiquement la VLamax sur les profils
  // anaérobies (sprinteurs : prédit ~0.34 vs labo ~0.85). On rééquilibre donc
  // le poids du Score G vers le haut quand un signal anaérobie FORT est présent
  // (Pmax/FTP > 3.5 indique un athlète à dominance neuromusculaire).
  //
  // Le guard "divergence critique → Mader seul" passe de 0.20 à 0.30 mmol/L/s
  // car les vrais sprinteurs ont structurellement une grosse divergence Mader/Score G
  // — l'écraser revient à les pénaliser pour leur physiologie.
  // =============================================
  const DIVERGENCE_FALLBACK_THRESHOLD = 0.30;
  const pmaxRatio = pmax_5s != null && pmax_5s > 0 ? pmax_5s / ftp : null;
  const isAnaerobicProfile = pmaxRatio !== null && pmaxRatio > 3.5;

  let finalValue: number;
  let confidence: number;
  let fusionMethod: VLamaxBikeV2Components["fusion_method"];
  let divergence: number | null = null;
  let formulaType: VLamaxBikeV2EnhancedResult["formula"];
  let formulaLabel: string;

  const qualityFactor = protocol_quality ? (protocol_quality - 1) / 4 : 0.5;

  if (maderMLSS !== null) {
    // Compute max divergence across whichever methods are available
    const candidates: number[] = [maderMLSS];
    if (maderTTE !== null) candidates.push(maderTTE);
    if (scoreGValue !== null) candidates.push(scoreGValue);

    let maxDev = 0;
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        maxDev = Math.max(maxDev, Math.abs(candidates[i] - candidates[j]));
      }
    }
    divergence = candidates.length > 1 ? Number(maxDev.toFixed(3)) : null;

    // GUARD: divergence critique (>0.30) ET pas de signal anaérobie fort →
    // fallback Mader seul (gold standard pour profils aérobies).
    // Si le profil est anaérobie (Pmax/FTP > 3.5), on garde la fusion : Mader
    // est connu pour sous-estimer ces profils, donc divergence = info utile.
    if (divergence !== null && divergence > DIVERGENCE_FALLBACK_THRESHOLD && !isAnaerobicProfile) {
      warnings.push(
        `Divergence critique entre méthodes (Δmax=${divergence.toFixed(2)}) — fallback sur Mader MLSS seul (gold standard). ` +
        `Vérifier la cohérence FTP/VO2max/Pmax/TTE.`
      );
      finalValue = maderMLSS;
      fusionMethod = "mader_primary";
      confidence = 0.50 + 0.05 * qualityFactor;
      formulaLabel = "Mader MLSS seul (divergence critique — autres méthodes écartées)";
    } else if (maderTTE !== null && scoreGValue !== null) {
      // Triple validation. Pondération adaptée au profil :
      //   - Anaérobie (Pmax/FTP>3.5) : Score G dominant (50%) car Mader sous-estime
      //   - Aérobie nominal           : Mader dominant (50%) car Score G bruité
      const wMader = isAnaerobicProfile ? 0.30 : 0.50;
      const wTTE   = isAnaerobicProfile ? 0.20 : 0.25;
      const wG     = isAnaerobicProfile ? 0.50 : 0.25;
      finalValue = maderMLSS * wMader + maderTTE * wTTE + scoreGValue * wG;
      fusionMethod = "mader_primary";
      confidence = 0.80 + 0.10 * qualityFactor;
      formulaLabel = isAnaerobicProfile
        ? "Score G dominant + Mader + TTE (profil anaérobie)"
        : "Mader + TTE + Score G (triple validation)";

      if (maxDev > 0.20) {
        warnings.push(`Divergence élevée entre méthodes (Δmax=${maxDev.toFixed(2)}) — vérifier données`);
        confidence = Math.max(0.55, confidence - 0.15);
      } else if (maxDev > 0.10) {
        warnings.push(`Divergence modérée entre méthodes (Δmax=${maxDev.toFixed(2)})`);
        confidence = Math.max(0.60, confidence - 0.08);
      }

    } else if (maderTTE !== null) {
      // Mader MLSS (60%) + Mader TTE (40%)
      finalValue = maderMLSS * 0.60 + maderTTE * 0.40;
      fusionMethod = "mader_cross";
      confidence = 0.78 + 0.10 * qualityFactor;
      formulaLabel = "Mader MLSS + TTE (cross-validation)";

      if (maxDev > 0.15) {
        warnings.push(`Divergence Mader MLSS vs TTE (Δ=${maxDev.toFixed(2)})`);
        confidence = Math.max(0.55, confidence - 0.12);
      }

    } else if (scoreGValue !== null) {
      // Mader + Score G — pondération adaptée au profil.
      //   - Anaérobie : 35% Mader / 65% Score G (Mader sous-estime systématiquement)
      //   - Aérobie   : 60% Mader / 40% Score G (Mader gold standard, Score G d'appoint)
      const wMader = isAnaerobicProfile ? 0.35 : 0.60;
      const wG     = 1 - wMader;
      finalValue = maderMLSS * wMader + scoreGValue * wG;
      fusionMethod = "mader_primary";
      confidence = 0.75 + 0.10 * qualityFactor;
      formulaLabel = isAnaerobicProfile
        ? "Score G dominant + Mader MLSS (profil anaérobie)"
        : "Mader MLSS + Score G";

      if (maxDev > 0.15) {
        warnings.push(`Divergence Mader vs Score G (Δ=${maxDev.toFixed(2)})`);
        confidence = Math.max(0.55, confidence - 0.10);
      }

    } else {
      // Mader MLSS seul
      finalValue = maderMLSS;
      fusionMethod = "mader_primary";
      confidence = 0.72 + 0.10 * qualityFactor;
      formulaLabel = "Mader MLSS (FTP × VO₂max inverse)";
    }

    formulaType = "tfcl_v2_mader";

  } else if (scoreGValue !== null) {
    // ── PAS DE MADER, SCORE G SEUL ──
    finalValue = scoreGValue;
    fusionMethod = "scoreG_only";
    formulaType = scoreGResult!.dataCount >= 3 ? "tfcl_v2_enhanced" : "tfcl_v2_partial";
    formulaLabel = scoreGResult!.dataCount >= 3 ? "Score G V2 (sans Mader)" : "Score G V2 Partiel";
    
    if (scoreGResult!.dataCount >= 4) {
      confidence = 0.60 + 0.10 * qualityFactor;
    } else if (scoreGResult!.dataCount >= 3) {
      confidence = 0.55 + 0.10 * qualityFactor;
    } else {
      confidence = 0.45 + 0.10 * qualityFactor;
    }
    
    warnings.push("VO₂max manquant : calibration Mader impossible. Ajouter VO₂max pour améliorer la précision.");
    
  } else if (pmax_5s != null && pmax_5s > 0) {
    // ── FALLBACK V1: Pmax/FTP only ──
    const pmaxRatio = pmax_5s / ftp;
    // Spragg 2023: Pmax/FTP is the strongest single predictor
    finalValue = clamp(0.20 + 0.20 * clamp((pmaxRatio - 3.0) / 2.0, 0, 1) * 0.80, 0.20, 1.05);
    
    // If weight available, also use FTP/kg
    if (weight_kg && weight_kg > 0) {
      const ftpKg = ftp / weight_kg;
      const ftpEstimate = 0.55 - (ftpKg - 2.5) * 0.0833;
      const pmaxKg = pmax_5s / weight_kg;
      const pmaxAdj = (pmaxKg - 12) * 0.0125;
      const legacyEstimate = clamp(ftpEstimate * 0.65 + (ftpEstimate + pmaxAdj) * 0.35, 0.20, 1.05);
      finalValue = (finalValue + legacyEstimate) / 2;
    }
    
    fusionMethod = "pmax_fallback";
    formulaType = "tfcl_v1_fallback";
    formulaLabel = "Estimation V1 (Pmax/FTP)";
    confidence = 0.45;
    warnings.push("Précision limitée : compléter P30s/P60s/MAP et VO₂max");
    sources.push("Pmax5s");
    
  } else {
    // ── INSUFFICIENT ──
    return {
      value: 0, rangeMin: 0, rangeMax: 0,
      confidence: 0, confidenceLabel: "Très faible",
      formula: "insufficient", formulaLabel: "Données insuffisantes",
      components: null,
      pedagogicalMessage: "Données insuffisantes — compléter FTP + VO₂max + Pmax pour estimer VLamax",
      warnings: ["Données de puissance insuffisantes"], sources,
    };
  }
  
  // P1 — Confidence penalty when FTP/MAP suspect (data quality flag, not method divergence)
  if (map5min_w != null && map5min_w > 0) {
    const rfmGlobal = ftp / map5min_w;
    if (rfmGlobal > 0.95) {
      confidence = Math.max(0.40, confidence - 0.20);
    } else if (rfmGlobal > 0.92) {
      confidence = Math.max(0.50, confidence - 0.10);
    }
  }

  // Clamp final
  finalValue = Number(clamp(finalValue, 0.20, 1.05).toFixed(2));
  
  // =============================================
  // ÉTAPE 5: PLAGE D'INCERTITUDE
  // =============================================
  const baseRange = confidence >= 0.80 ? 0.04 : confidence >= 0.65 ? 0.07 : confidence >= 0.50 ? 0.10 : 0.14;
  const divergenceBonus = divergence != null && divergence > 0.08 ? divergence * 0.5 : 0;
  const rangeWidth = baseRange + divergenceBonus;
  const rangeMin = Number(clamp(finalValue - rangeWidth, 0.20, 1.05).toFixed(2));
  const rangeMax = Number(clamp(finalValue + rangeWidth, 0.20, 1.05).toFixed(2));
  
  // =============================================
  // ÉTAPE 6: PEDAGOGICAL MESSAGE
  // =============================================
  const topContributors: string[] = [];
  if (maderMLSS !== null) topContributors.push(`Mader MLSS: ${maderMLSS.toFixed(2)}`);
  if (maderTTE !== null) topContributors.push(`Mader TTE: ${maderTTE.toFixed(2)}`);
  if (scoreGValue !== null) topContributors.push(`Score G: ${scoreGValue.toFixed(2)}`);
  if (vlamaxFromWprime !== null) topContributors.push(`W'→VLamax: ${vlamaxFromWprime.toFixed(2)}`);
  
  const pedagogicalMessage = topContributors.length > 0
    ? `Méthodes : ${topContributors.join(" | ")}`
    : "Estimation limitée — données insuffisantes pour calibration Mader";
  
  // =============================================
  // ÉTAPE 7: CLUSTER CALIBRATION
  // =============================================
  let cluster: ClusterSelectionEnvelope | undefined;
  let percentile: number | undefined;
  let isOutlier: boolean | undefined;
  
  if (objectif) {
    cluster = buildClusterSelectionEnvelope({ objectif, sex, vo2max: vo2max ?? undefined, vlamax: finalValue });
    const percentileResult = computePercentileFromCluster(finalValue, cluster.clusterId);
    percentile = percentileResult.percentile;
    isOutlier = percentileResult.isOutlier;
    
    if (isOutlier) {
      warnings.push(`VLamax hors P10-P90 du cluster ${cluster.clusterLabel}`);
      confidence = Math.max(0.40, confidence - 0.08);
    }
  }
  
  // =============================================
  // ÉTAPE 6b: CP↔VLamax CROSS-VALIDATION
  // =============================================
  if (vlamaxFromWprime !== null) {
    const wprimeDelta = Math.abs(finalValue - vlamaxFromWprime);
    if (wprimeDelta > 0.20) {
      warnings.push(
        `Divergence CP↔VLamax : W' implique VLamax ~${vlamaxFromWprime.toFixed(2)} vs estimée ${finalValue.toFixed(2)} (Δ=${wprimeDelta.toFixed(2)}). ` +
        `Vérifier cohérence des données courtes (P30s, P60s) avec le profil métabolique.`
      );
      confidence = Math.max(0.40, confidence - 0.10);
    } else if (wprimeDelta > 0.12) {
      warnings.push(
        `Écart modéré CP↔VLamax : W' implique VLamax ~${vlamaxFromWprime.toFixed(2)} (Δ=${wprimeDelta.toFixed(2)})`
      );
      confidence = Math.max(0.50, confidence - 0.05);
    }
  }
  
  // Build components
  const components: VLamaxBikeV2Components = {
    mader_mlss: maderMLSS,
    mader_tte: maderTTE,
    cpResult,
    wprimeKJ,
    vlamax_from_wprime: vlamaxFromWprime,
    r_pmax: scoreGResult?.components.r_pmax ?? null,
    r30: scoreGResult?.components.r30 ?? null,
    r60: scoreGResult?.components.r60 ?? null,
    rfm: scoreGResult?.components.rfm ?? null,
    S_pmax: scoreGResult?.components.S_pmax ?? null,
    S30: scoreGResult?.components.S30 ?? null,
    S60: scoreGResult?.components.S60 ?? null,
    E: scoreGResult?.components.E ?? null,
    D: scoreGResult?.components.D ?? null,
    W: scoreGResult?.components.W ?? null,
    scoreG: scoreGResult?.scoreG ?? null,
    vlamax_raw: finalValue,
    vlamax_final: finalValue,
    fusion_method: fusionMethod,
    divergence,
  };
  
  return {
    value: finalValue,
    rangeMin,
    rangeMax,
    confidence: Number(Math.min(0.95, confidence).toFixed(2)),
    confidenceLabel: getConfidenceLabel(confidence),
    formula: formulaType,
    formulaLabel,
    components,
    pedagogicalMessage,
    warnings,
    sources,
    cluster,
    percentile,
    isOutlier,
  };
}

// =============================================
// UI HELPERS
// =============================================

export function getVLamaxV2EnhancedColor(value: number): string {
  if (value < 0.35) return "text-cyan-600 dark:text-cyan-400";
  if (value < 0.55) return "text-green-600 dark:text-green-400";
  if (value < 0.75) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function getVLamaxV2EnhancedBgColor(value: number): string {
  if (value < 0.35) return "bg-cyan-500";
  if (value < 0.55) return "bg-green-500";
  if (value < 0.75) return "bg-amber-500";
  return "bg-red-500";
}

export function getVLamaxV2EnhancedCategory(value: number): string {
  if (value < 0.35) return "Profil très aérobie";
  if (value < 0.55) return "Profil équilibré";
  if (value < 0.75) return "Profil glycolytique";
  return "Profil très glycolytique";
}

export function formatPercentileLabel(percentile: number): string {
  if (percentile <= 10) return "P≤10";
  if (percentile >= 90) return "P≥90";
  return `P${percentile}`;
}

export { getClusterStats, CLUSTER_VLAMAX_STATS };
