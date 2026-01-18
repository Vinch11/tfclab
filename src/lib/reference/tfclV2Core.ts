/**
 * TFCL V2 Core — Système central de calibration
 * Two For Coaching Lab Method™
 * 
 * Ce module centralise toute la logique V2 officielle :
 * - Mapping objectifs → clusters
 * - Calcul des plages TFCL (P10-P25-P50-P75-P90)
 * - Positionnement par percentile
 * - Indice de confiance
 * - Génération du rapport staff-grade
 */

import {
  ClusterSelectionEnvelope,
  buildClusterSelectionEnvelope,
  ClusterSelectorInput,
} from "./clusterSelector";

import {
  ClusterStats,
  findBestMatchingCluster,
} from "./referenceStats";

import {
  CalibrationEnvelope,
  computeCalibrationEnvelope,
  CalibrationFlag,
  CALIBRATION_FLAG_LABELS,
} from "./referenceCalibration";

import {
  getReferenceStats,
  SportType,
} from "./referenceLoader";

// =============================================
// TYPES V2 OFFICIELS
// =============================================

export type ObjectifPrincipal = 
  | "Ironman"
  | "703"
  | "Marathon"
  | "Semi"
  | "10K"
  | "Court"
  | "Trail"
  | "Cycling";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export interface VLamaxV2Display {
  value: number;
  unit: string;
  range: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  percentile: number;
  percentileLabel: string;
  zone: "OPTIMAL" | "LOW" | "HIGH" | "VERY_HIGH" | "VERY_LOW";
  zoneLabel: string;
  interpretation: string;
  cluster: ClusterSelectionEnvelope;
  calibration: CalibrationEnvelope;
  confidence: ConfidenceResult;
}

export interface ConfidenceResult {
  level: ConfidenceLevel;
  score: number;
  margin: string;
  source: "estimation" | "test_terrain" | "test_labo";
  sourceLabel: string;
  badge: string;
}

export interface TFCLCalibrationInput {
  objectif: ObjectifPrincipal;
  vlamax: number;
  vlamaxSource?: "estimation" | "test_terrain" | "test_labo";
  vo2max?: number;
  sex?: "H" | "F";
  age?: number;
  volumeHebdo?: number; // heures par semaine
}

// =============================================
// MAPPING OBJECTIFS → CLUSTERS TFCL OFFICIELS
// =============================================

/**
 * Mapping officiel des objectifs vers les clusters TFCL
 * Conforme aux spécifications V2
 */
export const OBJECTIF_CLUSTER_MAPPING: Record<ObjectifPrincipal, {
  sportRef: SportType;
  primaryCluster: string;
  secondaryCluster?: string;
  vlamaxRange: { optimal: [number, number]; warning: [number, number] };
}> = {
  Ironman: {
    sportRef: "triathlon",
    primaryCluster: "AG_Perf_Long",
    secondaryCluster: "Pro_Long",
    vlamaxRange: { optimal: [0.23, 0.35], warning: [0.20, 0.45] },
  },
  "703": {
    sportRef: "triathlon",
    primaryCluster: "AG_Perf_Long",
    secondaryCluster: "Pro_Short",
    vlamaxRange: { optimal: [0.28, 0.42], warning: [0.22, 0.50] },
  },
  Marathon: {
    sportRef: "running",
    primaryCluster: "Sub3_Marathon",
    secondaryCluster: "Elite_Marathon",
    vlamaxRange: { optimal: [0.20, 0.35], warning: [0.18, 0.42] },
  },
  Semi: {
    sportRef: "running",
    primaryCluster: "Sub3_Marathon",
    vlamaxRange: { optimal: [0.25, 0.40], warning: [0.20, 0.48] },
  },
  "10K": {
    sportRef: "running",
    primaryCluster: "Elite_5K10K",
    vlamaxRange: { optimal: [0.35, 0.55], warning: [0.28, 0.65] },
  },
  Court: {
    sportRef: "triathlon",
    primaryCluster: "Pro_Short",
    secondaryCluster: "AG_Sprint",
    vlamaxRange: { optimal: [0.40, 0.65], warning: [0.35, 0.75] },
  },
  Trail: {
    sportRef: "running",
    primaryCluster: "Ultra_Trail",
    vlamaxRange: { optimal: [0.20, 0.32], warning: [0.18, 0.40] },
  },
  Cycling: {
    sportRef: "cycling",
    primaryCluster: "Amateur_Perf",
    vlamaxRange: { optimal: [0.30, 0.55], warning: [0.25, 0.70] },
  },
};

