import {describe,it,expect} from 'vitest';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import {prepareGenerationContracts} from '@/lib/plan/prepareGenerationContracts';
import {assessPreparedGeneration} from '@/lib/plan/prevalidateTrainingPlan';
import {buildDetV3ContractFromCatalogue} from './v31-v3-catalogue';
import {constructDeterministicPlan} from './engine';
import {syntheticV3ReviewAnchors,syntheticV3SportingContext} from './v3-test-anchor-fixtures';

describe('DET V37 — reviewed timed strength reaches real deterministic selection',()=>{
 it('recognizes timeboxed force without bogus aerobic Z1 and retains separate sporting safeguards',()=>{
  const fixture=preparePrevalidationFixture('B-IM');
  const config={...fixture.planConfig,_outputFormat:'json' as const};
  const id='V3P_STRENGTH_101';
  const {contract,report}=buildDetV3ContractFromCatalogue([{
   id,objective:'IM',athleteLevel:'trained',athleteLevelSource:'manual',
   allPrerequisitesChecked:true,individualCoachApproval:true,
   preferReviewedV3:true,athleteAnchors:syntheticV3ReviewAnchors(),
   ...syntheticV3SportingContext(id),
  }]);
  expect(report.accepted.map(m=>m.id)).toEqual([id]);
  expect(report.accepted[0].durationMin[0]).toBeGreaterThan(0);
  expect(report.accepted[0].zones).toEqual([]);
  expect(report.accepted[0].mainZoneMax).toBe(0);
  const prep=prepareGenerationContracts(fixture.athleteData,config,{rotationSeed:0});
  contract.adapt(prep,config);
  const ready=assessPreparedGeneration(config,prep);
  expect(ready.weeks.some(w=>w.eligible.some(m=>m.id===id))).toBe(true);
  const result=constructDeterministicPlan(fixture.athleteData,config,
   {maxNodes:20000,maxMilliseconds:5000},contract);
  const chosen=result.trace.filter(t=>t.id===id);
  console.info('DET_V37_STRENGTH_TIMEBOX_REAL_SELECTION',JSON.stringify({
   constructed:result.technicallyConstructed,reason:result.reason,
   selected:chosen,blocking:result.issues.filter(x=>
    ['blocking','critical','error'].includes(x.severity)).map(x=>x.code).slice(0,20),
  }));
  expect(result.technicallyConstructed).toBe(true);
  expect(chosen.length).toBeGreaterThan(0);
  expect(chosen.every(t=>t.duration===report.accepted[0].durationMin[0])).toBe(true);
  expect(result.candidate!.weeks.flatMap(w=>w.sessions)
   .filter(s=>s.catalogId===id).every(s=>s.sport==='strength'&&s.zones?.length===0)).toBe(true);
  expect(result.humanReviewRequired).toBe(true);
  expect(result.sportingRelevance).toBe('not_attested');
 });
 it('still rejects timeboxed strength when the coach has not verified load/RPE',()=>{
  const id='V3P_STRENGTH_101';
  const wrong=buildDetV3ContractFromCatalogue([{
   id,objective:'IM',athleteLevel:'trained',athleteLevelSource:'manual',
   allPrerequisitesChecked:true,individualCoachApproval:true,
   athleteAnchors:{},...syntheticV3SportingContext(id),
  }]);
  expect(wrong.report.accepted).toHaveLength(0);
  expect(wrong.report.rejected.find(r=>r.id===id)?.reason).toContain('coach_verified_rpe_and_load');
 });
});