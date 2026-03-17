/**
 * TWO FOR COACHING LAB METHOD™ — Charte Coach
 * 
 * Document officiel destiné aux coachs, staffs et professionnels.
 * Définit comment lire, utiliser et communiquer les analyses.
 * 
 * Accessible depuis :
 * - Academy (module obligatoire)
 * - Rapports PDF staff-grade
 * - Dashboard en mode staff
 */

import { METHOD_VERSION_DISPLAY } from './scientificGovernance';

// ============================================
// 1️⃣ RÔLE DU COACH
// ============================================

export const COACH_ROLE = {
  id: 'role',
  title: "Rôle du Coach",
  icon: "👨‍🏫",
  officialText: `Two For Coaching Lab est un outil d'aide à la décision.
Le coach reste responsable de l'analyse finale, des choix d'entraînement et de leur mise en œuvre.`,
  responsibilities: [
    {
      id: "context",
      label: "Le contexte",
      description: "Âge, historique, blessures, vie personnelle"
    },
    {
      id: "interpretation",
      label: "L'interprétation des modèles",
      description: "Comprendre et contextualiser les données"
    },
    {
      id: "progression",
      label: "La progression à long terme",
      description: "Vision globale au-delà des indicateurs instantanés"
    }
  ]
};

// ============================================
// 2️⃣ COMMENT LIRE LES DONNÉES
// ============================================

export const DATA_READING_RULES = {
  id: 'reading',
  title: "Comment lire les données",
  icon: "📖",
  rules: [
    {
      number: 1,
      title: "Toujours commencer par les données mesurées",
      items: ["FTP / VMA / PMA", "Poids", "Tests terrain ou labo"],
      emphasis: "Ces données sont la base de toute décision."
    },
    {
      number: 2,
      title: "Les données modélisées servent à orienter, pas à trancher",
      items: ["VLamax estimée", "TTE estimé", "Scores composites"],
      emphasis: "Elles indiquent des tendances, jamais des certitudes."
    },
    {
      number: 3,
      title: "Toujours lire l'indice de confiance",
      items: [],
      emphasis: "Une valeur sans confiance n'a pas de sens décisionnel."
    }
  ]
};

// ============================================
// 3️⃣ UTILISATION DES SCORES
// ============================================

export const SCORES_USAGE = {
  id: 'scores',
  title: "Utilisation des scores",
  icon: "📊",
  scoresAre: [
    "Ne sont pas des notes scolaires",
    "Ne sont pas comparables entre athlètes",
    "Servent à suivre une évolution intra-athlète"
  ],
  examples: ["Potentiel Physiologique", "Performance", "Risque"],
  forbidden: [
    {
      action: "Comparer deux athlètes uniquement via un score",
      reason: "Chaque profil est unique et contextuel"
    },
    {
      action: "Communiquer un score sans expliquer ce qu'il représente",
      reason: "Risque de mauvaise interprétation"
    }
  ]
};

// ============================================
// 4️⃣ UTILISATION DU VLAMAX
// ============================================

export const VLAMAX_USAGE = {
  id: 'vlamax',
  title: "Utilisation du VLamax",
  icon: "⚡",
  vlamaxIs: [
    "Un indicateur de profil énergétique",
    "Un levier stratégique",
    "Jamais un objectif isolé"
  ],
  rules: [
    {
      rule: "Toujours interpréter le VLamax en lien avec :",
      items: ["L'objectif (IM / 70.3 / CAP)", "Le TTE (durabilité)", "L'économie de course/pédalage"]
    },
    {
      rule: "Ne jamais chercher à 'baisser le VLamax' sans stratégie globale",
      items: ["Un VLamax bas n'est pas toujours souhaitable", "Le contexte de l'objectif prime"]
    }
  ],
  warning: "Le VLamax est un outil de compréhension, pas un objectif en soi."
};

// ============================================
// 5️⃣ UTILISATION DU TTE
// ============================================

export const TTE_USAGE = {
  id: 'tte',
  title: "Utilisation du TTE",
  icon: "⏱️",
  tteRepresents: [
    "La durabilité à une intensité donnée",
    "La capacité à maintenir une performance utile"
  ],
  rules: [
    {
      text: "Le TTE est plus déterminant que la VO2max pour les épreuves longues",
      importance: "critical"
    },
    {
      text: "Un TTE faible impose des adaptations de volume / structure",
      importance: "high"
    },
    {
      text: "Le TTE estimé doit être confirmé par le terrain",
      importance: "medium"
    }
  ],
  keyInsight: "Sur Ironman, un TTE élevé compense souvent un profil métabolique moins favorable."
};

