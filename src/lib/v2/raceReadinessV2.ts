/**
 * TWO FOR COACHING LAB METHOD™ — Race Readiness V2.1 Officiel
 * 
 * MODÈLE SIMPLIFIÉ (V2.1) :
 * - POTENTIEL (Metabolic Performance Compass™) = seule source de vérité
 * - La Disponibilité a été retirée du modèle car la fatigue n'est
 *   renseignée qu'une fois toutes les 3-4 semaines et manque de précision.
 * - DÉCISION (Race Readiness TFCL™) = Potentiel − Pénalités
 * 
 * RÈGLE TFCL :
 * "Ce score ne prédit pas un résultat. Il guide la décision."
 */

import type { CompassScores } from "@/lib/compassScoring";
import type { DisponibiliteTFCL, TFCLReadinessInput } from "./disponibiliteTFCL";
import { computeDisponibiliteTFCL } from "./disponibiliteTFCL";

// =============================================
// TYPES
// =============================================

export type RaceReadinessV2Category = 
  | 'preparation_required'  // <50
  | 'in_progress'           // 50-65
  | 'solid'                 // 65-80
  | 'ready'                 // >80
;

export type DataSourceType = 'measured' | 'estimated' | 'modeled';

export interface PotentialScore {
  score: number;                   // 0-100
  range?: [number, number];        // Plage si incertitude
  confidence: number;              // 0-1
  sources: {
    aerobic: { value: number; type: DataSourceType };
    tolerance: { value: number; type: DataSourceType };
    metabolic: { value: number; type: DataSourceType };
    robustness: { value: number; type: DataSourceType };
  };
  mainStrength: string | null;
  mainLimitation: string | null;
  explanation: string;
}

export interface AvailabilityScore {
  score: number;                   // 0-100
  confidence: number;              // 0-1
  factors: string[];
  alerts: string[];
  recommendation: string;
}

export interface DecisionFlags {
  healthAlert: boolean;
  injuryRiskHigh: boolean;
  fatigueCritical: boolean;
  dataIncomplete: boolean;
}

export interface RaceReadinessV2Result {
  // Les 3 piliers
  potential: PotentialScore;
  availability: AvailabilityScore;
  
  // Décision finale
  readiness: {
    score: number;                 // 0-100
    rawScore: number;              // Avant pénalités
    category: RaceReadinessV2Category;
    categoryLabel: string;
    categoryEmoji: string;
    confidenceGlobal: number;      // min(conf_potential, conf_availability)
    confidenceLabel: string;
  };
  
  // Garde-fous
  flags: DecisionFlags;
  penalties: {
    total: number;
    reasons: string[];
  };
  
  // Explication
  explanation: {
    why: string;
    watchouts: string[];
    suggestedFocus: string[];
  };
  
  // Pondérations utilisées
  weights: {
    potential: number;             // 0.65
    availability: number;          // 0.35
  };
  
  // Métadonnées
  timestamp: string;
  version: string;
  disclaimer: string;
}

// =============================================
// CONSTANTES OFFICIELLES
// =============================================

export const RACE_READINESS_V2_WEIGHTS = {
  potential: 0.65,
  availability: 0.35,
};

export const RACE_READINESS_V2_CATEGORIES = {
  preparation_required: {
    min: 0, max: 50,
    label: "Préparation requise",
    emoji: "🔴",
    color: 'destructive' as const,
    description: "Le profil nécessite du développement avant une échéance majeure."
  },
  in_progress: {
    min: 50, max: 65,
    label: "En progression",
    emoji: "🟠",
    color: 'warning' as const,
    description: "Progression en cours. Séances clés possibles avec adaptation."
  },
  solid: {
    min: 65, max: 80,
    label: "Solide",
    emoji: "🟡",
    color: 'info' as const,
    description: "Profil cohérent. Prêt pour des charges de qualité."
  },
  ready: {
    min: 80, max: 100,
    label: "Prêt (sous conditions)",
    emoji: "🟢",
    color: 'success' as const,
    description: "Conditions réunies pour une performance de qualité."
  },
};

export const RACE_READINESS_V2_PENALTIES = {
  healthAlert: 25,
  injuryRiskHigh: 20,
  fatigueCritical: 15,
  dataIncomplete: 5,
};

