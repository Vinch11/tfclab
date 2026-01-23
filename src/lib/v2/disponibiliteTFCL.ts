/**
 * TWO FOR COACHING LAB METHOD™ — Disponibilité TFCL™
 * 
 * La Disponibilité TFCL™ mesure une CAPACITÉ À S'ENGAGER DANS UNE CHARGE
 * DE QUALITÉ À L'INSTANT T.
 * 
 * Elle ne prétend PAS mesurer une vérité physiologique absolue.
 * Elle ÉCLAIRE une décision, elle ne donne jamais un ordre.
 * 
 * SOURCES :
 * - Questionnaire structuré (obligatoire)
 * - Données objectives (optionnelles mais prioritaires si disponibles)
 * 
 * RÈGLE FINALE TFCL :
 * La Disponibilité TFCL™ ne donne jamais un ordre.
 * Elle éclaire une décision.
 */

import { METHOD_VERSION_DISPLAY } from './scientificGovernance';

// =============================================
// TYPES — Questionnaire TFCL Daily Readiness Check
// =============================================

export interface TFCLDailyReadinessQuestion {
  id: string;
  label: string;
  description: string;
  anchor0: string;
  anchor10: string;
  icon: string;
}

export const TFCL_READINESS_QUESTIONS: TFCLDailyReadinessQuestion[] = [
  {
    id: 'sleep',
    label: 'Sommeil (qualité + durée)',
    description: 'Comment était ton sommeil cette nuit ?',
    anchor0: 'très mauvais / fragmenté',
    anchor10: 'excellent / récupérateur',
    icon: '😴',
  },
  {
    id: 'fatigue',
    label: 'Fatigue générale',
    description: 'Comment te sens-tu physiquement ?',
    anchor0: 'épuisé',
    anchor10: 'très frais',
    icon: '⚡',
  },
  {
    id: 'soreness',
    label: 'Douleurs / raideur',
    description: 'As-tu des douleurs musculaires ou tendineuses ?',
    anchor0: 'douleur gênante',
    anchor10: 'aucune douleur',
    icon: '💪',
  },
  {
    id: 'stress',
    label: 'Stress mental / professionnel',
    description: 'Quel est ton niveau de stress actuel ?',
    anchor0: 'stress très élevé',
    anchor10: 'calme / détendu',
    icon: '🧠',
  },
  {
    id: 'motivation',
    label: "Motivation / envie de s'entraîner",
    description: "Quelle est ton envie de t'entraîner aujourd'hui ?",
    anchor0: 'aucune envie',
    anchor10: 'très motivé',
    icon: '🔥',
  },
];

// Questions staff (optionnelles, toggle)
export interface TFCLAlertQuestion {
  id: string;
  label: string;
  description: string;
  isAlert: boolean;
}

export const TFCL_ALERT_QUESTIONS: TFCLAlertQuestion[] = [
  {
    id: 'joint_pain',
    label: 'Douleur articulaire inhabituelle',
    description: 'Ressens-tu une douleur articulaire inhabituelle ?',
    isAlert: true,
  },
  {
    id: 'illness',
    label: 'Sensation de maladie / fièvre',
    description: 'Te sens-tu malade ou fiévreux ?',
    isAlert: true,
  },
  {
    id: 'asymmetric_pain',
    label: 'Douleur asymétrique persistante',
    description: "As-tu une douleur d'un seul côté qui persiste ?",
    isAlert: true,
  },
];

// =============================================
// TYPES — Disponibilité TFCL™
// =============================================

export type DisponibiliteLevel = 'high' | 'moderate' | 'low' | 'critical';

export type DisponibiliteConfidence = 'high' | 'medium' | 'low';

export interface TFCLReadinessInput {
  // Questionnaire subjectif (0-10)
  sleep: number | null;
  fatigue: number | null;
  soreness: number | null;
  stress: number | null;
  motivation: number | null;
  
