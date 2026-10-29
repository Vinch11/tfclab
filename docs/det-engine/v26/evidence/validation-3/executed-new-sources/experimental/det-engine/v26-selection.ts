import {deriveV22StimulusRequests} from './v22-intents';
import {evaluateV18ReviewOffer} from './v18-selection';
import {evaluateCanonicalOffer} from './v16-selection';
import {originalCard} from './v14-sources';
import {resolvePhysiologicalReferences} from './v20-physio';
import {resolveV22Targets} from './v22-intensity';
import {instantiate} from './v18-compiler.mjs';
import {digest} from './v9-prospective';

const BRIDGE:Record<string,{intent:string;family:string;sport:string|null;adaptation:string}>={
 vo2_intervals:{intent:'vo2max',family:'vo2max',sport:'bike',adaptation:'aerobic ceiling: review a cycling high-aerobic stimulus, not an automatic HIIT quota'},
 z2_volume:{intent:'moderate_lt1',family:'aerobic_endurance',sport:'bike',adaptation:'maintain cycling aerobic exposure; fresh observed TTE is not Ironman durability'},
 threshold_work:{intent:'mlss',family:'thresholds',sport:null,adaptation:'threshold expression; discipline and interval tolerance require explicit review'},
 force_max:{intent:'strength',family:'strength_economy',sport:null,adaptation:'neuromuscular development; competence, loading and tolerance not established'},
};

/** Decide from the real TFCL calculation BEFORE looking at any workout IDs or calendar. */
export function deriveV26Intentions(v:any){return deriveV22StimulusRequests(v.prepared,v.profile).map((r:any)=>{
 const bridge=BRIDGE[r.leverUnchanged.id],reasons=[...r.reasons];
 // This bound scope is explicitly supported by the preregistered bike field-test provenance.
 const sport=bridge?.sport==='bike'&&/bike/i.test(v.input.evidence?.aerobicTest??v.input.evidence?.thresholdTest??'')?'bike':null;
 if(!bridge)reasons.push('explicit_adaptation_bridge_missing');
 if(!sport)reasons.push('sport_bound_mechanism_evidence_missing');
 if(r.leverUnchanged.id==='z2_volume'&&(v.prepared.diagnostic.effectifs.tte.source!=='observed'||!(v.input.raw.tteObservedMin>0)))reasons.push('observed_TTE_required_not_estimated_durability');
 return{lever:r.leverUnchanged,adaptation:bridge?.adaptation??null,intent:bridge?.intent??null,family:bridge?.family??null,sport,reasons:[...new Set(reasons)],nativeRequestStatus:r.status,rawInputHash:digest(v.input),origin:'actual TFCL diagnostic and explicit V26 bridge; author dosage text not adopted',priority:r.leverUnchanged.priority,individualDose:null};
 }).sort((a:any,b:any)=>a.priority-b.priority||a.lever.id.localeCompare(b.lever.id));}

export function sourceMatchesV26Intent(record:any,intention:any){
 const p=record.originalCanonical.prescription,raw=record.originalCanonical.original.effective;
 // Explicit declared physiological intent is a source claim, not scientific validation.
 return !!intention.sport&&p.discipline===intention.sport&&!!raw.physiology&&
  (raw.physiology.primary===intention.intent||raw.physiology.secondary?.includes(intention.intent));
}