// ============================================
// 6️⃣ FATIGUE & RISQUE
// ============================================

export const FATIGUE_RISK_USAGE = {
  id: 'fatigue',
  title: "Fatigue & Risque",
  icon: "⚠️",
  fatigueStatement: {
    is: "Un indicateur de vigilance",
    isNot: "Une interdiction d'entraînement"
  },
  staffRule: "Une fatigue élevée impose une réflexion, pas une annulation automatique.",
  injuryRisk: {
    statement: "Le risque blessure CAP doit primer sur toute logique de progression rapide.",
    implication: "Justifie un ajustement même si les indicateurs de performance sont bons."
  },
  guidelines: [
    {
      level: "Fatigue faible",
      action: "Charge normale, surveiller la progression",
      color: "green"
    },
    {
      level: "Fatigue modérée",
      action: "Évaluer le contexte, ajuster si nécessaire",
      color: "yellow"
    },
    {
      level: "Fatigue élevée",
      action: "Réflexion obligatoire, allègement probable",
      color: "orange"
    },
    {
      level: "Fatigue critique",
      action: "Récupération prioritaire, risque de blessure",
      color: "red"
    }
  ]
};

// ============================================
// 7️⃣ RACE READINESS
// ============================================

export const RACE_READINESS_USAGE = {
  id: 'race_readiness',
  title: "Potentiel Physiologique",
  icon: "🏁",
  servesTo: [
    "Vérifier la cohérence globale",
    "Anticiper les dérives métaboliques",
    "Ajuster la stratégie de course"
  ],
  doesNotServeTo: [
    "Valider un plan à l'aveugle",
    "Promettre une performance",
    "Rassurer artificiellement un athlète"
  ],
  interpretation: {
    high: "Indicateurs alignés, risques identifiés et maîtrisés",
    medium: "Certains points d'attention, ajustements possibles",
    low: "Incohérences significatives, révision recommandée"
  }
};

// ============================================
// 8️⃣ COMMUNICATION AVEC L'ATHLÈTE
// ============================================

export const ATHLETE_COMMUNICATION = {
  id: 'communication',
  title: "Communication avec l'athlète",
  icon: "💬",
  recommendations: [
    "Expliquer les plages, pas les valeurs uniques",
    "Toujours contextualiser les résultats",
    "Rappeler les limites du modèle",
    "Utiliser un langage accessible"
  ],
  phraseRecommended: {
    template: "Selon les données actuelles et leur niveau de confiance, la tendance est…",
    examples: [
      "Selon les données actuelles, votre profil suggère une bonne durabilité pour l'objectif visé.",
      "La tendance indique un léger risque de fatigue si le volume augmente trop rapidement.",
      "Votre progression ces 4 semaines montre une amélioration de la durabilité estimée."
    ]
  },
  phraseToAvoid: {
    template: "L'app dit que…",
    why: "Déresponsabilise le coach et sur-valorise l'outil",
    alternatives: [
      "L'analyse suggère que…",
      "Les indicateurs montrent que…",
      "Selon notre évaluation…"
    ]
  }
};

// ============================================
// 9️⃣ TESTS LABO & LIMITES
// ============================================

export const LAB_TESTS_LIMITS = {
  id: 'lab_tests',
  title: "Tests labo & Limites",
  icon: "🔬",
  recommendLabTestIf: [
    {
      trigger: "Les estimations deviennent incohérentes",
      example: "FTP progresse mais TTE chute"
    },
    {
      trigger: "L'enjeu de performance est élevé",
      example: "Qualification Ironman, objectif podium"
    },
    {
      trigger: "L'athlète stagne malgré un entraînement cohérent",
      example: "Plateau > 8 semaines sans explication"
    },
    {
      trigger: "Des doutes métaboliques persistent",
      example: "Profil énergétique difficile à cerner"
    }
  ],
  doesNotReplace: [
    "Un test lactate (mesure directe)",
    "Un test VO2max de référence",
    "Un suivi médical",
    "Un bilan sanguin ou hormonal"
  ],
  positioning: "Two For Coaching Lab est complémentaire au laboratoire, jamais substitutif."
};

