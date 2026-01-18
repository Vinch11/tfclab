/**
 * TWO FOR COACHING LAB METHOD™ — Déclinaison par Sport
 * 
 * Explique comment interpréter VLamax, TTE, fatigue et risque
 * selon la discipline : vélo, CAP, triathlon.
 * 
 * Accessible depuis :
 * - Academy
 * - Rapports PDF staff-grade
 * - Modules d'analyse (info-bulles contextuelles)
 */

import { METHOD_VERSION_DISPLAY } from './scientificGovernance';

// ============================================
// TYPES
// ============================================

export type SportType = 'cycling' | 'running' | 'triathlon' | 'swimming';

export interface SportContext {
  id: SportType;
  name: string;
  nameShort: string;
  icon: string;
  emoji: string;
}

export const SPORT_CONTEXTS: Record<SportType, SportContext> = {
  cycling: { id: 'cycling', name: 'Cyclisme', nameShort: 'Vélo', icon: '🚴', emoji: '🚴' },
  running: { id: 'running', name: 'Course à pied', nameShort: 'CAP', icon: '🏃', emoji: '🏃' },
  triathlon: { id: 'triathlon', name: 'Triathlon', nameShort: 'Tri', icon: '🏊🚴🏃', emoji: '🏊🚴🏃' },
  swimming: { id: 'swimming', name: 'Natation', nameShort: 'Nat', icon: '🏊', emoji: '🏊' }
};

// ============================================
// 1️⃣ PRINCIPE GÉNÉRAL MULTI-SPORT
// ============================================

export const MULTISPORT_PRINCIPLE = {
  id: 'principle',
  title: "Principe Général Multi-Sport",
  icon: "🌐",
  officialText: `La performance d'endurance ne s'exprime pas de la même manière selon la discipline.
Le même profil physiologique peut être un atout en vélo et un facteur de risque en course à pied.`,
  consequences: [
    {
      id: "weight",
      text: "Les mêmes indicateurs n'ont pas le même poids",
      example: "VLamax élevé : levier stratégique vélo, vigilance CAP"
    },
    {
      id: "effects",
      text: "Les mêmes adaptations ne produisent pas les mêmes effets",
      example: "Volume élevé : gain vélo, risque blessure CAP"
    },
    {
      id: "risks",
      text: "Les mêmes charges n'induisent pas les mêmes risques",
      example: "TSS 800/sem : soutenable vélo, critique CAP"
    }
  ]
};

// ============================================
// 2️⃣ DÉCLINAISON VÉLO 🚴
// ============================================

export const CYCLING_SPECIFICS = {
  id: 'cycling',
  sport: SPORT_CONTEXTS.cycling,
  title: "Déclinaison Vélo",
  
  nature: {
    title: "Nature physiologique dominante",
    characteristics: [
      { label: "Type", value: "Discipline portée" },
      { label: "Charge mécanique", value: "Faible" },
      { label: "Tolérance", value: "Élevée au volume et à l'intensité" }
    ]
  },

  vlamax: {
    title: "Rôle du VLamax en vélo",
    role: "Indicateur central du profil énergétique",
    interpretations: [
      { condition: "VLamax élevé", meaning: "Forte dépendance glucidique", implication: "Attention nutrition longue distance" },
      { condition: "VLamax bas", meaning: "Meilleure économie et durabilité", implication: "Favorable Ironman/Ultra" }
    ],
    appUsage: [
      "Comparaison directe avec l'objectif (IM / 70.3 / CLM)",
      "Levier stratégique prioritaire pour longue distance"
    ],
    weight: "high"
  },

  tte: {
    title: "Rôle du TTE en vélo",
    role: "Indicateur clé de performance soutenable",
    keyPoints: [
      "Plus pertinent que la VO2max seule",
      "Conditionne la capacité à tenir FTP/allure cible"
    ],
    weight: "high"
  },

  specificRisks: {
    title: "Risques spécifiques vélo",
    risks: [
      { risk: "Fatigue centrale", severity: "medium" },
      { risk: "Déplétion glycogénique", severity: "medium" },
      { risk: "Sous-estimation de la récupération", severity: "low" }
    ],
    statement: "En vélo, le risque principal n'est pas la blessure mais la mauvaise gestion de l'intensité et de la durabilité."
  },

  keyInsight: "Le vélo permet d'exprimer pleinement le profil métabolique sans contrainte mécanique majeure."
};

