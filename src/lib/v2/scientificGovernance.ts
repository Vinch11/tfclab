/**
 * TWO FOR COACHING LAB — Scientific Governance & Versioning
 * 
 * Système officiel de gouvernance scientifique et de versionnage
 * de la Two For Coaching Lab Method™.
 * 
 * Ce module garantit :
 * - Traçabilité des résultats dans le temps
 * - Stabilité des calculs pour un snapshot donné
 * - Évolution contrôlée des modèles
 * - Crédibilité scientifique
 */

// ============================================
// 1️⃣ VERSION GLOBALE DE LA MÉTHODE
// ============================================

export const METHOD_VERSION = "TFCL_METHOD_v1.0";
export const METHOD_VERSION_DISPLAY = "v1.0";
export const METHOD_VERSION_FULL = "Two For Coaching Lab Method™ v1.0";

export type VersionType = 'major' | 'minor' | 'patch';
export type ChangeType = 'bugfix' | 'model_refinement' | 'new_feature' | 'breaking_change';

export interface MethodVersion {
  version: string;
  displayVersion: string;
  fullName: string;
  releaseDate: string;
  isExperimental: boolean;
  isDeprecated: boolean;
  description: string;
}

export const CURRENT_VERSION: MethodVersion = {
  version: "1.0.0",
  displayVersion: "v1.0",
  fullName: "Two For Coaching Lab Method™ v1.0",
  releaseDate: "2024-01-01",
  isExperimental: false,
  isDeprecated: false,
  description: "Version stable initiale avec modélisation VLamax, TTE effectif, fatigue quantifiée et nutrition prédictive."
};

export const EXPERIMENTAL_VERSION: MethodVersion = {
  version: "2.0.0-beta",
  displayVersion: "v2.0 (Experimental)",
  fullName: "Two For Coaching Lab Method™ v2.0 (Experimental)",
  releaseDate: "2024-06-01",
  isExperimental: true,
  isDeprecated: false,
  description: "Version expérimentale avec plages d'incertitude, indices de confiance avancés et running economy V2."
};

// ============================================
// 2️⃣ RÈGLE FONDAMENTALE DE STABILITÉ
// ============================================

export const STABILITY_RULE = {
  text: "Les résultats affichés pour un athlète dépendent toujours de la version de la méthode active au moment du calcul.",
  consequences: [
    "Un rapport exporté mentionne la version utilisée",
    "Un ancien snapshot reste interprétable même après une mise à jour future",
    "Aucun recalcul rétroactif sans consentement explicite"
  ]
};

// ============================================
// 3️⃣ DÉFINITION OFFICIELLE V1.0
// ============================================

export interface MethodSpecification {
  version: string;
  name: string;
  releaseDate: string;
  modules: ModuleSpec[];
  hypotheses: string[];
  limitations: string[];
  disclaimer: string;
}

export interface ModuleSpec {
  id: string;
  name: string;
  description: string;
  dataType: 'measured' | 'estimated' | 'advised';
  confidenceRange: [number, number];
  scientificBasis: string;
}

export const METHOD_V1_SPECIFICATION: MethodSpecification = {
  version: "1.0.0",
  name: "Two For Coaching Lab Method™ v1.0",
  releaseDate: "2024-01-01",
  modules: [
    {
      id: "vlamax",
      name: "VLamax Modélisée",
      description: "Modélisation VLamax sans lactate (vélo & CAP)",
      dataType: "estimated",
      confidenceRange: [0.60, 0.85],
      scientificBasis: "Modèle Mader adapté, corrélation validée r=0.78-0.85"
    },
    {
      id: "tte",
      name: "TTE Effectif",
      description: "Time To Exhaustion basé sur charge / durabilité",
      dataType: "estimated",
      confidenceRange: [0.65, 0.80],
      scientificBasis: "Modèle Coggan adapté, facteurs de durabilité terrain"
    },
    {
      id: "fatigue",
      name: "Fatigue Quantifiée",
      description: "Indice de fatigue combinant charge externe et perception",
      dataType: "estimated",
      confidenceRange: [0.55, 0.75],
      scientificBasis: "Modèle Banister TSS/CTL adapté + inputs subjectifs"
    },
    {
      id: "nutrition",
      name: "Nutrition Prédictive",
      description: "Estimations prudentes des besoins nutritionnels",
      dataType: "estimated",
      confidenceRange: [0.50, 0.70],
      scientificBasis: "Modèles INSCYD/ACSM adaptés au profil métabolique"
    },
    {
      id: "injury_risk",
      name: "Risque Blessure CAP",
      description: "Évaluation du risque de blessure en course à pied",
      dataType: "advised",
      confidenceRange: [0.45, 0.65],
      scientificBasis: "Facteurs de risque validés + charge aiguë/chronique"
    },
    {
      id: "running_economy",
      name: "Économie de Course",
      description: "Proxy de l'économie de course estimée",
      dataType: "estimated",
      confidenceRange: [0.55, 0.75],
      scientificBasis: "Corrélation vitesse/puissance + dérive cardiaque"
    }
  ],
  hypotheses: [
    "L'athlète est en bonne santé et sans pathologie majeure",
    "Les données d'entrée sont fiables (capteurs calibrés)",
    "Le profil métabolique est relativement stable sur 4-6 semaines",
    "Les conditions d'entraînement sont reproductibles"
  ],
  limitations: [
    "Aucune mesure directe du lactate sanguin",
    "Économie de course estimée sans analyse biomécanique",
    "Fatigue subjective dépendante de l'honnêteté du reporting",
    "Modèles validés sur populations occidentales adultes"
  ],
  disclaimer: "La version 1.0 repose sur des modèles validés mais reste une approximation du réel biologique. Les résultats doivent être interprétés par un coach qualifié."
};

