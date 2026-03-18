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
import { 
  getFtpKgTargetByAmbition, 
  getVLamaxRange, 
  getTTETargetByAmbition 
} from "@/lib/physiologicalTargets";
import { AmbitionLevel, DEFAULT_AMBITION } from "@/types/ambitionLevel";

// ============= TYPES =============

export type WahooNeed =
  | "NEED_VLAMAX_DOWN"
  | "NEED_TTE_UP"
  | "NEED_FTP_UP"        // Vélo/Triathlon uniquement
  | "NEED_VMA_UP"        // ✅ Running uniquement - équivalent VMA/allure seuil
  | "NEED_ECONOMY_UP"    // ✅ Running uniquement - économie de course
  | "NEED_ENDURANCE_BASE"
  | "NEED_RECOVERY"
  | "NEED_VO2_UP";

/**
 * Justification for low TSS7j (CRR)
 * - "decharge": Planned deload week → TSS considered, recovery suggestions
 * - "recuperation": Recovery needed → TSS considered, reinforced recovery suggestions  
 * - "faible_adherence": Low adherence to training → Ignore TSS, prioritize development needs
 * - undefined: No justification provided → Use default logic
 */
export type LowCRRJustification = "decharge" | "recuperation" | "faible_adherence";

export const LOW_CRR_JUSTIFICATION_LABELS: Record<LowCRRJustification, string> = {
  decharge: "Semaine de décharge",
  recuperation: "Récupération nécessaire",
  faible_adherence: "Faible adhérence aux séances",
};

export const LOW_CRR_JUSTIFICATION_EFFECTS: Record<LowCRRJustification, string> = {
  decharge: "TSS pris en compte → suggestions récupération légère",
  recuperation: "TSS pris en compte → récupération renforcée prioritaire",
  faible_adherence: "TSS ignoré → séances basées sur priorités physiologiques",
};

export type TargetAxis = "VLAMAX" | "TTE" | "FTP" | "VMA" | "ECONOMY" | "ENDURANCE" | "FRESHNESS" | "VO2";

/**
 * Temporal phases for workout suggestions
 * Phase 1: Immediate priorities (current week)
 * Phase 2: Short-term development (next 2-4 weeks)
 * Phase 3: Medium-term consolidation (4-8 weeks)
 */
export type TemporalPhase = 1 | 2 | 3;

export const PHASE_LABELS: Record<TemporalPhase, string> = {
  1: "Dans un premier temps",
  2: "Dans un deuxième temps",
  3: "Dans un troisième temps",
};

export const PHASE_DESCRIPTIONS: Record<TemporalPhase, string> = {
  1: "Priorités immédiates (cette semaine)",
  2: "Développement court terme (2-4 semaines)",
  3: "Consolidation moyen terme (4-8 semaines)",
};

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
  
  // Ambition level for adaptive thresholds
  ambition?: "finisher" | "age_group" | "competitor" | "elite";
  
  // Core effective metrics
  vlamaxEffectif: EffectiveValue;
  tteEffectif: EffectiveValue;
  
  // FTP metrics (for bike/tri objectives)
  ftpKg?: number | null; // FTP in W/kg
  
  // Race readiness
  potentielPhysiologique: {
    score: number | null;
    details: RaceReadinessDetails;
  };
  
  // Training load
  CRR: EffectiveValue; // Charge Récente Relative
  
  // Justification for low CRR (TSS7j)
  // Controls how low TSS affects suggestions
  lowCRRJustification?: LowCRRJustification;
  
  // Injury and fatigue
  injuryRiskRun?: InjuryRiskRun;
  fatigueScore?: number; // 1-10 perceived form (1=Nul, 10=Top)
  
  // Options
  /** Force development workouts even with moderate fatigue (ignores fatigue <8) */
  forceDevelopmentMode?: boolean;
}

export interface WahooSuggestion {
  id: string;
  wahoo_id: string;
  wahoo_name: string;
  target_need: WahooNeed;
  targetAxis: TargetAxis;
  priority: 1 | 2 | 3;
  /** Temporal phase: when to use this workout in the training progression */
  temporalPhase: TemporalPhase;
  /** Suggested frequency per week for this workout type */
  frequencyPerWeek?: string;
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
  rationaleByNeed: Record<WahooNeed, string[]>;
  priorityOrder: WahooNeed[];
}

export interface PhasedSuggestions {
  phase1: WahooSuggestion[];
  phase2: WahooSuggestion[];
  phase3: WahooSuggestion[];
}

export interface SuggestionEngineOutput {
  suggestions: WahooSuggestion[];
  phasedSuggestions: PhasedSuggestions;
  needAnalysis: NeedAnalysis;
  diagnosticSummary: string;
  primaryConcern: TargetAxis | null;
}

// ============= THRESHOLDS BY OBJECTIVE =============

import { 
  getVLamaxThreshold as getCentralVLamaxThreshold,
  getTTETarget as getCentralTTETarget,
  getFtpKgTarget as getCentralFtpKgTarget 
} from "@/lib/physiologicalTargets";

/**
 * Get VLamax threshold from centralized source
 */
export function getVLamaxThreshold(objectif: string): number {
  return getCentralVLamaxThreshold(objectif);
}

export function getTTETarget(objectif: string): number {
  return getCentralTTETarget(objectif);
}

