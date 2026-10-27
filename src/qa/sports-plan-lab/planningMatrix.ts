import { catalogueWeeklyUsageCapacity } from '../../../supabase/functions/_shared/catalogueWeeklyFrequency';
import { calendarCapacityEvidence } from './residualEvidence';
import { getCatalogSportFilter, getCatalogExclusions } from "@/hooks/useAITrainingPlan";
import { planningFeasibility } from "@/lib/plan/planningFeasibility";
/** Offline contract matrix. No model, persistence backend, deployment or athlete records. */
import type { ObjectifType } from "@/types/athlete";
import { AMBITION_DEFINITIONS, type AmbitionLevel } from "@/types/ambitionLevel";
import { AMBITION_MAX_BY_LEVEL, type CoachTrainingLevel } from "@/lib/ambitionDowngrade";
import { QA_PROFILES, type QAProfileId } from "@/lib/plan/qa/syntheticProfiles";
import { buildPilotDiagnosticInput, buildPilotFormConfig } from "@/lib/plan/qa/preparePilotTrainingPlanContext";
import { prepareTrainingPlanContext } from "@/engines/plan/prepareTrainingPlanContext";
import { buildPeriodizationCalendar } from "@/lib/plan/periodizationCalendar";
import { buildWorkoutCatalog, serializeCatalogForPrompt, toInjuryRiskCatalogOption, resetCatalogAttribution, getCatalogAttribution } from "@/lib/workoutCatalogBuilder";
import { normalizeObjectiveKey } from "@/lib/normalizeObjectiveKey";
import { buildRepairWorkoutMetadata } from "@/lib/plan/repairCatalogMetadata";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import { buildWeeklySlotLayout } from "@/engines/plan/weeklySlotLayout";
import { computeWeekQuotaEntry, inferWeekType, applySlFloorIndividualization, buildCoachVolumeBudget } from "@/engines/plan/sessionSizingMatrix";
import { parseAthleteConstraints } from "@/lib/plan/constraintRules";
import { catalogueForWeek, checkSessionCatalogue, catalogueEligibility, executableCatalogueDurationRanges } from "../../../supabase/functions/_shared/sessionCatalogueContract";
import { normalizeRepairSport } from "../../../supabase/functions/_shared/repairSportingEquivalence";
import { catalogueTrainingMinimaForWeek, declaredRaceSlotsForWeek } from "../../../supabase/functions/_shared/catalogueTrainingMinima";
import { extractCatalogIdsFromDump } from "../../../supabase/functions/_shared/catalogueIds";
import { effectiveSessionQuota } from "../../../supabase/functions/_shared/sessionQuotaAccounting";