// ============================================
// 3️⃣ DÉCLINAISON COURSE À PIED 🏃
// ============================================

export const RUNNING_SPECIFICS = {
  id: 'running',
  sport: SPORT_CONTEXTS.running,
  title: "Déclinaison Course à Pied",

  nature: {
    title: "Nature physiologique dominante",
    characteristics: [
      { label: "Type", value: "Discipline non portée" },
      { label: "Charge mécanique", value: "Élevée" },
      { label: "Risque structurel", value: "Important (tendons, os, muscles)" }
    ]
  },

  vlamax: {
    title: "Rôle du VLamax en CAP",
    role: "Indicateur indirect",
    interpretations: [
      { condition: "VLamax élevé", meaning: "Pas systématiquement négatif", implication: "Dépend de l'économie et du format" },
      { condition: "VLamax bas", meaning: "Favorable si économie bonne", implication: "Mais pas suffisant seul" }
    ],
    appUsage: [
      "Pondération plus prudente que vélo",
      "Toujours associée à : économie, historique de charge, risque blessure"
    ],
    weight: "medium"
  },

  tte: {
    title: "Rôle du TTE en CAP",
    role: "Indicateur de durabilité au seuil",
    keyPoints: [
      "Important mais secondaire par rapport au risque mécanique",
      "Un TTE élevé sans robustesse augmente le risque"
    ],
    weight: "medium"
  },

  economy: {
    title: "Économie de course (CAP)",
    role: "Paramètre central",
    keyPoints: [
      "À VLamax égal, l'athlète le plus économique performe mieux",
      "Influence directe sur le coût énergétique et la fatigue"
    ],
    weight: "high"
  },

  specificRisks: {
    title: "Risques spécifiques CAP",
    risks: [
      { risk: "Blessure de surcharge", severity: "high" },
      { risk: "Accumulation de fatigue périphérique", severity: "high" },
      { risk: "Incohérence charge / profil", severity: "medium" }
    ],
    statement: "En course à pied, améliorer la performance sans protéger la structure est contre-productif."
  },

  keyInsight: "En CAP, la robustesse prime sur le profil métabolique."
};

// ============================================
// 4️⃣ DÉCLINAISON TRIATHLON 🏊🚴🏃
// ============================================

export const TRIATHLON_SPECIFICS = {
  id: 'triathlon',
  sport: SPORT_CONTEXTS.triathlon,
  title: "Déclinaison Triathlon",

  nature: {
    title: "Logique combinée",
    characteristics: [
      { label: "Vélo", value: "Moteur de la performance" },
      { label: "CAP", value: "Facteur limitant final" },
      { label: "Natation", value: "Gestion de départ" }
    ],
    keyPrinciple: "Le vélo conditionne la course à pied."
  },

  vlamax: {
    title: "Utilisation du VLamax",
    role: "Priorité donnée au profil vélo",
    interpretations: [
      { condition: "VLamax vélo élevé", meaning: "Impact négatif indirect sur CAP", implication: "Via déplétion glycogène précoce" },
      { condition: "VLamax vélo optimisé", meaning: "Préserve les réserves pour T2", implication: "Clé de la performance globale" }
    ],
    appUsage: [
      "Priorité au VLamax vélo",
      "Analyse de l'impact sur la disponibilité glycogénique en T2"
    ],
    weight: "high"
  },

  tte: {
    title: "Utilisation du TTE",
    role: "Évalué principalement sur le vélo",
    keyPoints: [
      "Sert à estimer la capacité à arriver frais en T2",
      "TTE vélo insuffisant → CAP dégradée"
    ],
    weight: "high"
  },

  runAfterBike: {
    title: "CAP post-vélo",
    role: "Lecture prudente obligatoire",
    keyPoints: [
      "Pondération du risque blessure accru",
      "Fatigue cumulée (natation + vélo)",
      "Importance de la robustesse musculaire"
    ]
  },

  specificRisks: {
    title: "Risques spécifiques triathlon",
    risks: [
      { risk: "Blessure CAP sur fatigue vélo", severity: "high" },
      { risk: "Déplétion glycogénique cumulée", severity: "high" },
      { risk: "Surestimation des capacités CAP", severity: "medium" }
    ],
    statement: "En triathlon, une amélioration vélo non maîtrisée peut dégrader la performance globale."
  },

  keyInsight: "Le triathlon se gagne souvent sur la gestion intelligente du vélo, pas sur la CAP."
};

