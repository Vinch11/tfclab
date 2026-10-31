import {describe,it,expect,vi,afterEach} from 'vitest';
import {buildDetV3ContractFromCatalogue,type V3ReviewedSettings} from './v31-v3-catalogue';
import {V34_SAFE_RUN_BRICKS,type V34SafeBrickReview} from './v34-v3-low-run-bricks';
import {V32_703_BRICK_BLUEPRINTS,type V32SpecificBrickReview} from './v32-v3-specific-bricks';
import {V3_BASE_BRICK_ID} from './v31-v3-brick';
import {splitVerifiedV3Brick,auditPlannedMinuteDistribution} from './v31-time-ratio';
import {constructDeterministicPlan} from './engine';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import {prepareGenerationContracts} from '@/lib/plan/prepareGenerationContracts';

const review=(id:string,targetDurationMin?:number):V3ReviewedSettings=>({
  id,objective:'703',athleteLevel:'trained',athleteLevelSource:'manual',
  allPrerequisitesChecked:true,individualCoachApproval:true,
  ...(targetDurationMin===undefined?{}:{targetDurationMin}),
});
const sources=[
 review('V3P_BIKE_002',65),review('V3P_BIKE_017'),
 review('V3P_BIKE_090'),review('V3P_BIKE_057'),review('V3P_BIKE_085'),review('V3P_BIKE_089'),
 review('V3P_BIKE_016',139),
 review('V3P_RUN_001'),review('V3P_RUN_041'),
];
const base=[{id:V3_BASE_BRICK_ID,objective:'703',
  individualCoachApproval:true as const,transitionSeconds:300,
  preferReviewedV3:true as const}];
