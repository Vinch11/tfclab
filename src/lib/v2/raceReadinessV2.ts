/**
 * TWO FOR COACHING LAB METHOD™ — Race Readiness V2 Décisionnel
 * 
 * DOUBLE BOUCLE DÉCISIONNELLE :
 * 1) POTENTIEL physiologique (stable, évolue lentement ≥ 4 semaines)
 * 2) DISPONIBILITÉ actuelle (dynamique, court terme)
 * 
 * RÈGLE ABSOLUE :
 * Race Readiness = MIN(Potentiel, Disponibilité)
 * Aucune recommandation ne peut dépasser la disponibilité,
 * même si le potentiel est élevé.
 * 
 * POSITIONNEMENT OFFICIEL TFCL :
 * "Race Readiness TFCL n'indique pas si l'athlète est en forme.
 *  Il indique si la performance est autorisée aujourd'hui,
 *  au regard de son potentiel réel et de sa disponibilité physiologique."
 */

import type { CompassScores } from "@/lib/compassScoring";
import type { DisponibiliteTFCL, TFCLReadinessInput } from "./disponibiliteTFCL";
import { computeDisponibiliteTFCL } from "./disponibiliteTFCL";

// =============================================
// TYPES — NIVEAUX DÉCISIONNELS
// =============================================

/** Potentiel physiologique : 5 niveaux stables */
export type PotentialLevel = 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';

/** Disponibilité : 3 niveaux opérationnels */
export type DisponibiliteDecisionLevel = 'available' | 'available_caution' | 'not_available';

/** Catégorie décisionnelle finale (plus de score abstrait) */
export type RaceReadinessV2Category = 
  | 'preparation_required'  // Préparation requise
  | 'in_progress'           // En progression
  | 'solid'                 // Solide
  | 'ready'                 // Prêt (sous conditions)
;

export type DataSourceType = 'measured' | 'estimated' | 'modeled';

export interface PotentialScore {
  score: number;                   // 0-100 (interne, pour positionnement graphique)
  level: PotentialLevel;           // Niveau affiché (jamais le score brut)
  levelLabel: string;
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
  dominantLevers: string[];        // Leviers dominants
  explanation: string;
}

export interface AvailabilityScore {
  score: number;                   // 0-100 (interne)
  level: DisponibiliteDecisionLevel;
  levelLabel: string;
  confidence: number;              // 0-1
  factors: string[];               // Raisons explicites
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
  // Les 2 boucles
  potential: PotentialScore;
  availability: AvailabilityScore;
  
  // Décision finale (MIN rule)
  readiness: {
    score: number;                 // 0-100 (= MIN(P, D) - penalties)
    rawScore: number;              // MIN(P, D) avant pénalités
    category: RaceReadinessV2Category;
    categoryLabel: string;
    categoryEmoji: string;
    confidenceGlobal: number;
    confidenceLabel: string;
    // Justification lisible
    justification: string;
    coachMessage: string;          // "Ce que tu peux décider aujourd'hui"
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
  
  // Pondérations (historique, mais MIN rule appliquée)
  weights: {
    potential: number;
    availability: number;
  };
  
  // Métadonnées
  timestamp: string;
  version: string;
  disclaimer: string;
}

// =============================================
// CONSTANTES OFFICIELLES V2 DÉCISIONNEL
// =============================================

export const RACE_READINESS_V2_WEIGHTS = {
  potential: 0.65,
  availability: 0.35,
};

export const POTENTIAL_LEVELS = {
  very_low: { min: 0, max: 30, label: "Très bas", emoji: "🔴" },
  low: { min: 30, max: 45, label: "Bas", emoji: "🟠" },
  moderate: { min: 45, max: 60, label: "Modéré", emoji: "🟡" },
  high: { min: 60, max: 80, label: "Élevé", emoji: "🟢" },
  very_high: { min: 80, max: 100, label: "Très élevé", emoji: "🔵" },
};

export const DISPONIBILITE_DECISION_LEVELS = {
  available: { 
    min: 60, max: 100, 
    label: "Disponible", 
    emoji: "🟢",
    description: "Toutes les séances sont envisageables."
  },
  available_caution: { 
    min: 35, max: 60, 
    label: "Disponible avec prudence", 
    emoji: "🟡",
    description: "Adapter l'intensité. Écouter les signaux."
  },
  not_available: { 
    min: 0, max: 35, 
    label: "Non disponible", 
    emoji: "🔴",
    description: "Reporter les séances exigeantes. Priorité récupération."
  },
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
    title: "Boucle 1 — Potentiel Physiologique",
    definition: `Le potentiel représente ce que l'athlète peut faire en théorie.
Basé sur VO2max, VLamax V2, TTE, économie, FatMax et leur confiance.
Il est exprimé en NIVEAU (pas en score), avec une plage réaliste.
Le potentiel n'est recalculé que sur des fenêtres ≥ 4 semaines.`,
  },
  availability: {
    title: "Boucle 2 — Disponibilité Actuelle",
    definition: `La disponibilité mesure la capacité réelle à exploiter le potentiel aujourd'hui.
Sources : charge récente, HRV, sommeil, fatigue, douleurs, motivation.
Une alerte majeure suffit à plafonner la disponibilité.
Trois niveaux : Disponible / Disponible avec prudence / Non disponible.`,
  },
  decision: {
    title: "Décision — Race Readiness TFCL™",
    definition: `Race Readiness = MIN(Potentiel, Disponibilité).
Aucune recommandation ne peut dépasser la disponibilité.
Ce score ne prédit pas un résultat. Il indique si la performance
est autorisée aujourd'hui, au regard du potentiel réel et de
la disponibilité physiologique.`,
  },
};