// ============================================
// 5️⃣ CONSÉQUENCES MÉTHODOLOGIQUES
// ============================================

export const METHODOLOGICAL_CONSEQUENCES = {
  id: 'consequences',
  title: "Conséquences Méthodologiques dans l'App",
  icon: "⚙️",
  appMust: [
    {
      action: "Adapter les seuils selon le sport",
      example: "VLamax 0.5 : acceptable vélo, vigilance CAP"
    },
    {
      action: "Afficher des messages différents selon la discipline",
      example: "TTE élevé : positif vélo, nuancer en CAP"
    },
    {
      action: "Pondérer les scores (performance, risque, fatigue)",
      example: "Risque CAP toujours majoré vs vélo"
    },
    {
      action: "Refuser toute lecture générique multi-sport",
      example: "Pas de 'bon/mauvais' sans contexte sport"
    }
  ],
  contextualMessageExample: "Cette valeur est favorable en vélo, mais nécessite prudence en course à pied."
};

// ============================================
// 6️⃣ GARDE-FOUS MULTI-SPORT
// ============================================

export const MULTISPORT_SAFEGUARDS = {
  id: 'safeguards',
  title: "Ce que l'App ne fait pas",
  icon: "🛡️",
  forbidden: [
    {
      rule: "Ne transpose jamais automatiquement un levier d'un sport à l'autre",
      reason: "Les mécanismes physiologiques diffèrent"
    },
    {
      rule: "Ne donne jamais la même recommandation vélo / CAP à partir d'une même valeur",
      reason: "Les implications pratiques divergent"
    },
    {
      rule: "Ne propose jamais une augmentation de charge CAP sans analyse de risque",
      reason: "Le risque structurel est spécifique"
    }
  ]
};

// ============================================
// MESSAGES CONTEXTUELS PAR MÉTRIQUE
// ============================================

export interface SportContextualMessage {
  metric: string;
  sport: SportType;
  condition: string;
  message: string;
  tone: 'positive' | 'neutral' | 'warning' | 'alert';
}