// =============================================
// FONCTIONS DE CALCUL V2
// =============================================

/**
 * Calcule la zone de positionnement
 */
function computeZone(
  value: number, 
  p25: number, 
  p75: number, 
  p10: number, 
  p90: number
): VLamaxV2Display["zone"] {
  if (value < p10) return "VERY_LOW";
  if (value < p25) return "LOW";
  if (value <= p75) return "OPTIMAL";
  if (value <= p90) return "HIGH";
  return "VERY_HIGH";
}

const ZONE_LABELS: Record<VLamaxV2Display["zone"], string> = {
  VERY_LOW: "Très bas (< P10)",
  LOW: "Bas (P10-P25)",
  OPTIMAL: "Zone optimale (P25-P75)",
  HIGH: "Élevé (P75-P90)",
  VERY_HIGH: "Très élevé (> P90)",
};

/**
 * Calcule le label de percentile
 */
function getPercentileLabel(p: number): string {
  if (p <= 10) return "< P10";
  if (p <= 25) return `P${p} (zone basse)`;
  if (p <= 50) return `P${p} (médiane-)`;
  if (p <= 75) return `P${p} (médiane+)`;
  if (p <= 90) return `P${p} (zone haute)`;
  return "> P90";
}

/**
 * Génère l'interprétation métier contextualisée
 */
function generateInterpretation(
  zone: VLamaxV2Display["zone"],
  objectif: ObjectifPrincipal,
  percentile: number
): string {
  const objectifLabel = OBJECTIF_LABELS[objectif];
  
  switch (zone) {
    case "VERY_LOW":
      return `Profil très aérobie pour un objectif ${objectifLabel}. Capacité glycolytique limitée.`;
    case "LOW":
      return `Profil aérobie favorable pour ${objectifLabel}. VLamax dans la zone basse du référentiel.`;
    case "OPTIMAL":
      return `VLamax cohérente avec l'objectif ${objectifLabel}. Profil équilibré pour cette distance.`;
    case "HIGH":
      return `VLamax élevée pour ${objectifLabel}. Profil plus glycolytique que la moyenne du référentiel.`;
    case "VERY_HIGH":
      return `VLamax très élevée pour ${objectifLabel}. Profil fortement glycolytique — adaptation longue distance recommandée.`;
  }
}

const OBJECTIF_LABELS: Record<ObjectifPrincipal, string> = {
  Ironman: "Ironman",
  "703": "Ironman 70.3",
  Marathon: "Marathon",
  Semi: "Semi-marathon",
  "10K": "10 km",
  Court: "courte distance / explosif",
  Trail: "Trail / Ultra",
  Cycling: "Cyclisme",
};

/**
 * Calcule l'indice de confiance V2
 */
function computeConfidence(
  source: TFCLCalibrationInput["vlamaxSource"],
  hasVo2max: boolean,
  hasSex: boolean,
  clusterConfidence: number
): ConfidenceResult {
  let score = 0.5; // Base
  
  // Source
  if (source === "test_labo") {
    score += 0.35;
  } else if (source === "test_terrain") {
    score += 0.20;
  } else {
    score += 0.05;
  }
  
  // Données supplémentaires
  if (hasVo2max) score += 0.10;
  if (hasSex) score += 0.05;
  
  // Ajuster par confiance cluster
  score = score * (0.5 + clusterConfidence * 0.5);
  
  score = Math.min(0.95, Math.max(0.30, score));
  
  let level: ConfidenceLevel;
  let margin: string;
  let badge: string;
  
  if (score >= 0.75) {
    level = "HIGH";
    margin = "±0.03";
    badge = "🟢 Confiance élevée";
  } else if (score >= 0.55) {
    level = "MEDIUM";
    margin = "±0.05";
    badge = "🟡 Confiance moyenne";
  } else {
    level = "LOW";
    margin = "±0.08";
    badge = "🔴 Confiance faible";
  }
  
  const sourceLabels: Record<string, string> = {
    estimation: "Estimation modélisée",
    test_terrain: "Test terrain structuré",
    test_labo: "Mesure lactate laboratoire",
  };
  
  return {
    level,
    score,
    margin,
    source: source || "estimation",
    sourceLabel: sourceLabels[source || "estimation"],
    badge,
  };
}

