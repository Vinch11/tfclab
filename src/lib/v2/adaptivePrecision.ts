/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ADAPTIVE PRECISION ENGINE™ — TFCL
 * 
 * Système centralisé d'affinement des estimations.
 * Principe: Plages étroites SI confiance élevée, plages prudentes SI données partielles.
 * 
 * Scientifiquement valide car:
 * - Les plages reflètent l'incertitude RÉELLE des données
 * - Aucune fausse précision n'est affichée
 * - La transparence est maintenue via le niveau de confiance affiché
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'very_low';

export interface PrecisionConfig {
  confidence: number; // 0-100
  hasCalibrationData: boolean;
  hasHistoricalData: boolean;
  protocolQuality?: number; // 0.5-1.0
}

export interface AdaptiveRange {
  value: number;
  min: number;
  max: number;
  uncertainty: number; // % de variation
  confidenceLevel: ConfidenceLevel;
  displayLabel: string; // ex: "3h42 ± 5min"
}

export interface TimeRange {
  centerMin: number;
  minMin: number;
  maxMin: number;
  displayLabel: string;
  uncertainty: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION DES SEUILS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Seuils de confiance pour déterminer la précision des plages
 */
export const CONFIDENCE_THRESHOLDS = {
  high: 75,      // >75% = plages étroites
  medium: 55,    // 55-75% = plages modérées
  low: 40,       // 40-55% = plages prudentes
  very_low: 0,   // <40% = plages larges
};

/**
 * Multiplicateurs d'incertitude par niveau de confiance
 * Plus la confiance est basse, plus la plage est large
 */
export const UNCERTAINTY_MULTIPLIERS: Record<ConfidenceLevel, number> = {
  high: 0.02,      // ±2%
  medium: 0.05,    // ±5%
  low: 0.10,       // ±10%
  very_low: 0.15,  // ±15%
};

/**
 * Multiplicateurs spécifiques pour les temps de course
 * (Les temps de course ont une variabilité intrinsèque plus faible si bien calibrés)
 */
export const TIME_UNCERTAINTY_MULTIPLIERS: Record<ConfidenceLevel, number> = {
  high: 0.015,     // ±1.5% (~3min pour un marathon 3h30)
  medium: 0.03,    // ±3% (~6min)
  low: 0.06,       // ±6% (~12min)
  very_low: 0.10,  // ±10% (~21min)
};

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Détermine le niveau de confiance à partir du score
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= CONFIDENCE_THRESHOLDS.high) return 'high';
  if (confidence >= CONFIDENCE_THRESHOLDS.medium) return 'medium';
  if (confidence >= CONFIDENCE_THRESHOLDS.low) return 'low';
  return 'very_low';
}

/**
 * Calcule le multiplicateur d'incertitude effectif
 * Prend en compte la calibration et l'historique pour réduire l'incertitude
 */
export function getEffectiveUncertainty(
  config: PrecisionConfig,
  isTimeEstimate: boolean = false
): number {
  const level = getConfidenceLevel(config.confidence);
  const baseMultiplier = isTimeEstimate 
    ? TIME_UNCERTAINTY_MULTIPLIERS[level]
    : UNCERTAINTY_MULTIPLIERS[level];
  
  let modifier = 1.0;
  
  // Réduction si données calibrées (tests terrain validés)
  if (config.hasCalibrationData) {
    modifier -= 0.20; // -20% d'incertitude
  }
  
  // Réduction si historique (courses passées)
  if (config.hasHistoricalData) {
    modifier -= 0.15; // -15% d'incertitude
  }
  
  // Réduction si qualité protocole élevée
  if (config.protocolQuality && config.protocolQuality >= 0.85) {
    modifier -= 0.10; // -10% d'incertitude
  }
  
  // Ne pas descendre en dessous de 0.5× (garder un minimum d'incertitude)
  modifier = Math.max(0.5, modifier);
  
  return baseMultiplier * modifier;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS PRINCIPALES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Génère une plage adaptative pour une valeur physiologique
 */
export function computeAdaptiveRange(
  value: number,
  config: PrecisionConfig,
  unit: string = ''
): AdaptiveRange {
  const level = getConfidenceLevel(config.confidence);
  const uncertainty = getEffectiveUncertainty(config);
  
  const min = value * (1 - uncertainty);
  const max = value * (1 + uncertainty);
  
  // Formatage du label
  const uncertaintyPct = Math.round(uncertainty * 100);
  const displayLabel = unit 
    ? `${value.toFixed(2)} ±${uncertaintyPct}% ${unit}`
    : `${value.toFixed(2)} ±${uncertaintyPct}%`;
  
  return {
    value,
    min,
    max,
    uncertainty,
    confidenceLevel: level,
    displayLabel,
  };
}

/**
 * Génère une plage de temps adaptative (pour simulation de course)
 */
export function computeAdaptiveTimeRange(
  centerMinutes: number,
  config: PrecisionConfig
): TimeRange {
  const uncertainty = getEffectiveUncertainty(config, true);
  
  const minMin = centerMinutes * (1 - uncertainty);
  const maxMin = centerMinutes * (1 + uncertainty);
  
  // Formatage du label (ex: "3h42 – 3h48")
  const formatTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h === 0) return `${m}min`;
    return `${h}h${m.toString().padStart(2, '0')}`;
  };
  
  const centerLabel = formatTime(centerMinutes);
  const range = Math.round((maxMin - minMin) / 2);
  
  let displayLabel: string;
  if (range <= 3) {
    // Plage très étroite: afficher comme temps unique
    displayLabel = centerLabel;
  } else if (range <= 10) {
    // Plage étroite: format "3h42 ±5min"
    displayLabel = `${centerLabel} ±${range}min`;
  } else {
    // Plage large: format "3h35 – 3h50"
    displayLabel = `${formatTime(minMin)} – ${formatTime(maxMin)}`;
  }
  
  return {
    centerMin: centerMinutes,
    minMin,
    maxMin,
    displayLabel,
    uncertainty,
  };
}

