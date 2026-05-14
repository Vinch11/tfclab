/**
 * Économie de Course V2 — Running Economy Index
 * 
 * Sources scientifiques :
 * - Barnes K.R. & Kilding A.E. (2015) – Running economy
 * - Saunders P.U. et al. (2004) – Economy determinants
 * - Moore I.S. (2016) – Biomechanics of RE
 * 
 * INDICATEUR V2 :
 * - Indice d'économie de course (faible / moyenne / bonne / excellente)
 * - Impact sur performance cible
 * - Impact sur risque blessure
 */

import { CONFIDENCE_LEVELS } from './scientificConfig';

// =============================================
// TYPES V2
// =============================================

export type EconomyLevelV2 = 'excellent' | 'good' | 'average' | 'weak' | 'very_weak';

export interface EstimatedO2Cost {
  value: number;          // ml/kg/km
  source: 'power' | 'acsm';  // Méthode utilisée
  sourceLabel: string;
  level: 'elite' | 'well_trained' | 'trained' | 'recreational' | 'beginner';
  levelLabel: string;
  levelEmoji: string;
  referenceRange: string; // ex: "180-200 ml/kg/km (élite)"
}

export interface RunningEconomyV2 {
  // Indice principal (0-100)
  index: number;
  
  // Niveau catégorisé
  level: EconomyLevelV2;
  levelLabel: string;
  levelEmoji: string;
  
  // Confiance
  confidence: number;
  
  // Allure de référence
  paceAt75pct: number | null;  // min/km à 75% FCmax
  
  // Dérive cardiaque
  hrDrift: number | null;
  hrDriftLabel: string;
  
  // Impact performance
  performanceImpact: {
    label: string;
    description: string;
    modifier: number; // -20 à +10 sur Potentiel Physiologique
  };
  
  // Impact risque blessure
  injuryRiskImpact: {
    label: string;
    description: string;
    modifier: number; // -10 à +20 sur risque
  };
  
  // Rapport coût / vitesse
  energyCostRatio: number | null;  // W/(km/h)
  
  // Coût O2 estimé (ml/kg/km) — métrique physiologique directe
  estimatedO2Cost: EstimatedO2Cost | null;
  
  // Leviers d'optimisation
  optimizationLevers: string[];
  
  // Avertissements
  warnings: string[];
  
  // Applicable uniquement en CAP
  isApplicable: boolean;
}

export interface RunningEconomyV2Input {
  // Données FC
  fcMax?: number | null;
  fcAt75pct?: number | null;       // FC réelle à 75% effort
  fcEndurance?: number | null;      // FC moyenne endurance
  
  // Données allure
  paceEndurance?: number | null;    // min/km à allure endurance
  paceThreshold?: number | null;    // min/km au seuil
  
  // Données puissance (Stryd/Garmin)
  powerEndurance?: number | null;   // W à allure endurance
  powerThreshold?: number | null;   // W au seuil
  
  // Dérive
  hrDriftPct?: number | null;       // % dérive mesurée
  
  // TTE pour estimation dérive
  tteMin?: number | null;
  
  // Poids corporel (pour estimation O2 cost)
  weightKg?: number | null;
  
  // Contexte
  objectif?: string;
  sport?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // INTÉGRATION C — Fallback RAW depuis chronos course (raceTimeEstimator)
  // Utilisé UNIQUEMENT en l'absence de données effectives (FC/puissance/drift).
  // CE en mlO₂/kg/km, durabilityIndex semi→marathon (1.0 = neutre).
  // ─────────────────────────────────────────────────────────────────────────
  raceChrono?: {
    CE_mlO2_kg_km?: number | null;
    durabilityIndex?: number | null;
    confidence?: number | null;     // 0..1, plafonné côté estimator à 0.85
  } | null;
}

// =============================================
// CONSTANTES
// =============================================

const CAP_OBJECTIVES = [
  "Marathon", "Semi", "Course", "Trail", "TrailCourt", "TrailLong",
  "TrailMountain", "TrailUltra", "IM", "Ironman", "703", "70.3", "Half"
];

