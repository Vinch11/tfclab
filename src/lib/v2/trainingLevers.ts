/**
 * TWO FOR COACHING LAB METHOD™ — Leviers d'Entraînement Autorisés
 * 
 * Définit quels leviers sont pertinents, prudents ou déconseillés
 * selon le sport, le profil physiologique et le niveau de risque.
 * 
 * Alimente :
 * - Annotations staff sur templates
 * - Suggestions Wahoo / Zwift / Rouvy
 * - Chatbot contextuel
 * - Moteur de recommandations
 */

import { METHOD_VERSION_DISPLAY } from './scientificGovernance';
import { SportType } from './sportSpecifics';

// ============================================
// TYPES
// ============================================

export type LeverStatus = 'priority' | 'caution' | 'discouraged';
export type LeverCategory = 'endurance' | 'strength' | 'tempo' | 'threshold' | 'vo2max' | 'sprint' | 'technique' | 'mixed';

export interface TrainingLever {
  id: string;
  name: string;
  category: LeverCategory;
  status: LeverStatus;
  effect: string;
  details: string[];
  riskLevel: 'low' | 'medium' | 'high';
  conditions?: string[];
  contraindications?: string[];
}

export interface SportLevers {
  sport: SportType;
  sportName: string;
  icon: string;
  priority: TrainingLever[];
  caution: TrainingLever[];
  discouraged: TrainingLever[];
  keyStatement: string;
}

// ============================================
// 1️⃣ PRINCIPE FONDATEUR
// ============================================

export const LEVERS_FOUNDING_PRINCIPLE = {
  id: 'principle',
  title: "Principe Fondateur",
  icon: "⚖️",
  officialText: `Un même levier d'entraînement peut être bénéfique dans une discipline et délétère dans une autre.
Two For Coaching Lab ne propose jamais un levier sans vérifier sa compatibilité avec le sport, le profil physiologique et le niveau de risque.`,
  consequences: [
    "Chaque levier est classé par sport",
    "Chaque levier est contextualisé selon le profil",
    "Aucun levier n'est universel"
  ]
};

// ============================================
// 2️⃣ LEVIERS EN VÉLO 🚴
// ============================================

export const CYCLING_LEVERS: SportLevers = {
  sport: 'cycling',
  sportName: 'Vélo',
  icon: '🚴',
  
  priority: [
    {
      id: 'endurance_z2_long',
      name: 'Endurance Z2 longue',
      category: 'endurance',
      status: 'priority',
      effect: 'Baisse VLamax, amélioration économie lipidique',
      details: [
        'Faible risque',
        'Applicable à tous niveaux',
        'Base de la durabilité'
      ],
      riskLevel: 'low'
    },
    {
      id: 'force_low_cadence',
      name: 'Force basse cadence (50–65 rpm)',
      category: 'strength',
      status: 'priority',
      effect: 'Sollicitation fibres lentes, baisse contribution glycolytique',
      details: [
        'Levier clé Dan Lorang',
        'À intégrer hors fatigue excessive',
        'Développe la force spécifique'
      ],
      riskLevel: 'low',
      conditions: ['Récupération suffisante', 'Pas de douleurs articulaires']
    },
    {
      id: 'tempo_sweetspot_long',
      name: 'Tempo / Sweet Spot long',
      category: 'tempo',
      status: 'priority',
      effect: 'Amélioration TTE',
      details: [
        'Central pour longue distance',
        'Doit être calibré selon TTE effectif',
        'Développe la durabilité au seuil'
      ],
      riskLevel: 'low'
    },
    {
      id: 'threshold_controlled',
      name: 'Seuil contrôlé',
      category: 'threshold',
      status: 'priority',
      effect: 'Stabilisation FTP',
      details: [
        'Utilisable si récupération suffisante',
        'Maintien des acquis de puissance'
      ],
      riskLevel: 'medium',
      conditions: ['Fatigue < 60%', 'TTE suffisant']
    }
  ],

  caution: [
    {
      id: 'vo2max_cycling',
      name: 'VO2max vélo',
      category: 'vo2max',
      status: 'caution',
      effect: 'Amélioration potentiel aérobie maximal',
      details: [
        'Utile pour potentiel',
        'Coût glycogénique élevé',
        'À limiter si VLamax déjà élevé'
      ],
      riskLevel: 'medium',
      conditions: ['VLamax < 0.5 mmol/L/s', 'Phase spécifique'],
      contraindications: ['VLamax élevé', 'Objectif ultra-endurance imminent']
    },
    {
      id: 'sprints_max_repeated',
      name: 'Sprints max répétés',
      category: 'sprint',
      status: 'caution',
      effect: 'Développement puissance maximale',
      details: [
        'Peut augmenter VLamax',
        'À utiliser seulement en phase ciblée'
      ],
      riskLevel: 'medium',
      conditions: ['Phase de développement', 'Objectif courte distance'],
      contraindications: ['Préparation Ironman', 'VLamax déjà élevé']
    }
  ],

  discouraged: [
    {
      id: 'intensity_no_recovery',
      name: 'Intensité fréquente sans récupération',
      category: 'mixed',
      status: 'discouraged',
      effect: 'Augmente fatigue centrale, dégrade durabilité',
      details: [
        'Accumulation toxique',
        'Contre-productif long terme',
        'Risque de surentraînement'
      ],
      riskLevel: 'high'
    }
  ],

  keyStatement: "En vélo, le danger n'est pas l'intensité ponctuelle, mais son accumulation mal absorbée."
};