const specific:V32SpecificBrickReview[]=V32_703_BRICK_BLUEPRINTS.map(b=>({
 id:b.id,objective:'703',individualCoachApproval:true,transitionSeconds:b.transitionSeconds,
 preferReviewedV3:true,
}));
const easy:V34SafeBrickReview[]=V34_SAFE_RUN_BRICKS.map(b=>({
 id:b.id,objective:'703',individualCoachApproval:true,transitionSeconds:b.transitionSeconds,
 preferReviewedV3:true,
}));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('V34 — lower run-recovery burden without changing sport floors',()=>{
 it('assembles only exact source-reviewed easy-run 70.3 bricks (173/120/160/180)',()=>{
  const p=buildDetV3ContractFromCatalogue(sources,base,specific,easy);
  expect(p.report.sourceCount).toBe(400);
  expect(p.lowRunBrickReport.rejected).toEqual([]);
  expect(p.lowRunBrickReport.accepted.map(m=>m.durationMin))
    .toEqual([[173,173],[120,120],[160,160],[180,180]]);
  expect(p.lowRunBrickReport.accepted.map(m=>m.phases))
    .toEqual([['build'],['build'],['peak'],['build']]);
  const split=p.lowRunBrickReport.accepted.map(m=>splitVerifiedV3Brick(
    m.id,m.structure,m.durationMin[0],p.allBricks));
  expect(split).toEqual([{bike:132,run:35,transition:6},
    {bike:77,run:35,transition:8},{bike:120,run:35,transition:5},
    {bike:139,run:35,transition:6}]);
  for(const m of p.lowRunBrickReport.accepted){
    expect(p.contract.sourceRecoveryForId?.(m.id).find(x=>x.sport==='run')?.hours)
      .toBe(6);
    expect(p.contract.rankCandidate?.(m,{
      week:5,phase:m.phases[0],weekType:'load',
      slot:{sport:'brick'},dayIndex:5,
    })).toBe(-2);
  }
  expect(p.allBricks).toHaveLength(8);
  expect(p.lowRunBrickReport.accepted[1].mainZoneMax).toBe(2);
  expect(p.contract.filterCandidate?.(p.lowRunBrickReport.accepted[1],{
    week:6,phase:'build',weekType:'load',slot:{sport:'brick',isKeySession:true},dayIndex:5
  })).toBe(false);
  expect(p.contract.filterCandidate?.(p.lowRunBrickReport.accepted[1],{
    week:6,phase:'build',weekType:'load',slot:{sport:'brick',isKeySession:true,isLongSession:true},dayIndex:5
  })).toBe(true);
 });
 it('refuses absent review, wrong transition or altered bike source dosage',()=>{
  expect(buildDetV3ContractFromCatalogue(sources,base,specific).lowRunBrickReport.accepted)
    .toHaveLength(0);
  const missing=buildDetV3ContractFromCatalogue(
    sources.filter(w=>w.id!=='V3P_RUN_001'),[],[],easy);
  expect(missing.lowRunBrickReport.accepted).toHaveLength(0);
  expect(missing.lowRunBrickReport.rejected.every(x=>x.reason
    ==='v34_both_sources_require_individual_review')).toBe(true);
  const bad=buildDetV3ContractFromCatalogue(sources,base,specific,
    [{...easy[0],transitionSeconds:300}]);
  expect(bad.lowRunBrickReport.rejected[0].reason)
    .toBe('v34_transition_dose_not_verified');
  const wrong=buildDetV3ContractFromCatalogue(sources,base,specific,
    [{...easy[0],objective:'IM'}]);
  expect(wrong.lowRunBrickReport.rejected[0].reason).toBe('v34_wrong_race_objective');
 });
 it('measures real DET 70.3 choice with original quality bricks vs aerobic-run alternatives',()=>{
  vi.stubGlobal('fetch',()=>{throw Error('NETWORK_FORBIDDEN');});
  const fixture=preparePrevalidationFixture('B-70.3');
  const cfg={...fixture.planConfig,_outputFormat:'json' as const};
  const before=buildDetV3ContractFromCatalogue(sources,base,specific);
  const after=buildDetV3ContractFromCatalogue(sources,base,specific,easy);
  const b=constructDeterministicPlan(fixture.athleteData,cfg,
    {maxNodes:4000,maxMilliseconds:2500},before.contract);
  const a=constructDeterministicPlan(fixture.athleteData,cfg,
    {maxNodes:4000,maxMilliseconds:2500},after.contract);
  expect(b.technicallyConstructed).toBe(true);
  const selected=a.trace.filter(x=>x.id.startsWith('V3B_703_'));
  const prep=prepareGenerationContracts(fixture.athleteData,cfg,{rotationSeed:0});
  const weekTypes=Object.fromEntries(Object.entries(prep.weeklyQuotas)
    .map(([w,q])=>[Number(w),q.weekType]));
  const audit=a.candidate?auditPlannedMinuteDistribution(a.candidate,weekTypes,after.allBricks):null;
  console.info('DET_V34_703_AEROBIC_TRANSITION',JSON.stringify({
   before:{constructed:b.technicallyConstructed,conformant:b.constraintsSatisfied,
     recoveryWarnings:b.issues.filter(i=>i.code==='v3_recovery_hours_unverified').length},
   after:{status:a.status,reason:a.reason,constructed:a.technicallyConstructed,
     conformant:a.constraintsSatisfied,recoveryWarnings:a.issues.filter(i=>i.code==='v3_recovery_hours_unverified').length,
     hardRunRecovery:a.issues.filter(i=>i.code==='v3_recovery_hours_unverified'&&i.message?.includes('V3P_RUN_041')).length,
     selected,unknownBrickMinutes:audit?.unresolvedBrickMinutes,knownMinutes:audit?.knownMinutes,
     blocking:a.issues.filter(i=>['blocking','critical','error'].includes(i.severity))
       .slice(0,16).map(x=>({week:x.week,code:x.code}))},
  }));
  expect(a.humanReviewRequired).toBe(true);
  expect(a.sportingRelevance).toBe('not_attested');
  expect(a.issues.some(i=>i.code==='v3_session_clock_invalid')).toBe(false);
  // Do not equate fewer unverified recovery hours with full sporting approval.
 });
});