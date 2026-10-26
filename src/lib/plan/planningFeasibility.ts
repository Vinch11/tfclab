import type { WeeklyQuota } from '@/engines/plan/sessionSizingMatrix';
import type { WeeklySlotLayout } from '@/engines/plan/weeklySlotLayout';
import { effectiveSessionQuota } from '../../../supabase/functions/_shared/sessionQuotaAccounting';

/** Mechanical feasibility only. Never changes a frequency, volume or recovery rule. */
export function planningFeasibility(quota: WeeklyQuota, layout: WeeklySlotLayout): string[] {
 const issues:string[]=[];
 const slots=layout.days.flatMap(d=>d.slots);
 const bricks=slots.filter(s=>s.sport==='brick').length;
 const effective=effectiveSessionQuota(quota,bricks);
 const minimum=quota.swim.min+effective.bike.min+quota.run.min+quota.brick.min+quota.strength.min;
 if(minimum>effective.totalSessions.max) issues.push('minimum_sessions_exceed_total_max');
 const capacity=(7-Math.max(quota.minFullRestDays,layout.days.filter(d=>d.isRest).length))*quota.maxSessionsPerDay;
 if(minimum>capacity) issues.push('minimum_sessions_exceed_available_capacity');
 for(const sport of ['swim','bike','run','brick','strength'] as const){
  const min=sport==='bike'?effective.bike.min:quota[sport].min;
  const count=slots.filter(s=>s.sport===sport).length;
  if(count<min) issues.push(`layout_below_${sport}_minimum`);
  if(count>(sport==='bike'?effective.bike.max:quota[sport].max)) issues.push(`layout_exceeds_${sport}_maximum`);
 }
 if(slots.length<effective.totalSessions.min) issues.push('layout_below_total_min');
 if(layout.days.filter(d=>d.slots.length===0).length<quota.minFullRestDays) issues.push('layout_below_full_rest_minimum');
 if(slots.length>effective.totalSessions.max) issues.push('layout_exceeds_total_max');
 if(layout.days.some(d=>d.slots.length>quota.maxSessionsPerDay)) issues.push('layout_exceeds_daily_max');
 return issues;
}
