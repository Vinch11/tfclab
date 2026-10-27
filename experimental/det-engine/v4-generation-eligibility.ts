/** Initial generation has explicit capability evidence; repair insertion has no such evidence channel. */
import{catalogueEligibility}from'../../supabase/functions/_shared/sessionCatalogueContract';
import{evaluateRepairSportingEquivalence,isCompleteRepairWorkoutMetadata,type RepairWorkoutMetadata,type RepairCompatibilityContext}from'../../supabase/functions/_shared/repairSportingEquivalence';
export function generationEligibility(card:RepairWorkoutMetadata,context:RepairCompatibilityContext,confirmedPrerequisites:ReadonlyArray<string>,confirmedContexts:ReadonlyArray<string>=[]){
 if(!isCompleteRepairWorkoutMetadata(card))return{compatible:false,reasons:['candidate_metadata_incomplete'],source:'existing_metadata_contract',repairInsertionReference:evaluateRepairSportingEquivalence(null,card,context),confirmedPrerequisites:[]};
 const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 const confirmed=new Set(confirmedPrerequisites.map(normalize));
 const reasons=[...catalogueEligibility(card,context),...card.prerequisiteKeys.filter(key=>!confirmed.has(normalize(key))).map(key=>`unconfirmed_prerequisite:${key}`)];
 if(card.specialContext&&!confirmedContexts.includes(card.specialContext))reasons.push(`unconfirmed_special_context:${card.specialContext}`);
 return{compatible:!reasons.length,reasons,source:'existing_catalogue_eligibility_plus_explicit_capability_contract',
  repairInsertionReference:evaluateRepairSportingEquivalence(null,card,{...context,operation:'insertion'}),confirmedPrerequisites:[...confirmed]};
}
