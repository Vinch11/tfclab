/**
 * Wahoo SYSTM Suggestion Engine v2
 * Staff-grade workout suggestions based on unified effective values
 * 
 * Uses: VLamaxEffectif, TTEEffectif, RaceReadiness, CRR, Injury Risk, Fatigue
 * 
 * This engine NEVER imposes or modifies plans.
 * It provides pedagogical, optional, and justified suggestions.
 */

import { 
  WAHOO_WORKOUTS, 
  WahooWorkoutMapping, 
  WahooPhysioAxis,
  getAxisLabel as getMappingAxisLabel,
  getRiskLabel,
  getRiskColor,
  hasContraindicationsForObjective,
} from "@/data/wahooMapping";

// ============= TYPES =============

export type WahooNeed =
  | "NEED_VLAMAX_DOWN"
  | "NEED_TTE_UP"
  | "NEED_ENDURANCE_BASE"
  | "NEED_RECOVERY"
  | "NEED_VO2_UP";

export type TargetAxis = "VLAMAX" | "TTE" | "ENDURANCE" | "FRESHNESS" | "VO2";

export interface EffectiveValue {
  value: number | null;
  confidence: number;
  source?: string;
}

export interface RaceReadinessDetails {
  endurance?: number;
  tte?: number;
  vlamax?: number;
  fraicheur?: number;
  puissance?: number;
}

export interface InjuryRiskRun {
  level: "faible" | "modéré" | "élevé";
  score: number;
}

export interface SuggestionEngineContext {
  // Athlete profile
  objectif: string; // IM, 70.3, Marathon, Semi, etc.
  sportFocus: "run" | "bike" | "tri";
  
  // Core effective metrics
  vlamaxEffectif: EffectiveValue;
  tteEffectif: EffectiveValue;
  
  // Race readiness
  raceReadiness: {
    score: number | null;
    details: RaceReadinessDetails;
  };
  
  // Training load
  CRR: EffectiveValue; // Charge Récente Relative
  
  // Injury and fatigue
  injuryRiskRun?: InjuryRiskRun;
  fatigueScore?: number; // 1-10, higher = more fatigued
}

export interface WahooSuggestion {
  id: string;
  wahoo_id: string;
  wahoo_name: string;
  target_need: WahooNeed;
  targetAxis: TargetAxis;
  priority: 1 | 2 | 3;
  why: string;
  expected_effects: string[];
  cautions: string[];
  confidence: number;
  riskLevel: 0 | 1 | 2 | 3;
  staffAnnotation: string;
}

export interface NeedAnalysis {
  needs: WahooNeed[];
  rationale: string[];
  priorityOrder: WahooNeed[];
}

export interface SuggestionEngineOutput {
  suggestions: WahooSuggestion[];
  needAnalysis: NeedAnalysis;
  diagnosticSummary: string;
  primaryConcern: TargetAxis | null;
}

// ============= THRESHOLDS BY OBJECTIVE =============

const VLAMAX_THRESHOLDS: Record<string, number> = {
  IM: 0.45,
  Ironman: 0.45,
  "70.3": 0.50,
  "703": 0.50,
  Half: 0.50,
  Marathon: 0.50,
  Semi: 0.60,
  Trail: 0.55,
  TrailLong: 0.45,
  Ultra: 0.40,
  default: 0.55,
};

const TTE_TARGETS: Record<string, number> = {
  IM: 55,
  Ironman: 55,
  "70.3": 50,
  "703": 50,
  Half: 50,
  Marathon: 50,
  Semi: 45,
  Trail: 45,
  TrailLong: 55,
  Ultra: 60,
  default: 45,
};

export function getVLamaxThreshold(objectif: string): number {
  return VLAMAX_THRESHOLDS[objectif] || VLAMAX_THRESHOLDS.default;
}

export function getTTETarget(objectif: string): number {
  return TTE_TARGETS[objectif] || TTE_TARGETS.default;
}

// ============= NEED DETECTION (STAFF-GRADE) =============

