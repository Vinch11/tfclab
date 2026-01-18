/**
 * TWO FOR COACHING LAB METHOD™ — Indice de Risque Blessure Unifié
 * 
 * DEUX INDICES DISTINCTS :
 * 1. Risque Blessure Course à Pied (CAP)
 * 2. Risque Blessure Cyclisme (Vélo)
 * 
 * Chaque indice :
 * - Prévient les erreurs de programmation
 * - Contextualise les recommandations
 * - Sécurise les profils à risque
 * - Enrichit le rapport staff
 * 
 * CE N'EST PAS UN DIAGNOSTIC MÉDICAL.
 */

import { METHOD_VERSION_DISPLAY } from './scientificGovernance';
import type { VLamaxEffectif } from '../vlamaxEffectif';
import type { TTEEffectif } from '../tteEffectif';
import type { FatigueEffectif } from '../fatigueEffectif';
import type { IFSCResult } from './ifsc';

// ============================================
// 1️⃣ PHILOSOPHIE OFFICIELLE
// ============================================

export const INJURY_RISK_PHILOSOPHY = {
  id: 'philosophy',
  title: "Philosophie du Risque Blessure",
  icon: "🛡️",
  
  officialText: `Le risque blessure n'est pas lié à une séance,
mais à l'écart entre les contraintes imposées
et la capacité réelle de l'athlète à les tolérer.`,
  
  keyPrinciples: [
    "Écart contraintes vs capacité",
    "Analyse contextuelle vs séance isolée",
    "Prévention > Réaction"
  ],
  
  disclaimer: `Cet indice n'est pas un diagnostic médical.
Il vise à éclairer les décisions d'entraînement.`
};

// ============================================
// TYPES COMMUNS
// ============================================

export type InjuryRiskLevelUnified = 'FAIBLE' | 'MODERE' | 'ELEVE' | 'CRITIQUE';

export interface InjuryRiskDriver {
  id: string;
  label: string;
  value: string;
  component: number;     // 0-100 contribution brute
  weight: number;        // Poids dans le calcul
  impact: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
}

export interface InjuryRiskEnvelope {
  sport: 'CAP' | 'VELO';
  score: number;                     // 0-100
  level: InjuryRiskLevelUnified;
  levelLabel: string;
  levelColor: 'success' | 'info' | 'warning' | 'destructive';
  confidence: number;                // 0-1
  drivers: InjuryRiskDriver[];
  why: string;                       // Explication synthétique
  guardrails: string[];              // Points de vigilance
  coachRecommendations: string[];    // Options coach (max 3)
  inputsUsed: Record<string, unknown>;
  disclaimer: string;
}

// ============================================
// 2️⃣ DONNÉES UTILISÉES
// ============================================

export const INJURY_RISK_DATA_SOURCES = {
  common: {
    title: "Données communes",
    sources: [
      { id: 'age', label: 'Âge', description: 'Impact sur récupération mécanique' },
      { id: 'fatigue', label: 'Fatigue quantifiée', description: 'État de récupération' },
      { id: 'tte', label: 'TTE effectif', description: 'Durabilité au seuil' },
      { id: 'charge', label: 'Charge récente', description: 'TSS 7j si disponible' }
    ]
  },
  
  cap: {
    title: "Données CAP spécifiques",
    sources: [
      { id: 'vlamax_run', label: 'VLamax CAP', description: 'Profil glycolytique spécifique' },
      { id: 'economy', label: 'Économie de course', description: 'Si disponible' },
      { id: 'run_volume', label: 'Volume hebdo CAP', description: 'Charge mécanique spécifique' }
    ]
  },
  
  velo: {
    title: "Données Vélo spécifiques",
    sources: [
      { id: 'vlamax_bike', label: 'VLamax Vélo', description: 'Profil métabolique' },
      { id: 'ifsc', label: 'IFSC™', description: 'Force spécifique cycliste' },
      { id: 'long_duration', label: 'Durée sorties longues', description: 'Charge durée' }
    ]
  }
};

// ============================================
// 3️⃣ ÉCHELLE OFFICIELLE (0-100)
// ============================================

export const INJURY_RISK_SCALE = {
  FAIBLE: { 
    min: 0, 
    max: 25, 
    label: "Faible", 
    color: 'success' as const,
    icon: "✅",
    message: "Risque faible. Entraînement normal autorisé."
  },
  MODERE: { 
    min: 26, 
    max: 45, 
    label: "Modéré", 
    color: 'info' as const,
    icon: "⚠️",
    message: "Vigilance recommandée sur la densité de qualité."
  },
  ELEVE: { 
    min: 46, 
    max: 65, 
    label: "Élevé", 
    color: 'warning' as const,
    icon: "🔶",
    message: "Limiter intensité, surveiller récupération."
  },
  CRITIQUE: { 
    min: 66, 
    max: 100, 
    label: "Critique", 
    color: 'destructive' as const,
    icon: "🛑",
    message: "Réduction charge recommandée. Priorité récupération."
  }
};

