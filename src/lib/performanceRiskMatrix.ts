/**
 * GLOBAL PERFORMANCE RISK MATRIX™ — Two For Coaching Lab
 * 
 * Matrice décisionnelle unifiée pour visualiser l'équilibre :
 * - AXE 1: Potentiel de Performance (0-100)
 * - AXE 2: Fatigue Actuelle (FatigueIndex™)
 * - AXE 3: Risque de Blessure (sport-spécifique)
 * 
 * ⚠️ OUTIL DE LECTURE ET DE DÉCISION, PAS DE PRESCRIPTION
 * 
 * "Cette matrice n'est pas une prédiction.
 * C'est un outil de lecture physiologique pour guider la décision humaine."
 */

import { CAPInjuryRiskResult, computeCAPInjuryRisk } from "@/lib/capInjuryRisk";

// =============================================
// TYPES
// =============================================

export type RiskLevel = "low" | "moderate" | "high";

export interface PerformanceIndex {
  value: number;  // 0-100
  range: { min: number; max: number };  // Plage réaliste
  band: 'limited' | 'intermediate' | 'high' | 'very_high';
  bandLabel: string;
  confidence: number;  // 0-1
}

export interface FatigueStatus {
  value: number;  // 0-100%
  zone: 'fresh' | 'functional' | 'elevated' | 'overload';
  zoneLabel: string;
  trend: 'up' | 'down' | 'stable';
  trendEmoji: string;
  contributors: string[];
}

export interface InjuryRiskIndex {
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  score: number;  // 0-100
  sport: 'bike' | 'run';
  factors: string[];
  justification: string;
}

export interface MatrixPosition {
  x: number;  // 0-100 (Performance)
  y: number;  // 0-100 (Fatigue)
  xNumeric: number; // 0-2 (legacy compatibility)
  yNumeric: number; // 0-2 (legacy compatibility)
  zone: 'build' | 'optimize' | 'stabilize' | 'protect';
  zoneLabel: string;
  zoneEmoji: string;
  zoneColor: string;
  zoneDescription: string;
}

export interface MatrixPoint {
  position: MatrixPosition;
  label: string;
  color: string;
}

export interface MatrixComparison {
  before: MatrixPosition;
  after: MatrixPosition;
  delta: {
    performance: number;
    fatigue: number;
    injuryRisk: string;
  };
  message: string;
  improved: boolean;
}

export interface ComputeMatrixParams {
  // CAP Injury Risk (source unifiée)
  capInjuryRisk?: CAPInjuryRiskResult;
  
  // Performance inputs
  ftp?: number | null;
  weight?: number | null;
  vo2max?: number | null;
  vlamaxValue: number | null;
  vlamaxConfidence?: number;
  tteValue: number | null;
  tteConfidence?: number;
  
  // Potentiel Physiologique
  potentielPhysiologiqueScore: number | null;
  
  // Fatigue inputs (FatigueIndex™)
  fatigueIndex?: number | null;
  tss7d?: number | null;
  stressLevel?: number | null;
  sleepQuality?: number | null;
  
  // Objectif
  objectif: string;
  
  // Sport for injury risk
  sport?: 'bike' | 'run';
  runVolume7d?: number | null;
  injuryHistory?: boolean;
  
  // Simulation (after)
  simulatedFatigueReduction?: number;
  simulatedPerformanceGain?: number;
}

export interface PerformanceRiskMatrixResult {
  before: MatrixPoint;
  after: MatrixPoint;
  performance: PerformanceIndex;
  fatigue: FatigueStatus;
  injuryRisk: {
    bike: InjuryRiskIndex;
    run: InjuryRiskIndex;
  };
  injuryRiskLabel: string;
  performanceRiskLabel: string;
  interpretation: string;
  improvementSummary: string;
  disclaimer: string;
}

// =============================================
// CONSTANTS
// =============================================

export const PERFORMANCE_BANDS = {
  limited: { min: 0, max: 40, label: 'Potentiel limité', color: 'hsl(var(--muted))' },
  intermediate: { min: 40, max: 65, label: 'Potentiel intermédiaire', color: 'hsl(var(--warning))' },
  high: { min: 65, max: 85, label: 'Potentiel élevé', color: 'hsl(var(--primary))' },
  very_high: { min: 85, max: 100, label: 'Potentiel très élevé', color: 'hsl(142, 76%, 36%)' }
} as const;