export function computeWahooNeeds(context: SuggestionEngineContext): NeedAnalysis {
  const needs: WahooNeed[] = [];
  const rationale: string[] = [];
  
  const { objectif, vlamaxEffectif, tteEffectif, raceReadiness, CRR, injuryRiskRun, fatigueScore } = context;
  
  // Priority order: RECOVERY > VLAMAX_DOWN > TTE_UP > ENDURANCE_BASE > VO2_UP
  
  // === RULE D: NEED_RECOVERY (highest priority) ===
  const needsRecovery = 
    (fatigueScore !== undefined && fatigueScore >= 7) ||
    (raceReadiness.details.fraicheur !== undefined && raceReadiness.details.fraicheur < 50) ||
    (injuryRiskRun?.level === "élevé");
    
  if (needsRecovery) {
    needs.push("NEED_RECOVERY");
    if (fatigueScore !== undefined && fatigueScore >= 7) {
      rationale.push(`Fatigue élevée (${fatigueScore}/10) → priorité absorption charge.`);
    }
    if (injuryRiskRun?.level === "élevé") {
      rationale.push(`Risque blessure CAP élevé (score ${injuryRiskRun.score}) → réduire intensité.`);
    }
    if (raceReadiness.details.fraicheur !== undefined && raceReadiness.details.fraicheur < 50) {
      rationale.push(`Fraîcheur insuffisante → récupération nécessaire.`);
    }
  }
  
  // === RULE A: NEED_VLAMAX_DOWN ===
  const vlamaxThreshold = getVLamaxThreshold(objectif);
  const isLongDistance = ["IM", "Ironman", "Marathon", "703", "70.3", "Half", "TrailLong", "Ultra"].includes(objectif);
  
  if (vlamaxEffectif.value !== null && vlamaxEffectif.value > vlamaxThreshold && isLongDistance) {
    needs.push("NEED_VLAMAX_DOWN");
    rationale.push(
      `VLamax élevé pour l'objectif (${vlamaxEffectif.value.toFixed(2)} > ${vlamaxThreshold.toFixed(2)} pour ${objectif}) → dépendance glucidique + risque dérive.`
    );
  }
  
  // === RULE B: NEED_TTE_UP ===
  const tteTarget = getTTETarget(objectif);
  if (tteEffectif.value !== null && tteEffectif.value < tteTarget - 5) {
    needs.push("NEED_TTE_UP");
    rationale.push(
      `TTE insuffisant (${tteEffectif.value} min < cible ${tteTarget} min pour ${objectif}) → durabilité seuil à développer.`
    );
  }
  
  // === RULE C: NEED_ENDURANCE_BASE ===
  const hasEnduranceIssue = 
    (raceReadiness.details.endurance !== undefined && raceReadiness.details.endurance < 60) ||
    (CRR.value !== null && CRR.value < 250);
    
  if (hasEnduranceIssue && !needs.includes("NEED_RECOVERY")) {
    needs.push("NEED_ENDURANCE_BASE");
    if (raceReadiness.details.endurance !== undefined && raceReadiness.details.endurance < 60) {
      rationale.push(`Composante endurance faible (${raceReadiness.details.endurance}%) → base aérobie à consolider.`);
    }
    if (CRR.value !== null && CRR.value < 250) {
      rationale.push(`CRR faible (${CRR.value}) → volume/charge non structurée.`);
    }
  }
  
  // === RULE E: NEED_VO2_UP (lowest priority, controlled usage) ===
  const isShortObjective = ["Semi", "Trail", "Course"].includes(objectif);
  const hasLowVlamax = vlamaxEffectif.value !== null && vlamaxEffectif.value < 0.40;
  
  if (isShortObjective || (hasLowVlamax && !isLongDistance)) {
    // Only suggest VO2 if VLamax is not already elevated
    if (vlamaxEffectif.value === null || vlamaxEffectif.value <= vlamaxThreshold) {
      needs.push("NEED_VO2_UP");
      rationale.push(`Objectif court ou VLamax bas → augmenter plafond aérobie (usage contrôlé).`);
    }
  }
  
  // Limit to 2 needs max to avoid confusion
  const priorityOrder: WahooNeed[] = [
    "NEED_RECOVERY",
    "NEED_VLAMAX_DOWN", 
    "NEED_TTE_UP",
    "NEED_ENDURANCE_BASE",
    "NEED_VO2_UP"
  ];
  
  const sortedNeeds = needs.sort((a, b) => priorityOrder.indexOf(a) - priorityOrder.indexOf(b));
  const limitedNeeds = sortedNeeds.slice(0, 2);
  
  return {
    needs: limitedNeeds,
    rationale,
    priorityOrder: sortedNeeds,
  };
}

