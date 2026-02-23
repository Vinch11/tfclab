/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RUNNING LIMITER DETECTION — TFCL Method™ (Running Focus Mode)
 * 
 * Moteur de détection des facteurs limitants 100% CAP.
 * Aucune référence vélo. Logique pure course à pied.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  type RunningLimiter,
  type RunningLever,
  type RunningRaceType,
  type RunningTargets,
  RUNNING_LIMITER_INFO,
  RUNNING_LEVER_INFO,
  getRunningTargets,
} from "@/lib/runningFocusMode";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RunningLimiterInput {
  // Données physiologiques CAP
  vo2max: number | null;           // ml/kg/min
  vma: number | null;              // km/h (VMA)
  vlamaxCap: number | null;        // mmol/L/s (VLamax CAP)
  economyScore: number | null;     // 0-100
  
  // Durabilité
  durabilityMin: number | null;    // Minutes à l'allure cible
  hrDriftPct: number | null;       // % dérive cardiaque
  
  // Pacing
  pacingConsistency: number | null; // 0-100 (régularité)
  
  // Disponibilité
  availabilityScore: number | null; // 0-100
  hasHealthAlerts: boolean;
  mechanicalFatigue: number | null; // 0-100 (fatigue mécanique)
  
  // Contexte
  raceType: RunningRaceType;
  age: number | null;
}

export interface RunningGapAnalysis {
  metric: string;
  value: number | null;
  target: number;
  gap: number;           // Négatif = en dessous de la cible
  gapPercent: number;    // Gap en %
  status: "optimal" | "acceptable" | "limiting";
  weight: number;        // Importance stratégique (0-1)
  weightedImpact: number;
}

export interface RunningLimiterResult {
  // Limiteur principal
  primaryLimiter: RunningLimiter;
  limiterLabel: string;
  limiterEmoji: string;
  limiterExplanation: string;
  
  // Levier prioritaire
  primaryLever: RunningLever;
  leverLabel: string;
  leverEmoji: string;
  leverDescription: string;
  
  // Analyse par domaine
  gapAnalysis: RunningGapAnalysis[];
  
  // Robustesse
  isRobust: boolean;
  robustnessScore: number; // 0-100
  robustnessNote: string;
  
  // Confiance
  confidence: number; // 0-1
  confidenceLabel: string;
  
