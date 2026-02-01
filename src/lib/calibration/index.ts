/**
 * Calibration Layer Module
 * Two For Coaching Lab™
 */

export * from "./calibrationLayer";
export * from "./useCalibration";
export * from "./testCalibrationSection";
export {
  type CalibrationEvidence,
  type CalibrationSnapshot,
  type CalibrationResult as ContinuousCalibrationResult,
  type EvidenceSourceType,
  type EvidenceType,
  type ValidityStatus,
  type RecalibrationTrigger,
  CALIBRATION_WINDOW_DAYS,
  LOCK_PERIOD_WEEKS,
  computeEvidenceWeight,
  computeCalibrationDelta,
  produceCalibratedVLamax,
  checkRecalibrationTriggers,
  isProfileLocked,
  computeLockEndDate,
  computePacingConservatism,
} from "./vlamaxContinuous";