// ============= NEED TO AXIS MAPPING =============

function needToAxis(need: WahooNeed): WahooPhysioAxis[] {
  switch (need) {
    case "NEED_VLAMAX_DOWN":
      return ["VLAMAX_DOWN", "ENDURANCE_BASE"];
    case "NEED_TTE_UP":
      return ["TTE_UP"];
    case "NEED_ENDURANCE_BASE":
      return ["ENDURANCE_BASE"];
    case "NEED_RECOVERY":
      return ["RECOVERY"];
    case "NEED_VO2_UP":
      return ["VO2_UP"];
  }
}

function needToTargetAxis(need: WahooNeed): TargetAxis {
  switch (need) {
    case "NEED_VLAMAX_DOWN":
      return "VLAMAX";
    case "NEED_TTE_UP":
      return "TTE";
    case "NEED_ENDURANCE_BASE":
      return "ENDURANCE";
    case "NEED_RECOVERY":
      return "FRESHNESS";
    case "NEED_VO2_UP":
      return "VO2";
  }
}

// ============= WORKOUT SELECTION =============

function selectWorkoutsForNeed(
  need: WahooNeed,
  context: SuggestionEngineContext,
  alreadySelected: Set<string>
): WahooWorkoutMapping[] {
  const { objectif, sportFocus, vlamaxEffectif, fatigueScore, injuryRiskRun } = context;
  
  const targetAxes = needToAxis(need);
  
  // Filter workouts by:
  // 1. Primary axis matches need
  // 2. Sport matches focus (or bike for tri)
  // 3. Not already selected
  // 4. Safety filters
  
  let candidates = WAHOO_WORKOUTS.filter(w => {
    // Axis match
    if (!targetAxes.includes(w.primary_axis)) return false;
    
    // Sport match (bike default for tri, or exact match)
    if (sportFocus === "tri") {
      // Accept both bike and run for triathlon
    } else if (w.sport !== sportFocus) {
      return false;
    }
    
    // Already selected
    if (alreadySelected.has(w.wahoo_id)) return false;
    
    return true;
  });
  
  // Safety filters
  const isLongDistance = ["IM", "Ironman", "Marathon", "703", "70.3", "Half", "TrailLong", "Ultra"].includes(objectif);
  const hasHighVlamax = vlamaxEffectif.value !== null && vlamaxEffectif.value > getVLamaxThreshold(objectif);
  const hasFatigue = (fatigueScore !== undefined && fatigueScore >= 6) || injuryRiskRun?.level === "élevé";
  
  candidates = candidates.filter(w => {
    // Exclude risk_level 3 if IM/Marathon + high vlamax or fatigue
    if (w.risk_level === 3 && isLongDistance && (hasHighVlamax || hasFatigue)) {
      return false;
    }
    
    // Exclude VO2_UP if VLamax already too high AND long distance
    if (w.primary_axis === "VO2_UP" && hasHighVlamax && isLongDistance) {
      return false;
    }
    
    // Exclude HIGH_RISK or intense running if injury risk is elevated
    if (injuryRiskRun?.level === "élevé" && w.sport === "run" && w.intensity_profile === "high") {
      return false;
    }
    
    // Check contraindications
    if (hasContraindicationsForObjective(w, objectif)) {
      return false;
    }
    
    return true;
  });
  
  // Sort by risk level (prefer lower risk)
  candidates.sort((a, b) => a.risk_level - b.risk_level);
  
  return candidates.slice(0, 2);
}

