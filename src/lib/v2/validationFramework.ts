/**
 * Cadre de validation physiologique – Two For Coaching Lab
 * 
 * Définit:
 * - Classification des données (mesurée, estimée, modélisée)
 * - Moteur de recommandation test labo
 * - Échelle d'utilisation selon niveau athlète
 * - Disclaimers légaux et éthiques
 */

// =============================================
// TEXTES OFFICIELS
// =============================================

export const VALIDATION_TEXTS = {
  FOUNDATIONAL_PRINCIPLE: `Two For Coaching Lab est un outil de modélisation physiologique avancée.
Il aide à comprendre, comparer et orienter l'entraînement.
Il ne remplace jamais une mesure physiologique directe lorsque celle-ci est nécessaire.`,

  STRATEGIC_POSITIONING: `Two For Coaching Lab ne cherche pas à remplacer la science du sport,
mais à la rendre exploitable au quotidien, même lorsque l'accès au laboratoire est limité.`,

  COACH_DISCLAIMER: `Les recommandations doivent être interprétées par un coach qualifié.`,

  LEGAL_DISCLAIMER: `Cet outil ne fournit aucun diagnostic médical ni prescription thérapeutique.
Il s'agit d'une aide à la décision sportive destinée aux coachs et athlètes.`,

  PDF_VALIDITY_INTRO: `Ce rapport utilise la Two For Coaching Lab Method™.
Les données présentées sont classifiées selon leur origine et niveau de confiance.`,
};

// =============================================
// CLASSIFICATION DES DONNÉES
// =============================================

export type DataConfidenceLevel = 'measured' | 'estimated' | 'modeled';

export interface DataConfidenceInfo {
  level: DataConfidenceLevel;
  value: number | string;
  source: string;
  confidence: number;  // 0-1
  limitationsText: string;
  lastMeasuredDate?: string;
}

export const CONFIDENCE_BADGES = {
  measured: {
    emoji: '🟢',
    label: 'Mesurée directement',
    shortLabel: 'Mesurée',
    color: 'success' as const,
    description: 'Valeur issue d\'un test physiologique direct (labo ou terrain validé).',
  },
  estimated: {
    emoji: '🟠',
    label: 'Estimée (modèle validé)',
    shortLabel: 'Estimée',
    color: 'warning' as const,
    description: 'Valeur calculée à partir de données terrain via un modèle scientifique.',
  },
  modeled: {
    emoji: '🔴',
    label: 'Modélisée (hypothèse)',
    shortLabel: 'Modélisée',
    color: 'destructive' as const,
    description: 'Valeur déduite par hypothèse, incertitude élevée.',
  },
};

// Table de classification des paramètres
export const PARAMETER_CLASSIFICATION: Record<string, {
  defaultLevel: DataConfidenceLevel;
  canBeMeasured: boolean;
  measurementMethod: string;
  modelDescription: string;
  typicalConfidence: [number, number];  // [estimated, measured]
}> = {
  ftp: {
    defaultLevel: 'estimated',
    canBeMeasured: true,
    measurementMethod: 'Test 20min ou rampe avec analyseur de gaz',
    modelDescription: 'Estimation via tests terrain (20min, 8min, etc.)',
    typicalConfidence: [0.85, 0.95],
  },
  vo2max: {
    defaultLevel: 'estimated',
    canBeMeasured: true,
    measurementMethod: 'Test incrémental avec analyseur de gaz (VO2 direct)',
    modelDescription: 'Estimation via formules (VMA, performances)',
    typicalConfidence: [0.70, 0.98],
  },
  vlamax: {
    defaultLevel: 'modeled',
    canBeMeasured: true,
    measurementMethod: 'Test lactate multi-points ou sprint maximal avec lactatémie',
    modelDescription: 'Modélisation via sprint, ratio FTP/Pmax, durabilité',
    typicalConfidence: [0.55, 0.90],
  },
  tte: {
    defaultLevel: 'estimated',
    canBeMeasured: true,
    measurementMethod: 'Test d\'épuisement à intensité seuil',
    modelDescription: 'Estimation via charge, durabilité, dérive cardiaque',
    typicalConfidence: [0.65, 0.85],
  },
  fcmax: {
    defaultLevel: 'measured',
    canBeMeasured: true,
    measurementMethod: 'Test maximal (rampe ou effort court intense)',
    modelDescription: 'Formule 220-âge (très imprécise)',
    typicalConfidence: [0.50, 0.98],
  },
  css: {
    defaultLevel: 'estimated',
    canBeMeasured: true,
    measurementMethod: 'Test lactate en natation ou protocole 400/200',
    modelDescription: 'Estimation via tests terrain chronométrés',
    typicalConfidence: [0.75, 0.90],
  },
  vma: {
    defaultLevel: 'estimated',
    canBeMeasured: true,
    measurementMethod: 'Test VMA terrain (Léger-Boucher, VAMEVAL) ou labo',
    modelDescription: 'Estimation via performances récentes',
    typicalConfidence: [0.80, 0.92],
  },
  economy: {
    defaultLevel: 'modeled',
    canBeMeasured: true,
    measurementMethod: 'Analyse de gaz à intensités sous-maximales',
    modelDescription: 'Estimation via ratio puissance/vitesse, dérive FC',
    typicalConfidence: [0.50, 0.88],
  },
  fatigue: {
    defaultLevel: 'modeled',
    canBeMeasured: false,
    measurementMethod: 'N/A (indicateur composite)',
    modelDescription: 'Score composite : charge, stress, récupération',
    typicalConfidence: [0.60, 0.60],
  },
};

