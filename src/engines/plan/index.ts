/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL PLAN ENGINE™ — Public API
 * 
 * Orchestre la préparation et le post-traitement des plans d'entraînement.
 * La génération IA reste dans l'edge function (streaming).
 * 
 * USAGE :
 * ```ts
 * import { buildEnrichedPlanConfig, buildPlanOutput, extractPlanContext } from "@/engines/plan";
 * 
 * // 1. Préparer le config enrichi
 * const config = buildEnrichedPlanConfig({ prescription, athleteData, config });
 * 
 * // 2. Appeler useAITrainingPlan avec ce config
 * const { generatePlan } = useAITrainingPlan();
 * await generatePlan(athleteData, config);
 * 
 * // 3. Post-traiter le résultat
 * const output = buildPlanOutput(rawMarkdown, input, chunksUsed);
 * ```
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Core functions
export {
  extractPlanContext,
  buildEnrichedPlanConfig,
  buildPlanOutput,
} from "./computePlan";

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
