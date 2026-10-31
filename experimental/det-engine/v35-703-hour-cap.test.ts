import {buildSyntheticDetV3ContractFromCatalogue as buildDetV3ContractFromCatalogue} from "./v3-test-anchor-fixtures";
import {describe,it,expect,vi,afterEach} from 'vitest';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import { type V3ReviewedSettings } from './v31-v3-catalogue';
import {V34_SAFE_RUN_BRICKS} from './v34-v3-low-run-bricks';
import {V32_703_BRICK_BLUEPRINTS} from './v32-v3-specific-bricks';
import {V3_BASE_BRICK_ID} from './v31-v3-brick';
import {constructDeterministicPlan} from './engine';
import {syntheticV3ReviewAnchors} from "./v3-test-anchor-fixtures";

const review=(id:string,targetDurationMin?:number):V3ReviewedSettings=>({
 id,objective:'703',athleteLevel:'trained',athleteLevelSource:'manual',
 allPrerequisitesChecked:true,individualCoachApproval:true,
 athleteAnchors:syntheticV3ReviewAnchors(),
 ...(targetDurationMin===undefined?{}:{targetDurationMin}),
});

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('DET V35 — coach availability is a hard construction cap when opted in',()=>{
 it('never returns a constructed 70.3 candidate above its explicit 10h/week',()=>{
  vi.stubGlobal('fetch',()=>{throw Error('NETWORK_FORBIDDEN');});
  const fixture=preparePrevalidationFixture('B-70.3');
  const cfg={...fixture.planConfig,_outputFormat:'json' as const};
  expect(cfg.weeklyHours).toBe(10);
  const sources=[
    review('V3P_BIKE_002',65),review('V3P_BIKE_017'),
    review('V3P_BIKE_090'),review('V3P_BIKE_057'),
    review('V3P_BIKE_085'),review('V3P_BIKE_089'),
    review('V3P_BIKE_016',139),
    review('V3P_RUN_001'),review('V3P_RUN_041'),
  ];
  const {contract}=buildDetV3ContractFromCatalogue(sources,[{
    id:V3_BASE_BRICK_ID,objective:'703',individualCoachApproval:true,
    transitionSeconds:300,preferReviewedV3:true,
  }],V32_703_BRICK_BLUEPRINTS.map(b=>({
    id:b.id,objective:'703',individualCoachApproval:true,
    transitionSeconds:b.transitionSeconds,preferReviewedV3:true,
  })),V34_SAFE_RUN_BRICKS.map(b=>({
    id:b.id,objective:'703',individualCoachApproval:true,
    transitionSeconds:b.transitionSeconds,preferReviewedV3:true,
  })));
  const current=constructDeterministicPlan(fixture.athleteData,cfg,
    {maxNodes:4000,maxMilliseconds:2500},contract);
  const capped=constructDeterministicPlan(fixture.athleteData,cfg,
    {maxNodes:7000,maxMilliseconds:3500},{...contract,enforceWeeklyHoursCap:true});
  const weekly=(out:typeof capped)=>out.candidate?.weeks.map(w=>({
    week:w.weekNumber,minutes:w.sessions.filter(s=>!s.isRest)
      .reduce((n,s)=>n+(s.durationMin??0),0),
  }))??[];
  const oldWeeks=weekly(current),newWeeks=weekly(capped);
  const minuteIssue=capped.issues.find(i=>i.code==='v35_bike_only_volume_feasibility');
  const minuteReport=minuteIssue?.message?JSON.parse(minuteIssue.message):null;
  console.info('DET_V35_703_HARD_WEEKLY_HOURS',JSON.stringify({
    configuredHours:cfg.weeklyHours,originalConstructed:current.technicallyConstructed,
    originalOverCap:oldWeeks.filter(w=>w.minutes>600),
    cappedConstructed:capped.technicallyConstructed,cappedReason:capped.reason,
    cappedOverCap:newWeeks.filter(w=>w.minutes>600),
    cappedBricks:capped.trace.filter(t=>t.id.startsWith('V3B_703_'))
      .map(t=>({week:t.week,id:t.id,duration:t.duration})),
    cappedWeeks:newWeeks,volumeFeasibility:minuteReport,
    blocking:capped.issues.filter(i=>
      ['blocking','critical','error'].includes(i.severity)).slice(0,16).map(i=>i.code),
  }));
  // The gate is allowed to reject an impossible calendar; never to exceed 10h.
  expect(newWeeks.every(w=>w.minutes<=600)).toBe(true);
  expect(minuteReport?.interpretation).toBe('necessary_condition_only_not_a_training_prescription');
  expect(capped.status==='refused'||capped.status==='candidate').toBe(true);
  expect(capped.humanReviewRequired).toBe(true);
  expect(capped.sportingRelevance).toBe('not_attested');
  expect(capped.constraintsSatisfied).toBe(false);
 });
});
