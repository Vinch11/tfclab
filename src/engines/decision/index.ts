/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL DECISION ENGINE™ — Public API
 * 
 * Point d'entrée unique pour les prescriptions d'entraînement.
 * Remplace les appels directs à :
 * - computeLorangStrategy (Strategy Engine)
 * - computeTFCLDecisionMatrix (Decision Matrix)
 * - computeWorkoutRecommendations / generateWorkoutAdvisories
 * - generateRoadmap (Strategic Roadmap)
 * 
 * USAGE :
 * ```ts
 * import { computeDecision } from "@/engines/decision";
 * const prescription = computeDecision({ diagnostic, context });
 * // prescription.strategy.primaryAction
 * // prescription.workoutGuidance.recommendations
 * // prescription.executiveSummary.headline
 * ```
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Core function
export { computeDecision } from "./computeDecision";

// Types
export type {
  DecisionInput,
  TrainingPrescription,
  StrategyPrescription,
  WorkoutGuidance,
  ExecutiveSummary,
} from "./types";

export {
  DECISION_ENGINE_VERSION,
  DECISION_ENGINE_DISCLAIMER,
} from "./types";

// Re-export sub-module types for consumers that need granularity
export type { LorangStrategyResult } from "@/lib/v2/lorangStrategyEngine";
export type { TFCLDecisionResult } from "@/lib/v2/tfclDecisionMatrix";
export type { WorkoutRecommendation } from "@/lib/workoutRecommendationEngine";
export type { WorkoutAdvisory } from "@/lib/workoutAdvisoryEngine";
export type { StrategicRoadmap } from "@/lib/v2/strategicRoadmap";
