import{assessConditional}from'./v14-state';import{originalCard}from'./v14-sources';import{digest}from'./v9-prospective';
import{validateWeeklyQuotas}from'@/lib/plan/validateWeeklyQuotas';import{auditTechnicalPlan}from'./v2-technical-validation';import{auditSportsContinuity}from'./v2-sports-validation';
import{checkSessionCatalogue}from'../../supabase/functions/_shared/sessionCatalogueContract';import{sourceContext}from'./v13-source-context';import{relativeCalendarContext}from'./v14-relative-context';
/** Additional four-week contract, in parallel to every untouched historical result. */
export function validateFourWeekScopeV23(result:any,p:any){const c=result.calendar,plan=c.calendar;const errors:any[]=[],unknowns:any[]=[],future:any[]=[],capacityConflicts:any[]=[],coach:any[]=[];
 const add=(code:string,evidence:any)=>errors.push({code,evidence});
 const complete=c.weeks.length===4&&plan.totalWeeks===4&&plan.weeks.length===4&&[1,2,3,4].every(n=>c.weeks.filter((w:any)=>w.week===n).length===1&&plan.weeks.filter((w:any)=>w.weekNumber===n).length===1);
 if(!complete)add('four_week_calendar_coverage',{expected:[1,2,3,4],actual:c.weeks.map((w:any)=>w.week)});
 const technical=auditTechnicalPlan(plan);if(!technical.valid)add('technical_plan_schema',technical);
 const actualQuotas=validateWeeklyQuotas(plan,p.prep.weeklyQuotas);for(const q of actualQuotas)if(q.severity==='critical')add('original_weekly_quota_or_budget',q);
 const names=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];const longDays:number[]=[];
 for(const w of c.weeks){const actual=plan.weeks.find((x:any)=>x.weekNumber===w.week);if(!actual)continue;const active=actual.sessions.filter((x:any)=>!x.isRest);const grouped=Array.from({length:7},(_,day)=>active.filter((s:any)=>s.dayIndex===day));
  if(new Set(actual.sessions.map((s:any)=>s.dayIndex)).size!==7||actual.sessions.some((s:any)=>names[s.dayIndex]!==s.dayName))add('four_week_day_identity',{week:w.week});
  if(grouped.some((xs:any[],day:number)=>xs.length&&(!p.availableDays.includes(day)||xs.length>p.maxDaily||new Set(xs.map(s=>s.sport)).size!==xs.length))||grouped.filter((xs:any[])=>!xs.length).length<p.minRest)add('four_week_availability_density_rest',{week:w.week});
  if(active.length!==w.slots.length||new Set(w.slots.map((s:any)=>s.card.id)).size!==w.slots.length)add('four_week_source_identity',{week:w.week});
  const minutes=active.reduce((n:number,s:any)=>n+s.durationMin,0);if(minutes!==w.reservedMinutes||minutes>w.budget||w.budget>p.prep.weeklyQuotas[w.week].volumeBudget.maxMinutes)add('four_week_budget_arithmetic',{week:w.week,minutes,budget:w.budget});
  for(const sport of['swim','bike','run','strength']){const count=active.filter((s:any)=>s.sport===sport).length;const q=p.prep.weeklyQuotas[w.week].quota[sport];if(count<q.min||count>q.max)add('four_week_frequency',{week:w.week,sport,count,quota:q});}
  for(const s of w.slots){
   const expectedCapacity=s.role.kind==='long'?p.longCaps[s.role.sport]:p.normalCaps[s.role.sport];
   if(s.role.currentCapacity!==expectedCapacity||s.input.currentCapacity!==expectedCapacity)add('four_week_capacity_frame_mutated',{week:w.week,slot:s.key,expectedCapacity,roleCapacity:s.role.currentCapacity,inputCapacity:s.input.currentCapacity});
   if(s.input.week!==w.week||s.input.minutes!==s.minutes||digest(assessConditional(s.input))!==digest(s.decision))add('four_week_conditional_decision_mutated',{week:w.week,slot:s.key});
   try{if(digest(originalCard(s.card.id))!==digest(s.card))add('four_week_original_source_mutated',{week:w.week,slot:s.key});}catch{add('four_week_original_source_missing',{week:w.week,slot:s.key});}
   const stored=active.filter((x:any)=>x.catalogId===s.card.id);if(stored.length!==1||stored[0].durationMin!==s.minutes||stored[0].dayIndex!==s.day||stored[0].details!==s.card.structure)add('four_week_serialization',{week:w.week,slot:s.key});
   const cat=stored[0]?checkSessionCatalogue(stored[0],{objective:p.config.objective,phase:w.phase,weekType:w.type,catalog:[s.card]}):null;if(cat?.errors.length)add('four_week_catalogue',cat.errors);
   if(!sourceContext(s.card,p,w.week,s.day,w.type).compatible||relativeCalendarContext(s.card,w.week,s.day,w.type,w.slots,c.weeks.filter((x:any)=>x.week<w.week).flatMap((x:any)=>x.slots)).status==='fail')add('four_week_source_placement',{week:w.week,slot:s.key});
   if(s.role.kind==='long'){const day=(w.week-1)*7+s.day;if(longDays.some(d=>Math.abs(d-day)<=1))add('four_week_long_spacing',{week:w.week,slot:s.key});longDays.push(day);}
   if(s.minutes<s.role.floor)add('four_week_native_floor',{week:w.week,slot:s.key,minutes:s.minutes,floor:s.role.floor});
   if(!Number.isFinite(s.input.currentCapacity)||s.input.currentCapacity<=0||s.minutes>s.input.currentCapacity)capacityConflicts.push({week:w.week,slot:s.key,minutes:s.minutes,currentCapacity:s.input.currentCapacity,state:s.decision.state,currentlyAdmissible:false});
   for(const k of s.decision.hardFailures)coach.push({week:w.week,slot:s.key,reason:k,state:s.decision.state});
   for(const k of s.decision.conditions){const row={week:w.week,slot:s.key,condition:k};(k.kind==='recovery'||k.kind==='capacity'?future:unknowns).push(row);}
  }
 }
 const oldSports=auditSportsContinuity(plan,p.config);const by=new Map(oldSports.controls.map(c=>[c.id,c]));
 const start=Date.parse(p.config.planStartDate+'T00:00:00Z'),last=start+28*86400000;const races=(p.config.raceGoals??[]).map((g:any)=>Date.parse(g.raceDate+'T00:00:00Z'));const noRaceInside=Number.isFinite(start)&&races.length>0&&races.every((d:number)=>Number.isFinite(d)&&(d<start||d>=last));
 const classify=result.rawValidation.historical.issues.map((i:any)=>{let scope=false;let witness:any=null;
  if(complete&&(p.config.weeksAvailable??0)>4){
   if(i.code==='calendar_coverage'){scope=true;witness={expected:p.config.weeksAvailable,observed:[1,2,3,4]};}
   if(i.code==='race_day'&&noRaceInside){scope=true;witness={raceDates:p.config.raceGoals.map((g:any)=>g.raceDate),blockDays:28};}
   if(i.code==='triathlon_discipline_continuity'){const e=by.get(i.code)?.evidence as any;if(e&&e.violations.every((v:any)=>v.week>4)){scope=true;witness=e.violations;}}
   if(i.code==='triathlon_training_frequency'){const e=by.get(i.code)?.evidence as any;if(e&&e.frequencyDeficits.every((v:any)=>v.week>4)){scope=true;witness=e.frequencyDeficits;}}
  }
  return{originalIssueUnchanged:i,classification:scope?'historical_sixteen_week_scope':i.severity==='warning'?'historical_warning_retained':i.severity==='info'?'historical_information':'four_week_or_unresolved_historical_error',scopeWitness:witness};
 });
 for(const h of classify)if(h.classification==='four_week_or_unresolved_historical_error'&&['error','critical','blocking'].includes(h.originalIssueUnchanged.severity))add('historical_error_not_explained_by_scope',h);
 return{version:'det-v23-four-week-scope-1',observedWeeks:4,observedDays:28,completeCalendar:complete,executedBlockErrors:errors,executedBlockChecksPass:errors.length===0,technical,originalWeeklyIssues:actualQuotas,rawHistoricalIssuesUnchanged:result.rawValidation.historical.issues,historicalClassifications:classify,rawFullSportsAudit:oldSports,sessionUnknowns:unknowns,currentCapacityConflicts:capacityConflicts,futureConditions:future,coachDecisions:coach,currentlyPrescribable:false,fullIronmanPreparationValidated:false,expertReviewed:false,coverage:'four-week reservation checks only; dose, source execution and real recovery remain unapproved'};
}
