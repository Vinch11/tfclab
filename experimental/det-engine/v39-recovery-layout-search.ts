/**
 * V3.9 — bounded, deterministic day swaps for V3 source recovery feasibility.
 *
 * Never creates, removes, lengthens or changes the type of a workout slot:
 * only swaps two EXISTING physical slots between non-rest days, keeping the
 * original weekly frequency, strength count, long-session flags, coach day
 * bans, official race and quota limits. All native validators still run.
 */
import type {WeeklyQuota} from '@/engines/plan/sessionSizingMatrix';
import type {WeeklySlotLayout,LayoutSport,DayName} from '@/engines/plan/weeklySlotLayout';
import {planningFeasibility} from '../../supabase/functions/_shared/planningFeasibility';
import {calendarOnlyRecoverySafe,type ScheduledSport,type V3RecoveryRequirement} from './v39-calendar-safe-recovery';

export interface RepairWeek{
  week:number;layout:WeeklySlotLayout;quota:WeeklyQuota;
  reviewedIds:Array<{id:string;sport:string;durationMin?:readonly [number,number]}>;
}
type DayBan={day:string;sport:string};
export interface RecoveryRepairResult {swaps:Array<{week:number;from:string;to:string;beforeMissing:number;afterMissing:number}>;remainingMissing:number;}
function schedule(weeks:readonly RepairWeek[]):ScheduledSport[]{
  return weeks.flatMap(w=>w.layout.days.flatMap((d,dayIndex)=>
    d.slots.map(s=>({week:w.week,dayIndex,sport:s.sport}))));
}
function violatesBan(day:DayName,sport:LayoutSport,bans:readonly DayBan[]):boolean{
  return bans.some(b=>b.day===day&&(b.sport==='any'||b.sport===sport||
    (sport==='brick'&&(b.sport==='bike'||b.sport==='run'))));
}
function structurallySafe(w:RepairWeek,bans:readonly DayBan[]):boolean {
  const d=w.layout.days;
  for(let i=0;i<d.length;i++){
    const day=d[i], slots=day.slots;
    if(day.isRest&&slots.length || slots.length>w.quota.maxSessionsPerDay)return false;
    if(slots.some(s=>violatesBan(day.dayName,s.sport,bans)))return false;
    if(new Set(slots.map(s=>s.sport)).size!==slots.length)return false;
    if(slots.some(s=>s.sport==='brick')&&
       slots.some(s=>['bike','run','strength'].includes(s.sport)&&s.sport!=='brick'))return false;
    if(slots.some(s=>s.sport==='strength')&&
       (day.dayName==='vendredi' || (d[(i+1)%d.length].slots.some(s=>s.isLongSession&&
         (s.sport==='bike'||s.sport==='brick')))))return false;
  }
  return planningFeasibility(w.quota,w.layout).length===0;
}
/** Missing V3 recovery-safe domains. A source with zero V3 recovery evidence
 * is NOT treated as a proven V3 replacement; existing legacy candidates are
 * evaluated separately by the actual engine.
 */
function score(weeks:readonly RepairWeek[],sources:(id:string)=>readonly V3RecoveryRequirement[]):{missing:number;safe:number}{
  const all=schedule(weeks);
  let missing=0,safe=0;
  for(const w of weeks)for(let dayIndex=0;dayIndex<w.layout.days.length;dayIndex++){
    for(const slot of w.layout.days[dayIndex].slots){
      if(slot.isRaceEvent)continue;
      const approved=w.reviewedIds.filter(x=>x.sport===slot.sport &&
        (x.durationMin?.[1]??Infinity)>=(slot.minDurationMin??0) &&
        (x.durationMin?.[0]??0)<=(slot.maxDurationMin??Infinity));
      if(!approved.length)continue; // Other feasibility diagnostics handle missing catalogue.
      const viable=approved.filter(x=>calendarOnlyRecoverySafe(
        {week:w.week,dayIndex,sport:slot.sport},sources(x.id),all));
      // Mandatory slots with no available replacement matter first. A run
      // whose reviewed V3 dose is unsafe but has a compatible legacy source
      // is not an empty assignment domain. A mandatory long brick with only
      // unsafe V3 compositions IS.
      if(!viable.length)missing++;
      safe+=viable.filter(x=>sources(x.id).length>0).length;
    }
  }
  return {missing,safe};
}
function swap(layout:WeeklySlotLayout,a:number,ai:number,b:number,bi:number):WeeklySlotLayout{
  const days=layout.days.map(d=>({...d,slots:d.slots.map(s=>({...s}))}));
  const hold=days[a].slots[ai];
  days[a].slots[ai]=days[b].slots[bi];
  days[b].slots[bi]=hold;
  return {...layout,days};
}
export function improveCalendarRecoveryByExistingSlotSwaps(
  weeks:RepairWeek[],
  sources:(id:string)=>readonly V3RecoveryRequirement[],
  bans:readonly DayBan[],
  maxSwaps=8,
):RecoveryRepairResult{
  const swaps:RecoveryRepairResult['swaps']=[];
  let baseline=score(weeks,sources);
  // One global improvement per pass. A strict decrease prevents cycles.
  for(let pass=0;pass<maxSwaps&&baseline.missing>0;pass++){
    let winner:null|{index:number;layout:WeeklySlotLayout;before:number;after:number;from:string;to:string;metric:{missing:number;safe:number}}=null;
    for(let index=0;index<weeks.length;index++){
      const w=weeks[index];const days=w.layout.days;
      for(let a=0;a<days.length;a++)for(let b=a+1;b<days.length;b++){
        if(days[a].isRest||days[b].isRest)continue;
        for(let ai=0;ai<days[a].slots.length;ai++)for(let bi=0;bi<days[b].slots.length;bi++){
          const first=days[a].slots[ai],second=days[b].slots[bi];
          if(first.isRaceEvent||second.isRaceEvent||first.sport===second.sport)continue;
          const candidate=swap(w.layout,a,ai,b,bi);
          const old=w.layout;w.layout=candidate;
          const valid=structurallySafe(w,bans);
          const metric=valid?score(weeks,sources):null;
          w.layout=old;
          if(!metric || metric.missing>baseline.missing)continue;
          // Never settle for a neutral move, and never accept fewer safe sources
          // unless it strictly reduces mandatory unsatisfied V3 domains.
          const improved=metric.missing<baseline.missing ||
            (metric.missing===baseline.missing&&metric.safe>baseline.safe);
          if(!improved)continue;
          const better=!winner||metric.missing<winner.metric.missing||
            (metric.missing===winner.metric.missing&&metric.safe>winner.metric.safe);
          if(better)winner={index,layout:candidate,before:baseline.missing,
            after:metric.missing,from:days[a].dayName,to:days[b].dayName,metric};
        }
      }
    }
    if(!winner)break;
    weeks[winner.index].layout=winner.layout;
    swaps.push({week:weeks[winner.index].week,from:winner.from,to:winner.to,
      beforeMissing:winner.before,afterMissing:winner.after});
    baseline=winner.metric;
  }
  return {swaps,remainingMissing:baseline.missing};
}
