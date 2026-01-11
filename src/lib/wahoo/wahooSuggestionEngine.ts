/**
 * Wahoo SYSTM Suggestion Engine
 * Generates staff-grade workout suggestions based on athlete physiological profile
 * 
 * This engine NEVER imposes or modifies plans.
 * It provides pedagogical, optional, and justified suggestions.
 */

import { getVLamaxThreshold, getTTETarget } from "./wahooWorkoutInterpreter";

// ============= TYPES =============

export type TargetAxis = "VLAMAX" | "TTE" | "ENDURANCE" | "FRESHNESS";

export type WahooCategory = 
  | "Endurance" 
  | "Tempo" 
  | "Threshold" 
  | "VO2max" 
  | "Recovery" 
  | "Strength" 
  | "Mixed";

export interface WahooSuggestion {
  id: string;
  workoutName: string;
  wahooCategory: WahooCategory;
  targetAxis: TargetAxis;
  expectedEffects: string[];
  why: string;
  caution?: string;
  priority: number; // 1 = highest priority
}

export interface SuggestionEngineInput {
  // Core metrics
  vlamaxEffectif: number | null;
  vlamaxConfidence: number;
  tteEffectif: number | null;
  tteConfidence: number;
  
  // Race readiness
  raceReadinessScore: number | null;
  raceReadinessFactors?: {
    endurance?: number;
    tte?: number;
    vlamax?: number;
  };
  
  // Context
  fatigueStatus: "low" | "moderate" | "high" | "unknown";
  capInjuryRisk?: "faible" | "modéré" | "élevé";
  
  // Athlete profile
  sport: "CAP" | "VÉLO" | "TRI" | "NATATION";
  objectif: string; // IM, 70.3, Marathon, Semi, etc.
}

export interface SuggestionEngineOutput {
  suggestions: WahooSuggestion[];
  diagnosticSummary: string;
  primaryConcern: TargetAxis | null;
}

// ============= WORKOUT DATABASE =============

interface WahooWorkoutTemplate {
  id: string;
  name: string;
  category: WahooCategory;
  targetAxis: TargetAxis;
  effects: string[];
  suitableForFatigue: boolean;
  suitableForHighVlamax: boolean;
  suitableForLowTTE: boolean;
  description: string;
}

