#!/usr/bin/env bash
set -euo pipefail
# Explicit existing suite; no watch, retry, AI generation or service calls.
cd "$(dirname "$0")/../../.."
exec ./node_modules/.bin/vitest run \
  src/lib/v2/__tests__/calibrateVLamaxFromMLSS.test.ts \
  src/lib/v2/__tests__/criticalPowerModel.symmetricFtpBound.test.ts \
  src/lib/v2/__tests__/criticalPowerModel.raceSimWiring.test.ts \
  src/lib/v2/__tests__/maderMetabolicModel.test.ts \
  src/lib/v2/__tests__/maderMetabolicModel.glycogenDepletion.test.ts \
  src/lib/v2/__tests__/maderInverseFitJoint.test.ts \
  src/lib/v2/__tests__/fatmaxTFCL.mlssAnchoredFormula.test.ts \
  src/lib/v2/__tests__/runMLSSPredictor.test.ts \
  src/lib/v2/__tests__/runMLSSPredictorGuardFail.test.ts \
  src/lib/v2/__tests__/profilExpress.test.ts \
  src/lib/v2/__tests__/profilExpressFormulas.test.ts \
  src/lib/v2/__tests__/vlamaxCapEstimator.test.ts \
  src/lib/v2/__tests__/vlamaxCap.convergence.test.ts \
  src/lib/v2/__tests__/vlamaxCapAnchorCalibration.test.ts \
  src/lib/v2/__tests__/vlamaxRunV2Enhanced.test.ts \
  src/lib/v2/__tests__/vlamaxRunV2Enhanced.formulaIntegrity.test.ts \
  src/lib/v2/__tests__/unifiedLimiterDetection.test.ts \
  src/lib/v2/__tests__/literatureReferences.test.ts \
  src/lib/__tests__/vlamaxEffectif.test.ts \
  src/lib/__tests__/vlamaxResolver.labLockAndConfidence.test.ts \
  src/lib/__tests__/cpVlamaxContamination.test.ts \
  src/lib/__tests__/tteEffectif.test.ts \
  src/lib/__tests__/tteEffectifSportAware.test.ts \
  src/lib/__tests__/testingWeekSnapshotMerge.test.ts \
  src/lib/__tests__/runDurabilityProxy.test.ts \
  src/lib/__tests__/potentielPhysiologiqueEffectif.adapter.test.ts \
  src/lib/__tests__/potentielPhysiologiqueEffectifRich.test.ts \
  src/lib/zones/__tests__/deriveTrainingZones.test.ts \
  src/engines/diagnostic/__tests__/computeDiagnostic.test.ts \
  src/engines/plan/__tests__/planConfigBuilder.test.ts \
  src/engines/plan/__tests__/prepareTrainingPlanContext.test.ts \
  src/lib/coachingCompass/__tests__/computeCoachingCompass.fatmaxWprimeAxes.test.ts \
  src/components/__tests__/ExportTools.fatmaxLabel.test.ts \
  src/components/__tests__/ExportTools.thresholdPaceFallback.test.ts \
  src/qa/sports-plan-lab/__tests__/globalLimiterTransmission.test.ts
