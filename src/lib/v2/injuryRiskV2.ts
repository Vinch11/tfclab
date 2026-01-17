/**
 * Risque Blessure CAP V2 — Score explicable
 * 
 * INDICATEURS V2 :
 * - Score 0-100
 * - Code couleur
 * - Message pédagogique : "Pourquoi le risque augmente"
 * 
 * Entrées :
 * - VLamax élevée + faible durabilité
 * - Économie médiocre
 * - Augmentation brutale volume
 * - Fatigue élevée
 */

import { CONFIDENCE_LEVELS } from './scientificConfig';
import { VLamaxRangeV2 } from './vlamaxV2';
import { TTERangeV2 } from './tteV2';
import { RunningEconomyV2 } from './runningEconomyV2';
import { FatigueFonctionnelleV2 } from './fatigueV2';

// =============================================
// TYPES V2
// =============================================

export type InjuryRiskLevelV2 = 'very_low' | 'low' | 'moderate' | 'high' | 'critical';

export interface InjuryRiskV2 {
  // Score global (0-100)
  score: number;
  
  // Niveau catégorisé
  level: InjuryRiskLevelV2;
  levelLabel: string;
  levelEmoji: string;
  levelColor: 'success' | 'info' | 'warning' | 'destructive';
  
  // Confiance
  confidence: number;
  
  // Facteurs de risque détaillés
  riskFactors: InjuryRiskFactorV2[];
  
  // Message pédagogique principal
  whyRiskIncreases: string;
  
  // Recommandations coach
  coachRecommendations: string[];
  
  // Guardrails (ce que surveiller)
  guardrails: string[];
  
  // Comparaison vélo (pour triathlon)
  bikeComparison?: {
    canShiftLoadToBike: boolean;
    message: string;
  };
  
  // Avertissements
  warnings: string[];
  
  // Disclaimer
  disclaimer: string;
}

export interface InjuryRiskFactorV2 {
  id: string;
  label: string;
  value: string;
  contribution: number;  // Contribution au score (0-100)
  weight: number;        // Poids dans la formule
  impact: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
}

export interface InjuryRiskV2Input {
  // VLamax
  vlamaxV2?: VLamaxRangeV2 | null;
  vlamaxValue?: number | null;
  
  // TTE
  tteV2?: TTERangeV2 | null;
  tteMin?: number | null;
  tteTarget?: number | null;
  
  // Économie
  economyV2?: RunningEconomyV2 | null;
  economyLevel?: string | null;
  
  // Fatigue
  fatigueV2?: FatigueFonctionnelleV2 | null;
  fatiguePct?: number | null;
  
  // Charge
  tss7d?: number | null;
  tss7dPrevious?: number | null;  // Semaine précédente pour détecter pics
  runLoad7d?: number | null;
  runLoadChange?: number | null;  // % changement semaine à semaine
  
  // Historique blessures
  injuryHistory?: boolean | null;
  daysFromLastInjury?: number | null;
  
  // Contexte
  age?: number | null;
  objectif?: string;
}

// =============================================
// CONSTANTES
// =============================================

const WEIGHTS = {
  vlamax: 0.20,
  tte: 0.20,
  economy: 0.15,
  fatigue: 0.20,
  loadChange: 0.15,
  history: 0.10,
};

// =============================================
// HELPERS
// =============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function getLevel(score: number): InjuryRiskLevelV2 {
  if (score <= 15) return 'very_low';
  if (score <= 30) return 'low';
  if (score <= 50) return 'moderate';
  if (score <= 75) return 'high';
  return 'critical';
}

function getLevelLabel(level: InjuryRiskLevelV2): string {
  switch (level) {
    case 'very_low': return 'Très faible';
    case 'low': return 'Faible';
    case 'moderate': return 'Modéré';
    case 'high': return 'Élevé';
    case 'critical': return 'Critique';
  }
}

function getLevelEmoji(level: InjuryRiskLevelV2): string {
  switch (level) {
    case 'very_low': return '✅';
    case 'low': return '🟢';
    case 'moderate': return '🟡';
    case 'high': return '🟠';
    case 'critical': return '🔴';
  }
}

function getLevelColor(level: InjuryRiskLevelV2): 'success' | 'info' | 'warning' | 'destructive' {
  switch (level) {
    case 'very_low':
    case 'low':
      return 'success';
    case 'moderate':
      return 'info';
    case 'high':
      return 'warning';
    case 'critical':
      return 'destructive';
  }
}