// ============================================
// HELPERS
// ============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function getRiskLevel(score: number): InjuryRiskLevelUnified {
  if (score <= 25) return 'FAIBLE';
  if (score <= 45) return 'MODERE';
  if (score <= 65) return 'ELEVE';
  return 'CRITIQUE';
}

function getLevelInfo(level: InjuryRiskLevelUnified) {
  return INJURY_RISK_SCALE[level];
}

function getDriverImpact(component: number): 'low' | 'medium' | 'high' | 'critical' {
  if (component <= 30) return 'low';
  if (component <= 50) return 'medium';
  if (component <= 70) return 'high';
  return 'critical';
}

// ============================================
// 4️⃣ CALCUL CAP — FACTEURS AGGRAVANTS
// ============================================

export interface CAPRiskInput {
  vlamaxValue: number | null;
  economyLevel: string | null;      // 'excellent' | 'good' | 'average' | 'weak'
  tteMin: number | null;
  fatiguePct: number;
  tss7d: number | null;
  runLoad7d: number | null;
  age: number | null;
  objectif: string;
}

const CAP_WEIGHTS = {
  vlamax: 0.25,
  economy: 0.15,
  tte: 0.20,
  fatigue: 0.20,
  load: 0.10,
  age: 0.10
};

function computeCAPVlamaxComponent(vlamax: number | null): { component: number; known: boolean } {
  if (vlamax === null) return { component: 50, known: false };
  
  // VLamax élevé = coût énergétique accru = risque mécanique
  if (vlamax <= 0.35) return { component: 10, known: true };
  if (vlamax <= 0.42) return { component: 25, known: true };
  if (vlamax <= 0.50) return { component: 45, known: true };
  if (vlamax <= 0.58) return { component: 65, known: true };
  if (vlamax <= 0.68) return { component: 80, known: true };
  return { component: 95, known: true };
}

function computeCAPEconomyComponent(level: string | null): { component: number; known: boolean } {
  if (!level) return { component: 50, known: false };
  
  const normalized = level.toLowerCase();
  if (normalized === 'excellent') return { component: 10, known: true };
  if (normalized === 'good' || normalized === 'bonne') return { component: 25, known: true };
  if (normalized === 'average' || normalized === 'moyenne') return { component: 50, known: true };
  return { component: 80, known: true }; // weak / faible
}

function computeCAPTTEComponent(tte: number | null, objectif: string): { component: number; known: boolean } {
  if (tte === null) return { component: 50, known: false };
  
  const targetMap: Record<string, number> = {
    Marathon: 50, Semi: 45, Trail: 50, TrailLong: 55, IM: 55, "703": 50
  };
  const target = targetMap[objectif] || 45;
  
  const ratio = tte / target;
  if (ratio >= 1.10) return { component: 10, known: true };
  if (ratio >= 1.00) return { component: 25, known: true };
  if (ratio >= 0.85) return { component: 50, known: true };
  if (ratio >= 0.70) return { component: 75, known: true };
  return { component: 90, known: true };
}

function computeFatigueComponent(fatiguePct: number): number {
  if (fatiguePct <= 30) return 10;
  if (fatiguePct <= 45) return 30;
  if (fatiguePct <= 60) return 55;
  if (fatiguePct <= 75) return 75;
  return 95;
}

function computeLoadComponent(runLoad7d: number | null, tss7d: number | null): { component: number; known: boolean; isProxy: boolean } {
  if (runLoad7d !== null && runLoad7d > 0) {
    const component = clamp((runLoad7d / 500) * 100, 0, 100);
    return { component, known: true, isProxy: false };
  }
  if (tss7d !== null && tss7d > 0) {
    const component = clamp((tss7d / 600) * 100, 0, 100);
    return { component, known: true, isProxy: true };
  }
  return { component: 40, known: false, isProxy: false };
}

function computeAgeComponent(age: number | null): { component: number; known: boolean } {
  if (age === null) return { component: 30, known: false };
  if (age < 30) return { component: 10, known: true };
  if (age < 40) return { component: 25, known: true };
  if (age < 50) return { component: 45, known: true };
  return { component: 65, known: true };
}

// ============================================
// FONCTION PRINCIPALE CAP
// ============================================