const DRIFT_THRESHOLDS = {
  excellent: 4,
  good: 6,
  average: 10,
  weak: 15,
};

// =============================================
// HELPERS
// =============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function isRunningObjective(objectif: string): boolean {
  return CAP_OBJECTIVES.some(o => objectif.toLowerCase().includes(o.toLowerCase()));
}

function estimateDriftFromTTE(tteMin: number): number {
  if (tteMin >= 55) return 3;
  if (tteMin >= 50) return 5;
  if (tteMin >= 45) return 7;
  if (tteMin >= 40) return 10;
  if (tteMin >= 35) return 13;
  return 16;
}

function getLevelFromIndex(index: number): EconomyLevelV2 {
  if (index >= 85) return 'excellent';
  if (index >= 70) return 'good';
  if (index >= 50) return 'average';
  if (index >= 30) return 'weak';
  return 'very_weak';
}

function getLevelLabel(level: EconomyLevelV2): string {
  switch (level) {
    case 'excellent': return 'Excellente';
    case 'good': return 'Bonne';
    case 'average': return 'Moyenne';
    case 'weak': return 'Faible';
    case 'very_weak': return 'Très faible';
  }
}

function getLevelEmoji(level: EconomyLevelV2): string {
  switch (level) {
    case 'excellent': return '🟢';
    case 'good': return '🟢';
    case 'average': return '🟡';
    case 'weak': return '🟠';
    case 'very_weak': return '🔴';
  }
}

function getDriftLabel(drift: number): string {
  if (drift <= DRIFT_THRESHOLDS.excellent) return `${drift}% (stable)`;
  if (drift <= DRIFT_THRESHOLDS.good) return `${drift}% (acceptable)`;
  if (drift <= DRIFT_THRESHOLDS.average) return `${drift}% (modérée)`;
  if (drift <= DRIFT_THRESHOLDS.weak) return `${drift}% (élevée)`;
  return `${drift}% (critique)`;
}

// =============================================
// ESTIMATION COÛT O2 (ml/kg/km)
// =============================================

/**
 * Estime le coût d'O2 en ml/kg/km à partir de la puissance de course et du poids.
 * 
 * Méthode power-based (Kipp et al. 2019, Stryd white paper) :
 *   - Efficience mécanique running ~25% → VO2 (ml/min) ≈ Power(W) × 12
 *   - O2 cost = VO2 × pace / weight
 * 
 * Fallback ACSM (American College of Sports Medicine) :
 *   - VO2 (ml/kg/min) = 0.2 × speed(m/min) + 3.5
 *   - O2 cost = VO2 × (1000 / speed_m_min)
 * 
 * Références :
 *   - Barnes & Kilding (2015) : 180-200 ml/kg/km élite
 *   - Saunders et al. (2004) : 200-220 well-trained
 *   - Moore (2016) : >240 recreational
 */
function estimateO2Cost(
  powerW: number | null | undefined,
  paceMinPerKm: number | null | undefined,
  weightKg: number | null | undefined
): EstimatedO2Cost | null {
  
  // Méthode 1 : Power-based (préférée, plus précise)
  if (powerW && paceMinPerKm && weightKg && weightKg > 0) {
    // Efficience mécanique ~25% → facteur métabolique 12 ml O2/min par W
    const vo2MlMin = powerW * 12;
    const o2CostMlKgKm = (vo2MlMin * paceMinPerKm) / weightKg;
    
    return {
      value: Number(o2CostMlKgKm.toFixed(1)),
      source: 'power',
      sourceLabel: 'Puissance + Poids (Kipp 2019)',
      ...getO2CostLevel(o2CostMlKgKm),
    };
  }
  
  // Méthode 2 : ACSM equation (fallback depuis allure seule)
  if (paceMinPerKm && weightKg && weightKg > 0) {
    const speedMMin = 1000 / paceMinPerKm; // m/min
    const vo2MlKgMin = 0.2 * speedMMin + 3.5; // ACSM flat-ground
    const o2CostMlKgKm = vo2MlKgMin * paceMinPerKm;
    
    return {
      value: Number(o2CostMlKgKm.toFixed(1)),
      source: 'acsm',
      sourceLabel: 'Équation ACSM (allure seule)',
      ...getO2CostLevel(o2CostMlKgKm),
    };
  }
  
  return null;
}

