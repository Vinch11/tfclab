/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCENARIO ENGINE TFCL™ V2 — Système 3-Scénarios Unifié
 * Two For Coaching Lab Method™
 * 
 * PRINCIPE SCIENTIFIQUE (Audit 2025):
 * TFCL ne prédit JAMAIS une valeur unique.
 * TFCL propose TOUJOURS 3 scénarios avec probabilités de succès explicites:
 * 
 * - CONSERVATEUR: Intensité -5%, probabilité de succès 95%
 * - OPTIMAL: Estimation centrale, probabilité de succès 80%
 * - AGRESSIF: Intensité +3%, probabilité de succès 60%
 * 
 * Ce système est unifié et utilisé par:
 * - VLamax V2 (plages de valeurs)
 * - TTE V2 (durabilité)
 * - Pacing Envelope (intensités)
 * - Race Simulation (temps et risques)
 * 
 * SOURCES:
 * - INSCYD public methodology
 * - Skiba W' model
 * - Mader & Heck metabolic modeling
 * - Jeukendrup nutrition research
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ScenarioLevel = 'conservative' | 'optimal' | 'aggressive';

export interface ScenarioDefinition {
  level: ScenarioLevel;
  label: string;
  shortLabel: string;
  emoji: string;
  intensityModifier: number;    // % modification vs optimal (e.g., -0.05 = -5%)
  successProbability: number;   // 0-1 (e.g., 0.95 = 95%)
  riskLevel: 'low' | 'medium' | 'high';
  color: string;                // Tailwind color token
  description: string;
  staffNote: string;
}

export interface ScenarioSet<T> {
  conservative: T;
  optimal: T;
  aggressive: T;
  recommended: ScenarioLevel;
  confidence: number;
}

export interface VLamaxScenario {
  value: number;
  range: [number, number];
  successProbability: number;
  label: string;
}

export interface TTEScenario {
  value: number;
  range: [number, number];
  wprime: number;              // W' en kJ
  successProbability: number;
  label: string;
}

export interface PacingScenario {
  intensityPct: number;
  intensityRange: [number, number];
  estimatedTimeMin: number;
  timeRange: [number, number];
  successProbability: number;
  glycogenRisk: 'low' | 'medium' | 'high' | 'critical';
  label: string;
}

