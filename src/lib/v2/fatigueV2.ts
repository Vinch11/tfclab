/**
 * Fatigue Fonctionnelle V2 — Score explicable
 * 
 * Sources scientifiques :
 * - Impellizzeri F.M. et al. (2019) – Training load
 * - Halson S.L. (2014) – Recovery monitoring  
 * - Saw A.E. et al. (2016) – Subjective measures
 * 
 * FORMULE V2 — Composite pondéré explicite :
 * - Charge récente (35%)
 * - Stress subjectif (20%)
 * - Qualité récupération (20%)
 * - Durabilité récente (15%)
 * - Variabilité performances (10%)
 */

import { PHYSIOLOGICAL_BOUNDS, CONFIDENCE_LEVELS } from './scientificConfig';

// =============================================
// TYPES V2
// =============================================

export type FatigueLevelV2 = 'fresh' | 'functional' | 'elevated' | 'critical';

export type FatigueOriginV2 = 'charge' | 'stress' | 'metabolic' | 'recovery' | 'mixed';

export interface FatigueFonctionnelleV2 {
  // Score global (0-100%)
  score: number;
  
  // Niveau catégorisé
  level: FatigueLevelV2;
  levelLabel: string;
  levelEmoji: string;
  levelDescription: string;
  
  // Confiance
  confidence: number;
  
  // Origine principale de la fatigue
  origin: FatigueOriginV2;
  originLabel: string;
  
  // Décomposition des composantes (0-100 chacune)
  components: {
    charge: FatigueComponentV2;
    stress: FatigueComponentV2;
    recovery: FatigueComponentV2;
    durability: FatigueComponentV2;
    variability: FatigueComponentV2;
  };
  
  // Contributions pondérées au score final
  contributions: {
    charge: number;
    stress: number;
    recovery: number;
    durability: number;
    variability: number;
  };
  
  // Recommandations (non automatiques)
  recommendations: string[];
  
  // Tendance (si données historiques)
  trend: 'improving' | 'stable' | 'worsening' | null;
  trendLabel: string | null;
  
  // Avertissements
  warnings: string[];
}

export interface FatigueComponentV2 {
  score: number;      // 0-100
  weight: number;     // Poids dans la formule
  label: string;
  description: string;
  confidence: number;
}

export interface FatigueV2Input {
  // Charge
  tss7d?: number | null;
  tss7dHabituel?: number | null;
  sessionCount7d?: number | null;
  intensitySessions7d?: number | null;
  
  // Stress subjectif (1-10)
  stressLevel?: number | null;
  
  // Récupération
  sleepQuality?: number | null;     // 1-10
  recoveryRating?: number | null;   // 1-10
  hrv?: number | null;              // Si disponible
  
  // Durabilité
  tteMin?: number | null;
  tteTarget?: number | null;
  
  // Variabilité performances
  performanceVariability?: number | null; // % d'écart-type
  
  // Fatigue perçue directe (1-10)
  fatiguePercue?: number | null;
  
  // VLamax pour profil métabolique
  vlamaxValue?: number | null;
  
  // Contexte
  age?: number | null;
  objectif?: string;
  
  // Historique (pour tendance)
  previousScore?: number | null;
}

// =============================================
// CONSTANTES
// =============================================

const WEIGHTS = {
  charge: 0.35,
  stress: 0.20,
  recovery: 0.20,
  durability: 0.15,
  variability: 0.10,
};

// =============================================
// HELPERS
// =============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function getLevel(score: number): FatigueLevelV2 {
  if (score <= PHYSIOLOGICAL_BOUNDS.FATIGUE.FRESH_THRESHOLD) return 'fresh';
  if (score <= PHYSIOLOGICAL_BOUNDS.FATIGUE.FUNCTIONAL_THRESHOLD) return 'functional';
  if (score <= PHYSIOLOGICAL_BOUNDS.FATIGUE.HIGH_THRESHOLD) return 'elevated';
  return 'critical';
}

function getLevelLabel(level: FatigueLevelV2): string {
  switch (level) {
    case 'fresh': return 'Frais';
    case 'functional': return 'Fonctionnelle';
    case 'elevated': return 'Élevée';
    case 'critical': return 'Critique';
  }
}

