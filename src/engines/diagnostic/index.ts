/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL DIAGNOSTIC ENGINE™ — Public API
 * 
 * Point d'entrée unique pour le diagnostic athlète.
 * Remplace les appels directs à :
 * - computeVLamaxEffectif / computeTTEEffectif / computeFatigueEffectif
 * - detectUnifiedLimiter (Compas)
 * - computeRaceReadinessV2 (Race Readiness)
 * - getTargetsForAmbition (Ambition/Cibles)
 * - computeRunInjuryRisk (Risque blessure)
 * 
 * USAGE :
 * ```ts
 * import { computeDiagnostic } from "@/engines/diagnostic";
 * const diagnostic = computeDiagnostic(input);
 * // diagnostic.effectifs.vlamax
 * // diagnostic.limiter.primaryLimiter
 * // diagnostic.readiness.readiness.score
 * // diagnostic.synthesis.headline
 * ```
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Core function
export { computeDiagnostic } from "./computeDiagnostic";

// Types
export type {
  DiagnosticInput,
  AthleteDiagnostic,
  DiagnosticSynthesis,
  DiagnosticAlert,
  DecisionReliabilityInput,
  CheckinData,
} from "./types";

export {
  DIAGNOSTIC_ENGINE_VERSION,
  DIAGNOSTIC_ENGINE_DISCLAIMER,
} from "./types";

// Re-export sub-module types for consumers that need granularity
export type { VLamaxEffectif } from "@/lib/vlamaxEffectif";
export type { TTEEffectif } from "@/lib/tteEffectif";
export type { FatigueEffectif } from "@/lib/fatigueEffectif";
export type { UnifiedLimiterResult, UnifiedLimiter, UnifiedLever } from "@/lib/v2/unifiedLimiterDetection";
export type { RaceReadinessV2Result } from "@/lib/v2/raceReadinessV2";
export type { ObjectiveTargets } from "@/lib/physiologicalTargets";
