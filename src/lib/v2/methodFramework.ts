/**
 * TWO FOR COACHING LAB METHOD™ — Cadre Officiel Consolidé
 * 
 * Ce module unifie et formalise la méthode comme cadre scientifique,
 * pédagogique et opérationnel unique de l'application.
 * 
 * Structure officielle :
 * A) Ce qui est MESURÉ
 * B) Ce qui est MODÉLISÉ
 * C) Ce qui est CONSEILLÉ
 * 
 * Sert de référence unique pour :
 * - Dashboard
 * - Rapports PDF
 * - Academy
 * - Chatbot
 * - Communication externe
 */

import { METHOD_VERSION_DISPLAY } from './scientificGovernance';

// ============================================
// 1️⃣ POSITIONNEMENT OFFICIEL
// ============================================

export const METHOD_OFFICIAL_POSITIONING = {
  id: 'positioning',
  title: "Positionnement Officiel",
  icon: "🎯",
  
  statement: `Two For Coaching Lab™ est un système d'aide à la décision
fondé sur la physiologie de l'endurance moderne.
Il ne remplace ni un coach, ni un test laboratoire,
mais permet de structurer des décisions cohérentes
à partir de données terrain contextualisées.`,

  shortStatement: "Système d'aide à la décision fondé sur la physiologie de l'endurance moderne.",
  
  coreValues: [
    "Décisions cohérentes basées sur des données",
    "Transparence sur les sources et la confiance",
    "Le coach reste décisionnaire final"
  ]
};

// ============================================
// 2️⃣ STRUCTURE OFFICIELLE - 3 PILIERS
// ============================================

export type DataPillar = 'measured' | 'modeled' | 'advised';

export interface PillarDefinition {
  id: DataPillar;
  title: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
  officialText: string;
  items: {
    id: string;
    label: string;
    description?: string;
  }[];
}

// ===== A) CE QUI EST MESURÉ =====

export const PILLAR_MEASURED: PillarDefinition = {
  id: 'measured',
  title: "Ce qui est MESURÉ",
  icon: "📏",
  color: "text-green-600 dark:text-green-400",
  bgColor: "bg-green-100 dark:bg-green-900/30",
  description: "Données factuelles issues de capteurs ou de tests terrain/labo",
  
  officialText: `Les données mesurées sont considérées comme factuelles
dans les limites de leur protocole.`,
  
  items: [
    { id: 'ftp', label: 'FTP / Puissances terrain', description: 'Mesure directe via capteur de puissance' },
    { id: 'hr', label: 'Fréquence cardiaque', description: 'Capteur cardiaque (ceinture/optique)' },
    { id: 'pace', label: 'Vitesse / Allure', description: 'GPS ou capteur de vitesse' },
    { id: 'cadence', label: 'Cadence', description: 'Capteur pédalier ou foulée' },
    { id: 'weight', label: 'Poids corporel', description: 'Balance' },
    { id: 'lab_data', label: 'Données labo importées', description: 'Tests laboratoire (si présents)' },
    { id: 'hr_max', label: 'FC max', description: 'Mesurée ou issue de test' },
    { id: 'vma', label: 'VMA', description: 'Test terrain ou labo' }
  ]
};

// ===== B) CE QUI EST MODÉLISÉ =====

export const PILLAR_MODELED: PillarDefinition = {
  id: 'modeled',
  title: "Ce qui est MODÉLISÉ",
  icon: "🧬",
  color: "text-amber-600 dark:text-amber-400",
  bgColor: "bg-amber-100 dark:bg-amber-900/30",
  description: "Estimations physiologiques issues de modèles scientifiques validés",
  
  officialText: `Ces valeurs sont des estimations physiologiques
basées sur des modèles reconnus (Mader, Heck, Lorang-like),
bornées, contextualisées et assorties d'un indice de confiance.`,
  
  items: [
    { id: 'vlamax', label: 'VLamax effectif', description: 'Modèle vélo et CAP' },
    { id: 'tte', label: 'TTE effectif', description: 'Time To Exhaustion estimé' },
    { id: 'ifsc', label: 'IFSC™', description: 'Indice de Force Spécifique Cycliste' },
    { id: 'economy', label: 'Économie CAP', description: 'Si données renseignées' },
    { id: 'fatigue', label: 'Fatigue quantifiée', description: 'Basée sur charge récente' },
    { id: 'nutrition', label: 'Nutrition prédictive', description: 'Besoins glucidiques estimés' },
    { id: 'injury_risk', label: 'Risque blessure', description: 'Estimation CAP' },
    { id: 'metabolic_profile', label: 'Profil métabolique', description: 'Classification glycolytique/lipolytique' }
  ]
};

// ===== C) CE QUI EST CONSEILLÉ =====

