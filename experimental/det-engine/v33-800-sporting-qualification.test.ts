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
 it('has 800 source fingerprints and 797 prequalified candidates / three explicit unsafe-source refusals',()=>{
  expect(auditV3SportingRegistry()).toEqual([]);
  expect(v3FullCatalogue.workouts).toHaveLength(800);
  const records=v3FullCatalogue.workouts.map(w=>sourceV3SportingStatus(w.id)!);
  expect(records).toHaveLength(800);
  expect(new Set(records.map(r=>r.id)).size).toBe(800);
  expect(records.filter(r=>r.sourceStatus==='source_prequalified_pending_individual_review')).toHaveLength(797);
  expect(records.filter(r=>r.sourceStatus==='source_blocked').map(r=>r.id).sort())
    .toEqual(['V3P_BIKE_024','V3P_SWIM_020','V3P_SWIM_083']);
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
 it('does not permit a known unsafe 50m alactic claim despite complete synthetic approval',()=>{
  const id='V3P_SWIM_083',w=find(id);
  const ctx=syntheticV3SportingContext(id);
  const r=qualifyV3IndividualSportingSource(w,
    'sportingReview' in ctx ? ctx.sportingReview : undefined,
    'expectedAthleteId' in ctx ? ctx.expectedAthleteId : undefined);
  expect(r.allowedToSubmitToDet).toBe(false);
  expect(r.blockingReasons.some(x=>x.startsWith('sporting_source_blocked:'))).toBe(true);
  expect(buildDetV3ContractFromCatalogue([{
   id,objective:'IM',athleteLevel:'trained',athleteLevelSource:'manual',
   individualCoachApproval:true,allPrerequisitesChecked:true,
   athleteAnchors:syntheticV3ReviewAnchors(),...ctx,
  }]).report.accepted).toHaveLength(0);
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
   id:mixed.id,objective:'IM',athleteLevel:'trained',athleteLevelSource:'manual',
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