export const CONTEXTUAL_MESSAGES: SportContextualMessage[] = [
  // VLamax
  { metric: 'vlamax', sport: 'cycling', condition: 'high', message: "VLamax élevé → stratégie nutrition et gestion d'allure critique pour longue distance", tone: 'warning' },
  { metric: 'vlamax', sport: 'cycling', condition: 'low', message: "VLamax bas → profil favorable endurance, potentiel Ironman/Ultra", tone: 'positive' },
  { metric: 'vlamax', sport: 'running', condition: 'high', message: "VLamax élevé en CAP → à pondérer avec économie et robustesse", tone: 'neutral' },
  { metric: 'vlamax', sport: 'running', condition: 'low', message: "VLamax bas en CAP → favorable si économie et charge maîtrisées", tone: 'positive' },
  { metric: 'vlamax', sport: 'triathlon', condition: 'high', message: "VLamax vélo élevé → risque de déplétion glycogénique avant T2", tone: 'warning' },
  
  // TTE
  { metric: 'tte', sport: 'cycling', condition: 'high', message: "TTE élevé → excellente durabilité, clé de la performance soutenue", tone: 'positive' },
  { metric: 'tte', sport: 'cycling', condition: 'low', message: "TTE faible → risque de chute de performance en 2ème partie d'effort", tone: 'warning' },
  { metric: 'tte', sport: 'running', condition: 'high', message: "TTE élevé en CAP → vérifier que la robustesse suit", tone: 'neutral' },
  { metric: 'tte', sport: 'running', condition: 'low', message: "TTE faible en CAP → progresser prudemment, risque blessure si forcing", tone: 'alert' },
  { metric: 'tte', sport: 'triathlon', condition: 'low', message: "TTE vélo faible → arrivée en T2 compromise, CAP impactée", tone: 'alert' },
  
  // Fatigue
  { metric: 'fatigue', sport: 'cycling', condition: 'high', message: "Fatigue élevée vélo → récupération recommandée, risque de contre-performance", tone: 'warning' },
  { metric: 'fatigue', sport: 'running', condition: 'high', message: "Fatigue élevée CAP → alerte blessure, allègement prioritaire", tone: 'alert' },
  { metric: 'fatigue', sport: 'triathlon', condition: 'high', message: "Fatigue globale élevée → réviser la planification des deux sports", tone: 'alert' },
  
  // Injury Risk
  { metric: 'injury_risk', sport: 'cycling', condition: 'high', message: "Risque blessure vélo rare mais fatigue centrale possible", tone: 'neutral' },
  { metric: 'injury_risk', sport: 'running', condition: 'high', message: "Risque blessure CAP élevé → réduction de charge impérative", tone: 'alert' },
  { metric: 'injury_risk', sport: 'running', condition: 'medium', message: "Risque blessure CAP modéré → surveiller et adapter", tone: 'warning' },
  { metric: 'injury_risk', sport: 'triathlon', condition: 'high', message: "Risque blessure → privilégier vélo, réduire CAP", tone: 'warning' }
];

// ============================================
// PONDÉRATIONS PAR SPORT
// ============================================

export interface MetricWeight {
  metric: string;
  cycling: number;
  running: number;
  triathlon: number;
}

export const METRIC_WEIGHTS: MetricWeight[] = [
  { metric: 'vlamax', cycling: 1.0, running: 0.7, triathlon: 0.9 },
  { metric: 'tte', cycling: 1.0, running: 0.8, triathlon: 0.95 },
  { metric: 'economy', cycling: 0.6, running: 1.0, triathlon: 0.85 },
  { metric: 'fatigue', cycling: 0.8, running: 1.0, triathlon: 0.9 },
  { metric: 'injury_risk', cycling: 0.4, running: 1.0, triathlon: 0.8 },
  { metric: 'robustness', cycling: 0.5, running: 1.0, triathlon: 0.85 }
];

// ============================================
// DOCUMENT COMPLET
// ============================================

export const SPORT_SPECIFICS_DOCUMENT = {
  title: "Two For Coaching Lab Method™ — Déclinaison par Sport",
  subtitle: "Interprétation contextuelle des indicateurs",
  version: METHOD_VERSION_DISPLAY,
  sections: [
    { id: 'principle', title: MULTISPORT_PRINCIPLE.title, icon: MULTISPORT_PRINCIPLE.icon, content: MULTISPORT_PRINCIPLE },
    { id: 'cycling', title: CYCLING_SPECIFICS.title, icon: CYCLING_SPECIFICS.sport.icon, content: CYCLING_SPECIFICS },
    { id: 'running', title: RUNNING_SPECIFICS.title, icon: RUNNING_SPECIFICS.sport.icon, content: RUNNING_SPECIFICS },
    { id: 'triathlon', title: TRIATHLON_SPECIFICS.title, icon: TRIATHLON_SPECIFICS.sport.icon, content: TRIATHLON_SPECIFICS },
    { id: 'consequences', title: METHODOLOGICAL_CONSEQUENCES.title, icon: METHODOLOGICAL_CONSEQUENCES.icon, content: METHODOLOGICAL_CONSEQUENCES },
    { id: 'safeguards', title: MULTISPORT_SAFEGUARDS.title, icon: MULTISPORT_SAFEGUARDS.icon, content: MULTISPORT_SAFEGUARDS }
  ]
};

// ============================================
// ACADEMY MODULE
// ============================================