function getLevelEmoji(level: FatigueLevelV2): string {
  switch (level) {
    case 'fresh': return '🟢';
    case 'functional': return '🟡';
    case 'elevated': return '🟠';
    case 'critical': return '🔴';
  }
}

function getLevelDescription(level: FatigueLevelV2): string {
  switch (level) {
    case 'fresh':
      return 'Fraîcheur maximale. Potentiel pleinement exprimable. Conditions optimales.';
    case 'functional':
      return 'Fatigue gérable. Charge en cours d\'absorption. Capacité légèrement réduite.';
    case 'elevated':
      return 'Attention qualité des séances. Risque stagnation si maintenue.';
    case 'critical':
      return 'Zone rouge. Priorité absolue à la récupération. Risque surmenage.';
  }
}

function getOrigin(components: FatigueV2Input & { computed: Record<string, number> }): FatigueOriginV2 {
  const { computed } = components;
  
  const max = Math.max(
    computed.charge || 0,
    computed.stress || 0,
    computed.recovery || 0,
    computed.durability || 0
  );
  
  if (max === computed.charge) return 'charge';
  if (max === computed.stress) return 'stress';
  if (max === computed.recovery) return 'recovery';
  if (max === computed.durability) return 'metabolic';
  return 'mixed';
}

function getOriginLabel(origin: FatigueOriginV2): string {
  switch (origin) {
    case 'charge': return '📊 Charge récente';
    case 'stress': return '😰 Stress subjectif';
    case 'metabolic': return '🧬 Profil métabolique';
    case 'recovery': return '😴 Qualité récupération';
    case 'mixed': return '⚖️ Multifactoriel';
  }
}

function getTrend(current: number, previous: number | null): 'improving' | 'stable' | 'worsening' | null {
  if (previous === null) return null;
  
  const diff = current - previous;
  if (diff <= -5) return 'improving';
  if (diff >= 5) return 'worsening';
  return 'stable';
}

function getTrendLabel(trend: 'improving' | 'stable' | 'worsening' | null): string | null {
  if (trend === null) return null;
  switch (trend) {
    case 'improving': return '📈 En amélioration';
    case 'stable': return '➖ Stable';
    case 'worsening': return '📉 En dégradation';
  }
}

// =============================================
// CALCUL DES COMPOSANTES
// =============================================

function computeChargeComponent(input: FatigueV2Input): FatigueComponentV2 {
  const { tss7d, tss7dHabituel, sessionCount7d, intensitySessions7d } = input;
  let score = 40;
  let confidence = 0.5;
  
  if (tss7d !== null && tss7d !== undefined) {
    const ref = tss7dHabituel ?? 450;
    const ratio = tss7d / ref;
    
    if (ratio <= 0.5) score = 10;
    else if (ratio <= 0.7) score = 20;
    else if (ratio <= 0.9) score = 35;
    else if (ratio <= 1.1) score = 50;
    else if (ratio <= 1.3) score = 70;
    else if (ratio <= 1.5) score = 85;
    else score = 95;
    
    confidence = tss7dHabituel ? 0.9 : 0.7;
  }
  
  // Ajustement densité séances
  if (sessionCount7d !== null && sessionCount7d !== undefined) {
    if (sessionCount7d >= 10) score += 10;
    else if (sessionCount7d >= 7) score += 5;
    else if (sessionCount7d <= 3) score -= 5;
  }
  
  // Ajustement intensité
  if (intensitySessions7d !== null && intensitySessions7d !== undefined) {
    if (intensitySessions7d >= 4) score += 10;
    else if (intensitySessions7d >= 3) score += 5;
    else if (intensitySessions7d <= 1) score -= 5;
  }
  
  return {
    score: clamp(score, 0, 100),
    weight: WEIGHTS.charge,
    label: 'Charge récente',
    description: 'TSS 7j, densité et intensité des séances',
    confidence
  };
}