export const RACE_READINESS_V2_DISCLAIMER = 
  "Race Readiness TFCL n'indique pas si l'athlète est en forme. Il indique si la performance est autorisée aujourd'hui.";

export const RACE_READINESS_V2_POSITIONING = 
  `Race Readiness TFCL n'indique pas si l'athlète est en forme.
Il indique si la performance est autorisée aujourd'hui,
au regard de son potentiel réel et de sa disponibilité physiologique.`;

export const RACE_READINESS_V2_FORMULA = `
Race Readiness = MIN(Potentiel, Disponibilité) - Pénalités

Règle absolue :
- La disponibilité BORNE la décision
- Un potentiel élevé ne compense JAMAIS une indisponibilité
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

function getPotentialLevel(score: number): PotentialLevel {
  if (score >= 80) return 'very_high';
  if (score >= 60) return 'high';
  if (score >= 45) return 'moderate';
  if (score >= 30) return 'low';
  return 'very_low';
}

function getPotentialLevelLabel(level: PotentialLevel): string {
  return POTENTIAL_LEVELS[level].label;
}

function getDisponibiliteDecisionLevel(score: number): DisponibiliteDecisionLevel {
  if (score >= 60) return 'available';
  if (score >= 35) return 'available_caution';
  return 'not_available';
}

function getDisponibiliteDecisionLabel(level: DisponibiliteDecisionLevel): string {
  return DISPONIBILITE_DECISION_LEVELS[level].label;
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
  
  const level = getPotentialLevel(globalScore);
  
  // Leviers dominants
  const dominantLevers: string[] = [];
  if (capaciteAerobie.score >= 70) dominantLevers.push("VO2max favorable");
  if (profilMetabolique.score >= 70) dominantLevers.push("VLamax favorable");
  if (toleranceEffort.score >= 70) dominantLevers.push("TTE favorable");
  if (robustesse.score >= 70) dominantLevers.push("Robustesse favorable");
  if (capaciteAerobie.score < 50) dominantLevers.push("VO2max limitante");
  if (profilMetabolique.score < 50) dominantLevers.push("VLamax limitante");
  if (toleranceEffort.score < 50) dominantLevers.push("TTE limitante");
  
  return {
    score: globalScore,
    level,
    levelLabel: getPotentialLevelLabel(level),
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
    dominantLevers,
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
  const score = disponibilite.score;
  const level = getDisponibiliteDecisionLevel(score);
  
  return {
    score,
    level,
    levelLabel: getDisponibiliteDecisionLabel(level),
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
  
  // 4. Calcul du score Race Readiness V2 — RÈGLE MIN
  const rawScore = Math.min(potential.score, availability.score);
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
  
  // 8. Justification lisible
  const justification = generateJustification(potential, availability, penalties);
  const coachMessage = generateCoachMessage(potential, availability, category);
  
  // 9. Génération de l'explication
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
      justification,
      coachMessage,
    },
    flags,
    penalties,
    explanation,
    weights: RACE_READINESS_V2_WEIGHTS,
    timestamp: new Date().toISOString(),
    version: 'v2.1-min-rule',
    disclaimer: RACE_READINESS_V2_DISCLAIMER,
  };
}

// =============================================
// GÉNÉRATION D'EXPLICATION
// =============================================

// Justification lisible pour la décision
function generateJustification(
  potential: PotentialScore,
  availability: AvailabilityScore,
  penalties: { total: number; reasons: string[] }
): string {
  const limiting = potential.score <= availability.score ? 'potentiel' : 'disponibilité';
  let text = `Décision bornée par la ${limiting} (${limiting === 'potentiel' ? potential.levelLabel : availability.levelLabel}).`;
  
  if (penalties.total > 0) {
    text += ` Pénalités : ${penalties.reasons.join(', ')}.`;
  }
  
  if (potential.dominantLevers.length > 0) {
    text += ` Leviers : ${potential.dominantLevers.join(', ')}.`;
  }
  
  return text;
}

// Message coach-centric "Ce que tu peux décider aujourd'hui"
function generateCoachMessage(
  potential: PotentialScore,
  availability: AvailabilityScore,
  category: RaceReadinessV2Category
): string {
  if (availability.level === 'not_available') {
    return "Aucune séance intense autorisée. Priorité récupération. Le potentiel est là, mais la disponibilité ne permet pas de l'exploiter.";
  }
  if (availability.level === 'available_caution') {
    if (potential.level === 'high' || potential.level === 'very_high') {
      return "Séance adaptée possible. Réduire l'intensité et surveiller les signaux. Le moteur est prêt mais la fraîcheur impose la prudence.";
    }
    return "Séance légère uniquement. Double limitation : moteur en construction ET disponibilité réduite.";
  }
  if (potential.level === 'very_high') {
    return "Toutes les séances sont autorisées. Conditions optimales pour viser haut.";
  }
  if (potential.level === 'high') {
    return "Séances clés possibles. Profil solide et disponibilité favorable.";
  }
  if (potential.level === 'moderate') {
    return "Séances de développement recommandées. Construire le moteur progressivement.";
  }
  return "Focus fondamentaux. Le moteur doit se développer avant d'exiger de la performance.";
}

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