const WAHOO_WORKOUTS: WahooWorkoutTemplate[] = [
  // ===== ENDURANCE / VLAMAX DOWN =====
  {
    id: "endurance_1_5",
    name: "Endurance 1.5",
    category: "Endurance",
    targetAxis: "VLAMAX",
    effects: ["VLamax ↓", "Oxydation lipidique ↑", "Base aérobie ↑"],
    suitableForFatigue: false,
    suitableForHighVlamax: true,
    suitableForLowTTE: false,
    description: "Séance d'endurance fondamentale de 1h30. Développe l'efficacité métabolique et favorise la baisse du VLamax.",
  },
  {
    id: "endurance_2_0",
    name: "Endurance 2.0",
    category: "Endurance",
    targetAxis: "ENDURANCE",
    effects: ["Base aérobie ↑↑", "VLamax ↓", "Économie énergétique ↑"],
    suitableForFatigue: false,
    suitableForHighVlamax: true,
    suitableForLowTTE: false,
    description: "Sortie longue de 2h en Z2. Construit une base solide pour les efforts d'endurance.",
  },
  {
    id: "long_endurance_ride",
    name: "Long Endurance Ride",
    category: "Endurance",
    targetAxis: "VLAMAX",
    effects: ["VLamax ↓↓", "Durabilité ↑", "Adaptations périphériques ↑"],
    suitableForFatigue: false,
    suitableForHighVlamax: true,
    suitableForLowTTE: false,
    description: "Sortie longue Z2 pure. Idéale pour la réduction du VLamax et le développement de la durabilité.",
  },
  {
    id: "tempo_low_cadence",
    name: "Tempo Low Cadence",
    category: "Tempo",
    targetAxis: "VLAMAX",
    effects: ["VLamax ↓", "Force musculaire ↑", "Recrutement fibres lentes ↑"],
    suitableForFatigue: false,
    suitableForHighVlamax: true,
    suitableForLowTTE: true,
    description: "Tempo à basse cadence (60-70 rpm). Combine travail de force et réduction du VLamax.",
  },

  // ===== TTE DEVELOPMENT =====
  {
    id: "tempo_varying_cadence",
    name: "Tempo With Varying Cadence",
    category: "Tempo",
    targetAxis: "TTE",
    effects: ["TTE ↑", "Tolérance seuil ↑", "Économie de pédalage ↑"],
    suitableForFatigue: false,
    suitableForHighVlamax: false,
    suitableForLowTTE: true,
    description: "Tempo avec variations de cadence. Développe la durabilité au seuil tout en améliorant la technique.",
  },
  {
    id: "sustained_tempo",
    name: "Sustained Tempo",
    category: "Tempo",
    targetAxis: "TTE",
    effects: ["TTE ↑↑", "Puissance durable ↑", "Confiance mentale ↑"],
    suitableForFatigue: false,
    suitableForHighVlamax: false,
    suitableForLowTTE: true,
    description: "Blocs tempo soutenus (30-40 min). Améliore directement la capacité à tenir l'allure cible.",
  },
  {
    id: "sweetspot_progressive",
    name: "Sweet Spot Progressif",
    category: "Threshold",
    targetAxis: "TTE",
    effects: ["TTE ↑", "FTP consolidation ↑", "Gestion effort ↑"],
    suitableForFatigue: false,
    suitableForHighVlamax: false,
    suitableForLowTTE: true,
    description: "Sweet spot avec montée progressive. Développe la durabilité sans stress excessif.",
  },
  {
    id: "over_under_intervals",
    name: "Over-Under Intervals",
    category: "Threshold",
    targetAxis: "TTE",
    effects: ["TTE ↑", "Tolérance lactate ↑", "Recyclage lactate ↑"],
    suitableForFatigue: false,
    suitableForHighVlamax: false,
    suitableForLowTTE: true,
    description: "Alternance seuil/sur-seuil. Améliore la capacité à gérer les variations autour du seuil.",
  },

  // ===== RECOVERY / FRESHNESS =====
  {
    id: "serbia_upside_down",
    name: "Serbia Upside Down",
    category: "Recovery",
    targetAxis: "FRESHNESS",
    effects: ["Récupération ↑", "Retour parasympathique ↑", "Stress ↓"],
    suitableForFatigue: true,
    suitableForHighVlamax: false,
    suitableForLowTTE: false,
    description: "Séance de récupération active douce. Favorise l'absorption de la charge.",
  },
  {
    id: "easy_spin",
    name: "Easy Spin / Recovery",
    category: "Recovery",
    targetAxis: "FRESHNESS",
    effects: ["Récupération ↑↑", "Circulation ↑", "Fatigue ↓"],
    suitableForFatigue: true,
    suitableForHighVlamax: false,
    suitableForLowTTE: false,
    description: "Spin facile sans intensité. Objectif unique : récupérer.",
  },
  {
    id: "novid_endurance",
    name: "NoVid Endurance",
    category: "Recovery",
    targetAxis: "FRESHNESS",
    effects: ["Récupération active", "Maintien aérobie", "Détente mentale"],
    suitableForFatigue: true,
    suitableForHighVlamax: false,
    suitableForLowTTE: false,
    description: "Endurance très douce sans vidéo. Récupération avec signal aérobie minimal.",
  },
  {
    id: "recovery_endurance_ride",
    name: "Recovery Endurance Ride",
    category: "Recovery",
    targetAxis: "ENDURANCE",
    effects: ["Base aérobie ↑", "Récupération active", "VLamax légère ↓"],
    suitableForFatigue: true,
    suitableForHighVlamax: true,
    suitableForLowTTE: false,
    description: "Endurance de récupération. Combine absorption de charge et maintien aérobie.",
  },

  // ===== ENDURANCE BASE =====
  {
    id: "foundation_ride",
    name: "Foundation Ride",
    category: "Endurance",
    targetAxis: "ENDURANCE",
    effects: ["Base aérobie ↑", "Économie ↑", "Préparation intensité ↑"],
    suitableForFatigue: false,
    suitableForHighVlamax: true,
    suitableForLowTTE: false,
    description: "Séance fondatrice Z2. Prépare le terrain pour les intensités spécifiques.",
  },
  {
    id: "aerobic_base_builder",
    name: "Aerobic Base Builder",
    category: "Endurance",
    targetAxis: "ENDURANCE",
    effects: ["Base aérobie ↑↑", "Mitochondries ↑", "Capillarisation ↑"],
    suitableForFatigue: false,
    suitableForHighVlamax: true,
    suitableForLowTTE: false,
    description: "Construction de base aérobie. Stimule les adaptations cellulaires fondamentales.",
  },
];

// ============= SUGGESTION RULES =============

