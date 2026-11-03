/**
 * V3.58 — explicit acceptance attempts for complete semi-marathon calendars.
 * Real solver, fictitious coach declarations only. A refusal FAILS this test.
 */
import {afterEach,describe,expect,it,vi} from 'vitest';
import {runScenario,type Case} from './v332-running-long-horizon-fixture';
import {strictMarathonCaseSettings} from './v356-marathon-acceptance-fixtures';

const cases:Case[]=[8,30].flatMap(weeks=>
  (['age_group','competitor'] as const).map(ambition=>({
    ...strictMarathonCaseSettings,
    id:`semi-${weeks}w-${ambition}-strict-acceptance`,
    fixture:'B-SEMI' as const,goal:'Semi' as const,weeks,
    weeklyHours:ambition==='age_group'?7:9,
    declaredAmbition:ambition,
    ...(ambition==='competitor'?{reviewedCompetitorPlacement:true as const}:{}),
    // Marathon-specific evidence is never asserted for a different objective.
    marathonHorizonEvidence:undefined,
    marathonSpecificityReconciliation:undefined,
    measuredMarathonMesocycles:undefined,
    verifiedRunningPhaseEvidence:true as const,declaredPrimaryLimiter:'tte' as const,
  })));
cases.push(...[8,10,12].flatMap(weeks=>(['age_group','competitor'] as const).map(ambition=>({
  ...strictMarathonCaseSettings,id:`10k-${weeks}w-${ambition}-strict-acceptance`,
  fixture:'B-10K' as const,goal:'10K' as const,weeks,weeklyHours:ambition==='age_group'?7:9,
  declaredAmbition:ambition,declaredPrimaryLimiter:'tte' as const,
  ...(ambition==='competitor'?{reviewedCompetitorPlacement:true as const}:{}),
  approvedTaperDose:undefined,marathonHorizonEvidence:undefined,
  marathonSpecificityReconciliation:undefined,measuredMarathonMesocycles:undefined,
  verifiedRunningPhaseEvidence:true as const,
  ...(weeks===10&&ambition==='competitor'?{supplementalV3Dose:true as const}:{}),
}))));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('V358 full running acceptance attempts',()=>{
  it.each(cases)('$id must pass every sporting gate',s=>{
    vi.stubGlobal('fetch',()=>{throw Error('DET_V358_NETWORK_FORBIDDEN');});
    const out=runScenario(s);
    expect(out.technicallyConstructed).toBe(true);
    expect(out.constraintsSatisfied).toBe(true);
    expect(out.candidate?.weeks).toHaveLength(s.weeks);
    expect(out.issues.filter(i=>['critical','blocking','error'].includes(i.severity))).toEqual([]);
    const exact=out.issues.find(i=>i.code==='det_v358_running_exact_source_horizon_verified');
    expect(exact).toBeDefined();
    const proof=JSON.parse(exact!.message!);
    expect(proof.tte.percentage).toBeGreaterThanOrEqual(30);
    expect(proof.tte.unknownKeySessions).toBe(0);
    if(s.supplementalV3Dose)expect(out.candidate?.weeks.flatMap(w=>w.sessions)
      .some(session=>session.catalogId==='V3P_RUN_201')).toBe(true);
    expect(out.humanReviewRequired).toBe(true);
    expect(out.sportingRelevance).toBe('not_attested');
  },45000);
  it('retains the original dense 10K/10w competitor refusal without the extra approved dose',()=>{
    vi.stubGlobal('fetch',()=>{throw Error('DET_V358_NETWORK_FORBIDDEN');});
    const original=cases.find(s=>s.goal==='10K'&&s.weeks===10&&s.declaredAmbition==='competitor')!;
    const out=runScenario({...original,id:original.id+'-without-supplement',supplementalV3Dose:undefined});
    expect(out.constraintsSatisfied).toBe(false);
    expect(out.issues.some(i=>i.code==='det_v358_running_exact_source_horizon_unverified')).toBe(true);
  },45000);
});
