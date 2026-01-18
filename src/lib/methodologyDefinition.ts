/**
 * TWO FOR COACHING LAB METHOD™ — Cadre Méthodologique Officiel
 * 
 * Méthodologie d'analyse physiologique appliquée à l'entraînement d'endurance.
 * Référence unique pour Dashboard, Rapports PDF et Academy.
 */

// =============================================
// TEXTES FONDATEURS OFFICIELS
// =============================================

export const METHODOLOGY_TEXTS = {
  // Définition officielle
  OFFICIAL_DEFINITION: `La Two For Coaching Lab Method™ est une méthode d'analyse physiologique appliquée à l'entraînement d'endurance.
Elle combine des données mesurées, des estimations validées et des modèles physiologiques pour aider le coach à prendre de meilleures décisions.
Elle ne prescrit pas un entraînement : elle éclaire les choix.`,

  // Règle d'or
  GOLDEN_RULE: `Two For Coaching Lab ne décide jamais à la place du coach.
Il structure l'information pour rendre la décision plus pertinente.`,

  // Positionnement stratégique
  STRATEGIC_POSITIONING: `Two For Coaching Lab n'est ni une boîte noire ni un planificateur automatique.
C'est un laboratoire d'aide à la décision pour les coachs exigeants et les athlètes ambitieux.`,

  // Principe fondateur V2
  FOUNDATIONAL_PRINCIPLE: `Two For Coaching Lab est un outil de modélisation physiologique avancée.
Il aide à comprendre, comparer et orienter l'entraînement.
Il ne remplace jamais une mesure physiologique directe lorsque celle-ci est nécessaire.`,
};

// Exports compatibles avec l'ancien format
export const METHOD_DEFINITION = METHODOLOGY_TEXTS.OFFICIAL_DEFINITION;
export const METHOD_DISCLAIMER = METHODOLOGY_TEXTS.GOLDEN_RULE;

// =============================================
// LES 3 PILIERS DE LA MÉTHODE
// =============================================

export type DataPillar = 'measured' | 'estimated' | 'advised';

export interface PillarDefinition {
  id: DataPillar;
  emoji: string;
  title: string;
  titleShort: string;
  color: string;
  badgeClass: string;
  description: string;
  examples: string[];
  status: string;
  statusEmoji: string;
  requirements: string[];
}

export const METHOD_PILLARS: Record<DataPillar, PillarDefinition> = {
  measured: {
    id: 'measured',
    emoji: '🧪',
    title: 'PILIER 1 — CE QUI EST MESURÉ',
    titleShort: 'Mesuré',
    color: 'green',
    badgeClass: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50',
    description: 'Données issues directement de l\'athlète ou du matériel',
    examples: [
      'FTP mesurée',
      'Puissance maximale',
      'VO2max labo',
      'Lactate (si présent)',
      'Poids, âge, sexe',
      'Tests terrain normalisés'
    ],
    status: 'Donnée de référence',
    statusEmoji: '🟢',
    requirements: [
      'Source directe identifiable',
      'Protocole de mesure connu',
      'Date de mesure récente'
    ]
  },
  estimated: {
    id: 'estimated',
    emoji: '📐',
    title: 'PILIER 2 — CE QUI EST ESTIMÉ',
    titleShort: 'Estimé',
    color: 'amber',
    badgeClass: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50',
    description: 'Données calculées à partir de modèles validés',
    examples: [
      'VLamax (sans lactate)',
      'TTE effectif',
      'Économie de course (proxy)',
      'Nutrition prédictive'
    ],
    status: 'Estimation modélisée',
    statusEmoji: '🟠',
    requirements: [
      'Source des données d\'entrée',
      'Hypothèses explicites',
      'Indice de confiance affiché'
    ]
  },
  advised: {
    id: 'advised',
    emoji: '🧠',
    title: 'PILIER 3 — CE QUI EST CONSEILLÉ',
    titleShort: 'Conseillé',
    color: 'blue',
    badgeClass: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/50',
    description: 'Décisions proposées mais jamais imposées',
    examples: [
      'Priorités physiologiques',
      'Axes d\'entraînement',
      'Risques (fatigue, blessure, nutrition)',
      'Adaptations possibles'
    ],
    status: 'Aide à la décision coach',
    statusEmoji: '🔵',
    requirements: [
      'Contexte explicite',
      'Alternatives présentées',
      'Coach = décideur final'
    ]
  }
};

// =============================================
// SORTIES OFFICIELLES DE LA MÉTHODE
// =============================================

