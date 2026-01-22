/**
 * Decision Reliability Engine™ (DRE)
 * 
 * Moteur central de fiabilité décisionnelle pour Two For Coaching Lab
 * 
 * PHILOSOPHIE OFFICIELLE TFCL:
 * "TFCL ne cherche pas la précision absolue inaccessible sans laboratoire,
 * mais la meilleure décision possible compte tenu des données disponibles,
 * avec transparence sur l'incertitude."
 * 
 * CONTRAINTE ABSOLUE:
 * - Ne jamais modifier silencieusement une valeur physiologique
 * - Toujours séparer: valeur estimée / confiance / décision
 * - Ne jamais masquer l'incertitude
 */

// =====================================================
// TYPES & INTERFACES
// =====================================================

export type DecisionLevel = 'robust' | 'prudent' | 'insufficient';
export type SleepQuality = 'bon' | 'moyen' | 'mauvais';
export type NutritionPreTest = 'optimale' | 'insuffisante' | 'a_jeun';
export type EnvironmentalConditions = 'ok' | 'non_standard';
export type CoachValidationStatus = 'pending' | 'validated' | 'adjusted' | 'rejected';

export interface ProtocolQualityInput {
  sleepQuality: SleepQuality;
  nutritionPreTest: NutritionPreTest;
  perceivedFatigue: number; // 1-10
  sensorsCalibrated: boolean;
  environmentalConditions: EnvironmentalConditions;
}

export interface ProtocolQualityResult {
  score: number; // 0.5 - 1.0
  breakdown: {
    sleep: number;
    nutrition: number;
    fatigue: number;
    sensors: number;
    environment: number;
  };
  flags: string[];
}

export interface VLamaxIndex {
  name: string;
  value: number;
  confidence: number;
  formula: string;
}

export interface MultiIndexVLamaxResult {
  indices: VLamaxIndex[];
  median: number;
  rangeLow: number; // P25
  rangeHigh: number; // P75
  dispersion: number; // écart-type
  confidence: number;
  flags: string[];
}

export interface DurabilityValidationInput {
  z2DurationMin: number;
  hrDriftPct: number;
  cadenceStability: number; // 0-1
  rpeFinal: number; // 1-10
}

export interface DurabilityResult {
  consistencyScore: number; // 0-1
  interpretation: string;
  flags: string[];
}

export interface ConsistencyFlag {
  flag: string;
  severity: 'info' | 'warning' | 'critical';
  hypothesis: string;
  affectedMetrics: string[];
}

export interface PhysioConsistencyResult {
  score: number; // 0-1 (réduit si incohérences)
  incoherenceDetected: boolean;
  flags: ConsistencyFlag[];
}

export interface EconomyInput {
  cadencePreferred: number;
  hrAtCadence: number;
  paceStability: number; // variance
  powerStability: number; // variance
  hrDriftAtSteadyState: number;
}

export interface EconomyResult {
  score: number; // 0-1
  cadenceHrEfficiency: number;
  paceHrDriftRatio: number;
  powerHrStability: number;
  flags: string[];
}

export interface Scenario {
  type: 'conservative' | 'optimal' | 'aggressive';
  label: string;
  objective: string;
  expectedBenefit: string;
  risks: {
    fatigue: 'low' | 'medium' | 'high';
    injury: 'low' | 'medium' | 'high';
    glycogenDepletion: 'low' | 'medium' | 'high';
  };
  recommendation: string;
}

export interface DecisionReliabilityResult {
  // Score global
  decisionConfidenceScore: number; // 0-100
  decisionLevel: DecisionLevel;
  
  // Composantes
  protocolQuality: ProtocolQualityResult;
  multiIndexVlamax: MultiIndexVLamaxResult | null;
  durability: DurabilityResult | null;
  physioConsistency: PhysioConsistencyResult;
  economy: EconomyResult | null;
  
  // Référence TFCL
  isReferenceWeek: boolean;
  referenceWeekBoost: number;
  
  // Scénarios
  scenarios: Scenario[];
  
  // Messages
  mainMessage: string;
  recommendations: string[];
  warnings: string[];
  
  // Timestamp
  calculatedAt: string;
  version: string;
}

// =====================================================
// MODULE 2: PROTOCOL QUALITY SCORE
// =====================================================