  // Métadonnées
  targetsUsed: RunningTargets;
  version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POIDS STRATÉGIQUES PAR TYPE DE COURSE
// ═══════════════════════════════════════════════════════════════════════════════

const STRATEGIC_WEIGHTS: Record<RunningRaceType, Record<string, number>> = {
  "StartToRun": {
    vo2max: 0.50,
    vlamax: 0.30,
    economy: 0.60,
    durability: 0.40,
    pacing: 0.40,
    mechanical: 0.70,
    availability: 0.80,
  },
  "5K": {
    vo2max: 0.95,
    vlamax: 0.60,
    economy: 0.70,
    durability: 0.55,
    pacing: 0.60,
    mechanical: 0.50,
    availability: 0.55,
  },
  "10K": {
    vo2max: 0.92,
    vlamax: 0.70,
    economy: 0.75,
    durability: 0.65,
    pacing: 0.70,
    mechanical: 0.55,
    availability: 0.60,
  },
  "Semi": {
    vo2max: 0.85,
    vlamax: 0.80,
    economy: 0.80,
    durability: 0.85,
    pacing: 0.80,
    mechanical: 0.65,
    availability: 0.65,
  },
  "Marathon": {
    vo2max: 0.80,
    vlamax: 0.90,
    economy: 0.88,
    durability: 0.95,
    pacing: 0.90,
    mechanical: 0.75,
    availability: 0.70,
  },
  "Trail": {
    vo2max: 0.82,
    vlamax: 0.82,
    economy: 0.78,
    durability: 0.88,
    pacing: 0.70,
    mechanical: 0.80,
    availability: 0.72,
  },
  "TrailShort": {
    vo2max: 0.85,
    vlamax: 0.78,
    economy: 0.75,
    durability: 0.80,
    pacing: 0.72,
    mechanical: 0.75,
    availability: 0.68,
  },
  "TrailMountain": {
    vo2max: 0.80,
    vlamax: 0.85,
    economy: 0.82,
    durability: 0.92,
    pacing: 0.65,
    mechanical: 0.88,
    availability: 0.75,
  },
  "TrailUltra": {
    vo2max: 0.75,
    vlamax: 0.92,
    economy: 0.90,
    durability: 0.98,
    pacing: 0.60,
    mechanical: 0.92,
    availability: 0.80,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getWeights(raceType: RunningRaceType): Record<string, number> {
  return STRATEGIC_WEIGHTS[raceType] || STRATEGIC_WEIGHTS["Marathon"];
}

/**
 * Facteur d'ajustement VO2max par âge
 */
function getVo2maxAgeFactor(age: number | null): number {
  if (age === null || age < 30) return 1.0;
  if (age < 40) return 0.95;
  if (age < 50) return 0.88;
  if (age < 60) return 0.80;
  return 0.72;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

export function detectRunningLimiter(input: RunningLimiterInput): RunningLimiterResult {
  const targets = getRunningTargets(input.raceType);
  const weights = getWeights(input.raceType);
  const ageFactor = getVo2maxAgeFactor(input.age);
  
  const gapAnalysis: RunningGapAnalysis[] = [];
  
  // 1. Analyse VO2max
  const vo2maxTarget = targets.vo2max.optimal * ageFactor;
  const vo2maxGap = input.vo2max !== null 
    ? (input.vo2max - vo2maxTarget) / vo2maxTarget 
    : 0;
  gapAnalysis.push({
    metric: "VO2max CAP",
    value: input.vo2max,
    target: Math.round(vo2maxTarget * 10) / 10,
    gap: input.vo2max !== null ? input.vo2max - vo2maxTarget : 0,
    gapPercent: vo2maxGap * 100,
    status: input.vo2max === null ? "acceptable"
      : input.vo2max >= vo2maxTarget ? "optimal"
      : input.vo2max >= vo2maxTarget * 0.9 ? "acceptable"
      : "limiting",
    weight: weights.vo2max,
    weightedImpact: vo2maxGap < 0 ? Math.abs(vo2maxGap) * weights.vo2max * 100 : 0,
  });
  
  // 2. Analyse VLamax CAP (plus bas = mieux pour endurance)
  const vlamaxOptimal = targets.vlamax.optimal;
  const vlamaxMax = targets.vlamax.max;
  const vlamaxExcess = input.vlamaxCap !== null && input.vlamaxCap > vlamaxMax;
  const vlamaxGap = input.vlamaxCap !== null 
    ? (input.vlamaxCap - vlamaxOptimal) / vlamaxOptimal 
    : 0;
  gapAnalysis.push({
    metric: "VLamax CAP",
    value: input.vlamaxCap,
    target: vlamaxOptimal,
    gap: input.vlamaxCap !== null ? input.vlamaxCap - vlamaxOptimal : 0,
    gapPercent: vlamaxGap * 100,
    status: input.vlamaxCap === null ? "acceptable"
      : input.vlamaxCap <= vlamaxOptimal ? "optimal"
      : input.vlamaxCap <= vlamaxMax ? "acceptable"
      : "limiting",
    weight: weights.vlamax,
    weightedImpact: vlamaxExcess 
      ? (input.vlamaxCap! - vlamaxMax) * 100 * weights.vlamax 
      : 0,
  });
  
  // 3. Analyse Économie de course
  const economyTarget = targets.economyScore.optimal;
  const economyGap = input.economyScore !== null 
    ? (input.economyScore - economyTarget) / economyTarget 
    : 0;
  gapAnalysis.push({
    metric: "Économie de course",
    value: input.economyScore,
    target: economyTarget,
    gap: input.economyScore !== null ? input.economyScore - economyTarget : 0,
    gapPercent: economyGap * 100,
    status: input.economyScore === null ? "acceptable"
      : input.economyScore >= economyTarget ? "optimal"
      : input.economyScore >= economyTarget * 0.85 ? "acceptable"
      : "limiting",
    weight: weights.economy,
    weightedImpact: economyGap < 0 ? Math.abs(economyGap) * weights.economy * 100 : 0,
  });
  
  // 4. Analyse Durabilité
  const durabilityTarget = targets.durabilityMin;
  const durabilityGap = input.durabilityMin !== null 
    ? (input.durabilityMin - durabilityTarget) / durabilityTarget 
    : 0;
  gapAnalysis.push({
    metric: "Durabilité d'allure",
    value: input.durabilityMin,
    target: durabilityTarget,
    gap: input.durabilityMin !== null ? input.durabilityMin - durabilityTarget : 0,
    gapPercent: durabilityGap * 100,
    status: input.durabilityMin === null ? "acceptable"
      : input.durabilityMin >= durabilityTarget ? "optimal"
      : input.durabilityMin >= durabilityTarget * 0.85 ? "acceptable"
      : "limiting",
    weight: weights.durability,
    weightedImpact: durabilityGap < 0 ? Math.abs(durabilityGap) * weights.durability * 100 : 0,
  });
  
  // 5. Analyse Pacing
  const pacingTarget = 85; // Score cible
  const pacingGap = input.pacingConsistency !== null 
    ? (input.pacingConsistency - pacingTarget) / pacingTarget 
    : 0;
  gapAnalysis.push({
    metric: "Constance d'allure",
    value: input.pacingConsistency,
    target: pacingTarget,
    gap: input.pacingConsistency !== null ? input.pacingConsistency - pacingTarget : 0,
    gapPercent: pacingGap * 100,
    status: input.pacingConsistency === null ? "acceptable"
      : input.pacingConsistency >= pacingTarget ? "optimal"
      : input.pacingConsistency >= 70 ? "acceptable"
      : "limiting",
    weight: weights.pacing,
    weightedImpact: pacingGap < 0 ? Math.abs(pacingGap) * weights.pacing * 100 : 0,
  });
  
  // 6. Analyse Fatigue Mécanique (inversé: plus bas = mieux)
  const mechanicalTarget = 30; // Score cible bas = peu de fatigue
  const mechanicalBad = input.mechanicalFatigue !== null && input.mechanicalFatigue > 60;
  gapAnalysis.push({
    metric: "Fatigue mécanique",
    value: input.mechanicalFatigue,
    target: mechanicalTarget,
    gap: input.mechanicalFatigue !== null ? mechanicalTarget - input.mechanicalFatigue : 0,
    gapPercent: input.mechanicalFatigue !== null 
      ? ((input.mechanicalFatigue - mechanicalTarget) / mechanicalTarget) * 100 
      : 0,
    status: input.mechanicalFatigue === null ? "acceptable"
      : input.mechanicalFatigue <= mechanicalTarget ? "optimal"
      : input.mechanicalFatigue <= 60 ? "acceptable"
      : "limiting",
    weight: weights.mechanical,
    weightedImpact: mechanicalBad 
      ? ((input.mechanicalFatigue! - 60) / 40) * weights.mechanical * 100 
      : 0,
  });
  
  // 7. Analyse Disponibilité
  const availabilityTarget = 70;
  const availabilityGap = input.availabilityScore !== null 
    ? (input.availabilityScore - availabilityTarget) / availabilityTarget 
    : 0;
  gapAnalysis.push({
    metric: "Disponibilité",
    value: input.availabilityScore,
    target: availabilityTarget,
    gap: input.availabilityScore !== null ? input.availabilityScore - availabilityTarget : 0,
    gapPercent: availabilityGap * 100,
    status: input.hasHealthAlerts ? "limiting"
      : input.availabilityScore === null ? "acceptable"
      : input.availabilityScore >= availabilityTarget ? "optimal"
      : input.availabilityScore >= 50 ? "acceptable"
      : "limiting",
    weight: weights.availability,
    weightedImpact: (input.hasHealthAlerts ? 50 : 0) + 
      (availabilityGap < 0 ? Math.abs(availabilityGap) * weights.availability * 100 : 0),
  });
  
  // Tri par impact pondéré
  const sortedGaps = [...gapAnalysis].sort((a, b) => b.weightedImpact - a.weightedImpact);
  const topGap = sortedGaps[0];
  const secondGap = sortedGaps[1];
  
  // Identification du limiteur
  let primaryLimiter: RunningLimiter = "none";
  let primaryLever: RunningLever = "recovery";
  
  if (topGap.weightedImpact > 5) {
    switch (topGap.metric) {
      case "VO2max CAP":
        primaryLimiter = "vo2max_insufficient";
        primaryLever = "vo2max_intervals";
        break;
      case "VLamax CAP":
        primaryLimiter = "vlamax_high";
        primaryLever = "aerobic_volume";
        break;
      case "Économie de course":
        primaryLimiter = "economy_deficient";
        primaryLever = "economy_technique";
        break;
      case "Durabilité d'allure":
        primaryLimiter = "durability_insufficient";
        primaryLever = "race_pace";
        break;
      case "Constance d'allure":
        primaryLimiter = "pacing_unstable";
        primaryLever = "pacing_discipline";
        break;
      case "Fatigue mécanique":
        primaryLimiter = "mechanical_fatigue";
        primaryLever = "strength_conditioning";
        break;
      case "Disponibilité":
        primaryLimiter = "availability_low";
        primaryLever = "recovery";
        break;
    }
  }
  
  // Robustesse (écart entre 1er et 2ème limiteur)
  const robustnessDelta = topGap.weightedImpact - (secondGap?.weightedImpact || 0);
  const isRobust = robustnessDelta > 10;
  const robustnessScore = Math.min(100, robustnessDelta * 5);
  
  // Confiance basée sur la complétude des données
  const dataCount = gapAnalysis.filter(g => g.value !== null).length;
  const confidence = dataCount / gapAnalysis.length;
  
  const limiterInfo = RUNNING_LIMITER_INFO[primaryLimiter];
  const leverInfo = RUNNING_LEVER_INFO[primaryLever];
  
  return {
    primaryLimiter,
    limiterLabel: limiterInfo.label,
    limiterEmoji: limiterInfo.emoji,
    limiterExplanation: limiterInfo.description,
    
    primaryLever,
    leverLabel: leverInfo.label,
    leverEmoji: leverInfo.emoji,
    leverDescription: leverInfo.description,
    
    gapAnalysis,
    
    isRobust,
    robustnessScore,
    robustnessNote: isRobust 
      ? "Décision claire, écart significatif avec le 2ème facteur." 
      : "Plusieurs facteurs proches, affiner l'analyse recommandé.",
    
    confidence,
    confidenceLabel: confidence >= 0.8 ? "Élevée" 
      : confidence >= 0.5 ? "Moyenne" 
      : "Faible (données incomplètes)",
    
    targetsUsed: targets,
    version: "running-v1.0",
  };
}
