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

// ═══════════════════════════════════════════════════════════════════════════════
// Re-exports — Sub-module types & functions for UI consumers
// All UI components should import from @/engines/diagnostic, NOT from @/lib/*
// ═══════════════════════════════════════════════════════════════════════════════

// VLamax Effectif
export { computeVLamaxEffectif } from "@/lib/vlamaxEffectif";
export type { VLamaxEffectif } from "@/lib/vlamaxEffectif";

// TTE Effectif
export { computeTTEEffectif } from "@/lib/tteEffectif";
export type { TTEEffectif } from "@/lib/tteEffectif";

// Fatigue Effectif
export { computeFatigueEffectif } from "@/lib/fatigueEffectif";
export type { FatigueEffectif } from "@/lib/fatigueEffectif";

// Unified Limiter Detection (Compas)
export {
  detectUnifiedLimiter,
  getVo2maxTarget,
  getVo2maxAgeFactor,
  getVo2maxAgeAdjustmentLabel,
  mapLimiterToReportType,
} from "@/lib/v2/unifiedLimiterDetection";
export type {
  UnifiedLimiterResult,
  UnifiedLimiter,
  UnifiedLever,
  UnifiedLimiterInput,
} from "@/lib/v2/unifiedLimiterDetection";

// Race Readiness V2
export type { RaceReadinessV2Result } from "@/lib/v2/raceReadinessV2";

// Physiological Targets
export type { ObjectiveTargets } from "@/lib/physiologicalTargets";

// Injury Risk
export type { RunInjuryRiskEnvelope } from "@/lib/runInjuryRisk";
export type { InjuryRiskEnvelope } from "@/lib/v2/injuryRiskUnified";

// Decision Reliability Engine (DRE)
export { computeFullDRE } from "@/lib/v2/decisionReliabilityEngine";
export type { DecisionReliabilityResult, Scenario } from "@/lib/v2/decisionReliabilityEngine";
