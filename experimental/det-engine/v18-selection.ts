import{evaluateCanonicalOffer,type CanonicalOfferCriteria}from'./v16-selection';
import{CoachFatigueResistanceSchema,type CoachFatigueResistance}from'./v17-selection';
import{assertRecipeIntegrity,instantiate}from'./v18-compiler.mjs';
import{personalizedIntensity}from'./v16-intensity.mjs';
/** Technical readiness for review; preserves historical eligibility and independent current-capacity gates. */
export function evaluateV18ReviewOffer(c:any,r:any,criteria:CanonicalOfferCriteria,context:{currentCapacityMinutes?:number;availableSessionMinutes?:number;disciplineAvailable?:boolean;progressionRequested?:boolean;fatigueResistance?:CoachFatigueResistance;effectiveRefs?:{ftpWatts?:number;mlssSpeedKmh?:number;provenance?:string}}={}){
 assertRecipeIntegrity(c,r);const base=evaluateCanonicalOffer(c,criteria);const reasons=[...base.reasons];
 if(r.classification!=='complete')reasons.push('recipe_not_fully_compiled');
 const witness=r.classification==='complete'?instantiate(r.nodes.filter((n:any)=>n.kind!=='integrated'),criteria.minutes*60):null;if(!witness)reasons.push('no_source_bounded_duration_assignment');
 if(context.disciplineAvailable===false)reasons.push('discipline_unavailable');
 if(context.availableSessionMinutes!==undefined&&(!Number.isFinite(context.availableSessionMinutes)||context.availableSessionMinutes<criteria.minutes))reasons.push('declared_available_window_exceeded');
 const invalidCapacity=context.currentCapacityMinutes!==undefined&&(!Number.isFinite(context.currentCapacityMinutes)||context.currentCapacityMinutes<0);if(invalidCapacity)reasons.push('invalid_individual_capacity_envelope');const capacityExcess=Number.isFinite(context.currentCapacityMinutes)&&criteria.minutes>context.currentCapacityMinutes!;
 if(capacityExcess&&!context.progressionRequested)reasons.push('current_individual_capacity_envelope_exceeded');
 const opinion=context.fatigueResistance?CoachFatigueResistanceSchema.safeParse(context.fatigueResistance):null;if(opinion&&!opinion.success)reasons.push('invalid_optional_coach_opinion');const pending=!!context.progressionRequested&&(capacityExcess||context.currentCapacityMinutes===undefined);
 return{...base,reviewOfferCompatible:reasons.length===0,reasons,witness,capacityState:pending?'conditional_pending_reassessment':capacityExcess?'not_admissible':'current_capacity_not_attested_by_this_filter',fatigueResistance:opinion?.success?opinion.data:null,opinionApplicability:opinion?.success?(opinion.data.sport==='multisport'||opinion.data.sport===c.prescription.discipline?'declared_scope_only':'not_applicable_sport_mismatch'):'not_supplied_or_invalid',opinionNotObservedAssimilation:true,missingOpinionBlocksFundamental:false,opinionMayClearCapacityGate:false,actualObservedRecovery:null,goalVariantStatus:r.variants?.goalSpecificResolutionRequired?'requires_goal_specific_source_resolution':'not_present_in_source',currentIndividualPrescriptionApproved:false,automaticPrescription:false,scientificValidation:false,referenceResolution:personalizedIntensity(c,context.effectiveRefs??{})};
}