// ============================================
// 3️⃣ LEVIERS EN COURSE À PIED 🏃
// ============================================

export const RUNNING_LEVERS: SportLevers = {
  sport: 'running',
  sportName: 'Course à pied',
  icon: '🏃',

  priority: [
    {
      id: 'easy_endurance_z1z2',
      name: 'Endurance facile (Z1–Z2)',
      category: 'endurance',
      status: 'priority',
      effect: 'Base de la robustesse et prévention blessure',
      details: [
        'Indispensable à la prévention blessure',
        'Développe la capacité aérobie sans stress mécanique',
        'Permet d\'accumuler du volume en sécurité'
      ],
      riskLevel: 'low'
    },
    {
      id: 'technique_economy',
      name: 'Travail technique / économie',
      category: 'technique',
      status: 'priority',
      effect: 'Améliore coût énergétique',
      details: [
        'Cadence naturelle optimisée',
        'Amplitude contrôlée',
        'Gain de performance sans surcharge'
      ],
      riskLevel: 'low'
    },
    {
      id: 'tempo_running_controlled',
      name: 'Tempo CAP contrôlé',
      category: 'tempo',
      status: 'priority',
      effect: 'Amélioration TTE CAP',
      details: [
        'À faible fréquence (1x/sem max)',
        'Développe la durabilité spécifique'
      ],
      riskLevel: 'medium',
      conditions: ['Historique de charge > 8 sem', 'Pas de douleur']
    }
  ],

  caution: [
    {
      id: 'threshold_running',
      name: 'Seuil CAP',
      category: 'threshold',
      status: 'caution',
      effect: 'Amélioration capacité au seuil',
      details: [
        'Coût mécanique élevé',
        'À pondérer par historique de charge'
      ],
      riskLevel: 'medium',
      conditions: ['Robustesse validée', 'Volume de base établi'],
      contraindications: ['Blessure récente', 'Fatigue > 70%']
    },
    {
      id: 'vo2max_running',
      name: 'VO2max CAP',
      category: 'vo2max',
      status: 'caution',
      effect: 'Développement potentiel maximal',
      details: [
        'Très stressant mécaniquement',
        'Risque blessure élevé',
        'Réservé à athlètes robustes'
      ],
      riskLevel: 'high',
      conditions: ['Athlète expérimenté', 'Historique > 2 ans', 'Pas de fragilité tendineuse'],
      contraindications: ['Débutant', 'Historique blessure', 'Fatigue élevée']
    }
  ],

  discouraged: [
    {
      id: 'sprints_running_repeated',
      name: 'Sprints CAP répétés',
      category: 'sprint',
      status: 'discouraged',
      effect: 'Développement vitesse maximale',
      details: [
        'Forte charge tendineuse',
        'Risque disproportionné par rapport au gain',
        'Réservé aux spécialistes vitesse'
      ],
      riskLevel: 'high'
    },
    {
      id: 'high_volume_intensity',
      name: 'Volume élevé + intensité',
      category: 'mixed',
      status: 'discouraged',
      effect: 'Surcharge globale',
      details: [
        'Combo le plus dangereux',
        'L\'app doit déclencher une alerte',
        'Chemin direct vers la blessure'
      ],
      riskLevel: 'high'
    }
  ],

  keyStatement: "En CAP, la performance ne progresse que si la structure encaisse."
};

