/** Read-only preconditions. No model call, no new sporting prescription or repair. */
import { planningFeasibility, type MechanicalQuota, type MechanicalLayout } from './planningFeasibility.ts';
import { catalogueForWeek, catalogueEligibility, executableCatalogueDurationRanges } from './sessionCatalogueContract.ts';
import { catalogueTrainingMinimaForWeek, declaredDateWeek } from './catalogueTrainingMinima.ts';
import { normalizeRepairSport, type RepairWorkoutMetadata } from './repairSportingEquivalence.ts';
export interface PrevalidationIssue {week:number;code:string;severity:'blocking'|'warning';}
export interface PrevalidationInputWeek {
 week:number;globalWeek:number;phase?:string;expectedPhase?:string;weekType?:string;objective?:string;
 quota?:MechanicalQuota;layout?:MechanicalLayout;catalog:RepairWorkoutMetadata[];
 volumeBudget?:{maxMinutes:number;referenceSource:'coach'|'internal-matrix';globalWeek:number;weeklyIncreasePctMax:number};
 dayBans?:Array<{day:string;sport:string}>;
}
export interface PrevalidationCalendar {objective?:string;planStartDate?:string;globalWeekOffset?:number;raceDate?:string;raceFormat?:string|null;raceGoals?:Array<{objective?:string;raceDate?:string;raceFormat?:string|null}>;}
export interface PlanPrevalidation {
 status:'admissible'|'coach_review'|'blocked';issues:PrevalidationIssue[];limiterPriorities?:string[];
 weeks:Array<{week:number;globalWeek:number;cycleWeek?:number;phase?:string;expectedPhase?:string;weekType?:string;objective?:string;
 quota?:MechanicalQuota;layout?:MechanicalLayout;volumeBudget?:PrevalidationInputWeek['volumeBudget'];
 availability:PrevalidationInputWeek['dayBans'];
 requiredIntentions:Array<{day:string;sport:string;isKeySession:boolean;isLongSession:boolean;isRaceEvent:boolean;intentFamily:null;candidateIntentFamilies:string[]}>;
 eligible:Array<{id:string;sport:string;durationMin:[number,number];phases:string[];intentFamily:string;mainZoneMax:number}>;
 excluded:Array<{id:string;reasons:string[]}>;limitedDiversitySports:string[];missingSports:string[];
 minimumStructuredMinutes:number;minimumCatalogueMinutes:number;}>;
}
export function prevalidatePlanWeeks(inputs:PrevalidationInputWeek[],calendar:PrevalidationCalendar={}):PlanPrevalidation {
 const issues:PrevalidationIssue[]=inputs.length?[]:[{week:0,code:"prevalidation_contract_unavailable",severity:"warning"}];
 const weeks=inputs.map(input=>{
  const add=(code:string,severity:'blocking'|'warning')=>issues.push({week:input.week,code,severity});
  const context={phase:input.phase,weekType:input.weekType,objective:input.objective};
  const coverage=catalogueForWeek(input.catalog,context,catalogueTrainingMinimaForWeek(input.quota??{},calendar,input.week));
  if(input.quota&&input.layout)for(const code of planningFeasibility(input.quota,input.layout))add(code,'blocking');
  else add('deterministic_quota_not_available','warning'); // dedicated trail/static route, not fabricated road quotas
  if(!input.phase)add('periodization_phase_not_available','warning');
  if(input.expectedPhase&&input.phase&&input.expectedPhase!==input.phase)add('window_phase_contract_conflict','blocking');
  for(const day of input.layout?.days??[])for(const slot of day.slots)if(input.dayBans?.some(b=>b.day===day.dayName&&(b.sport==='any'||b.sport===slot.sport||(slot.sport==='brick'&&['run','bike'].includes(b.sport)))))add('layout_day_ban_conflict','blocking');
  if(coverage.missingSports.length)add('catalogue_pool_insufficient_custom_requires_review','warning');
  if(coverage.limitedDiversitySports.length)add('catalogue_diversity_limited','warning');
  if(input.volumeBudget?.referenceSource==='internal-matrix'&&input.globalWeek===1)add('coach_initial_load_unverified','warning');
  const slots=(input.layout?.days??[]).flatMap(d=>d.slots).filter(s=>!s.isRaceEvent);
  const minimumStructuredMinutes=slots.reduce((sum,s)=>sum+(s.minDurationMin??0),0);
  const minimumCatalogueMinutes=slots.reduce((sum,slot)=>{
   const ranges=coverage.eligible.filter(m=>normalizeRepairSport(m.sport)===slot.sport).flatMap(m=>executableCatalogueDurationRanges(m,input.objective))
    .filter(r=>r[1]>=(slot.minDurationMin??0)&&r[0]<=(slot.maxDurationMin??Infinity));
   if(!ranges.length){add('catalogue_slot_duration_unavailable','warning');return sum;}
   return sum+Math.min(...ranges.map(r=>Math.max(r[0],slot.minDurationMin??0)));
  },0);
  if(input.volumeBudget){
   if(minimumStructuredMinutes>input.volumeBudget.maxMinutes)add('structured_floors_exceed_volume_budget','blocking');
   else if(minimumCatalogueMinutes>input.volumeBudget.maxMinutes)add('minimum_catalogue_dose_exceeds_budget','warning');
  }
  return {week:input.week,globalWeek:input.globalWeek,phase:input.phase,expectedPhase:input.expectedPhase,weekType:input.weekType,objective:input.objective,
   quota:input.quota,layout:input.layout,volumeBudget:input.volumeBudget,availability:input.dayBans??[],
   requiredIntentions:(input.layout?.days??[]).flatMap(d=>d.slots.map(s=>({day:d.dayName,sport:s.sport,isKeySession:!!s.isKeySession,isLongSession:!!s.isLongSession,isRaceEvent:!!s.isRaceEvent,intentFamily:null,candidateIntentFamilies:[...new Set(coverage.eligible.filter(m=>normalizeRepairSport(m.sport)===s.sport).map(m=>m.intentFamily))]}))),
   eligible:coverage.eligible.map(m=>({id:m.id,sport:normalizeRepairSport(m.sport),durationMin:m.durationMin,phases:m.phases,intentFamily:m.intentFamily,mainZoneMax:m.mainZoneMax})),
   excluded:input.catalog.flatMap(m=>{const reasons=catalogueEligibility(m,context);return reasons.length?[{id:m.id,reasons}]:[];}),
   limitedDiversitySports:coverage.limitedDiversitySports,missingSports:coverage.missingSports,minimumStructuredMinutes,minimumCatalogueMinutes};
 });
 const unique=[...new Map(issues.map(i=>[`${i.week}:${i.code}:${i.severity}`,i])).values()];
 return {status:unique.some(i=>i.severity==='blocking')?'blocked':unique.length?'coach_review':'admissible',issues:unique,weeks};
}
export function assertPlanPrevalidation(report:PlanPrevalidation):void {
 if(report.status==='blocked')throw new Error(`PLAN_PREVALIDATION_BLOCKED: ${report.issues.filter(i=>i.severity==='blocking').map(i=>`S${i.week}:${i.code}`).join('; ')}`);
}

