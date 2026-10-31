import {describe,it,expect} from 'vitest';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import {buildDetV3ContractFromCatalogue} from './v31-v3-catalogue';
import {constructDeterministicPlan} from './engine';
import {v3FullCatalogue} from '../../scripts/library-v3/catalogueRuntime';
import {syntheticV3SportingContext,syntheticV3ReviewAnchors} from './v3-test-anchor-fixtures';
import {V3_BASE_BRICK_ID} from './v31-v3-brick';
import {V32_703_BRICK_BLUEPRINTS} from './v32-v3-specific-bricks';
import {V34_SAFE_RUN_BRICKS} from './v34-v3-low-run-bricks';

const swimIds=[
 'V3P_SWIM_103','V3P_SWIM_108','V3P_SWIM_118','V3P_SWIM_123',
 'V3P_SWIM_132','V3P_SWIM_133','V3P_SWIM_137','V3P_SWIM_142',
 'V3P_SWIM_143','V3P_SWIM_153','V3P_SWIM_158','V3P_SWIM_162',
 'V3P_SWIM_163','V3P_SWIM_167','V3P_SWIM_178','V3P_SWIM_192',
];
const bikeRunIds=[
 'V3P_BIKE_002','V3P_BIKE_017','V3P_BIKE_090','V3P_BIKE_057',
 'V3P_BIKE_085','V3P_BIKE_089','V3P_BIKE_016',
 'V3P_RUN_001','V3P_RUN_041',
];
function review(id:string) {
 return {id,objective:'703',athleteLevel:'trained' as const,athleteLevelSource:'manual' as const,
  allPrerequisitesChecked:true as const,individualCoachApproval:true as const,
  preferReviewedV3:true as const,athleteAnchors:syntheticV3ReviewAnchors(),
  ...(id==='V3P_BIKE_002'?{targetDurationMin:65}:
      id==='V3P_BIKE_016'?{targetDurationMin:139}:{}),
  ...syntheticV3SportingContext(id),
 };
}
describe('DET V37 — multi-sport 70.3 source selection in real solver',()=>{
 it('uses reviewed V3 swim sessions in a 70.3 candidate without disguising existing safety failures',()=>{
  const fixture=preparePrevalidationFixture('B-70.3');
  const config={...fixture.planConfig,_outputFormat:'json' as const};
  const candidates=buildDetV3ContractFromCatalogue(
   [...bikeRunIds,...swimIds].map(review),
   [{id:V3_BASE_BRICK_ID,objective:'703',individualCoachApproval:true,
     transitionSeconds:300,preferReviewedV3:true}],
   V32_703_BRICK_BLUEPRINTS.map(b=>({id:b.id,objective:'703',individualCoachApproval:true,
     transitionSeconds:b.transitionSeconds,preferReviewedV3:true})),
   V34_SAFE_RUN_BRICKS.map(b=>({id:b.id,objective:'703',individualCoachApproval:true,
     transitionSeconds:b.transitionSeconds,preferReviewedV3:true})),
  );
  expect(candidates.report.accepted.map(m=>m.id).filter(x=>swimIds.includes(x))).toHaveLength(swimIds.length);
  expect(candidates.allBricks.length).toBeGreaterThanOrEqual(7);
  const out=constructDeterministicPlan(fixture.athleteData,config,
   {maxNodes:10000,maxMilliseconds:4500},candidates.contract);
  const selectedSwims=out.trace.filter(t=>swimIds.includes(t.id));
  const sourceMap=new Map(v3FullCatalogue.workouts.map(w=>[w.id,w]));
  console.info('DET_V37_703_SWIM_AND_BRICK_REAL_SELECTION',JSON.stringify({
   technicallyConstructed:out.technicallyConstructed,reason:out.reason,
   selectedSwims:selectedSwims.map(t=>({id:t.id,week:t.week,day:t.day,duration:t.duration})),
   selectedBricks:out.trace.filter(t=>t.id.startsWith('V3B_703_')).map(t=>t.id),
   blocking:out.issues.filter(i=>['blocking','error','critical'].includes(i.severity))
    .map(i=>i.code).slice(0,24),
  }));
  expect(out.technicallyConstructed).toBe(true);
  expect(selectedSwims.length).toBeGreaterThan(0);
  expect(selectedSwims.every(t=>sourceMap.get(t.id)?.sport==='swim')).toBe(true);
  expect(selectedSwims.every(t=>candidates.report.accepted.some(m=>
    m.id===t.id&&m.phases.includes(out.candidate!.weeks[t.week-1].phase)))).toBe(true);
  expect(out.humanReviewRequired).toBe(true);
  expect(out.sportingRelevance).toBe('not_attested');
  // A selected swim source does not approve a full 70.3 calendar.
  expect(out.constraintsSatisfied).toBe(false);
 });
});