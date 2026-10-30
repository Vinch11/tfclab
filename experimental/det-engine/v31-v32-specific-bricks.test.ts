import { describe,it,expect,vi,afterEach } from 'vitest';
import { buildDetV3ContractFromCatalogue, type V3ReviewedSettings } from './v31-v3-catalogue';
import { V32_703_BRICK_BLUEPRINTS, type V32SpecificBrickReview } from './v32-v3-specific-bricks';
import { auditPlannedMinuteDistribution,splitVerifiedV3Brick } from './v31-time-ratio';
import { V3_BASE_BRICK_ID } from './v31-v3-brick';
import { preparePrevalidationFixture } from '@/qa/sports-plan-lab/prevalidationFixtures';
import { prepareGenerationContracts } from '@/lib/plan/prepareGenerationContracts';
import { constructDeterministicPlan } from './engine';

const rev=(id:string,targetDurationMin?:number):V3ReviewedSettings=>({
 id,objective:'703',athleteLevel:'trained',athleteLevelSource:'manual',
 allPrerequisitesChecked:true,individualCoachApproval:true,
 ...(targetDurationMin===undefined?{}:{targetDurationMin}),
});
const sourceReviews:V3ReviewedSettings[]=[
 rev('V3P_BIKE_002',65),rev('V3P_RUN_001'),
 rev('V3P_BIKE_090'),rev('V3P_BIKE_057'),rev('V3P_BIKE_085'),rev('V3P_RUN_041'),
];
const baseReview={id:V3_BASE_BRICK_ID,objective:'703',individualCoachApproval:true as const,
 transitionSeconds:300,preferReviewedV3:true as const};
