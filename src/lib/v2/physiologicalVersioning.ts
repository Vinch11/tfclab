/**
 * SYSTÈME DE VALIDATION SCIENTIFIQUE CONTINUE — Two For Coaching Lab V2
 * 
 * OBJECTIF :
 * - Renforcer la crédibilité scientifique
 * - Tracer l'évolution des modèles
 * - Rendre explicites les limites
 * - Éviter l'effet "boîte noire"
 * 
 * Ce système NE modifie PAS automatiquement les résultats utilisateurs.
 * Il ajoute une couche de TRANSPARENCE, VERSIONING et PÉDAGOGIE.
 */

// =============================================
// 1️⃣ TYPES & INTERFACES
// =============================================

export type EngineId = 
  | 'vlamax_bike'
  | 'vlamax_cap'
  | 'tte'
  | 'fatigue'
  | 'nutrition'
  | 'race_readiness'
  | 'injury_risk'
  | 'running_economy'
  | 'ifsc';

export type ValidationLevel = 
  | 'validated'      // 🟢 Validé indirectement (littérature + terrain)
  | 'modeled'        // 🟡 Modélisation avancée (sans mesure directe)
  | 'exploratory';   // 🔴 Estimation exploratoire

export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PhysioEngineVersion {
  engine: EngineId;
  version: string;
  versionCode: string; // Ex: TFCL-BIKE-V2.0
  date: string;
  validationLevel: ValidationLevel;
  confidenceRange: [number, number]; // [min, max] confidence
  
  // Documentation
  descriptionShort: string;
  descriptionLong: string;
  formula?: string;
  limits: string[];
  hypotheses: string[];
  
  // References
  references: ScientificReference[];
  
  // Compatibility
  backwardCompatible: boolean;
  previousVersion?: string;
}

export interface ScientificReference {
  authors: string;
  year: number;
  title: string;
  journal?: string;
  pubmedId?: string;
  url?: string;
  relevance: string;
}

export interface ChangelogEntry {
  id: string;
  engineName: string;
  version: string;
  date: string;
  descriptionShort: string;
  descriptionLong: string;
  impactLevel: ImpactLevel;
  backwardCompatible: boolean;
  references: string[];
  visibleToUser: boolean;
  changes: string[];
}

export interface SnapshotEngineMetadata {
  snapshotId: string;
  date: string;
  enginesUsed: {
    engine: EngineId;
    versionCode: string;
    confidenceLevel: number;
  }[];
}

// =============================================
// 2️⃣ REGISTRE DES MOTEURS PHYSIOLOGIQUES
// =============================================

