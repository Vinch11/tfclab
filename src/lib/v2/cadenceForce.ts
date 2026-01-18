/**
 * TWO FOR COACHING LAB METHOD™ — Cadence, Force et Profil Métabolique
 * 
 * Clarification de la relation entre cadence, force et VLamax.
 * Lève les contradictions apparentes et fournit une lecture staff-grade.
 * 
 * Alimente :
 * - Analyse Two For Coaching Lab (ex-Dan Lorang)
 * - Annotations staff
 * - Chatbot contextuel
 * - Recommandations de séances (force / cadence)
 */

import { METHOD_VERSION_DISPLAY } from './scientificGovernance';

// ============================================
// TYPES
// ============================================

export type CadenceRange = 'high' | 'moderate' | 'low';
export type ForceProfile = 'deficit' | 'balanced' | 'strong';

export interface CadenceInterpretation {
  range: CadenceRange;
  rpmRange: string;
  rpmMin: number;
  rpmMax: number;
  possibleCauses: string[];
  staffInterpretation: string;
  recommendedLever: string;
  warnings?: string[];
}

// ============================================
// 1️⃣ PRINCIPE CLÉ
// ============================================

export const CADENCE_KEY_PRINCIPLE = {
  id: 'principle',
  title: "Principe Clé",
  icon: "🔑",
  officialText: `La cadence observée n'est pas un indicateur direct du profil métabolique.
Elle est une stratégie de compensation mécanique et neuromusculaire.`,
  implications: [
    {
      id: "tactical",
      label: "Choix tactique",
      description: "Cadence élevée comme stratégie consciente"
    },
    {
      id: "habit",
      label: "Habitude acquise",
      description: "Pattern développé au fil des années"
    },
    {
      id: "compensation",
      label: "Compensation d'un déficit",
      description: "Contournement d'une faiblesse de force"
    }
  ],
  warning: "La cadence ne renseigne jamais seule sur le VLamax."
};

// ============================================
// 2️⃣ RELATION VLamax ↔ FORCE ↔ CADENCE
// ============================================

export const VLAMAX_FORCE_CADENCE_RELATION = {
  id: 'relation',
  title: "Relation VLamax ↔ Force ↔ Cadence",
  icon: "🔄",
  
  highVlamaxProfile: {
    title: "Athlète à VLamax élevé",
    characteristics: [
      "Forte capacité glycolytique",
      "Pas nécessairement une force durable par coup de pédale",
      "Fatigue vite sur des couples élevés"
    ],
    behavior: {
      tendency: "Adopte souvent inconsciemment une cadence élevée (90–100 rpm)",
      reasons: [
        "Réduire le couple par coup de pédale",
        "Diminuer la contrainte musculaire locale",
        "'Diluer' la puissance sur plus de cycles"
      ]
    }
  },

  keyConclusion: {
    statement: "Cadence élevée ≠ force élevée",
    clarification: "Cadence élevée peut être le symptôme d'un déficit de force spécifique."
  },

  formula: {
    text: "Puissance = Couple × Cadence",
    implication: "À puissance égale, cadence élevée = couple faible par cycle"
  }
};

// ============================================
// 3️⃣ CAS DES EX-SPRINTEURS
// ============================================

export const EX_SPRINTER_PROFILE = {
  id: 'sprinter',
  title: "Pourquoi c'est fréquent chez les ex-sprinteurs",
  icon: "🏃‍♂️💨",
  
  profile: {
    characteristics: [
      "VLamax élevé (héritage sprint)",
      "Forte puissance instantanée",
      "Faible tolérance au couple prolongé"
    ],
    preferences: [
      "Monter la cadence",
      "Éviter les braquets lourds",
      "Préserver la fraîcheur neuromusculaire"
    ]
  },

  illusion: "Cela crée une illusion de 'vélo en vélocité' alors que la force spécifique est limitée.",
  
  staffNote: "Un ex-sprinteur pédalant à 95 rpm n'a pas forcément un 'bon aérobie'. Il peut compenser un déficit de force par la fréquence."
};

// ============================================
// 4️⃣ CADENCE "IDÉALE" — GARDE-FOUS
// ============================================