export function getFtpKgTarget(objectif: string): number {
  return getCentralFtpKgTarget(objectif);
}

// ============= NEED DETECTION (STAFF-GRADE) =============

export function computeWahooNeeds(context: SuggestionEngineContext): NeedAnalysis {
  const needs: WahooNeed[] = [];
  const rationale: string[] = [];
  const rationaleByNeed: Record<WahooNeed, string[]> = {
    NEED_RECOVERY: [],
    NEED_FTP_UP: [],
    NEED_VMA_UP: [],       // ✅ Running only
    NEED_ECONOMY_UP: [],   // ✅ Running only
    NEED_VLAMAX_DOWN: [],
    NEED_TTE_UP: [],
    NEED_ENDURANCE_BASE: [],
    NEED_VO2_UP: [],
  };
  
  const { objectif, sportFocus, vlamaxEffectif, tteEffectif, potentielPhysiologique, CRR, injuryRiskRun, fatigueScore, ftpKg, forceDevelopmentMode, ambition } = context;
  
  // ✅ RUNNING FOCUS MODE CHECK
  const isRunningFocus = sportFocus === "run";
  
  // Priority order: RECOVERY > FTP_UP/VMA_UP > VLAMAX_DOWN > TTE_UP > ENDURANCE_BASE > VO2_UP
  
  // === RULE D: NEED_RECOVERY (highest priority ONLY for severe cases) ===
  // fatigueScore here is "perceived form" from checkins: 1=Nul, 10=Top
  // So LOW values (<=3) mean the athlete is fatigued and needs recovery
  // If forceDevelopmentMode is ON, only trigger recovery for extreme fatigue (<=2) or high injury risk
  const perceivedFormThreshold = forceDevelopmentMode ? 2 : 3;
  const freshnessThreshold = forceDevelopmentMode ? 20 : 30;
  
  // fatigueScore <= threshold means low perceived form = high fatigue
  const hasLowPerceivedForm = fatigueScore !== undefined && fatigueScore <= perceivedFormThreshold;
  const hasSevereInjuryRisk = injuryRiskRun?.level === "élevé";
  const hasSevereFreshnessIssue = potentielPhysiologique.details.fraicheur !== undefined && potentielPhysiologique.details.fraicheur < freshnessThreshold;
  
  const needsSevereRecovery = hasLowPerceivedForm || hasSevereInjuryRisk || hasSevereFreshnessIssue;
    
  if (needsSevereRecovery) {
    needs.push("NEED_RECOVERY");
    if (hasLowPerceivedForm) {
      const msg = `Forme perçue très basse (${fatigueScore}/10) → priorité récupération.`;
      rationale.push(msg);
      rationaleByNeed.NEED_RECOVERY.push(msg);
    }
    if (hasSevereInjuryRisk) {
      const msg = `Risque blessure CAP élevé (score ${injuryRiskRun.score}) → réduire intensité.`;
      rationale.push(msg);
      rationaleByNeed.NEED_RECOVERY.push(msg);
    }
    if (hasSevereFreshnessIssue) {
      const msg = `Disponibilité critique (<30%) → récupération prioritaire.`;
      rationale.push(msg);
      rationaleByNeed.NEED_RECOVERY.push(msg);
    }
  }
  
  // === RULE F: NEED_FTP_UP (for bike/tri ONLY when FTP is below target) ===
  // ✅ JAMAIS appliqué en Running Focus Mode
  const isBikeOrTri = sportFocus === "bike" || sportFocus === "tri";
  const effectiveAmbition = ambition || DEFAULT_AMBITION;
  const ftpTarget = getFtpKgTargetByAmbition(objectif, effectiveAmbition);
  const hasFtpDeficit = ftpKg !== undefined && ftpKg !== null && ftpKg < ftpTarget * 0.90;
  
  if (isBikeOrTri && hasFtpDeficit && !needsSevereRecovery && !isRunningFocus) {
    needs.push("NEED_FTP_UP");
    const msg = `FTP/kg insuffisant (${ftpKg?.toFixed(2)} W/kg < cible ${ftpTarget.toFixed(1)} W/kg pour ${objectif}/${effectiveAmbition}) → développer la puissance au seuil.`;
    rationale.push(msg);
    rationaleByNeed.NEED_FTP_UP.push(msg);
  }
  
  // === RULE G: NEED_VMA_UP (for running ONLY - equivalent to FTP development) ===
  // ✅ Uniquement en Running Focus Mode
  if (isRunningFocus && !needsSevereRecovery) {
    // Simplified check - in running, VMA development is key for shorter distances
    const isShortRunning = ["5K", "10K", "Semi"].includes(objectif);
    if (isShortRunning) {
      needs.push("NEED_VMA_UP");
      const msg = `Objectif ${objectif} → développer la VMA et l'allure seuil par des séances spécifiques CAP.`;
      rationale.push(msg);
      rationaleByNeed.NEED_VMA_UP.push(msg);
    }
  }
  
  // === RULE A: NEED_VLAMAX_DOWN ===
  const vlamaxRange = getVLamaxRange(objectif, effectiveAmbition);
  const vlamaxThreshold = vlamaxRange.max;
  const isLongDistance = ["IM", "Ironman", "Marathon", "703", "70.3", "Half", "TrailLong", "Ultra"].includes(objectif);
  
  // Only suggest VLAMAX_DOWN if FTP is already adequate (otherwise FTP_UP takes priority)
  const ftpIsAdequate = !isBikeOrTri || ftpKg === undefined || ftpKg === null || ftpKg >= ftpTarget * 0.90;
  
  if (vlamaxEffectif.value !== null && vlamaxEffectif.value > vlamaxThreshold && isLongDistance && ftpIsAdequate) {
    needs.push("NEED_VLAMAX_DOWN");
    const msg = `VLamax élevé pour l'objectif (${vlamaxEffectif.value.toFixed(2)} > ${vlamaxThreshold.toFixed(2)} pour ${objectif}/${effectiveAmbition}) → dépendance glucidique + risque dérive.`;
    rationale.push(msg);
    rationaleByNeed.NEED_VLAMAX_DOWN.push(msg);
  }
  
  // === RULE B: NEED_TTE_UP ===
  const tteTarget = getTTETargetByAmbition(objectif, effectiveAmbition);
  if (tteEffectif.value !== null && tteEffectif.value < tteTarget - 5) {
    needs.push("NEED_TTE_UP");
    const msg = `TTE insuffisant (${tteEffectif.value} min < cible ${tteTarget} min pour ${objectif}/${effectiveAmbition}) → durabilité seuil à développer.`;
    rationale.push(msg);
    rationaleByNeed.NEED_TTE_UP.push(msg);
  }
  
  // === RULE C: NEED_ENDURANCE_BASE ===
  // Apply different logic based on lowCRRJustification
  const lowCRRJustification = context.lowCRRJustification;
  const hasLowCRR = CRR.value !== null && CRR.value < 250;
  
  // Handle low CRR based on justification
  // IMPORTANT: En mode forceDevelopmentMode, on ignore les justifications qui déclenchent la récupération
  // sauf si la fatigue est vraiment sévère (déjà capturée par needsSevereRecovery ci-dessus)
  if (hasLowCRR && lowCRRJustification && !forceDevelopmentMode) {
    switch (lowCRRJustification) {
      case "decharge":
        // Deload week: light recovery suggestions
        if (!needs.includes("NEED_RECOVERY")) {
          needs.push("NEED_RECOVERY");
          const msg = `Semaine de décharge (TSS7j: ${CRR.value}) → récupération légère.`;
          rationale.push(msg);
          rationaleByNeed.NEED_RECOVERY.push(msg);
        }
        break;
        
      case "recuperation":
        // Recovery needed: prioritize recovery
        if (!needs.includes("NEED_RECOVERY")) {
          needs.unshift("NEED_RECOVERY"); // Add at beginning for priority
          const msg = `Récupération nécessaire (TSS7j: ${CRR.value}) → récupération renforcée.`;
          rationale.push(msg);
          rationaleByNeed.NEED_RECOVERY.push(msg);
        }
        break;
        
      case "faible_adherence":
        // Low adherence: ignore TSS for suggestions, focus on development needs
        const msg = `TSS7j faible (${CRR.value}) dû à faible adhérence → ignoré pour les suggestions.`;
        rationale.push(msg);
        // Don't add any need based on CRR - will use other physiological priorities
        break;
    }
  } else if (hasLowCRR && lowCRRJustification && forceDevelopmentMode) {
    // En mode forceDevelopmentMode, on note que la justification est ignorée
    const msg = `Mode développement actif → justification CRR (${lowCRRJustification}) ignorée, priorité au développement.`;
    rationale.push(msg);
  }
  
  // Endurance base check (only if not already in recovery and CRR not justified as faible_adherence)
  // IMPORTANT: Si NEED_FTP_UP est détecté, ne pas ajouter NEED_ENDURANCE_BASE car le FTP faible 
  // fausse la composante endurance. Résoudre le FTP d'abord.
  const hasFtpNeed = needs.includes("NEED_FTP_UP");
  const ignoreCRRForEndurance = lowCRRJustification === "faible_adherence";
  
  // En mode forceDevelopmentMode, ignorer l'endurance base pour prioriser le développement
  const ignoreEnduranceForDevelopment = forceDevelopmentMode && (hasFtpNeed || needs.includes("NEED_VLAMAX_DOWN"));
  
  const hasEnduranceIssue = 
    (potentielPhysiologique.details.endurance !== undefined && potentielPhysiologique.details.endurance < 60) ||
    (hasLowCRR && !ignoreCRRForEndurance && !lowCRRJustification);
    
  // Ne pas ajouter NEED_ENDURANCE_BASE si:
  // - On est déjà en récupération
  // - NEED_FTP_UP est détecté (faux positif sur l'endurance)
  // - forceDevelopmentMode est activé et on a des besoins de développement
  if (hasEnduranceIssue && !needs.includes("NEED_RECOVERY") && !hasFtpNeed && !ignoreEnduranceForDevelopment) {
    needs.push("NEED_ENDURANCE_BASE");
    if (potentielPhysiologique.details.endurance !== undefined && potentielPhysiologique.details.endurance < 60) {
      const msg = `Composante endurance faible (${potentielPhysiologique.details.endurance}%) → base aérobie à consolider.`;
      rationale.push(msg);
      rationaleByNeed.NEED_ENDURANCE_BASE.push(msg);
    }
    if (hasLowCRR && !ignoreCRRForEndurance && !lowCRRJustification) {
      const msg = `CRR faible (${CRR.value}) sans justification → volume à structurer.`;
      rationale.push(msg);
      rationaleByNeed.NEED_ENDURANCE_BASE.push(msg);
    }
  } else if (hasFtpNeed && hasEnduranceIssue) {
    // Ajouter une note explicative
    const note = `Composante endurance faible (${potentielPhysiologique.details.endurance ?? "?"}%) mais causée par FTP insuffisant → priorité au développement FTP.`;
    rationale.push(note);
    rationaleByNeed.NEED_FTP_UP.push(note);
  }
  
  // === RULE E: NEED_VO2_UP (lowest priority, controlled usage) ===
  const isShortObjective = ["Semi", "Trail", "Course"].includes(objectif);
  const hasLowVlamax = vlamaxEffectif.value !== null && vlamaxEffectif.value < 0.40;
  
  if (isShortObjective || (hasLowVlamax && !isLongDistance)) {
    // Only suggest VO2 if VLamax is not already elevated
    if (vlamaxEffectif.value === null || vlamaxEffectif.value <= vlamaxThreshold) {
      needs.push("NEED_VO2_UP");
      const msg = `Objectif court ou VLamax bas → augmenter plafond aérobie (usage contrôlé).`;
      rationale.push(msg);
      rationaleByNeed.NEED_VO2_UP.push(msg);
    }
  }
  
  // Limit to 2 needs max to avoid confusion
  // En mode forceDevelopmentMode, prioriser les besoins de développement
  // ✅ En Running Focus Mode, utiliser VMA_UP/ECONOMY_UP au lieu de FTP_UP
  let priorityOrder: WahooNeed[];
  if (forceDevelopmentMode) {
    // Prioriser développement: FTP/VMA, VLAMAX, VO2, TTE avant endurance
    priorityOrder = [
      "NEED_RECOVERY",      // Toujours #1 si vraiment nécessaire
      "NEED_VMA_UP",        // ✅ Running: VMA prioritaire
      "NEED_FTP_UP",        // Vélo: Développement prioritaire
      "NEED_ECONOMY_UP",    // ✅ Running: Économie
      "NEED_VLAMAX_DOWN",   // Développement métabolique
      "NEED_VO2_UP",        // Développement plafond
      "NEED_TTE_UP",        // Développement endurance spécifique
      "NEED_ENDURANCE_BASE" // Base (moins prioritaire en mode dev)
    ];
  } else {
    priorityOrder = [
      "NEED_RECOVERY",
      "NEED_VMA_UP",        // ✅ Running
      "NEED_FTP_UP",        // Vélo
      "NEED_ECONOMY_UP",    // ✅ Running
      "NEED_VLAMAX_DOWN", 
      "NEED_TTE_UP",
      "NEED_ENDURANCE_BASE",
      "NEED_VO2_UP"
    ];
  }
  
  const sortedNeeds = needs.sort((a, b) => priorityOrder.indexOf(a) - priorityOrder.indexOf(b));
  const limitedNeeds = sortedNeeds.slice(0, 2);
  
  return {
    needs: limitedNeeds,
    rationale,
    rationaleByNeed,
    priorityOrder: sortedNeeds,
  };
}