// ============================================
// 4️⃣ LEVIERS EN TRIATHLON 🏊🚴🏃
// ============================================

export const TRIATHLON_LEVERS: SportLevers = {
  sport: 'triathlon',
  sportName: 'Triathlon',
  icon: '🏊🚴🏃',

  priority: [
    {
      id: 'intensity_bike_focused',
      name: 'Intensité principalement en vélo',
      category: 'mixed',
      status: 'priority',
      effect: 'Développement moteur avec risque minimal',
      details: [
        'Le vélo supporte l\'intensité',
        'Préserve la CAP pour la robustesse',
        'Stratégie Dan Lorang'
      ],
      riskLevel: 'low'
    },
    {
      id: 'running_robustness_economy',
      name: 'CAP orientée robustesse et économie',
      category: 'technique',
      status: 'priority',
      effect: 'Protection structure + efficience',
      details: [
        'Priorité à la durabilité mécanique',
        'Travail technique régulier',
        'Volume modéré, qualité prioritaire'
      ],
      riskLevel: 'low'
    },
    {
      id: 'specific_run_after_bike',
      name: 'Spécifique CAP après fatigue vélo',
      category: 'mixed',
      status: 'priority',
      effect: 'Adaptation à la contrainte triathlon',
      details: [
        'Avec parcimonie (1-2x/mois)',
        'Intensité modérée uniquement',
        'Simule les conditions de course'
      ],
      riskLevel: 'medium',
      conditions: ['TTE vélo suffisant', 'Fraîcheur globale']
    }
  ],

  caution: [
    {
      id: 'brick_intensive',
      name: 'Brick intensif',
      category: 'mixed',
      status: 'caution',
      effect: 'Simulation course réelle',
      details: [
        'Seulement si TTE vélo suffisant',
        'Fraîcheur préalable requise',
        'Risque blessure CAP post-vélo'
      ],
      riskLevel: 'medium',
      conditions: ['TTE vélo > 40 min', 'Fatigue < 50%', 'Expérience triathlon'],
      contraindications: ['Débutant triathlon', 'Historique blessure CAP']
    }
  ],

  discouraged: [
    {
      id: 'simultaneous_intensity',
      name: 'Intensité élevée simultanée vélo + CAP',
      category: 'mixed',
      status: 'discouraged',
      effect: 'Surcharge systémique',
      details: [
        'Double stress mécanique et métabolique',
        'Récupération impossible',
        'Chemin vers le surentraînement'
      ],
      riskLevel: 'high'
    },
    {
      id: 'aggressive_bricks_repeated',
      name: 'Enchaînements agressifs répétés',
      category: 'mixed',
      status: 'discouraged',
      effect: 'Accumulation de fatigue structurelle',
      details: [
        'Risque blessure exponentiel',
        'Contre-productif moyen terme',
        'À réserver aux phases spécifiques courtes'
      ],
      riskLevel: 'high'
    }
  ],

  keyStatement: "On développe le moteur en vélo, on protège la structure en course à pied."
};

// ============================================
// TOUS LES LEVIERS PAR SPORT
// ============================================

export const ALL_SPORT_LEVERS: Record<SportType, SportLevers> = {
  cycling: CYCLING_LEVERS,
  running: RUNNING_LEVERS,
  triathlon: TRIATHLON_LEVERS,
  swimming: {
    sport: 'swimming',
    sportName: 'Natation',
    icon: '🏊',
    priority: [],
    caution: [],
    discouraged: [],
    keyStatement: "En natation, la technique prime sur le volume."
  }
};