export const PHYSIO_ENGINES: Record<EngineId, PhysioEngineVersion> = {
  vlamax_bike: {
    engine: 'vlamax_bike',
    version: '2.0',
    versionCode: 'TFCL-BIKE-V2.0',
    date: '2025-01-18',
    validationLevel: 'modeled',
    confidenceRange: [0.55, 0.90],
    
    descriptionShort: 'Estimation VLamax vélo via ratio Pmax/FTP, TTE et FTP/kg',
    descriptionLong: `La VLamax Vélo V2 utilise une formule multi-factorielle :
VLamax_raw = 0.30 + 0.20×(pmax_ratio) + 0.15×(ftp_kg) + 0.15×(1-tte_factor)

Cette approche combine trois indicateurs complémentaires pour estimer
le taux de production glycolytique sans mesure lactate directe.`,
    
    formula: `VLamax_raw = 0.30 
  + 0.20 × clamp((pmax_ratio - 1.8) / 0.6, 0, 1)
  + 0.15 × clamp((ftp_kg - 4.5) / 1.5, 0, 1)
  + 0.15 × (1 - tte_factor)
VLamax_final = clamp(VLamax_raw, 0.20, 0.90)`,
    
    limits: [
      'Nécessite FTP et TTE fiables (test récent < 4 semaines)',
      'Pmax 5s doit être un effort maximal réel, pas estimé',
      'Ne remplace pas un test lactate pour diagnostic fin',
      'Précision estimée : ±0.05 à ±0.10 selon qualité des données'
    ],
    
    hypotheses: [
      'Le ratio Pmax/FTP reflète le potentiel glycolytique relatif',
      'Le TTE est inversement corrélé à la VLamax',
      'Le FTP/kg influence modérément le profil métabolique'
    ],
    
    references: [
      {
        authors: 'Mader A, Heck H',
        year: 1986,
        title: 'A theory of the metabolic origin of "anaerobic threshold"',
        journal: 'Int J Sports Med',
        relevance: 'Fondements théoriques du modèle VLamax'
      },
      {
        authors: 'Jones AM, Vanhatalo A',
        year: 2017,
        title: 'The critical power concept',
        journal: 'Eur J Appl Physiol',
        relevance: 'Relation puissance critique et durabilité'
      }
    ],
    
    backwardCompatible: false,
    previousVersion: 'TFCL-BIKE-V1.2'
  },
  
  vlamax_cap: {
    engine: 'vlamax_cap',
    version: '1.5',
    versionCode: 'TFCL-CAP-V1.5',
    date: '2025-01-10',
    validationLevel: 'modeled',
    confidenceRange: [0.45, 0.75],
    
    descriptionShort: 'Estimation VLamax CAP via sprint 15s, ratio VMA/CSS et TTE',
    descriptionLong: `L'estimation VLamax course à pied utilise trois sources :
1. Sprint 15 secondes (distance ou puissance)
2. Ratio VMA / CSS (vitesse critique)
3. Cross-validation avec TTE

La confiance est généralement plus faible que vélo (moins de données précises).`,
    
    limits: [
      'Sprint 15s doit être sur piste plate, conditions standardisées',
      'VMA et CSS doivent être récents (< 6 semaines)',
      'La puissance sprint CAP est moins précise que vélo',
      'Précision estimée : ±0.08 à ±0.12'
    ],
    
    hypotheses: [
      'La distance 15s reflète la capacité glycolytique',
      'Le ratio VMA/CSS indique l\'écart aérobie/anaérobie',
      'Le TTE CAP est corrélé au profil métabolique'
    ],
    
    references: [
      {
        authors: 'Billat V, Koralsztein JP',
        year: 1996,
        title: 'Significance of the velocity at VO2max',
        journal: 'Sports Med',
        relevance: 'Relation VMA et performance endurance'
      }
    ],
    
    backwardCompatible: true,
    previousVersion: 'TFCL-CAP-V1.4'
  },
  
  tte: {
    engine: 'tte',
    version: '1.3',
    versionCode: 'TFCL-TTE-V1.3',
    date: '2024-12-15',
    validationLevel: 'modeled',
    confidenceRange: [0.60, 0.85],
    
    descriptionShort: 'Time to Exhaustion au seuil — durabilité aérobie',
    descriptionLong: `Le TTE représente la durée maximale à intensité seuil (FTP/CSS).
Il est estimé via la dérive de puissance, l'historique d'entraînement
et les tests de durabilité structurés.`,
    
    limits: [
      'Fortement influencé par la fraîcheur du jour',
      'La dérive FC peut fausser l\'estimation',
      'Nécessite des efforts longs (>40min) pour validation',
      'Précision estimée : ±3 à ±5 minutes'
    ],
    
    hypotheses: [
      'La dérive de puissance/vitesse reflète la fatigue centrale et périphérique',
      'Un TTE élevé indique une bonne oxydation des graisses',
      'Le TTE est partiellement entraînable via endurance longue'
    ],
    
    references: [
      {
        authors: 'Burnley M, Jones AM',
        year: 2007,
        title: 'Power-duration relationship: physiology, fatigue, and applications',
        journal: 'Eur J Appl Physiol',
        relevance: 'Fondements du concept TTE'
      }
    ],
    
    backwardCompatible: true
  },
  
  fatigue: {
    engine: 'fatigue',
    version: '2.0',
    versionCode: 'TFCL-FATIGUE-V2.0',
    date: '2025-01-18',
    validationLevel: 'modeled',
    confidenceRange: [0.50, 0.80],
    
    descriptionShort: 'Fatigue quantifiée multi-factorielle (Charge, Réponse, Ressenti)',
    descriptionLong: `La Fatigue V2 utilise 3 piliers pondérés :
- Charge (40%) : TSS 7j et tendance
- Réponse (35%) : TTE effectif et Potentiel Physiologique
- Ressenti (25%) : check-in stress/fatigue

Score global = 100 - moyenne pondérée des piliers.`,
    
    formula: `Fatigue = 100 - (0.40×Charge_score + 0.35×Réponse_score + 0.25×Ressenti_score)`,
    
    limits: [
      'Dépend de la qualité des check-ins utilisateur',
      'Le TSS doit être synchronisé (< 24h)',
      'Ne détecte pas la fatigue mentale isolée',
      'Précision contextuelle, pas médicale'
    ],
    
    hypotheses: [
      'La fatigue est un état multi-factoriel',
      'Les 3 piliers sont complémentaires et non redondants',
      'Le ressenti apporte une information unique'
    ],
    
    references: [
      {
        authors: 'Meeusen R et al.',
        year: 2013,
        title: 'Prevention, diagnosis, and treatment of overtraining syndrome',
        journal: 'Med Sci Sports Exerc',
        relevance: 'Marqueurs de fatigue et surmenage'
      }
    ],
    
    backwardCompatible: false,
    previousVersion: 'TFCL-FATIGUE-V1.0'
  },
  
  nutrition: {
    engine: 'nutrition',
    version: '1.2',
    versionCode: 'TFCL-NUTRI-V1.2',
    date: '2024-11-20',
    validationLevel: 'modeled',
    confidenceRange: [0.45, 0.75],
    
    descriptionShort: 'Nutrition prédictive basée sur VLamax et intensité',
    descriptionLong: `Le modèle nutritionnel estime les besoins en glucides
selon le profil métabolique (VLamax) et l'intensité prévue.
Il prédit les risques hypoglycémiques et les fenêtres d'apport.`,
    
    limits: [
      'Individuel : la tolérance GI varie énormément',
      'Basé sur des moyennes, pas sur des tests individuels',
      'Ne remplace pas un protocole nutrition personnalisé',
      'Conditions (chaleur, altitude) modifient les besoins'
    ],
    
    hypotheses: [
      'VLamax basse = meilleure oxydation graisses = moins de glucides nécessaires',
      'L\'intensité détermine la contribution glycolytique',
      'Le timing d\'apport influence la performance'
    ],
    
    references: [
      {
        authors: 'Burke LM et al.',
        year: 2011,
        title: 'Carbohydrates for training and competition',
        journal: 'J Sports Sci',
        relevance: 'Guidelines apports glucidiques'
      }
    ],
    
    backwardCompatible: true
  },
  
  race_readiness: {
    engine: 'race_readiness',
    version: '1.4',
    versionCode: 'TFCL-RR-V1.4',
    date: '2024-12-01',
    validationLevel: 'modeled',
    confidenceRange: [0.55, 0.80],
    
    descriptionShort: 'Score de préparation course multi-dimensionnel',
    descriptionLong: `Potentiel Physiologique combine :
- Fitness (FTP/VMA vs cible)
- Fraîcheur (inverse fatigue)
- Profil (VLamax vs optimal objectif)
- Durabilité (TTE vs cible)

Score global pondéré selon l'objectif.`,
    
    limits: [
      'Ne prédit pas la performance exacte',
      'Facteurs externes (météo, tactique) non inclus',
      'Dépend de la qualité des données d\'entrée',
      'Score contextuel, pas prédictif'
    ],
    
    hypotheses: [
      'La performance dépend de multiples facteurs mesurables',
      'La fraîcheur est aussi importante que la fitness',
      'Le profil métabolique doit matcher l\'objectif'
    ],
    
    references: [
      {
        authors: 'Banister EW',
        year: 1991,
        title: 'Modeling elite athletic performance',
        journal: 'Physiological Testing of Elite Athletes',
        relevance: 'Modèle fitness-fatigue'
      }
    ],
    
    backwardCompatible: true
  },
  
  injury_risk: {
    engine: 'injury_risk',
    version: '2.0',
    versionCode: 'TFCL-INJURY-V2.0',
    date: '2025-01-18',
    validationLevel: 'exploratory',
    confidenceRange: [0.40, 0.70],
    
    descriptionShort: 'Indice de risque blessure contextuel (CAP/Vélo)',
    descriptionLong: `L'indice de risque combine :
- CAP : Fatigue (35%) + VLamax (25%) + TTE (25%) + Économie (15%)
- Vélo : Fatigue (40%) + VLamax (35%) + TTE (25%)

C'est un indicateur de CONTEXTE À RISQUE, pas une prédiction.`,
    
    limits: [
      'NE PRÉDIT PAS les blessures',
      'Identifie un contexte à risque seulement',
      'Facteurs biomécaniques non inclus',
      'Ne remplace pas un avis médical'
    ],
    
    hypotheses: [
      'La fatigue augmente le risque de blessure',
      'Un TTE bas indique une capacité de récupération réduite',
      'La VLamax élevée augmente le stress métabolique'
    ],
    
    references: [
      {
        authors: 'Gabbett TJ',
        year: 2016,
        title: 'The training-injury prevention paradox',
        journal: 'Br J Sports Med',
        relevance: 'Relation charge/blessure'
      }
    ],
    
    backwardCompatible: false,
    previousVersion: 'TFCL-INJURY-V1.0'
  },
  
  running_economy: {
    engine: 'running_economy',
    version: '1.1',
    versionCode: 'TFCL-ECON-V1.1',
    date: '2024-10-15',
    validationLevel: 'modeled',
    confidenceRange: [0.50, 0.75],
    
    descriptionShort: 'Score d\'économie de course basé sur FC et allure',
    descriptionLong: `L'économie CAP est estimée via :
- Dérive FC sur effort stable
- Ratio allure/FC
- Comparaison historique

Score normalisé 0-100, plus élevé = plus économe.`,
    
    limits: [
      'Fortement influencé par la chaleur et l\'hydratation',
      'La FC est un proxy imparfait du coût métabolique',
      'Nécessite des efforts standardisés pour comparaison',
      'Ne mesure pas l\'économie mécanique pure'
    ],
    
    hypotheses: [
      'Une FC stable à allure donnée indique une bonne économie',
      'La dérive FC reflète la fatigue et l\'inefficacité',
      'L\'économie est partiellement entraînable'
    ],
    
    references: [
      {
        authors: 'Barnes KR, Kilding AE',
        year: 2015,
        title: 'Running economy: measurement, norms, and determining factors',
        journal: 'Sports Med Open',
        relevance: 'Définition et mesure de l\'économie'
      }
    ],
    
    backwardCompatible: true
  },
  
  ifsc: {
    engine: 'ifsc',
    version: '1.0',
    versionCode: 'TFCL-IFSC-V1.0',
    date: '2024-09-01',
    validationLevel: 'exploratory',
    confidenceRange: [0.40, 0.65],
    
    descriptionShort: 'Indice de Force Spécifique Cycliste',
    descriptionLong: `L'IFSC évalue le profil force/cadence :
- Croise cadence préférée et VLamax
- Identifie profil force, vélocité ou équilibré
- Suggère des zones d'entraînement adaptées`,
    
    limits: [
      'Basé sur des corrélations, pas des mesures de couple',
      'La cadence optimale varie selon le terrain',
      'Ne mesure pas la force musculaire réelle',
      'Exploratoire — à valider individuellement'
    ],
    
    hypotheses: [
      'La cadence préférée reflète le type de fibres dominant',
      'Un profil VLamax élevé favorise la vélocité',
      'Le travail de force peut modifier la cadence optimale'
    ],
    
    references: [],
    
    backwardCompatible: true
  }
};