export function computeProtocolQuality(input: ProtocolQualityInput): ProtocolQualityResult {
  const flags: string[] = [];
  
  // Sleep: bon=1.0, moyen=0.85, mauvais=0.7
  const sleepScore = input.sleepQuality === 'bon' ? 1.0 
    : input.sleepQuality === 'moyen' ? 0.85 
    : 0.7;
  if (input.sleepQuality === 'mauvais') {
    flags.push('Sommeil insuffisant - résultats potentiellement affectés');
  }
  
  // Nutrition: optimale=1.0, insuffisante=0.8, a_jeun=0.9 (pour FatMax c'est OK)
  const nutritionScore = input.nutritionPreTest === 'optimale' ? 1.0
    : input.nutritionPreTest === 'a_jeun' ? 0.9
    : 0.8;
  if (input.nutritionPreTest === 'insuffisante') {
    flags.push('Nutrition sous-optimale - glycogène potentiellement bas');
  }
  
  // Fatigue: 1-3=1.0, 4-6=0.9, 7-8=0.75, 9-10=0.6
  let fatigueScore = 1.0;
  if (input.perceivedFatigue <= 3) fatigueScore = 1.0;
  else if (input.perceivedFatigue <= 6) fatigueScore = 0.9;
  else if (input.perceivedFatigue <= 8) fatigueScore = 0.75;
  else fatigueScore = 0.6;
  
  if (input.perceivedFatigue >= 7) {
    flags.push(`Fatigue perçue élevée (${input.perceivedFatigue}/10) - test à reconsidérer`);
  }
  
  // Sensors: calibré=1.0, non=0.7
  const sensorsScore = input.sensorsCalibrated ? 1.0 : 0.7;
  if (!input.sensorsCalibrated) {
    flags.push('Capteurs non calibrés - précision des données incertaine');
  }
  
  // Environment: ok=1.0, non_standard=0.85
  const environmentScore = input.environmentalConditions === 'ok' ? 1.0 : 0.85;
  if (input.environmentalConditions === 'non_standard') {
    flags.push('Conditions non standard - comparer avec prudence');
  }
  
  // Score global (moyenne pondérée)
  // Fatigue et sensors plus importants
  const weights = { sleep: 0.15, nutrition: 0.15, fatigue: 0.25, sensors: 0.25, environment: 0.20 };
  const rawScore = (
    sleepScore * weights.sleep +
    nutritionScore * weights.nutrition +
    fatigueScore * weights.fatigue +
    sensorsScore * weights.sensors +
    environmentScore * weights.environment
  );
  
  // Clamp entre 0.5 et 1.0
  const score = Math.max(0.5, Math.min(1.0, rawScore));
  
  return {
    score,
    breakdown: {
      sleep: sleepScore,
      nutrition: nutritionScore,
      fatigue: fatigueScore,
      sensors: sensorsScore,
      environment: environmentScore
    },
    flags
  };
}

// =====================================================
// MODULE 3: MULTI-INDEX VLAMAX
// =====================================================

export interface VLamaxMultiIndexInput {
  ftp: number;
  p30s?: number;
  p1min?: number;
  map5min?: number;
  tteMin?: number;
  pmax5s?: number;
  weightKg?: number;
}

