/**
 * TWO FOR COACHING LAB METHOD™ v1.0 — Référentiel Officiel
 * 
 * Document fondateur définissant la philosophie, les fondements scientifiques,
 * les modèles utilisés et leurs limites.
 * 
 * Ce document est la référence unique pour :
 * - Academy
 * - Dashboard
 * - Rapports PDF staff-grade
 * - Toute communication officielle
 */

import { METHOD_VERSION_DISPLAY, METHOD_VERSION_FULL } from './scientificGovernance';

// ============================================
// 1️⃣ INTRODUCTION — POSITIONNEMENT OFFICIEL
// ============================================

export const OFFICIAL_INTRODUCTION = {
  title: "Positionnement Officiel",
  icon: "📋",
  text: `Two For Coaching Lab est un outil d'analyse physiologique et métabolique destiné aux coachs et athlètes d'endurance.
Il ne remplace ni l'expertise humaine ni les tests biologiques lourds.
Il vise à rendre lisible, exploitable et cohérente la complexité physiologique à partir de données accessibles sur le terrain.`
};

// ============================================
// 2️⃣ PHILOSOPHIE FONDATRICE
// ============================================

export const FOUNDING_PHILOSOPHY = {
  title: "Philosophie Fondatrice",
  icon: "🧠",
  centralPrinciple: `La performance n'est pas une valeur absolue, mais un équilibre dynamique entre capacités, contraintes et objectifs.`,
  pillars: [
    {
      id: "physiology",
      name: "Physiologie réelle",
      description: "L'athlète tel qu'il est, pas tel qu'on voudrait qu'il soit"
    },
    {
      id: "durability",
      name: "Durabilité de l'effort",
      description: "Capacité à maintenir la performance dans le temps"
    },
    {
      id: "risk",
      name: "Gestion du risque",
      description: "Fatigue, blessure, dérive métabolique, surentraînement"
    },
    {
      id: "context",
      name: "Contexte de vie",
      description: "Objectifs, contraintes, historique, ambitions"
    }
  ],
  neverDoes: [
    "Imposer un plan d'entraînement",
    "Prédire une performance exacte",
    "Optimiser un seul paramètre au détriment du reste"
  ]
};

// ============================================
// 3️⃣ CE QUI EST MESURÉ (DONNÉES BRUTES)
// ============================================

export const MEASURED_DATA = {
  title: "Ce qui est mesuré",
  icon: "📊",
  subtitle: "Données brutes — Fiabilité maximale",
  badge: "🟢 Mesure directe",
  items: [
    {
      id: "ftp_vma_pma",
      name: "FTP / VMA / PMA",
      description: "Seuils fonctionnels selon le sport (vélo, course, natation)"
    },
    {
      id: "pmax_short",
      name: "Puissance max courte",
      description: "Sprint 5s, 10s, 30s si disponible"
    },
    {
      id: "hr_max",
      name: "Fréquence cardiaque max",
      description: "FC max mesurée ou estimée par l'âge"
    },
    {
      id: "body_composition",
      name: "Poids, taille, composition",
      description: "Données anthropométriques si fournies"
    },
    {
      id: "load_history",
      name: "Historique de charge",
      description: "TSS, durée, volume sur les dernières semaines"
    },
    {
      id: "lab_imports",
      name: "Tests terrain ou labo",
      description: "Données importées depuis tests externes"
    }
  ],
  disclaimer: "Ces données sont considérées comme les plus fiables du système."
};

// ============================================
// 4️⃣ CE QUI EST MODÉLISÉ (ESTIMATIONS)
// ============================================