export const FATIGUE_ZONES = {
  fresh: { min: 0, max: 35, label: 'Frais / Prêt à encaisser', color: 'hsl(142, 76%, 36%)', emoji: '🟢' },
  functional: { min: 35, max: 60, label: 'Charge fonctionnelle', color: 'hsl(48, 96%, 53%)', emoji: '🟡' },
  elevated: { min: 60, max: 75, label: 'Fatigue élevée', color: 'hsl(25, 95%, 53%)', emoji: '🟠' },
  overload: { min: 75, max: 100, label: 'Surcharge / Alerte', color: 'hsl(0, 84%, 60%)', emoji: '🔴' }
} as const;

export const INJURY_RISK_LEVELS = {
  LOW: { label: 'Faible', color: 'hsl(142, 76%, 36%)', emoji: '🟢', bgClass: 'bg-green-100 dark:bg-green-900/30' },
  MODERATE: { label: 'Modéré', color: 'hsl(48, 96%, 53%)', emoji: '🟡', bgClass: 'bg-amber-100 dark:bg-amber-900/30' },
  HIGH: { label: 'Élevé', color: 'hsl(25, 95%, 53%)', emoji: '🟠', bgClass: 'bg-orange-100 dark:bg-orange-900/30' },
  CRITICAL: { label: 'Critique', color: 'hsl(0, 84%, 60%)', emoji: '🔴', bgClass: 'bg-red-100 dark:bg-red-900/30' }
} as const;

export const MATRIX_ZONES = {
  build: { 
    label: 'Construire', 
    emoji: '🔵', 
    color: 'hsl(217, 91%, 60%)',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    description: 'Potentiel à développer, fatigue basse — fenêtre de construction'
  },
  optimize: { 
    label: 'Optimiser', 
    emoji: '🟢', 
    color: 'hsl(142, 76%, 36%)',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    description: 'Potentiel élevé, fatigue maîtrisée — affiner les détails'
  },
  stabilize: { 
    label: 'Stabiliser', 
    emoji: '🟡', 
    color: 'hsl(48, 96%, 53%)',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    description: 'Fatigue modérée — maintenir sans forcer'
  },
  protect: { 
    label: 'Protéger', 
    emoji: '🔴', 
    color: 'hsl(0, 84%, 60%)',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    description: 'Fatigue critique — priorité à la récupération'
  }
} as const;

// =============================================
// VLAMAX TARGET BY OBJECTIVE
// =============================================

const VLAMAX_TARGETS: Record<string, number> = {
  'IM': 0.30,
  '703': 0.35,
  'MARATHON': 0.32,
  'SEMI': 0.40
};

const TTE_TARGETS: Record<string, number> = {
  'IM': 55,
  '703': 50,
  'MARATHON': 52,
  'SEMI': 47
};

// =============================================
// SEUILS PAR OBJECTIF
// =============================================

interface ObjectifTargets {
  vlamaxIdeal: number;
  vlamaxModerate: number;
  tteIdeal: number;
  tteModerate: number;
  readinessGood: number;
  readinessModerate: number;
}

function getTargetsForObjectif(objectif: string): ObjectifTargets {
  const normalized = objectif.toLowerCase();
  
  if (normalized.includes("semi") || normalized.includes("21k")) {
    return {
      vlamaxIdeal: 0.45,
      vlamaxModerate: 0.55,
      tteIdeal: 50,
      tteModerate: 42,
      readinessGood: 75,
      readinessModerate: 55,
    };
  }
  
  if (normalized.includes("marathon") && !normalized.includes("semi")) {
    return {
      vlamaxIdeal: 0.40,
      vlamaxModerate: 0.50,
      tteIdeal: 55,
      tteModerate: 45,
      readinessGood: 80,
      readinessModerate: 60,
    };
  }
  
  if (normalized.includes("70.3") || normalized.includes("703") || normalized.includes("half")) {
    return {
      vlamaxIdeal: 0.42,
      vlamaxModerate: 0.52,
      tteIdeal: 52,
      tteModerate: 44,
      readinessGood: 75,
      readinessModerate: 55,
    };
  }
  
  if (normalized.includes("ironman") || normalized.includes("kona") || normalized.includes("im")) {
    return {
      vlamaxIdeal: 0.35,
      vlamaxModerate: 0.45,
      tteIdeal: 58,
      tteModerate: 48,
      readinessGood: 80,
      readinessModerate: 60,
    };
  }
  
  // Default
  return {
    vlamaxIdeal: 0.45,
    vlamaxModerate: 0.55,
    tteIdeal: 50,
    tteModerate: 42,
    readinessGood: 75,
    readinessModerate: 55,
  };
}

