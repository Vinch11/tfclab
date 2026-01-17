/**
 * Nutrition Prédictive V2 — Estimation besoins glucidiques (g/h)
 * 
 * Sources scientifiques :
 * - Burke L.M. et al. (2019) – Carbohydrate periodization
 * - Jeukendrup A. (2014) – CHO feeding during exercise
 * - Thomas D.T. et al. (2016) – ACSM position stand
 * 
 * MODÈLE V2 :
 * - Entrées : VLamax, VO2max, objectif, intensité cible, durée
 * - Sorties : Fourchette glucides (g/h), risque hypoglycémique
 * - Lien avec stratégie d'entraînement
 */

import { CONFIDENCE_LEVELS } from './scientificConfig';
import { VLamaxRangeV2 } from './vlamaxV2';

// =============================================
// TYPES V2
// =============================================

export type NutritionRiskV2 = 'low' | 'moderate' | 'high' | 'critical';

export interface NutritionPredictiveV2 {
  // Plage glucides recommandée (g/h)
  carbsMin: number;
  carbsMax: number;
  carbsCentral: number;
  
  // Risque hypoglycémique
  hypoglycemicRisk: NutritionRiskV2;
  hypoglycemicRiskLabel: string;
  hypoglycemicRiskEmoji: string;
  
  // Confiance
  confidence: number;
  
  // Sport et contexte
  sport: 'velo' | 'cap' | 'triathlon';
  sportLabel: string;
  sportFactor: number;  // Multiplicateur digestif
  
  // Durée estimée
  estimatedDuration: number | null;  // heures
  
  // Décomposition contributeurs
  contributors: {
    vlamaxImpact: string;
    vo2maxImpact: string;
    intensityImpact: string;
    durationImpact: string;
    sportImpact: string;
  };
  
  // Lien stratégie entraînement
  trainingStrategy: {
    message: string;
    recommendations: string[];
  };
  
  // Plafonnement Race Readiness
  raceReadinessCap: number | null;
  
  // Avertissements
  warnings: string[];
}

export interface NutritionV2Input {
  // VLamax (V2)
  vlamaxV2?: VLamaxRangeV2 | null;
  vlamaxValue?: number | null;  // Fallback V1
  
  // VO2max
  vo2max?: number | null;
  
  // Objectif
  objectif?: string;
  
  // Intensité cible (% FTP ou seuil)
  intensityPct?: number | null;
  
  // Durée prévue (heures)
  expectedDuration?: number | null;
  
  // Sport
  sport?: 'velo' | 'cap' | 'triathlon';
  
  // Race Readiness actuelle
  raceReadiness?: number | null;
}

// =============================================
// CONSTANTES
// =============================================

const SPORT_FACTORS = {
  velo: 1.00,       // Référence
  triathlon: 0.90,  // Transition digestive
  cap: 0.75,        // Réduction 25%
};

const SPORT_LABELS = {
  velo: 'Vélo',
  cap: 'Course à Pied',
  triathlon: 'Triathlon',
};

// Tables base par VLamax category
const BASE_CARBS_BY_VLAMAX: Record<string, [number, number]> = {
  ultra_endurance: [50, 65],   // VLamax ≤ 0.25
  endurance: [60, 75],         // 0.26–0.35
  balanced: [70, 85],          // 0.36–0.45
  power: [80, 95],             // 0.46–0.55
  sprinter: [90, 110],         // 0.56–0.70
  extreme_sprinter: [100, 120], // > 0.70
};

// Ajustement par objectif (durée)
const DURATION_ADJUSTMENTS: Record<string, number> = {
  ironman: -10,    // Ultra-longue = économiser
  ultra: -10,
  marathon: -5,
  trail_long: -5,
  '70.3': 0,
  semi: 0,
  olympic: +5,
  sprint: +10,     // Court = tolérance intensité
};

// =============================================
// HELPERS
// =============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function detectSport(objectif: string): 'velo' | 'cap' | 'triathlon' {
  const obj = objectif.toLowerCase();
  if (obj.includes('marathon') || obj.includes('semi') || obj.includes('trail') || obj.includes('10k') || obj.includes('course')) {
    return 'cap';
  }
  if (obj.includes('ironman') || obj.includes('triathlon') || obj.includes('70.3') || obj.includes('half')) {
    return 'triathlon';
  }
  return 'velo';
}

function getVlamaxCategory(value: number): string {
  if (value <= 0.25) return 'ultra_endurance';
  if (value <= 0.35) return 'endurance';
  if (value <= 0.45) return 'balanced';
  if (value <= 0.55) return 'power';
  if (value <= 0.70) return 'sprinter';
  return 'extreme_sprinter';
}

