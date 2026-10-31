/**
 * Synthetic-only qualification fixture. NO actual athlete or coaching attestation.
 * Each review is deliberately bound to one source fingerprint and fake athlete ID.
 */
import { lookupV3Recipe } from '../v3EngineBridge';
import { v32SourceFingerprint } from '../../../scripts/library-v3/sportingQualification';
import type { V32IndividualInputs } from '../../../scripts/library-v3/qualifyForAthlete';

export function syntheticV32BikeInputs(id:string):V32IndividualInputs {
 const workout=lookupV3Recipe(id);
 if(!workout||workout.sport!=='bike')throw Error('synthetic_fixture_requires_bike_source:'+id);
 return {
  athleteId:'synthetic-athlete-A',
  review:{
   sourceId:id,athleteId:'synthetic-athlete-A',
   sourceFingerprint:v32SourceFingerprint(workout),
   athleteScoped:true,coachApproved:true,
   trainingLevel:'highly_trained',trainingLevelSource:'manual',
   currentPhase:workout.phase[0],objective:'IRONMAN 70.3',
   recentLoad:'moderate',fatigue:'ready',
   injuryRisk:'cleared_by_coach_screen',
   checkedPrerequisites:[...workout.prerequisites],
   checkedContraindications:[...workout.contraindications],
   stopRuleExplained:true,equipmentAndEnvironmentConfirmed:true,
   highStimulusHistoryConfirmed:true, sportLimitersReviewed:true,
  },
  calibration:{
   bikeFTPWatts:290,bikeLT1Watts:200,bikePMAWatts:380,bikeSprintReferenceWatts:800,
  },
  duration:{},
 };
}
