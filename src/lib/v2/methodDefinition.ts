/**
 * TWO FOR COACHING LAB METHOD™ — Définition Officielle
 * 
 * Section centrale définissant la philosophie, les piliers scientifiques,
 * la structure logique de l'analyse et les limites assumées.
 * 
 * Accessible depuis :
 * - Academy (module central)
 * - Rapports PDF staff-grade
 * - Dashboard en mode staff
 */

import { METHOD_VERSION_DISPLAY } from './scientificGovernance';

// ============================================
// 1️⃣ PHILOSOPHIE GÉNÉRALE
// ============================================

export const METHOD_PHILOSOPHY = {
  id: 'philosophy',
  title: "Philosophie Générale",
  icon: "🧠",
  officialText: `La Two For Coaching Lab Method™ est une méthode d'analyse physiologique appliquée à l'entraînement d'endurance.
Elle vise à aider le coach à prendre de meilleures décisions, en croisant données mesurées, modélisations physiologiques et contexte réel de l'athlète.`,
  fundamentalPrinciples: [
    {
      id: "understand",
      principle: "Comprendre avant d'optimiser",
      description: "L'analyse précède toujours la prescription"
    },
    {
      id: "model",
      principle: "Modéliser sans jamais surinterpréter",
      description: "Les modèles éclairent, ils ne dictent pas"
    },
    {
      id: "advise",
      principle: "Conseiller sans automatiser",
      description: "Le coach reste maître de la décision"
    }
  ]
};

// ============================================
// 2️⃣ STRUCTURE LOGIQUE — 4 NIVEAUX
// ============================================

export interface MethodLevel {
  level: number;
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  description: string;
  examples: string[];
  rule: string;
  badge?: string;
  disclaimer?: string;
}

export const METHOD_LEVELS: MethodLevel[] = [
  {
    level: 1,
    id: "measured",
    title: "Ce qui est MESURÉ",
    subtitle: "Données objectives, base du raisonnement",
    icon: "📊",
    color: "green",
    description: "Les données mesurées sont prioritaires et non discutables. Elles constituent le socle de toute analyse.",
    examples: [
      "FTP / VMA / PMA",
      "Poids / composition corporelle (si disponible)",
      "Fréquence cardiaque max",
      "Tests terrain ou labo",
      "Historique d'entraînement observable"
    ],
    rule: "Ces données sont prioritaires et non discutables.",
    badge: "🟢 Mesuré"
  },
  {
    level: 2,
    id: "modeled",
    title: "Ce qui est MODÉLISÉ",
    subtitle: "Données estimées à partir de modèles validés",
    icon: "🔬",
    color: "orange",
    description: "Les valeurs modélisées sont toujours accompagnées d'une source, d'un indice de confiance et d'une plage de validité.",
    examples: [
      "VLamax estimée (vélo / CAP)",
      "TTE estimé",
      "Économie (CAP si données disponibles)",
      "Indices de fatigue et de risque"
    ],
    rule: "Ces valeurs sont toujours accompagnées d'une source, d'un indice de confiance et d'une plage de validité.",
    badge: "🟠 Modélisé",
    disclaimer: "Cette valeur est une estimation basée sur un modèle. Elle doit être interprétée avec prudence."
  },
  {
    level: 3,
    id: "interpreted",
    title: "Ce qui est INTERPRÉTÉ",
    subtitle: "Lecture physiologique du profil",
    icon: "🎯",
    color: "blue",
    description: "L'interprétation nécessite l'intervention du coach pour contextualiser les données.",
    examples: [
      "Profil énergétique (glycolytique vs aérobie)",
      "Limiteur principal de performance",
      "Cohérence entre objectif, profil et charge",
      "Points forts / points de vigilance"
    ],
    rule: "Cette étape nécessite l'intervention du coach.",
    badge: "🔵 Interprété"
  },
  {
    level: 4,
    id: "advised",
    title: "Ce qui est CONSEILLÉ",
    subtitle: "Recommandations pédagogiques",
    icon: "💡",
    color: "purple",
    description: "L'app propose des pistes, le coach décide de leur pertinence dans le contexte.",
    examples: [
      "Axes de travail prioritaires",
      "Points d'attention (fatigue, blessure, nutrition)",
      "Suggestions de séances / blocs (non prescriptives)",
      "Ajustements potentiels de stratégie"
    ],
    rule: "L'app propose, le coach décide.",
    badge: "🟣 Conseillé"
  }
];

// ============================================
// 3️⃣ PILIERS SCIENTIFIQUES
// ============================================