  // Signaux d'alerte (staff)
  alerts?: {
    joint_pain?: boolean;
    illness?: boolean;
    asymmetric_pain?: boolean;
  };
  
  // Données objectives (optionnelles)
  objective?: {
    rhrCurrent?: number | null;        // FC repos actuelle
    rhrBaseline?: number | null;       // FC repos baseline
    hrvCurrent?: number | null;        // HRV actuelle
    hrvBaseline?: number | null;       // HRV baseline
    tss7d?: number | null;             // Charge 7 jours
    tssTarget?: number | null;         // Charge cible individuelle
    tss14d?: number | null;            // Charge 14 jours
  };
  
  // Charge déclarée (fallback si pas d'objectif)
  declaredLoad?: 'light' | 'moderate' | 'heavy' | null;
}

export interface DisponibiliteScoreBreakdown {
  subjective: {
    score: number;           // 0-100
    details: Record<string, number>;  // Scores par question
    warnings: string[];      // Incohérences détectées
  };
  objective: {
    available: boolean;
    score: number | null;    // 0-100 ou null si indisponible
    sources: string[];       // Sources utilisées
    deviations: string[];    // Dérives détectées
  };
}

export interface DisponibiliteTFCL {
  // Score global (0-100)
  score: number;
  
  // Niveau catégorisé
  level: DisponibiliteLevel;
  levelLabel: string;
  levelEmoji: string;
  levelDescription: string;
  
  // Niveau de confiance
  confidence: DisponibiliteConfidence;
  confidenceLabel: string;
  confidenceExplanation: string;
  
  // Décomposition
  breakdown: DisponibiliteScoreBreakdown;
  
  // Pondérations utilisées
  weights: {
    objective: number;
    subjective: number;
    declaredLoad?: number;
  };
  
  // Sources utilisées
  sourcesUsed: string[];
  
  // Alertes (indépendantes du score)
  hasAlerts: boolean;
  alertMessages: string[];
  
  // Interprétation automatique
  interpretation: {
    mainReasons: string[];
    recommendation: 'maintain' | 'adapt' | 'lighten' | 'postpone';
    recommendationLabel: string;
    recommendationExplanation: string;
  };
  
  // Incohérences détectées
  inconsistencies: string[];
  
  // Version athlète (vulgarisé)
  athleteMessage: string;
  
  // Disclaimer
  disclaimer: string;
  
  // Tendance (si données historiques)
  trend?: 'improving' | 'stable' | 'worsening' | null;
  trendLabel?: string | null;
}

// =============================================
// CONSTANTES OFFICIELLES TFCL™
// =============================================

export const DISPONIBILITE_PHILOSOPHY = {
  concept: `La Disponibilité TFCL™ mesure une CAPACITÉ À S'ENGAGER 
DANS UNE CHARGE DE QUALITÉ À L'INSTANT T.

Elle ne prétend PAS mesurer une vérité physiologique absolue.`,
  
  disclaimer: `La Disponibilité TFCL™ ne donne jamais un ordre.
Elle éclaire une décision.`,
  
  formula: `CAS A — Données objectives disponibles :
Disponibilité = (Score_Objectif × 0.6) + (Score_Subjectif × 0.4)

CAS B — Pas de données objectives :
Disponibilité = (Score_Subjectif × 0.7) + (Charge_déclarée × 0.3)`,
  
  athleteExplanation: `La disponibilité TFCL indique à quel point ton corps 
est prêt aujourd'hui à encaisser une séance de qualité.
Elle combine ton ressenti et certains indicateurs objectifs quand ils sont disponibles.
Ce n'est pas un jugement, mais une aide à la décision.`
};