// =============================================
// FONCTION PRINCIPALE V2
// =============================================

/**
 * Calibration V2 officielle TFCL
 * Retourne l'affichage complet de la VLamax avec contexte
 */
export function calibrateVLamaxV2(input: TFCLCalibrationInput): VLamaxV2Display | null {
  const { objectif, vlamax, vlamaxSource, vo2max, sex } = input;
  
  // 1. Récupérer le mapping objectif
  const mapping = OBJECTIF_CLUSTER_MAPPING[objectif];
  if (!mapping) return null;
  
  // 2. Construire la sélection de cluster
  const clusterInput: ClusterSelectorInput = {
    objectif,
    sex,
    vo2max,
    vlamax,
  };
  const clusterSelection = buildClusterSelectionEnvelope(clusterInput);
  
  // 3. Récupérer les stats du cluster
  const stats = getReferenceStats(mapping.sportRef);
  const clusterStats = findBestMatchingCluster(stats, mapping.primaryCluster, sex);
  
  if (!clusterStats) return null;
  
  // 4. Calculer la calibration
  const calibration = computeCalibrationEnvelope(
    vlamax,
    mapping.sportRef,
    clusterStats,
    clusterSelection.clusterLabel
  );
  
  // 5. Extraire les plages
  const range = {
    p10: clusterStats.p10_vlamax,
    p25: clusterStats.p25_vlamax,
    p50: clusterStats.p50_vlamax,
    p75: clusterStats.p75_vlamax,
    p90: clusterStats.p90_vlamax,
  };
  
  // 6. Calculer la zone
  const zone = computeZone(vlamax, range.p25, range.p75, range.p10, range.p90);
  
  // 7. Calculer la confiance
  const confidence = computeConfidence(
    vlamaxSource,
    !!vo2max,
    !!sex,
    clusterSelection.confidence
  );
  
  return {
    value: vlamax,
    unit: "mmol/L/s",
    range,
    percentile: calibration.percentile,
    percentileLabel: getPercentileLabel(calibration.percentile),
    zone,
    zoneLabel: ZONE_LABELS[zone],
    interpretation: generateInterpretation(zone, objectif, calibration.percentile),
    cluster: clusterSelection,
    calibration,
    confidence,
  };
}

// =============================================
// TEXTES STANDARDS TFCL
// =============================================

export const TFCL_STANDARD_TEXTS = {
  vlamaxDisclaimer: `La VLamax présentée est une estimation modélisée, calibrée sur un référentiel TFCL spécifique à l'objectif sportif. Elle ne remplace pas une mesure lactate directe mais permet une lecture cohérente, reproductible et exploitable pour la planification.`,
  
  confidenceExplanation: {
    HIGH: "Données multiples cohérentes. Précision estimée ±0.03 mmol/L/s.",
    MEDIUM: "Données partielles. Précision estimée ±0.05 mmol/L/s.",
    LOW: "Données limitées. Précision estimée ±0.08 mmol/L/s. Test labo recommandé.",
  },
  
  zoneInterpretation: {
    OPTIMAL: "Valeur dans la plage optimale (P25-P75) pour votre objectif.",
    LOW: "Valeur dans la zone basse (P10-P25). Profil très aérobie.",
    HIGH: "Valeur dans la zone haute (P75-P90). Profil plus glycolytique.",
    VERY_LOW: "Valeur très basse (<P10). Capacité glycolytique limitée.",
    VERY_HIGH: "Valeur très haute (>P90). Profil fortement glycolytique.",
  },
  
  reportHeader: `Ce rapport est un outil d'aide à la décision coach.
Les valeurs présentées sont issues de modèles physiologiques calibrés.
Elles ne constituent pas un diagnostic médical.`,
  
  reportFooter: `Two For Coaching Lab est un outil d'aide à la décision physiologique,
pas un oracle, pas un planificateur automatique, pas un substitut au coach.`,
};

// =============================================
// EXPORT HELPERS
// =============================================

export { OBJECTIF_LABELS };

export function getObjectifLabel(objectif: ObjectifPrincipal): string {
  return OBJECTIF_LABELS[objectif] || objectif;
}

export function getZoneLabel(zone: VLamaxV2Display["zone"]): string {
  return ZONE_LABELS[zone];
}

export function getConfidenceBadgeClass(level: ConfidenceLevel): string {
  switch (level) {
    case "HIGH":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "MEDIUM":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case "LOW":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  }
}