export const SCIENTIFIC_PILLARS = {
  id: 'pillars',
  title: "Piliers Scientifiques",
  icon: "🏛️",
  description: "La Two For Coaching Lab Method™ s'appuie principalement sur :",
  pillars: [
    {
      id: "physiology",
      name: "Physiologie de l'effort",
      references: ["Mader", "Heck", "Billat", "Seiler"],
      description: "Compréhension des mécanismes énergétiques"
    },
    {
      id: "energy_models",
      name: "Modèles énergétiques",
      references: ["Glycolytique / Aérobie"],
      description: "Équilibre entre les filières énergétiques"
    },
    {
      id: "durability",
      name: "Durabilité de la performance",
      references: ["TTE", "Fatigue resistance"],
      description: "Capacité à maintenir l'effort dans le temps"
    },
    {
      id: "economy",
      name: "Économie de mouvement",
      references: ["Running economy", "Cycling efficiency"],
      description: "Efficience énergétique du geste sportif"
    },
    {
      id: "risk_management",
      name: "Gestion de la fatigue et du risque",
      references: ["TSS/CTL", "Injury prevention"],
      description: "Prévention et récupération"
    }
  ],
  keyStatement: "La performance n'est pas un chiffre isolé mais une interaction dynamique entre capacité, durabilité et contexte."
};

// ============================================
// 4️⃣ POSITIONNEMENT DU VLAMAX
// ============================================

export const VLAMAX_POSITIONING = {
  id: 'vlamax',
  title: "Positionnement du VLamax",
  icon: "⚡",
  usedAs: [
    {
      use: "Un indicateur de profil énergétique",
      description: "Révèle la contribution glycolytique"
    },
    {
      use: "Un levier stratégique",
      description: "Oriente les choix d'entraînement"
    },
    {
      use: "Un facteur de compréhension des besoins",
      description: "Aide à prioriser les axes de travail"
    }
  ],
  neverUsedAs: [
    "Objectif unique à atteindre",
    "Valeur absolue de référence",
    "Indicateur isolé sans lien avec l'objectif de course"
  ],
  methodRule: "Le VLamax n'a de sens que dans le contexte de l'objectif visé et du profil global de l'athlète."
};

// ============================================
// 5️⃣ POSITIONNEMENT DU TTE
// ============================================

export const TTE_POSITIONING = {
  id: 'tte',
  title: "Positionnement du TTE",
  icon: "⏱️",
  consideredAs: [
    "Un indicateur central de performance en endurance",
    "Plus pertinent que la VO2max seule pour les épreuves longues"
  ],
  methodRule: "Une FTP élevée sans durabilité est une performance fragile.",
  implications: [
    {
      context: "Ironman / Ultra",
      importance: "Critique — Le TTE détermine la performance réelle"
    },
    {
      context: "70.3 / Marathon",
      importance: "Élevée — La durabilité fait la différence"
    },
    {
      context: "Sprint / Court",
      importance: "Modérée — La puissance maximale prime"
    }
  ]
};

// ============================================
// 6️⃣ PLAGES RÉALISTES
// ============================================

export const REALISTIC_RANGES = {
  id: 'ranges',
  title: "Plages Réalistes et Non Objectifs Absolus",
  icon: "📈",
  principle: "La méthode rejette les objectifs uniques irréalistes.",
  rangeTypes: [
    {
      id: "realistic",
      name: "Zone réaliste",
      color: "green",
      description: "Objectif atteignable avec un entraînement cohérent"
    },
    {
      id: "ambitious",
      name: "Zone ambitieuse",
      color: "yellow",
      description: "Possible si conditions optimales et progression soutenue"
    },
    {
      id: "elite",
      name: "Zone improbable / élite",
      color: "red",
      description: "Réservée aux profils exceptionnels ou conditions idéales"
    }
  ],
  justifiedBy: [
    "L'âge de l'athlète",
    "Le profil physiologique",
    "L'historique d'entraînement",
    "Le volume accessible"
  ],
  example: {
    metric: "FTP/kg",
    realistic: "3.8 – 4.1 W/kg",
    ambitious: "4.2 – 4.5 W/kg",
    elite: "4.6+ W/kg"
  }
};

// ============================================
// 7️⃣ FATIGUE, RISQUE ET GARDE-FOUS
// ============================================

export const SAFEGUARDS = {
  id: 'safeguards',
  title: "Fatigue, Risque et Garde-fous",
  icon: "🛡️",
  description: "La méthode intègre des garde-fous explicites :",
  safeguards: [
    {
      id: "fatigue",
      name: "Fatigue quantifiée",
      description: "Suivi de la charge et de la récupération"
    },
    {
      id: "injury_risk",
      name: "Risque blessure",
      description: "Notamment en course à pied (CAP)"
    },
    {
      id: "coherence",
      name: "Cohérence charge / profil",
      description: "Adaptation aux capacités réelles"
    }
  ],
  keyStatement: "Optimiser sans protéger conduit à la stagnation ou à la blessure."
};