const qualityReviews:V32SpecificBrickReview[]=V32_703_BRICK_BLUEPRINTS.map(x=>({
 id:x.id,objective:'703',individualCoachApproval:true,transitionSeconds:x.transitionSeconds,
 preferReviewedV3:true,
}));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('V32 — no invented conversion of historical 70.3 bricks',()=>{
 it('creates three exact candidate-only source-bound build/peak bricks, preserving the 400 originals',()=>{
  const p=buildDetV3ContractFromCatalogue(sourceReviews,[baseReview],qualityReviews);
  expect(p.report.sourceCount).toBe(400);
  expect(p.report.accepted).toHaveLength(6);
  expect(p.specificBrickReport.rejected).toEqual([]);
  expect(p.specificBrickReport.accepted).toHaveLength(3);
  const examples=p.specificBrickReport.accepted.map(m=>({
    id:m.id,duration:m.durationMin[0],phases:m.phases,
    decomposed:splitVerifiedV3Brick(m.id,m.structure,m.durationMin[0],p.allBricks),
  }));
  expect(examples).toEqual([
    {id:'V3B_703_BUILD_180',duration:180,phases:['build'],
     decomposed:{bike:132,run:42,transition:6}},
    {id:'V3B_703_BUILD_120',duration:120,phases:['build'],
     decomposed:{bike:74,run:42,transition:4}},
    {id:'V3B_703_PEAK_150',duration:150,phases:['peak'],
     decomposed:{bike:99,run:42,transition:9}},
  ]);
  expect(p.specificBrickReport.accepted.every(m=>
    m.tags.includes('two-reviewed-components')&&m.goals.includes('half'))).toBe(true);
  expect(p.allBricks).toHaveLength(4);
  expect(p.contract.consumedSourceIds?.(p.specificBrickReport.accepted[0]))
    .toEqual(['V3P_BIKE_090','V3P_RUN_041']);
  expect(p.contract.sourceRecoveryForId?.('V3B_703_BUILD_180'))
    .toEqual([{sourceId:'V3P_BIKE_090',sport:'bike',hours:24},
      {sourceId:'V3P_RUN_041',sport:'run',hours:36}]);
  expect(p.contract.consumedSourceIds?.(p.specificBrickReport.accepted[1]))
    .toEqual(['V3P_BIKE_057','V3P_RUN_041']);
  expect(p.contract.consumedSourceIds?.(p.specificBrickReport.accepted[2]))
    .toEqual(['V3P_BIKE_085','V3P_RUN_041']);
 });
 it('leaves all the bricks unavailable when no synthetic coach reviews are supplied',()=>{
  const p=buildDetV3ContractFromCatalogue([]);
  expect(p.report.accepted).toHaveLength(0);
  expect(p.allBricks).toHaveLength(0);
  expect(p.specificBrickReport.accepted).toHaveLength(0);
 });
 it('refuses missing component approval, cross-objective, mismatched transition or a silent modified dose',()=>{
  const noRun=buildDetV3ContractFromCatalogue(sourceReviews.filter(r=>r.id!=='V3P_RUN_041'),
    [baseReview],qualityReviews);
  expect(noRun.specificBrickReport.accepted).toHaveLength(0);
  expect(noRun.specificBrickReport.rejected.every(r=>
    r.reason==='v32_both_components_must_be_individually_reviewed')).toBe(true);
  const wrongGoal=buildDetV3ContractFromCatalogue(sourceReviews,[baseReview],
    [{...qualityReviews[0],objective:'IM'}]);
  expect(wrongGoal.specificBrickReport.rejected[0].reason).toBe('v32_brick_objective_not_half');
  const wrongTransition=buildDetV3ContractFromCatalogue(sourceReviews,[baseReview],
    [{...qualityReviews[1],transitionSeconds:300}]);
  expect(wrongTransition.specificBrickReport.rejected[0].reason).toBe('v32_transition_not_reviewed_blueprint');
  const changedBike=buildDetV3ContractFromCatalogue(
    sourceReviews.map(r=>r.id==='V3P_BIKE_090'?{...r,targetDurationMin:130}:r),
    [baseReview],[qualityReviews[0]]);
  expect(changedBike.specificBrickReport.accepted).toHaveLength(0);
  expect(changedBike.specificBrickReport.rejected[0].reason)
    .toBe('v32_exact_blueprint_dose_mismatch');
 });
 it('will not count forged/altered text as an approved V3 brick breakdown',()=>{
  const p=buildDetV3ContractFromCatalogue(sourceReviews,[baseReview],qualityReviews);
  const m=p.specificBrickReport.accepted[0];
  expect(splitVerifiedV3Brick(m.id,m.structure,m.durationMin[0],[])).toBeNull();
  expect(()=>splitVerifiedV3Brick(m.id,m.structure+' force ajoutée',180,p.allBricks))
    .toThrow('v31_composite_structure_or_duration_tampered');
  expect(()=>splitVerifiedV3Brick(m.id,m.structure,181,p.allBricks))
    .toThrow('v31_composite_structure_or_duration_tampered');
  expect(splitVerifiedV3Brick('LEGACY_BRICK',m.structure,180,p.allBricks)).toBeNull();
 });
 it('actually offers build/peak V3 candidates to the real 70.3 solver without falsely approving its output',()=>{
  vi.stubGlobal('fetch',()=>{throw Error('NETWORK_FORBIDDEN');});
  const fixture=preparePrevalidationFixture('B-70.3');
  const cfg={...fixture.planConfig,_outputFormat:'json' as const};
  const beforeBridge=buildDetV3ContractFromCatalogue(sourceReviews,[baseReview]);
  const afterBridge=buildDetV3ContractFromCatalogue(sourceReviews,[baseReview],qualityReviews);
  const before=constructDeterministicPlan(fixture.athleteData,cfg,
    {maxNodes:3000,maxMilliseconds:2000},beforeBridge.contract);
  const after=constructDeterministicPlan(fixture.athleteData,cfg,
    {maxNodes:3000,maxMilliseconds:2000},afterBridge.contract);
  expect(before.technicallyConstructed).toBe(true);
  const prep=prepareGenerationContracts(fixture.athleteData,cfg,{rotationSeed:0});
  const types=Object.fromEntries(Object.entries(prep.weeklyQuotas).map(([w,q])=>[Number(w),q.weekType]));
  const beforeAudit=auditPlannedMinuteDistribution(before.candidate!,types,beforeBridge.allBricks);
  const afterAudit=after.candidate?
    auditPlannedMinuteDistribution(after.candidate,types,afterBridge.allBricks):null;
  const selected=after.trace.filter(t=>t.id.startsWith('V3B_703_'));
  console.info('DET_V32_703_BRICK_REPLACEMENT_CANDIDATES',JSON.stringify({
    before:{status:before.status,conformant:before.constraintsSatisfied,
      unknownBrickMinutes:beforeAudit.unresolvedBrickMinutes,
      unknown:beforeAudit.unresolvedBricks},
    after:{status:after.status,reason:after.reason,constructed:after.technicallyConstructed,
      conformant:after.constraintsSatisfied,selected,
      knownMinutes:afterAudit?.knownMinutes,unknownBrickMinutes:afterAudit?.unresolvedBrickMinutes,
      remainingLegacy:afterAudit?.unresolvedBricks,
      ratioBounds:afterAudit?.conservativeBounds,
      blocking:after.issues.filter(i=>['blocking','error','critical'].includes(i.severity))
        .slice(0,12).map(i=>({code:i.code,week:i.week}))},
  }));
  expect(after.issues.some(i=>i.code==='v3_recovery_hours_unverified')).toBe(true);
  expect(after.issues.filter(i=>i.code==='v3_recovery_hours_unverified')
    .some(i=>i.message?.includes('V3P_RUN_041')&&i.message.includes('36h'))).toBe(true);
  expect(after.humanReviewRequired).toBe(true);
  expect(after.sportingRelevance).toBe('not_attested');
  expect(afterBridge.allBricks.length).toBe(4);
  // A build-phase quality composition cannot masquerade as recovery.
  expect(afterBridge.contract.filterCandidate?.(afterBridge.specificBrickReport.accepted[0],
    {week:4,phase:'build',weekType:'recovery',slot:{sport:'brick'},dayIndex:5})).toBe(false);
  expect(afterBridge.contract.filterCandidate?.(afterBridge.specificBrickReport.accepted[2],
    {week:12,phase:'peak',weekType:'race',slot:{sport:'brick'},dayIndex:5})).toBe(false);
  expect(afterBridge.contract.filterCandidate?.(afterBridge.specificBrickReport.accepted[2],
    {week:11,phase:'peak',weekType:'taper',slot:{sport:'brick'},dayIndex:5})).toBe(false);
 });
});
