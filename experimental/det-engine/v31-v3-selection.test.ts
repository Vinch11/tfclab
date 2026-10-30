import { describe, it, expect, vi, afterEach } from 'vitest';
import { preparePlanningCaseContext, planningCases } from '@/qa/sports-plan-lab/planningMatrix';
import { preparePrevalidationFixture } from '@/qa/sports-plan-lab/prevalidationFixtures';
import { prepareGenerationContracts } from '@/lib/plan/prepareGenerationContracts';
import { assessPreparedGeneration } from '@/lib/plan/prevalidateTrainingPlan';
import { buildDetV3ContractFromCatalogue, type V3ReviewedSettings } from './v31-v3-catalogue';
import { constructDeterministicPlan } from './engine';

const runnerIds=[
  'V3P_RUN_001', 'V3P_RUN_002', 'V3P_RUN_013', 'V3P_RUN_021',
  'V3P_RUN_023', 'V3P_RUN_024', 'V3P_RUN_025', 'V3P_RUN_026',
  'V3P_RUN_027', 'V3P_RUN_028', 'V3P_RUN_029',
] as const;
const makeReview=(id:string,objective:string):V3ReviewedSettings=>({
  id,objective,athleteLevel:'light',athleteLevelSource:'manual',
  allPrerequisitesChecked:true,individualCoachApproval:true,
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
describe('DET V31 — actual deterministic selection, not mere catalogue visibility',()=>{
 it('selects coach-reviewed V3 in a real 10K deterministic search without waiver of validation',()=>{
  vi.useFakeTimers({toFake:['Date']});
  vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
  const network=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
  const spec=planningCases().find(c=>c.objective==='10K'&&c.level==='light'&&
    c.ambition==='finisher'&&c.load==='unknown')!;
  const {prepared}=preparePlanningCaseContext({...spec,constraints:'unrestricted',intermediate:false});
  const reviews=runnerIds.map(id=>makeReview(id,'10K'));
  const {contract,report}=buildDetV3ContractFromCatalogue(reviews);
  const admittedIds=new Set(report.accepted.map(w=>w.id));
  expect(admittedIds.size).toBeGreaterThan(5);
  const before=constructDeterministicPlan(prepared.athleteData,prepared.planConfig);
  expect(before.technicallyConstructed).toBe(true);
  expect(before.trace.every(t=>!admittedIds.has(t.id))).toBe(true);
  const actual=constructDeterministicPlan(prepared.athleteData,prepared.planConfig,
    {maxNodes:20000,maxMilliseconds:5000},contract);
  expect(actual.technicallyConstructed).toBe(true);
  const selected=actual.trace.filter(t=>admittedIds.has(t.id));
  console.info('DET_V31_SELECTION_10K',JSON.stringify({status:actual.status,reason:actual.reason,
    technicallyConstructed:actual.technicallyConstructed,constraintsSatisfied:actual.constraintsSatisfied,
    candidateCount:report.accepted.length,selectedV3:selected.map(t=>({id:t.id,week:t.week,day:t.day,duration:t.duration})),
    blockingIssues:actual.issues.filter(i=>['blocking','error','critical'].includes(i.severity)).map(i=>i.code)}));
  expect(selected.length).toBeGreaterThan(0);
  expect(selected.every(t=>t.duration===report.accepted.find(w=>w.id===t.id)!.durationMin[0])).toBe(true);
  expect(actual.candidate!.weeks.flatMap(w=>w.sessions)
    .filter(s=>admittedIds.has(s.catalogId??'')).every(s=>s.details&&s.durationMin&&s.zones?.length)).toBe(true);
  expect(actual.issues.some(i=>i.code==='experimental_contract_requires_review')).toBe(true);
  expect(actual.humanReviewRequired).toBe(true);
  expect(actual.sportingRelevance).toBe('not_attested');
  expect(network).not.toHaveBeenCalled();
 });
 it('tests triathlon 70.3 and Ironman prevalidation separately without upgrading a rejected plan',()=>{
  vi.stubGlobal('fetch',()=>{throw Error('NETWORK_FORBIDDEN');});
  for(const [fixtureId,objective] of [['B-70.3','703'],['B-IM','IM']] as const){
   const fixture=preparePrevalidationFixture(fixtureId);
   const {contract,report}=buildDetV3ContractFromCatalogue([
    makeReview('V3P_BIKE_001',objective),
    makeReview('V3P_BIKE_002',objective),
    makeReview('V3P_RUN_001',objective),
    makeReview('V3P_RUN_002',objective),
   ]);
   expect(report.accepted.length).toBe(4);
   const preparation=prepareGenerationContracts(fixture.athleteData,
     {...fixture.planConfig,_outputFormat:'json'}, {rotationSeed:0});
   contract.adapt(preparation,{...fixture.planConfig,_outputFormat:'json'});
   const prevalidation=assessPreparedGeneration({...fixture.planConfig,_outputFormat:'json'},preparation);
   const eligible=prevalidation.weeks.flatMap(w=>w.eligible)
     .filter(c=>c.id.startsWith('V3P_'));
   expect(eligible.length).toBeGreaterThan(0);
   const out=constructDeterministicPlan(fixture.athleteData,
     {...fixture.planConfig,_outputFormat:'json'}, {maxNodes:2500,maxMilliseconds:1500},contract);
   console.info('DET_V31_TRIATHLON',JSON.stringify({fixture:fixtureId,objective,
     prevalidationStatus:prevalidation.status,prevalidationV3Eligible:eligible.length,
     prevalidationBlocking:prevalidation.issues.filter(i=>i.severity==='blocking').map(i=>i.code),
     engineStatus:out.status,engineReason:out.reason,technicallyConstructed:out.technicallyConstructed,
     constraintsSatisfied:out.constraintsSatisfied,selectedV3:out.trace.filter(t=>t.id.startsWith('V3P_')).map(t=>t.id)}));
   expect(out.humanReviewRequired).toBe(true);
   expect(out.sportingRelevance).toBe('not_attested');
   expect(out.issues.some(i=>i.code==='experimental_contract_requires_review') ||
          out.reason==='existing_prevalidation_blocked').toBe(true);
   if(out.reason)expect(out.status).toBe('refused');
   if(out.technicallyConstructed)expect(out.candidate?.weeks.length).toBe(fixture.planConfig.weeksAvailable);
  }
 });
});