// ============================================
// 8️⃣ RÔLE CENTRAL DU COACH
// ============================================

export const COACH_CENTRAL_ROLE = {
  id: 'coach_role',
  title: "Rôle Central du Coach",
  icon: "👨‍🏫",
  officialText: `La Two For Coaching Lab Method™ n'automatise jamais la décision.
Elle structure l'analyse, éclaire les choix et sécurise la réflexion du coach.`,
  coachRemains: [
    {
      role: "L'analyste final",
      description: "Synthétise données et contexte"
    },
    {
      role: "Le décideur",
      description: "Choisit les orientations d'entraînement"
    },
    {
      role: "Le garant du contexte humain",
      description: "Intègre vie, stress, historique personnel"
    }
  ]
};

// ============================================
// 9️⃣ LIMITES ASSUMÉES
// ============================================

export const METHOD_LIMITS = {
  id: 'limits',
  title: "Limites Assumées de la Méthode",
  icon: "⚠️",
  limitations: [
    {
      limitation: "Ne remplace pas un test labo",
      when: "Quand une mesure directe est nécessaire"
    },
    {
      limitation: "Ne prédit pas une performance",
      when: "Les conditions de course sont imprévisibles"
    },
    {
      limitation: "Ne prescrit pas un plan clé en main",
      when: "L'individualisation requiert le coach"
    },
    {
      limitation: "Ne s'adapte pas sans données fiables",
      when: "GIGO : Garbage In, Garbage Out"
    }
  ],
  keyStatement: "Une méthode sérieuse assume ses limites."
};

// ============================================
// 🔟 TRAÇABILITÉ ET ÉVOLUTION
// ============================================

export const TRACEABILITY_EVOLUTION = {
  id: 'traceability',
  title: "Traçabilité et Évolution",
  icon: "📋",
  analysisRequirements: [
    "La source des données",
    "Le niveau de confiance",
    "Les hypothèses utilisées"
  ],
  evolutionPrinciples: [
    {
      principle: "Intégration de nouvelles données",
      description: "Tests terrain, retours coach, avancées scientifiques"
    },
    {
      principle: "Mise à jour des modèles",
      description: "Affinement continu basé sur la validation terrain"
    },
    {
      principle: "Validation continue",
      description: "Comparaison modèles vs réalité mesurée"
    }
  ],
  versionStatement: `Méthode versionnée — Version actuelle : ${METHOD_VERSION_DISPLAY}`
};

// ============================================
// DOCUMENT COMPLET
// ============================================

export interface MethodSection {
  id: string;
  title: string;
  icon: string;
  content: unknown;
}

export const METHOD_DEFINITION = {
  title: "Two For Coaching Lab Method™",
  subtitle: "Définition Officielle",
  version: METHOD_VERSION_DISPLAY,
  purpose: "Méthode d'analyse physiologique appliquée à l'entraînement d'endurance",
  sections: [
    { id: 'philosophy', title: METHOD_PHILOSOPHY.title, icon: METHOD_PHILOSOPHY.icon, content: METHOD_PHILOSOPHY },
    { id: 'levels', title: "Structure Logique — 4 Niveaux", icon: "📐", content: METHOD_LEVELS },
    { id: 'pillars', title: SCIENTIFIC_PILLARS.title, icon: SCIENTIFIC_PILLARS.icon, content: SCIENTIFIC_PILLARS },
    { id: 'vlamax', title: VLAMAX_POSITIONING.title, icon: VLAMAX_POSITIONING.icon, content: VLAMAX_POSITIONING },
    { id: 'tte', title: TTE_POSITIONING.title, icon: TTE_POSITIONING.icon, content: TTE_POSITIONING },
    { id: 'ranges', title: REALISTIC_RANGES.title, icon: REALISTIC_RANGES.icon, content: REALISTIC_RANGES },
    { id: 'safeguards', title: SAFEGUARDS.title, icon: SAFEGUARDS.icon, content: SAFEGUARDS },
    { id: 'coach_role', title: COACH_CENTRAL_ROLE.title, icon: COACH_CENTRAL_ROLE.icon, content: COACH_CENTRAL_ROLE },
    { id: 'limits', title: METHOD_LIMITS.title, icon: METHOD_LIMITS.icon, content: METHOD_LIMITS },
    { id: 'traceability', title: TRACEABILITY_EVOLUTION.title, icon: TRACEABILITY_EVOLUTION.icon, content: TRACEABILITY_EVOLUTION }
  ] as MethodSection[]
};

// ============================================
// ACADEMY MODULE
// ============================================