export function computeCAPInjuryRisk(input: CAPRiskInput): InjuryRiskEnvelope {
  const {
    vlamaxValue, economyLevel, tteMin, fatiguePct,
    tss7d, runLoad7d, age, objectif
  } = input;
  
  // Calcul des composantes
  const vlamaxResult = computeCAPVlamaxComponent(vlamaxValue);
  const economyResult = computeCAPEconomyComponent(economyLevel);
  const tteResult = computeCAPTTEComponent(tteMin, objectif);
  const fatigueComp = computeFatigueComponent(fatiguePct);
  const loadResult = computeLoadComponent(runLoad7d, tss7d);
  const ageResult = computeAgeComponent(age);
  
  // Construire les drivers
  const drivers: InjuryRiskDriver[] = [
    {
      id: 'vlamax',
      label: 'VLamax CAP',
      value: vlamaxValue !== null ? `${vlamaxValue.toFixed(2)} mmol/L/s` : '—',
      component: vlamaxResult.component,
      weight: CAP_WEIGHTS.vlamax,
      impact: getDriverImpact(vlamaxResult.component),
      explanation: vlamaxValue !== null && vlamaxValue > 0.50 
        ? 'VLamax élevé → coût énergétique accru → contraintes mécaniques augmentées'
        : 'VLamax contrôlé → risque mécanique normal'
    },
    {
      id: 'economy',
      label: 'Économie de course',
      value: economyLevel || '—',
      component: economyResult.component,
      weight: CAP_WEIGHTS.economy,
      impact: getDriverImpact(economyResult.component),
      explanation: economyResult.component > 60 
        ? 'Économie faible → surcoût mécanique → risque blessure accru'
        : 'Économie acceptable → contraintes normales'
    },
    {
      id: 'tte',
      label: 'Durabilité (TTE)',
      value: tteMin !== null ? `${tteMin} min` : '—',
      component: tteResult.component,
      weight: CAP_WEIGHTS.tte,
      impact: getDriverImpact(tteResult.component),
      explanation: tteResult.component > 60 
        ? 'TTE insuffisant → fatigue précoce → compensations mécaniques'
        : 'Durabilité correcte → risque contrôlé'
    },
    {
      id: 'fatigue',
      label: 'Fatigue fonctionnelle',
      value: `${fatiguePct}%`,
      component: fatigueComp,
      weight: CAP_WEIGHTS.fatigue,
      impact: getDriverImpact(fatigueComp),
      explanation: fatigueComp > 60 
        ? 'Fatigue élevée → altération coordination → risque blessure accru'
        : 'Fatigue contrôlée → risque normal'
    },
    {
      id: 'load',
      label: loadResult.isProxy ? 'Charge (proxy global)' : 'Charge CAP',
      value: runLoad7d !== null ? `${runLoad7d} TSS` : tss7d !== null ? `~${tss7d} TSS` : '—',
      component: loadResult.component,
      weight: CAP_WEIGHTS.load,
      impact: getDriverImpact(loadResult.component),
      explanation: loadResult.component > 60 
        ? 'Charge récente élevée → accumulation fatigue mécanique'
        : 'Charge contrôlée'
    },
    {
      id: 'age',
      label: 'Âge',
      value: age !== null ? `${age} ans` : '—',
      component: ageResult.component,
      weight: CAP_WEIGHTS.age,
      impact: getDriverImpact(ageResult.component),
      explanation: age !== null && age >= 45 
        ? 'Âge > 45 → récupération mécanique plus lente'
        : 'Récupération mécanique normale'
    }
  ];
  
  // Score final
  const rawScore = drivers.reduce((sum, d) => sum + d.component * d.weight, 0);
  const score = clamp(Math.round(rawScore), 0, 100);
  
  // Confiance
  let confidence = 0.5;
  if (vlamaxResult.known) confidence += 0.15;
  if (tteResult.known) confidence += 0.15;
  if (loadResult.known) confidence += 0.10;
  if (ageResult.known) confidence += 0.10;
  confidence = clamp(confidence, 0.4, 0.95);
  
  // Niveau
  const level = getRiskLevel(score);
  const levelInfo = getLevelInfo(level);
  
  // Génération textes
  const highImpactDrivers = drivers.filter(d => d.impact === 'high' || d.impact === 'critical');
  const why = generateCAPWhy(score, level, highImpactDrivers);
  const guardrails = generateCAPGuardrails(level, drivers);
  const coachRecommendations = generateCAPCoachOptions(level, fatiguePct);
  
  return {
    sport: 'CAP',
    score,
    level,
    levelLabel: levelInfo.label,
    levelColor: levelInfo.color,
    confidence,
    drivers,
    why,
    guardrails,
    coachRecommendations,
    inputsUsed: { vlamaxValue, economyLevel, tteMin, fatiguePct, tss7d, runLoad7d, age, objectif },
    disclaimer: INJURY_RISK_PHILOSOPHY.disclaimer
  };
}

