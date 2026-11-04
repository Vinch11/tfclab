/** Offline repair proposals. Every accepted proposal is independently revalidated. */
import type { PlanAthleteData, PlanConfig } from '@/hooks/useAITrainingPlan';
import type { ParsedPlan, ParsedSession } from '@/lib/aiPlanParser';
import { derivePhasesFromWeeks } from '@/engines/plan/planValidator';
import { prepareGenerationContracts } from '@/lib/plan/prepareGenerationContracts';
import { assessPreparedGeneration } from '@/lib/plan/prevalidateTrainingPlan';
import { WorkoutLibrary } from '@/lib/workoutLibrary';
import { resolveCanonicalDuration } from '@/lib/plan/workoutDurationResolver';
import { resolveLimiterKey, LIMITER_SESSION_PATTERNS } from '@/lib/limiterSessionPatterns';
import { checkSessionCatalogue } from '../../supabase/functions/_shared/sessionCatalogueContract';
import { evaluateRepairSportingEquivalence, normalizeRepairSport } from '../../supabase/functions/_shared/repairSportingEquivalence';
import { isRaceDaySession } from '../../supabase/functions/_shared/raceDayIdentity';
import { constructDeterministicPlan, type EngineResult, type SearchLimits } from './engine';
import { criticalCounts,noNewCritical,validateExperimentalCandidate,validationCoverage } from './v2-validation';
export interface RepairRecord {attempt:number;defect:string[];rule:string;action:string;week:number;session:number;
 before:{id:string|null|undefined;duration:number|undefined};after:{id:string;duration:number};
 changedFields:string[];proposalKey?:string;beforeCritical:Record<string,number>;afterCritical:Record<string,number>;accepted:boolean;reason:string;controls:string[];
 qualityGuard?:{accepted:boolean;reason:string;[key:string]:unknown};}
export interface RepairBudget {maxAttempts:number;maxAccepted:number;}
export type RepairGuard=(beforeIssues:EngineResult['issues'],afterIssues:EngineResult['issues'],beforePlan:ParsedPlan,afterPlan:ParsedPlan)=>{accepted:boolean;reason:string;[key:string]:unknown};
export type V2Result=EngineResult & {version:'det-v2';repairs:RepairRecord[];effectiveAmbition:string|undefined;
 physiologicalContext:PlanConfig['physiologicalTrace'];coverage:ReturnType<typeof validationCoverage>};
