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
  })));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('V358 full running acceptance attempts',()=>{
  it.each(cases)('$id must pass every sporting gate',s=>{
    vi.stubGlobal('fetch',()=>{throw Error('DET_V358_NETWORK_FORBIDDEN');});
    const out=runScenario(s);
    expect(out.technicallyConstructed).toBe(true);
    expect(out.constraintsSatisfied).toBe(true);
    expect(out.candidate?.weeks).toHaveLength(s.weeks);
    expect(out.issues.filter(i=>['critical','blocking','error'].includes(i.severity))).toEqual([]);
    expect(out.humanReviewRequired).toBe(true);
    expect(out.sportingRelevance).toBe('not_attested');
  },45000);
});
