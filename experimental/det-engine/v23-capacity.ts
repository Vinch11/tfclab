import{explicitDose}from'./v14-sources';import{checkSessionCatalogue}from'../../supabase/functions/_shared/sessionCatalogueContract';import{evaluateV18ReviewOffer}from'./v18-selection';
/** A declared envelope, source compatibility and observed adaptation are three separate facts. */
export function capacityDecisionV23(slot:any,p:any,canonical:Map<string,any>){
 const cap=slot.input.currentCapacity,known=Number.isFinite(cap)&&cap>0,within=known&&slot.minutes<=cap;
 const state=known?(within?'within_documented_coach_envelope':'outside_current_documented_envelope'):'individual_capacity_unknown';
 let alternative:any=null;
 if(known&&!within){const proposed=cap,reasons:string[]=[];
  if(proposed<slot.role.floor)reasons.push('unchanged_native_sporting_floor_would_be_violated');
  if(proposed<slot.timing.necessaryRange[0]||proposed>slot.timing.necessaryRange[1])reasons.push('complete_source_range_not_satisfied');
  const recipe=explicitDose(slot.card,proposed);if(!recipe.valid)reasons.push('mandatory_recipe_components_would_change');
  const check=checkSessionCatalogue({sport:slot.role.sport,catalogId:slot.card.id,title:slot.card.title,details:slot.card.structure,durationMin:proposed,zones:slot.card.zones},{objective:p.config.objective,phase:p.prep.weeklyQuotas[slot.week].phase,weekType:p.prep.weeklyQuotas[slot.week].weekType,catalog:[slot.card]});if(check.errors.length)reasons.push('original_catalogue_contract_refuses_alternative');
  const c=canonical.get(slot.card.id),review=c?evaluateV18ReviewOffer(c.originalCanonical,c.sourceV18Recipe,{objective:p.config.objective,phase:p.prep.weeklyQuotas[slot.week].phase,weekType:p.prep.weeklyQuotas[slot.week].weekType,minutes:proposed,trainingLevel:p.config.ambitionMeta.trainingLevel,trainingLevelSource:p.config.ambitionMeta.trainingLevelSource},{currentCapacityMinutes:cap,availableSessionMinutes:proposed}):null;
  if(!slot.timing.timingCompleteForDeclaredRecipe&&!review?.witness)reasons.push('complete_alternative_recipe_timing_not_demonstrated');
  alternative={proposedMinutes:proposed,sourceId:slot.card.id,recipe,check,canonicalReview:review,status:reasons.length?'rejected':'candidate_requires_whole_week_revalidation',reasons,applied:false,objectiveOrFloorSilentlyChanged:false};
 }
 return{slotKey:slot.key,week:slot.week,sourceId:slot.card.id,minutes:slot.minutes,documentedEnvelope:known?cap:null,envelopeOrigin:'preregistered synthetic coach envelope; not a capacity deduced from training level',currentDoseState:state,currentlyWithinEnvelope:within,sourceSpecificCapacityProven:false,
  futureConditional:!within&&slot.week>slot.input.assessedWeek,existingProspectiveState:slot.decision.state,adaptationActuallyObserved:null,assimilationActuallyObserved:null,elapsedWeekCreatesCapacity:false,currentIndividualDoseApproved:false,alternative};
}