export const PILLAR_ADVISED: PillarDefinition = {
  id: 'advised',
  title: "Ce qui est CONSEILLÉ",
  icon: "💡",
  color: "text-blue-600 dark:text-blue-400",
  bgColor: "bg-blue-100 dark:bg-blue-900/30",
  description: "Recommandations et aides à la décision pour le coach",
  
  officialText: `Aucune recommandation n'est automatique.
La décision finale appartient toujours au coach et à l'athlète.`,
  
  items: [
    { id: 'race_readiness', label: 'Race Readiness', description: 'Indice de préparation course' },
    { id: 'annotations', label: 'Annotations templates', description: 'Notes sur les séances type' },
    { id: 'wahoo_reco', label: 'Recommandations Wahoo/Zwift', description: 'Suggestions séances' },
    { id: 'alerts', label: 'Alertes fatigue/blessure', description: 'Avertissements contextuels' },
    { id: 'nutrition_reco', label: 'Suggestions nutritionnelles', description: 'Recommandations course' },
    { id: 'cadence_ranges', label: 'Plages de cadence', description: 'Zones de travail suggérées' },
    { id: 'training_levers', label: 'Leviers d\'entraînement', description: 'Priorités selon profil' }
  ]
};

export const METHOD_PILLARS: PillarDefinition[] = [
  PILLAR_MEASURED,
  PILLAR_MODELED,
  PILLAR_ADVISED
];

// ============================================
// 3️⃣ FIN DES OBJECTIFS ABSOLUS
// ============================================

export type RangeCategory = 'realistic' | 'ambitious' | 'improbable';