// ============= NEED TO AXIS MAPPING =============

function needToAxis(need: WahooNeed): WahooPhysioAxis[] {
  switch (need) {
    case "NEED_VLAMAX_DOWN":
      return ["VLAMAX_DOWN", "ENDURANCE_BASE"];
    case "NEED_TTE_UP":
      return ["TTE_UP", "THRESHOLD_MLSS"];
    case "NEED_FTP_UP":
      return ["THRESHOLD_MLSS", "TTE_UP"];
    case "NEED_VMA_UP":          // ✅ Running equivalent
      return ["VO2_UP", "THRESHOLD_MLSS"];
    case "NEED_ECONOMY_UP":      // ✅ Running economy
      return ["ENDURANCE_BASE", "VLAMAX_DOWN"];
    case "NEED_ENDURANCE_BASE":
      return ["ENDURANCE_BASE"];
    case "NEED_RECOVERY":
      return ["RECOVERY"];
    case "NEED_VO2_UP":
      return ["VO2_UP"];
  }
}

export function needToTargetAxis(need: WahooNeed): TargetAxis {
  switch (need) {
    case "NEED_VLAMAX_DOWN":
      return "VLAMAX";
    case "NEED_TTE_UP":
      return "TTE";
    case "NEED_FTP_UP":
      return "FTP";
    case "NEED_VMA_UP":          // ✅ Running
      return "VMA";
    case "NEED_ECONOMY_UP":      // ✅ Running
      return "ECONOMY";
    case "NEED_ENDURANCE_BASE":
      return "ENDURANCE";
    case "NEED_RECOVERY":
      return "FRESHNESS";
    case "NEED_VO2_UP":
      return "VO2";
  }
}