function generateCAPWhy(score: number, level: InjuryRiskLevelUnified, highDrivers: InjuryRiskDriver[]): string {
  if (level === 'FAIBLE') {
    return `Risque CAP faible (${score}%). Les indicateurs sont dans les zones vertes. Course à pied normale autorisée.`;
  }
  if (level === 'MODERE') {
    const factors = highDrivers.map(d => d.label).join(', ') || 'charge globale';
    return `Risque CAP modéré (${score}%). Facteurs à surveiller : ${factors}. Vigilance sur la densité de qualité.`;
  }
  if (level === 'ELEVE') {
    const factors = highDrivers.map(d => `${d.label} (${d.value})`).join(', ');
    return `Risque CAP élevé (${score}%). Facteurs critiques : ${factors}. Limiter intensité CAP, privilégier vélo.`;
  }
  const factors = highDrivers.map(d => `${d.label}: ${d.value}`).join(', ');
  return `Risque CAP critique (${score}%). Alerte : ${factors}. Réduction charge CAP fortement recommandée.`;
}

function generateCAPGuardrails(level: InjuryRiskLevelUnified, drivers: InjuryRiskDriver[]): string[] {
  const guardrails: string[] = [];
  
  switch (level) {
    case 'FAIBLE':
      guardrails.push('Maintenir le monitoring habituel');
      break;
    case 'MODERE':
      guardrails.push('Surveiller densité de qualité CAP');
      guardrails.push('Privilégier Z2 sur sorties longues');
      guardrails.push('Éviter triade long + seuil + vitesse dans la même semaine');
      break;
    case 'ELEVE':
      guardrails.push('Limiter intensité CAP haute (seuil, VMA)');
      guardrails.push('Privilégier vélo pour charge cardiovasculaire');
      guardrails.push('Insérer journée recovery entre qualités CAP');
      guardrails.push('Réduire volume CAP de 10-20%');
      break;
    case 'CRITIQUE':
      guardrails.push('Réduction significative charge CAP recommandée');
      guardrails.push('Priorité absolue à la récupération');
      guardrails.push('Surveillance douleur/raideur/inflammation');
      guardrails.push('Pas de qualité CAP avant retour sous 45% de risque');
      break;
  }
  
  // Guardrails spécifiques
  const criticalDrivers = drivers.filter(d => d.impact === 'critical');
  if (criticalDrivers.some(d => d.id === 'fatigue')) {
    guardrails.push('La fatigue élevée amplifie le risque mécanique CAP');
  }
  if (criticalDrivers.some(d => d.id === 'vlamax')) {
    guardrails.push('VLamax élevé = coût énergétique accru en CAP');
  }
  
  return guardrails;
}

function generateCAPCoachOptions(level: InjuryRiskLevelUnified, fatiguePct: number): string[] {
  if (level === 'FAIBLE' || level === 'MODERE') return [];
  
  const options: string[] = [];
  if (level === 'ELEVE') {
    options.push('Remplacer qualité CAP par vélo Z3/Z4');
    options.push('Réduire volume CAP de 15%');
    options.push('Ajouter journée recovery complète');
  } else {
    options.push('Passer en mode récupération active (3-5 jours)');
    options.push('Remplacer toute qualité CAP par vélo Z2');
    options.push('Consultation préventive si douleurs');
  }
  
  return options.slice(0, 3);
}

// ============================================
// 5️⃣ CALCUL VÉLO — FACTEURS AGGRAVANTS
// ============================================

export interface BikeRiskInput {
  vlamaxValue: number | null;
  ifscScore: number | null;        // Score IFSC 0-100
  tteMin: number | null;
  fatiguePct: number;
  tss7d: number | null;
  longRideDurationMin: number | null;  // Durée sorties longues répétées
  age: number | null;
  objectif: string;
}

const BIKE_WEIGHTS = {
  ifsc: 0.25,
  vlamax: 0.20,
  tte: 0.20,
  fatigue: 0.15,
  longRide: 0.10,
  age: 0.10
};

function computeBikeIFSCComponent(ifscScore: number | null): { component: number; known: boolean } {
  if (ifscScore === null) return { component: 50, known: false };
  
  // IFSC bas = force fragile = risque augmenté
  if (ifscScore >= 76) return { component: 10, known: true };  // Robust
  if (ifscScore >= 56) return { component: 25, known: true };  // Functional
  if (ifscScore >= 31) return { component: 50, known: true };  // Limited
  return { component: 80, known: true };                       // Fragile
}

function computeBikeVlamaxComponent(vlamax: number | null): { component: number; known: boolean } {
  if (vlamax === null) return { component: 50, known: false };
  
  // En vélo, VLamax élevé = tolérance au couple faible sur durée
  if (vlamax <= 0.30) return { component: 10, known: true };
  if (vlamax <= 0.40) return { component: 25, known: true };
  if (vlamax <= 0.50) return { component: 45, known: true };
  if (vlamax <= 0.60) return { component: 65, known: true };
  return { component: 85, known: true };
}