export interface PerformanceRange {
  category: RangeCategory;
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

export const PERFORMANCE_RANGES: PerformanceRange[] = [
  {
    category: 'realistic',
    label: 'Plage réaliste',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    description: 'Objectif atteignable avec entraînement cohérent'
  },
  {
    category: 'ambitious',
    label: 'Plage ambitieuse',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    description: 'Objectif exigeant, nécessite conditions optimales'
  },
  {
    category: 'improbable',
    label: 'Plage improbable',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    description: 'Objectif hors de portée dans le contexte actuel'
  }
];

export const RANGE_RULE = {
  id: 'range_rule',
  title: "Règle des Plages",
  icon: "📊",
  
  statement: `SUPPRIMER toute cible unique (ex: FTP = 4.8 W/kg)
REMPLACER par des plages contextualisées.`,
  
  justificationFactors: [
    { id: 'age', label: 'Âge', description: 'Impact sur potentiel et récupération' },
    { id: 'vlamax', label: 'VLamax', description: 'Profil métabolique' },
    { id: 'tte', label: 'TTE', description: 'Durabilité actuelle' },
    { id: 'volume', label: 'Volume', description: 'Historique de charge' },
    { id: 'history', label: 'Historique', description: 'Progression passée' }
  ],
  
  example: {
    metric: 'FTP/kg',
    wrong: '4.8 W/kg',
    correct: {
      realistic: '4.2 – 4.5 W/kg',
      ambitious: '4.5 – 4.8 W/kg',
      improbable: '> 5.0 W/kg'
    }
  }
};

// ============================================
// 4️⃣ SCORES → PLAGES + CONFIANCE
// ============================================

export interface ScoreDisplayRule {
  id: string;
  rule: string;
  example: string;
}

export const SCORE_DISPLAY_RULES: ScoreDisplayRule[] = [
  {
    id: 'range',
    rule: 'Afficher une plage, pas un point unique',
    example: '62–68 / 100'
  },
  {
    id: 'confidence',
    rule: 'Toujours inclure un indice de confiance',
    example: '(confiance 72%)'
  },
  {
    id: 'context',
    rule: 'Ajouter une phrase explicative',
    example: '"Comment lire ce score : ..."'
  }
];

export const SCORE_DISPLAY_FORMAT = {
  template: '{metric} : {min}–{max} / {scale} (confiance {confidence}%)',
  example: 'Performance métabolique : 62–68 / 100 (confiance 72%)',
  
  requiredElements: [
    'Valeur ou plage',
    'Échelle de référence',
    'Indice de confiance',
    'Source (mesuré/modélisé)'
  ]
};

// ============================================
// 5️⃣ RÈGLE UI DASHBOARD
// ============================================

export const DASHBOARD_UI_RULE = {
  id: 'dashboard_rule',
  title: "Règle d'Affichage Dashboard",
  icon: "📱",
  
  statement: `Aucun chiffre n'est affiché sans :
• Source (mesuré / modélisé)
• Confiance
• Contexte`,
  
  requiredBadges: [
    { id: 'source', label: 'Source', values: ['Mesuré', 'Modélisé', 'Conseillé'] },
    { id: 'confidence', label: 'Confiance', values: ['Très fiable', 'Fiable', 'Modéré', 'Faible'] },
    { id: 'context', label: 'Contexte', values: ['Date', 'Objectif', 'Sport'] }
  ],
  
  forbidden: [
    'Chiffre sans source',
    'Valeur unique sans plage',
    'Score sans explication'
  ]
};

// ============================================
// 6️⃣ PAGE RAPPORT PDF
// ============================================

export const PDF_INTRO_PAGE = {
  id: 'pdf_intro',
  title: "Comment lire ce rapport",
  icon: "📄",
  
  sections: [
    {
      id: 'limits',
      title: "Limites",
      content: [
        "Les valeurs modélisées sont des estimations, pas des mesures",
        "La confiance varie selon la qualité des données d'entrée",
        "Contexte sportif et fatigue influencent les résultats"
      ]
    },
    {
      id: 'hypotheses',
      title: "Hypothèses",
      content: [
        "Données de capteurs considérées comme fiables",
        "Modèles calibrés sur population d'endurance",
        "Objectif correctement renseigné"
      ]
    },
    {
      id: 'coach_role',
      title: "Rôle du Coach",
      content: [
        "Interpréter les données en contexte",
        "Croiser avec observations terrain",
        "Prendre la décision finale"
      ]
    },
    {
      id: 'warning',
      title: "Avertissement Scientifique",
      content: [
        "Two For Coaching Lab™ est un outil d'aide à la décision",
        "Il ne remplace pas l'expertise d'un coach qualifié",
        "Les recommandations doivent être adaptées à chaque athlète"
      ]
    }
  ],
  
  footer: METHOD_OFFICIAL_POSITIONING.statement
};

// ============================================
// 7️⃣ MODULE ACADEMY
// ============================================

export const ACADEMY_METHOD_FRAMEWORK = {
  id: "method_framework",
  title: "Comprendre la méthode Two For Coaching Lab™",
  icon: "🎓",
  description: "Le cadre scientifique et opérationnel de l'application",
  isRequired: true,
  estimatedTime: "20 min",
  
  chapters: [
    {
      id: "positioning",
      title: "Positionnement officiel",
      content: METHOD_OFFICIAL_POSITIONING.statement,
      keyPoints: METHOD_OFFICIAL_POSITIONING.coreValues
    },
    {
      id: "measure_vs_model",
      title: "Mesurer vs Modéliser",
      content: `Une donnée mesurée est factuelle dans les limites de son protocole.
Une donnée modélisée est une estimation issue d'un modèle scientifique.
Distinguer les deux est essentiel pour une interprétation correcte.`,
      keyPoints: [
        "Mesuré = capteur ou test direct",
        "Modélisé = estimation par calcul",
        "Toujours vérifier la source"
      ]
    },
    {
      id: "uncertainty",
      title: "Incertitude physiologique",
      content: `Aucun modèle n'est parfait. L'indice de confiance quantifie cette incertitude.
Une confiance de 80% signifie que 20% de l'information reste incertaine.`,
      keyPoints: [
        "Confiance = qualité de l'estimation",
        "Plus les données sont précises, plus la confiance est haute",
        "Toujours considérer la plage, pas le point"
      ]
    },
    {
      id: "coach_interpretation",
      title: "Interprétation coach",
      content: `Le coach reste le décisionnaire final. L'application fournit des données et des recommandations,
mais c'est le coach qui connaît l'athlète, le contexte et les contraintes.`,
      keyPoints: [
        "L'app aide, elle ne décide pas",
        "Croiser avec le terrain",
        "Adapter à chaque athlète"
      ]
    },
    {
      id: "common_errors",
      title: "Erreurs fréquentes",
      content: "Évitez ces pièges courants lors de l'interprétation des données.",
      keyPoints: [
        "❌ Prendre une valeur modélisée pour une mesure",
        "❌ Ignorer l'indice de confiance",
        "❌ Comparer des données de contextes différents",
        "❌ Appliquer une recommandation sans l'adapter",
        "✓ Toujours vérifier source et confiance"
      ]
    }
  ]
};

// ============================================
// 8️⃣ RÈGLES CHATBOT
// ============================================

export const CHATBOT_METHOD_RULES = {
  id: 'chatbot_rules',
  title: "Règles de Réponse Chatbot",
  icon: "💬",
  
  principles: [
    {
      id: 'reference_method',
      rule: "Toujours se référer à la méthode",
      example: "Selon la méthode Two For Coaching Lab™..."
    },
    {
      id: 'cite_source',
      rule: "Citer la source des données",
      example: "Cette valeur est modélisée à partir de..."
    },
    {
      id: 'mention_confidence',
      rule: "Mentionner le niveau de confiance",
      example: "Avec une confiance de 72%..."
    }
  ],
  
  templates: {
    estimated: "Cette valeur est estimée car {reason}.",
    not_measured: "Cette donnée n'a pas été mesurée mais modélisée à partir de {inputs}.",
    recommendation: "Cette recommandation est basée sur {factors}. Le coach reste décisionnaire."
  },
  
  forbidden: [
    "Présenter une estimation comme une certitude",
    "Ignorer la source ou la confiance",
    "Donner une directive sans nuance"
  ]
};

// ============================================
// HELPERS
// ============================================

/**
 * Retourne le pilier correspondant à un type de donnée
 */
export function getPillarForData(dataId: string): PillarDefinition | null {
  for (const pillar of METHOD_PILLARS) {
    if (pillar.items.some(item => item.id === dataId)) {
      return pillar;
    }
  }
  return null;
}

/**
 * Retourne le badge de source pour une donnée
 */
export function getDataSourceBadge(dataId: string): { label: string; color: string; bgColor: string } | null {
  const pillar = getPillarForData(dataId);
  if (!pillar) return null;
  
  return {
    label: pillar.id === 'measured' ? 'Mesuré' : pillar.id === 'modeled' ? 'Modélisé' : 'Conseillé',
    color: pillar.color,
    bgColor: pillar.bgColor
  };
}

/**
 * Formate un score avec plage et confiance
 */
export function formatScoreWithRange(
  metric: string,
  min: number,
  max: number,
  scale: number,
  confidence: number
): string {
  return `${metric} : ${min}–${max} / ${scale} (confiance ${Math.round(confidence * 100)}%)`;
}

/**
 * Détermine la catégorie de plage pour un objectif
 */
export function getRangeCategory(
  current: number,
  target: number,
  variance: number = 0.1
): RangeCategory {
  const ratio = target / current;
  
  if (ratio <= 1 + variance) return 'realistic';
  if (ratio <= 1 + variance * 2.5) return 'ambitious';
  return 'improbable';
}

/**
 * Génère une justification de plage
 */
export function generateRangeJustification(factors: {
  age?: number;
  vlamax?: number;
  tte?: number;
  volumeWeekly?: number;
  yearsTraining?: number;
}): string[] {
  const justifications: string[] = [];
  
  if (factors.age !== undefined) {
    if (factors.age > 45) justifications.push("Âge > 45 ans : potentiel d'amélioration modéré");
    else if (factors.age < 30) justifications.push("Âge < 30 ans : bon potentiel d'adaptation");
  }
  
  if (factors.vlamax !== undefined) {
    if (factors.vlamax > 0.5) justifications.push("VLamax élevé : marge de progression via endurance");
    else if (factors.vlamax < 0.35) justifications.push("VLamax bas : profil déjà optimisé longue distance");
  }
  
  if (factors.tte !== undefined) {
    if (factors.tte < 40) justifications.push("TTE faible : priorité durabilité");
    else if (factors.tte > 55) justifications.push("TTE élevé : bonne base de durabilité");
  }
  
  if (factors.volumeWeekly !== undefined) {
    if (factors.volumeWeekly < 8) justifications.push("Volume hebdo limité : progression contrainte");
    else if (factors.volumeWeekly > 15) justifications.push("Volume hebdo élevé : bon potentiel charge");
  }
  
  return justifications;
}

// ============================================
// DOCUMENT COMPLET
// ============================================

export const METHOD_FRAMEWORK_DOCUMENT = {
  title: "Two For Coaching Lab Method™",
  subtitle: "Cadre Scientifique et Opérationnel",
  version: METHOD_VERSION_DISPLAY,
  
  sections: [
    { id: 'positioning', title: METHOD_OFFICIAL_POSITIONING.title, icon: METHOD_OFFICIAL_POSITIONING.icon, content: METHOD_OFFICIAL_POSITIONING },
    { id: 'measured', title: PILLAR_MEASURED.title, icon: PILLAR_MEASURED.icon, content: PILLAR_MEASURED },
    { id: 'modeled', title: PILLAR_MODELED.title, icon: PILLAR_MODELED.icon, content: PILLAR_MODELED },
    { id: 'advised', title: PILLAR_ADVISED.title, icon: PILLAR_ADVISED.icon, content: PILLAR_ADVISED },
    { id: 'ranges', title: RANGE_RULE.title, icon: RANGE_RULE.icon, content: RANGE_RULE },
    { id: 'scores', title: "Affichage des Scores", icon: "📊", content: SCORE_DISPLAY_RULES },
    { id: 'dashboard', title: DASHBOARD_UI_RULE.title, icon: DASHBOARD_UI_RULE.icon, content: DASHBOARD_UI_RULE },
    { id: 'pdf', title: PDF_INTRO_PAGE.title, icon: PDF_INTRO_PAGE.icon, content: PDF_INTRO_PAGE },
    { id: 'chatbot', title: CHATBOT_METHOD_RULES.title, icon: CHATBOT_METHOD_RULES.icon, content: CHATBOT_METHOD_RULES }
  ]
};