// ============================================
// 5️⃣ ANNOTATIONS TEMPLATES & SUGGESTIONS
// ============================================

export interface LeverAnnotation {
  lever: TrainingLever;
  sport: SportType;
  context: string;
  recommendation: string;
  alternative?: string;
  tone: 'positive' | 'caution' | 'warning' | 'block';
}

export function generateLeverAnnotation(
  leverId: string,
  sport: SportType,
  athleteProfile: {
    vlamax?: number;
    tte?: number;
    fatigue?: number;
    injuryRisk?: number;
  }
): LeverAnnotation | null {
  const sportLevers = ALL_SPORT_LEVERS[sport];
  if (!sportLevers) return null;

  const allLevers = [...sportLevers.priority, ...sportLevers.caution, ...sportLevers.discouraged];
  const lever = allLevers.find(l => l.id === leverId);
  if (!lever) return null;

  let tone: LeverAnnotation['tone'] = 'positive';
  let recommendation = '';
  let alternative: string | undefined;

  // Logique contextuelle
  if (lever.status === 'discouraged') {
    tone = 'block';
    recommendation = `Levier ${lever.name} déconseillé pour ce sport. Risque disproportionné.`;
    
    // Suggérer alternative
    if (lever.category === 'vo2max') {
      alternative = sport === 'running' ? 'Tempo long contrôlé' : 'Sweet Spot prolongé';
    } else if (lever.category === 'sprint') {
      alternative = 'Travail technique à intensité modérée';
    }
  } else if (lever.status === 'caution') {
    // Vérifier contraindications
    if (athleteProfile.vlamax && athleteProfile.vlamax > 0.5 && lever.id.includes('vo2')) {
      tone = 'warning';
      recommendation = `Levier ${lever.name} pertinent mais attention : VLamax élevé (${athleteProfile.vlamax.toFixed(2)}). Risque d'augmentation.`;
      alternative = 'Endurance Z2 longue ou Tempo';
    } else if (athleteProfile.fatigue && athleteProfile.fatigue > 70) {
      tone = 'warning';
      recommendation = `Levier ${lever.name} à reporter : fatigue trop élevée (${athleteProfile.fatigue}%).`;
    } else if (athleteProfile.injuryRisk && athleteProfile.injuryRisk > 60 && sport === 'running') {
      tone = 'warning';
      recommendation = `Séance CAP intense déconseillée au vu du risque blessure (${athleteProfile.injuryRisk}%).`;
      alternative = 'Endurance facile ou technique';
    } else {
      tone = 'caution';
      recommendation = `Levier ${lever.name} utilisable sous conditions. ${lever.conditions?.join(', ') || ''}`;
    }
  } else {
    tone = 'positive';
    recommendation = `Levier ${lever.name} recommandé. ${lever.effect}`;
  }

  return {
    lever,
    sport,
    context: `Sport: ${sportLevers.sportName}, Levier: ${lever.name}`,
    recommendation,
    alternative,
    tone
  };
}

// ============================================
// EXEMPLES D'ANNOTATIONS
// ============================================

export const ANNOTATION_EXAMPLES = [
  {
    context: "VO2max vélo, VLamax élevé",
    annotation: "Levier VO2 vélo pertinent, mais attention VLamax élevé.",
    tone: 'caution' as const
  },
  {
    context: "Seuil CAP, risque blessure élevé",
    annotation: "Séance CAP intense déconseillée au vu du risque blessure.",
    tone: 'warning' as const
  },
  {
    context: "VO2max CAP, alternative suggérée",
    annotation: "Alternative suggérée : tempo long au lieu de VO2.",
    tone: 'caution' as const
  }
];

// ============================================
// 6️⃣ RÉPONSES CHATBOT
// ============================================

export interface ChatbotLeverResponse {
  question: string;
  answerTemplate: string;
}