function getObjectifKey(objectif: string): string {
  const normalized = objectif.toLowerCase();
  if (normalized.includes("ironman") || normalized.includes("kona") || normalized.includes("im full")) return 'IM';
  if (normalized.includes("70.3") || normalized.includes("703") || normalized.includes("half")) return '703';
  if (normalized.includes("marathon") && !normalized.includes("semi")) return 'MARATHON';
  return 'SEMI';
}

// =============================================
// AXE 1: PERFORMANCE INDEX CALCULATION
// =============================================

export function computePerformanceIndex(params: ComputeMatrixParams): PerformanceIndex {
  let score = 50; // Base
  let confidence = 0.5;
  let factors = 0;
  const objectifKey = getObjectifKey(params.objectif);

  // FTP/kg contribution (0-30 points)
  if (params.ftp && params.weight) {
    const ftpKg = params.ftp / params.weight;
    // Elite ~6.5 W/kg, Recreational ~2.5 W/kg
    const ftpScore = Math.min(30, Math.max(0, (ftpKg - 2.5) / 4 * 30));
    score += ftpScore - 15; // Center around 50
    confidence += 0.15;
    factors++;
  }

  // VO2max contribution (0-25 points)
  if (params.vo2max) {
    // Elite ~80, Average ~40
    const vo2Score = Math.min(25, Math.max(0, (params.vo2max - 35) / 45 * 25));
    score += vo2Score - 12.5;
    confidence += 0.1;
    factors++;
  }

  // VLamax alignment with objective (0-20 points)
  if (params.vlamaxValue !== null) {
    const target = VLAMAX_TARGETS[objectifKey] || 0.35;
    const diff = Math.abs(params.vlamaxValue - target);
    const vlamaxScore = Math.max(0, 20 - diff * 50);
    score += vlamaxScore - 10;
    confidence += 0.15;
    factors++;
  }

  // TTE contribution (0-25 points)
  if (params.tteValue !== null) {
    const tteTarget = TTE_TARGETS[objectifKey] || 50;
    const tteRatio = params.tteValue / tteTarget;
    const tteScore = Math.min(25, Math.max(0, tteRatio * 25));
    score += tteScore - 12.5;
    confidence += 0.1;
    factors++;
  }

  // Potentiel Physiologique contribution
  if (params.potentielPhysiologiqueScore !== null) {
    const rrScore = (params.potentielPhysiologiqueScore / 100) * 15;
    score += rrScore - 7.5;
    confidence += 0.1;
    factors++;
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));
  confidence = Math.min(1, factors > 0 ? confidence : 0.3);

  // Compute range based on confidence
  const uncertainty = (1 - confidence) * 15;
  const range = {
    min: Math.max(0, Math.round(score - uncertainty)),
    max: Math.min(100, Math.round(score + uncertainty))
  };

  // Determine band
  let band: PerformanceIndex['band'] = 'limited';
  if (score >= 85) band = 'very_high';
  else if (score >= 65) band = 'high';
  else if (score >= 40) band = 'intermediate';

  return {
    value: Math.round(score),
    range,
    band,
    bandLabel: PERFORMANCE_BANDS[band].label,
    confidence: Math.round(confidence * 100) / 100
  };
}

// =============================================
// AXE 2: FATIGUE STATUS
// =============================================

export function computeFatigueStatus(params: ComputeMatrixParams): FatigueStatus {
  const value = params.fatigueIndex ?? 50;
  
  // Determine zone
  let zone: FatigueStatus['zone'] = 'functional';
  if (value <= 35) zone = 'fresh';
  else if (value <= 60) zone = 'functional';
  else if (value <= 75) zone = 'elevated';
  else zone = 'overload';

  // Determine contributors
  const contributors: string[] = [];
  if (params.tss7d && params.tss7d > 500) contributors.push('Charge récente élevée');
  if (params.stressLevel && params.stressLevel > 7) contributors.push('Stress élevé');
  if (params.sleepQuality && params.sleepQuality < 4) contributors.push('Sommeil insuffisant');
  if (contributors.length === 0) contributors.push('Données insuffisantes');

  // Trend (simplified - would need historical data)
  const trend: FatigueStatus['trend'] = 'stable';
  const trendEmoji = '→'; // Stable by default

  return {
    value: Math.round(value),
    zone,
    zoneLabel: FATIGUE_ZONES[zone].label,
    trend,
    trendEmoji,
    contributors
  };
}