export function computeMultiIndexVlamax(input: VLamaxMultiIndexInput): MultiIndexVLamaxResult {
  const indices: VLamaxIndex[] = [];
  const flags: string[] = [];
  
  const { ftp, p30s, p1min, map5min, tteMin, pmax5s } = input;
  
  // Index 1: P30s / FTP ratio
  if (p30s && ftp > 0) {
    const ratio = p30s / ftp;
    // ratio 2.0-2.2 = VLamax 0.25-0.35 (endurant)
    // ratio 2.3-2.6 = VLamax 0.35-0.50 (équilibré)
    // ratio 2.7-3.2 = VLamax 0.50-0.70 (explosif)
    let vlamax = 0.15 + (ratio - 1.8) * 0.35;
    vlamax = Math.max(0.20, Math.min(0.95, vlamax));
    indices.push({
      name: 'P30s/FTP',
      value: vlamax,
      confidence: 0.80,
      formula: `VLamax = 0.15 + (${ratio.toFixed(2)} - 1.8) × 0.35`
    });
  }
  
  // Index 2: P1min / FTP ratio
  if (p1min && ftp > 0) {
    const ratio = p1min / ftp;
    // ratio 1.4-1.6 = VLamax basse, 1.7-1.9 = moyenne, >2.0 = haute
    let vlamax = 0.20 + (ratio - 1.4) * 0.50;
    vlamax = Math.max(0.20, Math.min(0.95, vlamax));
    indices.push({
      name: 'P1min/FTP',
      value: vlamax,
      confidence: 0.75,
      formula: `VLamax = 0.20 + (${ratio.toFixed(2)} - 1.4) × 0.50`
    });
  }
  
  // Index 3: FTP / MAP ratio (inverse: plus le ratio est bas, plus VLamax est haute)
  if (map5min && ftp > 0) {
    const ratio = ftp / map5min;
    // ratio >0.85 = VLamax basse (endurant), <0.75 = VLamax haute
    let vlamax = 0.90 - (ratio - 0.70) * 2.0;
    vlamax = Math.max(0.20, Math.min(0.95, vlamax));
    indices.push({
      name: 'FTP/MAP',
      value: vlamax,
      confidence: 0.70,
      formula: `VLamax = 0.90 - (${ratio.toFixed(2)} - 0.70) × 2.0`
    });
  }
  
  // Index 4: TTE modulation (TTE long = VLamax basse)
  if (tteMin) {
    // TTE 30min = VLamax ~0.55, TTE 60min = VLamax ~0.35, TTE 90min = VLamax ~0.25
    let vlamax = 0.70 - (tteMin - 30) * 0.007;
    vlamax = Math.max(0.20, Math.min(0.70, vlamax));
    indices.push({
      name: 'TTE-modulé',
      value: vlamax,
      confidence: 0.65,
      formula: `VLamax = 0.70 - (${tteMin} - 30) × 0.007`
    });
  }
  
  // Index 5: Pmax5s / FTP (sprinteur)
  if (pmax5s && ftp > 0) {
    const ratio = pmax5s / ftp;
    let vlamax = 0.10 + (ratio - 2.0) * 0.30;
    vlamax = Math.max(0.20, Math.min(0.95, vlamax));
    indices.push({
      name: 'Pmax5s/FTP',
      value: vlamax,
      confidence: 0.75,
      formula: `VLamax = 0.10 + (${ratio.toFixed(2)} - 2.0) × 0.30`
    });
  }
  
  if (indices.length < 2) {
    flags.push('Moins de 2 indices disponibles - confiance réduite');
    return {
      indices,
      median: indices.length > 0 ? indices[0].value : 0.45,
      rangeLow: indices.length > 0 ? indices[0].value * 0.85 : 0.35,
      rangeHigh: indices.length > 0 ? indices[0].value * 1.15 : 0.55,
      dispersion: 0,
      confidence: 0.50,
      flags
    };
  }
  
  // Calcul statistiques
  const values = indices.map(i => i.value).sort((a, b) => a - b);
  const median = values.length % 2 === 0
    ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
    : values[Math.floor(values.length / 2)];
  
  // P25 et P75
  const p25Index = Math.floor(values.length * 0.25);
  const p75Index = Math.floor(values.length * 0.75);
  const rangeLow = values[p25Index] || values[0];
  const rangeHigh = values[p75Index] || values[values.length - 1];
  
  // Dispersion (écart-type)
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const dispersion = Math.sqrt(variance);
  
  // Confiance inversement proportionnelle à la dispersion
  // dispersion < 0.05 = confiance haute, > 0.15 = confiance basse
  let confidence = 1.0 - (dispersion / 0.20);
  confidence = Math.max(0.50, Math.min(0.95, confidence));
  
  if (dispersion > 0.10) {
    flags.push(`Dispersion élevée (σ=${dispersion.toFixed(3)}) - indices divergents`);
  }
  
  if (dispersion > 0.15) {
    flags.push('ATTENTION: Grande divergence entre indices - revérifier les données');
  }
  
  return {
    indices,
    median,
    rangeLow,
    rangeHigh,
    dispersion,
    confidence,
    flags
  };
}

// =====================================================
// MODULE 4: DURABILITY VALIDATION
// =====================================================

export function computeDurabilityValidation(input: DurabilityValidationInput): DurabilityResult {
  const flags: string[] = [];
  
  // Score basé sur:
  // - Durée Z2 suffisante (>90min = bon)
  // - Dérive FC basse (<5% = excellent)
  // - Cadence stable (variance faible)
  // - RPE final modéré (4-6 = optimal pour Z2)
  
  // Durée: 60min=0.6, 90min=0.8, 120min=1.0
  const durationScore = Math.min(1.0, input.z2DurationMin / 120);
  if (input.z2DurationMin < 60) {
    flags.push('Sortie Z2 trop courte pour validation durabilité (<60min)');
  }
  
  // Dérive FC: <3%=1.0, 5%=0.85, 10%=0.6, >15%=0.4
  let hrDriftScore = 1.0;
  if (input.hrDriftPct <= 3) hrDriftScore = 1.0;
  else if (input.hrDriftPct <= 5) hrDriftScore = 0.85;
  else if (input.hrDriftPct <= 10) hrDriftScore = 0.6;
  else hrDriftScore = 0.4;
  
  if (input.hrDriftPct > 10) {
    flags.push(`Dérive FC importante (${input.hrDriftPct.toFixed(1)}%) - durabilité à travailler`);
  }
  
  // Cadence stability: déjà normalisée 0-1
  const cadenceScore = input.cadenceStability;
  if (input.cadenceStability < 0.7) {
    flags.push('Cadence instable - technique ou fatigue');
  }
  
  // RPE: 4-6=1.0, 3 ou 7=0.8, 2 ou 8=0.6, 1 ou 9-10=0.4
  let rpeScore = 1.0;
  if (input.rpeFinal >= 4 && input.rpeFinal <= 6) rpeScore = 1.0;
  else if (input.rpeFinal === 3 || input.rpeFinal === 7) rpeScore = 0.8;
  else if (input.rpeFinal === 2 || input.rpeFinal === 8) rpeScore = 0.6;
  else rpeScore = 0.4;
  
  if (input.rpeFinal >= 8) {
    flags.push('RPE élevé sur Z2 - vérifier allure ou fatigue de fond');
  }
  
  // Score global
  const consistencyScore = (
    durationScore * 0.20 +
    hrDriftScore * 0.40 +
    cadenceScore * 0.20 +
    rpeScore * 0.20
  );
  
  // Interprétation
  let interpretation: string;
  if (consistencyScore >= 0.85) {
    interpretation = 'Excellente durabilité - profil Ironman validé';
  } else if (consistencyScore >= 0.70) {
    interpretation = 'Bonne durabilité - base solide pour longue distance';
  } else if (consistencyScore >= 0.55) {
    interpretation = 'Durabilité moyenne - travail Z2 long à poursuivre';
  } else {
    interpretation = 'Durabilité à développer - priorité sur volume Z2';
  }
  
  return {
    consistencyScore,
    interpretation,
    flags
  };
}

