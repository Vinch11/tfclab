/** Offline explanation of necessary bounds already enforced by the shared planner.
 * This is evidence, not an alternative allocator or a new sporting policy. */
import { effectiveSessionQuota, hasWeeklyCalendarCapacity } from '../../../supabase/functions/_shared/sessionQuotaAccounting';
import type { WeeklyQuota } from '@/engines/plan/sessionSizingMatrix';

export function calendarCapacityEvidence(quota: WeeklyQuota, availableDays: number) {
 const days=Math.max(0,Math.min(availableDays,7-quota.minFullRestDays));
 const branches=[];
 for(let bricks=quota.brick.min;bricks<=Math.min(quota.brick.max,days);bricks++) {
  const effective=effectiveSessionQuota(quota,bricks);
  const minimum=Math.max(quota.swim.min+effective.bike.min+quota.run.min+bricks+quota.strength.min,effective.totalSessions.min);
  const rawCapacity=days*quota.maxSessionsPerDay;
  const capacity=rawCapacity-bricks*(quota.maxSessionsPerDay-Math.min(quota.maxSessionsPerDay,quota.swim.max>0?2:1))
   -quota.strength.min*Math.max(0,quota.maxSessionsPerDay-2);
  const reasons=[];
  if(quota.swim.min>days)reasons.push('swim_days');
  if(quota.strength.min>days)reasons.push('strength_days');
  if(quota.run.min+bricks>days)reasons.push('run_plus_brick_days');
  if(effective.bike.min+bricks>days)reasons.push('bike_plus_brick_days');
  if(quota.strength.min+bricks>days)reasons.push('strength_plus_brick_days');
  if(minimum>rawCapacity)reasons.push('daily_session_capacity');
  else if(minimum>capacity)reasons.push('brick_strength_day_capacity');
  if(minimum>effective.totalSessions.max)reasons.push('minimum_above_total_max');
  branches.push({bricks,minimum,rawCapacity,capacity,totalMaximum:effective.totalSessions.max,reasons});
 }
 return {days,maxSessionsPerDay:quota.maxSessionsPerDay,restDays:quota.minFullRestDays,
  quota:{swim:quota.swim,bike:quota.bike,run:quota.run,brick:quota.brick,strength:quota.strength,totalSessions:quota.totalSessions},
  admissibleByNecessaryBound:hasWeeklyCalendarCapacity(quota,availableDays),branches};
}