export const IDEAL_CADENCE_SAFEGUARDS = {
  id: 'safeguards',
  title: "Cadence 'Idéale' : Ce que l'App peut (et ne peut pas) dire",
  icon: "⚠️",
  
  warning: "Il n'existe pas UNE cadence idéale universelle.",

  canDo: [
    "Proposer des plages de travail pertinentes",
    "Identifier des incohérences entre profil et stratégie",
    "Suggérer des axes d'entraînement adaptés"
  ],

  cannotDo: [
    "Imposer une cadence cible unique",
    "Corriger une cadence sans comprendre la contrainte physiologique",
    "Juger une cadence 'bonne' ou 'mauvaise' hors contexte"
  ]
};

// ============================================
// 5️⃣ PLAGES DE CADENCE — LECTURE STAFF
// ============================================

export const CADENCE_RANGES: CadenceInterpretation[] = [
  {
    range: 'high',
    rpmRange: '>90 rpm',
    rpmMin: 90,
    rpmMax: 120,
    possibleCauses: [
      "Économie neuromusculaire recherchée",
      "Déficit de force par cycle",
      "VLamax élevé mal contrôlé"
    ],
    staffInterpretation: "Peut masquer un déficit de force spécifique. Analyser en lien avec VLamax et TTE.",
    recommendedLever: "Force basse cadence en Z2 / tempo. Travail de couple progressif.",
    warnings: ["Ne pas corriger brutalement", "Comprendre la cause avant d'agir"]
  },
  {
    range: 'moderate',
    rpmRange: '80–88 rpm',
    rpmMin: 80,
    rpmMax: 88,
    possibleCauses: [
      "Bon compromis force / économie",
      "Profil plus durable",
      "Adaptation naturelle longue distance"
    ],
    staffInterpretation: "Zone cible fréquente pour longue distance. Équilibre optimal pour beaucoup d'athlètes.",
    recommendedLever: "Maintenir cet équilibre. Développer la durabilité dans cette plage."
  },
  {
    range: 'low',
    rpmRange: '<80 rpm',
    rpmMin: 50,
    rpmMax: 80,
    possibleCauses: [
      "Forte capacité de couple",
      "Préférence musculaire type force",
      "Habitude de braquet lourd"
    ],
    staffInterpretation: "Profil force, mais attention à la surcharge mécanique. Surveiller les contraintes articulaires.",
    recommendedLever: "Surveillance blessure recommandée. Vélocité occasionnelle pour préserver les articulations.",
    warnings: ["Risque surcharge genoux/hanches", "Vérifier historique blessures"]
  }
];

/**
 * Retourne l'interprétation pour une cadence donnée
 */
export function getCadenceInterpretation(rpm: number): CadenceInterpretation {
  if (rpm >= 90) return CADENCE_RANGES[0]; // high
  if (rpm >= 80) return CADENCE_RANGES[1]; // moderate
  return CADENCE_RANGES[2]; // low
}

// ============================================
// 6️⃣ LIEN AVEC LES RECOMMANDATIONS
// ============================================

export interface CadenceRecommendation {
  condition: {
    vlamaxHigh: boolean;
    cadenceHigh: boolean;
    tteLowOrMedium: boolean;
  };
  recommendation: string;
  explanation: string;
  message: string;
}

export const CADENCE_RECOMMENDATIONS: CadenceRecommendation[] = [
  {
    condition: { vlamaxHigh: true, cadenceHigh: true, tteLowOrMedium: true },
    recommendation: "Travail basse cadence (50–65 rpm) en Z2/Tempo",
    explanation: "L'objectif n'est PAS de 'rouler lent', mais de baisser le coût glycolytique par coup de pédale.",
    message: "Ce travail vise à rendre la puissance moins coûteuse, pas à diminuer la vélocité."
  },
  {
    condition: { vlamaxHigh: true, cadenceHigh: false, tteLowOrMedium: true },
    recommendation: "Maintenir le travail force, développer TTE",
    explanation: "Cadence modérée compatible avec le profil. Focus sur la durabilité.",
    message: "Votre cadence naturelle est cohérente. Priorité : améliorer la durabilité au seuil."
  },
  {
    condition: { vlamaxHigh: false, cadenceHigh: true, tteLowOrMedium: false },
    recommendation: "Pas de correction nécessaire",
    explanation: "Cadence élevée avec VLamax contrôlé et bon TTE : profil cohérent.",
    message: "Votre stratégie de cadence est adaptée à votre profil métabolique."
  }
];

