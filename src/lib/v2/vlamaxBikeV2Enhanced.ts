/**
 * VLamax Bike V2 Enhanced — Formule TFCL™ avec faisceau d'indices de puissance
 * Two For Coaching Lab Method™
 * 
 * OBJECTIF: Estimation VLamax vélo plus discriminante et moins "centrée"
 * basée sur P30s, P60s, MAP5min, FTP, TTE + calibration par clusters TFCL.
 * 
 * FORMULE V2 OFFICIELLE:
 * Inputs : FTP, MAP5min, P30s, P60s, TTE
 * Ratios : r30=P30/FTP ; r60=P60/FTP ; rfm=FTP/MAP
 * Normalisation :
 *   S30 = clamp((r30 - 1.45) / 0.85, 0, 1)
 *   S60 = clamp((r60 - 1.25) / 0.75, 0, 1)
 *   E   = clamp((0.88 - rfm) / 0.23, 0, 1)
 *   D   = clamp((55 - TTE) / 25, 0, 1)
 * Score G = 0.35*S30 + 0.25*S60 + 0.15*E + 0.25*D  (Mader-optimized weights)
 * VLamax_raw = 0.22 + 0.78*G
 * VLamax_final = clamp(VLamax_raw, 0.20, 1.10)
 */

import { ClusterSelectionEnvelope, buildClusterSelectionEnvelope } from "../reference/clusterSelector";

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
  
  // Pour calibration cluster
  objectif?: string;
  vo2max?: number | null;
  sex?: "H" | "F";
}

export interface VLamaxBikeV2Components {
  // Ratios bruts
  r30: number | null;
  r60: number | null;
  rfm: number | null;
  
  // Scores normalisés
  S30: number | null;
  S60: number | null;
  E: number | null;
  D: number | null;
  
  // Score G final
  scoreG: number;
  
  // VLamax
  vlamax_raw: number;
  vlamax_final: number;
}

export interface VLamaxBikeV2EnhancedResult {
  // Valeur centrale
  value: number;
  
  // Plage estimée
  rangeMin: number;
  rangeMax: number;
  
  // Confiance (0-1)
  confidence: number;
  confidenceLabel: "Élevée" | "Moyenne" | "Faible" | "Très faible";
  
  // Source / Formula
  formula: "tfcl_v2_enhanced" | "tfcl_v2_partial" | "tfcl_v1_fallback" | "insufficient";
  formulaLabel: string;
  
  // Composants pour explication "Pourquoi"
  components: VLamaxBikeV2Components | null;
  
  // Message pédagogique
  pedagogicalMessage: string;
  
  // Warnings
  warnings: string[];
  
  // Sources utilisées
  sources: string[];
  
