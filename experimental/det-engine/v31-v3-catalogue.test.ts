import { describe,it,expect,vi,afterEach } from 'vitest';
import { v3FullCatalogue, evaluateV3Workout } from '../../scripts/library-v3/catalogueRuntime';
import { buildDetV3ContractFromCatalogue, type V3ReviewedSettings } from './v31-v3-catalogue';
import { evaluateRepairSportingEquivalence } from '../../supabase/functions/_shared/repairSportingEquivalence';
import { preparePrevalidationFixture } from '@/qa/sports-plan-lab/prevalidationFixtures';
import { prepareGenerationContracts } from '@/lib/plan/prepareGenerationContracts';
import { constructDeterministicPlan } from './engine';

const review:V3ReviewedSettings={
  id:'V3P_BIKE_002',athleteLevel:'trained',athleteLevelSource:'manual',
  objective:'IM',allPrerequisitesChecked:true,individualCoachApproval:true,
};
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('V31 — actual 400-source catalogue ingestion to DET-ENGINE',()=>{
 it('contains exactly 100 candidates in each sport, with no unreviewed admissibility',()=>{
   const result=buildDetV3ContractFromCatalogue([]);
   expect(v3FullCatalogue.workouts).toHaveLength(400);
   expect(result.sourceCounts).toEqual({bike:100,run:100,swim:100,strength:100});
   expect(result.auditErrors).toEqual([]);
   expect(result.report.sourceCount).toBe(400);
   expect(result.report.accepted).toHaveLength(0);
   expect(result.report.rejected).toHaveLength(400);
   expect(result.report.rejected.every(r=>r.reason==='individual_coach_review_missing')).toBe(true);
 });
 it('maps an actual reviewed bike recipe into normalized race-goal contract',()=>{
   const r=buildDetV3ContractFromCatalogue([review]);
   expect(r.report.accepted).toHaveLength(1);
   expect(r.report.rejected).toHaveLength(399);
   const admitted=r.report.accepted[0];
   expect(admitted.id).toBe(review.id);
   expect(admitted.goals).toEqual(['ironman']);
   expect(admitted.durationMin).toEqual([80,80]);
   expect(evaluateRepairSportingEquivalence(null,admitted,{
     objective:'IM',phase:'base',weekType:'load',operation:'insertion',
   }).compatible).toBe(true);
   expect(evaluateRepairSportingEquivalence(null,admitted,{
     objective:'70.3',phase:'base',weekType:'load',operation:'insertion',
   }).compatible).toBe(false);
 });
 it('preserves the real 400-card source data while respecting bounded modifications',()=>{
   const settings:V3ReviewedSettings={...review,overrides:{'0.seconds':900}};
   const r=buildDetV3ContractFromCatalogue([settings]);
   expect(r.report.accepted).toHaveLength(1);
   expect(r.report.accepted[0].durationMin).toEqual([83,83]);
   expect(r.report.accepted[0].structure).toContain('900s');
   const original=v3FullCatalogue.workouts.find(w=>w.id===review.id)!;
   expect(evaluateV3Workout(original).minutes).toBe(80);
   expect(original.blocks[0].kind).toBe('time');
   if(original.blocks[0].kind==='time')expect(original.blocks[0].seconds!.base).toBe(720);
 });
 it('fits duration without padding or modifying the high-intensity portion by default',()=>{
   const r=buildDetV3ContractFromCatalogue([{...review,targetDurationMin:83}]);
   expect(r.report.accepted).toHaveLength(1);
   expect(r.report.accepted[0].durationMin).toEqual([83,83]);
 });
 it('refuses unsupported override paths, out-of-range edits, missing swimming data and estimated strength',()=>{
   for(const override of [{'x.seconds':30},{'0.seconds':999999}]) {
     const r=buildDetV3ContractFromCatalogue([{...review,overrides:override}]);
     expect(r.report.accepted).toHaveLength(0);
     expect(r.report.rejected.find(x=>x.id===review.id)?.reason).toContain('v3_');
   }
   const s=buildDetV3ContractFromCatalogue([{...review,id:'V3P_SWIM_001'}]);
   expect(s.report.accepted).toHaveLength(0);
   expect(s.report.rejected.find(x=>x.id==='V3P_SWIM_001')?.reason).toContain('v3_timing_unresolved');
   const strength=buildDetV3ContractFromCatalogue([{...review,id:'V3P_STRENGTH_001'}]);
   expect(strength.report.accepted).toHaveLength(0);
 });
 it('rejects unrecognized IDs, without turning a catalogue review into a scientific signoff',()=>{
   expect(()=>buildDetV3ContractFromCatalogue([{...review,id:'V3P_BIKE_999'}]))
     .toThrow('v3_unknown_reviewed_recipe');
   const r=buildDetV3ContractFromCatalogue([review]);
   expect(r.report.accepted[0].tags).toContain('v3-deterministic-candidate');
   expect(v3FullCatalogue.workouts.find(w=>w.id===review.id)!.automaticSelection).toBe(false);
 });
 it('pipes a real catalogue recipe to DET preparation but keeps plan approval blocked',()=>{
   vi.stubGlobal('fetch',()=>{throw Error('NETWORK_FORBIDDEN');});
   const fixture=preparePrevalidationFixture('B-IM');
   const p=prepareGenerationContracts(fixture.athleteData,{
     ...fixture.planConfig,_outputFormat:'json'},{rotationSeed:0});
   const {contract,report}=buildDetV3ContractFromCatalogue([review]);
   expect(p.chunkRepairCatalogs.flat().some(w=>w.id===review.id)).toBe(false);
   contract.adapt(p,{...fixture.planConfig,_outputFormat:'json'});
   expect(p.chunkRepairCatalogs.flat().some(w=>w.id===review.id)).toBe(true);
   expect(report.accepted).toHaveLength(1);
   const result=constructDeterministicPlan(fixture.athleteData,{
     ...fixture.planConfig,_outputFormat:'json'},{maxNodes:2000,maxMilliseconds:1000},contract);
   expect(result.sportingRelevance).toBe('not_attested');
   expect(result.humanReviewRequired).toBe(true);
 });
});