function getVLamaxSuggestions(input: SuggestionEngineInput): WahooSuggestion[] {
  const threshold = getVLamaxThreshold(input.objectif);
  
  if (input.vlamaxEffectif === null || input.vlamaxEffectif <= threshold) {
    return [];
  }

  const excess = input.vlamaxEffectif - threshold;
  const isSignificant = excess > 0.05;
  
  const suitable = WAHOO_WORKOUTS.filter(w => w.suitableForHighVlamax && w.targetAxis === "VLAMAX");
  
  return suitable.slice(0, 2).map((workout, idx) => ({
    id: `vlamax_suggestion_${idx}`,
    workoutName: workout.name,
    wahooCategory: workout.category,
    targetAxis: "VLAMAX" as TargetAxis,
    expectedEffects: workout.effects,
    why: isSignificant 
      ? `Profil glycolytique dominant (VLamax ${input.vlamaxEffectif.toFixed(2)} > seuil ${threshold.toFixed(2)}). Priorité à la baisse du VLamax via Z2 prolongée et contrainte mécanique contrôlée.`
      : `VLamax légèrement au-dessus de la cible. Ces séances favorisent progressivement l'oxydation lipidique.`,
    caution: input.fatigueStatus === "high" ? "Attention : fatigue élevée. Réduire la durée si nécessaire." : undefined,
    priority: idx + 1,
  }));
}

function getTTESuggestions(input: SuggestionEngineInput): WahooSuggestion[] {
  const target = getTTETarget(input.objectif);
  
  if (input.tteEffectif === null || input.tteEffectif >= target - 5) {
    return [];
  }

  const deficit = target - input.tteEffectif;
  const isSignificant = deficit > 10;
  
  const suitable = WAHOO_WORKOUTS.filter(w => w.suitableForLowTTE && w.targetAxis === "TTE");
  
  return suitable.slice(0, 2).map((workout, idx) => ({
    id: `tte_suggestion_${idx}`,
    workoutName: workout.name,
    wahooCategory: workout.category,
    targetAxis: "TTE" as TargetAxis,
    expectedEffects: workout.effects,
    why: isSignificant
      ? `Durabilité au seuil insuffisante (TTE ${input.tteEffectif} min < cible ${target} min). Ces séances améliorent la capacité à soutenir un effort proche de l'allure cible.`
      : `TTE légèrement sous l'objectif. Un travail ciblé sur la durabilité reste pertinent.`,
    caution: input.fatigueStatus === "high" ? "Reporter si fatigue accumulée. Privilégier la récupération." : undefined,
    priority: idx + 2,
  }));
}

function getEnduranceSuggestions(input: SuggestionEngineInput): WahooSuggestion[] {
  // Check if endurance is the weak link
  const hasEnduranceIssue = 
    (input.raceReadinessFactors?.endurance !== undefined && input.raceReadinessFactors.endurance < 70) ||
    (input.raceReadinessScore !== null && input.raceReadinessScore < 60);
  
  if (!hasEnduranceIssue) {
    return [];
  }

  const suitable = WAHOO_WORKOUTS.filter(w => w.targetAxis === "ENDURANCE" && !w.suitableForFatigue);
  
  return suitable.slice(0, 2).map((workout, idx) => ({
    id: `endurance_suggestion_${idx}`,
    workoutName: workout.name,
    wahooCategory: workout.category,
    targetAxis: "ENDURANCE" as TargetAxis,
    expectedEffects: workout.effects,
    why: `Base aérobie à consolider avant toute intensité spécifique. Le Race Readiness indique un manque de volume fondamental.`,
    caution: undefined,
    priority: idx + 3,
  }));
}

function getFreshnessSuggestions(input: SuggestionEngineInput): WahooSuggestion[] {
  const needsRecovery = 
    input.fatigueStatus === "high" || 
    input.capInjuryRisk === "élevé" ||
    input.capInjuryRisk === "modéré";
  
  if (!needsRecovery) {
    return [];
  }

  const suitable = WAHOO_WORKOUTS.filter(w => w.suitableForFatigue);
  
  const why = input.capInjuryRisk === "élevé"
    ? "Risque blessure CAP élevé détecté. Objectif prioritaire : récupération et absorption de la charge."
    : input.fatigueStatus === "high"
    ? "Fatigue élevée détectée. Ces séances favorisent le retour parasympathique et l'absorption de la charge."
    : "Fatigue ou risque blessure modéré. Privilégier des séances douces cette semaine.";
  
  return suitable.slice(0, 2).map((workout, idx) => ({
    id: `freshness_suggestion_${idx}`,
    workoutName: workout.name,
    wahooCategory: workout.category,
    targetAxis: "FRESHNESS" as TargetAxis,
    expectedEffects: workout.effects,
    why,
    caution: undefined,
    priority: 0, // Highest priority for recovery
  }));
}