function computeStressComponent(input: FatigueV2Input): FatigueComponentV2 {
  const { stressLevel, fatiguePercue } = input;
  let score = 45;
  let confidence = 0.4;
  
  if (stressLevel !== null && stressLevel !== undefined) {
    score = clamp((stressLevel - 1) * 100 / 9, 0, 100);
    confidence = 0.8;
  } else if (fatiguePercue !== null && fatiguePercue !== undefined) {
    score = clamp((fatiguePercue - 1) * 100 / 9, 0, 100);
    confidence = 0.7;
  }
  
  return {
    score,
    weight: WEIGHTS.stress,
    label: 'Stress subjectif',
    description: 'Niveau de stress perçu (1-10)',
    confidence
  };
}

function computeRecoveryComponent(input: FatigueV2Input): FatigueComponentV2 {
  const { sleepQuality, recoveryRating, hrv } = input;
  let score = 50;
  let confidence = 0.4;
  let factors = 0;
  
  if (sleepQuality !== null && sleepQuality !== undefined) {
    // Inverser : qualité élevée = fatigue basse
    score = clamp(100 - (sleepQuality - 1) * 100 / 9, 0, 100);
    confidence = 0.75;
    factors++;
  }
  
  if (recoveryRating !== null && recoveryRating !== undefined) {
    const recoveryScore = clamp(100 - (recoveryRating - 1) * 100 / 9, 0, 100);
    score = factors > 0 ? (score + recoveryScore) / 2 : recoveryScore;
    confidence = Math.max(confidence, 0.75);
    factors++;
  }
  
  // HRV (si disponible) — complexe, simplification
  if (hrv !== null && hrv !== undefined) {
    // HRV bas = stress/fatigue, HRV haut = récupération
    // Normalisation approximative sur 20-100
    const hrvNorm = clamp((hrv - 20) / 80, 0, 1);
    const hrvScore = 100 - hrvNorm * 100;
    score = factors > 0 ? (score + hrvScore) / 2 : hrvScore;
    confidence = 0.85;
  }
  
  return {
    score,
    weight: WEIGHTS.recovery,
    label: 'Qualité récupération',
    description: 'Sommeil, ressenti, HRV',
    confidence
  };
}

function computeDurabilityComponent(input: FatigueV2Input): FatigueComponentV2 {
  const { tteMin, tteTarget, vlamaxValue } = input;
  let score = 50;
  let confidence = 0.4;
  
  if (tteMin !== null && tteMin !== undefined) {
    const target = tteTarget ?? 50;
    const ratio = tteMin / target;
    
    if (ratio >= 1.1) score = 15;
    else if (ratio >= 1.0) score = 25;
    else if (ratio >= 0.9) score = 40;
    else if (ratio >= 0.8) score = 55;
    else if (ratio >= 0.7) score = 75;
    else score = 90;
    
    confidence = 0.75;
  }
  
  // Ajustement VLamax
  if (vlamaxValue !== null && vlamaxValue !== undefined) {
    if (vlamaxValue >= 0.55) score += 10; // Glycolytique = fatigue rapide
    else if (vlamaxValue >= 0.45) score += 5;
    else if (vlamaxValue <= 0.30) score -= 10;
    else if (vlamaxValue <= 0.35) score -= 5;
    
    confidence = Math.max(confidence, 0.65);
  }
  
  return {
    score: clamp(score, 0, 100),
    weight: WEIGHTS.durability,
    label: 'Durabilité récente',
    description: 'TTE vs cible + profil métabolique',
    confidence
  };
}

function computeVariabilityComponent(input: FatigueV2Input): FatigueComponentV2 {
  const { performanceVariability } = input;
  let score = 40;
  let confidence = 0.3;
  
  if (performanceVariability !== null && performanceVariability !== undefined) {
    // Variabilité élevée = fatigue probable
    if (performanceVariability <= 3) score = 20;
    else if (performanceVariability <= 5) score = 35;
    else if (performanceVariability <= 8) score = 50;
    else if (performanceVariability <= 12) score = 70;
    else score = 85;
    
    confidence = 0.7;
  }
  
  return {
    score,
    weight: WEIGHTS.variability,
    label: 'Variabilité performances',
    description: 'Écart-type des performances récentes',
    confidence
  };
}