  // Calibration cluster (optionnel)
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

// Stats VLamax par cluster (P10, P25, P50, P75, P90)
// Basé sur les référentiels TFCL
const CLUSTER_VLAMAX_STATS: Record<string, { p10: number; p25: number; p50: number; p75: number; p90: number }> = {
  // Triathlon Long Distance
  Pro_Long: { p10: 0.22, p25: 0.28, p50: 0.35, p75: 0.42, p90: 0.50 },
  AG_Perf_Long: { p10: 0.28, p25: 0.35, p50: 0.42, p75: 0.52, p90: 0.62 },
  AG_Finisher: { p10: 0.35, p25: 0.42, p50: 0.52, p75: 0.65, p90: 0.78 },
  
  // Triathlon Short Distance
  Pro_Short: { p10: 0.35, p25: 0.42, p50: 0.52, p75: 0.62, p90: 0.72 },
  AG_Sprint: { p10: 0.40, p25: 0.48, p50: 0.58, p75: 0.68, p90: 0.80 },
  
  // Running
  Elite_Marathon: { p10: 0.20, p25: 0.25, p50: 0.32, p75: 0.40, p90: 0.48 },
  Sub3_Marathon: { p10: 0.25, p25: 0.32, p50: 0.40, p75: 0.50, p90: 0.60 },
  Sub330_Marathon: { p10: 0.30, p25: 0.38, p50: 0.48, p75: 0.58, p90: 0.70 },
  Finisher_Marathon: { p10: 0.35, p25: 0.45, p50: 0.55, p75: 0.68, p90: 0.82 },
  Elite_5K10K: { p10: 0.35, p25: 0.45, p50: 0.55, p75: 0.65, p90: 0.78 },
  Ultra_Trail: { p10: 0.20, p25: 0.26, p50: 0.34, p75: 0.42, p90: 0.52 },
  
  // Cycling
  Elite_Road: { p10: 0.28, p25: 0.35, p50: 0.45, p75: 0.55, p90: 0.68 },
  Amateur_Perf: { p10: 0.35, p25: 0.42, p50: 0.52, p75: 0.62, p90: 0.75 },
  Amateur_Loisir: { p10: 0.40, p25: 0.50, p50: 0.60, p75: 0.72, p90: 0.85 },
  Track_Sprint: { p10: 0.55, p25: 0.65, p50: 0.78, p75: 0.90, p90: 1.02 },
};

function computePercentileFromCluster(vlamax: number, clusterId: string): { percentile: number; isOutlier: boolean } {
  const stats = CLUSTER_VLAMAX_STATS[clusterId];
  if (!stats) {
    return { percentile: 50, isOutlier: false };
  }
  
  // Interpolation linéaire entre percentiles
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
  
  // Au-delà de P90
  const pct = 90 + 10 * ((vlamax - stats.p90) / (stats.p90 * 0.2));
  return { percentile: Math.round(Math.min(99, pct)), isOutlier: true };
}

function getClusterStats(clusterId: string) {
  return CLUSTER_VLAMAX_STATS[clusterId] || null;
}

// =============================================
// MAIN COMPUTATION FUNCTION
// =============================================

export function computeVLamaxBikeV2Enhanced(input: VLamaxBikeV2EnhancedInput): VLamaxBikeV2EnhancedResult {
  const warnings: string[] = [];
  const sources: string[] = [];
  
  const { ftp, p30s_w, p60s_w, map5min_w, tte_min, pmax_5s, weight_kg, protocol_quality, objectif, vo2max, sex } = input;
  
  // Validation FTP obligatoire
  if (!ftp || ftp <= 0) {
    return {
      value: 0.42,
      rangeMin: 0.25,
      rangeMax: 0.65,
      confidence: 0.20,
      confidenceLabel: "Très faible",
      formula: "insufficient",
      formulaLabel: "Données insuffisantes",
      components: null,
      pedagogicalMessage: "FTP requis pour estimer VLamax vélo",
      warnings: ["FTP non renseigné"],
      sources: [],
    };
  }
  
  sources.push("FTP");
  
  // =============================================
  // CAS IDÉAL: Formule V2 Enhanced avec P30s, P60s, MAP, TTE
  // =============================================
  
  const hasP30 = p30s_w != null && p30s_w > 0;
  const hasP60 = p60s_w != null && p60s_w > 0;
  const hasMAP = map5min_w != null && map5min_w > 0;
  const hasTTE = tte_min != null && tte_min > 0;
  
  const fullDataCount = [hasP30, hasP60, hasMAP, hasTTE].filter(Boolean).length;
  
  if (fullDataCount >= 2) {
    // Calcul des ratios
    const r30 = hasP30 ? p30s_w! / ftp : null;
    const r60 = hasP60 ? p60s_w! / ftp : null;
    const rfm = hasMAP ? ftp / map5min_w! : null;
    
    // Calcul des scores normalisés
    // S30 = clamp((r30 - 1.45) / 0.85, 0, 1)
    const S30 = r30 !== null ? clamp((r30 - 1.45) / 0.85, 0, 1) : null;
    
    // S60 = clamp((r60 - 1.25) / 0.75, 0, 1)
    const S60 = r60 !== null ? clamp((r60 - 1.25) / 0.75, 0, 1) : null;
    
    // E = clamp((0.88 - rfm) / 0.23, 0, 1)
    const E = rfm !== null ? clamp((0.88 - rfm) / 0.23, 0, 1) : null;
    
    // D = clamp((55 - TTE) / 25, 0, 1)
    const D = hasTTE ? clamp((55 - tte_min!) / 25, 0, 1) : null;
    
    // Calcul du Score G avec pondérations adaptatives
    let scoreG = 0;
    let totalWeight = 0;
    
    // Pondérations Mader-optimized: S30=0.35, S60=0.25, E=0.15, D=0.25
    if (S30 !== null) {
      scoreG += 0.35 * S30;
      totalWeight += 0.35;
      sources.push("P30s");
    }
    if (S60 !== null) {
      scoreG += 0.25 * S60;
      totalWeight += 0.25;
      sources.push("P60s");
    }
    if (E !== null) {
      scoreG += 0.15 * E;
      totalWeight += 0.15;
      sources.push("MAP5min");
    }
    if (D !== null) {
      scoreG += 0.25 * D;
      totalWeight += 0.25;
      sources.push("TTE");
    }
    
    // Normaliser si poids < 1
    if (totalWeight > 0 && totalWeight < 1) {
      scoreG = scoreG / totalWeight;
    }
    
    // VLamax_raw = 0.22 + 0.78 * G
    const vlamax_raw = 0.22 + 0.78 * scoreG;
    
    // Clamp final [0.20, 1.10]
    const vlamax_final = clamp(vlamax_raw, 0.20, 1.10);
    
    // Calcul de la confiance
    let confidence: number;
    const qualityFactor = protocol_quality ? (protocol_quality - 1) / 4 : 0.5; // 0-1
    
    if (fullDataCount === 4) {
      // Toutes les données
      confidence = 0.75 + 0.15 * qualityFactor;
    } else if (fullDataCount === 3) {
      confidence = 0.65 + 0.15 * qualityFactor;
    } else {
      confidence = 0.55 + 0.15 * qualityFactor;
    }
    
    // Calcul de la plage
    const rangeWidth = confidence >= 0.75 ? 0.06 : confidence >= 0.60 ? 0.10 : 0.14;
    const rangeMin = clamp(vlamax_final - rangeWidth, 0.20, 1.10);
    const rangeMax = clamp(vlamax_final + rangeWidth, 0.20, 1.10);
    
    // Warnings
    if (!hasP30) warnings.push("P30s manquant : compléter semaine testing");
    if (!hasP60) warnings.push("P60s manquant : compléter semaine testing");
    if (!hasMAP) warnings.push("MAP 5min manquant : test rampe recommandé");
    if (!hasTTE) warnings.push("TTE non mesuré : bloc seuil recommandé");
    
    // Composants pour "Pourquoi"
    const components: VLamaxBikeV2Components = {
      r30,
      r60,
      rfm,
      S30,
      S60,
      E,
      D,
      scoreG: Number(scoreG.toFixed(3)),
      vlamax_raw: Number(vlamax_raw.toFixed(3)),
      vlamax_final: Number(vlamax_final.toFixed(2)),
    };
    
    // Message pédagogique
    const topContributors: string[] = [];
    if (S30 !== null && S30 > 0.5) topContributors.push("P30s élevé");
    if (S60 !== null && S60 > 0.5) topContributors.push("P60s élevé");
    if (E !== null && E > 0.5) topContributors.push("Ratio FTP/MAP faible");
    if (D !== null && D > 0.5) topContributors.push("TTE court");
    
    const pedagogicalMessage = topContributors.length > 0
      ? `Facteurs principaux : ${topContributors.join(", ")}`
      : "Profil équilibré sur les indices de puissance";
    
    // Calibration cluster
    let cluster: ClusterSelectionEnvelope | undefined;
    let percentile: number | undefined;
    let isOutlier: boolean | undefined;
    
    if (objectif) {
      cluster = buildClusterSelectionEnvelope({
        objectif,
        sex,
        vo2max: vo2max ?? undefined,
        vlamax: vlamax_final,
      });
      
      const percentileResult = computePercentileFromCluster(vlamax_final, cluster.clusterId);
      percentile = percentileResult.percentile;
      isOutlier = percentileResult.isOutlier;
      
      if (isOutlier) {
        warnings.push(`VLamax hors P10-P90 du cluster ${cluster.clusterLabel}`);
        confidence = Math.max(0.40, confidence - 0.10);
      }
    }
    
    return {
      value: Number(vlamax_final.toFixed(2)),
      rangeMin: Number(rangeMin.toFixed(2)),
      rangeMax: Number(rangeMax.toFixed(2)),
      confidence: Number(confidence.toFixed(2)),
      confidenceLabel: getConfidenceLabel(confidence),
      formula: fullDataCount >= 3 ? "tfcl_v2_enhanced" : "tfcl_v2_partial",
      formulaLabel: fullDataCount >= 3 ? "TFCL V2 Enhanced" : "TFCL V2 Partiel",
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
  // FALLBACK: Formule V1 (FTP + Pmax + TTE)
  // =============================================
  
  const hasPmax = pmax_5s != null && pmax_5s > 0;
  
  if (hasPmax || hasTTE) {
    warnings.push("Précision limitée : compléter P30s/P60s/MAP");
    
    // Estimation V1 simplifiée
    let estimatedVlamax = 0.42; // Base
    
    if (hasPmax) {
      const pmax_ratio = pmax_5s! / ftp;
      // Mapping: ratio 1.8 → 0.30, ratio 2.4 → 0.50, ratio 3.0 → 0.70
      estimatedVlamax = 0.30 + 0.40 * clamp((pmax_ratio - 1.8) / 1.2, 0, 1);
      sources.push("Pmax5s");
    }
    
    if (hasTTE) {
      // Ajustement TTE
      const tteFactor = hasTTE && tte_min! > 55 ? -0.08 : tte_min! < 40 ? 0.08 : 0;
      estimatedVlamax += tteFactor;
      sources.push("TTE");
    }
    
    estimatedVlamax = clamp(estimatedVlamax, 0.20, 1.10);
    
    const confidence = 0.50;
    const rangeMin = clamp(estimatedVlamax - 0.15, 0.20, 1.10);
    const rangeMax = clamp(estimatedVlamax + 0.15, 0.20, 1.10);
    
    return {
      value: Number(estimatedVlamax.toFixed(2)),
      rangeMin: Number(rangeMin.toFixed(2)),
      rangeMax: Number(rangeMax.toFixed(2)),
      confidence,
      confidenceLabel: "Faible",
      formula: "tfcl_v1_fallback",
      formulaLabel: "TFCL V1 (données limitées)",
      components: null,
      pedagogicalMessage: "Estimation approximative – compléter les tests pour améliorer la précision",
      warnings,
      sources,
    };
  }
  
  // =============================================
  // AUCUNE DONNÉE SUFFISANTE
  // =============================================
  
  return {
    value: 0.42,
    rangeMin: 0.25,
    rangeMax: 0.65,
    confidence: 0.25,
    confidenceLabel: "Très faible",
    formula: "insufficient",
    formulaLabel: "Données insuffisantes",
    components: null,
    pedagogicalMessage: "Compléter P30s, P60s, MAP5min et TTE pour une estimation fiable",
    warnings: ["Données de puissance insuffisantes"],
    sources,
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
