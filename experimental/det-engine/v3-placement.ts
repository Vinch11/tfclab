/** Whole-session relocation by same-week, same-sport transposition. No new dose or workout. */
import type {PlanAthleteData,PlanConfig} from '@/hooks/useAITrainingPlan';
import {prepareGenerationContracts} from '@/lib/plan/prepareGenerationContracts';
import {assessPreparedGeneration} from '@/lib/plan/prevalidateTrainingPlan';
import {checkSessionCatalogue} from '../../supabase/functions/_shared/sessionCatalogueContract';
import {isRaceDaySession} from '../../supabase/functions/_shared/raceDayIdentity';
import type {V2Result} from './v2-engine';import {assessRepairQuality} from './v3-quality';
import {criticalCounts,noNewCritical,validateExperimentalCandidate} from './v2-validation';
export function repairPlacement(initial:V2Result,athlete:PlanAthleteData,config:PlanConfig,maxAttempts=16){
 const result=structuredClone(initial),records=[];if(!result.candidate)return {result,records};
 if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>64)throw Error('INVALID_PLACEMENT_BUDGET');
 const prep=prepareGenerationContracts(athlete,config,{rotationSeed:0}),report=assessPreparedGeneration(config,prep);
 const metadata=[...Object.values(prep.phaseRepairCatalogs).flat(),...prep.chunkRepairCatalogs.flat(),...prep.chunkRegenRepairCatalogs.flat()];
 const plan=result.candidate;const total=(issues:typeof result.issues)=>Object.values(criticalCounts(issues)).reduce((a,b)=>a+b,0);
 for(const week of plan.weeks){
  if(records.length>=maxAttempts)break;
  const errors=result.issues.filter(i=>['error','critical','blocking'].includes(i.severity)&&(i.week===week.weekNumber||i.message?.startsWith(`S${week.weekNumber}:`)));
  if(!errors.length)continue;
  const entry=prep.weeklyQuotas[week.weekNumber],eligible=new Set(report.weeks.find(w=>w.week===week.weekNumber)?.eligible.map(m=>m.id));if(!entry)continue;
  let acceptedInWeek=false;
  for(let a=0;a<week.sessions.length&&!acceptedInWeek&&records.length<maxAttempts;a++)for(let b=a+1;b<week.sessions.length&&!acceptedInWeek&&records.length<maxAttempts;b++){
   const first=week.sessions[a],second=week.sessions[b];
   if(first.isRest||second.isRest||first.sport!==second.sport||first.dayIndex===second.dayIndex||!first.catalogId||!second.catalogId||isRaceDaySession(first)||isRaceDaySession(second))continue;
   const relocated=(session:typeof first,to:typeof first)=>({...session,dayIndex:to.dayIndex,dayName:to.dayName});
   const moved=[relocated(second,first),relocated(first,second)];
   if(moved.some(s=>{
    const slot=entry.layout?.days[s.dayIndex]?.slots.find(slot=>slot.sport===s.sport&&!slot.isRaceEvent);
    if(!slot||!eligible.has(s.catalogId!)||(s.durationMin??0)<(slot.minDurationMin??0)||(s.durationMin??0)>(slot.maxDurationMin??Infinity))return true;
    const checked=checkSessionCatalogue(s,{objective:config.objective,phase:week.phase,weekType:entry.weekType,catalog:metadata});return checked.errors.length||checked.unknown.length;
   }))continue;
   const oldPlan=structuredClone(plan);week.sessions[a]=moved[0];week.sessions[b]=moved[1];
   const issues=[...result.issues.filter(i=>i.message===undefined),...validateExperimentalCandidate(plan,athlete,config)];
   const quality=assessRepairQuality(result.issues,issues,oldPlan,plan);
   const accepted=noNewCritical(result.issues,issues)&&quality.accepted&&total(issues)<total(result.issues);
   records.push({week:week.weekNumber,indices:[a,b],ids:[first.catalogId,second.catalogId],daysBefore:[first.dayIndex,second.dayIndex],
    accepted,reason:accepted?'same_dose_better_placement':!quality.accepted?quality.reason:'no_critical_improvement_or_regression',
    addedWarnings:quality.addedWarnings,worsenedProgression:quality.worsenedProgression,beforeCritical:criticalCounts(result.issues),afterCritical:criticalCounts(issues),
    changedFields:['dayIndex','dayName'],controls:result.coverage.executedControls});
   if(accepted){result.issues=issues;acceptedInWeek=true;}else{week.sessions[a]=first;week.sessions[b]=second;}
  }
 }
 result.constraintsSatisfied=!result.issues.some(i=>['error','critical','blocking'].includes(i.severity));
 if(records.some(r=>r.accepted))result.trace=plan.weeks.flatMap(w=>w.sessions.filter(s=>s.catalogId).map(s=>({week:w.weekNumber,day:s.dayName,id:s.catalogId!,duration:s.durationMin!,intent:metadata.find(m=>m.id===s.catalogId)?.intentFamily??'other',reason:'Placement V3 audité ; doses et catalogue inchangés, chaque transposition enregistrée.'})));
 return {result,records};
}