// =============================================
// FONCTION PRINCIPALE V2
// =============================================

export function computeFatigueV2(input: FatigueV2Input): FatigueFonctionnelleV2 {
  const warnings: string[] = [];
  
  // Calcul composantes
  const charge = computeChargeComponent(input);
  const stress = computeStressComponent(input);
  const recovery = computeRecoveryComponent(input);
  const durability = computeDurabilityComponent(input);
  const variability = computeVariabilityComponent(input);
  
  // Contributions pondérées
  const contributions = {
    charge: Math.round(charge.score * charge.weight),
    stress: Math.round(stress.score * stress.weight),
    recovery: Math.round(recovery.score * recovery.weight),
    durability: Math.round(durability.score * durability.weight),
    variability: Math.round(variability.score * variability.weight),
  };
  
  // Score final
  const rawScore = 
    charge.score * charge.weight +
    stress.score * stress.weight +
    recovery.score * recovery.weight +
    durability.score * durability.weight +
    variability.score * variability.weight;
  
  const score = clamp(Math.round(rawScore), 0, 100);
  
  // Confiance moyenne
  const confidence = clamp(
    charge.confidence * charge.weight +
    stress.confidence * stress.weight +
    recovery.confidence * recovery.weight +
    durability.confidence * durability.weight +
    variability.confidence * variability.weight,
    0, 1
  );
  
  // Niveau
  const level = getLevel(score);
  
  // Origine
  const computed = {
    charge: contributions.charge,
    stress: contributions.stress,
    recovery: contributions.recovery,
    durability: contributions.durability
  };
  const origin = getOrigin({ ...input, computed });
  
  // Tendance
  const trend = getTrend(score, input.previousScore ?? null);
  
  // Recommandations
  const recommendations: string[] = [];
  if (level === 'elevated' || level === 'critical') {
    if (contributions.charge >= 30) {
      recommendations.push('Réduire la charge de 20-30% cette semaine');
    }
    if (contributions.stress >= 15) {
      recommendations.push('Intégrer techniques de gestion du stress');
    }
    if (contributions.recovery >= 15) {
      recommendations.push('Prioriser qualité du sommeil (7-9h)');
    }
    if (level === 'critical') {
      recommendations.push('Semaine de récupération active recommandée');
    }
  }
  
  // Warnings
  if (level === 'critical' && trend === 'worsening') {
    warnings.push('Fatigue critique en aggravation — intervention urgente');
  }
  if (contributions.charge >= 35 && contributions.stress >= 15) {
    warnings.push('Cumul charge + stress élevé — risque de surmenage');
  }
  
  return {
    score,
    level,
    levelLabel: getLevelLabel(level),
    levelEmoji: getLevelEmoji(level),
    levelDescription: getLevelDescription(level),
    confidence,
    origin,
    originLabel: getOriginLabel(origin),
    components: {
      charge,
      stress,
      recovery,
      durability,
      variability
    },
    contributions,
    recommendations,
    trend,
    trendLabel: getTrendLabel(trend),
    warnings
  };
}

// =============================================
// HELPERS UI
// =============================================

export function getFatigueLevelColor(level: FatigueLevelV2): string {
  switch (level) {
    case 'fresh': return 'text-green-600 dark:text-green-400';
    case 'functional': return 'text-amber-600 dark:text-amber-400';
    case 'elevated': return 'text-orange-600 dark:text-orange-400';
    case 'critical': return 'text-red-600 dark:text-red-400';
  }
}

export function getFatigueBadgeClass(level: FatigueLevelV2): string {
  switch (level) {
    case 'fresh':
      return 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50';
    case 'functional':
      return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50';
    case 'elevated':
      return 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/50';
    case 'critical':
      return 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50';
  }
}

export function getFatigueProgressColor(score: number): string {
  if (score <= 30) return 'bg-green-500';
  if (score <= 55) return 'bg-amber-500';
  if (score <= 75) return 'bg-orange-500';
  return 'bg-red-500';
}