// ============= SUGGESTION GENERATION =============

function generateWhyMessage(
  need: WahooNeed,
  workout: WahooWorkoutMapping,
  context: SuggestionEngineContext
): string {
  const { objectif, vlamaxEffectif, tteEffectif, fatigueScore, injuryRiskRun } = context;
  
  switch (need) {
    case "NEED_VLAMAX_DOWN":
      return `VLamax ${vlamaxEffectif.value?.toFixed(2) ?? "?"} > seuil ${getVLamaxThreshold(objectif).toFixed(2)} (${objectif}). Cette séance favorise la baisse du VLamax et l'oxydation lipidique.`;
      
    case "NEED_TTE_UP":
      return `TTE ${tteEffectif.value ?? "?"} min < cible ${getTTETarget(objectif)} min (${objectif}). Cette séance améliore la capacité à soutenir l'effort au seuil.`;
      
    case "NEED_ENDURANCE_BASE":
      return `Base aérobie insuffisante pour l'objectif ${objectif}. Cette séance construit les fondations de l'endurance.`;
      
    case "NEED_RECOVERY":
      if (injuryRiskRun?.level === "élevé") {
        return `Risque blessure CAP élevé. Priorité : absorption de charge et récupération.`;
      }
      return `Fatigue détectée (${fatigueScore ?? "élevée"}/10). Cette séance favorise la récupération active.`;
      
    case "NEED_VO2_UP":
      return `Profil avec marge de développement aérobie. Usage contrôlé pour éviter d'augmenter le VLamax.`;
  }
}

function generateCautions(
  workout: WahooWorkoutMapping,
  context: SuggestionEngineContext
): string[] {
  const cautions: string[] = [];
  const { fatigueScore, injuryRiskRun, vlamaxEffectif, objectif } = context;
  
  // From workout contraindications
  if (workout.contraindications) {
    cautions.push(...workout.contraindications);
  }
  
  // Context-based cautions
  if (fatigueScore !== undefined && fatigueScore >= 6 && workout.intensity_profile !== "low") {
    cautions.push("Fatigue élevée : réduire la durée ou intensité si nécessaire.");
  }
  
  if (injuryRiskRun?.level === "modéré" && workout.sport === "run") {
    cautions.push("Risque blessure modéré : surveiller les signaux corporels.");
  }
  
  if (workout.vlamax_effect === "up" && vlamaxEffectif.value !== null && vlamaxEffectif.value > getVLamaxThreshold(objectif)) {
    cautions.push("Cette séance peut augmenter le VLamax : usage limité recommandé.");
  }
  
  return cautions.slice(0, 3);
}

function generateExpectedEffects(workout: WahooWorkoutMapping): string[] {
  const effects: string[] = [];
  
  // VLamax effect
  if (workout.vlamax_effect === "down") {
    effects.push("VLamax ↓");
  } else if (workout.vlamax_effect === "up") {
    effects.push("VLamax ↑");
  }
  
  // TTE effect
  if (workout.tte_effect === "up") {
    effects.push("TTE ↑");
  } else if (workout.tte_effect === "down") {
    effects.push("TTE ↓");
  }
  
  // Axis-based effects
  switch (workout.primary_axis) {
    case "VLAMAX_DOWN":
      effects.push("Oxydation lipidique ↑");
      break;
    case "TTE_UP":
      effects.push("Durabilité seuil ↑");
      break;
    case "ENDURANCE_BASE":
      effects.push("Base aérobie ↑");
      break;
    case "RECOVERY":
      effects.push("Récupération ↑");
      break;
    case "VO2_UP":
      effects.push("VO₂max ↑");
      break;
  }
  
  return effects;
}

// ============= MAIN ENGINE =============