/**
 * Génère une recommandation basée sur le profil
 */
export function generateCadenceRecommendation(
  vlamax: number,
  cadenceRpm: number,
  tte: number
): CadenceRecommendation | null {
  const vlamaxHigh = vlamax > 0.45;
  const cadenceHigh = cadenceRpm > 90;
  const tteLowOrMedium = tte < 45;

  // Cas principal : VLamax élevé + cadence élevée + TTE faible
  if (vlamaxHigh && cadenceHigh && tteLowOrMedium) {
    return CADENCE_RECOMMENDATIONS[0];
  }
  
  // VLamax élevé mais cadence modérée
  if (vlamaxHigh && !cadenceHigh && tteLowOrMedium) {
    return CADENCE_RECOMMENDATIONS[1];
  }

  // Profil optimisé
  if (!vlamaxHigh && cadenceHigh && !tteLowOrMedium) {
    return CADENCE_RECOMMENDATIONS[2];
  }

  return null;
}

// ============================================
// 7️⃣ RÉPONSES CHATBOT
// ============================================

export interface CadenceChatbotQA {
  question: string;
  keywords: string[];
  answer: string;
}

export const CADENCE_CHATBOT_QA: CadenceChatbotQA[] = [
  {
    question: "Pourquoi j'ai une cadence élevée alors que mon VLamax est haut ?",
    keywords: ['cadence élevée', 'vlamax', 'haut', 'élevé', 'pourquoi'],
    answer: `C'est précisément parce que votre VLamax est élevé que vous adoptez naturellement une cadence élevée.

Explication : Avec un VLamax haut, votre système glycolytique est puissant mais vous fatiguez vite sur des couples élevés. Inconsciemment, vous augmentez la cadence pour :
• Réduire le couple par coup de pédale
• Diminuer la contrainte musculaire locale
• Diluer la puissance sur plus de cycles

Ce n'est pas un problème en soi, mais cela peut masquer un déficit de force spécifique. Le travail basse cadence (50-65 rpm) en Z2/Tempo peut vous aider à rendre votre puissance moins "coûteuse" glycolytiquement.`
  },
  {
    question: "Est-ce mauvais de pédaler à 95 rpm ?",
    keywords: ['mauvais', '95 rpm', 'cadence', 'rpm'],
    answer: `Non, pédaler à 95 rpm n'est ni "bon" ni "mauvais" en soi. La cadence n'est pas une qualité, c'est une stratégie.

Ce qu'il faut comprendre :
• 95 rpm peut être optimal si votre profil métabolique le justifie
• 95 rpm peut aussi compenser un déficit de force
• Tout dépend de votre VLamax, TTE et objectif

Two For Coaching Lab n'impose jamais une cadence cible unique. Nous analysons l'équilibre entre force, économie et stratégie métabolique pour vous donner des pistes personnalisées.`
  },
  {
    question: "Pourquoi on me propose du travail à 55 rpm ?",
    keywords: ['55 rpm', 'basse cadence', 'force', 'pourquoi', 'travail'],
    answer: `Le travail basse cadence (55 rpm) vise à développer votre force spécifique par coup de pédale.

Pourquoi ce travail vous est proposé :
• Votre profil suggère une dépendance à la cadence élevée pour produire de la puissance
• Cela peut indiquer un déficit de couple soutenu
• Le but n'est PAS de "rouler lent" ou de changer votre cadence de course

Ce que ce travail apporte :
• Sollicitation accrue des fibres lentes (type I)
• Réduction de la contribution glycolytique par cycle
• Amélioration de l'économie musculaire

Message clé : Ce travail vise à rendre la puissance moins coûteuse, pas à diminuer la vélocité.`
  },
  {
    question: "Quelle est la cadence idéale ?",
    keywords: ['cadence idéale', 'meilleure cadence', 'optimale'],
    answer: `Il n'existe pas UNE cadence idéale universelle.

La cadence optimale dépend de :
• Votre profil métabolique (VLamax)
• Votre capacité de force par cycle
• Votre historique d'entraînement
• Votre objectif (sprint, longue distance, triathlon)

Plages de référence :
• >90 rpm : souvent compensatoire, vérifier la force
• 80-88 rpm : zone cible fréquente longue distance
• <80 rpm : profil force, attention surcharge mécanique

Two For Coaching Lab analyse votre équilibre personnel, pas un chiffre isolé.`
  }
];