// =============================================
// MOTEUR DE RECOMMANDATION TEST LABO
// =============================================

export type LabTestTrigger = 
  | 'high_objective'
  | 'data_inconsistency'
  | 'low_confidence'
  | 'strategic_decision'
  | 'recent_injury'
  | 'performance_plateau'
  | 'baseline_needed';

export interface LabTestRecommendation {
  isRecommended: boolean;
  urgency: 'optional' | 'advised' | 'strongly_advised' | 'essential';
  triggers: LabTestTrigger[];
  messages: string[];
  testsToConsider: string[];
  rationale: string;
}

export const LAB_TRIGGER_MESSAGES: Record<LabTestTrigger, string> = {
  high_objective: 'Objectif élevé → test labo recommandé pour affiner la stratégie',
  data_inconsistency: 'Incohérence détectée → mesure directe recommandée pour clarifier',
  low_confidence: 'Modélisation incertaine → test labo conseillé pour fiabiliser',
  strategic_decision: 'Décision stratégique majeure → données précises nécessaires',
  recent_injury: 'Reprise post-blessure → recalibration physiologique conseillée',
  performance_plateau: 'Plateau de performance → diagnostic approfondi utile',
  baseline_needed: 'Données de référence manquantes → test initial recommandé',
};

export interface LabTestEngineInput {
  // Objectif
  objectif?: string;
  isEliteObjective?: boolean;
  isQualificationObjective?: boolean;
  
  // Confiance des données
  vlamaxConfidence?: number;
  tteConfidence?: number;
  overallConfidence?: number;
  
  // Incohérences
  ftpTrend?: 'up' | 'stable' | 'down';
  tteTrend?: 'up' | 'stable' | 'down';
  vlamaxStability?: number;  // écart-type sur dernières mesures
  
  // Contexte
  recentInjury?: boolean;
  daysSinceLastLabTest?: number;
  isStrategicPhase?: boolean;  // changement d'objectif, phase clé
  performancePlateau?: boolean;
  
  // Données de base
  hasLabVo2max?: boolean;
  hasLabVlamax?: boolean;
}