// =============================================
// AXE 3: INJURY RISK INDEX (SPORT-SPECIFIC)
// =============================================

export function computeInjuryRiskIndex(params: ComputeMatrixParams, sport: 'bike' | 'run'): InjuryRiskIndex {
  let score = 20; // Base (low risk)
  const factors: string[] = [];

  const fatigue = params.fatigueIndex ?? 50;
  const objectifKey = getObjectifKey(params.objectif);

  if (sport === 'run') {
    // CAP-specific factors
    
    // VLamax élevé + objectif longue distance
    if (params.vlamaxValue !== null) {
      const target = VLAMAX_TARGETS[objectifKey] || 0.35;
      if (params.vlamaxValue > target + 0.10) {
        score += 20;
        factors.push('VLamax élevé pour objectif');
      } else if (params.vlamaxValue > target + 0.05) {
        score += 10;
        factors.push('VLamax modérément élevé');
      }
    }

    // TTE faible
    if (params.tteValue !== null) {
      const tteTarget = TTE_TARGETS[objectifKey] || 50;
      if (params.tteValue < tteTarget - 10) {
        score += 20;
        factors.push('Durabilité insuffisante');
      } else if (params.tteValue < tteTarget - 5) {
        score += 10;
        factors.push('Durabilité limite');
      }
    }

    // Fatigue élevée
    if (fatigue > 60) {
      score += (fatigue - 60) * 0.5;
      factors.push(`Fatigue ${Math.round(fatigue)}%`);
    }

    // Volume CAP récent
    if (params.runVolume7d && params.runVolume7d > 70) {
      score += 10;
      factors.push('Volume CAP élevé');
    }

    // Historique blessures
    if (params.injuryHistory) {
      score += 15;
      factors.push('Historique de blessures');
    }

  } else {
    // Vélo-specific factors
    
    // Fatigue élevée
    if (fatigue > 60) {
      score += (fatigue - 60) * 0.4;
      factors.push(`Fatigue ${Math.round(fatigue)}%`);
    }

    // TTE faible (durabilité)
    if (params.tteValue !== null) {
      const tteTarget = TTE_TARGETS[objectifKey] || 50;
      if (params.tteValue < tteTarget - 10) {
        score += 15;
        factors.push('Durabilité limitée');
      } else if (params.tteValue < tteTarget - 5) {
        score += 8;
        factors.push('Durabilité à améliorer');
      }
    }
  }

  // Clamp score
  score = Math.min(100, Math.max(0, score));

  // Determine level
  let level: InjuryRiskIndex['level'] = 'LOW';
  if (score >= 70) level = 'CRITICAL';
  else if (score >= 50) level = 'HIGH';
  else if (score >= 30) level = 'MODERATE';

  // Build justification
  const justification = factors.length > 0
    ? `Risque ${sport === 'run' ? 'CAP' : 'vélo'} ${INJURY_RISK_LEVELS[level].label.toLowerCase()} : ${factors.join(' + ')}`
    : `Risque ${sport === 'run' ? 'CAP' : 'vélo'} faible : aucun facteur aggravant détecté`;

  return {
    level,
    score: Math.round(score),
    sport,
    factors,
    justification
  };
}

// =============================================
// MATRIX POSITION (2x2 zones)
// =============================================

export function computeMatrixPosition(
  performance: PerformanceIndex,
  fatigue: FatigueStatus
): MatrixPosition {
  const x = performance.value;
  const y = fatigue.value;

  // Determine zone based on quadrant
  // X = Performance (higher = better)
  // Y = Fatigue (higher = worse)
  let zone: MatrixPosition['zone'];
  
  if (y > 60) {
    // High fatigue → Protect
    zone = 'protect';
  } else if (y > 35 && x < 65) {
    // Moderate fatigue, moderate performance → Stabilize
    zone = 'stabilize';
  } else if (x >= 65 && y <= 35) {
    // High performance, low fatigue → Optimize
    zone = 'optimize';
  } else {
    // Low fatigue, potential to build → Build
    zone = 'build';
  }

  const zoneConfig = MATRIX_ZONES[zone];

  // Legacy numeric conversion for compatibility
  const xNumeric = x < 40 ? 2 : x < 65 ? 1 : 0;
  const yNumeric = y < 35 ? 0 : y < 60 ? 1 : 2;

  return {
    x,
    y,
    xNumeric,
    yNumeric,
    zone,
    zoneLabel: zoneConfig.label,
    zoneEmoji: zoneConfig.emoji,
    zoneColor: zoneConfig.color,
    zoneDescription: zoneConfig.description
  };
}