// =====================================================
// MODULE 5: PHYSIO CONSISTENCY CHECK
// =====================================================

export interface PhysioConsistencyInput {
  vlamax: number | null;
  tteMin: number | null;
  fatmaxPct: number | null;
  vo2max: number | null;
  ftp: number | null;
  weightKg: number | null;
  p30s: number | null;
  p1min: number | null;
}

export function computePhysioConsistency(input: PhysioConsistencyInput): PhysioConsistencyResult {
  const flags: ConsistencyFlag[] = [];
  let score = 1.0;
  
  const { vlamax, tteMin, fatmaxPct, vo2max, ftp, weightKg, p30s, p1min } = input;
  
  // Règle 1: VLamax élevée + TTE élevé → incohérent
  if (vlamax !== null && tteMin !== null) {
    if (vlamax > 0.55 && tteMin > 55) {
      flags.push({
        flag: 'high_vlamax_high_tte',
        severity: 'warning',
        hypothesis: 'VLamax haute implique épuisement glycolytique rapide, donc TTE devrait être plus court. Vérifier les protocoles de test.',
        affectedMetrics: ['VLamax', 'TTE']
      });
      score -= 0.15;
    }
  }
  
  // Règle 2: VLamax élevée + FatMax élevé → incohérent
  if (vlamax !== null && fatmaxPct !== null) {
    if (vlamax > 0.55 && fatmaxPct > 65) {
      flags.push({
        flag: 'high_vlamax_high_fatmax',
        severity: 'warning',
        hypothesis: 'VLamax haute signifie plus de glycolyse, donc FatMax devrait être plus bas. Vérifier les tests.',
        affectedMetrics: ['VLamax', 'FatMax']
      });
      score -= 0.10;
    }
  }
  
  // Règle 3: VO2max élevée + FTP très bas → vérifier fatigue/test
  if (vo2max !== null && ftp !== null && weightKg !== null) {
    const ftpKg = ftp / weightKg;
    const expectedFtpKgMin = vo2max * 0.055; // Approximation basse
    if (ftpKg < expectedFtpKgMin * 0.8) {
      flags.push({
        flag: 'high_vo2max_low_ftp',
        severity: 'warning',
        hypothesis: `FTP/kg (${ftpKg.toFixed(2)}) semble bas par rapport à VO2max (${vo2max}). Fatigue accumulée ou FTP à retester?`,
        affectedMetrics: ['VO2max', 'FTP']
      });
      score -= 0.10;
    }
  }
  
  // Règle 4: P30s très élevé + P1min faible → suspicion pacing sprint
  if (p30s !== null && p1min !== null) {
    const ratio = p30s / p1min;
    if (ratio > 1.4) {
      flags.push({
        flag: 'high_p30s_low_p1min',
        severity: 'info',
        hypothesis: 'Grand écart P30s/P1min - sprint très explosif ou pacing P1min non optimal.',
        affectedMetrics: ['P30s', 'P1min']
      });
      score -= 0.05;
    }
  }
  
  // Règle 5: TTE très long + FatMax bas → incohérent
  if (tteMin !== null && fatmaxPct !== null) {
    if (tteMin > 60 && fatmaxPct < 45) {
      flags.push({
        flag: 'high_tte_low_fatmax',
        severity: 'info',
        hypothesis: 'TTE long suggère bonne utilisation des lipides, mais FatMax est bas. Revoir le test FatMax.',
        affectedMetrics: ['TTE', 'FatMax']
      });
      score -= 0.05;
    }
  }
  
  // Clamp score
  score = Math.max(0.5, Math.min(1.0, score));
  
  return {
    score,
    incoherenceDetected: flags.some(f => f.severity === 'warning' || f.severity === 'critical'),
    flags
  };
}