export const RACE_READINESS_V2_DEFINITIONS = {
  potential: {
    title: "Potentiel (Metabolic Performance Compass™)",
    definition: `Le potentiel représente le profil physiologique structurel (moteur), 
relativement stable à court terme. Il est basé sur VLamax, TTE, VO2max, 
économie, FatMax et leur confiance.`,
  },
  availability: {
    title: "Disponibilité (Disponibilité TFCL™)",
    definition: `La disponibilité représente l'état du jour : fatigue, stress, 
récupération et signaux objectifs/subjectifs. Elle varie rapidement 
et module la capacité à exprimer le potentiel.`,
  },
  decision: {
    title: "Décision (Race Readiness TFCL™)",
    definition: `Race Readiness est un indicateur décisionnel composite qui répond :
Que peut-on raisonnablement exiger maintenant (séance clé / course) 
compte tenu du potentiel ET de la disponibilité ?`,
  },
};

export const RACE_READINESS_V2_DISCLAIMER = 
  "Ce score ne prédit pas un résultat. Il guide la décision.";

export const RACE_READINESS_V2_FORMULA = `
RaceReadiness = clamp(
  0.65 × Potentiel_score + 0.35 × Disponibilité_score - Pénalités,
  0, 100
)

Justification :
- Le potentiel pèse plus (profil de fond)
- La disponibilité module l'expression (court terme)
- Les garde-fous appliquent des pénalités non négociables
`;

// =============================================
// HELPERS
// =============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function getCategory(score: number): RaceReadinessV2Category {
  if (score >= 80) return 'ready';
  if (score >= 65) return 'solid';
  if (score >= 50) return 'in_progress';
  return 'preparation_required';
}

function getCategoryInfo(category: RaceReadinessV2Category) {
  return RACE_READINESS_V2_CATEGORIES[category];
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.80) return "Très élevée";
  if (confidence >= 0.70) return "Élevée";
  if (confidence >= 0.55) return "Moyenne";
  if (confidence >= 0.40) return "Limitée";
  return "Faible";
}

function getDataSourceType(source: string): DataSourceType {
  const measuredSources = ['labo', 'test_terrain', 'observed', 'snapshot'];
  const estimatedSources = ['estimation', 'formula', 'model'];
  
  if (measuredSources.some(s => source.toLowerCase().includes(s))) return 'measured';
  if (estimatedSources.some(s => source.toLowerCase().includes(s))) return 'estimated';
  return 'modeled';
}

// =============================================
// EXTRACTION DU POTENTIEL DEPUIS COMPASS
// =============================================

export function extractPotentialFromCompass(compass: CompassScores): PotentialScore {
  const { capaciteAerobie, toleranceEffort, profilMetabolique, robustesse, globalScore } = compass;
  
  // Calcul de la plage avec précision adaptative
  // Plus la confiance est haute, plus la plage est étroite
  const avgConfidence = (
    capaciteAerobie.confidence + 
    toleranceEffort.confidence + 
    profilMetabolique.confidence + 
    robustesse.confidence
  ) / 4;
  
  // Marges affinées selon le niveau de confiance
  let rangeMargin: number;
  if (avgConfidence >= 0.8) {
    rangeMargin = 2; // Confiance très haute → ±2 points
  } else if (avgConfidence >= 0.7) {
    rangeMargin = 3; // Confiance haute → ±3 points
  } else if (avgConfidence >= 0.55) {
    rangeMargin = 5; // Confiance moyenne → ±5 points
  } else if (avgConfidence >= 0.4) {
    rangeMargin = 7; // Confiance limitée → ±7 points
  } else {
    rangeMargin = 10; // Confiance faible → ±10 points
  }
  
  const range: [number, number] = [
    Math.max(0, globalScore - rangeMargin),
    Math.min(100, globalScore + rangeMargin),
  ];
  
  return {
    score: globalScore,
    range,
    confidence: avgConfidence,
    sources: {
      aerobic: { 
        value: capaciteAerobie.score, 
        type: getDataSourceType(capaciteAerobie.source) 
      },
      tolerance: { 
        value: toleranceEffort.score, 
        type: getDataSourceType(toleranceEffort.source) 
      },
      metabolic: { 
        value: profilMetabolique.score, 
        type: getDataSourceType(profilMetabolique.source) 
      },
      robustness: { 
        value: robustesse.score, 
        type: getDataSourceType(robustesse.source) 
      },
    },
    mainStrength: compass.mainStrength,
    mainLimitation: compass.mainLimitation,
    explanation: generatePotentialExplanation(compass),
  };
}