function getImpact(contribution: number): 'low' | 'medium' | 'high' | 'critical' {
  if (contribution <= 25) return 'low';
  if (contribution <= 50) return 'medium';
  if (contribution <= 75) return 'high';
  return 'critical';
}

// =============================================
// CALCUL DES FACTEURS
// =============================================

function computeVlamaxFactor(input: InjuryRiskV2Input): InjuryRiskFactorV2 {
  let value: number | null = null;
  if (input.vlamaxV2?.central !== undefined) {
    value = input.vlamaxV2.central;
  } else if (input.vlamaxValue !== null && input.vlamaxValue !== undefined) {
    value = input.vlamaxValue;
  }
  
  let contribution = 50;
  let confidence = 0.5;
  
  if (value !== null) {
    // VLamax élevée = coût énergétique accru en CAP = risque mécanique
    if (value <= 0.35) contribution = 10;
    else if (value <= 0.42) contribution = 25;
    else if (value <= 0.50) contribution = 45;
    else if (value <= 0.58) contribution = 65;
    else if (value <= 0.68) contribution = 80;
    else contribution = 95;
    
    confidence = 0.8;
  }
  
  return {
    id: 'vlamax',
    label: 'VLamax',
    value: value !== null ? `${value.toFixed(2)} mmol/L/s` : '—',
    contribution,
    weight: WEIGHTS.vlamax,
    impact: getImpact(contribution),
    explanation: value !== null && value >= 0.50
      ? 'VLamax élevée → coût énergétique accru → contraintes mécaniques augmentées'
      : value !== null && value <= 0.35
        ? 'VLamax basse → économie énergétique → risque réduit'
        : 'VLamax modérée → risque standard'
  };
}

function computeTTEFactor(input: InjuryRiskV2Input): InjuryRiskFactorV2 {
  let value: number | null = null;
  let target = 50;
  
  if (input.tteV2?.central !== undefined) {
    value = input.tteV2.central;
    target = input.tteV2.target;
  } else if (input.tteMin !== null && input.tteMin !== undefined) {
    value = input.tteMin;
    target = input.tteTarget ?? 50;
  }
  
  let contribution = 50;
  let confidence = 0.5;
  
  if (value !== null) {
    const ratio = value / target;
    
    if (ratio >= 1.10) contribution = 10;
    else if (ratio >= 1.00) contribution = 20;
    else if (ratio >= 0.90) contribution = 35;
    else if (ratio >= 0.80) contribution = 55;
    else if (ratio >= 0.70) contribution = 75;
    else contribution = 90;
    
    confidence = 0.75;
  }
  
  return {
    id: 'tte',
    label: 'Durabilité (TTE)',
    value: value !== null ? `${value} min` : '—',
    contribution,
    weight: WEIGHTS.tte,
    impact: getImpact(contribution),
    explanation: value !== null && value < target * 0.85
      ? 'TTE insuffisant → fatigue précoce → compensations mécaniques'
      : 'Durabilité correcte → risque contrôlé'
  };
}

function computeEconomyFactor(input: InjuryRiskV2Input): InjuryRiskFactorV2 {
  let contribution = 50;
  let value = '—';
  let confidence = 0.4;
  
  if (input.economyV2?.isApplicable) {
    value = input.economyV2.levelLabel;
    contribution = 100 - input.economyV2.index; // Inverser : bonne économie = faible risque
    confidence = input.economyV2.confidence;
  } else if (input.economyLevel) {
    value = input.economyLevel;
    switch (input.economyLevel.toLowerCase()) {
      case 'excellent': contribution = 10; break;
      case 'good':
      case 'bonne': contribution = 25; break;
      case 'average':
      case 'moyenne': contribution = 45; break;
      case 'weak':
      case 'faible': contribution = 70; break;
      default: contribution = 85;
    }
    confidence = 0.6;
  }
  
  return {
    id: 'economy',
    label: 'Économie de course',
    value,
    contribution,
    weight: WEIGHTS.economy,
    impact: getImpact(contribution),
    explanation: contribution >= 60
      ? 'Économie faible → surcoût mécanique → risque blessure accru'
      : 'Économie acceptable → contraintes mécaniques normales'
  };
}

