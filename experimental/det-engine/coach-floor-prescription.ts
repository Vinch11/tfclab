import{COACH_FLOOR_POLICY}from'./coach-floor-policy';import{evaluateCoachFloorRequest}from'./coach-floor-contract';
import{digest}from'./v9-prospective';import{revalidateV22Reservation}from'./v22-prescription';import{validateFourWeekScopeV23}from'./v23-scope';import{evaluateFloorComplementV25}from'./v25-floor';

function additions(before:any[],after:any[]){const counts=(xs:any[])=>{const m=new Map<string,number>();for(const i of xs)if(['warning','error','critical','blocking'].includes(i.severity)){const k=JSON.stringify(i);m.set(k,(m.get(k)??0)+1);}return m;};const b=counts(before);return[...counts(after)].flatMap(([k,n])=>Array.from({length:Math.max(0,n-(b.get(k)??0))},()=>JSON.parse(k)));}

/** Independent complementary checks; no historical issue or floor is changed. */
export function validateCoachFloorAlternative(before:any,alternative:any,p:any,request:ReturnType<typeof evaluateCoachFloorRequest>){
 const errors:string[]=[],a=COACH_FLOOR_POLICY.scope,all=alternative.calendar.weeks.flatMap((w:any)=>w.slots),s=all.find((s:any)=>s.key===request.slotKey),original=before.calendar.weeks.flatMap((w:any)=>w.slots).find((s:any)=>s.key===request.slotKey);
 if(!request.referenceHash||digest(before)!==request.referenceHash)errors.push('original_reference_binding_missing_or_changed');
 const originalKeys=before.calendar.weeks.flatMap((w:any)=>w.slots.map((s:any)=>s.key)),actualKeys=all.map((s:any)=>s.key);
 const sameDecisionKeys=digest(before.decisions.map((d:any)=>d.slotKey).sort())===digest(alternative.decisions.map((d:any)=>d.slotKey).sort());
 const sameSources=all.every((s:any)=>{const old=before.calendar.weeks.flatMap((w:any)=>w.slots).find((x:any)=>x.key===s.key);return old&&digest(old.card)===digest(s.card);});
 if(digest([...originalKeys].sort())!==digest([...actualKeys].sort())||!sameDecisionKeys||!sameSources)return{version:'coach-floor-complementary-validation-1',policyId:request.policyId,policyDigest:request.policyDigest,policyApplied:false,status:'refused_experimental_alternative',errors:[...errors,'complete_original_session_graph_required'],authorizedFloorWitnesses:[],otherBlockErrors:[],uncoveredNewHistoricalIssues:[],rawHistoricalIssues:alternative.rawValidation.historical.issues,rawScope:null,legacyComplement:null,effectiveExperimentalPlanningFloor:null,historicalPlanningFloor:a.planningFloor,historicalIssuesRemoved:0,individualToleranceVerified:false,individualDoseApproved:false,operationalAuthorization:false};
 const independentlyRevalidated=structuredClone(alternative);revalidateV22Reservation(independentlyRevalidated,p);
 if(digest(independentlyRevalidated.rawValidation)!==digest(alternative.rawValidation))errors.push('historical_results_stale_or_modified');
 if(!request.authorizedForExperimentalProgramming||!s||!original)errors.push('authorized_bound_slot_required');
 if(s&&original){
  const freshRequest=evaluateCoachFloorRequest(original,p,request.caseId,a.candidateMinutes,request.enabled,COACH_FLOOR_POLICY,digest(before));
  if(digest(request)!==digest(freshRequest))errors.push('request_not_consistent_with_recorded_policy');
  if(s.minutes!==a.candidateMinutes||s.input.currentCapacity!==a.declaredCapacity||s.role.floor!==a.planningFloor||digest(s.card)!==a.sourceHash||s.day!==original.day)errors.push('dose_source_capacity_floor_or_placement_changed');
  const d=alternative.decisions.find((d:any)=>d.slotKey===s.key),old=before.decisions.find((d:any)=>d.slotKey===s.key),stored=alternative.calendar.calendar.weeks.find((w:any)=>w.weekNumber===s.week)?.sessions.find((x:any)=>x.catalogId===s.card.id);
  const expectedTargets=old.targets.filter((t:any)=>t.zone===a.requiredZone);
  if(!stored||digest(stored.zones)!==digest([a.requiredZone])||digest(d?.targets)!==digest(expectedTargets)||d?.minutes!==a.candidateMinutes||d?.strictVariantExecution?.requiredZone!==a.requiredZone)errors.push('strict_Z1_or_existing_target_provenance_not_preserved');
  if(digest(s.strictVariantExecution)!==digest(d?.strictVariantExecution)||digest(stored?.strictVariantExecution)!==digest(d?.strictVariantExecution)||digest(d?.strictVariantExecution?.numericTargets)!==digest(expectedTargets))errors.push('execution_views_not_identical');
  if(stored?.details!==original.card.structure||d?.goalVariantInstructions!==a.goalVariant)errors.push('source_or_variant_instructions_lost');
  if(!original.input.hardFailures.every((h:string)=>s.input.hardFailures.includes(h)))errors.push('target_hard_failure_removed');
  if(!original.input.conditions.every((c:any)=>s.input.conditions.some((x:any)=>digest(x)===digest(c))))errors.push('target_source_or_recovery_condition_removed');
  if(d?.state!==s.decision.state||d?.individualPrescriptionApproved!==false||!old.hardFailures.every((h:string)=>d.hardFailures.includes(h)))errors.push('decision_state_or_individual_approval_changed');
 }
 const previous=before.calendar.weeks.flatMap((w:any)=>w.slots);
 if(all.length!==previous.length)errors.push('session_count_changed');
 for(const old of previous){const current=all.find((s:any)=>s.key===old.key);if(!current){errors.push('session_removed');continue;}if(old.key!==request.slotKey&&digest(current)!==digest(old))errors.push('unrelated_session_modified');}
 for(const old of before.decisions)if(old.slotKey!==request.slotKey&&digest(old)!==digest(alternative.decisions.find((d:any)=>d.slotKey===old.slotKey)))errors.push('unrelated_decision_modified');
 const scope=validateFourWeekScopeV23(alternative,p),complement=evaluateFloorComplementV25(request.assessment,{result:alternative,scope});
 if(!complement.technicallyReceivableUnderControlledException)errors.push('whole_block_floor_complement_not_demonstrated');
 const expectedFloor=scope.originalWeeklyIssues.find((i:any)=>i.code==='quota_floor_violation'&&i.weekNumber===a.week&&i.expected===`1 run ≥${a.planningFloor}min`);
 const newRawIssues=additions(before.rawValidation.historical.issues,alternative.rawValidation.historical.issues);
 const uncovered=newRawIssues.filter((i:any)=>!(expectedFloor&&i.code==='quota_floor_violation'&&i.week===a.week&&i.control==='weekly_quotas'&&i.severity===expectedFloor.severity&&i.message===expectedFloor.reason));
 if(uncovered.length)errors.push('new_historical_issue_not_covered_by_floor_policy');
 if(alternative.decisions.some((d:any)=>d.individualPrescriptionApproved)||alternative.currentlyExecutablePlan)errors.push('individual_approval_or_execution_must_remain_false');
 return{version:'coach-floor-complementary-validation-1',policyId:request.policyId,policyDigest:request.policyDigest,policyApplied:errors.length===0,status:errors.length?'refused_experimental_alternative':'authorized_experimental_planning_only',errors:[...new Set(errors)],
  authorizedFloorWitnesses:complement.exceptionWitnesses,otherBlockErrors:complement.otherErrors,uncoveredNewHistoricalIssues:uncovered,rawHistoricalIssues:alternative.rawValidation.historical.issues,rawScope:scope,legacyComplement:complement,
  effectiveExperimentalPlanningFloor:errors.length?null:a.candidateMinutes,historicalPlanningFloor:a.planningFloor,historicalIssuesRemoved:0,individualToleranceVerified:false,individualDoseApproved:false,operationalAuthorization:false};
}

