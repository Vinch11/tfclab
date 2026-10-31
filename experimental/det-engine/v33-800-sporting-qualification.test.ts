import {describe,it,expect} from 'vitest';
import {v3FullCatalogue} from '../../scripts/library-v3/catalogueRuntime';
import {
  auditV3SportingRegistry,sourceV3SportingStatus,fingerprintV3SportingSource,
  qualifyV3IndividualSportingSource,
} from '../../scripts/library-v3/sportingQualification800';
import {buildDetV3ContractFromCatalogue} from './v31-v3-catalogue';
import {syntheticV3SportingContext,syntheticV3ReviewAnchors} from './v3-test-anchor-fixtures';
const find=(id:string)=>v3FullCatalogue.workouts.find(w=>w.id===id)!;
describe('V3.3 — all 800 actual source sporting qualifications',()=>{
 it('has 800 updated source fingerprints, 800 source-screened candidates and no unfixed unsafe claims',()=>{
  expect(auditV3SportingRegistry()).toEqual([]);
  expect(v3FullCatalogue.workouts).toHaveLength(800);
  const records=v3FullCatalogue.workouts.map(w=>sourceV3SportingStatus(w.id)!);
  expect(records).toHaveLength(800);
  expect(new Set(records.map(r=>r.id)).size).toBe(800);
  expect(records.filter(r=>r.sourceStatus==='source_prequalified_pending_individual_review')).toHaveLength(800);
  expect(records.filter(r=>r.sourceStatus==='source_blocked')).toHaveLength(0);
  expect(records.every(r=>r.humanSportingApproved===false &&
    r.scientificSessionValidated===false && r.athleteApproved===false)).toBe(true);
 });
 it('refuses any historic or new recipe with no athlete-scoped sports review',()=>{
  const old=find('V3P_BIKE_002'),next=find('V3P_SWIM_131');
  for(const w of [old,next]){
   const d=qualifyV3IndividualSportingSource(w,undefined,undefined);
   expect(d.allowedToSubmitToDet).toBe(false);
   expect(d.blockingReasons).toContain('athlete_scoped_review_identity_missing_or_mismatched');
   expect(d.approvedForPublication).toBe(false);
   const result=buildDetV3ContractFromCatalogue([{
    id:w.id,objective:'IM',athleteLevel:'trained',athleteLevelSource:'manual',
    individualCoachApproval:true,allPrerequisitesChecked:true,athleteAnchors:syntheticV3ReviewAnchors(),
   }]);
   expect(result.report.accepted).toHaveLength(0);
   expect(result.report.rejected.find(r=>r.id===w.id)?.reason).toContain('v3_sporting_gate_refused');
  }
 });
 it('qualifies redesigned source only after re-specified stimulus, and never accepts unmeasured or >20-second swim sprint',()=>{
  const bike=find('V3P_BIKE_024');
  expect(bike.primaryIntent).toBe('technique_economy');
  expect(bike.primaryDomain).toBe('tempo');
  const technique=find('V3P_SWIM_020');
  expect(technique.primaryIntent).toBe('technique_economy');
  expect(technique.primaryDomain).toBe('moderate_lt1');
  const sprint=find('V3P_SWIM_083');
  const ctx=syntheticV3SportingContext(sprint.id);
  expect(sprint.primaryDomain).toBe('neuromuscular');
  expect(sprint.blocks.some(x=>x.kind==='repeat'&&
    x.steps.some(y=>y.kind==='distance'&&y.meters?.base===25))).toBe(true);
  const review={id:sprint.id,objective:'IM',athleteLevel:'trained' as const,
    athleteLevelSource:'manual' as const,individualCoachApproval:true as const,
    allPrerequisitesChecked:true as const,...ctx};
  const unmeasured=buildDetV3ContractFromCatalogue([{...review,athleteAnchors:{
    ...syntheticV3ReviewAnchors(),swimDomainPacesSecPer100m:undefined,
  }}]);
  expect(unmeasured.report.accepted).toHaveLength(0);
  expect(unmeasured.report.rejected.find(x=>x.id===sprint.id)?.reason)
    .toContain('v3_sprint_25m_duration_over_20s_or_unmeasured');
  const tooSlow=buildDetV3ContractFromCatalogue([{
    ...review,athleteAnchors:{
      ...syntheticV3ReviewAnchors(),
      swimDomainPacesSecPer100m:{...syntheticV3ReviewAnchors().swimDomainPacesSecPer100m,neuromuscular:90},
    },
  }]);
  expect(tooSlow.report.accepted).toHaveLength(0);
  expect(tooSlow.report.rejected.find(x=>x.id===sprint.id)?.reason)
    .toContain('v3_sprint_25m_duration_over_20s_or_unmeasured');
 });
 it('rejects source changes and historical source-status tampering',()=>{
  const w=find('V3P_BIKE_002');
  const changed=structuredClone(w);
  changed.blocks[0].label='Different prescription';
  expect(fingerprintV3SportingSource(changed)).not.toBe(fingerprintV3SportingSource(w));
  expect(auditV3SportingRegistry(v3FullCatalogue.workouts.map(x=>x.id===w.id?changed:x)))
   .toContain(w.id+':SPORTING_SOURCE_FINGERPRINT_DRIFT');
  const ctx=syntheticV3SportingContext(w.id);
  const r=qualifyV3IndividualSportingSource(changed,
    'sportingReview' in ctx ? ctx.sportingReview : undefined,
    'expectedAthleteId' in ctx ? ctx.expectedAthleteId : undefined);
  expect(r.allowedToSubmitToDet).toBe(false);
 });
 it('refuses unknown fatigue, uncleared injury, missing training load or ignored contraindications',()=>{
  const w=find('V3P_RUN_131'),ctx=syntheticV3SportingContext(w.id);
  if(!('sportingReview' in ctx)||!('expectedAthleteId' in ctx))throw Error('missing QA fixture');
  const base=ctx.sportingReview;
  for(const invalid of [
   {...base,fatigue:'unknown' as const},
   {...base,injuryScreen:'unknown' as const},
   {...base,recentLoad:'unknown' as const},
   {...base,checkedContraindications:[]},
   {...base,athleteId:'wrong-athlete'},
  ]){
   const got=qualifyV3IndividualSportingSource(w,invalid,ctx.expectedAthleteId);
   expect(got.allowedToSubmitToDet).toBe(false);
   expect(got.blockingReasons.length).toBeGreaterThan(0);
  }
 });
 it('preserves subthreshold distinct from true MLSS and refuses unmapped mixed stimulus',()=>{
  const sub=find('V3P_BIKE_141');
  expect(sub.primaryIntent).toBe('sub_threshold');
  const ctx=syntheticV3SportingContext(sub.id);
  const accepted=buildDetV3ContractFromCatalogue([{
   id:sub.id,objective:'IM',athleteLevel:'trained',athleteLevelSource:'manual',
   individualCoachApproval:true,allPrerequisitesChecked:true,
   athleteAnchors:syntheticV3ReviewAnchors(),...ctx,
  }]);
  expect(accepted.report.accepted).toHaveLength(1);
  expect(accepted.report.accepted[0].tags).toContain('v3-subthreshold-not-equivalent-to-mlss');
  const mixed=find('V3P_BIKE_009');
  const mctx=syntheticV3SportingContext(mixed.id);
  const refused=buildDetV3ContractFromCatalogue([{
   id:mixed.id,objective:'IM',athleteLevel:'highly_trained',athleteLevelSource:'manual',
   individualCoachApproval:true,allPrerequisitesChecked:true,
   athleteAnchors:syntheticV3ReviewAnchors(),...mctx,
  }]);
  expect(refused.report.accepted).toHaveLength(0);
  expect(refused.report.rejected.find(x=>x.id===mixed.id)?.reason)
    .toBe('mixed_intensity_requires_distinct_det_intent_family');
 });
 it('accepts as candidate only with complete athlete-scoped proof and never publishes',()=>{
  const w=find('V3P_STRENGTH_101'),ctx=syntheticV3SportingContext(w.id);
  if(!('sportingReview' in ctx)||!('expectedAthleteId' in ctx))throw Error('missing QA fixture');
  const decision=qualifyV3IndividualSportingSource(w,ctx.sportingReview,ctx.expectedAthleteId);
  expect(decision.allowedToSubmitToDet).toBe(true);
  expect(decision.status).toBe('individual_candidate_requires_full_plan_validation');
  expect(decision.approvedForPublication).toBe(false);
  expect(decision.requiredPlanChecks).toContain('source_end_to_start_recovery_by_confirmed_session_times');
 });
});