export const CHATBOT_LEVER_RESPONSES: ChatbotLeverResponse[] = [
  {
    question: "Pourquoi cette séance est conseillée ?",
    answerTemplate: "Cette séance utilise le levier {lever_name} qui est {status} en {sport}. {effect}. {conditions}"
  },
  {
    question: "Pourquoi cette séance est risquée ?",
    answerTemplate: "Cette séance sollicite le levier {lever_name} qui présente un risque {risk_level} en {sport}. {contraindications}. Alternative recommandée : {alternative}."
  },
  {
    question: "Quel levier cherche-t-on à développer ici ?",
    answerTemplate: "Cette séance cible le levier {lever_name} (catégorie : {category}). Effet attendu : {effect}. Statut en {sport} : {status}."
  }
];

/**
 * Génère une réponse chatbot pour un levier
 */
export function generateChatbotResponse(
  questionType: 'why_recommended' | 'why_risky' | 'what_lever',
  lever: TrainingLever,
  sport: SportType
): string {
  const sportLevers = ALL_SPORT_LEVERS[sport];
  const statusLabels = {
    priority: 'prioritaire et recommandé',
    caution: 'à utiliser avec prudence',
    discouraged: 'déconseillé'
  };
  const riskLabels = {
    low: 'faible',
    medium: 'modéré',
    high: 'élevé'
  };

  switch (questionType) {
    case 'why_recommended':
      return `Cette séance utilise le levier "${lever.name}" qui est ${statusLabels[lever.status]} en ${sportLevers.sportName}. ${lever.effect}. ${lever.conditions ? `Conditions : ${lever.conditions.join(', ')}.` : ''}`;
    
    case 'why_risky':
      return `Cette séance sollicite le levier "${lever.name}" qui présente un risque ${riskLabels[lever.riskLevel]} en ${sportLevers.sportName}. ${lever.contraindications ? `Contre-indications : ${lever.contraindications.join(', ')}.` : ''} ${lever.status === 'discouraged' ? sportLevers.keyStatement : ''}`;
    
    case 'what_lever':
      return `Cette séance cible le levier "${lever.name}" (catégorie : ${lever.category}). Effet attendu : ${lever.effect}. Statut en ${sportLevers.sportName} : ${statusLabels[lever.status]}.`;
    
    default:
      return '';
  }
}

// ============================================
// 7️⃣ GARDE-FOUS
// ============================================

export const LEVERS_SAFEGUARDS = {
  id: 'safeguards',
  title: "Garde-fous Leviers",
  icon: "🛡️",
  rules: [
    {
      rule: "Ne recommande jamais un levier interdit",
      implementation: "Filtrage automatique des leviers 'discouraged'"
    },
    {
      rule: "Ne propose jamais un levier sans justification",
      implementation: "Chaque suggestion inclut effet + conditions"
    },
    {
      rule: "Explique toujours 'pourquoi' en langage clair",
      implementation: "Templates de réponse chatbot standardisés"
    }
  ]
};

// ============================================
// DOCUMENT COMPLET
// ============================================

export const TRAINING_LEVERS_DOCUMENT = {
  title: "Leviers d'Entraînement Autorisés",
  subtitle: "Two For Coaching Lab Method™",
  version: METHOD_VERSION_DISPLAY,
  sections: [
    { id: 'principle', title: LEVERS_FOUNDING_PRINCIPLE.title, icon: LEVERS_FOUNDING_PRINCIPLE.icon, content: LEVERS_FOUNDING_PRINCIPLE },
    { id: 'cycling', title: 'Leviers Vélo', icon: CYCLING_LEVERS.icon, content: CYCLING_LEVERS },
    { id: 'running', title: 'Leviers Course à Pied', icon: RUNNING_LEVERS.icon, content: RUNNING_LEVERS },
    { id: 'triathlon', title: 'Leviers Triathlon', icon: TRIATHLON_LEVERS.icon, content: TRIATHLON_LEVERS },
    { id: 'safeguards', title: LEVERS_SAFEGUARDS.title, icon: LEVERS_SAFEGUARDS.icon, content: LEVERS_SAFEGUARDS }
  ]
};

// ============================================
// ACADEMY MODULE
// ============================================