/** Event dates are checked only against a complete plan, never against a subwindow. */
export function prevalidateDeclaredCalendar(calendar:PrevalidationCalendar,totalWeeks:number):PrevalidationIssue[] {
 const goals=calendar.raceGoals?.length?calendar.raceGoals:calendar.raceDate?[{objective:calendar.objective,raceDate:calendar.raceDate}]:[];
 const issues:PrevalidationIssue[]=[];
 if(goals.some(g=>g.raceDate)&&!calendar.planStartDate)return [{week:0,code:'declared_calendar_start_unavailable',severity:'warning'}];
 for(const goal of goals){
  if(!goal.raceDate)continue;
  if(goal.raceFormat&&goal.raceFormat!=='continuous'){issues.push({week:0,code:'multiday_event_requires_stage_review',severity:'warning'});continue;}
  const week=declaredDateWeek(calendar.planStartDate,goal.raceDate);
  if(week===null)issues.push({week:0,code:'declared_calendar_date_invalid',severity:'blocking'});
  else if(week<1||week>totalWeeks)issues.push({week,code:'declared_event_outside_plan',severity:'blocking'});
 }
 return issues;
}
export function withPrevalidationIssues(report:PlanPrevalidation,extra:PrevalidationIssue[]):PlanPrevalidation {
 const issues=[...new Map([...report.issues,...extra].map(i=>[`${i.week}:${i.code}:${i.severity}`,i])).values()];
 return {...report,issues,status:issues.some(i=>i.severity==='blocking')?'blocked':issues.length?'coach_review':'admissible'};
}