function generatePotentialExplanation(compass: CompassScores): string {
  const score = compass.globalScore;
  
  if (score >= 80) {
    return `Profil physiologique excellent. ${compass.mainStrength ? `Point fort : ${compass.mainStrength}.` : ''} Moteur prêt pour une performance de qualité.`;
  }
  if (score >= 65) {
    return `Profil physiologique solide. ${compass.mainLimitation ? `Axe à surveiller : ${compass.mainLimitation}.` : ''} Capacité à absorber des charges importantes.`;
  }
  if (score >= 50) {
    return `Profil en construction. ${compass.mainLimitation ? `Priorité : ${compass.mainLimitation}.` : ''} Progression nécessaire avant échéance majeure.`;
  }
  return `Profil nécessitant du développement. ${compass.mainLimitation ? `Limitation principale : ${compass.mainLimitation}.` : ''} Focus sur les fondamentaux.`;
}

// =============================================
// EXTRACTION DE LA DISPONIBILITÉ
// =============================================

export function extractAvailabilityScore(disponibilite: DisponibiliteTFCL): AvailabilityScore {
  return {
    score: disponibilite.score,
    confidence: disponibilite.confidence === 'high' ? 0.9 : 
                disponibilite.confidence === 'medium' ? 0.7 : 0.5,
    factors: disponibilite.interpretation.mainReasons,
    alerts: disponibilite.alertMessages,
    recommendation: disponibilite.interpretation.recommendationLabel,
  };
}

// =============================================
// CALCUL DES GARDE-FOUS / PÉNALITÉS
// =============================================

interface GuardrailsInput {
  healthAlert?: boolean;
  injuryRiskLevel?: 'low' | 'moderate' | 'high' | 'critical';
  fatigueIndex?: number;
  dataCompleteness?: number;
}

function computePenalties(input: GuardrailsInput): { total: number; reasons: string[] } {
  let total = 0;
  const reasons: string[] = [];
  
  if (input.healthAlert) {
    total += RACE_READINESS_V2_PENALTIES.healthAlert;
    reasons.push("Alerte santé active (-25 pts)");
  }
  
  if (input.injuryRiskLevel === 'high' || input.injuryRiskLevel === 'critical') {
    total += RACE_READINESS_V2_PENALTIES.injuryRiskHigh;
    reasons.push("Risque blessure élevé (-20 pts)");
  }
  
  if (input.fatigueIndex !== undefined && input.fatigueIndex > 80) {
    total += RACE_READINESS_V2_PENALTIES.fatigueCritical;
    reasons.push("Fatigue critique (-15 pts)");
  }
  
  if (input.dataCompleteness !== undefined && input.dataCompleteness < 0.5) {
    total += RACE_READINESS_V2_PENALTIES.dataIncomplete;
    reasons.push("Données incomplètes (-5 pts)");
  }
  
  return { total, reasons };
}

// =============================================
// FONCTION PRINCIPALE : computeDecisionTFCL
// =============================================

export interface ComputeDecisionInput {
  // Compass (Potentiel)
  compass: CompassScores;
  
  // Disponibilité
  disponibilite?: DisponibiliteTFCL;
  readinessInput?: TFCLReadinessInput;
  
  // Garde-fous
  guardrails?: GuardrailsInput;
}