export const METHOD_OUTPUTS = {
  AUTHORIZED: [
    { id: 'analysis', label: 'Analyse physiologique contextualisée', description: 'Interprétation des données dans leur contexte' },
    { id: 'ranges', label: 'Plages de performance réalistes', description: 'Fourchettes plutôt qu\'objectifs absolus' },
    { id: 'confidence', label: 'Indices de confiance', description: 'Niveau de fiabilité de chaque estimation' },
    { id: 'alerts', label: 'Alertes de risque', description: 'Fatigue, blessure, nutrition' },
    { id: 'suggestions', label: 'Suggestions compatibles', description: 'Wahoo, Zwift, Rouvy, etc.' }
  ],
  FORBIDDEN: [
    { id: 'auto_prescription', label: 'Prescriptions automatiques', reason: 'Le coach décide, pas l\'outil' },
    { id: 'unrealistic_goals', label: 'Objectifs chiffrés irréalistes', reason: 'Plages réalistes uniquement' },
    { id: 'no_context', label: 'Décisions sans contexte', reason: 'Toujours contextualiser' },
    { id: 'medical', label: 'Diagnostic médical', reason: 'Outil sportif, pas médical' }
  ]
};

// Compatibilité avec l'ancien format
export const METHOD_WHAT_IT_DOES = METHOD_OUTPUTS.AUTHORIZED.map(o => o.label + ' — ' + o.description);
export const METHOD_WHAT_IT_DOES_NOT = METHOD_OUTPUTS.FORBIDDEN.map(o => ({ emoji: '❌', text: o.label + ' — ' + o.reason }));

// =============================================
// RÈGLES DE FORMULATION (DASHBOARD)
// =============================================

export const FORMULATION_RULES = {
  EXAMPLES: [
    {
      wrong: 'Votre VLamax est trop élevée',
      correct: 'Votre profil montre une tendance glycolytique élevée selon notre modèle (confiance : 0.72)',
      rule: 'Ne pas juger, contextualiser'
    },
    {
      wrong: 'Objectif FTP : 4.8 W/kg',
      correct: 'Plage de progression réaliste estimée : 4.0–4.3 W/kg',
      rule: 'Plages, pas de valeurs absolues'
    },
    {
      wrong: 'Vous devez réduire votre VLamax',
      correct: 'Une orientation vers plus d\'endurance pourrait améliorer la durabilité',
      rule: 'Suggestions, pas d\'injonctions'
    },
    {
      wrong: 'Performance cible : 3h15 au marathon',
      correct: 'Fenêtre de performance estimée : 3h20–3h35 selon les conditions',
      rule: 'Fenêtres réalistes avec contexte'
    }
  ],
  
  PRINCIPLES: [
    'Toujours afficher la confiance quand disponible',
    'Utiliser des plages plutôt que des valeurs uniques',
    'Contextualiser avec l\'objectif de l\'athlète',
    'Indiquer clairement si mesuré, estimé ou conseillé',
    'Proposer, ne jamais imposer'
  ]
};

// =============================================
// TABLEAU PARAMÈTRES OFFICIELS
// =============================================

export type ParameterStatus = 'MESURÉ' | 'CALCULÉ' | 'MODÉLISÉ' | 'COMPOSITE' | 'CONSEILLÉ';
export type UncertaintyLevel = 'faible' | 'moyenne' | 'élevée' | 'variable';

export interface MethodParameter {
  name: string;
  status: ParameterStatus;
  source: string;
  uncertainty: UncertaintyLevel;
  description?: string;
  pillar: DataPillar;
}