// ============= WORKOUT SELECTION =============

/**
 * Select workouts for a need with extended count for phased suggestions
 * Returns up to maxCount workouts, sorted by risk level
 */
function selectWorkoutsForNeed(
  need: WahooNeed,
  context: SuggestionEngineContext,
  alreadySelected: Set<string>,
  maxCount: number = 4
): WahooWorkoutMapping[] {
  const { objectif, sportFocus, vlamaxEffectif, fatigueScore, injuryRiskRun } = context;
  
  const targetAxes = needToAxis(need);
  
  // Filter workouts by:
  // 1. Primary axis matches need
  // 2. Sport matches focus (or bike for tri)
  // 3. Not already selected
  // 4. Safety filters
  
  let candidates = WAHOO_WORKOUTS.filter(w => {
    // Axis match (primary or secondary)
    const axisMatch = targetAxes.includes(w.primary_axis) || 
                      (w.secondary_axis && targetAxes.includes(w.secondary_axis));
    if (!axisMatch) return false;
    
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
  
  // Safety filters - use stricter thresholds to avoid over-filtering development workouts
  const isLongDistance = ["IM", "Ironman", "Marathon", "703", "70.3", "Half", "TrailLong", "Ultra"].includes(objectif);
  const hasHighVlamax = vlamaxEffectif.value !== null && vlamaxEffectif.value > getVLamaxThreshold(objectif);
  // Only apply fatigue filter for severe cases (8+/10 or high injury risk)
  const hasSevereFatigue = (fatigueScore !== undefined && fatigueScore >= 8) || injuryRiskRun?.level === "élevé";
  
  candidates = candidates.filter(w => {
    // Exclude risk_level 3 ONLY if severe fatigue/injury
    if (w.risk_level === 3 && hasSevereFatigue) {
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
  
  // Sort by: 1) primary axis match first, 2) risk level (prefer lower risk)
  candidates.sort((a, b) => {
    // Primary axis match has priority
    const aIsPrimary = targetAxes.includes(a.primary_axis) ? 0 : 1;
    const bIsPrimary = targetAxes.includes(b.primary_axis) ? 0 : 1;
    if (aIsPrimary !== bIsPrimary) return aIsPrimary - bIsPrimary;
    
    return a.risk_level - b.risk_level;
  });
  
  return candidates.slice(0, maxCount);
}

/**
 * Get additional workouts for secondary axes to fill out phase 2 and 3
 */
function selectSecondaryWorkouts(
  context: SuggestionEngineContext,
  alreadySelected: Set<string>,
  targetAxis: WahooPhysioAxis[],
  maxCount: number = 3
): WahooWorkoutMapping[] {
  const { objectif, sportFocus, vlamaxEffectif, injuryRiskRun } = context;
  const isLongDistance = ["IM", "Ironman", "Marathon", "703", "70.3", "Half", "TrailLong", "Ultra"].includes(objectif);
  const hasHighVlamax = vlamaxEffectif.value !== null && vlamaxEffectif.value > getVLamaxThreshold(objectif);
  
  let candidates = WAHOO_WORKOUTS.filter(w => {
    // Match by primary or secondary axis
    const axisMatch = targetAxis.includes(w.primary_axis) || 
                      (w.secondary_axis && targetAxis.includes(w.secondary_axis));
    if (!axisMatch) return false;
    
    // Sport match
    if (sportFocus !== "tri" && w.sport !== sportFocus) {
      return false;
    }
    
    // Not already selected
    if (alreadySelected.has(w.wahoo_id)) return false;
    
    // Safety: no high risk for long distance + high VLamax
    if (w.risk_level >= 3 && isLongDistance && hasHighVlamax) return false;
    
    // No VO2_UP if high VLamax and long distance
    if (w.primary_axis === "VO2_UP" && hasHighVlamax && isLongDistance) return false;
    
    // No intense running if injury risk
    if (injuryRiskRun?.level === "élevé" && w.sport === "run" && w.intensity_profile === "high") {
      return false;
    }
    
    return true;
  });
  
  // Prefer moderate intensity for secondary suggestions
  candidates.sort((a, b) => {
    const intensityOrder = { low: 0, moderate: 1, mixed: 2, high: 3 };
    return intensityOrder[a.intensity_profile] - intensityOrder[b.intensity_profile];
  });
  
  return candidates.slice(0, maxCount);
}

/**
 * Determine the temporal phase for a workout based on need priority and workout characteristics
 */
function determineTemporalPhase(
  need: WahooNeed,
  workout: WahooWorkoutMapping,
  needIndex: number,
  context: SuggestionEngineContext
): TemporalPhase {
  const { fatigueScore, injuryRiskRun } = context;
  const hasSevereFatigue = (fatigueScore !== undefined && fatigueScore >= 8);
  const hasSevereInjuryRisk = injuryRiskRun?.level === "élevé";
  
  // Phase 1: Immediate priorities (recovery ONLY, or first-priority low-risk workouts for primary need)
  if (need === "NEED_RECOVERY") return 1;
  if (needIndex === 0 && workout.risk_level <= 1) return 1;
  // Only push to phase 1 for severe cases
  if (hasSevereFatigue && workout.primary_axis === "RECOVERY") return 1;
  if (hasSevereInjuryRisk && workout.primary_axis === "RECOVERY") return 1;
  
  // Phase 2: Short-term development (primary need, moderate intensity)
  if (needIndex === 0 && workout.risk_level === 2) return 2;
  if (needIndex <= 1 && workout.intensity_profile === "moderate") return 2;
  if (workout.primary_axis === "ENDURANCE_BASE" && workout.intensity_profile === "low") return 2;
  
  // Phase 3: Medium-term consolidation (secondary needs, higher complexity)
  return 3;
}

/**
 * Get frequency suggestion based on workout type and phase
 */
function getFrequencyForWorkout(
  workout: WahooWorkoutMapping,
  phase: TemporalPhase,
  need: WahooNeed
): string {
  if (workout.primary_axis === "RECOVERY") {
    return "1-2x / semaine";
  }
  
  if (workout.primary_axis === "ENDURANCE_BASE" || workout.primary_axis === "VLAMAX_DOWN") {
    if (phase === 1) return "2-3x / semaine";
    if (phase === 2) return "2x / semaine";
    return "1-2x / semaine";
  }
  
  if (workout.primary_axis === "TTE_UP" || workout.primary_axis === "THRESHOLD_MLSS") {
    if (phase === 1) return "1-2x / semaine";
    return "1x / semaine";
  }
  
  if (workout.primary_axis === "VO2_UP" || workout.primary_axis === "HIGH_RISK") {
    return "1x / semaine max";
  }
  
  if (workout.primary_axis === "FORCE_ENDURANCE") {
    return "1x / semaine";
  }
  
  return "1-2x / semaine";
}

// ============= SUGGESTION GENERATION =============

function generateWhyMessage(
  need: WahooNeed,
  workout: WahooWorkoutMapping,
  context: SuggestionEngineContext
): string {
  const { objectif, vlamaxEffectif, tteEffectif, fatigueScore, injuryRiskRun, ftpKg } = context;
  
  switch (need) {
    case "NEED_VLAMAX_DOWN":
      return `VLamax ${vlamaxEffectif.value?.toFixed(2) ?? "?"} > seuil ${getVLamaxThreshold(objectif).toFixed(2)} (${objectif}). Cette séance favorise la baisse du VLamax et l'oxydation lipidique.`;
      
    case "NEED_TTE_UP":
      return `TTE ${tteEffectif.value ?? "?"} min < cible ${getTTETarget(objectif)} min (${objectif}). Cette séance améliore la capacité à soutenir l'effort au seuil.`;
    
    case "NEED_FTP_UP":
      return `FTP/kg ${ftpKg?.toFixed(2) ?? "?"} W/kg < cible ${getFtpKgTarget(objectif).toFixed(1)} W/kg (${objectif}). Cette séance développe la puissance au seuil et améliore le FTP.`;
    
    // ✅ RUNNING FOCUS MODE - New needs
    case "NEED_VMA_UP":
      return `Objectif ${objectif} → développer la VMA par des séances de fractionné spécifique course à pied.`;
    
    case "NEED_ECONOMY_UP":
      return `Améliorer l'économie de course pour ${objectif}. Travail technique et renforcement spécifique CAP.`;
      
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
  
  // Extended processing: get more workouts per need
  const allPriorityNeeds = needAnalysis.priorityOrder; // All needs, not just top 2
  
  // Process primary needs with extended count (4 workouts per need)
  allPriorityNeeds.forEach((need, needIndex) => {
    const targetAxis = needToTargetAxis(need);
    
    if (needIndex === 0) {
      primaryConcern = targetAxis;
      diagnosticSummary = needAnalysis.rationale[0] || `Besoin principal : ${need}`;
    }
    
    // Get more workouts: 4 for primary need, 3 for secondary, 2 for tertiary
    const maxWorkouts = needIndex === 0 ? 4 : needIndex === 1 ? 3 : 2;
    const workouts = selectWorkoutsForNeed(need, context, selectedIds, maxWorkouts);
    
    workouts.forEach((workout, workoutIndex) => {
      selectedIds.add(workout.wahoo_id);
      
      const temporalPhase = determineTemporalPhase(need, workout, needIndex, context);
      const frequencyPerWeek = getFrequencyForWorkout(workout, temporalPhase, need);
      
      const suggestion: WahooSuggestion = {
        id: `suggestion_${need}_${workoutIndex}`,
        wahoo_id: workout.wahoo_id,
        wahoo_name: workout.wahoo_name,
        target_need: need,
        targetAxis,
        priority: Math.min(needIndex + 1, 3) as 1 | 2 | 3,
        temporalPhase,
        frequencyPerWeek,
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
  
  // Fill remaining slots with complementary workouts for phase 2 and 3
  const targetFillCount = 12 - suggestions.length;
  if (targetFillCount > 0) {
    // Determine complementary axes based on objective
    const isLongDistance = ["IM", "Ironman", "Marathon", "703", "70.3", "Half", "TrailLong", "Ultra"].includes(context.objectif);
    const complementaryAxes: WahooPhysioAxis[] = isLongDistance 
      ? ["ENDURANCE_BASE", "FORCE_ENDURANCE", "THRESHOLD_MLSS"]
      : ["TTE_UP", "FORCE_ENDURANCE", "THRESHOLD_MLSS"];
    
    const additionalWorkouts = selectSecondaryWorkouts(context, selectedIds, complementaryAxes, targetFillCount);
    
    additionalWorkouts.forEach((workout, idx) => {
      selectedIds.add(workout.wahoo_id);
      
      // Map workout axis to target axis
      const targetAxis = mapPhysioAxisToTargetAxis(workout.primary_axis);
      const need = mapTargetAxisToNeed(targetAxis);
      
      // These are consolidation workouts, so phase 2 or 3
      const temporalPhase: TemporalPhase = idx < 2 ? 2 : 3;
      const frequencyPerWeek = getFrequencyForWorkout(workout, temporalPhase, need);
      
      suggestions.push({
        id: `suggestion_complementary_${idx}`,
        wahoo_id: workout.wahoo_id,
        wahoo_name: workout.wahoo_name,
        target_need: need,
        targetAxis,
        priority: 3,
        temporalPhase,
        frequencyPerWeek,
        why: generateComplementaryWhyMessage(workout, context),
        expected_effects: generateExpectedEffects(workout),
        cautions: generateCautions(workout, context),
        confidence: 0.7,
        riskLevel: workout.risk_level,
        staffAnnotation: workout.staff_annotation,
      });
    });
  }
  
  // Ensure at least 1 "safe" session ONLY for severe fatigue/injury
  const hasSafeSession = suggestions.some(s => s.riskLevel <= 1);
  const needsSafeSession = 
    (context.fatigueScore !== undefined && context.fatigueScore >= 8) ||
    context.injuryRiskRun?.level === "élevé";
    
  if (!hasSafeSession && needsSafeSession) {
    // Add a recovery/endurance session
    const safeWorkouts = WAHOO_WORKOUTS.filter(w => 
      w.risk_level === 0 && 
      (w.primary_axis === "RECOVERY" || w.primary_axis === "ENDURANCE_BASE") &&
      !selectedIds.has(w.wahoo_id)
    );
    
    if (safeWorkouts.length > 0) {
      const safeWorkout = safeWorkouts[0];
      suggestions.unshift({
        id: `suggestion_safe_0`,
        wahoo_id: safeWorkout.wahoo_id,
        wahoo_name: safeWorkout.wahoo_name,
        target_need: "NEED_RECOVERY",
        targetAxis: "FRESHNESS",
        priority: 1,
        temporalPhase: 1,
        frequencyPerWeek: "2-3x / semaine",
        why: "Séance sécuritaire recommandée compte tenu du niveau de fatigue ou risque.",
        expected_effects: generateExpectedEffects(safeWorkout),
        cautions: [],
        confidence: 0.8,
        riskLevel: safeWorkout.risk_level,
        staffAnnotation: safeWorkout.staff_annotation,
      });
    }
  }
  
  // Sort suggestions by temporal phase, then by priority
  suggestions.sort((a, b) => {
    if (a.temporalPhase !== b.temporalPhase) return a.temporalPhase - b.temporalPhase;
    return a.priority - b.priority;
  });
  
  // Limit to 12 suggestions max
  const finalSuggestions = suggestions.slice(0, 12);
  
  // Organize by phases
  const phasedSuggestions: PhasedSuggestions = {
    phase1: finalSuggestions.filter(s => s.temporalPhase === 1),
    phase2: finalSuggestions.filter(s => s.temporalPhase === 2),
    phase3: finalSuggestions.filter(s => s.temporalPhase === 3),
  };
  
  if (!diagnosticSummary && finalSuggestions.length === 0) {
    diagnosticSummary = "Profil équilibré. Aucune suggestion prioritaire identifiée.";
  }
  
  return {
    suggestions: finalSuggestions,
    phasedSuggestions,
    needAnalysis,
    diagnosticSummary,
    primaryConcern,
  };
}

// ============= HELPER FUNCTIONS FOR EXTENDED ENGINE =============

function mapPhysioAxisToTargetAxis(axis: WahooPhysioAxis): TargetAxis {
  switch (axis) {
    case "VLAMAX_DOWN":
      return "VLAMAX";
    case "TTE_UP":
      return "TTE";
    case "THRESHOLD_MLSS":
      return "FTP";
    case "ENDURANCE_BASE":
    case "FORCE_ENDURANCE":
      return "ENDURANCE";
    case "RECOVERY":
      return "FRESHNESS";
    case "VO2_UP":
    case "HIGH_RISK":
      return "VO2";
    default:
      return "ENDURANCE";
  }
}

function mapTargetAxisToNeed(axis: TargetAxis): WahooNeed {
  switch (axis) {
    case "VLAMAX":
      return "NEED_VLAMAX_DOWN";
    case "TTE":
      return "NEED_TTE_UP";
    case "FTP":
      return "NEED_FTP_UP";
    case "VMA":           // ✅ Running
      return "NEED_VMA_UP";
    case "ECONOMY":       // ✅ Running
      return "NEED_ECONOMY_UP";
    case "ENDURANCE":
      return "NEED_ENDURANCE_BASE";
    case "FRESHNESS":
      return "NEED_RECOVERY";
    case "VO2":
      return "NEED_VO2_UP";
  }
}

function generateComplementaryWhyMessage(
  workout: WahooWorkoutMapping,
  context: SuggestionEngineContext
): string {
  const { objectif } = context;
  
  switch (workout.primary_axis) {
    case "ENDURANCE_BASE":
      return `Complément pour consolider la base aérobie pour l'objectif ${objectif}. Séance à intégrer progressivement.`;
    case "FORCE_ENDURANCE":
      return `Renforcement de la force-endurance. Améliore l'économie motrice et la résistance musculaire.`;
    case "THRESHOLD_MLSS":
      return `Travail au seuil pour améliorer la capacité à maintenir l'intensité cible. À utiliser après avoir consolidé la base.`;
    case "TTE_UP":
      return `Développement de la durabilité au seuil. Complète le travail principal de TTE.`;
    case "VLAMAX_DOWN":
      return `Séance complémentaire pour continuer à réduire la dépendance glycolytique.`;
    default:
      return `Séance complémentaire pour le développement global de la condition physique.`;
  }
}

// ============= LEGACY COMPATIBILITY =============
// For backward compatibility with existing code

export interface SuggestionEngineInput {
  vlamaxEffectif: number | null;
  vlamaxConfidence: number;
  tteEffectif: number | null;
  tteConfidence: number;
  potentielPhysiologiqueScore: number | null;
  potentielPhysiologiqueFactors?: {
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
    potentielPhysiologique: {
      score: input.potentielPhysiologiqueScore,
      details: {
        endurance: input.potentielPhysiologiqueFactors?.endurance,
        tte: input.potentielPhysiologiqueFactors?.tte,
        vlamax: input.potentielPhysiologiqueFactors?.vlamax,
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
    case "FTP":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
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
    case "FTP":
      return "Développer FTP";
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
    case "FTP":
      return "⚡";
    case "VMA":           // ✅ Running
      return "🏃";
    case "ECONOMY":       // ✅ Running
      return "🎯";
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
    case "NEED_FTP_UP":
      return "Développer FTP";
    case "NEED_VMA_UP":         // ✅ Running
      return "Développer VMA";
    case "NEED_ECONOMY_UP":     // ✅ Running
      return "Économie CAP";
    case "NEED_ENDURANCE_BASE":
      return "Base aérobie";
    case "NEED_RECOVERY":
      return "Récupération";
    case "NEED_VO2_UP":
      return "VO₂max";
  }
}

/**
 * Format suggestions for PDF export with temporal phases
 */
export function formatSuggestionsForPDF(output: SuggestionEngineOutput): string {
  if (output.suggestions.length === 0) {
    return "Aucune suggestion prioritaire identifiée.";
  }

  let text = "### Suggestions Wahoo SYSTM (optionnelles)\n\n";
  text += `**Diagnostic :** ${output.diagnosticSummary}\n\n`;
  
  // Format by phases
  const phases: TemporalPhase[] = [1, 2, 3];
  
  phases.forEach((phase) => {
    const phaseSuggestions = output.phasedSuggestions[`phase${phase}` as keyof PhasedSuggestions];
    if (phaseSuggestions.length === 0) return;
    
    text += `#### ${PHASE_LABELS[phase]}\n`;
    text += `_${PHASE_DESCRIPTIONS[phase]}_\n\n`;
    
    phaseSuggestions.forEach((s) => {
      text += `• **${s.wahoo_name}** (Wahoo SYSTM)\n`;
      text += `  Axe ciblé : ${getAxisLabel(s.targetAxis)} ${getAxisIcon(s.targetAxis)}\n`;
      if (s.frequencyPerWeek) {
        text += `  Fréquence suggérée : ${s.frequencyPerWeek}\n`;
      }
      text += `  Justification : ${s.why}\n`;
      text += `  Effets attendus : ${s.expected_effects.join(", ")}\n`;
      if (s.cautions.length > 0) {
        text += `  ⚠️ Précautions : ${s.cautions.join("; ")}\n`;
      }
      text += `  _${s.staffAnnotation}_\n`;
      text += "\n";
    });
  });

  text += "_Ces suggestions ne remplacent pas la planification du coach. Elles éclairent un besoin physiologique identifié._";
  
  return text;
}

/**
 * Copy-friendly text for coach export with temporal phases
 */
export function formatSuggestionsForCopy(output: SuggestionEngineOutput): string {
  if (output.suggestions.length === 0) {
    return "Aucune suggestion Wahoo prioritaire.";
  }

  let text = "🎯 SUGGESTIONS WAHOO SYSTM\n\n";
  text += `Diagnostic : ${output.diagnosticSummary}\n\n`;
  
  // Format by phases
  const phases: TemporalPhase[] = [1, 2, 3];
  
  phases.forEach((phase) => {
    const phaseSuggestions = output.phasedSuggestions[`phase${phase}` as keyof PhasedSuggestions];
    if (phaseSuggestions.length === 0) return;
    
    text += `\n📅 ${PHASE_LABELS[phase].toUpperCase()}\n`;
    text += `(${PHASE_DESCRIPTIONS[phase]})\n`;
    text += "─".repeat(40) + "\n\n";
    
    phaseSuggestions.forEach((s, idx) => {
      text += `${idx + 1}. ${s.wahoo_name}\n`;
      text += `   → ${getAxisLabel(s.targetAxis)}\n`;
      if (s.frequencyPerWeek) {
        text += `   ⏰ Fréquence : ${s.frequencyPerWeek}\n`;
      }
      text += `   Pourquoi : ${s.why}\n`;
      text += `   Effets : ${s.expected_effects.join(", ")}\n`;
      if (s.cautions.length > 0) {
        text += `   ⚠️ ${s.cautions.join("; ")}\n`;
      }
      text += "\n";
    });
  });

  text += "───────────────────────────────────────\n";
  text += "Ces suggestions sont optionnelles et ne remplacent pas la planification.";
  
  return text;
}

/**
 * Get phase color for UI display
 */
export function getPhaseColor(phase: TemporalPhase): string {
  switch (phase) {
    case 1:
      return "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700";
    case 2:
      return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700";
    case 3:
      return "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700";
  }
}