/** Reuses canonical/source eligibility and the V18 recipe instantiator, never infers dose from title. */
export function searchV26Stimuli(v:any,canonical:Map<string,any>,knowledge:any,spec:any){
 const intentions=deriveV26Intentions(v),refs=resolvePhysiologicalReferences(v.prepared),p=v.profile;
 const results=intentions.map((intent:any)=>{
  const family=knowledge.families.find((f:any)=>f.familyId===intent.family)??null;
  const context=family?{familyId:family.familyId,contextHash:digest(family),claims:family.studiedAdaptationsAndProposedMechanisms,limits:family.limitsAndContradictions,individualDataNeeded:family.individualDataNeeded,referenceScope:'family_context_only_not_exact_recipe_or_individual_dose'}:null;
  const matched=[...canonical.values()].filter(r=>sourceMatchesV26Intent(r,intent));
  const offers=matched.flatMap(record=>{
   const c=record.originalCanonical,card=originalCard(record.legacyId);
   const recipes=[{key:record.legacyId+'@original',recipe:record.sourceV18Recipe,editorial:false},...record.candidates.map((t:any)=>({key:t.candidateKey,recipe:t,editorial:true}))];
   return recipes.map(({key,recipe,editorial})=>{
    const complete=editorial?recipe.classification==='complete_timeline_candidate':recipe.classification==='complete';
    const minimum=complete?Math.max(c.prescription.durationMinutes[0],(recipe.elapsedSeconds?.min??0)/60):null;
    const witness=minimum!==null?instantiate(recipe.nodes.filter((n:any)=>n.kind!=='integrated'),minimum*60):null;
    const criteria={objective:p.config.objective,phase:p.prep.weeklyQuotas[1].phase,weekType:p.prep.weeklyQuotas[1].weekType,minutes:minimum??c.prescription.durationMinutes[0],intention:intent.intent,trainingLevel:p.config.ambitionMeta.trainingLevel,trainingLevelSource:p.config.ambitionMeta.trainingLevelSource,weeklyHours:p.config.weeklyHours};
    const isLong=intent.intent==='moderate_lt1';const capacity=isLong?p.longCaps.bike:p.normalCaps.bike;
    const base=editorial?evaluateCanonicalOffer(c,criteria):evaluateV18ReviewOffer(c,recipe,criteria,{currentCapacityMinutes:capacity,progressionRequested:false,availableSessionMinutes:capacity,effectiveRefs:{ftpWatts:refs.ftpWatts??undefined,mlssSpeedKmh:refs.mlssSpeedKmh??undefined,provenance:refs.provenance}});
    const blockers=[...intent.reasons,...base.reasons];
    if(!context)blockers.push('scientific_mechanism_context_missing');
    if(!witness)blockers.push('whole_recipe_witness_missing');
    if(!(refs.ftpWatts>0))blockers.push('bike_intensity_reference_missing');
    if(!Number.isFinite(capacity)||capacity<=0)blockers.push('current_capacity_unknown');
    else if(minimum!==null&&minimum>capacity)blockers.push('current_capacity_exceeded');
    if(editorial)blockers.push('editorial_recovery_convention_not_approved');
    const documentaryComparisons=(knowledge.protocolComparisons?.rows??[]).filter((row:any)=>row.candidateKey===key&&row.candidateHash===digest(recipe)&&row.sourceRecipeHash===record.sourceRecipeHash);
    const targets=resolveV22Targets(card.sport==='bike'?'bike':c.prescription.discipline,refs.ftpWatts,card.zones,card.structure,spec.common.coachDomainBindings);
    const unresolved=targets.filter((t:any)=>!('min' in t));
    if(unresolved.length)blockers.push('source_intensity_anchor_not_fully_resolved');
    return{key,sourceId:record.legacyId,sourceHash:digest(card),canonicalHash:record.sourceCanonicalHash,recipeHash:digest(recipe),sourceInstructions:c.original.effective.structure,restrictions:c.prescription.restrictions,explicitIntent:c.prescription.physiology,
     recipe,editorial,witness,minimumMinutes:minimum,capacity,targets,blockers:[...new Set(blockers)],goalVariant: c.prescription.variants?.ironman??null,goalVariantResolution:record.sourceV18Recipe.variants?.goalSpecificResolutionRequired?'requires_explicit_source_resolution':'no_goal_variant_in_source',
     documentaryComparisons,exactRecipeDoseEvidence:false,documentaryComparisonClearsNoPrerequisite:true,
     layers:{A_technicallyStructured:!!witness,B_mechanismPlausible:!!context,C_individuallyAdmissible:false,D_explicitCoachDoseApproval:false},
     doseStatus:'dose_not_individually_verified',status:blockers.length?'blocked_or_deferred_for_review':'candidate_for_coach_review',
     placement:{role:isLong?'existing_autonomous_long_bike':'separate_targeted_bike_exposure_not_inserted',week:'base; source phase restrictions retained',preservesEssentialRolesRequired:true,wholeMicrocycleValidationRequired:true},
     uncertainties:['within-envelope is not recipe-specific tolerance','family literature does not justify this exact dose','all intensity/recovery/source restrictions retained'],reassessment:'dated comparable-dose execution, symptoms, recovery and full microcycle review; no elapsed-time capacity gain'};
   });
  });
  // A transparent PARTIAL order. No weighted score and no arbitrary tie-break as a sporting choice.
  const tier=(o:any)=>o.blockers.length?2:o.layers.A_technicallyStructured?0:1;
  const ranks=[...new Set(offers.map(tier))].sort().map(t=>({tier:t,meaning:t===0?'reviewable within known technical gates':t===1?'incomplete protocol': 'blocked/deferred; not a prescription',keys:offers.filter(o=>tier(o)===t).map(o=>o.key).sort()}));
  return{intention:intent,scientificContext:context,scannedCanonicalRecords:canonical.size,explicitMatchingSources:matched.length,offers,ranking: ranks,
   shortlistForEvidenceReview:offers.filter(o=>o.layers.A_technicallyStructured&&o.layers.B_mechanismPlausible).map(o=>o.key),
   shortlistIsNotEligibility:true,
   selectedForCoachReview:offers.filter(o=>tier(o)===0).map(o=>o.key),tiesRetained:true,noAutomaticSessionChoice:true};
 });
 return{version:'det-v26-physiological-search-1',caseId:v.caseId,inputHash:digest(v.input),intentionsBeforeSearch: intentions,results,calendarMutationAllowed:false,individualDoseApproved:false};
}