export function suggestWahooWorkouts(context: SuggestionEngineContext): SuggestionEngineOutput {
  const needAnalysis = computeWahooNeeds(context);
  const suggestions: WahooSuggestion[] = [];
  const selectedIds = new Set<string>();
  
  let diagnosticSummary = "";
  let primaryConcern: TargetAxis | null = null;
  
  // Process top 1-2 needs
  needAnalysis.needs.forEach((need, needIndex) => {
    const targetAxis = needToTargetAxis(need);
    
    if (needIndex === 0) {
      primaryConcern = targetAxis;
      diagnosticSummary = needAnalysis.rationale[0] || `Besoin principal : ${need}`;
    }
    
    const workouts = selectWorkoutsForNeed(need, context, selectedIds);
    
    workouts.forEach((workout, workoutIndex) => {
      selectedIds.add(workout.wahoo_id);
      
      const suggestion: WahooSuggestion = {
        id: `suggestion_${need}_${workoutIndex}`,
        wahoo_id: workout.wahoo_id,
        wahoo_name: workout.wahoo_name,
        target_need: need,
        targetAxis,
        priority: (needIndex + 1) as 1 | 2 | 3,
        why: generateWhyMessage(need, workout, context),
        expected_effects: generateExpectedEffects(workout),
        cautions: generateCautions(workout, context),
        confidence: Math.min(
          context.vlamaxEffectif.confidence,
          context.tteEffectif.confidence,
          context.CRR.confidence,
          0.8
        ),
        riskLevel: workout.risk_level,
        staffAnnotation: workout.staff_annotation,
      };
      
      suggestions.push(suggestion);
    });
  });
  
  // Ensure at least 1 "safe" session if risk/fatigue
  const hasSafeSession = suggestions.some(s => s.riskLevel <= 1);
  const needsSafeSession = 
    (context.fatigueScore !== undefined && context.fatigueScore >= 6) ||
    context.injuryRiskRun?.level === "élevé" ||
    context.injuryRiskRun?.level === "modéré";
    
  if (!hasSafeSession && needsSafeSession && suggestions.length < 3) {
    // Add a recovery/endurance session
    const safeWorkouts = WAHOO_WORKOUTS.filter(w => 
      w.risk_level === 0 && 
      (w.primary_axis === "RECOVERY" || w.primary_axis === "ENDURANCE_BASE") &&
      !selectedIds.has(w.wahoo_id)
    );
    
    if (safeWorkouts.length > 0) {
      const safeWorkout = safeWorkouts[0];
      suggestions.push({
        id: `suggestion_safe_0`,
        wahoo_id: safeWorkout.wahoo_id,
        wahoo_name: safeWorkout.wahoo_name,
        target_need: "NEED_RECOVERY",
        targetAxis: "FRESHNESS",
        priority: 3,
        why: "Séance sécuritaire recommandée compte tenu du niveau de fatigue ou risque.",
        expected_effects: generateExpectedEffects(safeWorkout),
        cautions: [],
        confidence: 0.8,
        riskLevel: safeWorkout.risk_level,
        staffAnnotation: safeWorkout.staff_annotation,
      });
    }
  }
  
  // Limit to 3 suggestions
  const finalSuggestions = suggestions.slice(0, 3);
  
  if (!diagnosticSummary && finalSuggestions.length === 0) {
    diagnosticSummary = "Profil équilibré. Aucune suggestion prioritaire identifiée.";
  }
  
  return {
    suggestions: finalSuggestions,
    needAnalysis,
    diagnosticSummary,
    primaryConcern,
  };
}

// ============= LEGACY COMPATIBILITY =============
// For backward compatibility with existing code

export interface SuggestionEngineInput {
  vlamaxEffectif: number | null;
  vlamaxConfidence: number;
  tteEffectif: number | null;
  tteConfidence: number;
  raceReadinessScore: number | null;
  raceReadinessFactors?: {
    endurance?: number;
    tte?: number;
    vlamax?: number;
  };
  fatigueStatus: "low" | "moderate" | "high" | "unknown";
  capInjuryRisk?: "faible" | "modéré" | "élevé";
  sport: "CAP" | "VÉLO" | "TRI" | "NATATION";
  objectif: string;
}