// =====================================================
// MODULE 6: DECISION CONFIDENCE SCORE
// =====================================================

export interface DecisionConfidenceInput {
  protocolQualityScore: number;
  vlamaxConfidence: number;
  tteConfidence: number;
  durabilityScore: number | null;
  consistencyScore: number;
  economyScore: number | null;
  isReferenceWeek: boolean;
  dataCompleteness: number; // 0-1, combien de données disponibles
}

export function computeDecisionConfidence(input: DecisionConfidenceInput): {
  score: number;
  level: DecisionLevel;
  message: string;
} {
  // Pondérations
  const weights = {
    protocol: 0.15,
    vlamax: 0.20,
    tte: 0.15,
    durability: 0.15,
    consistency: 0.20,
    economy: 0.05,
    completeness: 0.10
  };
  
  // Calcul pondéré
  let score = 0;
  score += (input.protocolQualityScore * weights.protocol);
  score += (input.vlamaxConfidence * weights.vlamax);
  score += (input.tteConfidence * weights.tte);
  score += ((input.durabilityScore ?? 0.5) * weights.durability);
  score += (input.consistencyScore * weights.consistency);
  score += ((input.economyScore ?? 0.5) * weights.economy);
  score += (input.dataCompleteness * weights.completeness);
  
  // Boost semaine de référence
  if (input.isReferenceWeek) {
    score += 0.10;
  }
  
  // Convertir en 0-100
  const score100 = Math.round(Math.max(0, Math.min(100, score * 100)));
  
  // Niveau de décision
  let level: DecisionLevel;
  let message: string;
  
  if (score100 >= 75) {
    level = 'robust';
    message = 'Confiance élevée - recommandations complètes autorisées';
  } else if (score100 >= 60) {
    level = 'prudent';
    message = 'Confiance modérée - recommandations prudentes, test complémentaire conseillé';
  } else {
    level = 'insufficient';
    message = 'Confiance insuffisante - aucune recommandation forte, compléter les données';
  }
  
  return { score: score100, level, message };
}

// =====================================================
// MODULE 7: SCENARIOS
// =====================================================

export interface ScenarioInput {
  objective: string; // IM, 70.3, Marathon, Semi...
  vlamax: number | null;
  tteMin: number | null;
  ftpKg: number | null;
  decisionLevel: DecisionLevel;
  fatigueState: 'fresh' | 'normal' | 'fatigued';
}

export function generateScenarios(input: ScenarioInput): Scenario[] {
  const { objective, vlamax, tteMin, ftpKg, decisionLevel, fatigueState } = input;
  
  // Base scenarios selon l'objectif
  const scenarios: Scenario[] = [];
  
  // Conservative
  scenarios.push({
    type: 'conservative',
    label: 'Conservateur',
    objective: `Finir ${objective} en sécurité, minimiser les risques`,
    expectedBenefit: 'Finir sans défaillance, récupération rapide post-course',
    risks: {
      fatigue: 'low',
      injury: 'low',
      glycogenDepletion: 'low'
    },
    recommendation: generateConservativeRecommendation(input)
  });
  
  // Optimal
  scenarios.push({
    type: 'optimal',
    label: 'Optimal',
    objective: `Performance équilibrée sur ${objective}`,
    expectedBenefit: 'Meilleur rapport risque/performance attendu',
    risks: {
      fatigue: 'medium',
      injury: 'low',
      glycogenDepletion: 'medium'
    },
    recommendation: generateOptimalRecommendation(input)
  });
  
  // Aggressive (seulement si décision robuste et pas fatigué)
  if (decisionLevel === 'robust' && fatigueState !== 'fatigued') {
    scenarios.push({
      type: 'aggressive',
      label: 'Agressif',
      objective: `Performance maximale sur ${objective}`,
      expectedBenefit: 'Potentiel de chrono personnel si exécution parfaite',
      risks: {
        fatigue: 'high',
        injury: 'medium',
        glycogenDepletion: 'high'
      },
      recommendation: generateAggressiveRecommendation(input)
    });
  }
  
  return scenarios;
}

function generateConservativeRecommendation(input: ScenarioInput): string {
  const { vlamax, objective } = input;
  
  if (objective === 'IM' || objective === 'Ironman') {
    const intensity = vlamax && vlamax > 0.45 ? '62-65%' : '65-68%';
    return `Vélo: Maintenir ${intensity} FTP. Course: Démarrer 10% sous l'allure cible. Nutrition: +10g/h glucides vs plan optimal.`;
  }
  
  if (objective === '70.3' || objective === '703') {
    const intensity = vlamax && vlamax > 0.45 ? '68-72%' : '72-75%';
    return `Vélo: Maintenir ${intensity} FTP. Course: Allure semi -5%. Nutrition: Gel toutes les 30min.`;
  }
  
  return 'Démarrer prudemment, écouter son corps, privilégier la finition au chrono.';
}