export const DISPONIBILITE_SCALE = {
  high: {
    min: 70, max: 100,
    label: "Élevée",
    color: 'success' as const,
    emoji: '🟢',
    message: "Disponibilité maximale. Toutes les séances envisageables."
  },
  moderate: {
    min: 50, max: 70,
    label: "Modérée",
    color: 'info' as const,
    emoji: '🟡',
    message: "Disponibilité acceptable. Adapter si nécessaire."
  },
  low: {
    min: 30, max: 50,
    label: "Faible",
    color: 'warning' as const,
    emoji: '🟠',
    message: "Disponibilité réduite. Privilégier récupération active."
  },
  critical: {
    min: 0, max: 30,
    label: "Critique",
    color: 'destructive' as const,
    emoji: '🔴',
    message: "Reporter les séances exigeantes. Priorité récupération."
  }
};

export const CONFIDENCE_LEVELS = {
  high: {
    label: "Élevée",
    message: "Questionnaire complet + données objectives stables"
  },
  medium: {
    label: "Moyenne",
    message: "Questionnaire seul OU données partielles"
  },
  low: {
    label: "Faible",
    message: "Questionnaire incomplet ou incohérent"
  }
};

export const RECOMMENDATION_LABELS = {
  maintain: {
    label: "Maintenir",
    explanation: "Pas de modification nécessaire. Suivre le plan prévu."
  },
  adapt: {
    label: "Adapter",
    explanation: "Ajustement mineur conseillé. Réduire volume ou intensité."
  },
  lighten: {
    label: "Alléger",
    explanation: "Alléger significativement. Privilégier récupération active."
  },
  postpone: {
    label: "Reporter",
    explanation: "Reporter la séance clé. Priorité absolue à la récupération."
  }
};

// =============================================
// HELPERS
// =============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function getLevel(score: number): DisponibiliteLevel {
  if (score >= 70) return 'high';
  if (score >= 50) return 'moderate';
  if (score >= 30) return 'low';
  return 'critical';
}

function getLevelInfo(level: DisponibiliteLevel) {
  return DISPONIBILITE_SCALE[level];
}

function getConfidenceLevel(
  subjectiveComplete: boolean,
  objectiveAvailable: boolean,
  hasInconsistencies: boolean
): DisponibiliteConfidence {
  if (subjectiveComplete && objectiveAvailable && !hasInconsistencies) {
    return 'high';
  }
  if (subjectiveComplete && !hasInconsistencies) {
    return 'medium';
  }
  return 'low';
}

function getRecommendation(
  score: number,
  hasAlerts: boolean
): 'maintain' | 'adapt' | 'lighten' | 'postpone' {
  if (hasAlerts) return 'postpone';
  if (score >= 70) return 'maintain';
  if (score >= 50) return 'adapt';
  if (score >= 30) return 'lighten';
  return 'postpone';
}

// =============================================
// CALCUL SCORE SUBJECTIF (0-100)
// =============================================

function computeSubjectiveScore(input: TFCLReadinessInput): {
  score: number;
  details: Record<string, number>;
  warnings: string[];
  isComplete: boolean;
} {
  const fields = ['sleep', 'fatigue', 'soreness', 'stress', 'motivation'] as const;
  const details: Record<string, number> = {};
  const warnings: string[] = [];
  
  let total = 0;
  let count = 0;
  
  for (const field of fields) {
    const value = input[field];
    if (value !== null && value !== undefined) {
      details[field] = value;
      total += value;
      count++;
    }
  }
  
  // Détection d'incohérences
  if (input.motivation !== null && input.fatigue !== null) {
    // Motivation élevée (>7) mais fatigue très élevée (<4)
    // Note: fatigue scale is inverted: low = tired, high = fresh
    if (input.motivation > 7 && input.fatigue < 4) {
      warnings.push("Motivation élevée malgré une fatigue importante — incohérence possible");
    }
  }
  
  if (input.sleep !== null && input.fatigue !== null) {
    // Bon sommeil (>7) mais très fatigué (<3)
    if (input.sleep > 7 && input.fatigue < 3) {
      warnings.push("Bon sommeil mais fatigue persistante — surcharge possible");
    }
  }
  
  const isComplete = count === fields.length;
  const score = count > 0 ? (total / (count * 10)) * 100 : 0;
  
  return { score: clamp(score, 0, 100), details, warnings, isComplete };
}

