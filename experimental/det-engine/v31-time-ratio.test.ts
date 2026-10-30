import { describe,it,expect,vi,afterEach } from 'vitest';
import { auditPlannedMinuteDistribution, splitExactV3BaseBrick } from './v31-time-ratio';
import { V3_BASE_BRICK_ID } from './v31-v3-brick';
import { buildDetV3ContractFromCatalogue } from './v31-v3-catalogue';
import { preparePrevalidationFixture } from '@/qa/sports-plan-lab/prevalidationFixtures';
import { prepareGenerationContracts } from '@/lib/plan/prepareGenerationContracts';
import { constructDeterministicPlan } from './engine';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('V31 planned-minute diagnostic, no legacy ratio waiver',()=>{
 it('attributes only source-verified V3 brick minutes and not transition',()=>{
  const d='Vélo 65 min : sortie sous LT1 | Transition 5 min, validée coach | Course 35 min : footing';
  expect(splitExactV3BaseBrick(V3_BASE_BRICK_ID,d,105))
    .toEqual({bike:65,run:35,transition:5});
  expect(splitExactV3BaseBrick('B_LEGACY_BRICK',d,105)).toBeNull();
  expect(()=>splitExactV3BaseBrick(V3_BASE_BRICK_ID,d,100))
    .toThrow('v31_v3_brick_component_sum_mismatch');
  expect(()=>splitExactV3BaseBrick(V3_BASE_BRICK_ID,'brique libre',105))
    .toThrow('v31_v3_brick_structure_missing');
 });
 it('keeps all undecomposed brick training as uncertain, never assigning 50/50',()=>{
  const report=auditPlannedMinuteDistribution({
    title:'QA',phases:[],totalWeeks:1,
    weeks:[{weekNumber:1,theme:'base',phase:'base',sessions:[
      {weekNumber:1,weekTheme:'base',phase:'base',sport:'swim',title:'Nage',details:'Planifié',dayIndex:1,dayName:'mardi',isRest:false,durationMin:45},
      {weekNumber:1,weekTheme:'base',phase:'base',sport:'bike',title:'Vélo',details:'Planifié',dayIndex:2,dayName:'mercredi',isRest:false,durationMin:100},
      {weekNumber:1,weekTheme:'base',phase:'base',sport:'run',title:'Course',details:'Planifié',dayIndex:3,dayName:'jeudi',isRest:false,durationMin:60},
      {weekNumber:1,weekTheme:'base',phase:'base',sport:'brick',title:'Brique',details:'Non décomposé',dayIndex:5,dayName:'samedi',isRest:false,durationMin:120,catalogId:'LEGACY'},
    ]}],
  },{1:'load'});
  expect(report.knownMinutes).toEqual({swim:45,bike:100,run:60});
  expect(report.unresolvedBrickMinutes).toBe(120);
  expect(report.knownTotalMinutes).toBe(205);
  expect(report.conservativeBounds.swim.minPct).toBeLessThan(report.conservativeBounds.swim.maxPct);
  expect(report.conservativeBounds.bike.maxPct).toBeGreaterThan(report.conservativeBounds.bike.minPct);
  expect(report.interpretation).toBe('diagnostic_only_not_a_prescription_validation');
 });
 it('reports 70.3 real solve minutes without declaring inherited brick doses exact',()=>{
  vi.stubGlobal('fetch',()=>{throw Error('NETWORK_FORBIDDEN');});
  const fixture=preparePrevalidationFixture('B-70.3');
  const cfg={...fixture.planConfig,_outputFormat:'json' as const};
  const {contract}=buildDetV3ContractFromCatalogue([
    {id:'V3P_BIKE_002',athleteLevel:'light',athleteLevelSource:'manual',
      objective:'703',allPrerequisitesChecked:true,individualCoachApproval:true,
      targetDurationMin:65},
    {id:'V3P_RUN_001',athleteLevel:'light',athleteLevelSource:'manual',
      objective:'703',allPrerequisitesChecked:true,individualCoachApproval:true},
  ],[{id:V3_BASE_BRICK_ID,objective:'703',individualCoachApproval:true,
    transitionSeconds:300,preferReviewedV3:true}]);
  const out=constructDeterministicPlan(fixture.athleteData,cfg,
    {maxNodes:2500,maxMilliseconds:1500},contract);
  expect(out.technicallyConstructed).toBe(true);
  const prep=prepareGenerationContracts(fixture.athleteData,cfg,{rotationSeed:0});
  const types=Object.fromEntries(Object.entries(prep.weeklyQuotas).map(([w,q])=>[Number(w),q.weekType]));
  const audit=auditPlannedMinuteDistribution(out.candidate!,types);
  console.info('DET_V31_703_TIME_RATIO_DIAGNOSTIC',JSON.stringify({
    knownMinutes:audit.knownMinutes,unresolvedBrickMinutes:audit.unresolvedBrickMinutes,
    verifiedTransitionMinutes:audit.verifiedTransitionMinutes,
    plannedMinuteRatiosIfKnownOnly:audit.percentagesIfKnownOnly,
    wideBounds:audit.conservativeBounds,loadWeeks:audit.weeks,
    interpretation:audit.interpretation,
  }));
  expect(audit.verifiedTransitionMinutes).toBe(15);
  expect(audit.unresolvedBrickMinutes).toBeGreaterThan(0);
  expect(audit.knownMinutes.bike).toBeGreaterThan(65);
  expect(out.constraintsSatisfied).toBe(false);
 });
});