// ============================================
// 4️⃣ CHANGELOG SCIENTIFIQUE
// ============================================

export interface ScientificChangeLog {
  version: string;
  date: string;
  description: string;
  modulesImpacted: string[];
  type: ChangeType;
  backwardCompatible: boolean;
  scientificJustification: string;
  author?: string;
}

export const SCIENTIFIC_CHANGELOG: ScientificChangeLog[] = [
  {
    version: "1.0.0",
    date: "2024-01-01",
    description: "Version initiale de la Two For Coaching Lab Method™",
    modulesImpacted: ["all"],
    type: "new_feature",
    backwardCompatible: true,
    scientificJustification: "Socle scientifique initial basé sur les modèles Mader, Coggan et Banister adaptés au contexte Two For Coaching."
  },
  {
    version: "1.0.1",
    date: "2024-03-15",
    description: "Correction du calcul de durabilité pour profils glycolytiques extrêmes",
    modulesImpacted: ["tte"],
    type: "bugfix",
    backwardCompatible: true,
    scientificJustification: "Ajustement des bornes de calcul pour éviter les valeurs aberrantes sur VLamax > 0.8 mmol/L/s"
  },
  {
    version: "1.1.0",
    date: "2024-06-01",
    description: "Ajout des indices de confiance explicites sur tous les modules",
    modulesImpacted: ["vlamax", "tte", "fatigue", "nutrition"],
    type: "model_refinement",
    backwardCompatible: true,
    scientificJustification: "Implémentation des intervalles de confiance basés sur la qualité des données d'entrée et la robustesse des modèles"
  },
  {
    version: "2.0.0-beta",
    date: "2024-06-01",
    description: "Version expérimentale V2 avec plages d'incertitude étendues",
    modulesImpacted: ["all"],
    type: "breaking_change",
    backwardCompatible: false,
    scientificJustification: "Refonte complète intégrant les incertitudes de mesure, les plages de performance réalistes et les facteurs de contexte avancés"
  }
];

// ============================================
// 5️⃣ RÈGLES D'ÉVOLUTION
// ============================================

export interface EvolutionRule {
  type: VersionType;
  description: string;
  examples: string[];
  requiresApproval: boolean;
  notificationLevel: 'silent' | 'info' | 'warning' | 'breaking';
}

export const EVOLUTION_RULES: Record<VersionType, EvolutionRule> = {
  major: {
    type: 'major',
    description: "Modification de formule physiologique = nouvelle version majeure (v2.0)",
    examples: [
      "Changement du modèle VLamax",
      "Nouvelle formule de TTE",
      "Refonte du calcul de fatigue"
    ],
    requiresApproval: true,
    notificationLevel: 'breaking'
  },
  minor: {
    type: 'minor',
    description: "Ajustement de seuil ou pondération = version mineure (v1.1)",
    examples: [
      "Ajustement des seuils de confiance",
      "Modification des pondérations de fatigue",
      "Affinement des plages de performance"
    ],
    requiresApproval: true,
    notificationLevel: 'warning'
  },
  patch: {
    type: 'patch',
    description: "Correctif UI ou bug = patch (v1.0.1)",
    examples: [
      "Correction d'affichage",
      "Bugfix de calcul edge-case",
      "Amélioration de performance"
    ],
    requiresApproval: false,
    notificationLevel: 'info'
  }
};

export const FORBIDDEN_CHANGES = [
  "Modification silencieuse des résultats",
  "Recalcul rétroactif sans consentement",
  "Changement de formule sans versionnage",
  "Suppression de données historiques"
];