// =============================================
// CALCUL SCORE OBJECTIF (0-100)
// =============================================

function computeObjectiveScore(input: TFCLReadinessInput): {
  score: number | null;
  available: boolean;
  sources: string[];
  deviations: string[];
} {
  const objective = input.objective;
  if (!objective) {
    return { score: null, available: false, sources: [], deviations: [] };
  }
  
  const sources: string[] = [];
  const deviations: string[] = [];
  const scoreComponents: number[] = [];
  
  // RHR vs baseline
  if (objective.rhrCurrent != null && objective.rhrBaseline != null) {
    sources.push("FC repos");
    const deviation = ((objective.rhrCurrent - objective.rhrBaseline) / objective.rhrBaseline) * 100;
    
    if (deviation > 10) {
      deviations.push(`FC repos +${deviation.toFixed(0)}% vs baseline`);
      // Pénalité proportionnelle
      scoreComponents.push(Math.max(0, 100 - deviation * 3));
    } else if (deviation > 5) {
      deviations.push(`FC repos légèrement élevée (+${deviation.toFixed(0)}%)`);
      scoreComponents.push(80);
    } else {
      scoreComponents.push(100);
    }
  }
  
  // HRV vs baseline
  if (objective.hrvCurrent != null && objective.hrvBaseline != null) {
    sources.push("HRV");
    const deviation = ((objective.hrvBaseline - objective.hrvCurrent) / objective.hrvBaseline) * 100;
    
    if (deviation > 15) {
      deviations.push(`HRV -${deviation.toFixed(0)}% vs baseline`);
      scoreComponents.push(Math.max(0, 100 - deviation * 2));
    } else if (deviation > 8) {
      deviations.push(`HRV légèrement réduite (-${deviation.toFixed(0)}%)`);
      scoreComponents.push(75);
    } else {
      scoreComponents.push(100);
    }
  }
  
  // TSS 7d vs target
  if (objective.tss7d != null && objective.tssTarget != null) {
    sources.push("Charge 7j");
    const ratio = objective.tss7d / objective.tssTarget;
    
    if (ratio > 1.3) {
      deviations.push(`Surcharge (+${((ratio - 1) * 100).toFixed(0)}% vs cible)`);
      scoreComponents.push(Math.max(30, 100 - (ratio - 1) * 80));
    } else if (ratio > 1.15) {
      deviations.push(`Charge élevée (+${((ratio - 1) * 100).toFixed(0)}%)`);
      scoreComponents.push(70);
    } else if (ratio < 0.7) {
      // Sous-charge = OK pour disponibilité
      scoreComponents.push(95);
    } else {
      scoreComponents.push(90);
    }
  }
  
  if (scoreComponents.length === 0) {
    return { score: null, available: false, sources, deviations };
  }
  
  const avgScore = scoreComponents.reduce((a, b) => a + b, 0) / scoreComponents.length;
  
  return {
    score: clamp(avgScore, 0, 100),
    available: true,
    sources,
    deviations,
  };
}

// =============================================
// CALCUL CHARGE DÉCLARÉE (fallback)
// =============================================

function getDeclaredLoadScore(load: 'light' | 'moderate' | 'heavy' | null): number {
  switch (load) {
    case 'light': return 90;
    case 'moderate': return 70;
    case 'heavy': return 45;
    default: return 60; // Neutre si non renseigné
  }
}

// =============================================
// FONCTION PRINCIPALE
// =============================================

