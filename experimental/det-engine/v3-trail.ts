/** Dedicated trail prescription envelopes, not marathon quotas or deployable complete plans. */
import type {PlanAthleteData,PlanConfig} from '@/hooks/useAITrainingPlan';
import {computeTrailProfile,isTrailObjective} from '@/lib/trailProfile';
import {buildPeriodizationCalendar} from '@/lib/plan/periodizationCalendar';
import {inferWeekType,buildCoachVolumeBudget} from '@/engines/plan/sessionSizingMatrix';
import {buildWorkoutCatalog,toInjuryRiskCatalogOption} from '@/lib/workoutCatalogBuilder';
import {WorkoutLibrary} from '@/lib/workoutLibrary';
import {getCatalogSportFilter,getCatalogExclusions} from '@/lib/plan/catalogScope';
import {evaluateRepairSportingEquivalence} from '../../supabase/functions/_shared/repairSportingEquivalence';
export type TrailModel='catalogue_evidence_only'|'existing_dplus_envelope'|'exposure_gated';
export const TRAIL_MODELS:TrailModel[]=['catalogue_evidence_only','existing_dplus_envelope','exposure_gated'];
export interface TrailEventInput {distanceKm:number|null;elevationGainM:number|null;elevationLossM?:number|null;targetTimeMinutes?:number|null;maxAltitudeM?:number|null;}
export function buildTrailPrescriptionEnvelope(athlete:PlanAthleteData,config:PlanConfig,event:TrailEventInput,model:TrailModel){
 const common={version:'det-v3-trail-1',model,experimental:true,technicallyConstructed:false,sportingRelevance:'not_attested',humanReviewRequired:true};
 if(!isTrailObjective(config.objective))return {...common,status:'refused' as const,reason:'dedicated_trail_route_only'};
 const values=[event.distanceKm,event.elevationGainM,event.elevationLossM,event.targetTimeMinutes,event.maxAltitudeM].filter(v=>v!=null);
 if(values.some(v=>!Number.isFinite(v)||v<0)||event.distanceKm===0||event.targetTimeMinutes===0)return {...common,status:'refused' as const,reason:'invalid_event_geometry_or_duration'};
 const profile=computeTrailProfile({...event,objective:config.objective});
 if(!profile)return {...common,status:'refused' as const,reason:'missing_explicit_distance_or_dplus'};
 if(!Number.isInteger(config.weeksAvailable)||!config.weeksAvailable||config.weeksAvailable>104)return {...common,status:'refused' as const,reason:'invalid_horizon'};
 const calendar=buildPeriodizationCalendar(config),byId=new Map(WorkoutLibrary.map(w=>[w.id,w]));
 let priorLoadDplus=profile.weeklyDPlusBaseM;
 const weeks=Array.from({length:config.weeksAvailable},(_,index)=>{
  const week=index+1,phase=calendar?.[week]??'base',weekType=inferWeekType(week,config.weeksAvailable!,config.objective,athlete.age,config.deloadCadenceWeeks);
  const pool=buildWorkoutCatalog(config.objective,week,week,config.weeksAvailable!,{strictPhaseFilter:true,phaseOverride:[phase],
   weekContexts:[{objective:config.objective,phase,weekType}],maxItems:10000,rotationSeed:0,
   limiters:config.identifiedLimitersRaw,prohibitions:config.prohibitions,sportFilter:getCatalogSportFilter(config.objective),
   ...getCatalogExclusions(config.objective,config.raceGoals),injuryRisk:toInjuryRiskCatalogOption(config.injuryRisk),
   beginnerIntensitySignal:{trainingLevel:config.ambitionMeta?.trainingLevel,trainingLevelSource:config.ambitionMeta?.trainingLevelSource,weeklyHours:config.weeklyHours??null}})
   .filter(entry=>evaluateRepairSportingEquivalence(null,entry.repairMetadata,{objective:config.objective,phase,weekType,operation:'insertion'}).compatible)
   .filter(entry=>/trail|TR_|URBAN_|excentrique|montée|descente|sentier|rando/i.test(`${entry.id} ${entry.repairMetadata.title} ${entry.repairMetadata.tags.join(' ')}`));
  const cards=pool.map(entry=>{
   const m=entry.repairMetadata,original=byId.get(m.id)!;const text=`${m.id} ${m.title} ${m.tags.join(' ')}`;
   const descent=/descente|eccentric|excentrique/i.test(text),indoor=/salle|URBAN_|escaliers/i.test(text),mountain=/montagne|montagn|mountain/i.test(text);
   const terrainCompatible=config.terrainAvailability!=='plat'||!descent||indoor;
   const weekdayMountainRestricted=mountain&&['plat','vallonne','mixte'].includes(config.terrainAvailability??'');
   // General training level never proves eccentric habituation. In this variant, unknown habituation prevents fast descents.
   const gated=model==='exposure_gated'&&descent&&/rapide|vitesse|plyo|pliométr/i.test(text);
   return {id:m.id,sport:m.sport,intent:m.intentFamily,durationMin:m.durationMin,dPlusTargetM:original.dPlusTargetM??null,
    dMinusTargetM:null,structure:m.structure,adaptations:{ascent:/montée|côte|ascen|D\+/i.test(text),descent,
     muscleTolerance:/excentri|eccentric|renfo|force|proprio/i.test(text),runWalk:/marche|rando|hike|bâtons/i.test(text),endurance:/endurance|long|fondament/i.test(text)},
    terrainCompatible,weekdayMountainRestricted,selectable:terrainCompatible&&!gated,exclusion:gated?'eccentric_habituation_unknown':!terrainCompatible?'descent_terrain_unavailable':null};
  });
  // The 30% cap and deload interval are inherited heuristics, not demonstrated injury limits.
  let dplusEnvelope:[number,number]|null=null;
  if(model!=='catalogue_evidence_only'){
   const target=phase==='base'?profile.weeklyDPlusBaseM:profile.weeklyDPlusPeakM;
   const next=weekType==='load'?Math.min(target,Math.floor(priorLoadDplus*(1+profile.weeklyDPlusRampMaxPct))):priorLoadDplus;
   dplusEnvelope=weekType==='load'?[Math.min(priorLoadDplus,next),next]:weekType==='recovery'?[Math.floor(priorLoadDplus*.5),Math.floor(priorLoadDplus*.6)]:[0,next];
   if(weekType==='load')priorLoadDplus=next;
  }
  return {week,phase,weekType,dplusEnvelope,volumeBudget:buildCoachVolumeBudget(config.volumeRamp,week,weekType,config.weeklyHoursSource)??null,
   catalogue:cards,coverage:Object.fromEntries(['ascent','descent','muscleTolerance','runWalk','endurance'].map(key=>[key,cards.filter(c=>c.selectable&&c.adaptations[key as keyof typeof c.adaptations]).length])),
   recovery:'Existing deload calendar retained; muscle recovery unknown without athlete response',
   missing:['quantified_eccentric_exposure','individual_muscle_tolerance','dedicated_weekly_slot_contract']};
 });
 return {...common,status:'envelope_only' as const,profile,event:{...event,elevationLossM:event.elevationLossM??null},terrain:config.terrainAvailability??'unknown',
  effectiveAmbition:config.ambition,trainingLevel:config.ambitionMeta?.trainingLevel??'unknown',limiterPriorities:config.identifiedLimitersRaw??[],weeks,
  uncertainty:{dMinus:event.elevationLossM==null?'unknown_never_inferred_from_dplus':'event_known_session_doses_unknown',
   muscleTolerance:'unknown_not_inferred_from_training_level',duration:event.targetTimeMinutes?'declared':'existing_profile_estimate_not_individualized',
   dplusRamp:'existing_TFCL_heuristic_not_universal_safety_law'},
  unresolved:['Dedicated calendar and session quotas not established','No validated eccentric-dose model','No verified initial vertical load','No automatic equivalence of indoor ascent and outdoor descent'],
  sourceRules:['src/lib/trailProfile.ts','src/lib/enrichedWorkoutsTrail.ts','src/lib/plan/periodizationCalendar.ts','supabase/functions/ai-training-plan/promptHelpers.ts']};
}