// ============================================
// 6️⃣ GESTION V2 EXPÉRIMENTALE
// ============================================

export interface ExperimentalConfig {
  enabled: boolean;
  version: MethodVersion;
  staffOnly: boolean;
  showBetaBadge: boolean;
  allowComparison: boolean;
  feedbackEnabled: boolean;
}

export const V2_EXPERIMENTAL_CONFIG: ExperimentalConfig = {
  enabled: true,
  version: EXPERIMENTAL_VERSION,
  staffOnly: true,
  showBetaBadge: true,
  allowComparison: true,
  feedbackEnabled: true
};

// ============================================
// 7️⃣ TEXTES POUR PDF / RAPPORTS
// ============================================

export const PDF_FOOTER_TEXT = (version: string = METHOD_VERSION_DISPLAY): string =>
  `Analyse réalisée avec Two For Coaching Lab Method™ ${version}\nLes résultats sont dépendants des hypothèses et données disponibles à la date d'analyse.`;

export const PDF_METHODOLOGY_PAGE = {
  title: "Méthodologie & Version",
  subtitle: "Two For Coaching Lab Method™",
  sections: [
    {
      title: "Version utilisée",
      content: METHOD_VERSION_FULL
    },
    {
      title: "Légende des couleurs",
      items: [
        { color: "green", label: "🟢 Donnée mesurée directement" },
        { color: "orange", label: "🟠 Donnée estimée (modèle validé)" },
        { color: "red", label: "🔴 Donnée modélisée (hypothèse)" },
        { color: "blue", label: "🔵 Aide à la décision coach" }
      ]
    },
    {
      title: "Limites de l'analyse",
      content: METHOD_V1_SPECIFICATION.limitations.join(" • ")
    },
    {
      title: "Rôle du coach",
      content: "Les résultats doivent être interprétés par un coach qualifié. Two For Coaching Lab structure l'information mais ne décide jamais à la place du coach."
    }
  ]
};

// ============================================
// 8️⃣ TEXTES POUR ASSISTANT / CHATBOT
// ============================================

export const ASSISTANT_VERSION_RULES = {
  alwaysMentionVersion: true,
  versionPrefix: `Selon la méthode TFCL ${METHOD_VERSION_DISPLAY}`,
  dataTypeLabels: {
    measured: "donnée mesurée",
    estimated: "estimation modélisée",
    advised: "recommandation"
  },
  exampleResponses: [
    `Selon la méthode TFCL ${METHOD_VERSION_DISPLAY}, votre VLamax est estimée à 0.45 mmol/L/s (confiance: 0.72).`,
    `D'après la méthode ${METHOD_VERSION_DISPLAY}, votre TTE effectif est évalué à 42 minutes en zone I2.`,
    `La méthode TFCL ${METHOD_VERSION_DISPLAY} suggère une priorité endurance lipidique basée sur votre profil.`
  ]
};

// ============================================
// 9️⃣ MODULE ACADEMY
// ============================================

export const ACADEMY_VERSIONING_MODULE = {
  id: "versioning",
  title: "Comprendre les versions de la Two For Coaching Lab Method™",
  icon: "🔬",
  description: "Pourquoi les modèles évoluent et comment interpréter les résultats dans le temps",
  chapters: [
    {
      id: "why-evolve",
      title: "Pourquoi les modèles évoluent",
      content: `La science du sport n'est pas figée. De nouvelles études paraissent chaque année, de nouvelles données terrain s'accumulent, et notre compréhension s'affine.

Two For Coaching Lab assume cette réalité en versionnant explicitement sa méthode :
• Chaque version correspond à un socle scientifique précis
• Les hypothèses sont clairement définies
• Les modèles sont figés (sauf bug critique)

Cette approche garantit que vos anciens rapports restent interprétables, même après une mise à jour.`
    },
    {
      id: "science-not-fixed",
      title: "Pourquoi la science n'est jamais figée",
      content: `La physiologie de l'effort est un domaine en constante évolution :
• Les modèles de Mader (1980s) ont été affinés par 40 ans de recherche
• Les capteurs de puissance sont devenus plus précis
• Les populations étudiées se sont diversifiées
• L'IA permet d'analyser des patterns invisibles auparavant

Two For Coaching Lab intègre ces avancées de manière contrôlée, en documentant chaque changement.`
    },
    {
      id: "read-old-report",
      title: "Comment lire un rapport ancien",
      content: `Chaque rapport PDF indique la version de la méthode utilisée.

Pour interpréter un ancien rapport :
1. Identifiez la version (pied de page)
2. Consultez le changelog pour cette version
3. Comprenez les hypothèses qui s'appliquaient
4. Tenez compte des évolutions depuis

Un rapport v1.0 reste valide dans son contexte original. Ne le comparez pas directement à un calcul v2.0.`
    },
    {
      id: "compare-versions",
      title: "Comment comparer deux versions",
      content: `La comparaison V1 vs V2 est possible en mode Staff :

1. Activez le mode V2 (Experimental)
2. Les résultats V1 et V2 s'affichent côte à côte
3. Les différences sont expliquées
4. Un badge "BETA" signale les calculs expérimentaux

Cette comparaison aide à :
• Valider les nouveaux modèles sur le terrain
• Comprendre l'impact des évolutions
• Donner du feedback à l'équipe scientifique`
    },
    {
      id: "version-types",
      title: "Comprendre les types de versions",
      content: `Three types de versions existent :

🔴 VERSION MAJEURE (v2.0)
Changement de formule physiologique
→ Résultats potentiellement différents
→ Notification explicite

🟠 VERSION MINEURE (v1.1)
Ajustement de seuil ou pondération
→ Résultats légèrement affinés
→ Rétrocompatible

🟢 PATCH (v1.0.1)
Correctif UI ou bug
→ Aucun impact sur les calculs
→ Silencieux`
    },
    {
      id: "forbidden-changes",
      title: "Ce qui est interdit",
      content: `Pour garantir la confiance, certaines pratiques sont strictement interdites :

❌ Modification silencieuse des résultats
❌ Recalcul rétroactif sans consentement
❌ Changement de formule sans versionnage
❌ Suppression de données historiques

Si vous constatez une anomalie, contactez l'équipe Two For Coaching.`
    }
  ]
};