export function computeDisponibiliteTFCL(input: TFCLReadinessInput): DisponibiliteTFCL {
  // 1. Score subjectif
  const subjective = computeSubjectiveScore(input);
  
  // 2. Score objectif
  const objective = computeObjectiveScore(input);
  
  // 3. Alertes (indépendantes du score)
  const alertMessages: string[] = [];
  if (input.alerts?.joint_pain) {
    alertMessages.push("⚠️ Douleur articulaire inhabituelle signalée");
  }
  if (input.alerts?.illness) {
    alertMessages.push("⚠️ Sensation de maladie / fièvre signalée");
  }
  if (input.alerts?.asymmetric_pain) {
    alertMessages.push("⚠️ Douleur asymétrique persistante signalée");
  }
  const hasAlerts = alertMessages.length > 0;
  
  // 4. Calcul du score final
  let finalScore: number;
  const weights: { objective: number; subjective: number; declaredLoad?: number } = {
    objective: 0,
    subjective: 0,
  };
  
  if (objective.available && objective.score !== null) {
    // CAS A — Données objectives disponibles
    weights.objective = 0.6;
    weights.subjective = 0.4;
    finalScore = (objective.score * 0.6) + (subjective.score * 0.4);
  } else {
    // CAS B — Pas de données objectives
    weights.subjective = 0.7;
    weights.declaredLoad = 0.3;
    const loadScore = getDeclaredLoadScore(input.declaredLoad ?? null);
    finalScore = (subjective.score * 0.7) + (loadScore * 0.3);
  }
  
  // Clamp final
  finalScore = clamp(Math.round(finalScore), 0, 100);
  
  // 5. Confiance
  const confidence = getConfidenceLevel(
    subjective.isComplete,
    objective.available,
    subjective.warnings.length > 0
  );
  
  // 6. Niveau et interprétation
  const level = getLevel(finalScore);
  const levelInfo = getLevelInfo(level);
  const recommendation = getRecommendation(finalScore, hasAlerts);
  
  // 7. Raisons principales
  const mainReasons: string[] = [];
  
  if (subjective.details.fatigue !== undefined && subjective.details.fatigue < 5) {
    mainReasons.push("Fatigue générale élevée");
  }
  if (subjective.details.sleep !== undefined && subjective.details.sleep < 5) {
    mainReasons.push("Qualité de sommeil insuffisante");
  }
  if (subjective.details.stress !== undefined && subjective.details.stress < 5) {
    mainReasons.push("Stress mental/professionnel élevé");
  }
  if (subjective.details.soreness !== undefined && subjective.details.soreness < 5) {
    mainReasons.push("Douleurs musculaires/tendineuses");
  }
  if (objective.deviations.length > 0) {
    mainReasons.push(...objective.deviations);
  }
  if (mainReasons.length === 0 && level === 'high') {
    mainReasons.push("Tous les indicateurs au vert");
  }
  
  // 8. Sources utilisées
  const sourcesUsed: string[] = ["Questionnaire subjectif"];
  if (objective.available) {
    sourcesUsed.push(...objective.sources);
  }
  if (!objective.available && input.declaredLoad) {
    sourcesUsed.push("Charge déclarée");
  }
  
  // 9. Incohérences
  const inconsistencies = [...subjective.warnings];
  
  // 10. Message athlète
  const athleteMessage = generateAthleteMessage(level, mainReasons, hasAlerts);
  
  return {
    score: finalScore,
    level,
    levelLabel: levelInfo.label,
    levelEmoji: levelInfo.emoji,
    levelDescription: levelInfo.message,
    confidence,
    confidenceLabel: CONFIDENCE_LEVELS[confidence].label,
    confidenceExplanation: CONFIDENCE_LEVELS[confidence].message,
    breakdown: {
      subjective: {
        score: Math.round(subjective.score),
        details: subjective.details,
        warnings: subjective.warnings,
      },
      objective: {
        available: objective.available,
        score: objective.score !== null ? Math.round(objective.score) : null,
        sources: objective.sources,
        deviations: objective.deviations,
      },
    },
    weights,
    sourcesUsed,
    hasAlerts,
    alertMessages,
    interpretation: {
      mainReasons,
      recommendation,
      recommendationLabel: RECOMMENDATION_LABELS[recommendation].label,
      recommendationExplanation: RECOMMENDATION_LABELS[recommendation].explanation,
    },
    inconsistencies,
    athleteMessage,
    disclaimer: DISPONIBILITE_PHILOSOPHY.disclaimer,
    trend: null,
    trendLabel: null,
  };
}

