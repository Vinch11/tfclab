/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL DIAGNOSTIC ENGINE™ — Public API
 * 
 * Point d'entrée unique pour le diagnostic athlète.
 * Tous les composants UI importent depuis ce module, PAS depuis @/lib/*
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
// VLamax Effectif — Types, computation & display utilities
// ═══════════════════════════════════════════════════════════════════════════════

export { computeVLamaxEffectif } from "@/lib/vlamaxEffectif";
export type {
  VLamaxEffectif,
  VLamaxSource,
  VLamaxDetails,
  VLamaxV2Result,
  VLamaxV2Source,
  CalibrationLogEntry,
  SportContext,
  ErrorMarginFactors,
} from "@/lib/vlamaxEffectif";
// Display utilities
export {
  getSourceColor,
  getSourceBgColor,
  getConfidenceColor,
  getConfidenceLabel,
  formatVLamaxDisplay,
  formatVLamaxWithRange,
  getVLamaxRange,
  toVLamaxEnvelope,
  // V2 re-exports
  computeVLamaxV2,
  PHYSIOLOGICAL_BOUNDS,
  clampVLamax,
  formatVLamaxAthlete,
  formatVLamaxStaff,
  formatVLamaxRange,
  getV2SourceColor,
  getV2SourceBgColor,
  getV2SourceLabel,
  getV2SourceEmoji,
  getV2ConfidenceColor,
  getV2ConfidenceLabel,
  VLAMAX_V2_ACADEMY_TEXT,
} from "@/lib/vlamaxEffectif";

// ═══════════════════════════════════════════════════════════════════════════════
// TTE Effectif — Types, computation & display utilities
// NOTE: getSourceColor/getSourceBgColor aliased with TTE prefix to avoid
//       collision with VLamax equivalents
// ═══════════════════════════════════════════════════════════════════════════════

export { computeTTEEffectif } from "@/lib/tteEffectif";
export type { TTEEffectif, TTESource } from "@/lib/tteEffectif";
// Display utilities (collision-free names kept as-is)
export {
  getTTETarget,
  formatTTELabel,
  formatTTEDisplay,
  formatTTEWithRange,
  getSourceLabel,
  isTTEAvailable,
  toTTEEnvelope,
  getStatusColor,
  // Aliased to avoid collision with VLamax equivalents
  getSourceColor as getTTESourceColor,
  getSourceBgColor as getTTESourceBgColor,
} from "@/lib/tteEffectif";

// ═══════════════════════════════════════════════════════════════════════════════
// Fatigue Effectif — Types, computation & display utilities
// ═══════════════════════════════════════════════════════════════════════════════

export { computeFatigueEffectif } from "@/lib/fatigueEffectif";
export type {
  FatigueEffectif,
  FatigueLevel,
  FatigueContributions,
  ComputeFatigueParams,
} from "@/lib/fatigueEffectif";
export {
  getFatigueLevel,
  getFatigueIcon,
  getFatigueColorClass,
  getFatigueBadgeClass,
  FATIGUE_SCALE,
  FATIGUE_INDEX_DEFINITION,
  FATIGUE_INDEX_DISCLAIMER,
  FATIGUE_POSITIVE_NOTE,
  FATIGUE_METHODOLOGY,
} from "@/lib/fatigueEffectif";

// ═══════════════════════════════════════════════════════════════════════════════
// Unified Limiter Detection (Compas)
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// Race Readiness, Targets, Injury Risk, DRE
// ═══════════════════════════════════════════════════════════════════════════════

export type { RaceReadinessV2Result } from "@/lib/v2/raceReadinessV2";
export type { ObjectiveTargets } from "@/lib/physiologicalTargets";
export type { RunInjuryRiskEnvelope } from "@/lib/runInjuryRisk";
export type { InjuryRiskEnvelope } from "@/lib/v2/injuryRiskUnified";
export { computeFullDRE, computeProtocolQuality } from "@/lib/v2/decisionReliabilityEngine";
export type {
  DecisionReliabilityResult,
  Scenario,
  DecisionLevel,
  ConsistencyFlag,
  CoachValidationStatus,
  ProtocolQualityInput,
  SleepQuality,
  NutritionPreTest,
  EnvironmentalConditions,
  FullDREInput,
} from "@/lib/v2/decisionReliabilityEngine";

// ═══════════════════════════════════════════════════════════════════════════════
// Legacy snapshot VLamax — Re-export pour migration progressive
// Les consumers utilisant l'ancien format SnapshotNolio doivent passer par ici
// ═══════════════════════════════════════════════════════════════════════════════
export { calculVLamaxSnapshot, calculVLamaxAvecConfiance } from "@/lib/athleteStore";