function normalizeObjectif(objectif: string): string {
  const obj = objectif.toLowerCase();
  if (obj.includes('ironman') || obj.includes('im ') || obj === 'im') return 'ironman';
  if (obj.includes('ultra') || obj.includes('trail_long')) return 'ultra';
  if (obj.includes('marathon') && !obj.includes('semi')) return 'marathon';
  if (obj.includes('70.3') || obj.includes('half ironman')) return '70.3';
  if (obj.includes('semi') || obj.includes('half-marathon')) return 'semi';
  if (obj.includes('olympic') || obj.includes('od')) return 'olympic';
  if (obj.includes('sprint')) return 'sprint';
  return 'marathon';
}

function getHypoglycemicRisk(carbsRequired: number, sport: 'velo' | 'cap' | 'triathlon'): NutritionRiskV2 {
  // Seuils de tolérance digestive par sport
  const thresholds = {
    velo: { low: 65, moderate: 85, high: 100 },
    triathlon: { low: 60, moderate: 80, high: 95 },
    cap: { low: 55, moderate: 70, high: 85 },
  };
  
  const t = thresholds[sport];
  if (carbsRequired <= t.low) return 'low';
  if (carbsRequired <= t.moderate) return 'moderate';
  if (carbsRequired <= t.high) return 'high';
  return 'critical';
}

function getRiskLabel(risk: NutritionRiskV2): string {
  switch (risk) {
    case 'low': return 'Faible';
    case 'moderate': return 'Modéré';
    case 'high': return 'Élevé';
    case 'critical': return 'Critique';
  }
}

function getRiskEmoji(risk: NutritionRiskV2): string {
  switch (risk) {
    case 'low': return '🟢';
    case 'moderate': return '🟡';
    case 'high': return '🟠';
    case 'critical': return '🔴';
  }
}

function estimateDuration(objectif: string): number | null {
  const obj = objectif.toLowerCase();
  if (obj.includes('ironman') || obj.includes('im full')) return 10;
  if (obj.includes('70.3') || obj.includes('half ironman')) return 5;
  if (obj.includes('marathon') && !obj.includes('semi')) return 3.5;
  if (obj.includes('semi')) return 1.75;
  if (obj.includes('ultra')) return 12;
  if (obj.includes('olympic')) return 2.5;
  if (obj.includes('sprint')) return 1.25;
  return null;
}

// =============================================
// FONCTION PRINCIPALE V2
// =============================================

