import{V12_SPEC}from'./v12-contract';
import type{ParsedPlan}from'@/lib/aiPlanParser';
import type{V10Profile}from'./v10-profiles';
import type{Offer}from'./v10-allocation';
import{v10Source}from'./v10-allocation';
import{v11Catalogue}from'./v11-catalogue';
import{buildMesocycle,globalCoherence,type BuiltWeek}from'./v11-mesocycle';
import{validateWeek}from'./v11-week-validation';
import{validateExperimentalCandidate,noNewCritical}from'./v2-validation';
import{auditTechnicalPlan}from'./v2-technical-validation';
import{literalDose}from'./v10-source-dose';
import{intervalEvidence,issueWitnesses}from'./v12-audit';
import{getDoctrineDomain}from'@/lib/zones/tfclDoctrine';
export type ProgressionModel='justified_maintenance'|'priority_duration'|'rest_density'|'controlled_intensity'|'technical_segmentation';
export type RecoveryModel='native_minima'|'bike_source_upper_bound'|'previous_swim_exposure';
function warningsStable(before:ReturnType<typeof validateExperimentalCandidate>,after:typeof before){const count=(a:typeof before)=>a.filter(i=>i.severity==='warning').reduce((m,i)=>{const k=i.code+':'+(i.week??0);m[k]=(m[k]??0)+1;return m;},{}as Record<string,number>);const b=count(before);return Object.entries(count(after)).every(([k,n])=>n<=(b[k]??0));}
export function rematerialize(p:V10Profile,o:Offer,sourceId:string,minutes:number){const card=v11Catalogue(p).find(c=>c.id===sourceId);if(!card)throw Error('SOURCE_NOT_IN_ADMISSIBLE_OFFER');const lit=literalDose(card),min=Math.max(card.durationMin[0],o.role.min,lit.range?.[0]??0),max=Math.min(card.durationMin[1],o.role.cap,lit.range?.[1]??Infinity);return{...o,card,min,max,minutes,sourceEvidence:v10Source(card,o.role,p)};}
export function evaluateBlock(p:V10Profile,base:ReturnType<typeof buildMesocycle>,offersByWeek:Offer[][]){if(!base.plan||base.weeks.length!==4)throw Error('REFERENCE_BLOCK_REQUIRED');const weeks:BuiltWeek[]=base.weeks.map((w,index)=>({...w,offers:offersByWeek[index],validation:validateWeek(p,w.context,offersByWeek[index])}));const plan:ParsedPlan={...base.plan,weeks:weeks.map(w=>w.validation.week)};const global=globalCoherence(p,weeks,plan),technical=auditTechnicalPlan(plan),legacy=validateExperimentalCandidate({...plan,totalWeeks:p.config.weeksAvailable??16},p.athlete,p.config);const newCritical=!noNewCritical(base.legacy??[],legacy),newWarnings=!warningsStable(base.legacy??[],legacy);const sourceRole=weeks.flatMap(w=>w.offers.filter(o=>!v10Source(o.card,o.role,p).compatible).map(o=>({week:w.context.week,source:o.card.id,reasons:v10Source(o.card,o.role,p).reasons})));return{weeks,plan,global,technical,legacy,issueWitnesses:issueWitnesses(p,plan,legacy),sourceRole,newCritical,newWarnings,passesExecuted:weeks.every(w=>w.validation.passesExecutedBlocking)&&global.passesExecuted&&technical.valid&&!sourceRole.length&&!newCritical&&!newWarnings,fullPreparationConformity:false,expertReviewed:false,physiologicalAdaptationDemonstrated:false};}
/** Bounded portfolio: hypotheses, not permutations or an optimization of acceptance count. */
export function progressionCandidate(p:V10Profile,model:ProgressionModel,base=buildMesocycle(p)){
 if(!V12_SPEC.progressionModels.includes(model))throw Error('UNKNOWN_PROGRESSION_MODEL');
 if(base.status!=='constructed')return{profile:p.id,model,status:'refused' as const,reason:'reference_not_admissible',attempt:null,changes:[],scientificStatus:'candidate'};
 const offers=base.weeks.map(w=>w.offers.map(o=>({...o}))),changes:unknown[]=[];
 if(model==='priority_duration'){
  const target=offers[1].find(o=>o.role.sport===p.focusSport&&o.role.kind==='long')!;
  const headroom=Math.max(0,target.max-target.minutes);
  return{profile:p.id,model,status:'rejected' as const,reason:headroom===0?'priority_source_or_individual_cap_exhausted':'no_response_evidence_for_added_duration',attempt:null,changes:[{source:target.card.id,current:target.minutes,sourceAndIndividualMax:target.max,headroom,noUniversalProgression:true}],scientificStatus:'no_optimal_dose_inference'};
 }
 if(model==='rest_density')return{profile:p.id,model,status:'rejected' as const,reason:'same_source_rest_is_fixed_do_not_rewrite_recipe',attempt:null,changes:[{source:'C_IM_AERO_HOLD',knownRest:5,requestedRule:'shorten recovery between unchanged work bouts',sourceAuthorizesAlternative:false}],scientificStatus:'no_individual_basis_or_admissible_protocol'};
 if(model==='controlled_intensity')return{profile:p.id,model,status:'rejected' as const,reason:'source_and_role_domain_fixed_no_individual_basis_for_higher_intensity',attempt:null,changes:[{source:'C_IM_AERO_HOLD',currentDomain:getDoctrineDomain('moderate_lt1').id,proposedDomain:getDoctrineDomain('im_pace').id,requestedHigherDomainNotPrescribed:true}],scientificStatus:'no_forced_HIT_or_invented_threshold'};
 if(model==='technical_segmentation'){
  const w=offers[0],index=w.findIndex(o=>o.role.kind==='technical'),old=w[index];
  const next=rematerialize(p,old,'C_BIKE_AERO_POSITION_DRILLS',85);let extra=next.minutes-old.minutes;
  const donors=w.filter(o=>o!==old&&o.role.sport!==p.focusSport&&o.minutes>o.min).sort((a,b)=>b.role.priority-a.role.priority||a.role.id.localeCompare(b.role.id));
  for(const d of donors){const take=Math.min(extra,d.minutes-d.min);if(take>0){changes.push({week:1,role:d.role.id,source:d.card.id,before:d.minutes,after:d.minutes-take,reason:'fund_extra_protocol_recovery_from_non_focus_extension_above_minimum',notMeasuredExternalLoadEquivalence:true});d.minutes-=take;extra-=take;}if(extra<=0)break;}
  if(extra>0)return{profile:p.id,model,status:'rejected' as const,reason:'no_safe_non_focus_extension_to_fund_protocol',attempt:null,changes,scientificStatus:'candidate'};
  w[index]=next;changes.push({week:1,role:old.role.id,before:intervalEvidence(old),after:intervalEvidence(next),reason:'shorter_uninterrupted_posture_bouts_initially; existing15min_bouts_only_after_response_review'});
 }
 const attempt=evaluateBlock(p,base,offers);
 return{profile:p.id,model,status:attempt.passesExecuted?(model==='justified_maintenance'?'retained_reference' as const:'retained_conditional' as const):'rejected' as const,reason:attempt.passesExecuted?'all_executed_full_block_guards_pass; actual_response_and_expert_review_missing':'executed_block_or_non_regression_failure',attempt,changes,scientificStatus:'candidate_not_expert_validated'};
}
export function recoveryCandidate(p:V10Profile,model:RecoveryModel,base=buildMesocycle(p)){
 if(!V12_SPEC.recoveryModels.includes(model))throw Error('UNKNOWN_RECOVERY_MODEL');
 if(base.status!=='constructed')throw Error('REFERENCE_REQUIRED');const offers=base.weeks.map(w=>w.offers.map(o=>({...o}))),changes:unknown[]=[];
 if(model==='bike_source_upper_bound')for(const o of offers[3].filter(o=>o.role.sport==='bike')){changes.push({source:o.card.id,before:o.minutes,after:o.max,basis:'existing catalogue upper bound sensitivity, not evidence that more is needed'});o.minutes=o.max;}
 if(model==='previous_swim_exposure')for(const o of offers[3].filter(o=>o.role.sport==='swim')){const prior=offers[2].find(a=>a.card.id===o.card.id);if(prior&&prior.minutes<=o.max){changes.push({source:o.card.id,before:o.minutes,after:prior.minutes,basis:'retain identical previously planned swim exposure; planned is not observed tolerance'});o.minutes=prior.minutes;}}
 const attempt=evaluateBlock(p,base,offers);return{profile:p.id,model,status:attempt.passesExecuted?'diagnostic_only' as const:'rejected' as const,attempt,changes,reason:model==='native_minima'?'lower_bound_reference_not_universal_recovery_percentage':'alternative_within_known_ranges; response_evidence_cannot_select_an_optimal_recovery_dose'};
}