function computeBikeTTEComponent(tte: number | null, objectif: string): { component: number; known: boolean } {
  if (tte === null) return { component: 50, known: false };
  
  const targetMap: Record<string, number> = {
    IM: 60, "703": 55, Marathon: 50, Semi: 45
  };
  const target = targetMap[objectif] || 50;
  
  const ratio = tte / target;
  if (ratio >= 1.10) return { component: 10, known: true };
  if (ratio >= 1.00) return { component: 25, known: true };
  if (ratio >= 0.85) return { component: 50, known: true };
  if (ratio >= 0.70) return { component: 70, known: true };
  return { component: 85, known: true };
}

function computeLongRideComponent(durationMin: number | null): { component: number; known: boolean } {
  if (durationMin === null) return { component: 40, known: false };
  
  // Sorties > 4h = risque augmenté si répétées
  if (durationMin <= 120) return { component: 15, known: true };
  if (durationMin <= 180) return { component: 30, known: true };
  if (durationMin <= 240) return { component: 50, known: true };
  if (durationMin <= 300) return { component: 70, known: true };
  return { component: 85, known: true };
}

// ============================================
// FONCTION PRINCIPALE VÉLO
// ============================================

export function computeBikeInjuryRisk(input: BikeRiskInput): InjuryRiskEnvelope {
  const {
    vlamaxValue, ifscScore, tteMin, fatiguePct,
    tss7d, longRideDurationMin, age, objectif
  } = input;
  
  // Calcul des composantes
  const ifscResult = computeBikeIFSCComponent(ifscScore);
  const vlamaxResult = computeBikeVlamaxComponent(vlamaxValue);
  const tteResult = computeBikeTTEComponent(tteMin, objectif);
  const fatigueComp = computeFatigueComponent(fatiguePct);
  const longRideResult = computeLongRideComponent(longRideDurationMin);
  const ageResult = computeAgeComponent(age);
  
  // Construire les drivers
  const drivers: InjuryRiskDriver[] = [
    {
      id: 'ifsc',
      label: 'IFSC™ (Force spécifique)',
      value: ifscScore !== null ? `${ifscScore}/100` : '—',
      component: ifscResult.component,
      weight: BIKE_WEIGHTS.ifsc,
      impact: getDriverImpact(ifscResult.component),
      explanation: ifscScore !== null && ifscScore < 40 
        ? 'IFSC bas → force fragile → risque sur sorties force/basse cadence'
        : 'Force spécifique acceptable'
    },
    {
      id: 'vlamax',
      label: 'VLamax Vélo',
      value: vlamaxValue !== null ? `${vlamaxValue.toFixed(2)} mmol/L/s` : '—',
      component: vlamaxResult.component,
      weight: BIKE_WEIGHTS.vlamax,
      impact: getDriverImpact(vlamaxResult.component),
      explanation: vlamaxValue !== null && vlamaxValue > 0.50 
        ? 'VLamax élevé → tolérance au couple faible sur durée'
        : 'VLamax contrôlé → risque métabolique normal'
    },
    {
      id: 'tte',
      label: 'Durabilité (TTE)',
      value: tteMin !== null ? `${tteMin} min` : '—',
      component: tteResult.component,
      weight: BIKE_WEIGHTS.tte,
      impact: getDriverImpact(tteResult.component),
      explanation: tteResult.component > 60 
        ? 'TTE insuffisant → fatigue précoce → technique dégradée'
        : 'Durabilité correcte'
    },
    {
      id: 'fatigue',
      label: 'Fatigue fonctionnelle',
      value: `${fatiguePct}%`,
      component: fatigueComp,
      weight: BIKE_WEIGHTS.fatigue,
      impact: getDriverImpact(fatigueComp),
      explanation: fatigueComp > 60 
        ? 'Fatigue élevée → risque tendineux accru'
        : 'Fatigue contrôlée'
    },
    {
      id: 'longRide',
      label: 'Durée sorties longues',
      value: longRideDurationMin !== null ? `${Math.round(longRideDurationMin / 60)}h` : '—',
      component: longRideResult.component,
      weight: BIKE_WEIGHTS.longRide,
      impact: getDriverImpact(longRideResult.component),
      explanation: longRideResult.component > 60 
        ? 'Sorties très longues répétées → surcharge progressive'
        : 'Volume longue durée acceptable'
    },
    {
      id: 'age',
      label: 'Âge',
      value: age !== null ? `${age} ans` : '—',
      component: ageResult.component,
      weight: BIKE_WEIGHTS.age,
      impact: getDriverImpact(ageResult.component),
      explanation: age !== null && age >= 45 
        ? 'Âge > 45 → récupération plus lente'
        : 'Récupération normale'
    }
  ];
  
  // Score final
  const rawScore = drivers.reduce((sum, d) => sum + d.component * d.weight, 0);
  const score = clamp(Math.round(rawScore), 0, 100);
  
  // Confiance
  let confidence = 0.5;
  if (ifscResult.known) confidence += 0.15;
  if (vlamaxResult.known) confidence += 0.10;
  if (tteResult.known) confidence += 0.15;
  if (longRideResult.known) confidence += 0.10;
  confidence = clamp(confidence, 0.4, 0.95);
  
  // Niveau
  const level = getRiskLevel(score);
  const levelInfo = getLevelInfo(level);
  
  // Génération textes
  const highImpactDrivers = drivers.filter(d => d.impact === 'high' || d.impact === 'critical');
  const why = generateBikeWhy(score, level, highImpactDrivers);
  const guardrails = generateBikeGuardrails(level, drivers);
  const coachRecommendations = generateBikeCoachOptions(level);
  
  return {
    sport: 'VELO',
    score,
    level,
    levelLabel: levelInfo.label,
    levelColor: levelInfo.color,
    confidence,
    drivers,
    why,
    guardrails,
    coachRecommendations,
    inputsUsed: { vlamaxValue, ifscScore, tteMin, fatiguePct, tss7d, longRideDurationMin, age, objectif },
    disclaimer: INJURY_RISK_PHILOSOPHY.disclaimer
  };
}