export const OBJECTIVE_PROFILE = {
 IM:"B-IM", "703":"B-70.3", Sprint:"B-SPRINT", Olympic:"B-OLYMPIC", Marathon:"B-MARATHON", Semi:"B-SEMI",
 "5K":"B-5K", "10K":"B-10K", StartToRun:"B-STARTTORUN", Trail:"B-TRAIL-SHORT", TrailShort:"B-TRAIL-SHORT", TrailMountain:"B-TRAIL-MOUNTAIN", TrailUltra:"B-TRAIL-ULTRA",
} satisfies Record<ObjectifType, QAProfileId>;
const objectives=Object.keys(OBJECTIVE_PROFILE) as ObjectifType[];
const levels=Object.keys(AMBITION_MAX_BY_LEVEL) as CoachTrainingLevel[];
const ambitions=Object.keys(AMBITION_DEFINITIONS) as AmbitionLevel[];
const archetypes=["aerobic_dominant","glycolytic_dominant","balanced_typical","atypical_extreme","master_40plus"];
const constraints=["unrestricted","heavily_constrained","limited_terrain","recent_injury"];
export interface PlanningCase { id:string; objective:ObjectifType; level:CoachTrainingLevel; ambition:AmbitionLevel; load:"known_synthetic"|"unknown"; physiology:string; constraints:string; duration:"shorter"|"native"|"longer"; intermediate:boolean; format?:"lcw_3day"; }
export function planningCases(): PlanningCase[] {
 return objectives.flatMap((objective,o)=>levels.flatMap((level,l)=>ambitions.flatMap((ambition,a)=>(["unknown","known_synthetic"] as const).map((load,k)=>({
  id:`${objective}:${level}:${ambition}:${load}`,objective,level,ambition,load,
  physiology:archetypes[(o+l+a+k)%archetypes.length],constraints:constraints[(o+2*l+a+Math.floor(a/2)+k)%constraints.length],
  duration:(["shorter","native","longer"] as const)[(o+l+2*a+k)%3],intermediate:(o+Math.floor(l/2)+a+k)%2===1,
 })))));
}
export function supplementaryPlanningCases(): PlanningCase[] {
 return planningCases().filter(c=>["703","IM"].includes(c.objective)).map(c=>({...c,id:c.id+":lcw_3day",format:"lcw_3day"}));
}
export interface MatrixRow {
 id:string; objective:ObjectifType; level:CoachTrainingLevel; ambition:AmbitionLevel; effectiveAmbition?:string; load:string;
 physiology:string; constraints:string; duration:string; intermediate:boolean; weeks:number;
 dataQuality?:string; format?:"lcw_3day";
 configuration:"passed"|"failed"; quotaPath:string; preparationIssues:Record<string,number>;
 weekly: Array<{week:number;phase:string;weekType:string;catalog:number;missingSports:string[];layoutMissing:number;quotaContradictions:number;preflight:string[];exclusions:Record<string,number>}>;
 residuals?: Array<{week:number;phase:string;weekType:string;mechanical?:ReturnType<typeof calendarCapacityEvidence>;
 catalogue?:Array<{sport:string;required:number;limitedDiversity:boolean;selectedEligibleIds:string[];uncappedEligibleIds:string[];
 candidates:Array<{id:string;durationMin:[number,number];phases:string[];intent:string;zone:number;when:string;weeklyUsageCap:number|null;selected:boolean;uncapped:boolean;eligibilityReasons:string[];pipelineStage?:string}>}>}>;
 limiterOrder:string[]; catalogueSignature:string[]; promptMaxChars:number; examples:Array<{week:number;code:string;id?:string;minimum?:number;maximum?:number}>;
 completePlanConstruction:"static_route_available"|"not_attested_without_matching_recorded_model_output";
 sportingSafety:"not_attested"; scientificValidation:"requires_human_review";
}
function add(out:Record<string,number>,code:string,n=1){ if(n) out[code]=(out[code]??0)+n; }
export function preparePlanningCaseContext(spec:PlanningCase) {
 const base=QA_PROFILES.find(p=>p.id===OBJECTIVE_PROFILE[spec.objective])!;
 const physiology=QA_PROFILES.find(p=>p.physiologyArchetype===spec.physiology)!;

 const constrained=QA_PROFILES.find(p=>p.constraintsProfile===spec.constraints)!;
 const profile={...structuredClone(base),athleteData:{...structuredClone(physiology.athleteData),nom:"QA offline"}};
 const weeks=spec.objective==="StartToRun"?12:Math.max(4,(base.planConfig.weeksAvailable??12)+(spec.duration==="shorter"?-4:spec.duration==="longer"?4:0));

 const date=(days:number)=>new Date(Date.UTC(2026,9,26+days)).toISOString().slice(0,10);
 const raceGoals=spec.objective==="StartToRun"?[]:[{objective:spec.objective,raceDate:date(weeks*7-1),priority:"A" as const,...(spec.format?{raceFormat:spec.format}:{})},...(spec.intermediate?[{objective:["IM","703","Sprint","Olympic"].includes(spec.objective)?"10K":spec.objective,raceDate:date(Math.floor(weeks/2)*7-2),priority:"B" as const}]:[])];
 const input=buildPilotDiagnosticInput(profile);
 input.objectif=spec.objective; input.ambition=spec.ambition;
 input.tss7d=spec.load==="known_synthetic"?120:null;
 input.snapshotDate=spec.load==="known_synthetic"?"2026-10-26":null;
 const prepared=prepareTrainingPlanContext({diagnosticInput:input,athleteData:profile.athleteData,
   formConfig:{...buildPilotFormConfig(base.planConfig),objective:spec.objective,ambition:spec.ambition,trainingLevel:spec.level,
    weeklyHours:spec.load==="known_synthetic"?base.planConfig.weeklyHours:undefined,sessionsPerWeek:undefined,weeksAvailable:weeks,
    planStartDate:"2026-10-26",raceGoals,constraints:constrained.planConfig.constraints,terrainAvailability:constrained.planConfig.terrainAvailability},
  });
 return {profile,prepared,weeks,dataQuality:physiology.dataQuality};
}
export function evaluatePlanningCase(spec:PlanningCase): MatrixRow {
 const row:MatrixRow={...spec,weeks:0,configuration:"failed",quotaPath:"not_reached",preparationIssues:{},weekly:[],limiterOrder:[],catalogueSignature:[],promptMaxChars:0,examples:[],completePlanConstruction:spec.objective==="StartToRun"?"static_route_available":"not_attested_without_matching_recorded_model_output",sportingSafety:"not_attested",scientificValidation:"requires_human_review"};
 try {
  const {profile,prepared,weeks,dataQuality}=preparePlanningCaseContext(spec);
  row.weeks=weeks;row.dataQuality=dataQuality;
  const config=prepared.planConfig;
  row.configuration="passed";row.effectiveAmbition=config.ambition;row.limiterOrder=[...(config.identifiedLimitersRaw??[])];
  if(config.ambitionMeta?.trainingLevel!==spec.level || config.ambitionMeta?.trainingLevelSource!=="manual") add(row.preparationIssues,"coach_level_transport");
  if(spec.objective==="StartToRun") { row.quotaPath="static_template_route"; return row; }
  const calendar=buildPeriodizationCalendar(config);
  const rules=parseAthleteConstraints(config.constraints??"");
  const trail=/trail/i.test(spec.objective);
  const chunkSize=["703","IM"].includes(normalizeObjectiveKey(spec.objective))?5:trail&&weeks>=12?6:4;
  const exclusions=getCatalogExclusions(spec.objective,config.raceGoals);
  const rotationIds=new Set<string>();
  for(let start=1;start<=weeks;start+=chunkSize){
   const end=Math.min(weeks,start+chunkSize-1);
   const phases=[...new Set(Array.from({length:end-start+1},(_,i)=>calendar?.[start+i]??"base"))];
   const catalogOptions:NonNullable<Parameters<typeof buildWorkoutCatalog>[4]>={strictPhaseFilter:true,phaseOverride:phases,maxItems:130,weekContexts:Array.from({length:end-start+1},(_,i)=>({phase:calendar?.[start+i],objective:spec.objective,weekType:inferWeekType(start+i,weeks,spec.objective,profile.athleteData.age,config.deloadCadenceWeeks)})),chunkIndex:Math.floor((start-1)/chunkSize),rotationIds,
    limiters:row.limiterOrder,prohibitions:config.prohibitions,sportFilter:getCatalogSportFilter(spec.objective),
    ...exclusions,rotationSeed:0,injuryRisk:toInjuryRiskCatalogOption(config.injuryRisk),
    beginnerIntensitySignal:{trainingLevel:spec.level,trainingLevelSource:"manual",weeklyHours:config.weeklyHours??null}};
   resetCatalogAttribution();
   const catalog=buildWorkoutCatalog(spec.objective,start,end,weeks,catalogOptions);
   const attribution=new Map([...getCatalogAttribution()].map(([id,entry])=>[id,entry.chunksDropped.get(Math.floor((start-1)/chunkSize))]));
   let uncapped:ReturnType<typeof buildWorkoutCatalog>|undefined;
   const metadata=catalog.map(e=>e.repairMetadata),ids=extractCatalogIdsFromDump(serializeCatalogForPrompt(catalog));
   row.promptMaxChars=Math.max(row.promptMaxChars,serializeCatalogForPrompt(catalog).length);
   if(start===1) row.catalogueSignature=catalog.slice(0,12).map(e=>e.id);
   add(row.preparationIssues,"catalogue_id_not_roundtripped",catalog.filter(c=>!ids.includes(c.id)).length);
   for(let week=start;week<=end;week++){
    const phase=calendar?.[week]??"base",weekType=inferWeekType(week,weeks,spec.objective,profile.athleteData.age,config.deloadCadenceWeeks);
    const entry=computeWeekQuotaEntry(spec.objective,config.ambition??"finisher",config.weeklyHours??0,weekType,spec.format==="lcw_3day",{sessionsPerWeek:config.sessionsPerWeek,maxSessionsPerDay:config.maxSessionsPerDay,bannedSports:rules.bannedSports});
    const context={phase,weekType,objective:spec.objective};
    const coverage=catalogueForWeek(metadata,context,catalogueTrainingMinimaForWeek(entry?.quota??{},config,week));
    let layoutMissing=0,quotaContradictions=0;
    let preflight:string[]=[];
    let mechanical:ReturnType<typeof calendarCapacityEvidence>|undefined;
    if(entry){
     row.quotaPath="deterministic_matrix";
     const floors=applySlFloorIndividualization(entry.floors,week,weekType,config.volumeRamp,{run:config.injuryRisk?.run?.level,bike:config.injuryRisk?.bike?.level}).floors;
     const availableSports=new Set(coverage.eligible.map(m=>normalizeRepairSport(m.sport) as "swim"|"bike"|"run"|"brick"|"strength"));
     const layout=buildWeeklySlotLayout(entry.quota,floors,weekType,{availableSports,raceEvents:declaredRaceSlotsForWeek(config,week),dayBans:rules.dayBans,finalStageSport:spec.format==="lcw_3day"?"run":undefined});
     preflight=planningFeasibility(entry.quota,layout);
     if(preflight.length) mechanical=calendarCapacityEvidence(entry.quota,layout.days.filter(d=>!d.isRest).length);
     for(const code of preflight) add(row.preparationIssues,`preflight_${code}`);
     const slots=layout.days.flatMap(d=>d.slots),bricks=slots.filter(s=>s.sport==="brick").length,effective=effectiveSessionQuota(entry.quota,bricks);
     const required=entry.quota.swim.min+effective.bike.min+entry.quota.run.min+entry.quota.brick.min+entry.quota.strength.min;
     if(required>effective.totalSessions.max) { quotaContradictions++; if(row.examples.length<12)row.examples.push({week,code:"quota_contradiction",minimum:required,maximum:effective.totalSessions.max}); }
     for(const sport of ["swim","bike","run","brick","strength"] as const){
      const min=sport==="bike"?effective.bike.min:entry.quota[sport].min;
      layoutMissing+=Math.max(0,min-slots.filter(s=>s.sport===sport).length);
     }
     for(const day of layout.days){
      if(config.maxSessionsPerDay && day.slots.length>config.maxSessionsPerDay) add(row.preparationIssues,"daily_capacity_conflict");
      for(const ban of rules.dayBans) if(ban.day===day.dayName) add(row.preparationIssues,"layout_day_ban_conflict",day.slots.filter(s=>ban.sport==="any"||s.sport===ban.sport).length);
     }
     // Measure feasibility against existing limits; never resize sessions to make them pass.
     const budget=buildCoachVolumeBudget(config.volumeRamp,week,weekType,config.weeklyHoursSource);
     const minDose=slots.filter(slot=>!slot.isRaceEvent).reduce((sum,slot)=>{
      const durations=coverage.eligible.filter(m=>normalizeRepairSport(m.sport)===slot.sport).flatMap(m=>
        executableCatalogueDurationRanges(m,spec.objective).filter(range=>range[1]>=(slot.minDurationMin??0) && range[0]<=(slot.maxDurationMin??Infinity))
          .map(range=>Math.max(range[0],slot.minDurationMin??0)));
      if(!durations.length) add(row.preparationIssues,"catalogue_slot_duration_unavailable");
      return sum+(durations.length?Math.min(...durations):0);
     },0);
     if(budget && minDose>budget.maxMinutes) add(row.preparationIssues,"minimum_catalogue_dose_exceeds_budget");
    }else row.quotaPath=trail?"dedicated_trail_prompt_no_deterministic_quota":"static_template_route";
    add(row.preparationIssues,"quota_contradiction",quotaContradictions);add(row.preparationIssues,"layout_missing_slots",layoutMissing);
    add(row.preparationIssues,"catalogue_week_sport_shortfall",coverage.missingSports.length);
    add(row.preparationIssues,"catalogue_week_diversity_limited",coverage.limitedDiversitySports.length);
    for(const e of catalog.filter(e=>coverage.eligible.some(m=>m.id===e.id))){
     const m=e.repairMetadata;
     const result=checkSessionCatalogue({catalogId:e.id,title:m.title,sport:normalizeRepairSport(m.sport),durationMin:e.canonicalDurationMin,zones:m.mainZoneMax?[`Z${m.mainZoneMax}`]:m.zones,details:m.structure},{...context,catalog:metadata});
     add(row.preparationIssues,"canonical_prescription_contract_conflict",result.errors.length);
     if(result.errors.length&&row.examples.length<12) for(const code of result.errors)row.examples.push({week,code,id:e.id});
    }
    if(preflight.length || coverage.missingSports.length || coverage.limitedDiversitySports.length) {
     const residual:NonNullable<MatrixRow['residuals']>[number]={week,phase,weekType};
     if(preflight.length) residual.mechanical=mechanical;
     if(coverage.missingSports.length || coverage.limitedDiversitySports.length) {
      uncapped??=buildWorkoutCatalog(spec.objective,start,end,weeks,{...catalogOptions,maxItems:10000});
      const minima:Partial<Record<string,{min?:number}>>=catalogueTrainingMinimaForWeek(entry?.quota??{},config,week);
      residual.catalogue=[...coverage.missingSports,...coverage.limitedDiversitySports].map(sport=>({sport,required:minima[sport]?.min??0,limitedDiversity:coverage.limitedDiversitySports.includes(sport),
       selectedEligibleIds:coverage.eligible.filter(m=>normalizeRepairSport(m.sport)===sport).map(m=>m.id),
       uncappedEligibleIds:uncapped!.filter(e=>normalizeRepairSport(e.sport)===sport&&!catalogueEligibility(e.repairMetadata,context).length).map(e=>e.id),
       candidates:WorkoutLibrary.filter(w=>normalizeRepairSport(w.sport)===sport).map(w=>{
        const m=buildRepairWorkoutMetadata(w);
        return {id:m.id,durationMin:m.durationMin,phases:m.phases,intent:m.intentFamily,zone:m.mainZoneMax,when:m.when,weeklyUsageCap:Number.isFinite(catalogueWeeklyUsageCapacity(m))?catalogueWeeklyUsageCapacity(m):null,selected:catalog.some(e=>e.id===m.id),uncapped:uncapped!.some(e=>e.id===m.id),eligibilityReasons:catalogueEligibility(m,context),pipelineStage:attribution.get(m.id)};
       })}));
     }
     (row.residuals??=[]).push(residual);
    }
    const exclusions:Record<string,number>={};
    for(const m of metadata) for(const reason of catalogueEligibility(m,context)) add(exclusions,reason);
    row.weekly.push({week,phase,weekType,catalog:coverage.eligible.length,missingSports:coverage.missingSports,layoutMissing,quotaContradictions,preflight,exclusions});
   }
   catalog.slice(0,Math.floor(catalog.length*.7)).forEach(e=>rotationIds.add(e.id));
  }
 }catch(error){row.configuration="failed";add(row.preparationIssues,error instanceof Error?`exception_${error.name}`:"exception");}
 return row;
}
export function matrixCoverage(cases:PlanningCase[]){
 const keys=["objective","level","ambition","load","physiology","constraints","duration","intermediate"] as const;
 const missingPairs:string[]=[];
 for(let a=0;a<keys.length;a++)for(let b=a+1;b<keys.length;b++){
  const x=keys[a],y=keys[b],seen=new Set(cases.map(c=>`${c[x]}|${c[y]}`));
  for(const xv of new Set(cases.map(c=>c[x])))for(const yv of new Set(cases.map(c=>c[y])))if(!seen.has(`${xv}|${yv}`))missingPairs.push(`${x}:${xv} / ${y}:${yv}`);
 }
 return {objectives,levels,ambitions,coreCases:cases.length,missingPairs};
}
