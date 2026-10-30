import{catalogueTrainingMinimaForWeek,declaredRaceSlotsForWeek}from'../../supabase/functions/_shared/catalogueTrainingMinima';import{sourceContext}from'./v13-source-context';
import type{V10Profile}from'./v10-profiles';import type{Role}from'./v10-allocation';import{v10Source}from'./v10-allocation';
import{buildWorkoutCatalog,toInjuryRiskCatalogOption}from'@/lib/workoutCatalogBuilder';
import{getCatalogExclusions,getCatalogSportFilter}from'@/lib/plan/catalogScope';
import{normalizeRepairSport,type RepairWorkoutMetadata}from'../../supabase/functions/_shared/repairSportingEquivalence';
import{hasWeeklyCalendarCapacity}from'../../supabase/functions/_shared/sessionQuotaAccounting';
import{generationEligibility}from'./v4-generation-eligibility';import{sourceWeekContext,sourceDayContext}from'./v11-source-context';
import{getDoctrineDomain}from'@/lib/zones/tfclDoctrine';import{auditRecipe}from'./v13-integrity';import{swim45Feasibility}from'./v13-swim';
const cache=new WeakMap<V10Profile,Map<number,RepairWorkoutMetadata[]>>();
export function poolForWeek(p:V10Profile,week:number){let map=cache.get(p);if(!map){map=new Map();cache.set(p,map);}if(!map.has(week)){const q=p.prep.weeklyQuotas[week],m=p.config.ambitionMeta!;map.set(week,buildWorkoutCatalog(p.config.objective!,week,week,p.config.weeksAvailable??16,{sportFilter:getCatalogSportFilter(p.config.objective!),...getCatalogExclusions(p.config.objective!,p.config.raceGoals),maxItems:160,strictPhaseFilter:true,phaseOverride:[q.phase!],weekContexts:[{objective:p.config.objective!,phase:q.phase,weekType:q.weekType}],rotationSeed:0,limiters:p.config.identifiedLimitersRaw,prohibitions:p.config.prohibitions,injuryRisk:toInjuryRiskCatalogOption(p.config.injuryRisk),beginnerIntensitySignal:{trainingLevel:m.trainingLevel,trainingLevelSource:m.trainingLevelSource,weeklyHours:p.config.weeklyHours??null}}).map(c=>c.repairMetadata));}return map.get(week)!;}
export function fullPreparationFeasibility(p:V10Profile){
 const weeks=Array.from({length:16},(_,index)=>{const week=index+1,q=p.prep.weeklyQuotas[week],pool=poolForWeek(p,week),coachCeiling=(p.config.weeklyHours??0)*60;
  const trainingMinima=catalogueTrainingMinimaForWeek(q.quota,p.config,week),competitionReservations=declaredRaceSlotsForWeek(p.config,week);
  const roles=Object.entries(trainingMinima).filter(([sport])=>['swim','bike','run','strength','brick'].includes(sport)).flatMap(([sport,range])=>{const count=(range as{min:number}).min;return Array.from({length:count},(_,n)=>{
   const long=n===0&&(sport==='bike'?q.floors.longRideWeekly:sport==='run'?q.floors.longRunWeekly:false);
   const floor=long?(sport==='bike'?q.floors.slLongRideMin??120:q.floors.slLongRunMin??90):0;
   const cap=sport==='brick'?null:long?p.longCaps[sport as'bike'|'run']:p.normalCaps[sport as keyof typeof p.normalCaps];
   const role:Role={id:`${p.id}:S${week}:${sport}:${n}`,sport,kind:long?'long':sport==='strength'?'skill':'endurance',essential:true,min:floor,cap:cap??0,priority:sport===p.focusSport?0:1,adaptation:'necessary role only; specific dose progression and response not established',domain:sport==='strength'?'recovery':'moderate_lt1'};
   const offers=pool.filter(c=>normalizeRepairSport(c.sport)===sport).map(card=>{const audit=auditRecipe(card);const reasons:string[]=[];
    if(cap===null)reasons.push('combined_session_capacity_not_evidenced');
    if(!generationEligibility(card,{objective:p.config.objective,phase:q.phase,weekType:q.weekType},[],[]).compatible)reasons.push('original_phase_goal_or_prerequisites');
    if(!sourceWeekContext(card,q.weekType).compatible)reasons.push('source_avoids_week_type');
    if(!p.availableDays.some(day=>sourceContext(card,p,week,day,q.weekType).compatible))reasons.push('source_timing_not_placeable_on_available_day');
    if(audit.fatalDurationConflict)reasons.push('catalogue_recipe_total_conflict');
    if(card.mainZoneMax<1||card.mainZoneMax>Number(getDoctrineDomain(role.domain).zone.slice(1)))reasons.push('outside_current_evidenced_low_domain_scope');
    if(sport==='strength'&&card.intentFamily!=='technique')reasons.push('actual_strength_prerequisites_not_evidenced; support_slot_not_force_proof');
    if(long&&(!['endurance_fondamentale','race_pace'].includes(card.intentFamily)||!v10Source(card,role,p).compatible))reasons.push('long_endurance_intent_not_established');
    if(sport==='brick')reasons.push('full_brick_components_and_tolerance_not_established');
    const min=Math.max(card.durationMin[0],floor,audit.knownMandatoryLowerMin??0),max=Math.min(card.durationMin[1],cap??0,audit.fullRecipeTimeRange?.[1]??Infinity);
    if(min>max)reasons.push('source_floor_individual_cap_no_intersection');
    return{id:card.id,min,max,compatible:!reasons.length,reasons,temporalCoverage:audit.status};
   });const compatible=offers.filter(o=>o.compatible);
   const witness=cap!==null&&floor>cap?{classification:'current_individual_envelope_conflicts_with_programming_floor',floor,documentedCap:cap,notAUniversalSafetyCeiling:true,newEvidenceRequired:true}:cap===null?{classification:'missing_individual_combined_session_evidence',floor,documentedCap:null}:null;
   return{role,documentedCap:cap,offeredSourceCount:offers.length,compatibleSourceCount:compatible.length,minimumNecessaryMinutes:compatible.length?Math.min(...compatible.map(o=>o.min)):null,compatibleSources:compatible,excludedSources:offers.filter(o=>!o.compatible),witness};
  });});const necessaryLowerBound=roles.every(r=>r.minimumNecessaryMinutes!==null)?roles.reduce((n,r)=>n+r.minimumNecessaryMinutes!,0):null;
  const nativeCeiling=q.volumeBudget?.maxMinutes??null,effectiveCeiling=nativeCeiling===null?coachCeiling:Math.min(coachCeiling,nativeCeiling);
  const capacity=hasWeeklyCalendarCapacity(q.quota,Math.min(p.availableDays.length,7-p.minRest));
  return{week,phase:q.phase,type:q.weekType,nativeQuota:q.quota,trainingMinima,competitionReservations,competitionEffortMinutes:null,coachCeilingScope:'training_only_not_imputed_race_duration',nativeFloors:q.floors,nativeCeiling,coachCeiling,effectiveCeiling,nativeCeilingExceedsCoach:nativeCeiling!==null&&nativeCeiling>coachCeiling,roles,necessaryLowerBound,sourceDistinctMatching:'not_executed; independent role minima only, not a constructive calendar proof',calendarCapacityNecessary:capacity,lowerBoundBudgetConflict:necessaryLowerBound!==null&&necessaryLowerBound>effectiveCeiling,passesNecessaryChecks:capacity&&roles.every(r=>!r.witness&&r.compatibleSourceCount>0)&&!(necessaryLowerBound!==null&&necessaryLowerBound>effectiveCeiling)};
 });
 const failures=weeks.flatMap(w=>w.roles.filter(r=>r.witness).map(r=>({week:w.week,role:r.role.id,...r.witness})));const catalogueRoles=weeks.flatMap(w=>w.roles.filter(r=>!r.witness&&r.compatibleSourceCount===0).map(r=>({week:w.week,role:r.role.id,reason:'no_admissible_source_in_current_offered_pool_not_global_catalogue_impossibility'})));
 return{version:'det-v13-1',profile:p.id,horizon:16,weeks,failures,catalogueRoles,swim:swim45Feasibility(p),plan:null,status:'refused_under_current_evidence' as const,reason:failures.length?'documented_caps_and_future_native_floors_conflict':'full_source_individual_response_and_joint_calendar_preconditions_incomplete',evidenceInterpretation:'future improvement is possible but not imputed; declared600min ceiling enforced even if native budget is larger',construction:'no fabricated sessions/rest/race event to fill gaps',fullPlanValidation:{technical:'not_applicable_no_admissible_complete_plan',historical:'not_applicable_no_admissible_complete_plan',globalPrescribedLoadAndIntensity:'not_applicable_no_complete_prescription',executed:'whole16-week necessary constraints and source domains, not16 independently validated microcycles'},physiologicalImpossibilityClaimed:false,expertReviewed:false};
}
