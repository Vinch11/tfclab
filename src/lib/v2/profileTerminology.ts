/**
 * TWO FOR COACHING LAB METHOD™ — Terminologie Profil Physiologique
 * 
 * Ce module définit la terminologie officielle pour remplacer "Snapshot"
 * par "Profil Physiologique de Référence".
 * 
 * Objectifs :
 * - Supprimer l'ambiguïté sémantique
 * - Clarifier ce qui est mesuré vs modélisé
 * - Renforcer la crédibilité scientifique
 * - Aligner l'Academy, le rapport PDF et le chatbot
 */

import { METHOD_VERSION_DISPLAY } from './scientificGovernance';

// ============================================
// 1️⃣ NOUVEAU NOM OFFICIEL
// ============================================

export const PROFILE_TERMINOLOGY = {
  /** Nom complet officiel */
  fullName: "Profil Physiologique de Référence",
  
  /** Nom court (UI mobile) */
  shortName: "Profil Référence",
  
  /** Nom très court (badges, tags) */
  miniName: "Profil",
  
  /** Ancien terme (pour migration) */
  legacyName: "Snapshot",
  
  /** Pluriel */
  pluralFull: "Profils Physiologiques de Référence",
  pluralShort: "Profils Référence",
  
  /** Pour les actions */
  actions: {
    create: "Créer un Profil Référence",
    edit: "Modifier le Profil Référence",
    delete: "Supprimer le Profil",
    view: "Voir le Profil",
    compare: "Comparer les Profils",
    export: "Exporter le Profil"
  }
};

// ============================================
// 2️⃣ DÉFINITION OFFICIELLE
// ============================================

export const PROFILE_DEFINITION = {
  id: 'definition',
  title: "Définition Officielle",
  icon: "📋",
  
  officialText: `Le Profil Physiologique de Référence est une photographie structurée de l'état physiologique de l'athlète à un instant donné.
Il combine des données mesurées, estimées et contextualisées.
Il ne représente pas une vérité absolue, mais un point d'appui décisionnel.`,
  
  summary: "Photographie structurée de l'état physiologique à un instant donné.",
  
  keyPoints: [
    "Combine données mesurées et modélisées",
    "Point d'appui décisionnel, pas vérité absolue",
    "Contextualisé par date, source et confiance"
  ]
};

// ============================================
// 3️⃣ STRUCTURE DU PROFIL
// ============================================

export type DataCategory = 'measured' | 'modeled' | 'context';

export interface ProfileDataField {
  id: string;
  label: string;
  category: DataCategory;
  description?: string;
}

export const PROFILE_DATA_CATEGORIES = {
  measured: {
    id: 'measured',
    label: 'Données MESURÉES',
    badge: 'Mesuré',
    badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    icon: '✓',
    description: 'Valeurs directement mesurées ou issues de tests terrain/labo'
  },
  modeled: {
    id: 'modeled',
    label: 'Données MODÉLISÉES',
    badge: 'Estimé / Modélisé',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    icon: '≈',
    description: 'Valeurs estimées par des modèles physiologiques validés'
  },
  context: {
    id: 'context',
    label: 'CONTEXTE',
    badge: 'Contexte',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    icon: 'ℹ',
    description: 'Métadonnées et indices de fiabilité'
  }
};

export const PROFILE_FIELDS: ProfileDataField[] = [
  // Données mesurées
  { id: 'weight_kg', label: 'Poids', category: 'measured' },
  { id: 'fc_max', label: 'FC max', category: 'measured' },
  { id: 'ftp', label: 'FTP', category: 'measured' },
  { id: 'vma', label: 'VMA', category: 'measured' },
  { id: 'vo2max', label: 'VO2max', category: 'measured', description: 'Si mesuré en labo' },
  { id: 'pmax_5s', label: 'Pmax 5s', category: 'measured' },
  { id: 'css', label: 'CSS', category: 'measured' },
  
  // Données modélisées
  { id: 'vlamax', label: 'VLamax', category: 'modeled' },
  { id: 'tte', label: 'TTE (Time To Exhaustion)', category: 'modeled' },
  { id: 'race_readiness', label: 'Race Readiness', category: 'modeled' },
  { id: 'nutrition_indices', label: 'Indices nutritionnels', category: 'modeled' },
  { id: 'glycolytic_risk', label: 'Risque glycolytique', category: 'modeled' },
  { id: 'injury_risk', label: 'Risque blessure', category: 'modeled' },
  { id: 'fatigue', label: 'Fatigue fonctionnelle', category: 'modeled' },
  
  // Contexte
  { id: 'date', label: 'Date', category: 'context' },
  { id: 'source', label: 'Source', category: 'context', description: 'Terrain / Labo / Import PDF' },
  { id: 'confidence', label: 'Indice de confiance global', category: 'context' }
];

// ============================================
// 4️⃣ TEXTE DE GARDE-FOU
// ============================================