// =============================================
// 3️⃣ CHANGELOG DES MOTEURS
// =============================================

export const PHYSIO_ENGINE_CHANGELOG: ChangelogEntry[] = [
  {
    id: 'bike-v2.0',
    engineName: 'VLamax Vélo',
    version: '2.0',
    date: '2025-01-18',
    descriptionShort: 'Nouvelle formule officielle TFCL avec 3 composantes',
    descriptionLong: `Refonte complète de la formule VLamax vélo :
- Nouveau ratio Pmax/FTP avec mapping [1.8-2.4]
- Intégration FTP/kg comme facteur secondaire (15%)
- TTE factor avec seuils 45/55 min
- Bornes physiologiques strictes [0.20-0.90]
- Niveaux de confiance explicites selon les données`,
    impactLevel: 'HIGH',
    backwardCompatible: false,
    references: ['Mader & Heck 1986', 'Jones & Vanhatalo 2017'],
    visibleToUser: true,
    changes: [
      'Formule cœur modifiée',
      'Ajout composante FTP/kg',
      'Nouveaux seuils TTE',
      'Confiance dynamique'
    ]
  },
  {
    id: 'fatigue-v2.0',
    engineName: 'Fatigue Quantifiée',
    version: '2.0',
    date: '2025-01-18',
    descriptionShort: 'Approche 3 piliers (Charge, Réponse, Ressenti)',
    descriptionLong: `Refonte de la fatigue avec pondérations officielles :
- Charge (40%) : TSS 7j normalisé
- Réponse (35%) : TTE et Potentiel Physiologique
- Ressenti (25%) : Check-in stress/fatigue
Score inversé : fatigue = 100 - moyenne pondérée`,
    impactLevel: 'HIGH',
    backwardCompatible: false,
    references: ['Meeusen 2013'],
    visibleToUser: true,
    changes: [
      'Nouvelle architecture 3 piliers',
      'Pondérations officielles',
      'Score inversé pour cohérence',
      'Interprétation automatique'
    ]
  },
  {
    id: 'injury-v2.0',
    engineName: 'Risque Blessure',
    version: '2.0',
    date: '2025-01-18',
    descriptionShort: 'Formules séparées CAP et Vélo',
    descriptionLong: `Séparation des formules par sport :
- CAP : Fatigue (35%) + VLamax (25%) + TTE (25%) + Économie (15%)
- Vélo : Fatigue (40%) + VLamax (35%) + TTE (25%)
Quadrants d'interprétation unifiés.`,
    impactLevel: 'MEDIUM',
    backwardCompatible: false,
    references: ['Gabbett 2016'],
    visibleToUser: true,
    changes: [
      'Formules spécifiques par sport',
      'Nouveaux facteurs et pondérations',
      'Quadrants d\'interprétation'
    ]
  },
  {
    id: 'cap-v1.5',
    engineName: 'VLamax CAP',
    version: '1.5',
    date: '2025-01-10',
    descriptionShort: 'Amélioration cross-validation VMA/CSS',
    descriptionLong: `Ajout de la cross-validation via ratio VMA/CSS
pour améliorer la robustesse de l'estimation.`,
    impactLevel: 'LOW',
    backwardCompatible: true,
    references: ['Billat 1996'],
    visibleToUser: true,
    changes: [
      'Cross-validation VMA/CSS',
      'Confiance ajustée'
    ]
  }
];

