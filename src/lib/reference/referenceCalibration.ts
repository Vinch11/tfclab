/**
 * TFCL Reference Calibration - Calibration V2 officielle
 * Two For Coaching Lab Method™
 * 
 * Ce module contextualise les valeurs VLamax par rapport au référentiel TFCL.
 * IMPORTANT: Ne modifie pas les valeurs, seulement les contextualise.
 */

import { ClusterStats } from "./referenceStats";

// =============================================
// TYPES
// =============================================

export type CalibrationFlag = "IN_RANGE" | "EDGE" | "OUTLIER";

export interface CalibrationEnvelope {
  vlamax_value: number;
  sport: string;
  cluster_used: string;
  cluster_label: string;
  percentile: number;
  range_p25_p75: { low: number; high: number };
  range_p10_p90: { low: number; high: number };
  calibration_flag: CalibrationFlag;
  confidence_adjustment: number;
  interpretation: string;
  warnings: string[];
}

export interface PercentilePosition {
  percentile: number;
  label: string;
  color: string;
}

// =============================================
// CONSTANTS
// =============================================

export const CALIBRATION_FLAG_LABELS: Record<CalibrationFlag, string> = {
  IN_RANGE: "Dans la plage observée",
  EDGE: "Proche des limites",
  OUTLIER: "Hors plage habituelle",
};

export const CALIBRATION_FLAG_COLORS: Record<CalibrationFlag, string> = {
  IN_RANGE: "text-green-600 dark:text-green-400",
  EDGE: "text-amber-600 dark:text-amber-400",
  OUTLIER: "text-red-600 dark:text-red-400",
};

