import { describe,it,expect } from 'vitest';
import { computeWeeklySessionQuota } from '../sessionSizingMatrix';
import { effectiveSessionQuota } from '../../../../supabase/functions/_shared/sessionQuotaAccounting';
describe('taper totals respect the existing maintained-frequency rule',()=>{
 for(const objective of ['5K','10K','Semi','Marathon','Sprint','Olympic','703','IM'])
 for(const ambition of ['finisher','age_group','competitor','elite','world_class'])
 it(`${objective}/${ambition}`,()=>{
  const load=computeWeeklySessionQuota(objective,ambition,40,'load')!;
  const taper=computeWeeklySessionQuota(objective,ambition,40,'taper')!;
  const q=taper.quota,effective=effectiveSessionQuota(q,q.brick.min);
  const minimum=q.swim.min+effective.bike.min+q.run.min+q.brick.min+q.strength.min;
  expect(effective.totalSessions.max).toBeGreaterThanOrEqual(minimum);
  expect(q.totalSessions.max).toBeLessThanOrEqual(load.quota.totalSessions.max);
  expect(q.run).toEqual(load.quota.run);
  expect(taper.floors.longRunWeekly).toBe(false);
  expect(taper.floors.longRideWeekly).toBe(false);
 });
});