// =============================================
// 4️⃣ NIVEAUX DE VALIDATION SCIENTIFIQUE
// =============================================

export const VALIDATION_LEVELS: Record<ValidationLevel, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
}> = {
  validated: {
    label: 'Validé indirectement',
    icon: '🟢',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-500/10',
    description: 'Basé sur la littérature scientifique et validé par données terrain'
  },
  modeled: {
    label: 'Modélisation avancée',
    icon: '🟡',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
    description: 'Modèle physiologique sans mesure directe — estimation contextualisée'
  },
  exploratory: {
    label: 'Estimation exploratoire',
    icon: '🔴',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/10',
    description: 'Approche exploratoire — à valider individuellement avec le coach'
  }
};

// =============================================
// 5️⃣ RÉFÉRENCES SCIENTIFIQUES GLOBALES
// =============================================

export const SCIENTIFIC_REFERENCES_GLOBAL: ScientificReference[] = [
  {
    authors: 'Mader A, Heck H',
    year: 1986,
    title: 'A theory of the metabolic origin of "anaerobic threshold"',
    journal: 'Int J Sports Med',
    relevance: 'Fondements théoriques VLamax et seuils métaboliques'
  },
  {
    authors: 'Faude O, Kindermann W, Meyer T',
    year: 2009,
    title: 'Lactate threshold concepts: how valid are they?',
    journal: 'Sports Med',
    relevance: 'Validité des concepts de seuil lactate'
  },
  {
    authors: 'Seiler S',
    year: 2010,
    title: 'What is best practice for training intensity and duration distribution?',
    journal: 'Int J Sports Physiol Perform',
    relevance: 'Distribution d\'intensité et adaptations'
  },
  {
    authors: 'Jones AM, Vanhatalo A',
    year: 2017,
    title: 'The critical power concept',
    journal: 'Eur J Appl Physiol',
    relevance: 'Puissance critique et W\' (W prime)'
  },
  {
    authors: 'Burnley M, Jones AM',
    year: 2007,
    title: 'Power-duration relationship: physiology, fatigue, and applications',
    journal: 'Eur J Appl Physiol',
    relevance: 'Relation puissance-durée et TTE'
  },
  {
    authors: 'Gabbett TJ',
    year: 2016,
    title: 'The training-injury prevention paradox',
    journal: 'Br J Sports Med',
    relevance: 'Paradoxe charge/blessure et ACWR'
  },
  {
    authors: 'Burke LM et al.',
    year: 2011,
    title: 'Carbohydrates for training and competition',
    journal: 'J Sports Sci',
    relevance: 'Guidelines nutrition et performance'
  },
  {
    authors: 'Meeusen R et al.',
    year: 2013,
    title: 'Prevention, diagnosis, and treatment of overtraining syndrome',
    journal: 'Med Sci Sports Exerc',
    relevance: 'Marqueurs de fatigue et surmenage'
  },
  {
    authors: 'San Millán I, Brooks GA',
    year: 2018,
    title: 'Assessment of metabolic flexibility by means of measuring blood lactate',
    journal: 'Cell Metab',
    relevance: 'Flexibilité métabolique et substrats'
  }
];