/**
 * Trouve une réponse chatbot pour une question
 */
export function findCadenceChatbotAnswer(question: string): CadenceChatbotQA | null {
  const questionLower = question.toLowerCase();
  
  for (const qa of CADENCE_CHATBOT_QA) {
    const matchCount = qa.keywords.filter(kw => questionLower.includes(kw.toLowerCase())).length;
    if (matchCount >= 2) {
      return qa;
    }
  }
  
  return null;
}

// ============================================
// 8️⃣ MESSAGE DE SYNTHÈSE
// ============================================

export const CADENCE_SYNTHESIS = {
  id: 'synthesis',
  title: "Synthèse",
  icon: "📌",
  message: `La cadence n'est pas une qualité en soi.
Elle est le reflet d'un équilibre entre force, économie et stratégie métabolique.
Two For Coaching Lab analyse cet équilibre, pas un chiffre isolé.`
};

// ============================================
// ANNOTATIONS STAFF
// ============================================

export interface CadenceAnnotation {
  profile: string;
  observation: string;
  interpretation: string;
  recommendation: string;
  tone: 'info' | 'caution' | 'action';
}

export function generateCadenceAnnotation(
  vlamax: number,
  cadenceRpm: number,
  tte: number
): CadenceAnnotation {
  const vlamaxHigh = vlamax > 0.45;
  const cadenceHigh = cadenceRpm > 90;
  const cadenceLow = cadenceRpm < 80;
  const tteGood = tte >= 45;

  if (vlamaxHigh && cadenceHigh && !tteGood) {
    return {
      profile: "VLamax élevé + Cadence haute + TTE moyen/faible",
      observation: `Cadence spontanée ${cadenceRpm} rpm avec VLamax ${vlamax.toFixed(2)} mmol/L/s`,
      interpretation: "La cadence élevée compense probablement un déficit de force spécifique. Le coût glycolytique par cycle est dilué mais non réduit.",
      recommendation: "Travail force basse cadence (50-65 rpm) en Z2/Tempo recommandé pour améliorer l'économie par cycle.",
      tone: 'action'
    };
  }

  if (vlamaxHigh && !cadenceHigh && !tteGood) {
    return {
      profile: "VLamax élevé + Cadence modérée + TTE à améliorer",
      observation: `Cadence ${cadenceRpm} rpm cohérente malgré VLamax ${vlamax.toFixed(2)} mmol/L/s`,
      interpretation: "Bonne gestion de la cadence. La force par cycle semble correcte. Focus sur la durabilité.",
      recommendation: "Maintenir l'équilibre actuel. Priorité au développement du TTE.",
      tone: 'info'
    };
  }

  if (cadenceLow) {
    return {
      profile: "Cadence basse naturelle",
      observation: `Cadence spontanée ${cadenceRpm} rpm - profil force`,
      interpretation: "Forte capacité de couple. Profil adapté aux efforts courts/moyens mais attention à la surcharge mécanique.",
      recommendation: "Surveiller les contraintes articulaires. Vélocité occasionnelle pour préserver les articulations.",
      tone: 'caution'
    };
  }

  return {
    profile: "Profil équilibré",
    observation: `Cadence ${cadenceRpm} rpm avec profil métabolique cohérent`,
    interpretation: "Équilibre force/économie/métabolisme correct.",
    recommendation: "Pas de correction nécessaire. Maintenir et développer la durabilité.",
    tone: 'info'
  };
}

// ============================================
// DOCUMENT COMPLET
// ============================================