// =============================================
// PROJECTION "APRÈS" RECOMMANDATIONS
// =============================================

function projectAfterRecommendations(params: ComputeMatrixParams): {
  performance: PerformanceIndex;
  fatigue: FatigueStatus;
} {
  // Projections optimistes mais réalistes
  const afterParams: ComputeMatrixParams = {
    ...params,
    // Fatigue reduction (10-15% if recommendations are followed)
    fatigueIndex: Math.max(0, (params.fatigueIndex ?? 50) - (params.simulatedFatigueReduction ?? 12)),
    // Slight TTE improvement if fatigue drops
    tteValue: params.tteValue !== null 
      ? Math.min(65, params.tteValue + (params.simulatedPerformanceGain ?? 3))
      : null,
    // VLamax slight improvement toward target
    vlamaxValue: params.vlamaxValue !== null
      ? Math.max(0.25, params.vlamaxValue - 0.04)
      : null
  };
  
  const performance = computePerformanceIndex(afterParams);
  const fatigue = computeFatigueStatus(afterParams);
  
  return { performance, fatigue };
}

// =============================================
// GÉNÉRATION INTERPRÉTATION TEXTUELLE
// =============================================

function generateInterpretation(before: MatrixPosition, after: MatrixPosition): string {
  const beforeZoneConfig = MATRIX_ZONES[before.zone];
  const afterZoneConfig = MATRIX_ZONES[after.zone];
  
  if (before.zone === after.zone) {
    return `Position actuelle : ${before.zoneEmoji} ${before.zoneLabel}. ${beforeZoneConfig.description}. Les ajustements proposés visent à consolider cette position.`;
  }
  
  const improvements: string[] = [];
  if (after.x > before.x) improvements.push("amélioration du potentiel performance");
  if (after.y < before.y) improvements.push("réduction de la fatigue");
  
  if (improvements.length === 0) {
    return `Position actuelle : ${before.zoneEmoji} ${before.zoneLabel}. Les recommandations visent à optimiser le profil.`;
  }
  
  return `Position actuelle : ${before.zoneEmoji} ${before.zoneLabel}. Les ajustements proposés visent une ${improvements.join(" et ")}, déplaçant le profil vers ${after.zoneEmoji} ${after.zoneLabel}.`;
}

function generateImprovementSummary(before: MatrixPosition, after: MatrixPosition): string {
  const xDelta = after.x - before.x;
  const yDelta = before.y - after.y; // Inverted because lower fatigue is better
  
  if (Math.abs(xDelta) < 3 && Math.abs(yDelta) < 3) {
    return "Consolidation du profil actuel.";
  }
  
  const parts: string[] = [];
  if (xDelta > 0) parts.push(`Performance: +${Math.round(xDelta)} pts`);
  if (yDelta > 0) parts.push(`Fatigue: -${Math.round(yDelta)}%`);
  
  if (before.zone !== after.zone) {
    parts.push(`Zone: ${before.zoneEmoji} → ${after.zoneEmoji}`);
  }
  
  return parts.join(" | ") || "Optimisation ciblée en cours.";
}

// =============================================
// FONCTION PRINCIPALE
// =============================================

export function computePerformanceRiskMatrix(params: ComputeMatrixParams): PerformanceRiskMatrixResult {
  // Compute Performance Index
  const performance = computePerformanceIndex(params);
  
  // Compute Fatigue Status
  const fatigue = computeFatigueStatus(params);
  
  // Compute Injury Risk for both sports
  const injuryRiskBike = computeInjuryRiskIndex(params, 'bike');
  const injuryRiskRun = computeInjuryRiskIndex(params, 'run');
  
  // AVANT: état actuel
  const beforePosition = computeMatrixPosition(performance, fatigue);
  
  // APRÈS: projection post-recommandations
  const projected = projectAfterRecommendations(params);
  const afterPosition = computeMatrixPosition(projected.performance, projected.fatigue);
  
  // Determine if improvement occurred
  const improved = afterPosition.y < beforePosition.y || afterPosition.x > beforePosition.x;

  return {
    before: {
      position: beforePosition,
      label: "AVANT",
      color: "hsl(var(--muted-foreground))",
    },
    after: {
      position: afterPosition,
      label: "APRÈS (projection)",
      color: afterPosition.zoneColor,
    },
    performance,
    fatigue,
    injuryRisk: {
      bike: injuryRiskBike,
      run: injuryRiskRun
    },
    injuryRiskLabel: injuryRiskRun.justification,
    performanceRiskLabel: performance.bandLabel,
    interpretation: generateInterpretation(beforePosition, afterPosition),
    improvementSummary: generateImprovementSummary(beforePosition, afterPosition),
    disclaimer: MATRIX_DISCLAIMER,
  };
}