export const MODELED_DATA = {
  title: "Ce qui est modélisé",
  icon: "🔬",
  subtitle: "Estimations — Interprétation requise",
  badge: "🟠 Estimation modélisée",
  models: [
    {
      id: "vlamax",
      name: "VLamax (vélo & CAP)",
      warning: "Jamais mesurée directement sans lactate",
      estimatedFrom: [
        "Puissance max courte",
        "FTP / seuil fonctionnel",
        "TTE (durabilité)",
        "Ratios de durabilité",
        "Tests terrain standardisés"
      ],
      scientificBasis: "Modèle Mader adapté",
      confidenceRange: "60-85%"
    },
    {
      id: "tte",
      name: "TTE (Time To Exhaustion)",
      warning: "Estimation basée sur la charge et l'historique",
      estimatedFrom: [
        "Charge récente (TSS 7j, 28j)",
        "Historique d'efforts soutenus",
        "Stabilité physiologique",
        "Profil métabolique"
      ],
      scientificBasis: "Modèle Coggan adapté",
      confidenceRange: "65-80%"
    },
    {
      id: "fatigue",
      name: "Fatigue fonctionnelle",
      warning: "Combinaison de signaux objectifs et subjectifs",
      estimatedFrom: [
        "Charge mécanique (puissance, distance)",
        "Charge métabolique (TSS, IF)",
        "Signaux subjectifs (RPE, sommeil, stress)"
      ],
      scientificBasis: "Modèle Banister TSS/CTL adapté",
      confidenceRange: "55-75%"
    },
    {
      id: "nutrition",
      name: "Nutrition prédictive",
      warning: "Estimations prudentes basées sur le profil",
      estimatedFrom: [
        "Profil métabolique (VLamax, VO2max)",
        "Intensité et durée prévues",
        "Tolérance glucidique déclarée"
      ],
      scientificBasis: "Modèles INSCYD/ACSM adaptés",
      confidenceRange: "50-70%"
    },
    {
      id: "running_economy",
      name: "Économie de course",
      warning: "Proxy sans analyse biomécanique directe",
      estimatedFrom: [
        "Ratio vitesse/puissance",
        "Dérive cardiaque en endurance",
        "Historique terrain"
      ],
      scientificBasis: "Corrélations validées",
      confidenceRange: "55-75%"
    }
  ],
  disclaimer: "Ces valeurs sont des estimations probabilistes, jamais des mesures directes."
};

// ============================================
// 5️⃣ INDICES DE CONFIANCE
// ============================================

export const CONFIDENCE_INDICES = {
  title: "Indices de confiance",
  icon: "🎯",
  subtitle: "Transparence sur l'incertitude",
  description: "Chaque valeur modélisée est associée à :",
  components: [
    {
      id: "source",
      name: "Source",
      description: "D'où vient la donnée (terrain, labo, estimation)"
    },
    {
      id: "confidence",
      name: "Niveau de confiance",
      description: "Score de 0 à 100% reflétant la fiabilité"
    },
    {
      id: "explanation",
      name: "Explication pédagogique",
      description: "Pourquoi ce niveau de confiance"
    }
  ],
  rule: "Plus la donnée est mesurée, plus la confiance est élevée. Plus la donnée est estimée, plus l'incertitude est explicitée.",
  levels: [
    { range: "80-100%", label: "Très fiable", color: "green", description: "Mesure directe ou estimation très robuste" },
    { range: "60-79%", label: "Fiable", color: "yellow", description: "Estimation validée avec données suffisantes" },
    { range: "40-59%", label: "Indicatif", color: "orange", description: "Estimation avec données partielles" },
    { range: "0-39%", label: "Exploratoire", color: "red", description: "Hypothèse à confirmer" }
  ]
};

// ============================================
// 6️⃣ SORTIES DE L'APPLICATION
// ============================================

