import { effectiveSessionQuota, hasWeeklyCalendarCapacity } from "./sessionQuotaAccounting.ts";
export type MechanicalSport="swim"|"bike"|"run"|"brick"|"strength";
export interface MechanicalQuota {swim:{min:number;max:number};bike:{min:number;max:number};run:{min:number;max:number};brick:{min:number;max:number};strength:{min:number;max:number};totalSessions:{min:number;max:number};maxSessionsPerDay:number;minFullRestDays:number;}
export interface MechanicalSlot {sport:MechanicalSport;isRaceEvent?:boolean;isLongSession?:boolean;isKeySession?:boolean;isActivation?:boolean;minDurationMin?:number;maxDurationMin?:number;}
export interface MechanicalLayout {days:Array<{dayName:string;isRest:boolean;slots:MechanicalSlot[]}>;requiredEvents?:Array<{dayName:string;sport:string}>;}
/** Mechanical feasibility only. Never changes a frequency, volume or recovery rule. */
export function planningFeasibility(quota: MechanicalQuota, layout: MechanicalLayout): string[] {
 const issues:string[]=[];
 const sports=['swim','bike','run','brick','strength'] as const;
 const slots=layout.days.flatMap(d=>d.slots);
 const required=layout.requiredEvents??[];
 for(const event of required) {
  const matches=layout.days.filter(d=>d.dayName===event.dayName).flatMap(d=>d.slots)
   .filter(s=>s.isRaceEvent&&s.sport===event.sport);
  if(matches.length!==1)issues.push('declared_event_unplaced');
 }
 // A declared competition is never a V3 training brick. Only an EXACT,
 // explicitly reserved official event may exceed a zero training-brick
 // quota; a second unapproved brick still breaches the original maximum.
 // Keep the real event in daily/rest-day capacity accounting.
 for(const day of layout.days)for(const slot of day.slots)if(slot.isRaceEvent&&
  !required.some(e=>e.dayName===day.dayName&&e.sport===slot.sport))
   issues.push('undeclared_race_event_slot');
 const overflowBySport=Object.fromEntries(sports.map(sport=>{
  const verified=layout.days.reduce((sum,day)=>sum+day.slots.filter(slot=>
   slot.isRaceEvent&&slot.sport===sport&&required.some(e=>e.dayName===day.dayName&&e.sport===sport)).length,0);
  return [sport,Math.max(0,verified-quota[sport].max)];
 })) as Record<MechanicalSport,number>;
 const eventOverflow=sports.reduce((n,s)=>n+overflowBySport[s],0);
 const quotaCountedTotal=slots.length-eventOverflow;
 const nominalBricks=Math.min(quota.brick.max,slots.filter(s=>s.sport==='brick').length);
 const effective=effectiveSessionQuota(quota,nominalBricks);
 const minimum=quota.swim.min+effective.bike.min+quota.run.min+quota.brick.min+quota.strength.min;
 if(minimum>effective.totalSessions.max) issues.push('minimum_sessions_exceed_total_max');
 const capacity=(7-Math.max(quota.minFullRestDays,layout.days.filter(d=>d.isRest).length))*quota.maxSessionsPerDay;
 if(Math.max(minimum,effective.totalSessions.min)+eventOverflow>capacity ||
    !hasWeeklyCalendarCapacity(quota,layout.days.filter(d=>!d.isRest).length))
   issues.push('minimum_sessions_exceed_available_capacity');
 for(const sport of sports){
  const min=sport==='bike'?effective.bike.min:quota[sport].min;
  const max=(sport==='bike'?effective.bike.max:quota[sport].max)+overflowBySport[sport];
  const count=slots.filter(s=>s.sport===sport).length;
  if(count<min) issues.push(`layout_below_${sport}_minimum`);
  if(count>max) issues.push(`layout_exceeds_${sport}_maximum`);
 }
 if(quotaCountedTotal<effective.totalSessions.min) issues.push('layout_below_total_min');
 if(layout.days.filter(d=>d.slots.length===0).length<quota.minFullRestDays) issues.push('layout_below_full_rest_minimum');
 if(quotaCountedTotal>effective.totalSessions.max) issues.push('layout_exceeds_total_max');
 if(layout.days.some(d=>d.slots.length>quota.maxSessionsPerDay)) issues.push('layout_exceeds_daily_max');
 return issues;
}