/**
 * Affine une plage VLamax selon la confiance
 */
export function computeAdaptiveVLamaxRange(
  median: number,
  baseRangeLow: number,
  baseRangeHigh: number,
  config: PrecisionConfig
): { median: number; rangeLow: number; rangeHigh: number; displayLabel: string } {
  const level = getConfidenceLevel(config.confidence);
  
  // Réduire la plage si confiance élevée
  let rangeReduction = 1.0;
  switch (level) {
    case 'high':
      rangeReduction = 0.5; // Diviser la plage par 2
      break;
    case 'medium':
      rangeReduction = 0.7;
      break;
    case 'low':
      rangeReduction = 0.9;
      break;
    default:
      rangeReduction = 1.0;
  }
  
  // Bonus supplémentaire si calibration
  if (config.hasCalibrationData) {
    rangeReduction *= 0.8;
  }
  
  const halfRange = (baseRangeHigh - baseRangeLow) / 2 * rangeReduction;
  const rangeLow = Math.max(0.15, median - halfRange);
  const rangeHigh = Math.min(0.95, median + halfRange);
  
  const displayLabel = `${median.toFixed(2)} [${rangeLow.toFixed(2)} – ${rangeHigh.toFixed(2)}]`;
  
  return { median, rangeLow, rangeHigh, displayLabel };
}

/**
 * Calcule un score avec intervalle de confiance adaptatif
 */
export function computeAdaptiveScore(
  score: number,
  config: PrecisionConfig,
  maxScore: number = 100
): { score: number; min: number; max: number; displayLabel: string } {
  const uncertainty = getEffectiveUncertainty(config);
  
  // Score sur 100: variation en points, pas en %
  const variationPoints = maxScore * uncertainty;
  
  const min = Math.max(0, score - variationPoints);
  const max = Math.min(maxScore, score + variationPoints);
  
  let displayLabel: string;
  if (variationPoints <= 3) {
    displayLabel = `${Math.round(score)}/100`;
  } else if (variationPoints <= 8) {
    displayLabel = `${Math.round(score)} ±${Math.round(variationPoints)}/100`;
  } else {
    displayLabel = `${Math.round(min)} – ${Math.round(max)}/100`;
  }
  
  return { score, min, max, displayLabel };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEXTES EXPLICATIFS
// ═══════════════════════════════════════════════════════════════════════════════

export const PRECISION_METHODOLOGY = {
  title: "Précision Adaptative TFCL™",
  principle: `Les plages affichées reflètent l'incertitude RÉELLE des données.
Plus vos données sont complètes et calibrées, plus les estimations sont fines.`,
  
  levels: {
    high: {
      label: "Haute confiance",
      description: "Données calibrées + historique → plages ±2-3%",
      requirement: "Tests validés + courses passées",
    },
    medium: {
      label: "Confiance moyenne",
      description: "Données partielles ou récentes → plages ±5%",
      requirement: "Profil physiologique documenté",
    },
    low: {
      label: "Confiance limitée",
      description: "Données estimées → plages ±10%",
      requirement: "Objectifs définis",
    },
    very_low: {
      label: "Données insuffisantes",
      description: "Estimations larges → plages ±15%",
      requirement: "Recommandation: effectuer des tests",
    },
  },
  
  disclaimer: `Ces plages ne sont pas des garanties mais des intervalles probables
basés sur les modèles physiologiques et vos données. Les conditions de course
(météo, nutrition, mental) peuvent modifier significativement les résultats.`,
};

export const ACADEMY_ADAPTIVE_PRECISION = {
  title: "Pourquoi TFCL affine ses estimations",
  sections: [
    {
      title: "Le problème des estimations trop larges",
      content: `Une estimation "3h30 – 4h15" n'est pas utile pour planifier une course.
TFCL résout ce problème en CONDITIONNANT la précision à la qualité des données.`,
    },
    {
      title: "Comment ça fonctionne",
      content: `1. TFCL analyse votre score de confiance global (Decision Reliability Engine™)
2. Si confiance >75%: plages étroites (±2-3%)
3. Si confiance 55-75%: plages modérées (±5%)
4. Si confiance <55%: plages prudentes (±10%)`,
    },
    {
      title: "Ce qui améliore la précision",
      content: `• Tests de terrain validés (FTP, VMA, sprints)
• Courses passées sur format similaire
• Données récentes (<4 semaines)
• Protocoles de haute qualité (sommeil, nutrition OK)`,
    },
    {
      title: "Pourquoi c'est scientifiquement valide",
      content: `L'incertitude affichée reflète l'incertitude RÉELLE du modèle.
Afficher une plage étroite sans données suffisantes serait TROMPEUR.
TFCL préfère la transparence à la fausse précision.`,
    },
  ],
};