function generateOptimalRecommendation(input: ScenarioInput): string {
  const { vlamax, tteMin, objective } = input;
  
  if (objective === 'IM' || objective === 'Ironman') {
    const intensity = vlamax && vlamax > 0.45 ? '65-68%' : '68-72%';
    const nutrition = tteMin && tteMin > 50 ? '70-80g/h' : '80-90g/h';
    return `Vélo: ${intensity} FTP constant. Course: Allure marathon -3%. Nutrition: ${nutrition} glucides.`;
  }
  
  if (objective === '70.3' || objective === '703') {
    const intensity = vlamax && vlamax > 0.45 ? '72-76%' : '76-80%';
    return `Vélo: ${intensity} FTP. Course: Allure semi. Nutrition: 60-70g/h glucides.`;
  }
  
  return 'Exécuter le plan prévu, ajuster selon sensations après 1/3 de course.';
}

function generateAggressiveRecommendation(input: ScenarioInput): string {
  const { objective } = input;
  
  if (objective === 'IM' || objective === 'Ironman') {
    return 'Vélo: 70-73% FTP avec micro-variations. Course: Allure marathon dès le départ. Nutrition maximale (90g/h). ATTENTION: Exécution parfaite requise.';
  }
  
  if (objective === '70.3' || objective === '703') {
    return 'Vélo: 78-82% FTP. Course: Allure 10km. Nutrition: Gel toutes les 20min. RISQUE: Défaillance possible si mauvaise exécution.';
  }
  
  return 'Pousser dès le départ. Risque élevé mais potentiel de performance maximale.';
}

// =====================================================
// MODULE 8: TFCL CLUSTER COMPARISON
// =====================================================

export interface ClusterComparison {
  metric: string;
  athleteValue: number;
  clusterP10: number;
  clusterP50: number;
  clusterP90: number;
  position: 'below_p10' | 'p10_p50' | 'p50_p90' | 'above_p90';
  confidenceImpact: number; // +/- adjustment
  message: string;
}

export function compareToCluster(
  metric: string,
  value: number,
  p10: number,
  p50: number,
  p90: number
): ClusterComparison {
  let position: ClusterComparison['position'];
  let confidenceImpact = 0;
  let message: string;
  
  if (value < p10) {
    position = 'below_p10';
    confidenceImpact = -0.10;
    message = `${metric} en dessous de P10 du cluster - valeur atypique, vérifier`;
  } else if (value < p50) {
    position = 'p10_p50';
    confidenceImpact = 0;
    message = `${metric} entre P10 et P50 du cluster - dans la norme basse`;
  } else if (value < p90) {
    position = 'p50_p90';
    confidenceImpact = 0;
    message = `${metric} entre P50 et P90 du cluster - dans la norme haute`;
  } else {
    position = 'above_p90';
    confidenceImpact = -0.05;
    message = `${metric} au-dessus de P90 du cluster - valeur haute, confirmer`;
  }
  
  return {
    metric,
    athleteValue: value,
    clusterP10: p10,
    clusterP50: p50,
    clusterP90: p90,
    position,
    confidenceImpact,
    message
  };
}

// =====================================================
// MODULE 9: ECONOMY SCORE
// =====================================================

export function computeEconomyScore(input: EconomyInput): EconomyResult {
  const flags: string[] = [];
  
  // Cadence/HR efficiency: bonne cadence avec HR basse = efficace
  // Normaliser: 0.5 = neutre, >0.5 = bon, <0.5 = à améliorer
  const cadenceHrEfficiency = input.hrAtCadence > 0 
    ? Math.min(1.0, 100 / input.hrAtCadence) 
    : 0.5;
  
  // Pace/HR drift ratio: faible dérive = bonne économie
  const paceHrDriftRatio = Math.max(0.3, 1.0 - (input.hrDriftAtSteadyState / 20));
  if (input.hrDriftAtSteadyState > 10) {
    flags.push('Dérive cardiaque importante à allure stable');
  }
  
  // Power/HR stability: faible variance = bon
  const powerHrStability = Math.max(0.3, 1.0 - input.powerStability * 2);
  
  // Score global
  const score = (cadenceHrEfficiency * 0.3 + paceHrDriftRatio * 0.4 + powerHrStability * 0.3);
  
  return {
    score,
    cadenceHrEfficiency,
    paceHrDriftRatio,
    powerHrStability,
    flags
  };
}

// =====================================================
// MAIN: COMPUTE FULL DRE RESULT
// =====================================================

export interface FullDREInput {
  // Données snapshot
  snapshotId: string;
  athleteId: string;
  coachId: string;
  objective: string;
  
