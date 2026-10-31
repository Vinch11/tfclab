import {describe,expect,it} from 'vitest';
import {v3FullCatalogue,type V3Workout} from '../../../scripts/library-v3/catalogueRuntime';
import ledger from '../../../scripts/library-v3/v32SportingReviewLedger.json';
import {
 screenV32Catalogue,screenV32Source,v32SourceFingerprint,
} from '../../../scripts/library-v3/sportingQualification';
import {
 qualifyV32ForAthlete,type V32CoachIndividualReview,type V32IndividualInputs,
} from '../../../scripts/library-v3/qualifyForAthlete';

const byId=new Map(v3FullCatalogue.workouts.map(w=>[w.id,w]));
function context(w:V3Workout):V32IndividualInputs {
 const review:V32CoachIndividualReview={
  sourceId:w.id,athleteScoped:true,coachApproved:true,
  trainingLevel:'highly_trained',trainingLevelSource:'manual',
  currentPhase:w.phase[0],objective:'IRONMAN 70.3',
  recentLoad:'moderate',fatigue:'ready',
  injuryRisk:'cleared_by_coach_screen',
  checkedPrerequisites:[...w.prerequisites],
  checkedContraindications:[...w.contraindications],
  stopRuleExplained:true,equipmentAndEnvironmentConfirmed:true,
  raceSpecificContextConfirmed:true,testProtocolConfirmed:true,
  testEffortGuidanceConfirmed:true,cssPairedTestConfirmed:true,
  highStimulusHistoryConfirmed:true,runningImpactToleranceConfirmed:true,
  swimSupervisionConfirmed:true,sportLimitersReviewed:true,
 };
 return {review,calibration:{
   bikeFTPWatts:290,bikeLT1Watts:200,bikePMAWatts:380,bikeSprintReferenceWatts:800,
   runMLSSPaceSecondsPerKm:250,runLT1PaceSecondsPerKm:300,
   runVVO2PaceSecondsPerKm:205,runSprintPaceSecondsPerKm:140,
   swimPacesSecondsPer100m:{
     recovery:110,moderate_lt1:100,tempo:96,
     mlss:91,sub_threshold:95,vo2max:85,neuromuscular:70,
   },
   strengthLoadPerPath:Object.fromEntries(
    w.prescriptionContract.intensity.segments.filter(s=>s.role==='main')
     .map(s=>[s.path,{kind:'rpe' as const,value:6}])),
  },duration:{
    swimPacesSecondsPer100m:{
     recovery:110,moderate_lt1:100,tempo:96,
     mlss:91,sub_threshold:95,vo2max:85,neuromuscular:70,
    },
    strengthMeasuredSecondsPerRepetitionByPath:Object.fromEntries(
     w.prescriptionContract.duration.requiredInputs
      .filter(s=>s.startsWith('coach_measured_execution_seconds_per_repetition:'))
      .map(s=>[s.split(':')[1],4])),
    strengthCoachConfirmedSetupTransitionSeconds:0,
  }};
}
describe('V3.2 sporting source qualification — complete 400 audit',()=>{
 it('has EXACTLY 400 individually source-bound pre-reviews, no falsified approval',()=>{
  const all=screenV32Catalogue(v3FullCatalogue.workouts);
  expect(all).toHaveLength(400);
  expect(ledger.records).toHaveLength(400);
  expect(new Set(ledger.records.map(w=>w.id)).size).toBe(400);
  const recordById=new Map(ledger.records.map(r=>[r.id,r]));
  for(const q of all){
   const r=recordById.get(q.id);
   expect(r,q.id).toBeDefined();
   expect(q.sourceFingerprint).toBe(r!.sourceFingerprint);
   expect(q.sourceStatus).toBe(r!.sourceStatus);
   expect(q.sourceBlockers).toEqual(r!.sourceBlockers);
   expect(q.minimumRecoveryHours).toBe(r!.recoveryHours);
   expect(q.physiologicalIntent).toBe(r!.physiology.primaryIntent);
   expect(q.approvedForAthlete).toBe(false);
   expect(q.automatedReviewOnly).toBe(true);
   expect(r!.athleteApproved).toBe(false);
   expect(r!.reviewAuthority).toBe('automated_sport_screen_only');
  }
  const blocked=all.filter(x=>x.sourceStatus==='source_blocked').map(x=>x.id);
  expect(blocked).toEqual(['V3P_BIKE_024','V3P_SWIM_020','V3P_SWIM_083']);
 });
 it('classifies corrected threshold, mixed interval and force sources correctly',()=>{
  for(const id of ['V3P_BIKE_007','V3P_RUN_007','V3P_SWIM_068']){
   const w=byId.get(id)!;
   expect(w.primaryIntent).toBe('sub_threshold');
   expect(w.primaryDomain).toBe('sub_threshold');
  }
  const overUnder=byId.get('V3P_BIKE_009')!;
  expect(overUnder.primaryIntent).toBe('mixed_intensity');
  expect(screenV32Source(overUnder).sourceBlockers).toEqual([]);
  const copenhagen=byId.get('V3P_STRENGTH_016')!;
  expect(copenhagen.primaryIntent).toBe('strength_endurance');
  expect(copenhagen.minimumRecoveryHours).toBe(12);
  expect(copenhagen.blocks.some(b=>b.kind==='repeat')).toBe(true);
 });
 it('refuses every session without individual safety and clinical-context review',()=>{
  for(const w of v3FullCatalogue.workouts){
    const inputs=context(w);
    inputs.review={...inputs.review,coachApproved:false as true};
    const result=qualifyV32ForAthlete(w,inputs);
    expect(result.eligibleToSubmitToDet,w.id).toBe(false);
    expect(result.publishable).toBe(false);
    expect(result.blockingReasons).toContain('source_and_athlete_scoped_coach_approval_missing');
  }
 });
 it('checks a genuine reviewed bike endurance recipe and still requires full-plan validation',()=>{
  const w=byId.get('V3P_BIKE_002')!;
  const result=qualifyV32ForAthlete(w,context(w));
  expect(result.status).toBe('individual_candidate_requires_full_plan_validation');
  expect(result.exactDurationSeconds).toBeGreaterThan(0);
  expect(result.eligibleToSubmitToDet).toBe(true);
  expect(result.calendarValidationRequired).toBe(true);
  expect(result.publishable).toBe(false);
  expect(result.requiredPlanGates).toContain('prior_and_next_session_exact_recovery_hours');
 });
 it('refuses source mismatch even with valid-looking synthetic athlete evidence',()=>{
  const w=byId.get('V3P_SWIM_083')!;
  const result=qualifyV32ForAthlete(w,context(w));
  expect(result.status).toBe('source_blocked');
  expect(result.eligibleToSubmitToDet).toBe(false);
  expect(result.blockingReasons).toContain('source:swim_50m_sprint_not_proven_alactic');
 });
 it('refuses source-specific prerequisites, contraindications and test pairing',()=>{
  const test=byId.get('V3P_SWIM_091')!;
  const inputs=context(test);
  inputs.review={...inputs.review,cssPairedTestConfirmed:undefined,
    checkedPrerequisites:[],checkedContraindications:[]};
  const out=qualifyV32ForAthlete(test,inputs);
  expect(out.eligibleToSubmitToDet).toBe(false);
  expect(out.blockingReasons).toContain('css_requires_400m_and_200m_together_not_a_single_trial');
  expect(out.missing.some(x=>x.startsWith('prerequisite_not_approved:'))).toBe(true);
  expect(out.missing.some(x=>x.startsWith('contraindication_not_reviewed:'))).toBe(true);
 });
 it('refuses a 70.3 card misapplied to IM despite coach checkboxes',()=>{
  const w=byId.get('V3P_BIKE_012')!;
  const inputs=context(w);
  inputs.review={...inputs.review,objective:'Ironman'};
  const out=qualifyV32ForAthlete(w,inputs);
  expect(out.blockingReasons).toContain('race_specific_domain_objective_mismatch');
  expect(out.eligibleToSubmitToDet).toBe(false);
 });
 it('does not use cached fingerprints after recipe edits',()=>{
  const w=structuredClone(byId.get('V3P_BIKE_002')!);
  w.blocks[0]={...w.blocks[0],label:'tampered'};
  expect(v32SourceFingerprint(w)).not.toBe(ledger.records.find(r=>r.id===w.id)!.sourceFingerprint);
  const out=screenV32Source(w);
  expect(out.sourceStatus).toBe('source_blocked');
 });
});
