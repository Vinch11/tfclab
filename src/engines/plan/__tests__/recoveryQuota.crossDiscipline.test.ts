import { describe,it,expect } from 'vitest';
import { computeWeeklySessionQuota } from '../sessionSizingMatrix';
import { effectiveSessionQuota } from '../../../../supabase/functions/_shared/sessionQuotaAccounting';
describe('recovery frequency allocation within the existing ceiling and physiological floors',()=>{
 for(const objective of ['5K','10K','Semi','Marathon','Sprint','Olympic','703','IM'])
 for(const ambition of ['finisher','age_group','competitor','elite','world_class'])
 for(const lcw of (["703","IM"].includes(objective)?[false,true]:[false])) it(`${objective}/${ambition}/lcw=${lcw}`,()=>{
  const load=computeWeeklySessionQuota(objective,ambition,40,'load',lcw)!;
  const recovery=computeWeeklySessionQuota(objective,ambition,40,'recovery',lcw)!;
  const q=recovery.quota,e=effectiveSessionQuota(q,q.brick.min);
  const minimum=q.swim.min+e.bike.min+q.run.min+q.brick.min+q.strength.min;
  expect(minimum).toBeLessThanOrEqual(e.totalSessions.max);
  expect(q.totalSessions.max).toBeLessThanOrEqual(Math.floor(load.quota.totalSessions.max*.7));
  expect(q.swim.min).toBeGreaterThanOrEqual(recovery.floors.minSwimPerWeek??0);
  expect(q.strength.min).toBeGreaterThanOrEqual(recovery.floors.minStrengthPerWeek);
  if(recovery.floors.longRunWeekly)expect(q.run.min).toBeGreaterThanOrEqual(1);
  if(recovery.floors.longRideWeekly)expect(q.bike.min).toBeGreaterThanOrEqual(1);
  expect(q.maxSessionsPerDay).toBe(load.quota.maxSessionsPerDay);
  expect(q.minFullRestDays).toBe(load.quota.minFullRestDays);
  if(lcw)expect(q.brick.max).toBe(0);
 });
});
import {applySlFloorIndividualization} from '../sessionSizingMatrix';
it.each(['5K','10K','Semi','Marathon','Sprint','Olympic','703','IM'])('%s: early recovery never reintroduces a nominal long-session floor above prior load',objective=>{
 const ramp={week1PctTarget:.4,rampWeeks:8,weeklyIncreasePctMax:.1};
 const load=computeWeeklySessionQuota(objective,'age_group',40,'load')!;
 const recovery=computeWeeklySessionQuota(objective,'age_group',40,'recovery')!;
 const previous=applySlFloorIndividualization(load.floors,3,'load',ramp).floors;
 const current=applySlFloorIndividualization(recovery.floors,4,'recovery',ramp).floors;
 for(const key of ['slLongRideMin','slLongRunMin'] as const)if(previous[key]!=null) expect(current[key]!).toBeLessThanOrEqual(previous[key]!);
});