export function computeLabTestRecommendation(input: LabTestEngineInput): LabTestRecommendation {
  const triggers: LabTestTrigger[] = [];
  const messages: string[] = [];
  const testsToConsider: string[] = [];
  
  // A) Objectif élevé
  if (input.isEliteObjective || input.isQualificationObjective) {
    triggers.push('high_objective');
    messages.push(LAB_TRIGGER_MESSAGES.high_objective);
    testsToConsider.push('Test VO2max + lactate complet');
  } else if (input.objectif) {
    const obj = input.objectif.toLowerCase();
    if (obj.includes('ironman') || obj.includes('kona') || obj.includes('qualification') || 
        obj.includes('podium') || obj.includes('elite')) {
      triggers.push('high_objective');
      messages.push(LAB_TRIGGER_MESSAGES.high_objective);
      testsToConsider.push('Test métabolique complet');
    }
  }
  
  // B) Incohérence des données
  if (input.ftpTrend === 'up' && input.tteTrend === 'down') {
    triggers.push('data_inconsistency');
    messages.push('FTP progresse mais durabilité chute → investigation recommandée');
    testsToConsider.push('Test lactate multi-points');
  }
  if (input.vlamaxStability !== undefined && input.vlamaxStability > 0.08) {
    triggers.push('data_inconsistency');
    messages.push('VLamax instable dans le temps → mesure directe recommandée');
    testsToConsider.push('Test VLamax lactate ou sprint');
  }
  
  // C) Confiance faible
  if (input.vlamaxConfidence !== undefined && input.vlamaxConfidence < 0.60) {
    triggers.push('low_confidence');
    messages.push('Confiance VLamax < 60% → test labo conseillé');
    testsToConsider.push('Test lactate sprint');
  }
  if (input.tteConfidence !== undefined && input.tteConfidence < 0.60) {
    triggers.push('low_confidence');
    messages.push('Confiance TTE < 60% → test d\'endurance recommandé');
    testsToConsider.push('Test TTE terrain structuré');
  }
  if (input.overallConfidence !== undefined && input.overallConfidence < 0.55) {
    triggers.push('low_confidence');
    messages.push('Modélisation globale incertaine → calibration labo conseillée');
    testsToConsider.push('Bilan physiologique complet');
  }
  
  // D) Décision stratégique
  if (input.isStrategicPhase) {
    triggers.push('strategic_decision');
    messages.push(LAB_TRIGGER_MESSAGES.strategic_decision);
    testsToConsider.push('Test de référence adapté à l\'objectif');
  }
  
  // E) Reprise blessure
  if (input.recentInjury) {
    triggers.push('recent_injury');
    messages.push(LAB_TRIGGER_MESSAGES.recent_injury);
    testsToConsider.push('Test sous-maximal de recalibration');
  }
  
  // F) Plateau
  if (input.performancePlateau) {
    triggers.push('performance_plateau');
    messages.push(LAB_TRIGGER_MESSAGES.performance_plateau);
    testsToConsider.push('Bilan métabolique pour identifier les limiteurs');
  }
  
  // G) Données de base manquantes
  if (!input.hasLabVo2max && !input.hasLabVlamax && 
      (input.daysSinceLastLabTest === undefined || input.daysSinceLastLabTest > 365)) {
    triggers.push('baseline_needed');
    messages.push('Aucune mesure de référence récente → test initial conseillé');
    testsToConsider.push('Bilan physiologique de base');
  }
  
  // Calcul urgence
  let urgency: LabTestRecommendation['urgency'] = 'optional';
  if (triggers.includes('high_objective') && triggers.length >= 2) {
    urgency = 'essential';
  } else if (triggers.includes('high_objective') || triggers.length >= 3) {
    urgency = 'strongly_advised';
  } else if (triggers.length >= 2) {
    urgency = 'advised';
  } else if (triggers.length === 1) {
    urgency = 'optional';
  }
  
  // Rationale
  let rationale: string;
  if (triggers.length === 0) {
    rationale = 'Aucun indicateur ne suggère un test labo immédiat. La modélisation Two For Coaching Lab est suffisante pour l\'objectif actuel.';
  } else if (urgency === 'essential') {
    rationale = 'Plusieurs facteurs convergent vers la nécessité d\'un test physiologique pour sécuriser les décisions d\'entraînement.';
  } else if (urgency === 'strongly_advised') {
    rationale = 'Un test labo permettrait de lever les incertitudes et d\'affiner significativement la stratégie.';
  } else {
    rationale = 'Un test labo serait bénéfique mais n\'est pas indispensable dans l\'immédiat.';
  }
  
  return {
    isRecommended: triggers.length > 0,
    urgency,
    triggers,
    messages,
    testsToConsider: [...new Set(testsToConsider)],
    rationale,
  };
}

// =============================================
// ÉCHELLE D'UTILISATION PAR NIVEAU
// =============================================

export type AthleteLevel = 'recreational' | 'ambitious' | 'elite';

export interface UsageLevelInfo {
  level: AthleteLevel;
  label: string;
  emoji: string;
  description: string;
  modelingSufficiency: 'sufficient' | 'recommended_complement' | 'essential_complement';
  labTestAdvice: string;
  twoForCoachingRole: string;
}

export const USAGE_LEVELS: UsageLevelInfo[] = [
  {
    level: 'recreational',
    label: 'Niveau 1 — Loisir / Amateur',
    emoji: '🏃',
    description: 'Objectif plaisir, finisher, progression personnelle',
    modelingSufficiency: 'sufficient',
    labTestAdvice: '✔️ Test labo optionnel',
    twoForCoachingRole: '✔️ Modélisation Two For Coaching Lab suffisante',
  },
  {
    level: 'ambitious',
    label: 'Niveau 2 — Ambitieux / Performance',
    emoji: '🎯',
    description: 'Objectif chrono, groupe d\'âge, qualification régionale',
    modelingSufficiency: 'recommended_complement',
    labTestAdvice: '⚠️ Test labo conseillé 1×/an',
    twoForCoachingRole: '✔️ Modélisation + tests terrain réguliers',
  },
  {
    level: 'elite',
    label: 'Niveau 3 — Elite / Qualification mondiale',
    emoji: '🏆',
    description: 'Qualification Ironman, podium groupe d\'âge, élite nationale',
    modelingSufficiency: 'essential_complement',
    labTestAdvice: '⚠️ Test labo indispensable',
    twoForCoachingRole: '✔️ Outil d\'interprétation & suivi entre les tests',
  },
];

