/** Whole-plan duration proposals inside unchanged catalogue/slot bounds. Never invents sessions. */
import type {PlanAthleteData,PlanConfig} from '@/hooks/useAITrainingPlan';
import {prepareGenerationContracts} from '@/lib/plan/prepareGenerationContracts';
import {checkSessionCatalogue} from '../../supabase/functions/_shared/sessionCatalogueContract';
import type {V2Result} from './v2-engine';
import {criticalCounts,noNewCritical,validateExperimentalCandidate} from './v2-validation';
import {assessRepairQuality,warningDeltas,progressionExposure} from './v3-quality';
export function repairProgression(initial:V2Result,athlete:PlanAthleteData,config:PlanConfig,maxAttempts=12){
 const result=structuredClone(initial),records=[];
 if(!result.candidate)return {result,records};
 if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>48)throw Error('INVALID_PROGRESSION_BUDGET');
 const prep=prepareGenerationContracts(athlete,config,{rotationSeed:0});
 const metadata=[...Object.values(prep.phaseRepairCatalogs).flat(),...prep.chunkRepairCatalogs.flat(),...prep.chunkRegenRepairCatalogs.flat()];
 const plan=result.candidate;
 for(const week of plan.weeks){
  if(records.length>=maxAttempts)break;
  const entry=prep.weeklyQuotas[week.weekNumber];if(!entry||entry.weekType!=='load')continue;
  // Also inspect the previous week: a local reduction can increase the next week's jump.
  if(!result.issues.some(i=>i.code==='progression'&&(i.week===week.weekNumber||i.week===week.weekNumber+1)&&i.severity==='warning'))continue;
  for(let index=0;index<week.sessions.length&&records.length<maxAttempts;index++){
   const session=week.sessions[index],card=metadata.find(m=>m.id===session.catalogId);
   if(!card||session.isRest||!session.durationMin)continue;
   const slot=entry.layout?.days[session.dayIndex]?.slots.find(s=>s.sport===session.sport&&!s.isRaceEvent);if(!slot)continue;
   const low=Math.max(card.durationMin[0],slot.minDurationMin??0),high=Math.min(card.durationMin[1],slot.maxDurationMin??Infinity);
   if(low>high)continue;
   const exposures=progressionExposure(plan),position=exposures.findIndex(w=>w.week===week.weekNumber);
   const key=session.sport==='run'?'longestRun':session.sport==='bike'?'longestBike':undefined;
   const neighbor=key?[exposures[position-1]?.[key],exposures[position+1]?.[key]].filter((x):x is number=>!!x):[];
   // Never inflate an earlier week merely to lower the denominator of a future jump.
   // A genuine dose increase requires a physiological rationale beyond removing a validator warning.
   const doses=[...new Set([...neighbor,low].map(x=>Math.max(low,Math.min(high,x))))].filter(n=>n<session.durationMin!&&Number.isFinite(n)).sort((a,b)=>Math.abs(a-session.durationMin!)-Math.abs(b-session.durationMin!));
   for(const dose of doses){
    if(records.length>=maxAttempts)break;
    const old=structuredClone(plan),oldDose=session.durationMin;
    session.durationMin=dose;
    const contract=checkSessionCatalogue(session,{objective:config.objective,phase:week.phase,weekType:entry.weekType,catalog:metadata});
    if(contract.errors.length||contract.unknown.length){session.durationMin=oldDose;continue;}
    const issues=[...result.issues.filter(i=>i.message===undefined),...validateExperimentalCandidate(plan,athlete,config)];
    const quality=assessRepairQuality(result.issues,issues,old,plan);
    const removedProgressionWarnings=warningDeltas(result.issues,issues).filter(d=>d.delta<0&&d.issue.code==='progression').reduce((n,d)=>n-d.delta,0);
    const critical=(items:typeof issues)=>Object.values(criticalCounts(items)).reduce((a,b)=>a+b,0);
    const accepted=noNewCritical(result.issues,issues)&&quality.accepted&&(removedProgressionWarnings>0||critical(issues)<critical(result.issues));
    records.push({week:week.weekNumber,session:index,id:session.catalogId,before:oldDose,after:dose,accepted,removedProgressionWarnings,
     reason:accepted?'whole_plan_progression_improved':!quality.accepted?quality.reason:'no_measured_progress_or_critical_regression',
     addedWarnings:quality.addedWarnings,worsenedProgression:quality.worsenedProgression,beforeCritical:criticalCounts(result.issues),afterCritical:criticalCounts(issues)});
    if(accepted){result.issues=issues;break;}
    session.durationMin=oldDose;
   }
  }
 }
 result.constraintsSatisfied=!result.issues.some(i=>['error','critical','blocking'].includes(i.severity));
 if(records.some(r=>r.accepted))result.trace=plan.weeks.flatMap(w=>w.sessions.filter(s=>s.catalogId).map(s=>({week:w.weekNumber,day:s.dayName,id:s.catalogId!,duration:s.durationMin!,intent:metadata.find(m=>m.id===s.catalogId)?.intentFamily??'other',reason:records.some(r=>r.accepted&&r.week===w.weekNumber&&r.id===s.catalogId)?'Ajustement de durée enregistré ; progression globale et avertissements revalidés.':'Prescription précédente conservée.'})));
 return {result,records};
}