// =============================================
// MESSAGE ATHLÈTE (vulgarisé)
// =============================================

function generateAthleteMessage(
  level: DisponibiliteLevel,
  reasons: string[],
  hasAlerts: boolean
): string {
  if (hasAlerts) {
    return `⚠️ Alerte détectée. Indépendamment de ton score, un signal d'alerte a été identifié. Consulte ton coach avant toute séance exigeante.`;
  }
  
  switch (level) {
    case 'high':
      return `🟢 Tu es prêt à t'engager pleinement. Ta disponibilité est optimale pour une séance de qualité.`;
    case 'moderate':
      return `🟡 Ta disponibilité est correcte. Tu peux t'entraîner mais reste à l'écoute de ton corps. Une adaptation peut être pertinente.`;
    case 'low':
      return `🟠 Ta disponibilité est réduite aujourd'hui${reasons.length > 0 ? ` (${reasons.slice(0, 2).join(', ')})` : ''}. Privilégie une séance légère ou de récupération active.`;
    case 'critical':
      return `🔴 Ta disponibilité est très faible. Reporter les séances exigeantes serait probablement plus bénéfique que forcer. La récupération est prioritaire.`;
  }
}

// =============================================
// HELPERS UI
// =============================================

export function getDisponibiliteColor(level: DisponibiliteLevel): string {
  switch (level) {
    case 'high': return 'text-green-500';
    case 'moderate': return 'text-yellow-500';
    case 'low': return 'text-orange-500';
    case 'critical': return 'text-red-500';
  }
}

export function getDisponibiliteBgColor(level: DisponibiliteLevel): string {
  switch (level) {
    case 'high': return 'bg-green-500/10';
    case 'moderate': return 'bg-yellow-500/10';
    case 'low': return 'bg-orange-500/10';
    case 'critical': return 'bg-red-500/10';
  }
}

export function getDisponibiliteBadgeClass(level: DisponibiliteLevel): string {
  switch (level) {
    case 'high': return 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30';
    case 'moderate': return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30';
    case 'low': return 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30';
    case 'critical': return 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30';
  }
}

export function getConfidenceBadgeClass(confidence: DisponibiliteConfidence): string {
  switch (confidence) {
    case 'high': return 'bg-green-500/20 text-green-700 dark:text-green-400';
    case 'medium': return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
    case 'low': return 'bg-orange-500/20 text-orange-700 dark:text-orange-400';
  }
}

// =============================================
// ACADEMY MODULE
// =============================================