export const APPLICATION_OUTPUTS = {
  title: "Sorties de l'application",
  icon: "📤",
  subtitle: "Plages réalistes, jamais de valeur absolue",
  rule: "Interdire les valeurs uniques absolues. Toutes les recommandations sont exprimées sous forme de plages.",
  formats: [
    {
      id: "ranges",
      name: "Plages réalistes",
      example: "FTP cible : 4,0–4,3 W/kg"
    },
    {
      id: "zones",
      name: "Zones cibles",
      example: "Zone I2 : 220–250W"
    },
    {
      id: "scenarios",
      name: "Scénarios conditionnels",
      example: "Zone ambitieuse possible si conditions optimales : 4,4–4,6 W/kg"
    }
  ],
  exampleOutput: {
    metric: "FTP cible à moyen terme",
    realisticRange: "4,0–4,3 W/kg",
    ambitiousRange: "4,4–4,6 W/kg",
    condition: "si conditions optimales"
  }
};

// ============================================
// 7️⃣ RACE READINESS & DÉCISION
// ============================================

export const POTENTIEL_DEFINITION = {
  title: "Potentiel Physiologique & Décision",
  icon: "🏁",
  subtitle: "Indicateur décisionnel, pas verdict",
  mainStatement: "Potentiel Physiologique est un indicateur décisionnel, pas un verdict.",
  synthesizes: [
    "État physiologique actuel",
    "Niveau de fatigue accumulée",
    "Adéquation objectif / profil métabolique",
    "Risque de dérive métabolique en course"
  ],
  neverReplaces: [
    "Le jugement du coach",
    "Le ressenti de l'athlète",
    "La connaissance du contexte personnel"
  ],
  interpretation: "Un score élevé suggère une bonne préparation, mais la décision finale appartient toujours au binôme coach-athlète."
};

// ============================================
// 8️⃣ CE QUE L'APP FAIT / NE FAIT PAS
// ============================================

export const APP_CAPABILITIES = {
  title: "Ce que l'app fait / ne fait pas",
  icon: "⚖️",
  does: {
    title: "✅ Two For Coaching Lab FAIT",
    items: [
      { verb: "Éclairer", description: "Rendre visible ce qui est souvent invisible" },
      { verb: "Structurer", description: "Organiser la complexité physiologique" },
      { verb: "Comparer", description: "Mettre en perspective les données" },
      { verb: "Alerter", description: "Signaler les risques et incohérences" }
    ]
  },
  doesNot: {
    title: "❌ Two For Coaching Lab NE FAIT PAS",
    items: [
      { verb: "Planifier automatiquement", description: "Aucun plan généré sans validation humaine" },
      { verb: "Promettre un résultat", description: "Pas de prédiction de performance garantie" },
      { verb: "Remplacer un test labo", description: "Quand celui-ci est nécessaire" },
      { verb: "Décider à la place du coach", description: "L'humain reste maître de la décision" }
    ]
  }
};

// ============================================
// 9️⃣ RESPONSABILITÉ & ÉTHIQUE
// ============================================

export const RESPONSIBILITY_ETHICS = {
  title: "Responsabilité & Éthique",
  icon: "🤝",
  mainStatement: `Two For Coaching Lab ne prétend pas détenir la vérité physiologique.
Il fournit un cadre rationnel pour prendre de meilleures décisions, avec humilité et transparence.`,
  principles: [
    {
      id: "humility",
      name: "Humilité scientifique",
      description: "Reconnaître les limites de tout modèle"
    },
    {
      id: "transparency",
      name: "Transparence totale",
      description: "Expliquer ce qui est mesuré vs estimé"
    },
    {
      id: "no_prescription",
      name: "Pas de prescription",
      description: "Aucun diagnostic médical ou thérapeutique"
    },
    {
      id: "coach_first",
      name: "Le coach d'abord",
      description: "L'outil sert le coach, pas l'inverse"
    }
  ],
  legalDisclaimer: "Two For Coaching Lab est un outil d'aide à la décision sportive. Il ne constitue en aucun cas un avis médical, un diagnostic ou une prescription thérapeutique."
};

// ============================================
// 🔟 VERSIONNAGE
// ============================================