export const PROFILE_SAFEGUARD = {
  id: 'safeguard',
  title: "Garde-fou scientifique",
  icon: "⚠️",
  
  mandatory: true,
  
  text: `Les valeurs modélisées sont des estimations issues de modèles validés.
Elles doivent être interprétées avec prudence et croisées avec le terrain.`,
  
  shortText: "Valeurs estimées — à interpréter avec prudence.",
  
  displayLocations: [
    'profile_card_header',
    'pdf_report_header',
    'comparison_view',
    'dashboard_tooltip'
  ]
};

// ============================================
// 5️⃣ CONTENU RAPPORT PDF
// ============================================

export const PDF_PROFILE_SECTION = {
  title: "Comment lire ce Profil Physiologique",
  subtitle: "Two For Coaching Lab Method™",
  
  sections: [
    {
      id: 'reliable',
      title: "Ce qui est FIABLE",
      icon: "✓",
      items: [
        "Données mesurées directement (poids, FC max, FTP, VMA)",
        "Tests labo importés avec protocoles standardisés",
        "Données terrain avec confiance élevée (>80%)"
      ]
    },
    {
      id: 'estimated',
      title: "Ce qui est ESTIMÉ",
      icon: "≈",
      items: [
        "VLamax (sauf mesure lactate directe)",
        "TTE (Time To Exhaustion)",
        "Indices de risque et de fatigue",
        "Recommandations nutritionnelles"
      ],
      note: "Ces valeurs sont issues de modèles physiologiques validés mais comportent une incertitude."
    },
    {
      id: 'decision',
      title: "Ce qui GUIDE la décision",
      icon: "→",
      items: [
        "Croisement des données mesurées et modélisées",
        "Tendance d'évolution entre profils successifs",
        "Cohérence avec les observations terrain",
        "Avis du coach reste prépondérant"
      ]
    }
  ],
  
  footer: PROFILE_SAFEGUARD.text
};

// ============================================
// 6️⃣ ACADEMY MODULE
// ============================================

export const ACADEMY_PROFILE_MODULE = {
  id: "physiological_profile",
  title: "Comprendre le Profil Physiologique de Référence",
  icon: "📊",
  description: "Pourquoi ce terme et comment l'interpréter correctement",
  isRequired: true,
  estimatedTime: "10 min",
  
  chapters: [
    {
      id: "terminology",
      title: "Pourquoi ce terme ?",
      content: `Le terme "Profil Physiologique de Référence" remplace "Snapshot" pour clarifier la nature des données.
      
Un snapshot suggère une capture instantanée parfaite. Or, le profil combine des données mesurées, estimées et contextualisées.
      
Ce nouveau terme reflète mieux la réalité scientifique : c'est un point de référence, pas une vérité absolue.`,
      keyPoints: [
        "Clarification sémantique",
        "Distinction mesuré vs modélisé",
        "Crédibilité scientifique renforcée"
      ]
    },
    {
      id: "structure",
      title: "Structure du profil",
      content: "Le profil est organisé en trois catégories claires.",
      keyPoints: [
        "Données MESURÉES : poids, FC max, FTP, VMA, tests labo",
        "Données MODÉLISÉES : VLamax, TTE, Race Readiness, risques",
        "CONTEXTE : date, source, indice de confiance"
      ]
    },
    {
      id: "limits",
      title: "Limites scientifiques",
      content: PROFILE_SAFEGUARD.text,
      keyPoints: [
        "Les modèles ont une incertitude inhérente",
        "Toujours croiser avec les observations terrain",
        "Le coach reste décisionnaire final"
      ]
    },
    {
      id: "errors",
      title: "Erreurs d'interprétation courantes",
      content: "Évitez ces pièges fréquents lors de la lecture d'un profil.",
      keyPoints: [
        "❌ Considérer une valeur modélisée comme une mesure",
        "❌ Comparer des profils sans tenir compte du contexte",
        "❌ Ignorer l'indice de confiance",
        "✓ Toujours vérifier la source des données"
      ]
    }
  ]
};

// ============================================
// 7️⃣ CHATBOT Q&A
// ============================================

export interface ProfileChatbotQA {
  question: string;
  keywords: string[];
  answer: string;
}