// ============================================
// 🔟 POSITIONNEMENT OFFICIEL
// ============================================

export const OFFICIAL_POSITIONING = {
  main: `Two For Coaching Lab assume que la performance humaine ne peut être décrite par une équation unique.
C'est pourquoi sa méthode est versionnée, documentée et améliorable.`,
  
  tagline: "Une méthode versionnée, documentée et améliorable.",
  
  values: [
    "Transparence scientifique",
    "Traçabilité des résultats",
    "Évolution contrôlée",
    "Humilité méthodologique"
  ]
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Retourne la version courante de la méthode
 */
export function getCurrentMethodVersion(): MethodVersion {
  return CURRENT_VERSION;
}

/**
 * Retourne la version expérimentale si activée
 */
export function getExperimentalVersion(): MethodVersion | null {
  return V2_EXPERIMENTAL_CONFIG.enabled ? EXPERIMENTAL_VERSION : null;
}

/**
 * Formate le texte de version pour affichage
 */
export function formatVersionText(version: MethodVersion, includeStatus: boolean = true): string {
  let text = version.fullName;
  if (includeStatus) {
    if (version.isExperimental) text += " [BETA]";
    if (version.isDeprecated) text += " [DEPRECATED]";
  }
  return text;
}

/**
 * Retourne le changelog filtré par type
 */
export function getChangelogByType(type: ChangeType): ScientificChangeLog[] {
  return SCIENTIFIC_CHANGELOG.filter(entry => entry.type === type);
}

/**
 * Retourne le changelog pour une version spécifique
 */
export function getChangelogForVersion(version: string): ScientificChangeLog | undefined {
  return SCIENTIFIC_CHANGELOG.find(entry => entry.version === version);
}

/**
 * Vérifie si une version est compatible avec une autre
 */
export function areVersionsCompatible(v1: string, v2: string): boolean {
  const major1 = parseInt(v1.split('.')[0]);
  const major2 = parseInt(v2.split('.')[0]);
  return major1 === major2;
}

/**
 * Génère le texte de pied de page PDF avec la version
 */
export function generatePdfFooter(version?: string): string {
  return PDF_FOOTER_TEXT(version || METHOD_VERSION_DISPLAY);
}

/**
 * Formate une réponse assistant avec mention de version
 */
export function formatAssistantResponse(content: string, dataType: 'measured' | 'estimated' | 'advised'): string {
  const prefix = ASSISTANT_VERSION_RULES.versionPrefix;
  const typeLabel = ASSISTANT_VERSION_RULES.dataTypeLabels[dataType];
  return `${prefix}, ${content} (${typeLabel})`;
}

/**
 * Retourne les modules de la spécification V1
 */
export function getV1Modules(): ModuleSpec[] {
  return METHOD_V1_SPECIFICATION.modules;
}

/**
 * Retourne la spécification d'un module par son ID
 */
export function getModuleSpec(moduleId: string): ModuleSpec | undefined {
  return METHOD_V1_SPECIFICATION.modules.find(m => m.id === moduleId);
}