// =============================================
// 6️⃣ MESSAGES LÉGAUX & SCIENTIFIQUES
// =============================================

export const LEGAL_DISCLAIMER = {
  short: "Estimation modélisée — ne remplace pas une mesure directe.",
  
  medium: `Two For Coaching Lab fournit des modèles physiologiques d'aide à la décision.
Les valeurs estimées ne constituent pas une mesure médicale.`,
  
  full: `Two For Coaching Lab est un outil d'aide à la décision pour les coachs et athlètes.
Les valeurs affichées sont des ESTIMATIONS basées sur des modèles physiologiques 
validés par la littérature scientifique, mais sans mesure directe individuelle.

Ces estimations :
- NE REMPLACENT PAS un test en laboratoire
- NE CONSTITUENT PAS un diagnostic médical
- DOIVENT être interprétées par un coach qualifié
- PEUVENT varier selon les conditions du jour

En cas de doute sur votre santé, consultez un professionnel médical.`
};

export const NON_RETROACTIVITY_RULE = {
  title: 'Politique de non-rétroactivité',
  description: `Un snapshot ancien NE change PAS rétroactivement.
Les nouvelles versions de moteur s'appliquent uniquement aux nouveaux calculs.`,
  
  recalculateOption: `Si vous souhaitez recalculer un ancien snapshot avec le moteur actuel,
utilisez le bouton "Recalculer avec moteur V2".
Une comparaison AVANT / APRÈS sera affichée.`
};