export function computeNutritionV2(input: NutritionV2Input): NutritionPredictiveV2 | null {
  const warnings: string[] = [];
  
  // Extraire VLamax
  let vlamaxValue: number | null = null;
  if (input.vlamaxV2?.central !== undefined) {
    vlamaxValue = input.vlamaxV2.central;
  } else if (input.vlamaxValue !== null && input.vlamaxValue !== undefined) {
    vlamaxValue = input.vlamaxValue;
  }
  
  if (vlamaxValue === null) {
    return null;
  }
  
  // Sport et objectif
  const objectif = input.objectif || "";
  const sport = input.sport || detectSport(objectif);
  const sportFactor = SPORT_FACTORS[sport];
  
  // Catégorie VLamax
  const category = getVlamaxCategory(vlamaxValue);
  const baseRange = BASE_CARBS_BY_VLAMAX[category] || [70, 85];
  
  // Ajustement durée
  const normObjectif = normalizeObjectif(objectif);
  const durationAdj = DURATION_ADJUSTMENTS[normObjectif] || 0;
  
  // Ajustement intensité
  let intensityAdj = 0;
  if (input.intensityPct !== null && input.intensityPct !== undefined) {
    if (input.intensityPct >= 85) intensityAdj = 10;
    else if (input.intensityPct >= 75) intensityAdj = 5;
    else if (input.intensityPct <= 65) intensityAdj = -10;
    else if (input.intensityPct <= 60) intensityAdj = -15;
  }
  
  // Ajustement VO2max (athlètes élite = meilleure capacité)
  let vo2maxAdj = 0;
  if (input.vo2max !== null && input.vo2max !== undefined) {
    if (input.vo2max >= 70) vo2maxAdj = 5;
    else if (input.vo2max >= 60) vo2maxAdj = 0;
    else if (input.vo2max <= 45) vo2maxAdj = -5;
  }
  
  // Calcul final
  let carbsMinBase = baseRange[0] + durationAdj + intensityAdj + vo2maxAdj;
  let carbsMaxBase = baseRange[1] + durationAdj + intensityAdj + vo2maxAdj;
  
  // Application facteur sport
  const carbsMin = Math.round(carbsMinBase * sportFactor);
  const carbsMax = Math.round(carbsMaxBase * sportFactor);
  const carbsCentral = Math.round((carbsMin + carbsMax) / 2);
  
  // Risque hypoglycémique
  const hypoglycemicRisk = getHypoglycemicRisk(carbsCentral, sport);
  
  // Durée estimée
  const estimatedDuration = input.expectedDuration || estimateDuration(objectif);
  
  // Plafonnement Race Readiness
  let raceReadinessCap: number | null = null;
  if (hypoglycemicRisk === 'high') {
    raceReadinessCap = 85;
  } else if (hypoglycemicRisk === 'critical') {
    raceReadinessCap = 75;
    warnings.push('Besoins glucidiques dépassent la capacité d\'absorption — nutrition facteur limitant');
  }
  
  // Confiance
  let confidence = 0.60;
  if (input.vlamaxV2) confidence += 0.15;
  if (input.vo2max) confidence += 0.10;
  if (input.intensityPct) confidence += 0.10;
  confidence = clamp(confidence, 0, 0.90);
  
  // Contributeurs
  const contributors = {
    vlamaxImpact: vlamaxValue >= 0.50 
      ? 'VLamax élevée → forte combustion glucidique (+15-25 g/h)'
      : vlamaxValue <= 0.35
        ? 'VLamax basse → économie glucidique (-10-20 g/h)'
        : 'VLamax modérée → besoins standards',
    vo2maxImpact: input.vo2max 
      ? (input.vo2max >= 65 ? 'VO2max élevé → tolérance accrue' : 'VO2max standard')
      : 'VO2max inconnu',
    intensityImpact: input.intensityPct
      ? (input.intensityPct >= 80 ? 'Intensité haute → besoins augmentés' : 'Intensité modérée')
      : 'Intensité standard supposée',
    durationImpact: estimatedDuration
      ? (estimatedDuration >= 5 ? 'Longue durée → économiser les stocks' : 'Durée gérable')
      : 'Durée inconnue',
    sportImpact: sport === 'cap'
      ? 'CAP → tolérance digestive réduite (-25%)'
      : sport === 'triathlon'
        ? 'Triathlon → transition digestive à gérer (-10%)'
        : 'Vélo → tolérance optimale',
  };
  
  // Stratégie entraînement
  const trainingStrategy = {
    message: hypoglycemicRisk === 'critical'
      ? 'Priorité : réduire la dépendance glucidique (travail VLamax) avant d\'optimiser la stratégie nutritionnelle.'
      : hypoglycemicRisk === 'high'
        ? 'Entraînement digestif recommandé. Tester la stratégie en conditions de course.'
        : 'Stratégie nutritionnelle standard applicable. Affiner avec tests terrain.',
    recommendations: hypoglycemicRisk === 'critical' || hypoglycemicRisk === 'high'
      ? [
          'Séances endurance basse intensité pour améliorer l\'oxydation lipidique',
          'Travail spécifique pour abaisser la VLamax',
          'Entraînement digestif progressif',
          'Tests nutrition en situation de course'
        ]
      : [
          'Tester la stratégie nutritionnelle à l\'entraînement',
          'Varier les sources de glucides',
          'Ajuster selon les conditions (chaleur, stress)'
        ]
  };
  
  // Warnings sport spécifiques
  if (sport === 'cap' && carbsCentral >= 70) {
    warnings.push('Besoins élevés en CAP — risque digestif. Entraînement digestif obligatoire.');
  }
  if (category === 'extreme_sprinter' || category === 'sprinter') {
    warnings.push('Profil sprinter — forte dépendance glucidique. Considérer travail VLamax.');
  }
  
  return {
    carbsMin,
    carbsMax,
    carbsCentral,
    hypoglycemicRisk,
    hypoglycemicRiskLabel: getRiskLabel(hypoglycemicRisk),
    hypoglycemicRiskEmoji: getRiskEmoji(hypoglycemicRisk),
    confidence,
    sport,
    sportLabel: SPORT_LABELS[sport],
    sportFactor,
    estimatedDuration,
    contributors,
    trainingStrategy,
    raceReadinessCap,
    warnings
  };
}

// =============================================
// HELPERS UI
// =============================================

export function getNutritionRiskColor(risk: NutritionRiskV2): string {
  switch (risk) {
    case 'low': return 'text-green-600 dark:text-green-400';
    case 'moderate': return 'text-amber-600 dark:text-amber-400';
    case 'high': return 'text-orange-600 dark:text-orange-400';
    case 'critical': return 'text-red-600 dark:text-red-400';
  }
}

export function getNutritionBadgeClass(risk: NutritionRiskV2): string {
  switch (risk) {
    case 'low':
      return 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50';
    case 'moderate':
      return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50';
    case 'high':
      return 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/50';
    case 'critical':
      return 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50';
  }
}

export function formatCarbsRange(nutrition: NutritionPredictiveV2): string {
  return `${nutrition.carbsMin}–${nutrition.carbsMax} g/h`;
}