export function getAthleteLevel(objectif?: string, isElite?: boolean): AthleteLevel {
  if (isElite) return 'elite';
  
  if (!objectif) return 'recreational';
  
  const obj = objectif.toLowerCase();
  
  // Elite indicators
  if (obj.includes('kona') || obj.includes('qualification') || obj.includes('podium') ||
      obj.includes('elite') || obj.includes('world') || obj.includes('championnat')) {
    return 'elite';
  }
  
  // Ambitious indicators
  if (obj.includes('ironman') || obj.includes('marathon') || obj.includes('70.3') ||
      obj.includes('chrono') || obj.includes('performance') || obj.includes('pr') ||
      obj.includes('record')) {
    return 'ambitious';
  }
  
  return 'recreational';
}

export function getUsageLevelInfo(level: AthleteLevel): UsageLevelInfo {
  return USAGE_LEVELS.find(l => l.level === level) || USAGE_LEVELS[0];
}

// =============================================
// STATUT DE VALIDATION (DASHBOARD)
// =============================================

export type ValidationStatus = 
  | 'modeling_sufficient'
  | 'lab_recommended'
  | 'lab_recent_solid'
  | 'lab_outdated';

export interface PhysiologicalValidationStatus {
  status: ValidationStatus;
  statusLabel: string;
  statusEmoji: string;
  statusColor: 'success' | 'info' | 'warning' | 'destructive';
  message: string;
  detailedMessage: string;
  labRecommendation: LabTestRecommendation | null;
  athleteLevel: AthleteLevel;
  overallConfidence: number;
  dataClassification: {
    measured: string[];
    estimated: string[];
    modeled: string[];
  };
}

export function computeValidationStatus(input: {
  labRecommendation: LabTestRecommendation;
  athleteLevel: AthleteLevel;
  overallConfidence: number;
  daysSinceLabTest?: number;
  measuredParams: string[];
  estimatedParams: string[];
  modeledParams: string[];
}): PhysiologicalValidationStatus {
  const { labRecommendation, athleteLevel, overallConfidence, daysSinceLabTest } = input;
  
  let status: ValidationStatus;
  let statusLabel: string;
  let statusEmoji: string;
  let statusColor: PhysiologicalValidationStatus['statusColor'];
  let message: string;
  let detailedMessage: string;
  
  // Test labo récent (< 6 mois)
  if (daysSinceLabTest !== undefined && daysSinceLabTest < 180) {
    status = 'lab_recent_solid';
    statusLabel = 'Référence labo récente';
    statusEmoji = '🔬';
    statusColor = 'success';
    message = 'Test labo récent — données de référence solides';
    detailedMessage = `Dernière mesure labo il y a ${daysSinceLabTest} jours. Les données sont calibrées sur des mesures directes.`;
  }
  // Test labo ancien (> 1 an)
  else if (daysSinceLabTest !== undefined && daysSinceLabTest > 365) {
    status = 'lab_outdated';
    statusLabel = 'Calibration ancienne';
    statusEmoji = '⏰';
    statusColor = 'warning';
    message = 'Données labo > 1 an — recalibration conseillée';
    detailedMessage = 'Les références physiologiques datent. Un nouveau test permettrait de valider l\'évolution.';
  }
  // Recommandation labo forte
  else if (labRecommendation.urgency === 'essential' || labRecommendation.urgency === 'strongly_advised') {
    status = 'lab_recommended';
    statusLabel = 'Test labo recommandé';
    statusEmoji = '⚠️';
    statusColor = 'warning';
    message = 'Test labo recommandé pour sécuriser les décisions';
    detailedMessage = labRecommendation.rationale;
  }
  // Modélisation suffisante
  else {
    status = 'modeling_sufficient';
    statusLabel = 'Modélisation suffisante';
    statusEmoji = '✅';
    statusColor = 'success';
    message = 'Modélisation suffisante pour l\'objectif actuel';
    detailedMessage = 'Les données disponibles permettent une analyse fiable pour votre niveau d\'objectif.';
  }
  
  return {
    status,
    statusLabel,
    statusEmoji,
    statusColor,
    message,
    detailedMessage,
    labRecommendation,
    athleteLevel,
    overallConfidence,
    dataClassification: {
      measured: input.measuredParams,
      estimated: input.estimatedParams,
      modeled: input.modeledParams,
    },
  };
}