// =============================================
// 7️⃣ FONCTIONS UTILITAIRES
// =============================================

export function getEngineVersion(engineId: EngineId): PhysioEngineVersion {
  return PHYSIO_ENGINES[engineId];
}

export function getEngineVersionCode(engineId: EngineId): string {
  return PHYSIO_ENGINES[engineId].versionCode;
}

export function getValidationBadge(engineId: EngineId): {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
} {
  const level = PHYSIO_ENGINES[engineId].validationLevel;
  return VALIDATION_LEVELS[level];
}

export function getEngineChangelog(engineId: EngineId): ChangelogEntry[] {
  const engine = PHYSIO_ENGINES[engineId];
  return PHYSIO_ENGINE_CHANGELOG.filter(
    entry => entry.engineName.toLowerCase().includes(engineId.replace('_', ' '))
  );
}

export function formatEngineVersion(engineId: EngineId): string {
  const engine = PHYSIO_ENGINES[engineId];
  return `${engine.versionCode} (${engine.date})`;
}

export function createSnapshotMetadata(
  snapshotId: string,
  engines: { engine: EngineId; confidence: number }[]
): SnapshotEngineMetadata {
  return {
    snapshotId,
    date: new Date().toISOString(),
    enginesUsed: engines.map(e => ({
      engine: e.engine,
      versionCode: getEngineVersionCode(e.engine),
      confidenceLevel: e.confidence
    }))
  };
}

// =============================================
// 8️⃣ ACADEMY MODULE
// =============================================

