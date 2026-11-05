/**
 * DET V3.15 — an independently declared RACE EVENT occupies real time/day
 * capacity but must not be counted as an additional TRAINING brick.
 * This projection is for the existing weekly QUOTA validator ONLY.
 * The original complete calendar remains the authority for native sporting,
 * physical day-capacity, event placement and rest requirements.
 */
import type {MergedPlan} from '@/lib/plan/mergePlanChunks';
import type {WeekQuotaEntry} from '@/lib/plan/validateWeeklyQuotas';

export interface CertifiedRaceQuotaProjection {
  verdict:'verified'|'refused'|'not_needed';
  reason:string;
  projected:MergedPlan|null;
  excludedEvents:number;
}
const sameDay=(a:string,b:string)=>a.trim().toLocaleLowerCase('fr-FR')===
  b.trim().toLocaleLowerCase('fr-FR');
export function projectCertifiedRaceEventsForTrainingQuotas(
  plan:MergedPlan,
  entries:Readonly<Record<number,WeekQuotaEntry>>,
  declaredEstimate?:(week:number,dayIndex:number,sport:string)=>number|null,
):CertifiedRaceQuotaProjection {
  const fail=(reason:string):CertifiedRaceQuotaProjection=>({
    verdict:'refused',reason,projected:null,excludedEvents:0,
  });
  const projects=Object.entries(entries).filter(([,entry])=>
    entry.layout?.officialRaceOutsideTrainingQuota===true);
  if(!projects.length)return {
    verdict:'not_needed',reason:'no_separately_declared_official_race',
    projected:plan,excludedEvents:0,
  };
  const excluded=new Map<number,Set<number>>();
  let excludedEvents=0;
  for(const [weekKey,entry] of projects){
    const weekNumber=Number(weekKey);
    const week=plan.weeks.find(w=>w.weekNumber===weekNumber);
    if(!week||entry.weekType!=='race'||!entry.layout)return fail('race_week_missing');
    const required=entry.layout.requiredEvents??[];
    const slots=entry.layout.days.flatMap((day,dayIndex)=>
      day.slots.filter(s=>s.isRaceEvent).map(s=>({
        dayName:day.dayName,dayIndex,sport:s.sport,
      })));
    if(!required.length||slots.length!==required.length)
      return fail('race_event_declaration_or_slot_count_mismatch');
    const used=new Set<number>();
    for(const event of required){
      const slotMatches=slots.filter(s=>s.sport===event.sport&&
        sameDay(s.dayName,event.dayName));
      if(slotMatches.length!==1)return fail('race_slot_missing_or_duplicated');
      const slot=slotMatches[0];
      let estimated:number|null=null;
      if(declaredEstimate){try{estimated=declaredEstimate(weekNumber,slot.dayIndex,event.sport);}catch{return fail('declared_event_estimate_binding_invalid');}}
      const candidates=week.sessions.flatMap((session,i)=>{
        const original=session.durationMin===0&&session.details.startsWith('Épreuve déclarée ; durée à confirmer');
        const explicit=typeof estimated==='number'&&Number.isFinite(estimated)&&estimated>0&&session.durationMin===estimated&&session.details==='Épreuve déclarée ; durée planifiée ESTIMÉE par le coach, pas une mesure de performance.';
        return session.sport===event.sport&&session.dayIndex===slot.dayIndex&&sameDay(session.dayName,slot.dayName)&&session.custom===true&&session.catalogId==null&&session.title.startsWith('COURSE :')&&(declaredEstimate?explicit:original)?[i]:[];
      });
      if(candidates.length!==1||used.has(candidates[0]))
        return fail('race_session_missing_duplicate_or_not_source_proven');
      used.add(candidates[0]);
    }
    // Without this check, a forged additional "COURSE" could sneak through
    // the training-only view. It remains in the actual plan and must refuse.
    if(week.sessions.some((s,i)=>
      s.title.startsWith('COURSE :')&&!used.has(i)))
      return fail('unexpected_or_duplicate_race_session');
    // Keep physical-day/rest guards over the unmodified original sessions.
    const active=week.sessions.filter(s=>!s.isRest);
    const counts=new Map<string,number>();
    for(const session of active){
      const key=session.dayName.trim().toLocaleLowerCase('fr-FR');
      counts.set(key,(counts.get(key)??0)+1);
    }
    if([...counts.values()].some(v=>v>entry.quota.maxSessionsPerDay)||
       7-counts.size<entry.quota.minFullRestDays)
      return fail('physical_daily_capacity_or_rest_not_proven');
    excluded.set(weekNumber,used);
    excludedEvents+=used.size;
  }
  const projected:MergedPlan={...plan,
    weeks:plan.weeks.map(week=>{
      const ids=excluded.get(week.weekNumber);
      return ids?{...week,sessions:week.sessions.filter((_,i)=>!ids.has(i))}:week;
    }),
  };
  return {verdict:'verified',reason:'declared_unique_race_keeps_physical_constraints',
    projected,excludedEvents};
}