export const ACADEMY_LEVERS_MODULE = {
  id: "training_levers",
  title: "Leviers d'Entraînement par Sport",
  icon: "🎚️",
  description: "Comprendre quels leviers utiliser selon la discipline",
  isRequired: false,
  estimatedTime: "20 min",
  chapters: [
    {
      id: "principle",
      title: "Principe fondateur",
      content: LEVERS_FOUNDING_PRINCIPLE.officialText,
      keyPoints: LEVERS_FOUNDING_PRINCIPLE.consequences
    },
    {
      id: "cycling",
      title: "Leviers vélo",
      content: CYCLING_LEVERS.keyStatement,
      keyPoints: CYCLING_LEVERS.priority.map(l => l.name)
    },
    {
      id: "running",
      title: "Leviers course à pied",
      content: RUNNING_LEVERS.keyStatement,
      keyPoints: [...RUNNING_LEVERS.priority.map(l => l.name), "⚠️ " + RUNNING_LEVERS.discouraged[0]?.name]
    },
    {
      id: "triathlon",
      title: "Leviers triathlon",
      content: TRIATHLON_LEVERS.keyStatement,
      keyPoints: TRIATHLON_LEVERS.priority.map(l => l.name)
    }
  ]
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Retourne les leviers pour un sport
 */
export function getLeversForSport(sport: SportType): SportLevers {
  return ALL_SPORT_LEVERS[sport];
}

/**
 * Retourne un levier par ID et sport
 */
export function getLeverById(leverId: string, sport: SportType): TrainingLever | undefined {
  const sportLevers = ALL_SPORT_LEVERS[sport];
  return [...sportLevers.priority, ...sportLevers.caution, ...sportLevers.discouraged]
    .find(l => l.id === leverId);
}

/**
 * Retourne tous les leviers prioritaires pour un sport
 */
export function getPriorityLevers(sport: SportType): TrainingLever[] {
  return ALL_SPORT_LEVERS[sport].priority;
}

/**
 * Retourne tous les leviers déconseillés pour un sport
 */
export function getDiscouragedLevers(sport: SportType): TrainingLever[] {
  return ALL_SPORT_LEVERS[sport].discouraged;
}

/**
 * Vérifie si un levier est autorisé pour un sport
 */
export function isLeverAllowed(leverId: string, sport: SportType): boolean {
  const discouraged = getDiscouragedLevers(sport);
  return !discouraged.some(l => l.id === leverId);
}

/**
 * Retourne le statement clé pour un sport
 */
export function getSportLeverStatement(sport: SportType): string {
  return ALL_SPORT_LEVERS[sport].keyStatement;
}

/**
 * Classifie une séance par ses leviers dominants
 */
export function classifySessionByLevers(
  sessionType: string,
  sport: SportType
): { levers: TrainingLever[]; status: LeverStatus; warnings: string[] } {
  const sportLevers = ALL_SPORT_LEVERS[sport];
  const allLevers = [...sportLevers.priority, ...sportLevers.caution, ...sportLevers.discouraged];
  
  // Mapping simple type -> leviers
  const typeToLevers: Record<string, string[]> = {
    'endurance': ['endurance_z2_long', 'easy_endurance_z1z2'],
    'tempo': ['tempo_sweetspot_long', 'tempo_running_controlled'],
    'threshold': ['threshold_controlled', 'threshold_running'],
    'vo2max': ['vo2max_cycling', 'vo2max_running'],
    'sprint': ['sprints_max_repeated', 'sprints_running_repeated'],
    'force': ['force_low_cadence'],
    'technique': ['technique_economy'],
    'brick': ['brick_intensive', 'specific_run_after_bike']
  };

  const leverIds = typeToLevers[sessionType.toLowerCase()] || [];
  const matchedLevers = allLevers.filter(l => leverIds.includes(l.id));
  
  // Déterminer le statut global
  let status: LeverStatus = 'priority';
  const warnings: string[] = [];
  
  for (const lever of matchedLevers) {
    if (lever.status === 'discouraged') {
      status = 'discouraged';
      warnings.push(`Levier ${lever.name} déconseillé en ${sportLevers.sportName}`);
    } else if (lever.status === 'caution' && status !== 'discouraged') {
      status = 'caution';
      warnings.push(`Levier ${lever.name} à utiliser avec prudence`);
    }
  }

  return { levers: matchedLevers, status, warnings };
}