function getO2CostLevel(o2Cost: number): {
  level: EstimatedO2Cost['level'];
  levelLabel: string;
  levelEmoji: string;
  referenceRange: string;
} {
  if (o2Cost <= 195) {
    return { level: 'elite', levelLabel: 'Élite', levelEmoji: '🟢', referenceRange: '180-195 ml/kg/km (élite)' };
  }
  if (o2Cost <= 210) {
    return { level: 'well_trained', levelLabel: 'Très bien entraîné', levelEmoji: '🟢', referenceRange: '195-210 ml/kg/km (très entraîné)' };
  }
  if (o2Cost <= 230) {
    return { level: 'trained', levelLabel: 'Entraîné', levelEmoji: '🟡', referenceRange: '210-230 ml/kg/km (entraîné)' };
  }
  if (o2Cost <= 260) {
    return { level: 'recreational', levelLabel: 'Récréatif', levelEmoji: '🟠', referenceRange: '230-260 ml/kg/km (récréatif)' };
  }
  return { level: 'beginner', levelLabel: 'Débutant', levelEmoji: '🔴', referenceRange: '>260 ml/kg/km (débutant)' };
}

// =============================================
// FONCTION PRINCIPALE V2
// =============================================

export function computeRunningEconomyV2(input: RunningEconomyV2Input): RunningEconomyV2 {
  const warnings: string[] = [];
  const objectif = input.objectif || "";
  
  // Vérifier applicabilité
  const isApplicable = isRunningObjective(objectif) || input.sport === 'cap' || input.sport === 'course';
  
  if (!isApplicable) {
    return {
      index: 0,
      level: 'average',
      levelLabel: 'Non applicable',
      levelEmoji: '⚪',
      confidence: 0,
      paceAt75pct: null,
      hrDrift: null,
      hrDriftLabel: '—',
      performanceImpact: { label: '—', description: 'Non applicable en vélo', modifier: 0 },
      injuryRiskImpact: { label: '—', description: 'Non applicable en vélo', modifier: 0 },
      energyCostRatio: null,
      estimatedO2Cost: null,
      optimizationLevers: [],
      warnings: [],
      isApplicable: false
    };
  }
  
  let economyScore = 50; // Base neutre
  let confidence = 0.4;
  let factorsCount = 0;
  
  // 1) Analyse FC relative
  if (input.fcMax && input.fcEndurance) {
    factorsCount++;
    const fcPct = (input.fcEndurance / input.fcMax) * 100;
    
    // FC endurance idéale : 65-75% de FCmax
    if (fcPct <= 68) {
      economyScore += 20; // Très économe
    } else if (fcPct <= 72) {
      economyScore += 12;
    } else if (fcPct <= 76) {
      economyScore += 5;
    } else if (fcPct <= 80) {
      economyScore -= 5;
    } else {
      economyScore -= 15; // FC élevée
      warnings.push('FC endurance élevée — possible fatigue ou mauvaise économie');
    }
    
    confidence += 0.15;
  }
  
  // 2) Analyse puissance (si disponible)
  if (input.powerEndurance && input.paceEndurance) {
    factorsCount++;
    
    // Calculer coût énergétique approximatif (W / (km/h))
    const speedKmh = 60 / input.paceEndurance;
    const ratio = input.powerEndurance / speedKmh;
    
    // Ratio idéal environ 4-5 W/(km/h) pour coureur économe
    if (ratio <= 4.5) {
      economyScore += 20;
    } else if (ratio <= 5.0) {
      economyScore += 10;
    } else if (ratio <= 5.5) {
      economyScore += 0;
    } else if (ratio <= 6.0) {
      economyScore -= 10;
    } else {
      economyScore -= 20;
      warnings.push('Ratio puissance/vitesse élevé — économie sous-optimale');
    }
    
    confidence += 0.15;
  }
  
  // 3) Dérive cardiaque
  let drift = input.hrDriftPct;
  if (drift === null || drift === undefined) {
    if (input.tteMin) {
      drift = estimateDriftFromTTE(input.tteMin);
    }
  }
  
  if (drift !== null && drift !== undefined) {
    factorsCount++;
    
    if (drift <= DRIFT_THRESHOLDS.excellent) {
      economyScore += 15;
    } else if (drift <= DRIFT_THRESHOLDS.good) {
      economyScore += 8;
    } else if (drift <= DRIFT_THRESHOLDS.average) {
      economyScore -= 5;
    } else if (drift <= DRIFT_THRESHOLDS.weak) {
      economyScore -= 15;
    } else {
      economyScore -= 25;
      warnings.push('Dérive cardiaque critique — durabilité compromise');
    }
    
    confidence += 0.15;
  }
  
  // 4) FALLBACK RAW — chronos course (Riegel + Daniels VDOT + ACSM CE)
  //    Activé UNIQUEMENT si aucun facteur effectif (FC, power, drift) disponible
  //    OU si la durabilité observée apporte une info indépendante.
  //    Bandes CE référencées (Barnes & Kilding 2015, ml O₂/kg/km) :
  //      ≤195 = élite, 196-205 = bien entraîné, 206-215 = entraîné,
  //      216-225 = récréatif, >225 = débutant.
  const ceChrono = input.raceChrono?.CE_mlO2_kg_km;
  const durIdx = input.raceChrono?.durabilityIndex;
  const chronoConf = input.raceChrono?.confidence ?? 0.55;
  if (ceChrono != null && ceChrono > 0 && factorsCount === 0) {
    factorsCount++;
    if (ceChrono <= 195)      economyScore += 18;
    else if (ceChrono <= 205) economyScore += 10;
    else if (ceChrono <= 215) economyScore += 0;
    else if (ceChrono <= 225) economyScore -= 10;
    else                       economyScore -= 18;
    confidence += Math.min(0.20, chronoConf * 0.25);
    warnings.push(`Économie estimée Raw depuis chronos course (CE ≈ ${ceChrono.toFixed(0)} mlO₂/kg/km).`);
  }
  // Pénalité durabilité observée — toujours appliquée si dispo (info indépendante).
  if (durIdx != null) {
    if (durIdx > 1.08) economyScore -= 8;
    else if (durIdx > 1.04) economyScore -= 4;
    else if (durIdx <= 1.00) economyScore += 3;
  }

  // Finaliser score
  economyScore = clamp(economyScore, 0, 100);
  confidence = clamp(confidence, 0, 0.85);
  
  if (factorsCount === 0) {
    economyScore = 50;
    confidence = 0.3;
    warnings.push('Données insuffisantes — économie estimée par défaut');
  }
  
  const level = getLevelFromIndex(economyScore);
  
  // Impact performance
  let performanceModifier = 0;
  let performanceLabel = '';
  let performanceDesc = '';
  
  switch (level) {
    case 'excellent':
      performanceModifier = 10;
      performanceLabel = '💎 Atout majeur';
      performanceDesc = 'Économie = avantage compétitif. Limitation ailleurs (VO2, VLamax).';
      break;
    case 'good':
      performanceModifier = 5;
      performanceLabel = '✅ Favorable';
      performanceDesc = 'Économie correcte. Des gains marginaux possibles.';
      break;
    case 'average':
      performanceModifier = 0;
      performanceLabel = '➖ Neutre';
      performanceDesc = 'Économie dans la norme. Potentiel d\'amélioration.';
      break;
    case 'weak':
      performanceModifier = -10;
      performanceLabel = '⚠️ Limitation';
      performanceDesc = 'Économie limite la performance plus que le moteur.';
      break;
    case 'very_weak':
      performanceModifier = -20;
      performanceLabel = '🔴 Facteur limitant';
      performanceDesc = 'Priorité technique avant intensité. Gain majeur possible.';
      break;
  }
  
  // Impact risque blessure
  let injuryModifier = 0;
  let injuryLabel = '';
  let injuryDesc = '';
  
  switch (level) {
    case 'excellent':
    case 'good':
      injuryModifier = -5;
      injuryLabel = '✅ Protecteur';
      injuryDesc = 'Foulée efficace = moins de contraintes mécaniques.';
      break;
    case 'average':
      injuryModifier = 0;
      injuryLabel = '➖ Neutre';
      injuryDesc = 'Risque mécanique standard.';
      break;
    case 'weak':
      injuryModifier = 10;
      injuryLabel = '⚠️ Aggravant';
      injuryDesc = 'Surcoût mécanique = risque accru sous charge.';
      break;
    case 'very_weak':
      injuryModifier = 20;
      injuryLabel = '🔴 Risque élevé';
      injuryDesc = 'Contraintes mécaniques excessives. Limiter volume CAP.';
      break;
  }
  
  // Leviers d'optimisation
  const optimizationLevers: string[] = [];
  if (level === 'weak' || level === 'very_weak') {
    optimizationLevers.push('Travail technique foulée (cadence 170-180 ppm)');
    optimizationLevers.push('Renforcement musculaire (mollets, gainage)');
    optimizationLevers.push('Séances régularité d\'allure');
    optimizationLevers.push('Optimisation chaussage');
  }
  if (drift && drift > DRIFT_THRESHOLDS.average) {
    optimizationLevers.push('Endurance fondamentale prolongée');
    optimizationLevers.push('Amélioration hydratation/thermorégulation');
  }
  if (level === 'average') {
    optimizationLevers.push('Drills techniques réguliers');
    optimizationLevers.push('Travail de côtes courtes');
  }
  
  // Calcul coût énergétique
  let energyCostRatio: number | null = null;
  if (input.powerEndurance && input.paceEndurance) {
    const speedKmh = 60 / input.paceEndurance;
    energyCostRatio = Number((input.powerEndurance / speedKmh).toFixed(2));
  }
  
  // Estimation coût O2 (ml/kg/km)
  const estimatedO2Cost = estimateO2Cost(
    input.powerEndurance,
    input.paceEndurance,
    input.weightKg
  );
  
  if (estimatedO2Cost) {
    // Ajuster le score d'économie si on a le coût O2 réel
    const o2Bonus = estimatedO2Cost.value <= 195 ? 10 
      : estimatedO2Cost.value <= 210 ? 5 
      : estimatedO2Cost.value <= 230 ? 0 
      : estimatedO2Cost.value <= 260 ? -5 
      : -10;
    economyScore = clamp(economyScore + o2Bonus, 0, 100);
    confidence = clamp(confidence + 0.1, 0, 0.95);
  }
  
  return {
    index: economyScore,
    level: getLevelFromIndex(economyScore),
    levelLabel: getLevelLabel(getLevelFromIndex(economyScore)),
    levelEmoji: getLevelEmoji(getLevelFromIndex(economyScore)),
    confidence,
    paceAt75pct: input.paceEndurance || null,
    hrDrift: drift || null,
    hrDriftLabel: drift ? getDriftLabel(drift) : '—',
    performanceImpact: {
      label: performanceLabel,
      description: performanceDesc,
      modifier: performanceModifier
    },
    injuryRiskImpact: {
      label: injuryLabel,
      description: injuryDesc,
      modifier: injuryModifier
    },
    energyCostRatio,
    estimatedO2Cost,
    optimizationLevers,
    warnings,
    isApplicable: true
  };
}

// =============================================
// HELPERS UI
// =============================================

export function getEconomyLevelColor(level: EconomyLevelV2): string {
  switch (level) {
    case 'excellent':
    case 'good':
      return 'text-green-600 dark:text-green-400';
    case 'average':
      return 'text-amber-600 dark:text-amber-400';
    case 'weak':
      return 'text-orange-600 dark:text-orange-400';
    case 'very_weak':
      return 'text-red-600 dark:text-red-400';
  }
}

export function getEconomyBadgeClass(level: EconomyLevelV2): string {
  switch (level) {
    case 'excellent':
    case 'good':
      return 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50';
    case 'average':
      return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50';
    case 'weak':
      return 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/50';
    case 'very_weak':
      return 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50';
  }
}
