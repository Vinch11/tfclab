/** Read-only serialization audit; never changes a prescription to make a schema pass. */
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {zPlanChunk,DAY_INDEX} from '@/lib/plan/planSchema';
import {isRaceDaySession} from '../../supabase/functions/_shared/raceDayIdentity';
export function auditTechnicalPlan(plan:ParsedPlan|undefined){
 if(!plan)return {execution:'not_applicable' as const,valid:null,issues:[] as string[]};
 const issues:string[]=[];
 if(plan.weeks.length!==plan.totalWeeks||new Set(plan.weeks.map(w=>w.weekNumber)).size!==plan.totalWeeks||
  !Array.from({length:plan.totalWeeks},(_,i)=>i+1).every(n=>plan.weeks.some(w=>w.weekNumber===n)))issues.push('calendar_not_complete_and_unique');
 for(const week of plan.weeks){
  if(new Set(week.sessions.map(s=>s.dayIndex)).size!==7)issues.push(`S${week.weekNumber}:calendar_day_missing`);
  for(const s of week.sessions){
   if(DAY_INDEX[s.dayName.toLowerCase() as keyof typeof DAY_INDEX]!==s.dayIndex)issues.push(`S${week.weekNumber}:day_name_index_conflict`);
   if(!s.isRest&&!s.catalogId&&!isRaceDaySession(s))issues.push(`S${week.weekNumber}:training_without_catalogue_reference`);
  }
 }
 // ParsedPlan stores rest metadata implicitly. The schema adapter serializes that existing meaning explicitly.
 const chunk={title:plan.title,phases:plan.phases,weeks:plan.weeks.map(w=>({...w,sessions:w.sessions.map(s=>({
  day:s.dayName.toLowerCase(),sport:s.sport,title:s.title,details:s.details,isKeySession:!!s.isKeySession,
  custom:s.isRest?true:!!s.custom,catalogId:s.catalogId??null,durationMin:s.durationMin,zones:s.zones??[],...(s.variantKey?{variantKey:s.variantKey}:{})
 }))}))};
 const result=zPlanChunk.safeParse(chunk);
 if(!result.success)issues.push(...result.error.issues.map(i=>`${i.path.join('.')}:${i.code}`));
 return {execution:'executed' as const,valid:issues.length===0,issues,source:'existing zPlanChunk + complete week/day/index and catalogue provenance audit'};
}