function generateBikeWhy(score: number, level: InjuryRiskLevelUnified, highDrivers: InjuryRiskDriver[]): string {
  if (level === 'FAIBLE') {
    return `Risque Vélo faible (${score}%). Profil robuste. Entraînement normal autorisé.`;
  }
  if (level === 'MODERE') {
    const factors = highDrivers.map(d => d.label).join(', ') || 'charge globale';
    return `Risque Vélo modéré (${score}%). Facteurs à surveiller : ${factors}. Vigilance sur durées longues.`;
  }
  if (level === 'ELEVE') {
    const factors = highDrivers.map(d => `${d.label} (${d.value})`).join(', ');
    return `Risque Vélo élevé (${score}%). Facteurs critiques : ${factors}. Limiter sorties très longues.`;
  }
  const factors = highDrivers.map(d => `${d.label}: ${d.value}`).join(', ');
  return `Risque Vélo critique (${score}%). Alerte : ${factors}. Réduction charge recommandée.`;
}

function generateBikeGuardrails(level: InjuryRiskLevelUnified, drivers: InjuryRiskDriver[]): string[] {
  const guardrails: string[] = [];
  
  switch (level) {
    case 'FAIBLE':
      guardrails.push('Maintenir le monitoring habituel');
      break;
    case 'MODERE':
      guardrails.push('Surveiller tension tendineuse après sorties longues');
      guardrails.push('Éviter accumulation force + durée dans la même semaine');
      break;
    case 'ELEVE':
      guardrails.push('Limiter sorties > 4h');
      guardrails.push('Privilégier cadence modérée (éviter force basse cadence)');
      guardrails.push('Insérer journée easy entre qualités');
      guardrails.push('Surveiller douleurs genou/tendon');
      break;
    case 'CRITIQUE':
      guardrails.push('Réduction significative du volume recommandée');
      guardrails.push('Pas de sorties > 3h');
      guardrails.push('Éviter travail force spécifique');
      guardrails.push('Consultation si douleur persistante');
      break;
  }
  
  const criticalDrivers = drivers.filter(d => d.impact === 'critical');
  if (criticalDrivers.some(d => d.id === 'ifsc')) {
    guardrails.push('IFSC bas : éviter travail basse cadence prolongé');
  }
  
  return guardrails;
}

function generateBikeCoachOptions(level: InjuryRiskLevelUnified): string[] {
  if (level === 'FAIBLE' || level === 'MODERE') return [];
  
  const options: string[] = [];
  if (level === 'ELEVE') {
    options.push('Raccourcir sorties longues à 3h max');
    options.push('Privilégier cadence > 85 rpm');
    options.push('Insérer 2 jours recovery après long ride');
  } else {
    options.push('Mode récupération active (3-5 jours)');
    options.push('Sorties courtes Z2 uniquement');
    options.push('Consultation préventive recommandée');
  }
  
  return options.slice(0, 3);
}

// ============================================
// 6️⃣ MATRICE PERFORMANCE / RISQUE
// ============================================

export interface PerformanceRiskPosition {
  riskX: number;       // 0-100 (axe X)
  performanceY: number; // 0-100 (axe Y)
  quadrant: 'optimal' | 'risk-perf' | 'safe-dev' | 'danger';
  quadrantLabel: string;
  quadrantColor: string;
  advice: string;
}

