/**
 * V39.2 — feasibility gate for COMPLETE 70.3/IM plans, not a session-level pass.
 * Instruments the actual deterministic search and retains every hard refusal.
 * This audit never creates fictitious coach timestamps or athlete load data.
 */
import {describe,it,expect,vi,afterEach} from 'vitest';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import {constructDeterministicPlan} from './engine';
import {buildDetV3ContractFromCatalogue,type V3ReviewedSettings} from './v31-v3-catalogue';
import {syntheticV3ReviewAnchors,syntheticV3SportingContext} from './v3-test-anchor-fixtures';
import {V3_BASE_BRICK_ID} from './v31-v3-brick';
import {V32_703_BRICK_BLUEPRINTS} from './v32-v3-specific-bricks';
import {V34_SAFE_RUN_BRICKS} from './v34-v3-low-run-bricks';

const review=(id:string,objective:'703'|'IM',targetDurationMin?:number):V3ReviewedSettings=>({
  id,objective,athleteLevel:'trained',athleteLevelSource:'manual',
  allPrerequisitesChecked:true,individualCoachApproval:true,preferReviewedV3:true,
  athleteAnchors:syntheticV3ReviewAnchors(),...syntheticV3SportingContext(id),
  ...(targetDurationMin===undefined?{}:{targetDurationMin}),
});
const baseSourceIds=[
  'V3P_BIKE_002','V3P_BIKE_017','V3P_BIKE_090','V3P_BIKE_057',
  'V3P_BIKE_085','V3P_BIKE_089','V3P_BIKE_016',
  'V3P_RUN_001','V3P_RUN_041',
] as const;
const blocking=(severity:string)=>['blocking','error','critical'].includes(severity);
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('DET V39 — full multisport plans must pass ALL gates simultaneously',()=>{
  it.each(['B-70.3','B-IM'] as const)('%s logs source-resolved weekly volumes and every blocking native rule',fixtureId=>{
    vi.stubGlobal('fetch',()=>{throw Error('DET_V39_NETWORK_FORBIDDEN');});
    const f=preparePrevalidationFixture(fixtureId);
    const objective=fixtureId==='B-70.3'?'703' as const:'IM' as const;
    // Explicit A-race dates: the QA fixture had NO event date, which makes day-J unverifiable.
    // This is declared synthetic race context, not a default for real athletes.
    const raceDate=fixtureId==='B-70.3'?'2027-01-17':'2027-02-14';
    const cfg={...f.planConfig,planStartDate:'2026-10-26',raceDate,
      raceGoals:[{objective,raceDate,priority:'A' as const}],
      _outputFormat:'json' as const};
    expect(cfg.weeklyHours).toBeGreaterThan(0);
    const reviews=baseSourceIds.map(id=>review(id,objective,id==='V3P_BIKE_002'?65:id==='V3P_BIKE_016'?139:undefined));
    const brickReviews=objective==='703'?[{
      id:V3_BASE_BRICK_ID,objective,individualCoachApproval:true as const,
      transitionSeconds:300,preferReviewedV3:true as const,
    }]:[];
    const specific=objective==='703'?V32_703_BRICK_BLUEPRINTS.map(b=>({
      id:b.id,objective,individualCoachApproval:true as const,
      transitionSeconds:b.transitionSeconds,preferReviewedV3:true as const,
    })):[];
    const easy=objective==='703'?V34_SAFE_RUN_BRICKS.map(b=>({
      id:b.id,objective,individualCoachApproval:true as const,
      transitionSeconds:b.transitionSeconds,preferReviewedV3:true as const,
    })):[];
    const {report,contract}=buildDetV3ContractFromCatalogue(reviews,brickReviews,specific,easy);
    expect(report.accepted.length).toBeGreaterThan(0);
    const out=constructDeterministicPlan(f.athleteData,cfg,
      {maxNodes:12000,maxMilliseconds:8000},{...contract,enforceWeeklyHoursCap:true});
    const capMin=Math.floor(cfg.weeklyHours!*60);
    const weeks=out.candidate?.weeks.map(w=>({
      week:w.weekNumber,phase:w.phase,
      totalKnownMinutes:w.sessions.filter(s=>!s.isRest).reduce((n,s)=>n+(s.durationMin??0),0),
      unknownDurationCount:w.sessions.filter(s=>!s.isRest&&s.durationMin===undefined).length,
      swim:w.sessions.filter(s=>s.sport==='swim').length,
      bike:w.sessions.filter(s=>s.sport==='bike').length,
      run:w.sessions.filter(s=>s.sport==='run').length,
      brick:w.sessions.filter(s=>s.sport==='brick').length,
      strength:w.sessions.filter(s=>s.sport==='strength').length,
    }))??[];
    const blockingIssues=out.issues.filter(i=>blocking(i.severity));
    const byCode=Object.fromEntries([...new Set(blockingIssues.map(x=>x.code))].sort().map(
      code=>[code,blockingIssues.filter(i=>i.code===code).map(i=>i.week??null)]));
    const named=out.trace.filter(t=>t.id.startsWith('V3P_')||t.id.startsWith('V3B_'));
    console.info('DET_V39_COMPLETE_MULTISPORT_GATE',JSON.stringify({
      fixture:fixtureId,objective,configuredWeeklyHours:cfg.weeklyHours,capMin,
      status:out.status,reason:out.reason,technicallyConstructed:out.technicallyConstructed,
      constraintsSatisfied:out.constraintsSatisfied,eligibleSourceCount:report.accepted.length,
      weeksExpected:cfg.weeksAvailable,weeksConstructed:weeks.length,
      weeks,selectedV3:named.map(t=>({id:t.id,week:t.week,day:t.day,duration:t.duration})),
      hardBlockers:byCode,searchNodes:out.nodes,
    }));
    // Never invent week totals if the solver returned no candidate.
    expect(weeks.every(w=>w.totalKnownMinutes<=capMin)).toBe(true);
    expect(out.constraintsSatisfied).toBe(out.technicallyConstructed&&blockingIssues.length===0);
    // An incomplete athlete program must never be passed off as sport-safe.
    if(weeks.some(w=>w.unknownDurationCount>0)){
      expect(out.constraintsSatisfied).toBe(false);
      expect(blockingIssues.some(i=>i.code==='v3_total_weekly_minutes_unverifiable_strength')).toBe(true);
    }
    expect(out.humanReviewRequired).toBe(true);
    expect(out.sportingRelevance).toBe('not_attested');
  });
});