  // Données physiologiques
  vlamax: number | null;
  vlamaxConfidence: number;
  tteMin: number | null;
  tteConfidence: number;
  fatmaxPct: number | null;
  vo2max: number | null;
  ftp: number | null;
  weightKg: number | null;
  p30s: number | null;
  p1min: number | null;
  map5min: number | null;
  pmax5s: number | null;
  
  // Protocol quality (optionnel)
  protocolQuality?: ProtocolQualityInput;
  
  // Durability (optionnel)
  durability?: DurabilityValidationInput;
  
  // Economy (optionnel)
  economy?: EconomyInput;
  
  // Référence
  isReferenceWeek: boolean;
  
  // État
  fatigueState: 'fresh' | 'normal' | 'fatigued';
}

export function computeFullDRE(input: FullDREInput): DecisionReliabilityResult {
  // Protocol Quality
  const protocolQuality = input.protocolQuality 
    ? computeProtocolQuality(input.protocolQuality)
    : { score: 0.75, breakdown: { sleep: 0.85, nutrition: 0.85, fatigue: 0.85, sensors: 1.0, environment: 1.0 }, flags: ['Qualité protocole non renseignée'] };
  
  // Multi-index VLamax
  let multiIndexVlamax: MultiIndexVLamaxResult | null = null;
  if (input.ftp) {
    multiIndexVlamax = computeMultiIndexVlamax({
      ftp: input.ftp,
      p30s: input.p30s ?? undefined,
      p1min: input.p1min ?? undefined,
      map5min: input.map5min ?? undefined,
      tteMin: input.tteMin ?? undefined,
      pmax5s: input.pmax5s ?? undefined,
      weightKg: input.weightKg ?? undefined
    });
  }
  
  // Durability
  const durability = input.durability 
    ? computeDurabilityValidation(input.durability)
    : null;
  
  // Physio Consistency
  const physioConsistency = computePhysioConsistency({
    vlamax: input.vlamax,
    tteMin: input.tteMin,
    fatmaxPct: input.fatmaxPct,
    vo2max: input.vo2max,
    ftp: input.ftp,
    weightKg: input.weightKg,
    p30s: input.p30s,
    p1min: input.p1min
  });
  
  // Economy
  const economy = input.economy 
    ? computeEconomyScore(input.economy)
    : null;
  
  // Data completeness
  const requiredFields = [input.ftp, input.vlamax, input.tteMin, input.weightKg];
  const filledFields = requiredFields.filter(f => f !== null && f !== undefined).length;
  const dataCompleteness = filledFields / requiredFields.length;
  
  // Decision Confidence
  const decisionConfidence = computeDecisionConfidence({
    protocolQualityScore: protocolQuality.score,
    vlamaxConfidence: multiIndexVlamax?.confidence ?? input.vlamaxConfidence,
    tteConfidence: input.tteConfidence,
    durabilityScore: durability?.consistencyScore ?? null,
    consistencyScore: physioConsistency.score,
    economyScore: economy?.score ?? null,
    isReferenceWeek: input.isReferenceWeek,
    dataCompleteness
  });
  
  // Scenarios
  const scenarios = generateScenarios({
    objective: input.objective,
    vlamax: input.vlamax,
    tteMin: input.tteMin,
    ftpKg: input.ftp && input.weightKg ? input.ftp / input.weightKg : null,
    decisionLevel: decisionConfidence.level,
    fatigueState: input.fatigueState
  });
  
  // Collect warnings and recommendations
  const warnings: string[] = [
    ...protocolQuality.flags,
    ...(multiIndexVlamax?.flags ?? []),
    ...(durability?.flags ?? []),
    ...(economy?.flags ?? []),
    ...physioConsistency.flags.map(f => `${f.flag}: ${f.hypothesis}`)
  ];
  
  const recommendations: string[] = [];
  if (dataCompleteness < 0.75) {
    recommendations.push('Compléter les données manquantes pour améliorer la fiabilité');
  }
  if (!input.isReferenceWeek) {
    recommendations.push('Planifier une Semaine de Référence TFCL pour calibration optimale');
  }
  if (physioConsistency.incoherenceDetected) {
    recommendations.push('Incohérences détectées - revérifier les protocoles de test');
  }
  if (decisionConfidence.level === 'insufficient') {
    recommendations.push('Confiance insuffisante - éviter les décisions d\'entraînement fortes');
  }
  
  return {
    decisionConfidenceScore: decisionConfidence.score,
    decisionLevel: decisionConfidence.level,
    
    protocolQuality,
    multiIndexVlamax,
    durability,
    physioConsistency,
    economy,
    
    isReferenceWeek: input.isReferenceWeek,
    referenceWeekBoost: input.isReferenceWeek ? 0.10 : 0,
    
    scenarios,
    
    mainMessage: decisionConfidence.message,
    recommendations,
    warnings,
    
    calculatedAt: new Date().toISOString(),
    version: 'DRE-v1.0'
  };
}