export const VERSIONING_STATEMENT = {
  title: "Versionnage",
  icon: "🔖",
  statement: `Ce document décrit la Two For Coaching Lab Method™ ${METHOD_VERSION_DISPLAY}.
Toute évolution future fera l'objet d'une nouvelle version documentée.`,
  version: METHOD_VERSION_DISPLAY,
  fullName: METHOD_VERSION_FULL,
  lastUpdate: "2024-01-01",
  nextReview: "Évolution continue documentée"
};

// ============================================
// DOCUMENT COMPLET
// ============================================

export interface OfficialReferenceSection {
  id: string;
  title: string;
  icon: string;
  content: unknown;
}

export const OFFICIAL_REFERENCE_DOCUMENT = {
  title: "Two For Coaching Lab Method™ v1.0",
  subtitle: "Référentiel Officiel",
  version: METHOD_VERSION_DISPLAY,
  sections: [
    { id: "introduction", title: OFFICIAL_INTRODUCTION.title, icon: OFFICIAL_INTRODUCTION.icon, content: OFFICIAL_INTRODUCTION },
    { id: "philosophy", title: FOUNDING_PHILOSOPHY.title, icon: FOUNDING_PHILOSOPHY.icon, content: FOUNDING_PHILOSOPHY },
    { id: "measured", title: MEASURED_DATA.title, icon: MEASURED_DATA.icon, content: MEASURED_DATA },
    { id: "modeled", title: MODELED_DATA.title, icon: MODELED_DATA.icon, content: MODELED_DATA },
    { id: "confidence", title: CONFIDENCE_INDICES.title, icon: CONFIDENCE_INDICES.icon, content: CONFIDENCE_INDICES },
    { id: "outputs", title: APPLICATION_OUTPUTS.title, icon: APPLICATION_OUTPUTS.icon, content: APPLICATION_OUTPUTS },
    { id: "race_readiness", title: POTENTIEL_DEFINITION.title, icon: POTENTIEL_DEFINITION.icon, content: POTENTIEL_DEFINITION },
    { id: "capabilities", title: APP_CAPABILITIES.title, icon: APP_CAPABILITIES.icon, content: APP_CAPABILITIES },
    { id: "ethics", title: RESPONSIBILITY_ETHICS.title, icon: RESPONSIBILITY_ETHICS.icon, content: RESPONSIBILITY_ETHICS },
    { id: "versioning", title: VERSIONING_STATEMENT.title, icon: VERSIONING_STATEMENT.icon, content: VERSIONING_STATEMENT }
  ] as OfficialReferenceSection[]
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Retourne une section par son ID
 */
export function getReferenceSection(sectionId: string): OfficialReferenceSection | undefined {
  return OFFICIAL_REFERENCE_DOCUMENT.sections.find(s => s.id === sectionId);
}

/**
 * Retourne le texte d'introduction officiel
 */
export function getOfficialIntroduction(): string {
  return OFFICIAL_INTRODUCTION.text;
}

/**
 * Retourne le principe central de la philosophie
 */
export function getCentralPrinciple(): string {
  return FOUNDING_PHILOSOPHY.centralPrinciple;
}

/**
 * Retourne la règle sur les indices de confiance
 */
export function getConfidenceRule(): string {
  return CONFIDENCE_INDICES.rule;
}

/**
 * Retourne le statement sur Potentiel Physiologique
 */
export function getPotentielStatement(): string {
  return POTENTIEL_DEFINITION.mainStatement;
}

/**
 * Retourne le statement éthique principal
 */
export function getEthicsStatement(): string {
  return RESPONSIBILITY_ETHICS.mainStatement;
}

/**
 * Génère un résumé pour PDF (version courte)
 */
export function generatePdfSummary(): string {
  return `${OFFICIAL_INTRODUCTION.text}

${FOUNDING_PHILOSOPHY.centralPrinciple}

${RESPONSIBILITY_ETHICS.mainStatement}

${VERSIONING_STATEMENT.statement}`;
}