/** Opt-in alternative from V25's complete counterproposal. The V25 reference remains immutable. */
export function applyCoachFloorPolicy(baselineV25:any,p:any,caseId:string,enabled=false,policy:any=COACH_FLOOR_POLICY){
 const before=baselineV25.baselineV24.result,a=COACH_FLOOR_POLICY.scope;
 if(!enabled)return{caseId,enabled:false,status:'opted_out',baselineV25,requests:[],alternative:null,complementary:null,individualDoseApproved:false};
 const slots=before.calendar.weeks.flatMap((w:any)=>w.slots).filter((s:any)=>s.week===a.week&&s.role.sport===a.sport&&s.role.kind===a.role);
 const requests=slots.map((s:any)=>evaluateCoachFloorRequest(s,p,caseId,a.candidateMinutes,true,policy,digest(before))),eligible=requests.filter((r:any)=>r.authorizedForExperimentalProgramming);
 if(eligible.length!==1)return{caseId,enabled:true,status:'no_authorized_alternative',baselineV25,requests,alternative:null,complementary:null,individualDoseApproved:false};
 const request=eligible[0],counter=baselineV25.baselineV24.floorCounterproposals.find((x:any)=>x.result.calendar.weeks.some((w:any)=>w.slots.some((s:any)=>s.key===request.slotKey&&s.minutes===a.candidateMinutes)));
 if(!counter)throw Error('COMPLETE_V25_COUNTERPROPOSAL_REQUIRED');
 const alternative=structuredClone(counter.result),s=alternative.calendar.weeks.flatMap((w:any)=>w.slots).find((s:any)=>s.key===request.slotKey),d=alternative.decisions.find((d:any)=>d.slotKey===request.slotKey);
 const original=before.decisions.find((d:any)=>d.slotKey===request.slotKey),numeric=structuredClone(original.targets.filter((t:any)=>t.zone===a.requiredZone));
 const execution={requiredZone:a.requiredZone,variantInstructions:a.goalVariant,domainBindingOrigin:'unchanged preregistered V22 coach binding; not an equivalence between author zone systems',numericTargets:numeric,individualIntensityApproved:false,sourceHeartRateTerrainAndLT1InstructionsRetained:true};
 d.targets=numeric;d.strictVariantExecution=execution;d.goalVariantInstructions=a.goalVariant;s.strictVariantExecution=execution;
 const stored=alternative.calendar.calendar.weeks.find((w:any)=>w.weekNumber===s.week).sessions.find((x:any)=>x.catalogId===s.card.id);stored.zones=[a.requiredZone];stored.strictVariantExecution=execution;
 s.input.conditions.push({id:'strict_variant_Z1_individual_execution_unverified',kind:'prerequisite',beforeWeek:s.week,requiredEvidence:['confirm source variant Z1 terminology and existing doctrine binding','source-specific individual intensity, below-LT1/heart-rate/terrain and recovery review'],fallback:'hold individual prescription; do not substitute Z2 or invent a numeric reference'});
 revalidateV22Reservation(alternative,p);
 const complementary=validateCoachFloorAlternative(before,alternative,p,request);
 return{caseId,enabled:true,status:complementary.policyApplied?'authorized_experimental_alternative_not_individually_approved':'refused_experimental_alternative',baselineV25,requests,alternative,complementary,policyAuthorization:'explicit_user_transmitted_coach_policy',individualDoseApproved:false};
}