export const ACADEMY_SCIENTIFIC_VALIDATION = {
  title: 'Validation Scientifique TFCL',
  icon: '🔬',
  
  modules: [
    {
      id: 'versioning',
      title: 'Comprendre le versioning physiologique',
      content: `Chaque moteur de calcul (VLamax, TTE, Fatigue...) possède une version.
Cette version indique :
- La formule utilisée
- La date de mise à jour
- Le niveau de validation scientifique

Vos anciens snapshots conservent la version utilisée lors du calcul.`
    },
    {
      id: 'validation_levels',
      title: 'Niveaux de validation',
      content: `🟢 Validé indirectement : Basé sur littérature + terrain
🟡 Modélisation avancée : Estimation sans mesure directe
🔴 Exploratoire : À valider individuellement

La plupart des moteurs TFCL sont 🟡 car ils estiment des valeurs
qui nécessiteraient un test labo pour une mesure directe.`
    },
    {
      id: 'references',
      title: 'Sources scientifiques',
      content: `TFCL s'appuie sur des publications peer-reviewed :
- Mader & Heck (VLamax théorie)
- Jones & Vanhatalo (Puissance critique)
- Seiler (Distribution d'intensité)
- Gabbett (Charge et blessure)

Ces références sont citées dans chaque module.`
    },
    {
      id: 'limits',
      title: 'Limites et précautions',
      content: `Ce que TFCL fait :
✓ Estimer des valeurs physiologiques
✓ Contextualiser avec confiance
✓ Aider la décision coach

Ce que TFCL ne fait pas :
✗ Diagnostiquer médicalement
✗ Prédire exactement la performance
✗ Remplacer un test laboratoire`
    }
  ]
};

// =============================================
// 9️⃣ PDF EXPORT SECTION
// =============================================

export const PDF_METHODOLOGY_SECTION = {
  title: 'Méthodologie & Niveau de Certitude',
  
  generateContent: (enginesUsed: EngineId[]): string => {
    let content = `## Moteurs physiologiques utilisés\n\n`;
    
    enginesUsed.forEach(engineId => {
      const engine = PHYSIO_ENGINES[engineId];
      const badge = VALIDATION_LEVELS[engine.validationLevel];
      
      content += `### ${engine.versionCode}\n`;
      content += `${badge.icon} ${badge.label}\n`;
      content += `${engine.descriptionShort}\n`;
      const lowLabel = engine.confidenceRange[0] >= 0.8 ? "Élevée" : engine.confidenceRange[0] >= 0.6 ? "Modérée" : "Limitée";
      const highLabel = engine.confidenceRange[1] >= 0.8 ? "Élevée" : engine.confidenceRange[1] >= 0.6 ? "Modérée" : "Limitée";
      content += `Fiabilité: ${lowLabel} – ${highLabel}\n\n`;
    });
    
    content += `## Avertissements\n`;
    content += LEGAL_DISCLAIMER.medium + '\n\n';
    
    content += `## Recommandations\n`;
    content += `Si une valeur est critique pour votre préparation, nous recommandons `;
    content += `un test en laboratoire pour confirmation.\n`;
    
    return content;
  }
};

// =============================================
// 🔟 CHATBOT ALIGNMENT
// =============================================

export const VERSIONING_CHATBOT_QA = [
  {
    question: 'Comment sont calculées les valeurs TFCL ?',
    answer: `Chaque métrique (VLamax, TTE, Fatigue...) utilise un moteur de calcul versionné.
Par exemple, VLamax Vélo utilise TFCL-BIKE-V2.0.

Chaque moteur a :
- Une formule explicite
- Des hypothèses documentées
- Des limites connues
- Un niveau de validation (🟢🟡🔴)

Tu peux voir le détail via l'icône ⓘ sur chaque module.`
  },
  {
    question: 'Pourquoi mes anciens snapshots ne changent pas ?',
    answer: `C'est la politique de non-rétroactivité TFCL.

Tes anciens snapshots conservent la version de moteur utilisée lors du calcul.
Si tu veux recalculer avec une nouvelle version, utilise le bouton "Recalculer".
Une comparaison AVANT/APRÈS sera affichée.`
  },
  {
    question: 'Que signifie le badge 🟡 ?',
    answer: `🟡 = Modélisation avancée

Cela signifie que la valeur est estimée sans mesure directe.
C'est le cas de la plupart des métriques TFCL (VLamax, TTE, Fatigue).

Pour une mesure directe, un test laboratoire est nécessaire.
L'estimation TFCL reste utile pour orienter l'entraînement.`
  },
  {
    question: 'Les calculs TFCL sont-ils fiables ?',
    answer: `Les calculs TFCL sont basés sur la littérature scientifique et validés par des données terrain.

Cependant :
- Ce sont des ESTIMATIONS, pas des mesures
- La précision dépend de la qualité des données d'entrée
- Certaines valeurs sont plus fiables que d'autres (voir niveau de confiance)

Pour une validation définitive, un test labo est recommandé.`
  }
];