export function computeDecisionTFCL(input: ComputeDecisionInput): RaceReadinessV2Result {
  const { compass, guardrails } = input;
  
  // 1. Extraire le Potentiel
  const potential = extractPotentialFromCompass(compass);
  
  // 2. Calculer ou extraire la Disponibilité
  let disponibilite: DisponibiliteTFCL;
  if (input.disponibilite) {
    disponibilite = input.disponibilite;
  } else if (input.readinessInput) {
    disponibilite = computeDisponibiliteTFCL(input.readinessInput);
  } else {
    // Fallback: disponibilité neutre
    disponibilite = computeDisponibiliteTFCL({
      sleep: 7,
      fatigue: 7,
      soreness: 7,
      stress: 7,
      motivation: 7,
    });
  }
  
  const availability = extractAvailabilityScore(disponibilite);
  
  // 3. Calculer les pénalités
  const penalties = computePenalties({
    healthAlert: disponibilite.hasAlerts || guardrails?.healthAlert || false,
    injuryRiskLevel: guardrails?.injuryRiskLevel,
    fatigueIndex: guardrails?.fatigueIndex,
    dataCompleteness: compass.dataCompleteness,
  });
  
  // 4. Calcul du score Race Readiness V2
  const rawScore = 
    (RACE_READINESS_V2_WEIGHTS.potential * potential.score) + 
    (RACE_READINESS_V2_WEIGHTS.availability * availability.score);
  
  const finalScore = clamp(Math.round(rawScore - penalties.total), 0, 100);
  
  // 5. Catégorisation
  const category = getCategory(finalScore);
  const categoryInfo = getCategoryInfo(category);
  
  // 6. Confiance globale
  const confidenceGlobal = Math.min(potential.confidence, availability.confidence);
  
  // 7. Flags
  const flags: DecisionFlags = {
    healthAlert: disponibilite.hasAlerts || guardrails?.healthAlert || false,
    injuryRiskHigh: guardrails?.injuryRiskLevel === 'high' || guardrails?.injuryRiskLevel === 'critical',
    fatigueCritical: (guardrails?.fatigueIndex ?? 0) > 80,
    dataIncomplete: compass.dataCompleteness < 0.5,
  };
  
  // 8. Génération de l'explication
  const explanation = generateExplanation(potential, availability, category, penalties, flags);
  
  return {
    potential,
    availability,
    readiness: {
      score: finalScore,
      rawScore: Math.round(rawScore),
      category,
      categoryLabel: categoryInfo.label,
      categoryEmoji: categoryInfo.emoji,
      confidenceGlobal,
      confidenceLabel: getConfidenceLabel(confidenceGlobal),
    },
    flags,
    penalties,
    explanation,
    weights: RACE_READINESS_V2_WEIGHTS,
    timestamp: new Date().toISOString(),
    version: 'v2.0',
    disclaimer: RACE_READINESS_V2_DISCLAIMER,
  };
}

// =============================================
// GÉNÉRATION D'EXPLICATION
// =============================================

function generateExplanation(
  potential: PotentialScore,
  availability: AvailabilityScore,
  category: RaceReadinessV2Category,
  penalties: { total: number; reasons: string[] },
  flags: DecisionFlags
): { why: string; watchouts: string[]; suggestedFocus: string[] } {
  const watchouts: string[] = [];
  const suggestedFocus: string[] = [];
  
  // Pourquoi
  let why: string;
  
  if (category === 'ready') {
    why = `Potentiel élevé (${potential.score}/100) et disponibilité favorable (${availability.score}/100). Les conditions sont réunies pour exiger le meilleur.`;
  } else if (category === 'solid') {
    why = `Profil solide (potentiel ${potential.score}/100) avec disponibilité correcte (${availability.score}/100). Capable d'absorber une charge de qualité.`;
  } else if (category === 'in_progress') {
    if (potential.score < 60 && availability.score >= 60) {
      why = `Disponibilité correcte mais potentiel en construction (${potential.score}/100). Privilégier le développement du moteur.`;
    } else if (potential.score >= 60 && availability.score < 60) {
      why = `Potentiel correct mais disponibilité réduite (${availability.score}/100). Optimiser la récupération avant exigence maximale.`;
    } else {
      why = `Progression en cours sur les deux axes. Patience et régularité nécessaires.`;
    }
  } else {
    why = `Préparation insuffisante (potentiel ${potential.score}/100, disponibilité ${availability.score}/100). Focus sur les fondamentaux.`;
  }
  
  // Pénalités
  if (penalties.total > 0) {
    why += ` Attention : ${penalties.reasons.join(', ')}.`;
  }
  
  // Watchouts
  if (flags.healthAlert) {
    watchouts.push("Alerte santé active — consulter avant effort intense");
  }
  if (flags.injuryRiskHigh) {
    watchouts.push("Risque blessure élevé — adapter volume/intensité");
  }
  if (flags.fatigueCritical) {
    watchouts.push("Fatigue critique — priorité récupération");
  }
  if (flags.dataIncomplete) {
    watchouts.push("Données incomplètes — confiance réduite");
  }
  if (potential.mainLimitation) {
    watchouts.push(`Axe limitant : ${potential.mainLimitation}`);
  }
  if (availability.alerts.length > 0) {
    watchouts.push(...availability.alerts);
  }
  
  // Focus suggéré
  if (potential.score < 60) {
    suggestedFocus.push("Développer le moteur (charge progressive)");
    if (potential.mainLimitation?.toLowerCase().includes('tte')) {
      suggestedFocus.push("Priorité volume Z2 / TTE");
    }
    if (potential.mainLimitation?.toLowerCase().includes('vlamax')) {
      suggestedFocus.push("Ajuster le profil métabolique");
    }
  }
  if (availability.score < 60) {
    suggestedFocus.push("Optimiser récupération (sommeil, stress)");
    if (availability.factors.some(f => f.toLowerCase().includes('sommeil'))) {
      suggestedFocus.push("Priorité qualité de sommeil");
    }
    if (availability.factors.some(f => f.toLowerCase().includes('stress'))) {
      suggestedFocus.push("Gestion du stress");
    }
  }
  if (category === 'ready' && suggestedFocus.length === 0) {
    suggestedFocus.push("Maintenir et affiner (qualité > quantité)");
  }
  
  return { why, watchouts, suggestedFocus };
}