export interface FatMaxScenario {
  centerPct: number;
  range: [number, number];
  crossoverZone: [number, number];  // Zone 50% lipides / 50% glucides
  successProbability: number;
  label: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES — DÉFINITIONS DES SCÉNARIOS
// ═══════════════════════════════════════════════════════════════════════════════

export const SCENARIO_DEFINITIONS: Record<ScenarioLevel, ScenarioDefinition> = {
  conservative: {
    level: 'conservative',
    label: 'Conservateur',
    shortLabel: 'CONS',
    emoji: '🛡️',
    intensityModifier: -0.05,     // -5% vs optimal
    successProbability: 0.95,     // 95%
    riskLevel: 'low',
    color: 'green',
    description: 'Priorité à la sécurité et au finish. Marge de manœuvre préservée.',
    staffNote: 'Scénario recommandé en cas de données incomplètes ou première course sur le format.',
  },
  optimal: {
    level: 'optimal',
    label: 'Optimal',
    shortLabel: 'OPT',
    emoji: '🎯',
    intensityModifier: 0,         // Estimation centrale
    successProbability: 0.80,     // 80%
    riskLevel: 'medium',
    color: 'blue',
    description: 'Équilibre risque/performance. Point de départ pour la décision.',
    staffNote: 'Scénario de référence basé sur le profil métabolique complet.',
  },
  aggressive: {
    level: 'aggressive',
    label: 'Agressif',
    shortLabel: 'AGR',
    emoji: '🔥',
    intensityModifier: 0.03,      // +3% vs optimal
    successProbability: 0.60,     // 60%
    riskLevel: 'high',
    color: 'red',
    description: 'Performance maximale, risque de défaillance élevé.',
    staffNote: 'Réservé aux athlètes expérimentés avec données haute confiance et conditions optimales.',
  },
};

export const SCENARIO_ORDER: ScenarioLevel[] = ['conservative', 'optimal', 'aggressive'];

// ═══════════════════════════════════════════════════════════════════════════════
// CRITICAL POWER (W') MODEL — Intégration Skiba
// ═══════════════════════════════════════════════════════════════════════════════

export interface CriticalPowerParams {
  ftp: number;           // Critical Power approximation (W)
  wprime: number;        // W' en kJ (anaerobic work capacity)
  efficiency: number;    // Mechanical efficiency (0.21-0.26)
}

/**
 * Estime W' (anaerobic work capacity) basé sur les données disponibles
 * 
 * Formule Skiba: W' = 15-25 kJ pour athlètes entraînés
 * Ajustement selon VLamax et Pmax
 * 
 * Sources:
 * - Skiba P.F. et al. (2012) – W' reconstitution
 * - Monod & Scherrer (1965) – Critical Power concept
 */
export function estimateWPrime(params: {
  ftp: number;
  pmax5s?: number | null;
  vlamaxValue?: number | null;
  weight?: number | null;
  tte_min?: number | null;
}): number {
  const { ftp, pmax5s, vlamaxValue, weight, tte_min } = params;
  
  // Base W' estimation (15-25 kJ range)
  let wprimeKJ = 20; // Default 20 kJ
  
  // Ajustement selon Pmax/FTP ratio
  if (pmax5s != null && ftp > 0) {
    const ratio = pmax5s / ftp;
    // Ratio élevé = plus de capacité anaérobie
    if (ratio > 2.2) wprimeKJ += 3;
    else if (ratio > 2.0) wprimeKJ += 1;
    else if (ratio < 1.7) wprimeKJ -= 2;
  }
  
  // Ajustement selon VLamax
  if (vlamaxValue != null) {
    // VLamax élevée = plus de capacité glycolytique
    if (vlamaxValue > 0.55) wprimeKJ += 2;
    else if (vlamaxValue > 0.45) wprimeKJ += 1;
    else if (vlamaxValue < 0.30) wprimeKJ -= 2;
  }
  
  // Ajustement selon poids (athlètes plus lourds = plus de W' absolu)
  if (weight != null) {
    const wprimePerKg = wprimeKJ / weight;
    // Normalisation: 0.25-0.35 kJ/kg est typique
    if (wprimePerKg < 0.20) wprimeKJ = weight * 0.22;
    else if (wprimePerKg > 0.40) wprimeKJ = weight * 0.35;
  }
  
  // Ajustement selon TTE (proxy indirect)
  if (tte_min != null) {
    // TTE élevé suggère meilleure gestion de W'
    if (tte_min > 55) wprimeKJ += 1;
    else if (tte_min < 40) wprimeKJ -= 1;
  }
  
  return Math.max(12, Math.min(30, wprimeKJ));
}

/**
 * Calcule le TTE théorique selon le modèle Critical Power
 * 
 * Formule: TTE = W' / (P - CP)
 * où P = puissance cible, CP = Critical Power (≈ FTP)
 * 
 * Sources:
 * - Jones A.M. & Vanhatalo A. (2017) – Critical Power: Applications
 * - Burnley M. & Jones A.M. (2018) – Power-duration relationship
 */
export function calculateTTEFromWPrime(params: {
  wprime: number;        // kJ
  targetPower: number;   // W
  criticalPower: number; // W (≈ FTP)
}): number {
  const { wprime, targetPower, criticalPower } = params;
  
  // Si P <= CP, théoriquement infini (mais on cap à 75 min)
  if (targetPower <= criticalPower) {
    return 75;
  }
  
  // TTE = W' / (P - CP)
  const wprimeJoules = wprime * 1000;
  const powerAboveCP = targetPower - criticalPower;
  const tteSeconds = wprimeJoules / powerAboveCP;
  const tteMinutes = tteSeconds / 60;
  
  return Math.max(5, Math.min(75, tteMinutes));
}

// ═══════════════════════════════════════════════════════════════════════════════
// CROSSOVER ZONE — Zone de transition lipides/glucides
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule la zone de crossover (50% lipides / 50% glucides)
 * 
 * La Crossover Zone se situe typiquement 8-12% au-dessus de FatMax
 * C'est la zone de transition où l'utilisation des glucides dépasse les lipides
 * 
 * Sources:
 * - Brooks G.A. & Mercier J. (1994) – Crossover concept
 * - Achten J. & Jeukendrup A.E. (2003) – FatMax determination
 */
export function calculateCrossoverZone(params: {
  fatmaxPct: number;      // % FTP
  vlamaxValue?: number | null;
  confidence: number;
}): [number, number] {
  const { fatmaxPct, vlamaxValue, confidence } = params;
  
  // Base: Crossover = FatMax + 8-12%
  let crossoverOffset = 10; // Default +10%
  
  // Ajustement selon VLamax
  if (vlamaxValue != null) {
    // VLamax élevée = crossover plus proche de FatMax
    if (vlamaxValue > 0.55) crossoverOffset = 8;
    else if (vlamaxValue > 0.45) crossoverOffset = 9;
    else if (vlamaxValue < 0.30) crossoverOffset = 12;
  }
  
  // Largeur de la zone selon confiance
  const zoneWidth = confidence >= 0.75 ? 3 : confidence >= 0.5 ? 5 : 7;
  
  const crossoverCenter = fatmaxPct + crossoverOffset;
  
  return [
    Math.round(crossoverCenter - zoneWidth / 2),
    Math.round(crossoverCenter + zoneWidth / 2)
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MECHANICAL EFFICIENCY — Rendement mécanique variable
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Estime le rendement mécanique (21-26%)
 * 
 * Le rendement varie selon:
 * - Intensité (diminue à haute intensité)
 * - Durée (diminue avec la fatigue)
 * - Cadence (optimal autour de 85-95 rpm)
 * 
 * Sources:
 * - Coyle E.F. (1992) – Cycling efficiency
 * - Moseley L. & Jeukendrup A.E. (2001) – Efficiency changes
 */
export function estimateMechanicalEfficiency(params: {
  intensityPct: number;    // % FTP
  durationMin: number;
  cadence?: number | null;
}): number {
  const { intensityPct, durationMin, cadence } = params;
  
  // Base efficiency: 23%
  let efficiency = 0.23;
  
  // Ajustement selon intensité
  if (intensityPct > 95) efficiency -= 0.015;
  else if (intensityPct > 85) efficiency -= 0.008;
  else if (intensityPct < 60) efficiency -= 0.005;
  
  // Ajustement selon durée (fatigue)
  if (durationMin > 180) efficiency -= 0.01;
  else if (durationMin > 120) efficiency -= 0.005;
  
  // Ajustement selon cadence
  if (cadence != null) {
    if (cadence < 75) efficiency -= 0.01;
    else if (cadence > 100) efficiency -= 0.008;
  }
  
  return Math.max(0.21, Math.min(0.26, efficiency));
}

// ═══════════════════════════════════════════════════════════════════════════════
// GÉNÉRATEURS DE SCÉNARIOS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Génère les 3 scénarios VLamax avec variance ±0.08 mmol/L/s
 */
export function generateVLamaxScenarios(params: {
  centralValue: number;
  confidence: number;
}): ScenarioSet<VLamaxScenario> {
  const { centralValue, confidence } = params;
  
  // Variance selon confiance (audit: ±0.08 mmol/L/s proposé)
  const variance = confidence >= 0.75 ? 0.05 : confidence >= 0.5 ? 0.08 : 0.12;
  
  const scenarios: ScenarioSet<VLamaxScenario> = {
    conservative: {
      value: Math.max(0.20, centralValue + variance * 0.5), // VLamax plus haute = plus conservateur pour endurance
      range: [centralValue, centralValue + variance],
      successProbability: SCENARIO_DEFINITIONS.conservative.successProbability,
      label: 'Hypothèse haute (conservateur pour endurance)',
    },
    optimal: {
      value: centralValue,
      range: [centralValue - variance * 0.5, centralValue + variance * 0.5],
      successProbability: SCENARIO_DEFINITIONS.optimal.successProbability,
      label: 'Estimation centrale',
    },
    aggressive: {
      value: Math.min(0.90, centralValue - variance * 0.5), // VLamax plus basse = plus agressif pour endurance
      range: [centralValue - variance, centralValue],
      successProbability: SCENARIO_DEFINITIONS.aggressive.successProbability,
      label: 'Hypothèse basse (optimiste pour endurance)',
    },
    recommended: confidence >= 0.7 ? 'optimal' : 'conservative',
    confidence,
  };
  
  return scenarios;
}

/**
 * Génère les 3 scénarios TTE avec modèle W'
 */
export function generateTTEScenarios(params: {
  centralValue: number;
  confidence: number;
  wprime?: number;
}): ScenarioSet<TTEScenario> {
  const { centralValue, confidence, wprime = 20 } = params;
  
  // Variance selon confiance
  const variance = confidence >= 0.75 ? 4 : confidence >= 0.5 ? 6 : 10;
  
  const scenarios: ScenarioSet<TTEScenario> = {
    conservative: {
      value: Math.max(25, centralValue - variance),
      range: [Math.max(25, centralValue - variance * 1.5), centralValue],
      wprime: wprime * 0.9, // W' plus faible
      successProbability: SCENARIO_DEFINITIONS.conservative.successProbability,
      label: 'TTE bas (conservateur)',
    },
    optimal: {
      value: centralValue,
      range: [centralValue - variance * 0.5, centralValue + variance * 0.5],
      wprime,
      successProbability: SCENARIO_DEFINITIONS.optimal.successProbability,
      label: 'TTE central',
    },
    aggressive: {
      value: Math.min(75, centralValue + variance),
      range: [centralValue, Math.min(75, centralValue + variance * 1.5)],
      wprime: wprime * 1.1, // W' plus élevé
      successProbability: SCENARIO_DEFINITIONS.aggressive.successProbability,
      label: 'TTE haut (optimiste)',
    },
    recommended: confidence >= 0.7 ? 'optimal' : 'conservative',
    confidence,
  };
  
  return scenarios;
}

/**
 * Génère les 3 scénarios Pacing avec temps et risques
 */
export function generatePacingScenarios(params: {
  centerIntensityPct: number;
  baseTimeMin: number;
  confidence: number;
  vlamaxValue?: number | null;
}): ScenarioSet<PacingScenario> {
  const { centerIntensityPct, baseTimeMin, confidence, vlamaxValue } = params;
  
  // Ajustements selon définitions
  const consModifier = SCENARIO_DEFINITIONS.conservative.intensityModifier;
  const agrModifier = SCENARIO_DEFINITIONS.aggressive.intensityModifier;
  
  // Variance temps selon confiance (audit: ±2-3% si haute confiance)
  const timeVariance = confidence >= 0.75 ? 0.025 : confidence >= 0.5 ? 0.05 : 0.08;
  
  // Risque glycogène selon VLamax
  const getGlycogenRisk = (intensity: number): 'low' | 'medium' | 'high' | 'critical' => {
    if (vlamaxValue != null && vlamaxValue > 0.50) {
      if (intensity > 85) return 'critical';
      if (intensity > 78) return 'high';
      if (intensity > 72) return 'medium';
    }
    if (intensity > 88) return 'critical';
    if (intensity > 82) return 'high';
    if (intensity > 75) return 'medium';
    return 'low';
  };
  
  const consIntensity = centerIntensityPct * (1 + consModifier);
  const agrIntensity = centerIntensityPct * (1 + agrModifier);
  
  // Temps inversement proportionnel à l'intensité (simplifié)
  const consTime = baseTimeMin * (1 - consModifier * 2); // Plus lent
  const agrTime = baseTimeMin * (1 - agrModifier * 2.5); // Plus rapide mais risqué
  
  const scenarios: ScenarioSet<PacingScenario> = {
    conservative: {
      intensityPct: Math.round(consIntensity),
      intensityRange: [Math.round(consIntensity - 2), Math.round(consIntensity + 2)],
      estimatedTimeMin: Math.round(consTime),
      timeRange: [
        Math.round(consTime * (1 - timeVariance)),
        Math.round(consTime * (1 + timeVariance))
      ],
      successProbability: SCENARIO_DEFINITIONS.conservative.successProbability,
      glycogenRisk: getGlycogenRisk(consIntensity),
      label: 'Conservateur — Finish quasi-garanti',
    },
    optimal: {
      intensityPct: Math.round(centerIntensityPct),
      intensityRange: [Math.round(centerIntensityPct - 3), Math.round(centerIntensityPct + 3)],
      estimatedTimeMin: Math.round(baseTimeMin),
      timeRange: [
        Math.round(baseTimeMin * (1 - timeVariance)),
        Math.round(baseTimeMin * (1 + timeVariance))
      ],
      successProbability: SCENARIO_DEFINITIONS.optimal.successProbability,
      glycogenRisk: getGlycogenRisk(centerIntensityPct),
      label: 'Optimal — Équilibre performance/sécurité',
    },
    aggressive: {
      intensityPct: Math.round(agrIntensity),
      intensityRange: [Math.round(agrIntensity - 2), Math.round(agrIntensity + 3)],
      estimatedTimeMin: Math.round(agrTime),
      timeRange: [
        Math.round(agrTime * (1 - timeVariance * 1.5)),
        Math.round(agrTime * (1 + timeVariance))
      ],
      successProbability: SCENARIO_DEFINITIONS.aggressive.successProbability,
      glycogenRisk: getGlycogenRisk(agrIntensity),
      label: 'Agressif — Performance max, risque élevé',
    },
    recommended: confidence >= 0.7 ? 'optimal' : 'conservative',
    confidence,
  };
  
  return scenarios;
}

/**
 * Génère les 3 scénarios FatMax avec Crossover Zone
 */
export function generateFatMaxScenarios(params: {
  centerPct: number;
  confidence: number;
  vlamaxValue?: number | null;
}): ScenarioSet<FatMaxScenario> {
  const { centerPct, confidence, vlamaxValue } = params;
  
  // Variance selon confiance
  const variance = confidence >= 0.75 ? 3 : confidence >= 0.5 ? 5 : 7;
  
  const crossover = calculateCrossoverZone({ fatmaxPct: centerPct, vlamaxValue, confidence });
  
  const scenarios: ScenarioSet<FatMaxScenario> = {
    conservative: {
      centerPct: Math.max(50, centerPct - variance),
      range: [Math.max(50, centerPct - variance * 1.5), centerPct],
      crossoverZone: [crossover[0] - variance, crossover[1] - variance],
      successProbability: SCENARIO_DEFINITIONS.conservative.successProbability,
      label: 'FatMax basse (marge lipidique réduite)',
    },
    optimal: {
      centerPct,
      range: [centerPct - variance * 0.5, centerPct + variance * 0.5],
      crossoverZone: crossover,
      successProbability: SCENARIO_DEFINITIONS.optimal.successProbability,
      label: 'FatMax centrale',
    },
    aggressive: {
      centerPct: Math.min(85, centerPct + variance),
      range: [centerPct, Math.min(85, centerPct + variance * 1.5)],
      crossoverZone: [crossover[0] + variance, crossover[1] + variance],
      successProbability: SCENARIO_DEFINITIONS.aggressive.successProbability,
      label: 'FatMax haute (optimiste)',
    },
    recommended: confidence >= 0.7 ? 'optimal' : 'conservative',
    confidence,
  };
  
  return scenarios;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS UI
// ═══════════════════════════════════════════════════════════════════════════════

export function getScenarioColor(level: ScenarioLevel): string {
  switch (level) {
    case 'conservative': return 'text-green-600 dark:text-green-400';
    case 'optimal': return 'text-blue-600 dark:text-blue-400';
    case 'aggressive': return 'text-red-600 dark:text-red-400';
  }
}

export function getScenarioBadgeClass(level: ScenarioLevel): string {
  switch (level) {
    case 'conservative': 
      return 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50';
    case 'optimal': 
      return 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/50';
    case 'aggressive': 
      return 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50';
  }
}

export function formatProbability(probability: number): string {
  return `${Math.round(probability * 100)}%`;
}

export function formatTimeRange(range: [number, number]): string {
  const formatTime = (min: number) => {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`;
  };
  return `${formatTime(range[0])} – ${formatTime(range[1])}`;
}