export function computePerformanceRiskPosition(
  riskEnvelope: InjuryRiskEnvelope,
  vlamaxValue: number | null,
  tteMin: number | null,
  objectif: string
): PerformanceRiskPosition {
  const riskX = riskEnvelope.score;
  
  // Calcul du potentiel performance
  let performanceY = 50;
  
  if (vlamaxValue !== null) {
    const vlamaxTarget = objectif.includes('IM') ? 0.35 : objectif.includes('703') ? 0.40 : 0.45;
    if (vlamaxValue <= vlamaxTarget) performanceY += 20;
    else if (vlamaxValue <= vlamaxTarget + 0.05) performanceY += 10;
    else if (vlamaxValue > vlamaxTarget + 0.15) performanceY -= 10;
  }
  
  if (tteMin !== null) {
    const tteTarget = objectif.includes('IM') ? 55 : objectif.includes('703') ? 50 : 45;
    if (tteMin >= tteTarget + 5) performanceY += 20;
    else if (tteMin >= tteTarget) performanceY += 10;
    else if (tteMin < tteTarget - 10) performanceY -= 10;
  }
  
  performanceY = clamp(performanceY, 0, 100);
  
  // Déterminer le quadrant
  const lowRisk = riskX < 45;
  const highPerf = performanceY >= 50;
  
  let quadrant: PerformanceRiskPosition['quadrant'];
  let quadrantLabel: string;
  let quadrantColor: string;
  let advice: string;
  
  if (lowRisk && highPerf) {
    quadrant = 'optimal';
    quadrantLabel = 'Zone Optimale';
    quadrantColor = 'hsl(var(--success))';
    advice = 'Profil idéal pour la performance. Maintenir l\'équilibre.';
  } else if (!lowRisk && highPerf) {
    quadrant = 'risk-perf';
    quadrantLabel = 'Performance à Risque';
    quadrantColor = 'hsl(var(--warning))';
    advice = 'Potentiel élevé mais risque de blessure. Vigilance sur la charge.';
  } else if (lowRisk && !highPerf) {
    quadrant = 'safe-dev';
    quadrantLabel = 'Développement Sécurisé';
    quadrantColor = 'hsl(var(--primary))';
    advice = 'Profil sûr. Focus sur l\'amélioration de la performance.';
  } else {
    quadrant = 'danger';
    quadrantLabel = 'Zone de Danger';
    quadrantColor = 'hsl(var(--destructive))';
    advice = 'Réduire la charge avant de développer la performance.';
  }
  
  return { riskX, performanceY, quadrant, quadrantLabel, quadrantColor, advice };
}

// ============================================
// 7️⃣ IMPACT SUR RECOMMANDATIONS (ANNOTATIONS)
// ============================================

export function getInjuryRiskAnnotations(envelope: InjuryRiskEnvelope): string[] {
  const annotations: string[] = [];
  
  if (envelope.level === 'ELEVE' || envelope.level === 'CRITIQUE') {
    annotations.push(`⚠️ Risque blessure ${envelope.sport} : ${envelope.levelLabel}`);
    
    const criticalDrivers = envelope.drivers.filter(d => d.impact === 'critical');
    if (criticalDrivers.length > 0) {
      annotations.push(`Facteurs : ${criticalDrivers.map(d => d.label).join(', ')}`);
    }
    
    if (envelope.coachRecommendations.length > 0) {
      annotations.push(`Option : ${envelope.coachRecommendations[0]}`);
    }
  }
  
  return annotations;
}

// ============================================
// 8️⃣ ALIGNEMENT RAPPORT PDF
// ============================================

export const PDF_INJURY_RISK_SECTION = {
  title: "Gestion du Risque Blessure",
  
  getSectionContent: (capRisk: InjuryRiskEnvelope | null, bikeRisk: InjuryRiskEnvelope | null) => ({
    cap: capRisk ? {
      title: "Risque Blessure Course à Pied",
      score: capRisk.score,
      level: capRisk.levelLabel,
      factors: capRisk.drivers.filter(d => d.impact !== 'low').map(d => `${d.label}: ${d.value}`),
      recommendations: capRisk.guardrails.slice(0, 3),
      disclaimer: capRisk.disclaimer
    } : null,
    
    bike: bikeRisk ? {
      title: "Risque Blessure Cyclisme",
      score: bikeRisk.score,
      level: bikeRisk.levelLabel,
      factors: bikeRisk.drivers.filter(d => d.impact !== 'low').map(d => `${d.label}: ${d.value}`),
      recommendations: bikeRisk.guardrails.slice(0, 3),
      disclaimer: bikeRisk.disclaimer
    } : null,
    
    nonMedicalReminder: "Ces indices ne sont pas des diagnostics médicaux. Ils visent à éclairer les décisions d'entraînement."
  })
};

// ============================================
// 9️⃣ ALIGNEMENT ACADEMY
// ============================================

