import { describe,it,expect,vi,afterEach } from 'vitest';
import { auditCountRatioQuotaFeasibility } from './v31-ratio-feasibility';
import { preparePrevalidationFixture } from '@/qa/sports-plan-lab/prevalidationFixtures';
import { prepareGenerationContracts } from '@/lib/plan/prepareGenerationContracts';
import type { WeeklyQuota } from '@/engines/plan/sessionSizingMatrix';

const target={swim:[15,20],bike:[40,50],run:[30,40]} as const;
const quota:Pick<WeeklyQuota,'swim'|'bike'|'run'|'brick'>={
 swim:{min:3,max:3},bike:{min:3,max:3},
 run:{min:3,max:3},brick:{min:1,max:1},
};
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('V31 read-only legacy sport ratio vs deterministic quotas',()=>{
 it('proves count-based 70.3 sport ratio impossible for the published 3/3/3+brick quota',()=>{
  const a=auditCountRatioQuotaFeasibility(Array(8).fill(quota),{
    swim:[...target.swim],bike:[...target.bike],run:[...target.run],
  });
  expect(a.weeks).toBe(8);
  expect(a.countFloor).toEqual({swim:24,bike:24,run:24,brick:8});
  expect(a.impossibilities).toContain('swim');
  const swim=a.bounds.find(r=>r.sport==='swim')!;
  expect(swim.provablyAbove).toBe(true);
  expect(swim.minimumPossiblePct).toBe(30);
  // No quota, catalogue, target or validator is changed by this calculation.
 });
 it('refuses invalid quota input rather than claiming proof',()=>{
  expect(()=>auditCountRatioQuotaFeasibility([],{
    swim:[15,20],bike:[40,50],run:[30,40]
  })).toThrow('ratio_audit_invalid_input');
  expect(()=>auditCountRatioQuotaFeasibility([{
    ...quota,swim:{min:4,max:3},
  }],{swim:[15,20],bike:[40,50],run:[30,40]}))
    .toThrow('ratio_audit_invalid_quota');
 });
 it('audits actual 70.3 prepared quotas rather than guessing the athlete ambition',()=>{
  vi.stubGlobal('fetch',()=>{throw Error('NETWORK_FORBIDDEN');});
  const fixture=preparePrevalidationFixture('B-70.3');
  const prep=prepareGenerationContracts(fixture.athleteData,
    {...fixture.planConfig,_outputFormat:'json'},{rotationSeed:0});
  const quotas=Object.entries(prep.weeklyQuotas)
    .filter(([,q])=>q.weekType==='load'&&q.quota)
    .map(([,q])=>q.quota!);
  expect(quotas.length).toBeGreaterThan(0);
  const a=auditCountRatioQuotaFeasibility(quotas,{
    swim:[...target.swim],bike:[...target.bike],run:[...target.run],
  });
  console.info('DET_V31_703_COUNT_RATIO_CONTRACT',JSON.stringify({
    objective:fixture.planConfig.objective,
    ambition:fixture.planConfig.ambition,weekCount:a.weeks,
    minCounts:a.countFloor,maxCounts:a.countCeiling,bounds:a.bounds,
    impossibleUnderCountPolicy:a.impossibilities,
  }));
  expect(a.bounds).toHaveLength(3);
  expect(a.bounds.every(b=>b.minimumPossiblePct<=b.maximumPossiblePct)).toBe(true);
 });
});