// =============================================
// ACADEMY MODULE
// =============================================

export const ACADEMY_LAB_TEST_MODULE = {
  id: 'when_lab_test',
  title: 'Quand faire un test labo ?',
  description: 'Comprendre la complémentarité entre modélisation et mesure directe.',
  icon: '🔬',
  
  chapters: [
    {
      id: 'lab_benefits',
      title: '1. Ce que le labo apporte réellement',
      content: `## Avantages d'un test physiologique en laboratoire

### Précision maximale
Le test labo mesure directement les paramètres physiologiques :
- **VO2max** : analyse des échanges gazeux respiratoires
- **VLamax** : cinétique lactate sur effort maximal
- **Seuils** : identification précise des transitions métaboliques
- **Économie** : coût énergétique à intensités contrôlées

### Calibration des modèles
Une mesure directe permet de **calibrer** les estimations du modèle.
Les prédictions deviennent plus précises une fois "ancrées" sur une référence.

### Détection de limiteurs cachés
Certains problèmes ne sont pas détectables sans mesure :
- Désaturation à l'effort
- Limitation ventilatoire
- Profil lactate atypique

### Valeur légale et médicale
Un bilan labo peut être requis pour :
- Certificat médical compétition
- Suivi post-pathologie
- Assurance sport élite`,
    },
    {
      id: 'modeling_limits',
      title: '2. Ce que la modélisation ne peut pas deviner',
      content: `## Limites fondamentales de la modélisation

### Variables cachées
Le modèle ne voit pas :
- L'état de santé réel (fer, vitamine D, surmenage)
- Les compensations biomécaniques
- Les facteurs génétiques individuels
- L'état psychologique profond

### Sensibilité aux données d'entrée
La qualité des estimations dépend des données fournies.
- Données manquantes → incertitude élevée
- Données anciennes → dérive possible
- Données incohérentes → confusion

### Modèles génériques
Les formules sont calibrées sur des populations moyennes.
Un individu atypique peut s'écarter significativement.

### Pas de diagnostic
Le modèle identifie des **patterns** mais ne diagnostique rien :
- "VLamax élevée" n'explique pas pourquoi
- "TTE faible" peut avoir 10 causes différentes
- Seul un examen approfondi lève les ambiguïtés`,
    },
    {
      id: 'too_many_tests',
      title: '3. Pourquoi trop de tests peut être contre-productif',
      content: `## Le piège de la sur-mesure

### Coût et temps
Chaque test labo représente :
- 150-400€ de frais
- 2-3h de déplacement et protocole
- Une séance d'entraînement perdue

### Variabilité normale
Les paramètres physiologiques fluctuent naturellement :
- ±5% de VO2max selon l'état de forme
- Variation VLamax selon la récupération
- TTE sensible à la fatigue

Tester trop souvent = mesurer du bruit.

### Fausse précision
Multiplier les chiffres ne réduit pas toujours l'incertitude.
Un test par an bien interprété > 4 tests mal exploités.

### Focus sur les chiffres vs entraînement
Le temps passé à analyser des tests est du temps non passé à s'entraîner.
L'obsession des métriques peut nuire à l'écoute des sensations.`,
    },
    {
      id: 'smart_combination',
      title: '4. Comment utiliser les deux intelligemment',
      content: `## Stratégie optimale : complémentarité

### Test labo = calibration périodique
- 1×/an pour athlète ambitieux
- 2×/an pour élite (pré-saison + mi-saison)
- À la demande si doute majeur

### Two For Coaching Lab = suivi continu
Entre les tests labo :
- Suivi des tendances (TTE, fatigue)
- Détection précoce des dérives
- Ajustement fin de l'entraînement

### Workflow recommandé

1. **Test labo initial** → calibration de référence
2. **Suivi Two For Coaching Lab** → monitoring continu
3. **Alerte Two For Coaching Lab** → signal pour re-tester
4. **Nouveau test labo** → validation et recalibration

### Quand prioriser le labo

| Situation | Labo ? |
|-----------|--------|
| Objectif élite | ✅ Indispensable |
| Incohérence persistante | ✅ Recommandé |
| Plateau > 2 mois | ⚠️ Conseillé |
| Reprise blessure | ⚠️ Conseillé |
| Suivi courant | ❌ Two For Coaching Lab suffit |

### Message clé
Le labo donne une **photo précise** à un instant T.
Two For Coaching Lab donne un **film** de l'évolution.
Les deux sont complémentaires, jamais en opposition.`,
    },
  ],
};