export const ACADEMY_INJURY_RISK_MODULE = {
  id: 'injury_risk_understanding',
  title: "Pourquoi les athlètes se blessent malgré un bon moteur",
  icon: "🤕",
  
  sections: [
    {
      id: 'vlamax_rigidity',
      title: "VLamax et rigidité métabolique",
      content: `Une VLamax élevée signifie un coût énergétique accru pour chaque foulée ou coup de pédale.
En course à pied, cela se traduit par une fatigue neuromusculaire précoce et des compensations mécaniques
qui augmentent les contraintes sur le système locomoteur.

En cyclisme, cela limite la capacité à soutenir du couple sur de longues durées.`
    },
    {
      id: 'invisible_fatigue',
      title: "Fatigue invisible",
      content: `La fatigue accumulée ne se manifeste pas toujours par une sensation d'épuisement.
Elle peut se traduire par :
- Une perte de coordination fine
- Une altération du pattern de mouvement
- Une rigidité musculaire accrue
- Une récupération incomplète entre séances`
    },
    {
      id: 'capacity_illusion',
      title: "Illusion de capacité",
      content: `Un athlète avec un "bon moteur" (VO2max élevé, bonne FTP) peut avoir l'impression 
de pouvoir absorber plus de charge que son système musculo-squelettique ne le permet.

Le moteur aérobie récupère plus vite que les structures mécaniques.
D'où l'importance de l'indice de risque blessure : il intègre la durabilité (TTE) et le profil métabolique.`
    },
    {
      id: 'coach_role',
      title: "Rôle du coach",
      content: `L'indice de risque blessure est un outil d'aide à la décision, pas un oracle.
Le coach doit :
- Croiser cet indice avec les signaux de l'athlète
- Ajuster la charge en fonction du contexte
- Prioriser la progression sur le long terme
- Ne jamais ignorer une douleur "légère" qui persiste`
    }
  ],
  
  keyTakeaways: [
    "Le risque blessure n'est pas lié à une séance mais à un écart contraintes/capacité",
    "Un moteur performant ne garantit pas une structure résistante",
    "La fatigue invisible est le premier facteur de blessure",
    "L'indice de risque guide mais ne décide pas"
  ]
};

// ============================================
// 10️⃣ TEXTE LÉGAL (DISCLAIMER)
// ============================================

export const INJURY_RISK_LEGAL_DISCLAIMER = {
  short: "Cet indice n'est pas un diagnostic médical.",
  
  full: `Cet indice n'est pas un diagnostic médical.
Il vise à éclairer les décisions d'entraînement en estimant le risque de blessure
lié aux contraintes mécaniques et à la capacité de récupération.

Il doit être interprété par un coach qualifié et ne se substitue pas à un avis médical.
En cas de douleur persistante, consulter un professionnel de santé.`,
  
  version: METHOD_VERSION_DISPLAY
};

// ============================================
// HELPERS UI
// ============================================

export function getInjuryRiskIcon(level: InjuryRiskLevelUnified): string {
  return INJURY_RISK_SCALE[level].icon;
}

export function getInjuryRiskColorClass(level: InjuryRiskLevelUnified): string {
  switch (level) {
    case 'FAIBLE': return 'text-green-600 dark:text-green-400';
    case 'MODERE': return 'text-blue-600 dark:text-blue-400';
    case 'ELEVE': return 'text-amber-600 dark:text-amber-400';
    case 'CRITIQUE': return 'text-red-600 dark:text-red-400';
  }
}

export function getInjuryRiskBadgeClass(level: InjuryRiskLevelUnified): string {
  switch (level) {
    case 'FAIBLE': return 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50';
    case 'MODERE': return 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/50';
    case 'ELEVE': return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50';
    case 'CRITIQUE': return 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50';
  }
}

// ============================================
// CHATBOT Q&A
// ============================================

export const INJURY_RISK_CHATBOT_QA = [
  {
    question: "Pourquoi mon risque blessure est élevé alors que je me sens bien ?",
    answer: `Le risque blessure est basé sur des indicateurs objectifs (VLamax, TTE, fatigue, charge) 
qui peuvent indiquer un écart entre les contraintes imposées et la capacité de récupération,
même si les sensations sont bonnes. C'est précisément ce décalage qui génère des blessures "surprises".`
  },
  {
    question: "Comment réduire mon risque blessure CAP ?",
    answer: `Plusieurs leviers :
1. Réduire temporairement le volume CAP (15-20%)
2. Favoriser le vélo pour maintenir la charge cardio
3. Travailler l'économie de course (technique)
4. S'assurer d'une récupération complète entre qualités
5. Développer le TTE progressivement`
  },
  {
    question: "Le risque vélo et CAP peuvent-ils être différents ?",
    answer: `Oui, et c'est très fréquent. La CAP impose des contraintes mécaniques (impacts répétés) 
que le vélo n'a pas. Un athlète peut avoir un risque CAP élevé mais un risque Vélo faible.
C'est pourquoi on recommande parfois de reporter la charge sur le vélo.`
  }
];