export const ACADEMY_SPORT_SPECIFICS_MODULE = {
  id: "sport_specifics",
  title: "Déclinaison par Sport",
  icon: "🏅",
  description: "Comprendre les spécificités vélo, CAP et triathlon",
  isRequired: false,
  estimatedTime: "15 min",
  chapters: [
    {
      id: "principle",
      title: "Principe multi-sport",
      content: MULTISPORT_PRINCIPLE.officialText,
      keyPoints: MULTISPORT_PRINCIPLE.consequences.map(c => c.text)
    },
    {
      id: "cycling",
      title: "Spécificités vélo",
      content: CYCLING_SPECIFICS.specificRisks.statement,
      keyPoints: ["VLamax central", "TTE prioritaire", "Risque = intensité/durabilité"]
    },
    {
      id: "running",
      title: "Spécificités course à pied",
      content: RUNNING_SPECIFICS.specificRisks.statement,
      keyPoints: ["Économie centrale", "Risque blessure prioritaire", "Robustesse avant performance"]
    },
    {
      id: "triathlon",
      title: "Spécificités triathlon",
      content: TRIATHLON_SPECIFICS.specificRisks.statement,
      keyPoints: ["Vélo = moteur", "CAP = limitant", "Gestion glycogène critique"]
    }
  ]
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Retourne le contexte sport
 */
export function getSportContext(sport: SportType): SportContext {
  return SPORT_CONTEXTS[sport];
}

/**
 * Retourne les spécificités d'un sport
 */
export function getSportSpecifics(sport: SportType) {
  switch (sport) {
    case 'cycling': return CYCLING_SPECIFICS;
    case 'running': return RUNNING_SPECIFICS;
    case 'triathlon': return TRIATHLON_SPECIFICS;
    default: return null;
  }
}

/**
 * Retourne un message contextuel pour une métrique et un sport
 */
export function getContextualMessage(metric: string, sport: SportType, condition: string): SportContextualMessage | undefined {
  return CONTEXTUAL_MESSAGES.find(
    m => m.metric === metric && m.sport === sport && m.condition === condition
  );
}

/**
 * Retourne tous les messages contextuels pour une métrique
 */
export function getMessagesForMetric(metric: string): SportContextualMessage[] {
  return CONTEXTUAL_MESSAGES.filter(m => m.metric === metric);
}

/**
 * Retourne la pondération d'une métrique pour un sport
 */
export function getMetricWeight(metric: string, sport: SportType): number {
  const weight = METRIC_WEIGHTS.find(w => w.metric === metric);
  return weight ? weight[sport] : 1.0;
}

/**
 * Applique la pondération sport à une valeur
 */
export function applySpweightToValue(value: number, metric: string, sport: SportType): number {
  const weight = getMetricWeight(metric, sport);
  return value * weight;
}

/**
 * Retourne le statement de risque pour un sport
 */
export function getSportRiskStatement(sport: SportType): string {
  const specifics = getSportSpecifics(sport);
  return specifics?.specificRisks?.statement || '';
}

/**
 * Retourne l'insight clé pour un sport
 */
export function getSportKeyInsight(sport: SportType): string {
  const specifics = getSportSpecifics(sport);
  return specifics?.keyInsight || '';
}

/**
 * Génère un message comparatif entre deux sports
 */
export function generateCrossportMessage(metric: string, value: number, sport1: SportType, sport2: SportType): string {
  const weight1 = getMetricWeight(metric, sport1);
  const weight2 = getMetricWeight(metric, sport2);
  
  if (weight1 > weight2) {
    return `Cette valeur de ${metric} a plus d'impact en ${SPORT_CONTEXTS[sport1].nameShort} qu'en ${SPORT_CONTEXTS[sport2].nameShort}.`;
  } else if (weight2 > weight1) {
    return `Cette valeur de ${metric} a plus d'impact en ${SPORT_CONTEXTS[sport2].nameShort} qu'en ${SPORT_CONTEXTS[sport1].nameShort}.`;
  }
  return `Cette valeur de ${metric} a un impact similaire dans les deux disciplines.`;
}
