/**
 * FIT Import Module - Two For Coaching Lab
 * Import et analyse de fichiers FIT (Nolio, Garmin, Wahoo, etc.)
 */

// Types
export type {
  FitRecord,
  FitLap,
  FitSession,
  DetectedTestType,
  TestTypeDetection,
  BestEfforts,
  DriftAnalysis,
  FtpEstimate,
  TteObservation,
  ProtocolQuality,
  FitAnalysisResult,
  ObservedTestData,
  ProfileUpdatePreview,
  RunBestEfforts,
  PaceThresholdEstimate,
  VmaEstimate,
  RunTteObservation,
} from "./types";

// Parser
export { parseFitFile, validateFitFile } from "./parser";

// Best Efforts
export {
  calculateBestEfforts,
  calculateNormalizedPower,
  calculateVariabilityIndex,
  calculatePowerCV,
} from "./bestEfforts";

// Test Detector
export {
  detectTestType,
  getTFCLWeekSlot,
  formatTFCLSlot,
  detectRunTestType,
  getCAPWeekSlot,
  formatCAPSlot,
} from "./testDetector";
export type { TFCLWeekSlot, CAPWeekSlot } from "./testDetector";

// Metrics Calculator
export {
  estimateFtp,
  calculateTteObservation,
  calculateDriftAnalysis,
  evaluateProtocolQuality,
} from "./metricsCalculator";

// Running Best Efforts / Metrics Calculator
export { calculateRunBestEfforts, speedToPaceSecPerKm, speedToKmh } from "./runningBestEfforts";
export {
  estimatePaceThreshold,
  estimateVma,
  calculateRunTteObservation,
  evaluateRunProtocolQuality,
} from "./runningMetricsCalculator";

// Analyzer
export {
  analyzeFitSession,
  generateAnalysisSummary,
  formatTestType,
  calculateOverallConfidence,
} from "./analyzer";

// Running Economy Analyzer
export {
  analyzeRunningEconomy,
  isEligibleForRunningEconomy,
  type RunningEconomyFitResult,
  type RunningDriftAnalysis,
} from "./runningEconomyAnalyzer";