export const CADENCE_FORCE_DOCUMENT = {
  title: "Cadence, Force et Profil Métabolique",
  subtitle: "Clarification Two For Coaching Lab™",
  version: METHOD_VERSION_DISPLAY,
  sections: [
    { id: 'principle', title: CADENCE_KEY_PRINCIPLE.title, icon: CADENCE_KEY_PRINCIPLE.icon, content: CADENCE_KEY_PRINCIPLE },
    { id: 'relation', title: VLAMAX_FORCE_CADENCE_RELATION.title, icon: VLAMAX_FORCE_CADENCE_RELATION.icon, content: VLAMAX_FORCE_CADENCE_RELATION },
    { id: 'sprinter', title: EX_SPRINTER_PROFILE.title, icon: EX_SPRINTER_PROFILE.icon, content: EX_SPRINTER_PROFILE },
    { id: 'safeguards', title: IDEAL_CADENCE_SAFEGUARDS.title, icon: IDEAL_CADENCE_SAFEGUARDS.icon, content: IDEAL_CADENCE_SAFEGUARDS },
    { id: 'ranges', title: "Plages de Cadence — Lecture Staff", icon: "📊", content: CADENCE_RANGES },
    { id: 'synthesis', title: CADENCE_SYNTHESIS.title, icon: CADENCE_SYNTHESIS.icon, content: CADENCE_SYNTHESIS }
  ]
};

// ============================================
// ACADEMY MODULE
// ============================================

export const ACADEMY_CADENCE_MODULE = {
  id: "cadence_force",
  title: "Cadence & VLamax — Clarification",
  icon: "🔄",
  description: "Comprendre la relation entre cadence, force et profil métabolique",
  isRequired: false,
  estimatedTime: "12 min",
  chapters: [
    {
      id: "principle",
      title: "Le principe clé",
      content: CADENCE_KEY_PRINCIPLE.officialText,
      keyPoints: ["Cadence ≠ indicateur métabolique direct", "C'est une stratégie de compensation"]
    },
    {
      id: "relation",
      title: "VLamax ↔ Force ↔ Cadence",
      content: VLAMAX_FORCE_CADENCE_RELATION.keyConclusion.statement,
      keyPoints: [
        "VLamax élevé → tendance cadence haute",
        "Cadence haute peut masquer déficit force",
        VLAMAX_FORCE_CADENCE_RELATION.keyConclusion.clarification
      ]
    },
    {
      id: "ranges",
      title: "Interpréter les plages de cadence",
      content: "Chaque plage a une signification différente selon le contexte.",
      keyPoints: CADENCE_RANGES.map(r => `${r.rpmRange}: ${r.staffInterpretation.substring(0, 50)}...`)
    },
    {
      id: "recommendations",
      title: "Travail basse cadence : pourquoi ?",
      content: CADENCE_RECOMMENDATIONS[0].message,
      keyPoints: [
        "Objectif : rendre la puissance moins coûteuse",
        "Pas de changement de cadence en course",
        "Développer la force spécifique"
      ]
    }
  ]
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Analyse le profil cadence/force d'un athlète
 */
export function analyzeCadenceForceProfile(
  cadenceRpm: number,
  vlamax: number,
  tte: number
): {
  cadenceRange: CadenceInterpretation;
  forceProfile: ForceProfile;
  recommendation: CadenceRecommendation | null;
  annotation: CadenceAnnotation;
} {
  const cadenceRange = getCadenceInterpretation(cadenceRpm);
  
  // Déterminer le profil force
  let forceProfile: ForceProfile = 'balanced';
  if (cadenceRpm > 90 && vlamax > 0.45) {
    forceProfile = 'deficit';
  } else if (cadenceRpm < 80 && vlamax < 0.4) {
    forceProfile = 'strong';
  }

  const recommendation = generateCadenceRecommendation(vlamax, cadenceRpm, tte);
  const annotation = generateCadenceAnnotation(vlamax, cadenceRpm, tte);

  return {
    cadenceRange,
    forceProfile,
    recommendation,
    annotation
  };
}

/**
 * Retourne le message de synthèse
 */
export function getCadenceSynthesisMessage(): string {
  return CADENCE_SYNTHESIS.message;
}

/**
 * Vérifie si un travail basse cadence est recommandé
 */
export function shouldRecommendLowCadenceWork(
  vlamax: number,
  cadenceRpm: number,
  tte: number
): boolean {
  return vlamax > 0.45 && cadenceRpm > 90 && tte < 45;
}