export const METHOD_PARAMETERS: MethodParameter[] = [
  { 
    name: "FTP", 
    status: "MESURÉ", 
    source: "Test terrain / plateforme", 
    uncertainty: "faible",
    description: "Puissance au seuil fonctionnel mesurée via test 20 min ou ramp test",
    pillar: "measured"
  },
  { 
    name: "VO2max", 
    status: "MESURÉ", 
    source: "Labo ou modèle", 
    uncertainty: "moyenne",
    description: "Consommation maximale d'oxygène, mesurée en labo ou estimée",
    pillar: "measured"
  },
  { 
    name: "VMA", 
    status: "MESURÉ", 
    source: "Test terrain", 
    uncertainty: "faible",
    description: "Vitesse Maximale Aérobie mesurée sur test VMA",
    pillar: "measured"
  },
  { 
    name: "FC Max", 
    status: "MESURÉ", 
    source: "Test ou course", 
    uncertainty: "faible",
    description: "Fréquence cardiaque maximale observée",
    pillar: "measured"
  },
  { 
    name: "VLamax", 
    status: "MODÉLISÉ", 
    source: "Proxy sprint / TTE / modèle", 
    uncertainty: "élevée",
    description: "Taux maximal de production de lactate, estimé par modélisation",
    pillar: "estimated"
  },
  { 
    name: "TTE", 
    status: "MODÉLISÉ", 
    source: "Durabilité / charge / test", 
    uncertainty: "moyenne",
    description: "Time To Exhaustion au seuil, modélisé selon charge et profil",
    pillar: "estimated"
  },
  { 
    name: "Fatigue", 
    status: "COMPOSITE", 
    source: "Charge + stress + récupération", 
    uncertainty: "moyenne",
    description: "Indice fonctionnel basé sur 4 piliers (charge, TTE, métabolique, subjectif)",
    pillar: "estimated"
  },
  { 
    name: "Race Readiness", 
    status: "COMPOSITE", 
    source: "Profil métabolique + objectif", 
    uncertainty: "moyenne",
    description: "Score d'adéquation entre profil physiologique et objectif course",
    pillar: "estimated"
  },
  { 
    name: "Recommandations", 
    status: "CONSEILLÉ", 
    source: "Moteur logique", 
    uncertainty: "variable",
    description: "Suggestions basées sur les règles métier et le contexte athlète",
    pillar: "advised"
  }
];

// =============================================
// CONTENU PDF — COMMENT LIRE CE RAPPORT
// =============================================

export const PDF_HOW_TO_READ = {
  title: 'Comment lire ce rapport — Two For Coaching Lab Method™',
  
  sections: [
    {
      title: 'Légende des couleurs',
      items: [
        { color: '🟢', label: 'Vert', meaning: 'Donnée mesurée directement — haute fiabilité' },
        { color: '🟠', label: 'Orange', meaning: 'Estimation modélisée — confiance affichée' },
        { color: '🔵', label: 'Bleu', meaning: 'Conseil / aide à la décision — non prescriptif' },
        { color: '🔴', label: 'Rouge', meaning: 'Alerte ou risque identifié — attention requise' }
      ]
    },
    {
      title: 'Les 3 piliers de la méthode',
      items: [
        { color: '🧪', label: 'Mesuré', meaning: 'Données issues directement de l\'athlète ou du matériel' },
        { color: '📐', label: 'Estimé', meaning: 'Données calculées à partir de modèles validés' },
        { color: '🧠', label: 'Conseillé', meaning: 'Décisions proposées mais jamais imposées' }
      ]
    },
    {
      title: 'Lecture des scores',
      items: [
        { label: 'Plage réaliste', meaning: 'Valeurs probables selon le modèle et les données disponibles' },
        { label: 'Indice de confiance', meaning: 'Fiabilité de l\'estimation (0-1). > 0.75 = solide, < 0.50 = incertain' },
        { label: 'Comparaison cible', meaning: 'Position actuelle vs objectif défini par le coach' }
      ]
    },
    {
      title: 'Rôle du coach',
      content: `Ce rapport est un outil d'aide à la décision.

Le coach reste responsable de :
- L'interprétation des données dans leur contexte
- L'adaptation des suggestions à l'athlète
- La décision finale d'entraînement

${METHODOLOGY_TEXTS.GOLDEN_RULE}`
    }
  ]
};

// =============================================
// MENTIONS LÉGALES & SCIENTIFIQUES
// =============================================

export const SCIENTIFIC_ATTRIBUTION = `La Two For Coaching Lab Method™ s'inspire de travaux scientifiques reconnus en physiologie de l'exercice (Mader, Heck, Jones, Burnley, Seiler, etc.), mais constitue une implémentation indépendante, originale et propriétaire.`;

export const LEGAL_DISCLAIMER = `Two For Coaching Lab Method™ est une marque déposée de Two For Coaching.
Cette méthodologie ne constitue pas un avis médical et ne remplace pas un suivi professionnel.
Les estimations sont fournies à titre indicatif pour guider la décision du coach.`;

export const PDF_INTRO_TEXT = `Ce rapport utilise la Two For Coaching Lab Method™.
Les résultats présentés sont des estimations et des analyses contextuelles destinées à guider la décision d'entraînement.`;

// =============================================
// ACADEMY — MODULE OFFICIEL
// =============================================