// =============================================
// HELPERS POUR AFFICHAGE
// =============================================

export function getMatrixCellColor(x: number, y: number): string {
  // x = performance (0-100, higher is better)
  // y = fatigue (0-100, lower is better)
  
  // Optimal: high perf, low fatigue
  if (x >= 65 && y <= 35) return "bg-green-100 dark:bg-green-900/30";
  // Critical: high fatigue
  if (y >= 60) return "bg-red-100 dark:bg-red-900/30";
  // Build: low fatigue, developing
  if (y <= 35 && x < 65) return "bg-blue-100 dark:bg-blue-900/30";
  // Stabilize: moderate
  return "bg-amber-100 dark:bg-amber-900/30";
}

export function getMatrixCellLabel(x: number, y: number): string {
  if (x >= 65 && y <= 35) return "Optimiser";
  if (y >= 60) return "Protéger";
  if (y <= 35 && x < 65) return "Construire";
  return "Stabiliser";
}

// =============================================
// PEDAGOGICAL TEXTS
// =============================================

export const MATRIX_DISCLAIMER = `Cette matrice n'est pas une prédiction.
C'est un outil de lecture physiologique pour guider la décision humaine.

Two For Coaching Lab ne remplace pas le coach.`;

export const MATRIX_ACADEMY_CONTENT = {
  title: "Lire une matrice Performance / Risque",
  sections: [
    {
      title: "Pourquoi plus n'est pas toujours mieux",
      content: `La recherche de performance maximale ignore souvent les coûts physiologiques.
      
Un athlète en zone "Protéger" qui tente de "Construire" s'expose à :
• Accumulation de fatigue chronique
• Baisse de la capacité d'adaptation
• Risque de blessure accru

La progression durable passe par le respect des phases de récupération.`
    },
    {
      title: "Pourquoi protéger n'est pas régresser",
      content: `La zone "Protéger" n'est pas un échec — c'est une étape nécessaire.

Pendant cette phase :
• Le corps absorbe les adaptations précédentes
• Les systèmes énergétiques se reconstituent
• La capacité à encaisser la charge future augmente

Un athlète qui "protège" intelligemment progresse plus vite sur le long terme.`
    },
    {
      title: "Décider avec incertitude",
      content: `La matrice affiche des PLAGES, pas des certitudes.

Confiance élevée (>0.8) : données robustes, décision claire
Confiance moyenne (0.5-0.8) : prudence recommandée
Confiance faible (<0.5) : compléter les données avant de décider

Aucun algorithme ne remplace l'œil du coach et le ressenti de l'athlète.`
    }
  ]
};

export const MATRIX_STAFF_ANALYSIS_TEMPLATE = (result: PerformanceRiskMatrixResult): string => {
  const { performance, fatigue, injuryRisk, before, after, interpretation, improvementSummary } = result;
  
  return `## Équilibre Performance / Fatigue / Risque

### Position actuelle : ${before.position.zoneEmoji} ${before.position.zoneLabel}

**Potentiel de performance** : ${performance.range.min}–${performance.range.max} /100 (${performance.bandLabel})
Fiabilité : ${performance.confidence >= 0.8 ? "Élevée" : performance.confidence >= 0.6 ? "Modérée" : "Limitée"}

**Fatigue** : ${fatigue.value}% ${fatigue.trendEmoji} — ${fatigue.zoneLabel}
Contributeurs : ${fatigue.contributors.join(', ')}

**Risque blessure** :
• Vélo : ${INJURY_RISK_LEVELS[injuryRisk.bike.level].emoji} ${injuryRisk.bike.justification}
• CAP : ${INJURY_RISK_LEVELS[injuryRisk.run.level].emoji} ${injuryRisk.run.justification}

### Projection après ajustements
${interpretation}
${improvementSummary}

Position projetée : ${after.position.zoneEmoji} ${after.position.zoneLabel}

---
_${MATRIX_DISCLAIMER.split('\n')[0]}_`;
};