export const PROFILE_CHATBOT_QA: ProfileChatbotQA[] = [
  {
    question: "Pourquoi certaines données sont là alors que je ne les ai pas entrées ?",
    keywords: ['données', 'entrées', 'pas entré', 'apparaissent', 'automatique', 'pourquoi'],
    answer: `Le Profil Physiologique de Référence combine deux types de données :

**Données MESURÉES** (que vous entrez) :
• Poids, FC max, FTP, VMA, tests labo...

**Données MODÉLISÉES** (calculées par l'app) :
• VLamax, TTE, Race Readiness, indices de risque...

Les données modélisées sont estimées à partir de vos données mesurées via des modèles physiologiques validés. Elles apparaissent automatiquement pour enrichir votre analyse.

⚠️ Ces valeurs estimées doivent être interprétées avec prudence et croisées avec vos observations terrain.`
  },
  {
    question: "Est-ce une vraie mesure ?",
    keywords: ['vraie', 'mesure', 'réel', 'fiable', 'précis', 'exact'],
    answer: `Cela dépend de la donnée concernée.

**Données MESURÉES** (badge vert) :
Ce sont des valeurs directement mesurées ou issues de tests. Elles sont considérées comme fiables.
Exemples : poids, FC max, FTP, VMA, tests labo...

**Données MODÉLISÉES** (badge orange) :
Ce sont des estimations issues de modèles physiologiques. Elles comportent une incertitude.
Exemples : VLamax (sauf mesure lactate), TTE, Race Readiness...

Regardez le badge à côté de chaque valeur pour savoir si c'est mesuré ou estimé.`
  },
  {
    question: "Puis-je comparer deux profils ?",
    keywords: ['comparer', 'comparaison', 'évolution', 'deux profils', 'progression'],
    answer: `Oui, vous pouvez comparer des Profils Physiologiques de Référence, mais avec précautions :

**Comparaison valide :**
• Mêmes conditions de mesure (repos, fraîcheur similaire)
• Même source de données (terrain vs labo)
• Intervalle de temps significatif (>4-6 semaines)

**Précautions :**
• Les valeurs modélisées peuvent varier selon les données d'entrée
• L'indice de confiance doit être similaire entre les profils
• Une variation de <5% peut être due à l'incertitude du modèle

**Conseil :** Focalisez-vous sur les tendances générales plutôt que sur les valeurs absolues.`
  },
  {
    question: "Quelle est la différence entre Snapshot et Profil Physiologique ?",
    keywords: ['snapshot', 'différence', 'profil', 'changé', 'renommé'],
    answer: `"Profil Physiologique de Référence" est le nouveau terme officiel, remplaçant "Snapshot".

**Pourquoi ce changement ?**

Le terme "Snapshot" suggérait une capture instantanée parfaite. Or, le profil combine :
• Des données **mesurées** (fiables)
• Des données **modélisées** (estimées)
• Du **contexte** (date, source, confiance)

Le nouveau terme reflète mieux la réalité scientifique : c'est un point de référence pour la prise de décision, pas une vérité absolue.

Cette clarification renforce la crédibilité de l'approche Two For Coaching Lab™.`
  }
];

/**
 * Trouve une réponse chatbot pour une question sur les profils
 */
export function findProfileChatbotAnswer(question: string): ProfileChatbotQA | null {
  const questionLower = question.toLowerCase();
  
  for (const qa of PROFILE_CHATBOT_QA) {
    const matchCount = qa.keywords.filter(kw => questionLower.includes(kw.toLowerCase())).length;
    if (matchCount >= 2) {
      return qa;
    }
  }
  
  return null;
}

// ============================================
// HELPERS
// ============================================

/**
 * Retourne le nom du profil selon l'espace disponible
 */
export function getProfileName(variant: 'full' | 'short' | 'mini' = 'short'): string {
  switch (variant) {
    case 'full':
      return PROFILE_TERMINOLOGY.fullName;
    case 'mini':
      return PROFILE_TERMINOLOGY.miniName;
    default:
      return PROFILE_TERMINOLOGY.shortName;
  }
}

/**
 * Retourne la catégorie de données pour un champ
 */
export function getFieldCategory(fieldId: string): DataCategory | null {
  const field = PROFILE_FIELDS.find(f => f.id === fieldId);
  return field?.category || null;
}

/**
 * Retourne les infos de la catégorie
 */
export function getCategoryInfo(category: DataCategory) {
  return PROFILE_DATA_CATEGORIES[category];
}

/**
 * Retourne le badge approprié pour un champ
 */
export function getFieldBadge(fieldId: string): string {
  const category = getFieldCategory(fieldId);
  if (!category) return '';
  return PROFILE_DATA_CATEGORIES[category].badge;
}

/**
 * Retourne la couleur du badge pour un champ
 */
export function getFieldBadgeColor(fieldId: string): string {
  const category = getFieldCategory(fieldId);
  if (!category) return '';
  return PROFILE_DATA_CATEGORIES[category].badgeColor;
}

// ============================================
// DOCUMENT COMPLET
// ============================================

export const PROFILE_TERMINOLOGY_DOCUMENT = {
  title: "Terminologie Profil Physiologique",
  subtitle: "Two For Coaching Lab Method™",
  version: METHOD_VERSION_DISPLAY,
  sections: [
    { id: 'terminology', title: "Nomenclature", icon: "📝", content: PROFILE_TERMINOLOGY },
    { id: 'definition', title: PROFILE_DEFINITION.title, icon: PROFILE_DEFINITION.icon, content: PROFILE_DEFINITION },
    { id: 'structure', title: "Structure", icon: "🏗️", content: PROFILE_DATA_CATEGORIES },
    { id: 'safeguard', title: PROFILE_SAFEGUARD.title, icon: PROFILE_SAFEGUARD.icon, content: PROFILE_SAFEGUARD },
    { id: 'pdf', title: "Rapport PDF", icon: "📄", content: PDF_PROFILE_SECTION }
  ]
};