// ============================================
// 🔟 RESPONSABILITÉ PROFESSIONNELLE
// ============================================

export const PROFESSIONAL_RESPONSIBILITY = {
  id: 'responsibility',
  title: "Responsabilité professionnelle",
  icon: "📜",
  officialText: `Le coach utilisant Two For Coaching Lab s'engage à utiliser l'outil comme support d'analyse,
et non comme système automatique de prescription.`,
  commitments: [
    {
      id: "analysis_support",
      label: "Support d'analyse",
      description: "Utiliser l'outil pour éclairer, pas pour décider"
    },
    {
      id: "human_judgment",
      label: "Jugement humain",
      description: "Toujours appliquer son expertise personnelle"
    },
    {
      id: "athlete_safety",
      label: "Sécurité de l'athlète",
      description: "Prioriser la santé sur la performance"
    },
    {
      id: "continuous_learning",
      label: "Formation continue",
      description: "Se tenir informé des évolutions de la méthode"
    }
  ],
  signature: `En utilisant Two For Coaching Lab en mode Staff, je reconnais avoir lu et accepté cette charte.`
};

// ============================================
// DOCUMENT COMPLET
// ============================================

export interface CoachCharterSection {
  id: string;
  title: string;
  icon: string;
  content: unknown;
}

export const COACH_CHARTER = {
  title: "Charte Coach",
  subtitle: "Two For Coaching Lab Method™",
  version: METHOD_VERSION_DISPLAY,
  purpose: "Guide d'utilisation officiel pour les coachs et professionnels",
  sections: [
    { id: 'role', title: COACH_ROLE.title, icon: COACH_ROLE.icon, content: COACH_ROLE },
    { id: 'reading', title: DATA_READING_RULES.title, icon: DATA_READING_RULES.icon, content: DATA_READING_RULES },
    { id: 'scores', title: SCORES_USAGE.title, icon: SCORES_USAGE.icon, content: SCORES_USAGE },
    { id: 'vlamax', title: VLAMAX_USAGE.title, icon: VLAMAX_USAGE.icon, content: VLAMAX_USAGE },
    { id: 'tte', title: TTE_USAGE.title, icon: TTE_USAGE.icon, content: TTE_USAGE },
    { id: 'fatigue', title: FATIGUE_RISK_USAGE.title, icon: FATIGUE_RISK_USAGE.icon, content: FATIGUE_RISK_USAGE },
    { id: 'race_readiness', title: RACE_READINESS_USAGE.title, icon: RACE_READINESS_USAGE.icon, content: RACE_READINESS_USAGE },
    { id: 'communication', title: ATHLETE_COMMUNICATION.title, icon: ATHLETE_COMMUNICATION.icon, content: ATHLETE_COMMUNICATION },
    { id: 'lab_tests', title: LAB_TESTS_LIMITS.title, icon: LAB_TESTS_LIMITS.icon, content: LAB_TESTS_LIMITS },
    { id: 'responsibility', title: PROFESSIONAL_RESPONSIBILITY.title, icon: PROFESSIONAL_RESPONSIBILITY.icon, content: PROFESSIONAL_RESPONSIBILITY }
  ] as CoachCharterSection[]
};

// ============================================
// ACADEMY MODULE
// ============================================

