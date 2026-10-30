/** Experimental validation adapter: original sporting rules, explicit conditional coverage. */
import type { PlanAthleteData, PlanConfig } from '@/hooks/useAITrainingPlan';
import type { ParsedPlan } from '@/lib/aiPlanParser';
import { validatePlan } from '@/engines/plan/planValidator';
import { validateWeeklyQuotas } from '@/lib/plan/validateWeeklyQuotas';
import { computeFinalValidationIssues } from '@/lib/plan/qa/finalValidation';
import { resolveLimiterKey } from '@/lib/limiterSessionPatterns';
import { auditSportsContinuity } from './v2-sports-validation';
import type { EngineResult } from './engine';
export const V2_CONTROLS=[{id:'existing_prevalidation',version:'3a2ba77'}, {id:'weekly_quotas',version:'3a2ba77'},
 {id:'plan_validator_complete_context',version:'2'}, {id:'final_B13_B14_B15',version:'3a2ba77'},
 {id:'sports_continuity_audit',version:'2'}];
export type V2Issue=EngineResult['issues'][number]&{control?:string};
export function criticalCounts(issues:V2Issue[]):Record<string,number>{
 const counts:Record<string,number>={};
 for(const i of issues)if(['error','critical','blocking'].includes(i.severity)){
  // B13/B14 legacy issues carry a week in prose only; preserve it rather than pool all weeks.
  const week=i.week??Number(i.message?.match(/^S(\d+)\s*:/)?.[1]??0);
  const key=`${i.code}:${week}`;counts[key]=(counts[key]??0)+1;
 }
 return counts;
}
export function noNewCritical(before:V2Issue[],after:V2Issue[]):boolean{
 const old=criticalCounts(before);return Object.entries(criticalCounts(after)).every(([key,count])=>count<=(old[key]??0));
}
export function validateExperimentalCandidate(plan:ParsedPlan,athlete:PlanAthleteData,config:PlanConfig):V2Issue[]{
 const issues:V2Issue[]=[];
 if(plan.weeklyQuotas){
  const merged={...plan,weeks:plan.weeks.map(w=>({...w,sessions:w.sessions.map(s=>({...s,isKeySession:!!s.isKeySession,
   catalogId:s.catalogId??null,custom:!!s.custom,durationMin:s.durationMin??0,zones:s.zones??[]}))}))};
  issues.push(...validateWeeklyQuotas(merged,plan.weeklyQuotas).map(i=>({code:i.code,week:i.weekNumber,severity:i.severity,message:i.reason,control:'weekly_quotas'})));
 }
 const keys=(config.identifiedLimitersRaw??[]).map(resolveLimiterKey).filter((x):x is string=>!!x);
 const meta=config.ambitionMeta;
 const result=validatePlan(plan,config.objective,config.prohibitions,undefined,config.identifiedLimitersRaw,keys,athlete,
  config.identifiedLimitersRaw,{sessionsPerWeek:config.sessionsPerWeek,maxSessionsPerDay:config.maxSessionsPerDay,maxDoubleDaysPerWeek:config.maxDoubleDaysPerWeek},
  config.injuryRisk,config.ambition,config.constraints,config.raceGoals?.some(g=>g.raceFormat==='lcw_3day'),config.deloadCadenceWeeks,
  meta?{trainingLevel:meta.trainingLevel,trainingLevelSource:meta.trainingLevelSource}:undefined,config.raceGoals,config.planStartDate,
  {maxAvailableWeeklyHours:config.weeklyHours,...config.loadHistory},
  meta?{saisie:meta.saisie,effective:meta.effective,downgraded:meta.downgraded,reason:meta.diagnosticNote}:undefined,config.strengthSessionsPerWeek);
 issues.push(...result.issues.map(i=>({code:i.rule,week:i.week,severity:i.severity,message:i.message,control:'plan_validator_complete_context'})));
 const final=computeFinalValidationIssues(plan,[],{objective:config.objective,ambition:config.ambition??'finisher',vmaKmh:athlete.vma,thresholdPaceSecPerKm:athlete.paceThresholdSecPerKm});
 issues.push(...final.issues.map(i=>({code:i.rule,severity:i.severity,message:i.message,control:'final_B13_B14_B15'})));
 for(const control of auditSportsContinuity(plan,config).controls)
  if(control.classification==='contract'&&control.result==='fail')issues.push({code:control.id,severity:'error',message:`Contrat sportif existant non respecté : ${control.id}`,control:'sports_continuity_audit'});
 return issues;
}
export function validationCoverage(plan:ParsedPlan|undefined,config:PlanConfig){
 const keys=(config.identifiedLimitersRaw??[]).map(resolveLimiterKey).filter(Boolean);
 return {executedControls:plan?V2_CONTROLS.map(c=>c.id).filter(id=>id!=='weekly_quotas'||!!plan.weeklyQuotas):config.objective==='StartToRun'?[]:['existing_prevalidation'],
 conditional:{limiterKeys:keys.length?'executed':'not_applicable',coachOrder:config.identifiedLimitersRaw?.length?'executed':'not_applicable',
 loadHistory:config.loadHistory?'executed':'not_applicable',ambitionAudit:config.ambitionMeta?'executed':'not_applicable',
 physiologicalResponse:'not_implemented',generalSportingRelevance:'expert_review_required'},sportsAudit:auditSportsContinuity(plan,config)};
}
