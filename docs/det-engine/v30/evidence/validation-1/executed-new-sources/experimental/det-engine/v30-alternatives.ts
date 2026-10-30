import {objectiveVariantV27} from './v27-variant';import {originalCard} from './v14-sources';
import {sourceContext} from './v13-source-context';import {instantiate} from './v18-compiler.mjs';
import {digest} from './v9-prospective';
/** Structural families are scanned once. No permutations, no automatic substitution, no lexical stimulus scoring. */
export function alternativesV30(reference:any,v:any,canonical:Map<string,any>){
 const before=digest(reference),rows:any[]=[];
 for(const w of reference.calendar.weeks)for(const slot of w.slots){if(!['swim','strength'].includes(slot.role.sport)&&slot.card.id!=='C_BIKE_AERO_POSITION_DRILLS')continue;
  const current=canonical.get(slot.card.id),category=current.originalCanonical.prescription.category;
  const pool=[...canonical.values()].filter((r:any)=>r.legacyId!==slot.card.id&&r.originalCanonical.prescription.discipline===slot.role.sport&&r.originalCanonical.prescription.category===category);
  const summaries=pool.map((r:any)=>{const card=originalCard(r.legacyId),variant=objectiveVariantV27(card,slot.minutes,{objective:'IM',phase:w.phase,weekType:w.type});
   const context=sourceContext(card,v.profile,w.week,slot.day,w.type),problems:string[]=[];
   if(variant.compatible!==true)problems.push(variant.reason);
   if(!context.compatible)problems.push(...context.reasons);
   if(w.slots.some((s:any)=>s.card.id===r.legacyId))problems.push('source_already_in_week');
   const witness=r.sourceV18Recipe.classification==='complete'?instantiate(r.sourceV18Recipe.nodes.filter((n:any)=>n.kind!=='integrated'),slot.minutes*60):null;
   if(slot.role.sport==='strength')problems.push('requires_specific_exercise_tempo_load_competence_model_not_a_cardio_invalidity');
   else if(!witness)problems.push('complete_temporal_witness_not_available_without_individual_or_editorial_parameters');
   if(slot.card.id==='C_BIKE_AERO_POSITION_DRILLS'&&!/position a[eé]ro/i.test(card.structure))problems.push('cadence_or_test_is_not_postural_exposure');
   if(r.legacyId==='C_IM_AERO_HOLD')problems.push('4x15_not_6x10_larger_continuous_posture_not_individually_documented','final_recovery_occurrence_unknown');
   return{sourceId:r.legacyId,category,goalPhaseContextCompatible:variant.compatible===true&&context.compatible,witnessSeconds:witness?.seconds??null,problems:[...new Set(problems)],automaticallySubstitutable:false};
  });
  rows.push({slotKey:slot.key,sourceId:slot.card.id,week:w.week,sport:slot.role.sport,existingRoleUnchanged:slot.role.kind,scannedSameSportAndCategory:pool.length,
   compatibleContextCount:summaries.filter(x=>x.goalPhaseContextCompatible).length,knownCompleteTemporalOffers:summaries.filter(x=>x.witnessSeconds!==null).length,
   automaticSubstitutions:0,reason:'no complete same-role replacement demonstrated under unchanged B evidence; technique/strength are not declared invalid merely for missing cardio grammar',
   namedOptions:summaries.filter(x=>x.sourceId==='C_IM_AERO_HOLD'||x.sourceId==='C_BIKE_CADENCE'||x.sourceId==='C_BIKE_CADENCE_SKILLS_PRO'),
   blockerFamilies:Object.fromEntries([...new Set(summaries.flatMap(x=>x.problems))].map(k=>[k,summaries.filter(x=>x.problems.includes(k)).length]))});
 }
 if(digest(reference)!==before)throw Error('V30_ALTERNATIVE_SEARCH_MUTATED_NATIVE');
 return{rows,canonicalLibraryCount:canonical.size,searchType:'single_structural_offer_pass_not_permutations',automaticSubstitutions:0,individualApprovals:0};
}