// =============================================
// HELPERS UI
// =============================================

export function getRaceReadinessV2Color(category: RaceReadinessV2Category): string {
  switch (category) {
    case 'ready': return 'text-green-500';
    case 'solid': return 'text-yellow-500';
    case 'in_progress': return 'text-orange-500';
    case 'preparation_required': return 'text-red-500';
  }
}

export function getRaceReadinessV2BgColor(category: RaceReadinessV2Category): string {
  switch (category) {
    case 'ready': return 'bg-green-500/10';
    case 'solid': return 'bg-yellow-500/10';
    case 'in_progress': return 'bg-orange-500/10';
    case 'preparation_required': return 'bg-red-500/10';
  }
}

export function getRaceReadinessV2BadgeClass(category: RaceReadinessV2Category): string {
  switch (category) {
    case 'ready': return 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30';
    case 'solid': return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30';
    case 'in_progress': return 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30';
    case 'preparation_required': return 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30';
  }
}

// =============================================
// QUADRANT HELPERS (pour le graphique)
// =============================================

export type DecisionQuadrant = 'go' | 'optimize_recovery' | 'build_engine' | 'caution';

export function getQuadrant(potentialScore: number, availabilityScore: number): DecisionQuadrant {
  const highPotential = potentialScore >= 60;
  const highAvailability = availabilityScore >= 60;
  
  if (highPotential && highAvailability) return 'go';
  if (highPotential && !highAvailability) return 'optimize_recovery';
  if (!highPotential && highAvailability) return 'build_engine';
  return 'caution';
}

export const QUADRANT_INFO = {
  go: {
    label: "GO / Séance clé possible",
    emoji: "🟢",
    color: 'success' as const,
    bgColor: 'bg-green-500/20',
    description: "Potentiel élevé + Disponibilité élevée. Conditions optimales."
  },
  optimize_recovery: {
    label: "Optimiser récupération",
    emoji: "🟡",
    color: 'warning' as const,
    bgColor: 'bg-yellow-500/20',
    description: "Bon potentiel mais disponibilité réduite. Priorité récupération."
  },
  build_engine: {
    label: "Construire le moteur",
    emoji: "🟠",
    color: 'info' as const,
    bgColor: 'bg-orange-500/20',
    description: "Disponibilité correcte mais moteur insuffisant. Développer le profil."
  },
  caution: {
    label: "Prudence requise",
    emoji: "🔴",
    color: 'destructive' as const,
    bgColor: 'bg-red-500/20',
    description: "Potentiel et disponibilité limités. Priorité sécurité."
  },
};

// =============================================
// ACADEMY MODULE
// =============================================