// ============= MAIN ENGINE =============

/**
 * Generate workout suggestions based on athlete physiological profile
 * Returns max 3 suggestions, prioritized by need
 */
export function generateWahooSuggestions(input: SuggestionEngineInput): SuggestionEngineOutput {
  const allSuggestions: WahooSuggestion[] = [];
  let primaryConcern: TargetAxis | null = null;
  let diagnosticSummary = "";

  // Rule D - Fatigue/Injury FIRST (highest priority)
  if (input.fatigueStatus === "high" || input.capInjuryRisk === "élevé") {
    const freshness = getFreshnessSuggestions(input);
    if (freshness.length > 0) {
      allSuggestions.push(...freshness);
      primaryConcern = "FRESHNESS";
      diagnosticSummary = "État de fatigue ou risque blessure élevé. Priorité à la récupération.";
    }
  }

  // Rule A - VLamax too high
  if (!primaryConcern || primaryConcern !== "FRESHNESS") {
    const vlamax = getVLamaxSuggestions(input);
    if (vlamax.length > 0 && !primaryConcern) {
      primaryConcern = "VLAMAX";
      diagnosticSummary = "Profil glycolytique dominant. Focus sur la réduction du VLamax.";
    }
    allSuggestions.push(...vlamax);
  }

  // Rule B - TTE insufficient
  const tte = getTTESuggestions(input);
  if (tte.length > 0 && !primaryConcern) {
    primaryConcern = "TTE";
    diagnosticSummary = "Durabilité au seuil à développer.";
  }
  allSuggestions.push(...tte);

  // Rule C - Endurance base lacking
  const endurance = getEnduranceSuggestions(input);
  if (endurance.length > 0 && !primaryConcern) {
    primaryConcern = "ENDURANCE";
    diagnosticSummary = "Base aérobie à consolider.";
  }
  allSuggestions.push(...endurance);

  // If recovery needed but not critical
  if (input.fatigueStatus === "moderate" || input.capInjuryRisk === "modéré") {
    const freshness = getFreshnessSuggestions(input);
    allSuggestions.push(...freshness);
  }

  // Sort by priority and deduplicate
  const seen = new Set<string>();
  const uniqueSuggestions = allSuggestions
    .filter(s => {
      if (seen.has(s.workoutName)) return false;
      seen.add(s.workoutName);
      return true;
    })
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);

  if (!diagnosticSummary && uniqueSuggestions.length === 0) {
    diagnosticSummary = "Profil équilibré. Aucune suggestion prioritaire.";
  }

  return {
    suggestions: uniqueSuggestions,
    diagnosticSummary,
    primaryConcern,
  };
}

// ============= DISPLAY HELPERS =============

export function getAxisColor(axis: TargetAxis): string {
  switch (axis) {
    case "VLAMAX":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "TTE":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "ENDURANCE":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "FRESHNESS":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  }
}

export function getAxisLabel(axis: TargetAxis): string {
  switch (axis) {
    case "VLAMAX":
      return "Baisse VLamax";
    case "TTE":
      return "Durabilité TTE";
    case "ENDURANCE":
      return "Base Aérobie";
    case "FRESHNESS":
      return "Récupération";
  }
}

export function getAxisIcon(axis: TargetAxis): string {
  switch (axis) {
    case "VLAMAX":
      return "⬇️";
    case "TTE":
      return "⏱️";
    case "ENDURANCE":
      return "🔋";
    case "FRESHNESS":
      return "🌿";
  }
}

/**
 * Format suggestions for PDF export
 */
export function formatSuggestionsForPDF(output: SuggestionEngineOutput): string {
  if (output.suggestions.length === 0) {
    return "Aucune suggestion prioritaire identifiée.";
  }

  let text = "### Suggestions de séances (sources externes)\n\n";
  
  output.suggestions.forEach((s, idx) => {
    text += `• **${s.workoutName}** (Wahoo SYSTM)\n`;
    text += `  Axe ciblé : ${getAxisLabel(s.targetAxis)}\n`;
    text += `  Justification : ${s.why}\n`;
    if (s.caution) {
      text += `  ⚠️ ${s.caution}\n`;
    }
    text += "\n";
  });

  text += "_Ces suggestions ne remplacent pas la planification du coach._";
  
  return text;
}
