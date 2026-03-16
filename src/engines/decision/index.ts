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

// ═══════════════════════════════════════════════════════════════════════════════
// Re-exports — Sub-module types, functions & constants for UI consumers
// All UI components should import from @/engines/decision, NOT from @/lib/*
// ═══════════════════════════════════════════════════════════════════════════════

// Lorang Strategy Engine
export {
  computeLorangStrategy,
  LORANG_PHILOSOPHY,
  LIMITER_DEFINITIONS,
  LEVER_DEFINITIONS,
} from "@/lib/v2/lorangStrategyEngine";
export type {
  LorangStrategyResult,
  LorangStrategyInput,
  LorangLeverActivation,
  LorangProhibitionRule,
  LorangLimiter,
} from "@/lib/v2/lorangStrategyEngine";

// TFCL Decision Matrix
export {
  computeTFCLDecisionMatrix,
  getDecisionCaseColor,
  getMetricStatusColor,
  getMetricStatusBadgeClass,
} from "@/lib/v2/tfclDecisionMatrix";
export type {
  TFCLDecisionResult,
  TFCLDecisionInput,
  TFCLDomainAnalysis,
  TFCLTrainingFocus,
  TFCLObjective,
  DecisionCase,
  DataSource,
  TrainingLever,
} from "@/lib/v2/tfclDecisionMatrix";

// Workout Recommendation Engine
export {
  computeWorkoutRecommendations,
  FATIGUE_VELO_GUIDELINE,
} from "@/lib/workoutRecommendationEngine";
export type {
  WorkoutRecommendation,
  RecommendationEngineOutput,
  RecommendationContext,
  RecommendationType,
} from "@/lib/workoutRecommendationEngine";

// Workout Advisory Engine
export {
  generateWorkoutAdvisories,
  WORKOUT_ADVISORY_DISCLAIMER,
} from "@/lib/workoutAdvisoryEngine";
export type {
  WorkoutAdvisory,
  AdvisoryStatus,
  AdvisoryContext,
  AdvisoryEngineOutput,
  WorkoutPhysioTags,
  Platform,
  IntensityType,
  LoadLevel,
  DurationClass,
} from "@/lib/workoutAdvisoryEngine";

// Strategic Roadmap
export { computeStrategicRoadmap } from "@/lib/v2/strategicRoadmap";
export type { StrategicRoadmap, RoadmapPhase } from "@/lib/v2/strategicRoadmap";