export const ACADEMY_METHOD_MODULE = {
  id: "method_definition",
  title: "La Two For Coaching Lab Method™",
  icon: "🎯",
  description: "Comprendre la philosophie et la structure de la méthode",
  isRequired: true,
  estimatedTime: "20 min",
  chapters: [
    {
      id: "philosophy",
      title: "Philosophie et principes fondateurs",
      content: METHOD_PHILOSOPHY.officialText,
      keyPoints: METHOD_PHILOSOPHY.fundamentalPrinciples.map(p => p.principle)
    },
    {
      id: "levels",
      title: "Les 4 niveaux de lecture",
      content: "Mesuré → Modélisé → Interprété → Conseillé",
      keyPoints: METHOD_LEVELS.map(l => `Niveau ${l.level}: ${l.title}`)
    },
    {
      id: "pillars",
      title: "Piliers scientifiques",
      content: SCIENTIFIC_PILLARS.keyStatement,
      keyPoints: SCIENTIFIC_PILLARS.pillars.map(p => p.name)
    },
    {
      id: "metrics",
      title: "VLamax et TTE dans la méthode",
      content: `${VLAMAX_POSITIONING.methodRule} ${TTE_POSITIONING.methodRule}`,
      keyPoints: [
        "VLamax = profil énergétique, pas objectif",
        "TTE = durabilité, central pour le long",
        "Plages réalistes, pas objectifs absolus"
      ]
    },
    {
      id: "safeguards",
      title: "Garde-fous et limites",
      content: SAFEGUARDS.keyStatement,
      keyPoints: [
        ...SAFEGUARDS.safeguards.map(s => s.name),
        METHOD_LIMITS.keyStatement
      ]
    },
    {
      id: "coach",
      title: "Le rôle du coach",
      content: COACH_CENTRAL_ROLE.officialText,
      keyPoints: COACH_CENTRAL_ROLE.coachRemains.map(r => r.role)
    }
  ]
};

// ============================================
// PDF SECTION
// ============================================

export const PDF_METHOD_SECTION = {
  title: "Two For Coaching Lab Method™",
  subtitle: "Référence méthodologique",
  content: [
    {
      heading: "Philosophie",
      text: METHOD_PHILOSOPHY.officialText
    },
    {
      heading: "Structure d'analyse",
      text: "4 niveaux : Mesuré (🟢) → Modélisé (🟠) → Interprété (🔵) → Conseillé (🟣)"
    },
    {
      heading: "Piliers scientifiques",
      text: SCIENTIFIC_PILLARS.keyStatement
    },
    {
      heading: "Rôle du coach",
      text: COACH_CENTRAL_ROLE.officialText
    },
    {
      heading: "Limites",
      text: METHOD_LIMITS.keyStatement
    }
  ],
  footer: `Two For Coaching Lab Method™ ${METHOD_VERSION_DISPLAY}`
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Retourne un niveau par son ID
 */
export function getMethodLevel(levelId: string): MethodLevel | undefined {
  return METHOD_LEVELS.find(l => l.id === levelId);
}

/**
 * Retourne un niveau par son numéro
 */
export function getMethodLevelByNumber(levelNumber: number): MethodLevel | undefined {
  return METHOD_LEVELS.find(l => l.level === levelNumber);
}

/**
 * Retourne une section par son ID
 */
export function getMethodSection(sectionId: string): MethodSection | undefined {
  return METHOD_DEFINITION.sections.find(s => s.id === sectionId);
}

/**
 * Retourne le texte de philosophie officiel
 */
export function getPhilosophyText(): string {
  return METHOD_PHILOSOPHY.officialText;
}

/**
 * Retourne les principes fondamentaux
 */
export function getFundamentalPrinciples(): typeof METHOD_PHILOSOPHY.fundamentalPrinciples {
  return METHOD_PHILOSOPHY.fundamentalPrinciples;
}

/**
 * Retourne le statement clé scientifique
 */
export function getScientificKeyStatement(): string {
  return SCIENTIFIC_PILLARS.keyStatement;
}

/**
 * Retourne le badge pour un niveau donné
 */
export function getLevelBadge(levelId: string): string | undefined {
  return METHOD_LEVELS.find(l => l.id === levelId)?.badge;
}

/**
 * Retourne la couleur pour un niveau donné
 */
export function getLevelColor(levelId: string): string {
  return METHOD_LEVELS.find(l => l.id === levelId)?.color || 'gray';
}

/**
 * Génère le résumé pour PDF
 */
export function generateMethodPdfSummary(): string {
  return PDF_METHOD_SECTION.content.map(c => `${c.heading}\n${c.text}`).join('\n\n');
}

/**
 * Classifie une donnée selon son niveau
 */
export function classifyData(dataType: 'measured' | 'modeled' | 'interpreted' | 'advised'): MethodLevel | undefined {
  return METHOD_LEVELS.find(l => l.id === dataType);
}