export const ACADEMY_DISPONIBILITE_MODULE = {
  id: 'disponibilite-tfcl',
  title: 'Tirer des décisions avec la Disponibilité TFCL',
  description: 'Comprendre, lire et utiliser la Disponibilité TFCL™ pour guider les décisions d\'entraînement.',
  icon: '🎯',
  chapters: [
    {
      id: 'pourquoi-pas-parfait',
      title: 'Pourquoi la disponibilité n\'est jamais un chiffre parfait',
      content: `## La réalité de la mesure

La Disponibilité TFCL™ combine des données subjectives (questionnaire) et objectives (FC repos, HRV, charge).

**Aucune de ces mesures n'est parfaite :**
- Le questionnaire dépend de l'honnêteté et de l'introspection
- La FC repos varie selon l'heure, la température, la position
- La HRV est sensible à de nombreux facteurs externes
- La charge TSS ne capture pas tous les stress de la vie

**TFCL assume cette incertitude** en affichant toujours un niveau de confiance 
et en privilégiant des plages plutôt que des valeurs uniques.`,
      keyPoints: [
        'Aucune mesure physiologique n\'est absolue',
        'Le niveau de confiance guide l\'interprétation',
        'La tendance compte plus qu\'une valeur isolée'
      ]
    },
    {
      id: 'ressenti-compte',
      title: 'Pourquoi le ressenti compte',
      content: `## Le ressenti n'est pas "subjectif" au sens péjoratif

La recherche montre que le ressenti de l'athlète (fatigue perçue, motivation) 
est souvent un meilleur prédicteur de performance que les métriques objectives seules.

**Études clés :**
- Saw et al. (2016) : les mesures subjectives détectent les changements 
  d'état avant les mesures objectives
- Halson (2014) : le questionnaire de récupération est validé scientifiquement

**Le questionnaire TFCL** utilise des ancres standardisées (0-10) 
pour réduire la variabilité inter-individuelle.`,
      keyPoints: [
        'Le ressenti est validé scientifiquement',
        'Il détecte souvent les problèmes avant les métriques',
        'Les ancres standardisées améliorent la fiabilité'
      ]
    },
    {
      id: 'lire-confiance',
      title: 'Comment lire le niveau de confiance',
      content: `## Trois niveaux de confiance

| Niveau | Signification | Action |
|--------|---------------|--------|
| **Élevée** | Questionnaire complet + données objectives stables | Suivre la recommandation |
| **Moyenne** | Questionnaire seul OU données partielles | Croiser avec ressenti terrain |
| **Faible** | Questionnaire incomplet ou incohérent | Prudence accrue, dialogue coach |

**Règle TFCL :** Ne jamais forcer une décision quand la confiance est faible.`,
      keyPoints: [
        'Confiance élevée = données cohérentes et complètes',
        'Confiance faible = prudence obligatoire',
        'Le coach reste décisionnaire final'
      ]
    },
    {
      id: 'eviter-surinterpreation',
      title: 'Éviter les erreurs de surinterprétation',
      content: `## Erreurs courantes

❌ **"Mon score est 65, c'est moins bien qu'hier à 68"**
→ Une variation de 3-5 points est dans la marge d'erreur. Regardez la tendance sur plusieurs jours.

❌ **"Score élevé = je peux tout faire"**
→ La disponibilité indique une capacité, pas une obligation. Respectez le plan.

❌ **"Score faible = je suis nul"**
→ Ce n'est pas un jugement. C'est une information pour adapter.

❌ **"J'ignore les alertes car mon score est bon"**
→ Les alertes (douleur, maladie) sont indépendantes et prioritaires.`,
      keyPoints: [
        'Ne pas comparer des valeurs proches',
        'Suivre les tendances, pas les points isolés',
        'Les alertes sont toujours prioritaires'
      ]
    },
    {
      id: 'disponibilite-vs-performance',
      title: 'Disponibilité vs Performance potentielle',
      content: `## Deux concepts différents

| Disponibilité | Performance potentielle |
|---------------|------------------------|
| État du jour | Capacité maximale |
| Variable | Plus stable |
| "Peux-tu t'engager ?" | "Quel est ton potentiel ?" |

**Un athlète peut avoir :**
- Haute disponibilité + potentiel modeste (frais mais en construction)
- Faible disponibilité + haut potentiel (fatigué après un bloc de charge)

**La disponibilité guide le "quand", pas le "combien".`,
      keyPoints: [
        'Disponibilité = capacité à absorber une charge',
        'Performance = capacité maximale construite',
        'Les deux évoluent sur des temporalités différentes'
      ]
    }
  ]
};

// =============================================
// PDF EXPORT SECTION
// =============================================

export const PDF_DISPONIBILITE_SECTION = {
  title: 'Disponibilité & Décision',
  subtitle: 'Évaluation de la capacité d\'engagement',
  disclaimer: 'Indice de disponibilité – non assimilé à une mesure physiologique directe',
  content: [
    {
      heading: 'Définition',
      text: `La Disponibilité TFCL™ mesure la capacité à s'engager dans une charge de qualité à l'instant T. Elle combine ressenti subjectif et données objectives quand disponibles.`
    },
    {
      heading: 'Interprétation',
      text: `Ce score éclaire une décision mais ne la remplace pas. Le coach reste maître de la décision finale en intégrant le contexte complet de l'athlète.`
    }
  ]
};