export function generateWahooSuggestions(input: SuggestionEngineInput): SuggestionEngineOutput {
  // Convert legacy input to new context format
  const context: SuggestionEngineContext = {
    objectif: input.objectif,
    sportFocus: input.sport === "CAP" ? "run" : input.sport === "VÉLO" ? "bike" : "tri",
    vlamaxEffectif: {
      value: input.vlamaxEffectif,
      confidence: input.vlamaxConfidence,
    },
    tteEffectif: {
      value: input.tteEffectif,
      confidence: input.tteConfidence,
    },
    raceReadiness: {
      score: input.raceReadinessScore,
      details: {
        endurance: input.raceReadinessFactors?.endurance,
        tte: input.raceReadinessFactors?.tte,
        vlamax: input.raceReadinessFactors?.vlamax,
      },
    },
    CRR: {
      value: 300, // Default value
      confidence: 0.5,
    },
    injuryRiskRun: input.capInjuryRisk ? {
      level: input.capInjuryRisk,
      score: input.capInjuryRisk === "élevé" ? 8 : input.capInjuryRisk === "modéré" ? 5 : 2,
    } : undefined,
    fatigueScore: input.fatigueStatus === "high" ? 8 : input.fatigueStatus === "moderate" ? 5 : 3,
  };
  
  return suggestWahooWorkouts(context);
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
    case "VO2":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
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
    case "VO2":
      return "VO₂max";
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
    case "VO2":
      return "🫁";
  }
}

export function getNeedLabel(need: WahooNeed): string {
  switch (need) {
    case "NEED_VLAMAX_DOWN":
      return "Baisse VLamax";
    case "NEED_TTE_UP":
      return "Durabilité TTE";
    case "NEED_ENDURANCE_BASE":
      return "Base aérobie";
    case "NEED_RECOVERY":
      return "Récupération";
    case "NEED_VO2_UP":
      return "VO₂max";
  }
}

/**
 * Format suggestions for PDF export
 */
export function formatSuggestionsForPDF(output: SuggestionEngineOutput): string {
  if (output.suggestions.length === 0) {
    return "Aucune suggestion prioritaire identifiée.";
  }

  let text = "### Suggestions Wahoo SYSTM (optionnelles)\n\n";
  
  output.suggestions.forEach((s) => {
    text += `• **${s.wahoo_name}** (Wahoo SYSTM)\n`;
    text += `  Axe ciblé : ${getAxisLabel(s.targetAxis)} ${getAxisIcon(s.targetAxis)}\n`;
    text += `  Justification : ${s.why}\n`;
    text += `  Effets attendus : ${s.expected_effects.join(", ")}\n`;
    if (s.cautions.length > 0) {
      text += `  ⚠️ Précautions : ${s.cautions.join("; ")}\n`;
    }
    text += `  _${s.staffAnnotation}_\n`;
    text += "\n";
  });

  text += "_Ces suggestions ne remplacent pas la planification du coach. Elles éclairent un besoin physiologique identifié._";
  
  return text;
}

/**
 * Copy-friendly text for coach export
 */
export function formatSuggestionsForCopy(output: SuggestionEngineOutput): string {
  if (output.suggestions.length === 0) {
    return "Aucune suggestion Wahoo prioritaire.";
  }

  let text = "🎯 SUGGESTIONS WAHOO SYSTM\n\n";
  text += `Diagnostic : ${output.diagnosticSummary}\n\n`;
  
  output.suggestions.forEach((s, idx) => {
    text += `${idx + 1}. ${s.wahoo_name}\n`;
    text += `   → ${getAxisLabel(s.targetAxis)}\n`;
    text += `   Pourquoi : ${s.why}\n`;
    text += `   Effets : ${s.expected_effects.join(", ")}\n`;
    if (s.cautions.length > 0) {
      text += `   ⚠️ ${s.cautions.join("; ")}\n`;
    }
    text += "\n";
  });

  text += "Ces suggestions sont optionnelles et ne remplacent pas la planification.";
  
  return text;
}
