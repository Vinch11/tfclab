/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL PLAN ENGINE™ — Public API
 * 
 * Orchestre le post-traitement des plans d'entraînement.
 * La génération IA reste dans l'edge function (streaming).
 *
 * Le `PlanConfig` envoyé à `useAITrainingPlan` est construit via
 * `buildPlanConfigFromDiagnostic` (planConfigBuilder).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Core functions
export {
  postProcessParsedPlan,
} from "./computePlan";

// Plan Config Builder (from Diagnostic)
export {
  buildPlanConfigFromDiagnostic,
  buildPlanAthleteDataFromDiagnostic,
} from "./planConfigBuilder";
export type { PlanFormConfig } from "./planConfigBuilder";

// Types
export type {
  PlanInput,
  PlanOutput,
  PlanGenerationConfig,
  PlanInjectedContext,
  ParsedPlan,
  ParsedWeek,
  ParsedSession,
  PlanAthleteData,
  PlanConfig,
  RaceGoal,
  ChunkProgress,
} from "./types";

export {
  PLAN_ENGINE_VERSION,
  PLAN_ENGINE_DISCLAIMER,
} from "./types";

// Plan Validator
export {
  deriveLimiterKeysFromGapAnalysis,
  validatePlan,
  formatValidationReport,
} from "./planValidator";
export type {
  LimiterGapLike,
  PlanValidationResult,
  ValidationIssue,
  WeekMetrics,
} from "./planValidator";
