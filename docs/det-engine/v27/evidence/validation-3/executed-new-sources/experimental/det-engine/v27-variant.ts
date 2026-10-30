import {catalogueEligibility,checkSessionCatalogue} from '../../supabase/functions/_shared/sessionCatalogueContract';
import {normalizeRepairGoal} from '../../supabase/functions/_shared/repairSportingEquivalence';
/** Supplementary source-variant reading. Historical errors/unknowns are returned verbatim, never weakened. */
export function objectiveVariantV27(card:any,minutes:number,context:any){
 const key=Object.keys(card.variants??{}).find(k=>normalizeRepairGoal(k)===normalizeRepairGoal(context.objective));
 const text=key?card.variants[key]:null;
 const historicalGeneric=checkSessionCatalogue({catalogId:card.id,sport:card.sport,title:card.title,details:card.structure,durationMin:minutes,zones:card.zones},{...context,catalog:[card]});
 const historicalExplicit=key?checkSessionCatalogue({catalogId:card.id,sport:card.sport,title:card.title,details:card.structure,durationMin:minutes,zones:card.zones,variantKey:key},{...context,catalog:[card]}):null;
 const eligibility=catalogueEligibility(card,context),targetGoal=normalizeRepairGoal(context.objective),sourceGoals=(card.goals??[]).map(normalizeRepairGoal).filter(Boolean);
 let compatible:boolean|null=null,range:number[]|null=null,reason='goal_variant_scope_not_resolved';
 if(!targetGoal){reason='objective_context_not_normalizable';}
 else if(!sourceGoals.length){reason='explicit_source_goal_scope_missing';}
 else if(!sourceGoals.includes(targetGoal)){compatible=false;reason='explicit_source_goals_exclude_requested_objective';}
 else if(eligibility.length){compatible=false;reason='historical_phase_objective_or_week_guard';}
 else if(!text){compatible=true;reason='no_goal_variant_in_source_generic_recipe_retained';}
 else if(/^(?:ok|standard|prioritaire|très utile)$/i.test(text.trim())){compatible=true;reason='literal_non_dosing_goal_marker_generic_structure_unchanged';}
 else if(/^[—–-]$/.test(text.trim())){compatible=false;reason='explicit_unavailable_goal_variant';}
 else{
  const match=text.match(/^(\d+)\s*[–-]\s*(\d+)\s*min\b/i);
  if(match){range=[+match[1],+match[2]];compatible=minutes>=range[0]&&minutes<=range[1];reason=compatible?'explicit_goal_duration_range_satisfied_not_individual_approval':'explicit_goal_duration_range_violated';}
 }
 return{key,text,compatible,range,reason,historicalGeneric,historicalExplicit,eligibility,sourceGoals:card.goals,targetGoal,explicitGoalMembership:targetGoal?sourceGoals.includes(targetGoal):null,genericRecipeIsNotGoalVariant:true,automaticGenericBaseWaiver:false};
}

/** Literal contextual predicate, not a global waiver of metadata prerequisites. */
export function equipmentV27(card:any,context:any={}){
 const literal=/home trainer sans ventilateur/i.test(card.avoid??'');
 let compatible:boolean|null=true,reason='no_equipment_condition_in_this_source';
 if(literal){
  if(context.setting==='outdoor'){compatible=true;reason='outdoor_antecedent_home_trainer_is_false_only_for_this_literal_restriction';}
  else if(context.setting==='indoor'&&context.fanConfirmed===true){compatible=true;reason='indoor_ventilation_explicitly_declared';}
  else if(context.setting==='indoor'&&context.fanConfirmed===false){compatible=false;reason='explicit_home_trainer_without_fan_restriction';}
  else{compatible=null;reason='equipment_context_unknown_no_exemption';}
 }
 return{compatible,reason,setting:context.setting??'unknown',fanConfirmed:context.fanConfirmed??null,literalRestriction:card.avoid,rawMetadataPrerequisites:card.prerequisiteKeys,rawMetadataUnchanged:true,physiologicalToleranceEstablished:false};
}
