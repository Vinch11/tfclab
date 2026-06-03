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
export { detectTestType, getTFCLWeekSlot, formatTFCLSlot } from "./testDetector";
export type { TFCLWeekSlot } from "./testDetector";

// Metrics Calculator
export {
  estimateFtp,
  calculateTteObservation,
  calculateDriftAnalysis,
  evaluateProtocolQuality,
} from "./metricsCalculator";

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
