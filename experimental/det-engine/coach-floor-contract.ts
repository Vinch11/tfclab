import{COACH_FLOOR_POLICY}from'./coach-floor-policy';import{digest}from'./v9-prospective';import{assessPlanningFloorV25}from'./v25-floor';
const POLICY_DIGEST=digest(COACH_FLOOR_POLICY);
/** User-authorized experimental programming policy; never a signed individual prescription. */
export function evaluateCoachFloorRequest(slot:any,p:any,caseId:string,minutes:number,enabled=false,policy:any=COACH_FLOOR_POLICY,referenceHash:string|null=null){
 const reasons:string[]=[];const a=COACH_FLOOR_POLICY.scope;
 if(enabled!==true)reasons.push('explicit_opt_in_required');
 if(digest(policy)!==POLICY_DIGEST)reasons.push('policy_not_the_recorded_coach_authorization');
 if(!p.synthetic)reasons.push('experimental_synthetic_fixtures_only');
 if(!(a.allowedCaseIds as readonly string[]).includes(caseId))reasons.push('cohort_not_authorized');
 if(p.config.objective!==a.objective||slot.role.sport!==a.sport||slot.role.kind!==a.role||slot.week!==a.week)reasons.push('objective_role_or_week_outside_policy');
 if(slot.card.id!==a.sourceId||digest(slot.card)!==a.sourceHash)reasons.push('source_not_authorized_or_recipe_changed');
 if(slot.card.variants?.ironman!==a.goalVariant)reasons.push('ironman_variant_changed');
 if(slot.role.floor!==a.planningFloor)reasons.push('planning_floor_not_authorized');
 if(slot.input.currentCapacity!==a.declaredCapacity||slot.role.currentCapacity!==a.declaredCapacity)reasons.push('declared_capacity_unknown_or_not_authorized');
 if(minutes!==a.candidateMinutes)reasons.push('candidate_duration_not_authorized');
 const assessment=assessPlanningFloorV25(slot,p,minutes,{simulation:true});reasons.push(...assessment.reasons);
 return{version:'coach-floor-request-1',caseId,slotKey:slot.key,policyId:COACH_FLOOR_POLICY.id,policyDigest:POLICY_DIGEST,referenceHash,enabled,minutes,reasons:[...new Set(reasons)],authorizedForExperimentalProgramming:reasons.length===0,coachPolicyStatus:reasons.length?'not_applicable_or_refused':'authorized_experimental_floor_only',
  assessment,policyAuthorization:'explicit_conversation_coach_policy_not_a_signature',requiredZone:a.requiredZone,planningFloorOriginal:slot.role.floor,planningFloorComplementary:reasons.length?null:a.candidateMinutes,
  individualDoseApproved:false,individualToleranceVerified:false,operationalAuthorization:false,productionAuthorized:false};
}