function computeFatigueFactor(input: InjuryRiskV2Input): InjuryRiskFactorV2 {
  let value: number | null = null;
  
  if (input.fatigueV2?.score !== undefined) {
    value = input.fatigueV2.score;
  } else if (input.fatiguePct !== null && input.fatiguePct !== undefined) {
    value = input.fatiguePct;
  }
  
  let contribution = 40;
  let confidence = 0.5;
  
  if (value !== null) {
    // Fatigue élevée = risque accru
    if (value <= 30) contribution = 10;
    else if (value <= 45) contribution = 25;
    else if (value <= 60) contribution = 50;
    else if (value <= 75) contribution = 75;
    else contribution = 95;
    
    confidence = 0.8;
  }
  
  return {
    id: 'fatigue',
    label: 'Fatigue fonctionnelle',
    value: value !== null ? `${value}%` : '—',
    contribution,
    weight: WEIGHTS.fatigue,
    impact: getImpact(contribution),
    explanation: value !== null && value >= 60
      ? 'Fatigue élevée → altération coordination → risque blessure accru'
      : 'Fatigue contrôlée → risque normal'
  };
}

function computeLoadChangeFactor(input: InjuryRiskV2Input): InjuryRiskFactorV2 {
  let contribution = 30;
  let value = '—';
  let confidence = 0.4;
  
  // Calcul du changement de charge
  let loadChange: number | null = input.runLoadChange ?? null;
  
  if (loadChange === null && input.tss7d && input.tss7dPrevious) {
    loadChange = ((input.tss7d - input.tss7dPrevious) / input.tss7dPrevious) * 100;
  }
  
  if (loadChange !== null) {
    value = `${loadChange >= 0 ? '+' : ''}${loadChange.toFixed(0)}%`;
    
    // Règle du 10% : augmentation > 10%/semaine = risque
    if (loadChange <= 5) contribution = 10;
    else if (loadChange <= 10) contribution = 25;
    else if (loadChange <= 15) contribution = 45;
    else if (loadChange <= 25) contribution = 70;
    else contribution = 90;
    
    confidence = 0.85;
  }
  
  return {
    id: 'loadChange',
    label: 'Variation charge',
    value,
    contribution,
    weight: WEIGHTS.loadChange,
    impact: getImpact(contribution),
    explanation: loadChange !== null && loadChange > 15
      ? 'Augmentation brutale de charge → risque de surcharge mécanique'
      : 'Progression charge contrôlée'
  };
}

function computeHistoryFactor(input: InjuryRiskV2Input): InjuryRiskFactorV2 {
  let contribution = 20;
  let value = 'Aucun';
  let confidence = 0.5;
  
  if (input.injuryHistory !== null && input.injuryHistory !== undefined) {
    if (input.injuryHistory) {
      value = 'Oui';
      contribution = 70;
      
      if (input.daysFromLastInjury !== null && input.daysFromLastInjury !== undefined) {
        value = `${input.daysFromLastInjury}j depuis dernière`;
        if (input.daysFromLastInjury < 30) contribution = 90;
        else if (input.daysFromLastInjury < 90) contribution = 70;
        else if (input.daysFromLastInjury < 180) contribution = 50;
        else contribution = 35;
      }
      
      confidence = 0.9;
    } else {
      contribution = 15;
      confidence = 0.8;
    }
  }
  
  return {
    id: 'history',
    label: 'Historique blessures',
    value,
    contribution,
    weight: WEIGHTS.history,
    impact: getImpact(contribution),
    explanation: input.injuryHistory
      ? 'Antécédents → vigilance accrue requise'
      : 'Pas d\'antécédent récent → profil protégé'
  };
}

// =============================================
// FONCTION PRINCIPALE V2
// =============================================