const BY_ID=new Map(WorkoutLibrary.map(w=>[w.id,w]));
const countCritical=(r:EngineResult['issues'])=>Object.values(criticalCounts(r)).reduce((n,c)=>n+c,0);
/** A measured invalid candidate is retained as invalid, never silently relabelled as a refusal/success. */
export function contextualizeResult(raw:EngineResult,athlete:PlanAthleteData,config:PlanConfig):V2Result{
 const candidate=raw.candidate?structuredClone(raw.candidate):undefined;
 if(candidate)candidate.phases=derivePhasesFromWeeks(candidate);
 // Legacy assembly/prevalidation issues have no prose message; preserve ALL of them, including warnings.
 const retained=raw.issues.filter(i=>i.message===undefined).map(i=>({...i,control:'existing_prevalidation'}));
 const issues=candidate?[...retained,...validateExperimentalCandidate(candidate,athlete,config)]:raw.issues.map(i=>({...i,control:'existing_prevalidation'}));
 return {...raw,candidate,issues,constraintsSatisfied:!!candidate&&!issues.some(i=>['error','critical','blocking'].includes(i.severity)),
 version:'det-v2',repairs:[],effectiveAmbition:config.ambition,physiologicalContext:config.physiologicalTrace,coverage:validationCoverage(candidate,config)};
}
export function repairDeterministicCandidate(initial:V2Result,athlete:PlanAthleteData,config:PlanConfig,
 budget:RepairBudget={maxAttempts:48,maxAccepted:6},guard?:RepairGuard):V2Result{
 if(!initial.candidate)return initial;
 if(!Number.isInteger(budget.maxAttempts)||budget.maxAttempts<=0||budget.maxAttempts>256||!Number.isInteger(budget.maxAccepted)||budget.maxAccepted<=0||budget.maxAccepted>12)return {...structuredClone(initial),issues:[...initial.issues,{code:'invalid_repair_budget',severity:'warning'}]};
 const result=structuredClone(initial),plan=result.candidate!;
 const prep=prepareGenerationContracts(athlete,config,{rotationSeed:0}),report=assessPreparedGeneration(config,prep);
 const metadata=[...new Map([...Object.values(prep.phaseRepairCatalogs).flat(),...prep.chunkRepairCatalogs.flat(),...prep.chunkRegenRepairCatalogs.flat()].map(m=>[m.id,m])).values()];
 const byId=new Map(metadata.map(m=>[m.id,m]));
 const keys=(config.identifiedLimitersRaw??[]).map(resolveLimiterKey).filter((k):k is string=>!!k);
 const proposalKey=(week:number,session:number,old:ParsedSession,id:string,duration:number,counts:Record<string,number>)=>JSON.stringify([week,session,old.catalogId,old.durationMin,id,duration,Object.entries(counts).sort(([a],[b])=>a.localeCompare(b))]);
 const rejected=new Set(result.repairs.filter(r=>!r.accepted).map(r=>r.proposalKey??proposalKey(r.week,r.session,{catalogId:r.before.id,durationMin:r.before.duration} as ParsedSession,r.after.id,r.after.duration,r.beforeCritical)));
 const startingAttempts=result.repairs.length;
 let accepted=0;
 for(const week of plan.weeks){
  const w=report.weeks.find(w=>w.week===week.weekNumber);if(!w)continue;
  const weekErrors=result.issues.filter(i=>['error','critical'].includes(i.severity)&&(i.week===week.weekNumber||(!i.week&&i.message?.startsWith(`S${week.weekNumber}:`))));
  const score=(s:ParsedSession)=>weekErrors.reduce((n,i)=>n+(i.message?.includes(s.catalogId??'__none__')||i.message?.includes(s.title)?100:0),0)+(byId.get(s.catalogId??'')?.mainZoneMax??0);
  const indices=week.sessions.map((s,index)=>({index,score:score(s)})).sort((a,b)=>b.score-a.score||a.index-b.index);
  for(const {index} of indices){
   if(result.repairs.length-startingAttempts>=budget.maxAttempts||accepted>=budget.maxAccepted)break;
   const old=week.sessions[index];if(old.isRest||!old.catalogId||isRaceDaySession(old))continue;
   const defects=result.issues.filter(i=>['error','critical'].includes(i.severity)&&(i.week===week.weekNumber||(!i.week&&i.message?.startsWith(`S${week.weekNumber}:`))));
   if(!defects.length)continue;
   const original=byId.get(old.catalogId);if(!original)continue;
   const context={objective:config.objective,phase:week.phase,weekType:plan.weeklyQuotas?.[week.weekNumber]?.weekType,operation:'replacement' as const};
   const reduce=defects.some(i=>['polarization','demanding_session_accumulation','weekly_hard_day_density','coach_load_violation'].includes(i.code));
   const ids=new Set(w.eligible.map(m=>m.id));
   const alternatives=metadata.filter(m=>ids.has(m.id)&&normalizeRepairSport(m.sport)===old.sport&&m.id!==old.catalogId&&
    !week.sessions.some(s=>s.catalogId===m.id)&&evaluateRepairSportingEquivalence(original,m,{...context,
     allowedCandidateIntentFamilies:reduce?['endurance_fondamentale','recuperation','technique']:undefined}).compatible)
    .sort((a,b)=>{
     // Reuse the existing limiter vocabulary; diversity only breaks equivalent candidates.
     const rank=(m:typeof original)=>keys.findIndex(k=>LIMITER_SESSION_PATTERNS[k].test(`${m.title} ${m.structure} ${m.tags.join(' ')}`));
     const ar=rank(a),br=rank(b);return (ar<0?999:ar)-(br<0?999:br)||a.id.localeCompare(b.id);
    }).slice(0,8);
   for(const m of alternatives){
    if(result.repairs.length-startingAttempts>=budget.maxAttempts||accepted>=budget.maxAccepted)break;
    const slot=prep.weeklyQuotas[week.weekNumber]?.layout?.days[old.dayIndex]?.slots.find(s=>s.sport===old.sport);
    const lo=Math.max(m.durationMin[0],slot?.minDurationMin??0),hi=Math.min(m.durationMin[1],slot?.maxDurationMin??Infinity);
    if(lo>hi)continue;
    const duration=Math.max(lo,Math.min(hi,old.durationMin??resolveCanonicalDuration(BY_ID.get(m.id)!,week.phase as 'base')));
    const proposal:ParsedSession={...old,catalogId:m.id,title:m.title,details:m.structure,durationMin:duration,variantKey:undefined,
     zones:m.zones.length?m.zones:m.mainZoneMax?[`Z${m.mainZoneMax}`]:[]};
    const contract=checkSessionCatalogue(proposal,{...context,catalog:metadata});if(contract.errors.length||contract.unknown.length)continue;
    const key=proposalKey(week.weekNumber,index,old,m.id,duration,criticalCounts(result.issues));
    if(rejected.has(key))continue; // The same plan/error state has already falsified this exact proposal.
    const beforePlan=guard?structuredClone(plan):undefined;
    week.sessions[index]=proposal;
    const nextIssues=[...result.issues.filter(i=>i.message===undefined),...validateExperimentalCandidate(plan,athlete,config)];
    const quality=guard?.(result.issues,nextIssues,beforePlan!,plan);
    const improves=countCritical(nextIssues)<countCritical(result.issues)&&noNewCritical(result.issues,nextIssues)&&quality?.accepted!==false;
    result.repairs.push({attempt:result.repairs.length+1,defect:[...new Set(defects.map(i=>i.code))],rule:'existing_compatibility_and_full_validation',
     action:reduce?'catalogue_replacement_with_explicit_load_reduction':'sporting_equivalent_catalogue_replacement',week:week.weekNumber,session:index,
     before:{id:old.catalogId,duration:old.durationMin},after:{id:m.id,duration},changedFields:['catalogId','title','details','durationMin','zones','variantKey'].filter(key=>JSON.stringify(old[key as keyof ParsedSession])!==JSON.stringify(proposal[key as keyof ParsedSession])),beforeCritical:criticalCounts(result.issues),afterCritical:criticalCounts(nextIssues),
     proposalKey:key,accepted:improves,reason:improves?'fewer_errors_no_new_critical_per_rule_and_week':quality?.accepted===false?quality.reason:'rejected_no_strict_improvement_or_new_critical',qualityGuard:quality?structuredClone(quality):undefined,controls:initial.coverage.executedControls});
    if(improves){result.issues=nextIssues;accepted++;break;}
    rejected.add(key);week.sessions[index]=old;
   }
  }
 }
 result.constraintsSatisfied=!result.issues.some(i=>['error','critical','blocking'].includes(i.severity));
 result.coverage=validationCoverage(plan,config);
 // Rebuild trace from the final candidate; preserve audit records for every attempted change.
 result.trace=plan.weeks.flatMap(w=>w.sessions.filter(s=>s.catalogId).map(s=>({week:w.weekNumber,day:s.dayName,id:s.catalogId!,duration:s.durationMin!,
  intent:byId.get(s.catalogId!)?.intentFamily??'other',reason:result.repairs.some(r=>r.accepted&&r.week===w.weekNumber&&r.after.id===s.catalogId)?'Réparation enregistrée et revalidée sans nouvelle erreur critique.':'Prescription initiale conservée ; contrôles V2 explicites.'})));
 return result;
}
export function constructDeterministicPlanV2(athlete:PlanAthleteData,config:PlanConfig,
 limits:SearchLimits={maxNodes:5000,maxMilliseconds:30000},budget?:RepairBudget):V2Result{
 return repairDeterministicCandidate(contextualizeResult(constructDeterministicPlan(athlete,config,limits),athlete,config),athlete,config,budget);
}