export const ACADEMY_METHOD_MODULE = {
  id: 'method',
  title: 'La Two For Coaching Lab Method™',
  description: 'Comprendre la méthode d\'analyse physiologique de l\'application.',
  icon: '📘',
  
  chapters: [
    {
      id: 'method_why',
      title: '1. Pourquoi cette méthode existe',
      content: `## Le problème

Les coachs d'endurance font face à un dilemme :
- **Trop peu de données** → décisions à l'aveugle
- **Trop de données** → paralysie par l'analyse
- **Données mal interprétées** → mauvaises décisions

## La solution Two For Coaching Lab

${METHODOLOGY_TEXTS.OFFICIAL_DEFINITION}

## La règle d'or

${METHODOLOGY_TEXTS.GOLDEN_RULE}`
    },
    {
      id: 'method_pillars',
      title: '2. Les 3 piliers de la méthode',
      content: `## Structure en 3 niveaux

### ${METHOD_PILLARS.measured.emoji} ${METHOD_PILLARS.measured.title}

${METHOD_PILLARS.measured.description}

**Exemples :**
${METHOD_PILLARS.measured.examples.map(e => `- ${e}`).join('\n')}

**Statut :** ${METHOD_PILLARS.measured.statusEmoji} ${METHOD_PILLARS.measured.status}

---

### ${METHOD_PILLARS.estimated.emoji} ${METHOD_PILLARS.estimated.title}

${METHOD_PILLARS.estimated.description}

**Exemples :**
${METHOD_PILLARS.estimated.examples.map(e => `- ${e}`).join('\n')}

**Statut :** ${METHOD_PILLARS.estimated.statusEmoji} ${METHOD_PILLARS.estimated.status}

**Affichage obligatoire :**
- Source des données
- Hypothèses utilisées
- Indice de confiance

---

### ${METHOD_PILLARS.advised.emoji} ${METHOD_PILLARS.advised.title}

${METHOD_PILLARS.advised.description}

**Exemples :**
${METHOD_PILLARS.advised.examples.map(e => `- ${e}`).join('\n')}

**Statut :** ${METHOD_PILLARS.advised.statusEmoji} ${METHOD_PILLARS.advised.status}`
    },
    {
      id: 'method_better',
      title: '3. Ce que la méthode fait mieux',
      content: `## Avantages distinctifs

### 1. Transparence totale
Chaque donnée est classifiée : mesurée, estimée ou conseillée.
Pas de "boîte noire".

### 2. Plages réalistes
Jamais de valeur unique prétendument précise.
Toujours une fourchette avec niveau de confiance.

### 3. Contextualisation
Les mêmes données peuvent signifier différentes choses selon :
- L'objectif de l'athlète
- La phase de la saison
- L'historique

### 4. Aide à la décision, pas automatisation
L'outil informe, le coach décide.
La responsabilité reste humaine.`
    },
    {
      id: 'method_limits',
      title: '4. Ce que la méthode ne prétend pas faire',
      content: `## Limites explicites

### ❌ Diagnostic médical
Two For Coaching Lab est un outil sportif.
Tout signe de pathologie doit être évalué par un professionnel de santé.

### ❌ Prédiction absolue
Les estimations sont probabilistes.
La performance réelle dépend de facteurs non modélisables.

### ❌ Prescription automatique
Aucun plan d'entraînement n'est généré automatiquement.
L'outil propose, le coach compose.

### ❌ Remplacement du test labo
Pour certains objectifs ou certaines incertitudes, seul un test laboratoire peut lever les doutes.`
    },
    {
      id: 'method_coach_usage',
      title: '5. Comment un coach doit l\'utiliser',
      content: `## Mode d'emploi pour le coach

### Étape 1 : Collecter
Entrer les données disponibles, en distinguant :
- Ce qui est mesuré (tests, capteurs)
- Ce qui est rapporté (sensations, historique)

### Étape 2 : Analyser
Lire les sorties en tenant compte :
- Du niveau de confiance affiché
- Du contexte de l'athlète
- Des alertes éventuelles

### Étape 3 : Croiser
Ne jamais se fier à un seul indicateur.
Trianguler avec les sensations terrain.

### Étape 4 : Décider
Le coach prend la décision finale.
L'outil a structuré l'information, pas dicté la réponse.

## Ce que l'outil fait pour vous

| Tâche | Outil | Coach |
|-------|-------|-------|
| Calculer | ✅ | — |
| Contextualiser | ✅ | ✅ |
| Proposer | ✅ | — |
| Décider | — | ✅ |
| Responsabilité | — | ✅ |`
    },
    {
      id: 'method_mistakes',
      title: '6. Erreurs fréquentes de lecture',
      content: `## Pièges à éviter

### Erreur 1 : Prendre une estimation pour une mesure
**Symptôme :** "Ma VLamax est de 0.42"
**Correction :** "Ma VLamax est estimée entre 0.38 et 0.46 avec 72% de confiance"

### Erreur 2 : Ignorer le niveau de confiance
**Symptôme :** Changer de stratégie sur une confiance de 0.45
**Correction :** Attendre plus de données ou faire un test direct

### Erreur 3 : Vouloir une valeur unique
**Symptôme :** "Donne-moi LE chiffre"
**Correction :** Accepter la plage comme information plus honnête

### Erreur 4 : Automatiser les décisions
**Symptôme :** Appliquer les suggestions sans réflexion
**Correction :** Contextualiser, adapter, décider

## La bonne posture

> "L'outil m'aide à voir plus clair.
> Je reste responsable de ce que je fais de cette clarté."`
    }
  ]
};

