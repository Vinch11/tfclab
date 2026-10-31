/**
 * DET V3.12 — advisory source-dose trajectory toward strict triathlon ratios.
 * Changes ONLY candidate ranking, never eligibility, source dose, quotas,
 * recovery, polarization, load ramp, race events, or native validators.
 *
 * The target is carried across completed load weeks using exact source
 * minutes. All candidate intervals are optimistic: no feasibility claim.
 */
export type TriSport='swim'|'bike'|'run';
export type TriMinutes=Record<TriSport,number>;
export interface TriContribution extends TriMinutes { transition:number }
export interface TriSlotDomain {
  id:string;
  choices:readonly (TriContribution|null)[];
}
export interface TriRatioTrajectory {
  objective:'703'|'IM';
  referenceWeekMinutes:number;
  sportTargetMinutes:TriMinutes;
  low:TriMinutes;
  high:TriMinutes;
  preferredBySlot:Record<string,TriMinutes>;
  interpretation:'advisory_sort_only_not_feasibility_evidence';
}
const sports=['swim','bike','run'] as const;
const allFields=['swim','bike','run','transition'] as const;
const valid=(c:TriContribution|null):c is TriContribution=>
  c!==null&&allFields.every(s=>Number.isFinite(c[s])&&c[s]>=0)&&
  sports.reduce((sum,s)=>sum+c[s],0)+c.transition>0;
const clamp=(v:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,v));
const target:(objective:'703'|'IM')=>TriMinutes=(objective)=>objective==='703'?
  {swim:.175,bike:.475,run:.35}:{swim:.175,bike:.50,run:.325};

export function planTriathlonRatioTrajectory(
  objective:'703'|'IM',
  domains:readonly TriSlotDomain[],
  prior:Readonly<TriMinutes>,
  weeklyCap:number,
):TriRatioTrajectory|null {
  if(!domains.length||sports.some(s=>!Number.isFinite(prior[s])||prior[s]<0))return null;
  const each=domains.map(({id,choices})=>{
    if(!id||!choices.length||choices.some(c=>!valid(c)))return null;
    const cards=choices as TriContribution[];
    const low=Object.fromEntries(sports.map(s=>
      [s,Math.min(...cards.map(c=>c[s]))])) as TriMinutes;
    const high=Object.fromEntries(sports.map(s=>
      [s,Math.max(...cards.map(c=>c[s]))])) as TriMinutes;
    const lengths=cards.map(c=>sports.reduce((sum,s)=>sum+c[s],0)).sort((a,b)=>a-b);
    const med=lengths[Math.floor(lengths.length/2)];
    return {id,low,high,med};
  });
  if(each.some(x=>x===null))return null;
  const safe=each as NonNullable<(typeof each)[number]>[];
  const totalLow=Object.fromEntries(sports.map(s=>
    [s,safe.reduce((sum,slot)=>sum+slot.low[s],0)])) as TriMinutes;
  const totalHigh=Object.fromEntries(sports.map(s=>
    [s,safe.reduce((sum,slot)=>sum+slot.high[s],0)])) as TriMinutes;
  const medianWeek=safe.reduce((sum,slot)=>sum+slot.med,0);
  const referenceWeekMinutes=Math.min(medianWeek,
    Number.isFinite(weeklyCap)&&weeklyCap>0?weeklyCap:medianWeek);
  if(referenceWeekMinutes<=0)return null;
  const priorTotal=sports.reduce((sum,s)=>sum+prior[s],0);
  const ratios=target(objective);
  const sportTargetMinutes=Object.fromEntries(sports.map(s=>
    [s,clamp((priorTotal+referenceWeekMinutes)*ratios[s]-prior[s],
      totalLow[s],totalHigh[s])])) as TriMinutes;
  // Distribute adjustable sport minutes across the SAME admitted slot
  // ranges. Never assign this target as a real prescription or a new dose.
  const fraction=Object.fromEntries(sports.map(s=>[
    s,totalHigh[s]>totalLow[s]?
      clamp((sportTargetMinutes[s]-totalLow[s])/(totalHigh[s]-totalLow[s]),0,1):0,
  ])) as TriMinutes;
  const preferredBySlot=Object.fromEntries(safe.map(slot=>[
    slot.id,Object.fromEntries(sports.map(s=>
      [s,slot.low[s]+fraction[s]*(slot.high[s]-slot.low[s])])) as TriMinutes,
  ]));
  return {objective,referenceWeekMinutes,sportTargetMinutes,
    low:totalLow,high:totalHigh,preferredBySlot,
    interpretation:'advisory_sort_only_not_feasibility_evidence'};
}
export function triathlonCandidateDoseDistance(
  candidate:TriContribution|null,
  preferred:Readonly<TriMinutes>|undefined,
):number {
  if(!candidate||!valid(candidate)||!preferred)return Infinity;
  return sports.reduce((sum,s)=>sum+Math.pow(candidate[s]-preferred[s],2),0);
}