export const ACADEMY_RACE_READINESS_V2_MODULE = {
  id: 'race-readiness-v2',
  title: 'Potentiel vs Disponibilité : pourquoi TFCL sépare les deux',
  description: 'Comprendre la logique Race Readiness V2 et les 4 quadrants décisionnels.',
  icon: '🎯',
  chapters: [
    {
      id: 'separation',
      title: 'Pourquoi séparer Potentiel et Disponibilité ?',
      content: `## Deux réalités différentes

**Le Potentiel** = ce que ton moteur peut faire
- Basé sur VLamax, TTE, FTP, économie
- Évolue lentement (semaines/mois)
- Représente ta capacité maximale théorique

**La Disponibilité** = ce que tu peux exprimer aujourd'hui
- Basé sur fatigue, stress, sommeil, signaux
- Varie rapidement (heures/jours)
- Module la capacité à mobiliser le potentiel

**Un athlète très en forme peut être non prêt aujourd'hui.**
Inversement, un athlète frais peut manquer de moteur.`,
      keyPoints: [
        'Potentiel = capacité structurelle (long terme)',
        'Disponibilité = état du jour (court terme)',
        'La décision combine les deux'
      ]
    },
    {
      id: 'quadrants',
      title: 'Les 4 quadrants de décision',
      content: `## Comment lire le graphique

| Quadrant | Potentiel | Disponibilité | Action |
|----------|-----------|---------------|--------|
| 🟢 GO | Élevé | Élevée | Séance clé possible |
| 🟡 Récup | Élevé | Faible | Optimiser récupération |
| 🟠 Moteur | Faible | Élevée | Construire le profil |
| 🔴 Prudence | Faible | Faible | Priorité sécurité |

**Le quadrant ne dicte pas.** Il éclaire la décision du coach.`,
      keyPoints: [
        'GO = conditions optimales',
        'Récupération = potentiel bridé par la fatigue',
        'Moteur = disponibilité bridée par le profil',
        'Prudence = double limitation'
      ]
    },
    {
      id: 'examples',
      title: 'Exemples pratiques',
      content: `## Cas concrets

**Cas 1 : Athlète en affûtage (Ironman J-7)**
- Potentiel : 78 (profil construit)
- Disponibilité : 85 (fraîcheur optimale)
→ Quadrant GO. Confiance pour la course.

**Cas 2 : Athlète en bloc de charge**
- Potentiel : 72 (en progression)
- Disponibilité : 45 (fatigue accumulée)
→ Quadrant Récupération. Alléger avant séance clé.

**Cas 3 : Athlète débutant motivé**
- Potentiel : 48 (moteur en construction)
- Disponibilité : 82 (très frais)
→ Quadrant Moteur. Développer le profil progressivement.

**Cas 4 : Surmenage**
- Potentiel : 55 (stagnation)
- Disponibilité : 38 (épuisement)
→ Quadrant Prudence. Pause et reset.`,
      keyPoints: [
        'Le contexte guide l\'interprétation',
        'Le coach intègre des facteurs non mesurés',
        'Le graphique est un outil, pas un juge'
      ]
    },
    {
      id: 'guardrails',
      title: 'Garde-fous non négociables',
      content: `## Quand le score est pénalisé

TFCL applique des **pénalités automatiques** dans certains cas :

| Situation | Pénalité | Pourquoi |
|-----------|----------|----------|
| Alerte santé | -25 pts | Sécurité prioritaire |
| Risque blessure élevé | -20 pts | Prévention |
| Fatigue critique (>80) | -15 pts | Récupération obligatoire |
| Données incomplètes | -5 pts | Incertitude accrue |

**Ces garde-fous ne sont pas contournables.**
Un score élevé avec alerte santé reste un score pénalisé.`,
      keyPoints: [
        'La sécurité prime sur le score',
        'Les alertes sont indépendantes du calcul',
        'Les pénalités sont transparentes'
      ]
    }
  ]
};

// =============================================
// PDF EXPORT SECTION
// =============================================

export const PDF_RACE_READINESS_V2_SECTION = {
  title: 'Potentiel × Disponibilité → Décision',
  subtitle: 'Race Readiness TFCL™ V2',
  disclaimer: RACE_READINESS_V2_DISCLAIMER,
  definitions: RACE_READINESS_V2_DEFINITIONS,
  formula: RACE_READINESS_V2_FORMULA,
};
