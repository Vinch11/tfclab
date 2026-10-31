/**
 * V310 isolated, FULLY SYNTHETIC source-coverage experiment.
 * Expands only the QA review pool, not the 800-source catalogue,
 * not coach approvals, and never the released generator.
 */
import {describe,expect,it,vi,afterEach} from 'vitest';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import {constructDeterministicPlan} from './engine';
import {buildDetV3ContractFromCatalogue,type V3ReviewedSettings} from './v31-v3-catalogue';
import {syntheticV3ReviewAnchors,syntheticV3SportingContext} from './v3-test-anchor-fixtures';
import {V3_BASE_BRICK_ID} from './v31-v3-brick';
import {V32_703_BRICK_BLUEPRINTS} from './v32-v3-specific-bricks';
import {V34_SAFE_RUN_BRICKS} from './v34-v3-low-run-bricks';

const initialIds=[
  'V3P_BIKE_002','V3P_BIKE_017','V3P_BIKE_090','V3P_BIKE_057',
  'V3P_BIKE_085','V3P_BIKE_089','V3P_BIKE_016',
  'V3P_RUN_001','V3P_RUN_041',
];
/** Target the ACTUAL Week 1 uncovered sport/long-session slots.
 * Explicit source IDs and individually scoped synthetic approvals. */
const addedIds=[
  'V3P_RUN_003','V3P_RUN_031','V3P_RUN_032','V3P_RUN_037',
  'V3P_RUN_038','V3P_RUN_084','V3P_RUN_085',
  'V3P_SWIM_001','V3P_SWIM_002','V3P_SWIM_003',
  'V3P_SWIM_012','V3P_SWIM_021','V3P_SWIM_027',
  'V3P_SWIM_041','V3P_SWIM_042','V3P_SWIM_043',
  'V3P_SWIM_044','V3P_SWIM_045','V3P_SWIM_046',
  'V3P_SWIM_047','V3P_SWIM_048','V3P_SWIM_049','V3P_SWIM_050',
  'V3P_SWIM_101','V3P_SWIM_102','V3P_SWIM_103',
  'V3P_SWIM_132','V3P_SWIM_133',
] as const;
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('DET V310 — targeted synthetic V3 source coverage instead of a bigger blind DFS',()=>{
  it.each(['B-70.3','B-IM'] as const)(
    '%s tests whether individually verified swim / long-run recipes unblock Week 1',fixtureId=>{
    vi.stubGlobal('fetch',()=>{throw Error('DET_V310_NETWORK_FORBIDDEN');});
    const f=preparePrevalidationFixture(fixtureId);
    const objective=fixtureId==='B-70.3'?'703' as const:'IM' as const;
    const raceDate=fixtureId==='B-70.3'?'2027-01-17':'2027-02-14';
    const cfg={...f.planConfig,planStartDate:'2026-10-26',raceDate,
      raceGoals:[{objective,raceDate,priority:'A' as const}],_outputFormat:'json' as const};
    const reviews=[...new Set([...initialIds,...addedIds])].map(id=>({
      id,objective,athleteLevel:'trained' as const,athleteLevelSource:'manual' as const,
      allPrerequisitesChecked:true as const,individualCoachApproval:true as const,
      preferReviewedV3:true as const,athleteAnchors:syntheticV3ReviewAnchors(),
      ...syntheticV3SportingContext(id),
      ...(id==='V3P_BIKE_002'?{targetDurationMin:65}:
          id==='V3P_BIKE_016'?{targetDurationMin:139}:{}),
    } satisfies V3ReviewedSettings));
    const brickReviews=objective==='703'?[{id:V3_BASE_BRICK_ID,objective,
      individualCoachApproval:true as const,transitionSeconds:300,
      preferReviewedV3:true as const}]:[];
    const specific=objective==='703'?V32_703_BRICK_BLUEPRINTS.map(b=>({
      id:b.id,objective,individualCoachApproval:true as const,
      transitionSeconds:b.transitionSeconds,preferReviewedV3:true as const})): [];
    const easy=objective==='703'?V34_SAFE_RUN_BRICKS.map(b=>({
      id:b.id,objective,individualCoachApproval:true as const,
      transitionSeconds:b.transitionSeconds,preferReviewedV3:true as const})): [];
    const {contract,report}=buildDetV3ContractFromCatalogue(reviews,brickReviews,specific,easy);
    const admittedSports=Object.fromEntries(['swim','run','bike'].map(sport=>[
      sport,report.accepted.filter(m=>m.sport===sport).length]));
    expect(admittedSports.swim).toBeGreaterThan(0);
    expect(admittedSports.run).toBeGreaterThan(2);
    const result=constructDeterministicPlan(f.athleteData,cfg,
      {maxNodes:5000,maxMilliseconds:5000},{...contract,
      enforceWeeklyHoursCap:true,enforceCalendarSafeV3Recovery:true,
      improveV3RecoveryLayout:true,annotateVerifiedDeloads:true,
      filterDeclaredSprintBanCandidates:true,requireRealQualityOnLoadWeeks:true,
      preferSourceBackedMultisportBalance:'swim',
      requireStructuredPolarizationOnLoadWeeks:true,
      auditStructuredPolarizationSources:true});
    const firstMissing=result.issues.find(i=>
      i.code==='det_structured_polarization_source_envelope_refused');
    let unprovedSlots:unknown[]=[];
    if(firstMissing?.message){
      const parsed=JSON.parse(firstMissing.message) as {unprovedSlots?:unknown[]};
      unprovedSlots=parsed.unprovedSlots??[];
    }
    console.info('DET_V310_TARGETED_QA_POOL_EXPERIMENT',JSON.stringify({
      fixture:fixtureId,objective,admittedSports,accepted:report.accepted.length,
      constructedWeeks:result.candidate?.weeks.length??0,nodes:result.nodes,
      reason:result.reason??null,firstMissingWeek:firstMissing?.week??null,
      unprovedSlots,blockingCodes:[...new Set(result.issues.filter(i=>
        ['blocking','error','critical'].includes(i.severity)).map(i=>i.code))],
    }));
    expect(result.humanReviewRequired).toBe(true);
    expect(result.sportingRelevance).toBe('not_attested');
    if(result.technicallyConstructed){
      expect(result.candidate?.weeks).toHaveLength(cfg.weeksAvailable);
      expect(result.candidate!.weeks.every(w=>w.sessions.filter(s=>!s.isRest)
        .reduce((n,s)=>n+(s.durationMin??0),0)<=Math.floor(cfg.weeklyHours!*60))).toBe(true);
    }else expect(result.status).toBe('refused');
  });
});