// =====================================================
// EXPORTS TYPES FOR DATABASE
// =====================================================

export interface ReliabilityScoreDBRecord {
  snapshot_id: string;
  athlete_id: string;
  coach_id: string;
  
  is_reference_week: boolean;
  reference_date: string | null;
  reference_week_confidence_boost: number;
  
  protocol_quality_score: number;
  sleep_quality: SleepQuality | null;
  nutrition_pre_test: NutritionPreTest | null;
  perceived_fatigue: number | null;
  sensors_calibrated: boolean;
  environmental_conditions: EnvironmentalConditions | null;
  
  vlamax_indices: Record<string, number>;
  vlamax_dispersion: number | null;
  vlamax_range_low: number | null;
  vlamax_range_high: number | null;
  vlamax_median: number | null;
  vlamax_multi_confidence: number;
  
  durability_z2_duration_min: number | null;
  durability_hr_drift_pct: number | null;
  durability_cadence_stability: number | null;
  durability_rpe_final: number | null;
  durability_consistency_score: number;
  
  consistency_flags: ConsistencyFlag[];
  consistency_score: number;
  incoherence_detected: boolean;
  
  decision_confidence_score: number;
  decision_level: DecisionLevel;
  
  cadence_hr_efficiency: number | null;
  pace_hr_drift_ratio: number | null;
  power_hr_stability: number | null;
  economy_score: number;
  
  coach_validation_status: CoachValidationStatus;
  coach_validation_date: string | null;
  coach_validation_notes: string | null;
  coach_model_coherence_rating: number | null;
  coach_response_accuracy_rating: number | null;
  coach_fatigue_observed: string | null;
  
  calculation_version: string;
  raw_calculation_data: Record<string, unknown>;
}

export function mapDREToDBRecord(
  result: DecisionReliabilityResult,
  snapshotId: string,
  athleteId: string,
  coachId: string,
  protocolInput?: ProtocolQualityInput
): ReliabilityScoreDBRecord {
  return {
    snapshot_id: snapshotId,
    athlete_id: athleteId,
    coach_id: coachId,
    
    is_reference_week: result.isReferenceWeek,
    reference_date: result.isReferenceWeek ? new Date().toISOString().split('T')[0] : null,
    reference_week_confidence_boost: result.referenceWeekBoost,
    
    protocol_quality_score: result.protocolQuality.score,
    sleep_quality: protocolInput?.sleepQuality ?? null,
    nutrition_pre_test: protocolInput?.nutritionPreTest ?? null,
    perceived_fatigue: protocolInput?.perceivedFatigue ?? null,
    sensors_calibrated: protocolInput?.sensorsCalibrated ?? true,
    environmental_conditions: protocolInput?.environmentalConditions ?? null,
    
    vlamax_indices: result.multiIndexVlamax 
      ? Object.fromEntries(result.multiIndexVlamax.indices.map(i => [i.name, i.value]))
      : {},
    vlamax_dispersion: result.multiIndexVlamax?.dispersion ?? null,
    vlamax_range_low: result.multiIndexVlamax?.rangeLow ?? null,
    vlamax_range_high: result.multiIndexVlamax?.rangeHigh ?? null,
    vlamax_median: result.multiIndexVlamax?.median ?? null,
    vlamax_multi_confidence: result.multiIndexVlamax?.confidence ?? 0.5,
    
    durability_z2_duration_min: null,
    durability_hr_drift_pct: null,
    durability_cadence_stability: null,
    durability_rpe_final: null,
    durability_consistency_score: result.durability?.consistencyScore ?? 0.5,
    
    consistency_flags: result.physioConsistency.flags,
    consistency_score: result.physioConsistency.score,
    incoherence_detected: result.physioConsistency.incoherenceDetected,
    
    decision_confidence_score: result.decisionConfidenceScore,
    decision_level: result.decisionLevel,
    
    cadence_hr_efficiency: result.economy?.cadenceHrEfficiency ?? null,
    pace_hr_drift_ratio: result.economy?.paceHrDriftRatio ?? null,
    power_hr_stability: result.economy?.powerHrStability ?? null,
    economy_score: result.economy?.score ?? 0.5,
    
    coach_validation_status: 'pending',
    coach_validation_date: null,
    coach_validation_notes: null,
    coach_model_coherence_rating: null,
    coach_response_accuracy_rating: null,
    coach_fatigue_observed: null,
    
    calculation_version: result.version,
    raw_calculation_data: {
      scenarios: result.scenarios,
      warnings: result.warnings,
      recommendations: result.recommendations,
      calculatedAt: result.calculatedAt
    }
  };
}
