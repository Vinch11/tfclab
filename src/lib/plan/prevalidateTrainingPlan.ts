import {detectLcwFromConfig,computeLcwChunkSize} from "../../../supabase/functions/_shared/lcwChunkSizing";
import type { PlanConfig, PlanAthleteData } from '@/hooks/useAITrainingPlan';
import { prepareGenerationContracts } from './prepareGenerationContracts';
import { prevalidatePlanWeeks, prevalidateDeclaredCalendar, withPrevalidationIssues } from '../../../supabase/functions/_shared/planPrevalidation';
export function assessPreparedGeneration(config:PlanConfig,prepared:ReturnType<typeof prepareGenerationContracts>) {
 const standardSize=prepared.chunksForQuota[0]?.end??config.weeksAvailable??1;
 const effectiveSize=config._outputFormat==="json"&&!config.windowRegenPhase&&prepared.chunksForQuota.length>1&&detectLcwFromConfig(config)
  ? computeLcwChunkSize(config.weeksAvailable??0,standardSize,w=>prepared.phaseCalendar?.[w]??"base") : standardSize;
 const report=prevalidatePlanWeeks(Array.from({length:config.weeksAvailable??0},(_,i)=>{
  const week=i+1,entry=prepared.weeklyQuotas[week];
  const chunk=Math.floor((week-1)/effectiveSize);
  const chunkStart=chunk*effectiveSize+1;
  const primary=prepared.chunkRepairCatalogs[chunk]?.length?prepared.chunkRepairCatalogs[chunk]
   : prepared.phaseRepairCatalogs[config.windowRegenPhase??prepared.phaseCalendar?.[chunkStart]??'base']??[];
  const regen=prepared.chunkRegenRepairCatalogs[chunk]??[];
  return {week,globalWeek:week+(config.globalWeekOffset??0),phase:entry?.phase??prepared.phaseCalendar?.[week],expectedPhase:config.windowWeekPhases?.[week],weekType:entry?.weekType,
   objective:prepared.catalogObjective,quota:entry?.quota,layout:entry?.layout,volumeBudget:entry?.volumeBudget,
   dayBans:prepared.dayBans,catalog:[...new Map([...primary,...regen].map(m=>[m.id,m])).values()]};
 }),config);
 report.limiterPriorities=[...(config.identifiedLimitersRaw??[])];
 if((typeof config.weeklyHours!=="number"||config.weeklyHours<=0||config.weeklyHoursSource==="internal-matrix")&&(config.globalWeekOffset??0)===0&&!report.issues.some(i=>i.code==="coach_initial_load_unverified")) {
  report.issues.push({week:1,code:"coach_initial_load_unverified",severity:"warning"});
  if(report.status==="admissible")report.status="coach_review";
 }
 return config.globalTotalWeeks===undefined?withPrevalidationIssues(report,prevalidateDeclaredCalendar(config,config.weeksAvailable??0)):report;
}
/** Public read-only preview: same preparation as generation, no auth/database/model.
 * A fixed seed makes fixture comparisons reproducible; actual generation assesses
 * its exact historical rotation and seed again before making a request. */
export function prevalidateTrainingPlan(athlete:PlanAthleteData,config:PlanConfig,options:Parameters<typeof prepareGenerationContracts>[2]={}) {
 const preparation=prepareGenerationContracts(athlete,config,options);
 return {preparation,report:assessPreparedGeneration(config,preparation)};
}