export const ACADEMY_COACH_CHARTER_MODULE = {
  id: "coach_charter",
  title: "Charte Coach – Two For Coaching Lab Method™",
  icon: "📋",
  description: "Formation obligatoire pour l'utilisation du mode Staff",
  isRequired: true,
  estimatedTime: "15 min",
  chapters: [
    {
      id: "role",
      title: "Votre rôle de coach",
      content: COACH_ROLE.officialText,
      keyPoints: COACH_ROLE.responsibilities.map(r => r.label)
    },
    {
      id: "reading",
      title: "Lire les données correctement",
      content: DATA_READING_RULES.rules.map(r => `Règle ${r.number}: ${r.title}`).join('\n'),
      keyPoints: DATA_READING_RULES.rules.map(r => r.emphasis)
    },
    {
      id: "metrics",
      title: "Utiliser les métriques clés",
      content: "VLamax, TTE et scores composites : comment les interpréter correctement.",
      keyPoints: [
        "VLamax = profil énergétique, pas objectif",
        "TTE = durabilité, déterminant pour le long",
        "Scores = évolution intra-athlète"
      ]
    },
    {
      id: "risk",
      title: "Gérer fatigue et risques",
      content: FATIGUE_RISK_USAGE.staffRule,
      keyPoints: [
        "Fatigue = vigilance, pas interdiction",
        "Risque blessure prime sur progression"
      ]
    },
    {
      id: "communication",
      title: "Communiquer avec l'athlète",
      content: "Comment présenter les analyses sans sur-valoriser l'outil.",
      keyPoints: ATHLETE_COMMUNICATION.recommendations
    },
    {
      id: "limits",
      title: "Connaître les limites",
      content: LAB_TESTS_LIMITS.positioning,
      keyPoints: LAB_TESTS_LIMITS.doesNotReplace
    },
    {
      id: "commitment",
      title: "Engagement professionnel",
      content: PROFESSIONAL_RESPONSIBILITY.officialText,
      keyPoints: PROFESSIONAL_RESPONSIBILITY.commitments.map(c => c.label)
    }
  ],
  quiz: [
    {
      question: "Le VLamax estimé doit être considéré comme :",
      options: [
        "Une valeur absolue à atteindre",
        "Un indicateur de profil énergétique à contextualiser",
        "Une note de performance",
        "Un objectif d'entraînement isolé"
      ],
      correctIndex: 1
    },
    {
      question: "Quand une fatigue élevée est affichée, le coach doit :",
      options: [
        "Annuler automatiquement la séance",
        "Ignorer l'indicateur",
        "Réfléchir au contexte et ajuster si nécessaire",
        "Augmenter la charge pour habituer l'athlète"
      ],
      correctIndex: 2
    },
    {
      question: "Pour communiquer avec l'athlète, il est recommandé de dire :",
      options: [
        "L'app dit que vous êtes fatigué",
        "Selon les données actuelles, la tendance montre...",
        "Votre score est de 72/100",
        "Le système a décidé que..."
      ],
      correctIndex: 1
    }
  ]
};

// ============================================
// PDF SECTION
// ============================================

export const PDF_COACH_CHARTER_SECTION = {
  title: "Charte Coach — Rappel méthodologique",
  content: [
    {
      heading: "Rôle du coach",
      text: COACH_ROLE.officialText
    },
    {
      heading: "Lecture des données",
      text: "Les données mesurées (FTP, VMA, poids) sont la base. Les données modélisées (VLamax, TTE) orientent sans trancher. L'indice de confiance est obligatoire pour toute décision."
    },
    {
      heading: "Responsabilité",
      text: PROFESSIONAL_RESPONSIBILITY.officialText
    }
  ],
  footer: `Document généré avec Two For Coaching Lab Method™ ${METHOD_VERSION_DISPLAY}`
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Retourne une section de la charte par son ID
 */
export function getCharterSection(sectionId: string): CoachCharterSection | undefined {
  return COACH_CHARTER.sections.find(s => s.id === sectionId);
}

/**
 * Retourne le texte officiel du rôle du coach
 */
export function getCoachRoleText(): string {
  return COACH_ROLE.officialText;
}

/**
 * Retourne les règles de lecture des données
 */
export function getDataReadingRules(): typeof DATA_READING_RULES.rules {
  return DATA_READING_RULES.rules;
}

/**
 * Retourne la phrase recommandée pour la communication
 */
export function getRecommendedPhrase(): string {
  return ATHLETE_COMMUNICATION.phraseRecommended.template;
}

/**
 * Retourne la phrase à éviter
 */
export function getPhraseToAvoid(): string {
  return ATHLETE_COMMUNICATION.phraseToAvoid.template;
}

/**
 * Retourne le texte de responsabilité professionnelle
 */
export function getProfessionalResponsibilityText(): string {
  return PROFESSIONAL_RESPONSIBILITY.officialText;
}

/**
 * Vérifie si un coach a complété le module Academy de la charte
 */
export function hasCompletedCharterModule(completedModules: string[]): boolean {
  return completedModules.includes(ACADEMY_COACH_CHARTER_MODULE.id);
}

/**
 * Génère le résumé pour PDF
 */
export function generateCharterPdfSummary(): string {
  return PDF_COACH_CHARTER_SECTION.content.map(c => `${c.heading}\n${c.text}`).join('\n\n');
}