export function computeInjuryRiskV2(input: InjuryRiskV2Input): InjuryRiskV2 {
  const warnings: string[] = [];
  
  // Calcul des facteurs
  const vlamaxFactor = computeVlamaxFactor(input);
  const tteFactor = computeTTEFactor(input);
  const economyFactor = computeEconomyFactor(input);
  const fatigueFactor = computeFatigueFactor(input);
  const loadChangeFactor = computeLoadChangeFactor(input);
  const historyFactor = computeHistoryFactor(input);
  
  const riskFactors = [
    vlamaxFactor,
    tteFactor,
    economyFactor,
    fatigueFactor,
    loadChangeFactor,
    historyFactor
  ];
  
  // Score final
  const rawScore = riskFactors.reduce((sum, f) => sum + f.contribution * f.weight, 0);
  const score = clamp(Math.round(rawScore), 0, 100);
  
  // Confiance moyenne
  const confidence = clamp(
    riskFactors.reduce((sum, f) => sum + f.weight, 0) / riskFactors.length * 0.8,
    0.4, 0.9
  );
  
  // Niveau
  const level = getLevel(score);
  
  // Message pédagogique
  const highFactors = riskFactors.filter(f => f.impact === 'high' || f.impact === 'critical');
  let whyRiskIncreases = '';
  
  if (highFactors.length === 0) {
    whyRiskIncreases = 'Tous les indicateurs sont dans les zones vertes. Risque mécanique faible.';
  } else if (highFactors.length === 1) {
    whyRiskIncreases = `Principal facteur de risque : ${highFactors[0].label}. ${highFactors[0].explanation}`;
  } else {
    const factorNames = highFactors.slice(0, 3).map(f => f.label).join(', ');
    whyRiskIncreases = `Cumul de facteurs à risque : ${factorNames}. La combinaison augmente significativement le risque mécanique.`;
  }
  
  // Recommandations
  const coachRecommendations: string[] = [];
  if (level === 'high' || level === 'critical') {
    if (fatigueFactor.impact === 'high' || fatigueFactor.impact === 'critical') {
      coachRecommendations.push('Réduire l\'intensité CAP, privilégier récupération');
    }
    if (loadChangeFactor.impact === 'high' || loadChangeFactor.impact === 'critical') {
      coachRecommendations.push('Limiter l\'augmentation de charge à 10%/semaine');
    }
    if (tteFactor.impact === 'high' || tteFactor.impact === 'critical') {
      coachRecommendations.push('Renforcer la durabilité avant d\'augmenter l\'intensité');
    }
    if (economyFactor.impact === 'high' || economyFactor.impact === 'critical') {
      coachRecommendations.push('Travail technique foulée prioritaire');
    }
    if (level === 'critical') {
      coachRecommendations.push('Considérer semaine de récupération active');
    }
  }
  
  // Guardrails
  const guardrails: string[] = [];
  if (level === 'moderate') {
    guardrails.push('Surveiller douleurs/raideurs après CAP');
    guardrails.push('Respecter les jours de récupération');
  } else if (level === 'high') {
    guardrails.push('Limiter les séances qualité CAP consécutives');
    guardrails.push('Alterner vélo et CAP pour maintenir la charge');
    guardrails.push('Attention à l\'hydratation et sommeil');
  } else if (level === 'critical') {
    guardrails.push('Pas de qualité CAP tant que le score ne redescend pas');
    guardrails.push('Surveillance active des signaux de blessure');
    guardrails.push('Consultation préventive si douleurs');
  }
  
  // Comparaison vélo
  const bikeComparison = {
    canShiftLoadToBike: level === 'high' || level === 'critical',
    message: level === 'critical'
      ? 'Reporter la charge sur vélo recommandé pour maintenir le volume tout en protégeant le système locomoteur.'
      : level === 'high'
        ? 'Considérer des séances vélo en remplacement de certaines CAP.'
        : 'CAP possible avec les précautions habituelles.'
  };
  
  // Warnings
  if (score >= 80) {
    warnings.push('Risque blessure critique — intervention recommandée');
  }
  if (fatigueFactor.impact === 'critical' && loadChangeFactor.impact === 'high') {
    warnings.push('Cumul fatigue + pic de charge — situation à haut risque');
  }
  
  return {
    score,
    level,
    levelLabel: getLevelLabel(level),
    levelEmoji: getLevelEmoji(level),
    levelColor: getLevelColor(level),
    confidence,
    riskFactors,
    whyRiskIncreases,
    coachRecommendations,
    guardrails,
    bikeComparison,
    warnings,
    disclaimer: 'Indicateur d\'aide à la décision. Ne remplace pas un avis médical ni le jugement du coach.'
  };
}

// =============================================
// HELPERS UI
// =============================================

export function getInjuryRiskColor(level: InjuryRiskLevelV2): string {
  switch (level) {
    case 'very_low':
    case 'low':
      return 'text-green-600 dark:text-green-400';
    case 'moderate':
      return 'text-blue-600 dark:text-blue-400';
    case 'high':
      return 'text-amber-600 dark:text-amber-400';
    case 'critical':
      return 'text-red-600 dark:text-red-400';
  }
}

export function getInjuryRiskBadgeClass(level: InjuryRiskLevelV2): string {
  switch (level) {
    case 'very_low':
    case 'low':
      return 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50';
    case 'moderate':
      return 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/50';
    case 'high':
      return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50';
    case 'critical':
      return 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50';
  }
}
