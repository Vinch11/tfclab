/** Synthetic anchors exclusively for isolated test fixtures. NEVER real athlete defaults. */
import type { V3AthleteAnchors } from '../../scripts/library-v3/resolveV3Intensity';
export const SYNTHETIC_V3_ANCHORS:V3AthleteAnchors={
  bikeFtpWatts:300,
  bikePmaWatts:390,
  bikeSprintPowerRangeWatts:[550,850],
  runThresholdPaceSecPerKm:240,
  runVvo2SpeedMps:5.0,
  runSprintSpeedRangeMps:[5.1,7.0],
  swimDomainPacesSecPer100m:{
    recovery:120,moderate_lt1:110,tempo:103,im_pace:108,
    '703_pace':102,marathon_pace:103,sub_threshold:98,semi_pace:98,
    mlss:95,vo2max:88,neuromuscular:84,
  },
  coachValidatedStrengthLoadAndRpe:true,
};
/** Explicitly distinguish synthetic tests from measured athlete data. */
export const syntheticV3ReviewAnchors=()=>structuredClone(SYNTHETIC_V3_ANCHORS);

/** Test-only individual source review, never used by a production prescription path. */
import {v3FullCatalogue} from "../../scripts/library-v3/catalogueRuntime";
import {fingerprintV3SportingSource, type V3IndividualSportingEvidence} from "../../scripts/library-v3/sportingQualification800";
import {buildDetV3ContractFromCatalogue, type V3ReviewedSettings} from "./v31-v3-catalogue";
import type {V3BaseBrickReview} from "./v31-v3-brick";
import type {V32SpecificBrickReview} from "./v32-v3-specific-bricks";
import type {V34SafeBrickReview} from "./v34-v3-low-run-bricks";
const SYNTHETIC_ATHLETE_ID="synthetic-qa-v3-athlete-001";
export function syntheticV3SportingContext(id:string):
  {expectedAthleteId:string,sportingReview:V3IndividualSportingEvidence}|{} {
 const w=v3FullCatalogue.workouts.find(x=>x.id===id);
 if(!w)return {};
 return {
  expectedAthleteId:SYNTHETIC_ATHLETE_ID,
  sportingReview:{
   athleteId:SYNTHETIC_ATHLETE_ID,
   sourceFingerprint:fingerprintV3SportingSource(w),
   coachReviewedSource:true as const,
   currentPhase:w.phase[0],
   recentLoad:"moderate" as const,
   fatigue:"ready" as const,
   injuryScreen:"cleared_by_coach" as const,
   checkedPrerequisites:[...w.prerequisites],
   checkedContraindications:[...w.contraindications],
   stopRuleExplained:true as const,
   environmentAndEquipmentConfirmed:true as const,
   limiterAndSportingGoalReviewed:true as const,
   trainingLoadCompatible:true as const,
   recoveryContextReviewed:true as const,
   highIntensityHistoryConfirmed:true as const,
   runningImpactToleranceConfirmed:true as const,
   swimmingSafetyConfirmed:true as const,
   racePaceGoalConfirmed:true as const,
   testProtocolConfirmed:true as const,
  },
 };
}
/** Synthetic ONLY. Never use as a source of real coach approval. */
export function buildSyntheticDetV3ContractFromCatalogue(
 reviews:readonly V3ReviewedSettings[],
 brickReviews:readonly V3BaseBrickReview[]=[],
 specificBrickReviews:readonly V32SpecificBrickReview[]=[],
 lowRunBrickReviews:readonly V34SafeBrickReview[]=[],
) {
 return buildDetV3ContractFromCatalogue(
   reviews.map(r=>({...syntheticV3SportingContext(r.id),...r})),
   brickReviews,specificBrickReviews,lowRunBrickReviews);
}