// Compatibilité avec l'ancien format
export const ACADEMY_METHOD_CHAPTERS = ACADEMY_METHOD_MODULE.chapters;

// =============================================
// HELPERS
// =============================================

export const getConfidenceLevelLabel = (confidence: number): string => {
  if (confidence >= 0.85) return "★★★★☆ Haute confiance";
  if (confidence >= 0.70) return "★★★☆☆ Confiance modérée";
  if (confidence >= 0.55) return "★★☆☆☆ Confiance limitée";
  return "★☆☆☆☆ Confiance faible";
};

export const getConfidenceStars = (confidence: number): string => {
  if (confidence >= 0.85) return "★★★★☆";
  if (confidence >= 0.70) return "★★★☆☆";
  if (confidence >= 0.55) return "★★☆☆☆";
  return "★☆☆☆☆";
};

export function getPillarForData(dataType: string): DataPillar {
  const measuredTypes = ['ftp_measured', 'pmax', 'vo2max_lab', 'lactate', 'weight', 'age', 'sex', 'test_terrain', 'fc_max', 'vma'];
  const estimatedTypes = ['vlamax', 'tte', 'economy', 'nutrition', 'ftp_estimated', 'vo2max_estimated', 'fatigue', 'race_readiness'];
  
  if (measuredTypes.some(t => dataType.toLowerCase().includes(t))) return 'measured';
  if (estimatedTypes.some(t => dataType.toLowerCase().includes(t))) return 'estimated';
  return 'advised';
}

export function formatMethodologyText(
  value: number | string,
  context: {
    type: DataPillar;
    confidence?: number;
    unit?: string;
    range?: [number, number];
  }
): string {
  const { type, confidence, unit = '', range } = context;
  
  if (type === 'measured') {
    return `${value}${unit} (mesuré)`;
  }
  
  if (type === 'estimated') {
    if (range) {
      const confText = confidence ? ` • confiance ${(confidence * 100).toFixed(0)}%` : '';
      return `${range[0]}–${range[1]}${unit}${confText}`;
    }
    const confText = confidence ? ` (confiance ${(confidence * 100).toFixed(0)}%)` : ' (estimé)';
    return `${value}${unit}${confText}`;
  }
  
  return `${value}${unit} (suggestion)`;
}

export const ASSISTANT_METHOD_RESPONSE = (metricName: string, isEstimated: boolean, confidence: number): string => {
  const confidenceLabel = confidence >= 0.85 ? "élevée" : confidence >= 0.65 ? "modérée" : "faible";
  const sourceLabel = isEstimated ? "estimation issue du modèle Two For Coaching Lab Method™" : "mesure directe";
  
  return `Cette ${metricName} est une ${sourceLabel} (confiance ${confidenceLabel} ≈ ${confidence.toFixed(2)}). 
Selon la Two For Coaching Lab Method™, elle doit être interprétée comme une indication de profil énergétique, pas comme une mesure directe.
Le coach reste le décideur final.`;
};

export const METHOD_ABOUT_SECTION = {
  title: "Two For Coaching Lab Method™",
  subtitle: "Méthodologie d'analyse physiologique pour l'entraînement d'endurance",
  definition: METHODOLOGY_TEXTS.OFFICIAL_DEFINITION,
  goldenRule: METHODOLOGY_TEXTS.GOLDEN_RULE,
  positioning: METHODOLOGY_TEXTS.STRATEGIC_POSITIONING,
  pillars: METHOD_PILLARS,
  outputs: METHOD_OUTPUTS,
  disclaimer: LEGAL_DISCLAIMER,
  scientificNote: SCIENTIFIC_ATTRIBUTION
};
