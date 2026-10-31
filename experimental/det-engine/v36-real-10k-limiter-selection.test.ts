import {describe,it,expect,vi,afterEach} from 'vitest';
import {planningCases,preparePlanningCaseContext} from '@/qa/sports-plan-lab/planningMatrix';
import {constructDeterministicPlan} from './engine';
import {buildDetV3ContractFromCatalogue} from './v31-v3-catalogue';
import {syntheticV3ReviewAnchors,syntheticV3SportingContext} from './v3-test-anchor-fixtures';
import {v3FullCatalogue} from '../../scripts/library-v3/catalogueRuntime';

const runnerIds=[
 'V3P_RUN_001','V3P_RUN_002','V3P_RUN_013','V3P_RUN_021',
 'V3P_RUN_023','V3P_RUN_024','V3P_RUN_025','V3P_RUN_026',
 'V3P_RUN_027','V3P_RUN_028','V3P_RUN_029',
];
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
describe('V3.6 — real DET 10K athlete-scoped V3 limiter selection',()=>{
 it('constructs only with admitted, goal/phase/limiter-matched sources and no release attestation',()=>{
  vi.useFakeTimers({toFake:['Date']});
  vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
  const spec=planningCases().find(c=>c.objective==='10K'&&c.level==='light'&&
    c.ambition==='finisher'&&c.load==='unknown')!;
  const {prepared}=preparePlanningCaseContext({...spec,constraints:'unrestricted',intermediate:false});
  const config={...prepared.planConfig,identifiedLimitersRaw:['running_impact_tolerance']};
  const reviews=runnerIds.map(id=>({
   id,objective:'10K',athleteLevel:'light' as const,athleteLevelSource:'manual' as const,
   allPrerequisitesChecked:true as const,individualCoachApproval:true as const,
   preferReviewedV3:true as const,athleteAnchors:syntheticV3ReviewAnchors(),
   ...syntheticV3SportingContext(id),
  }));
  const {report,contract}=buildDetV3ContractFromCatalogue(reviews);
  expect(report.accepted).toHaveLength(runnerIds.length);
  const actual=constructDeterministicPlan(prepared.athleteData,config,
   {maxNodes:20000,maxMilliseconds:5000},contract);
  const admitted=new Set(report.accepted.map(x=>x.id));
  const chosen=actual.trace.filter(t=>admitted.has(t.id));
  console.info('DET_V36_10K_INDIVIDUAL_LIMITER_SELECTION',JSON.stringify({
   technical:actual.technicallyConstructed,constraintsSatisfied:actual.constraintsSatisfied,
   selectedCount:chosen.length,sources:chosen.map(t=>({id:t.id,week:t.week,day:t.day})),
   blockers:actual.issues.filter(i=>['blocking','error','critical'].includes(i.severity)).map(i=>i.code),
  }));
  expect(actual.technicallyConstructed).toBe(true);
  expect(chosen.length).toBeGreaterThan(0);
  expect(chosen.every(t=>v3FullCatalogue.workouts.some(w=>
    w.id===t.id&&w.sport==='run'&&w.prescription.physiologicalIntent.limiterKeys
      .includes('running_impact_tolerance')))).toBe(true);
  expect(actual.candidate?.weeks.flatMap(w=>w.sessions).filter(s=>admitted.has(s.catalogId??''))
    .every(s=>s.sport==='run'&&typeof s.durationMin==='number'&&s.durationMin>0)).toBe(true);
  expect(actual.humanReviewRequired).toBe(true);
  expect(actual.sportingRelevance).toBe('not_attested');
 });
});