export const CALIBRATION_FLAG_BADGES: Record<CalibrationFlag, string> = {
  IN_RANGE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  EDGE: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  OUTLIER: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

// =============================================
// CORE FUNCTIONS
// =============================================

/**
 * Calcule le percentile d'une valeur dans un cluster
 */
export function computeVLamaxPercentile(value: number, clusterStats: ClusterStats): number {
  const { p10_vlamax, p25_vlamax, p50_vlamax, p75_vlamax, p90_vlamax } = clusterStats;
  
  // Points de référence connus
  const points = [
    { p: 10, v: p10_vlamax },
    { p: 25, v: p25_vlamax },
    { p: 50, v: p50_vlamax },
    { p: 75, v: p75_vlamax },
    { p: 90, v: p90_vlamax },
  ];
  
  // Cas extrêmes
  if (value <= p10_vlamax) {
    // Extrapolation linéaire en dessous de p10
    const ratio = value / p10_vlamax;
    return Math.max(1, Math.round(10 * ratio));
  }
  if (value >= p90_vlamax) {
    // Extrapolation linéaire au-dessus de p90
    const ratio = (value - p90_vlamax) / (p90_vlamax - p50_vlamax);
    return Math.min(99, Math.round(90 + 10 * ratio));
  }
  
  // Interpolation entre les points connus
  for (let i = 0; i < points.length - 1; i++) {
    const lower = points[i];
    const upper = points[i + 1];
    if (value >= lower.v && value <= upper.v) {
      const ratio = (value - lower.v) / (upper.v - lower.v);
      return Math.round(lower.p + ratio * (upper.p - lower.p));
    }
  }
  
  return 50; // Fallback
}

/**
 * Calcule la plage plausible
 */
export function computePlausibleRange(clusterStats: ClusterStats): {
  low: number;
  high: number;
  lowWide: number;
  highWide: number;
} {
  return {
    low: clusterStats.p25_vlamax,
    high: clusterStats.p75_vlamax,
    lowWide: clusterStats.p10_vlamax,
    highWide: clusterStats.p90_vlamax,
  };
}

/**
 * Détermine le flag de calibration
 */
export function determineCalibrationFlag(
  value: number,
  clusterStats: ClusterStats
): CalibrationFlag {
  const { p10_vlamax, p25_vlamax, p75_vlamax, p90_vlamax } = clusterStats;
  
  if (value < p10_vlamax || value > p90_vlamax) {
    return "OUTLIER";
  }
  if (value < p25_vlamax || value > p75_vlamax) {
    return "EDGE";
  }
  return "IN_RANGE";
}

/**
 * Calcule l'ajustement de confiance basé sur la calibration
 */
export function computeConfidenceAdjustment(flag: CalibrationFlag): number {
  switch (flag) {
    case "IN_RANGE":
      return 0.1; // Boost de confiance
    case "EDGE":
      return 0; // Pas de changement
    case "OUTLIER":
      return -0.15; // Réduction de confiance
  }
}

/**
 * Génère une interprétation textuelle
 */
export function generateInterpretation(
  percentile: number,
  flag: CalibrationFlag,
  clusterLabel: string
): string {
  const positionLabel = getPercentilePosition(percentile).label;
  
  switch (flag) {
    case "IN_RANGE":
      return `Valeur cohérente avec le profil "${clusterLabel}" (${positionLabel}).`;
    case "EDGE":
      return `Valeur à la limite du profil "${clusterLabel}" (${positionLabel}). Confirmation recommandée.`;
    case "OUTLIER":
      return `Valeur inhabituelle pour le profil "${clusterLabel}" (${positionLabel}). Vérifier les données sources ou considérer un autre profil.`;
  }
}

/**
 * Génère les warnings éventuels
 */
export function generateCalibrationWarnings(
  value: number,
  percentile: number,
  flag: CalibrationFlag,
  clusterStats: ClusterStats
): string[] {
  const warnings: string[] = [];
  
  if (flag === "OUTLIER") {
    if (value < clusterStats.p10_vlamax) {
      warnings.push("VLamax très basse : vérifier si profil ultra-aérobie ou donnée sous-estimée.");
    } else {
      warnings.push("VLamax très haute : vérifier si profil explosif ou donnée sur-estimée.");
    }
  }
  
  if (clusterStats.n < 5) {
    warnings.push(`Référentiel limité (n=${clusterStats.n}). Interprétation prudente requise.`);
  }
  
  return warnings;
}

// =============================================
// MAIN CALIBRATION FUNCTION
// =============================================

/**
 * Génère l'enveloppe de calibration complète
 */
export function computeCalibrationEnvelope(
  value: number,
  sport: string,
  clusterStats: ClusterStats,
  clusterLabel: string
): CalibrationEnvelope {
  const percentile = computeVLamaxPercentile(value, clusterStats);
  const plausibleRange = computePlausibleRange(clusterStats);
  const flag = determineCalibrationFlag(value, clusterStats);
  const confidenceAdjustment = computeConfidenceAdjustment(flag);
  const interpretation = generateInterpretation(percentile, flag, clusterLabel);
  const warnings = generateCalibrationWarnings(value, percentile, flag, clusterStats);
  
  return {
    vlamax_value: value,
    sport,
    cluster_used: clusterStats.cluster,
    cluster_label: clusterLabel,
    percentile,
    range_p25_p75: { low: plausibleRange.low, high: plausibleRange.high },
    range_p10_p90: { low: plausibleRange.lowWide, high: plausibleRange.highWide },
    calibration_flag: flag,
    confidence_adjustment: confidenceAdjustment,
    interpretation,
    warnings,
  };
}

// =============================================
// UI HELPERS
// =============================================

/**
 * Retourne la position en percentile avec label et couleur
 */
export function getPercentilePosition(percentile: number): PercentilePosition {
  if (percentile <= 10) {
    return { percentile, label: "P≤10 — Très bas", color: "text-blue-600 dark:text-blue-400" };
  }
  if (percentile <= 25) {
    return { percentile, label: `P${percentile} — Bas`, color: "text-cyan-600 dark:text-cyan-400" };
  }
  if (percentile <= 50) {
    return { percentile, label: `P${percentile} — Médian-`, color: "text-green-600 dark:text-green-400" };
  }
  if (percentile <= 75) {
    return { percentile, label: `P${percentile} — Médian+`, color: "text-green-600 dark:text-green-400" };
  }
  if (percentile <= 90) {
    return { percentile, label: `P${percentile} — Haut`, color: "text-amber-600 dark:text-amber-400" };
  }
  return { percentile, label: "P≥90 — Très haut", color: "text-red-600 dark:text-red-400" };
}

/**
 * Formate le percentile pour affichage
 */
export function formatPercentile(percentile: number): string {
  return `P${percentile}`;
}

/**
 * Formate la plage pour affichage
 */
export function formatRange(low: number, high: number): string {
  return `${low.toFixed(2)}–${high.toFixed(2)}`;
}

// =============================================
// DISCLAIMER
// =============================================

export const REFERENCE_DISCLAIMER = 
  "Ces références proviennent d'un référentiel interne TFCL construit à partir de profils observés. Ce n'est pas une norme médicale.";

export const REFERENCE_NOT_TARGET_WARNING =
  "Référentiel = repère comparatif, pas objectif à atteindre.";
