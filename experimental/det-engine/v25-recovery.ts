import{digest}from'./v9-prospective';import{verifyCoachDecisionV25,type CoachDecisionV25,type CoachVerifierV25}from'./v25-coach';
export type RecoveryStateV25='planned_conditional'|'suspended_due_to_recovery'|'awaiting_reassessment'|'candidate_for_coach_review'|'not_admissible'|'approved_by_coach';
export interface RecoverySubjectV25{slotKey:string;sourceId:string;sourceHash:string;minutes:number;currentCapacityMinutes:number|null;synthetic:boolean;}
export interface RecoveryObservationV25{
 slotKey:string;sourceId:string;sourceHash:string;recordedAt:string;validThrough:string;synthetic:boolean;
 response:'unknown'|'adverse'|'favourable';recovered:boolean|null;pain:boolean|null;symptoms:boolean|null;restriction:boolean|null;
 previousToleranceDocumented:boolean;previousCompletedMinutes:number|null;toleranceProvenance:string;
 referenceUsable:boolean;microcycleCompatible:boolean;capacityMinutes:number|null;capacityProvenance:string;
}
export type RecoveryEventV25={kind:'adverse_response'|'request_reassessment'|'document_reassessment';at:string;observation?:RecoveryObservationV25}|{kind:'coach_decision';at:string;document:CoachDecisionV25};
/** Bounded prospective decision log. It does not remove any native calendar hold or allocate compensation. */
export function replayRecoveryV25(subject:RecoverySubjectV25,events:RecoveryEventV25[],asOf:string,context:{simulation:boolean;verifier?:CoachVerifierV25;nativeSuspension?:{reason:string;observedAt:string|null}}){
 if(!subject.slotKey||!subject.sourceId||!(/^[a-f0-9]{64}$/i.test(subject.sourceHash??''))||typeof subject.synthetic!=='boolean'||!Number.isFinite(subject.minutes)||subject.minutes<=0||subject.currentCapacityMinutes!==null&&(!Number.isFinite(subject.currentCapacityMinutes)||subject.currentCapacityMinutes<=0))throw Error('V25_INVALID_RECOVERY_SUBJECT');
 if(events.length>32)throw Error('V25_RECOVERY_EVENT_BUDGET');
 let state:RecoveryStateV25=context.nativeSuspension?'suspended_due_to_recovery':'planned_conditional',lastTime=-Infinity,lastAdverse=context.nativeSuspension?.observedAt?Date.parse(context.nativeSuspension.observedAt):-Infinity,lastReviewHash:string|null=null;
 const history:any[]=[],initialSubject=structuredClone(subject);let recoveryHold=!!context.nativeSuspension;
 for(const event of events){
  const from=state,reasons:string[]=[],time=Date.parse(event.at),now=Date.parse(asOf);let accepted=true;
  if(!Number.isFinite(time)||!Number.isFinite(now)||time>now||time<lastTime){reasons.push('future_invalid_or_out_of_order_event');accepted=false;}
  else if(event.kind==='request_reassessment'){
   if(!['suspended_due_to_recovery','awaiting_reassessment','not_admissible'].includes(state)){accepted=false;reasons.push('no_suspension_requiring_reassessment');}else{state='awaiting_reassessment';lastReviewHash=null;}
  }else if(event.kind==='coach_decision'){
   if(state!=='candidate_for_coach_review'||!lastReviewHash){accepted=false;reasons.push('reviewable_evidence_packet_required');}
   else{const decision=verifyCoachDecisionV25(event.document,lastReviewHash,'session_prescription',context.simulation||subject.synthetic,context.verifier);if(decision.approved){state='approved_by_coach';recoveryHold=false;}else{accepted=false;reasons.push(decision.reason);}}
  }else{
   const o=event.observation;
   const identity=!!o&&o.slotKey===subject.slotKey&&o.sourceId===subject.sourceId&&o.sourceHash===subject.sourceHash;
   const temporal=!!o&&Number.isFinite(Date.parse(o.recordedAt))&&Date.parse(o.recordedAt)<=time&&Date.parse(o.validThrough)>=now&&Date.parse(o.validThrough)>=Date.parse(o.recordedAt);
   const provenance=!!o&&o.synthetic===subject.synthetic&&(!o.synthetic||context.simulation)&&!!o.capacityProvenance&&!!o.toleranceProvenance;
   if(!identity||!temporal||!provenance){accepted=false;reasons.push('missing_wrong_scope_stale_or_unbound_observation');}
   else if(event.kind==='adverse_response'){
    if(o!.response!=='adverse'&&o!.recovered!==false&&o!.pain!==true&&o!.symptoms!==true&&o!.restriction!==true){accepted=false;reasons.push('adverse_event_needs_actual_adverse_observation');}
    else{state='suspended_due_to_recovery';recoveryHold=true;lastAdverse=time;lastReviewHash=null;reasons.push('adverse_recovery_hold');}
   }else if(event.kind==='document_reassessment'){
    if(context.nativeSuspension&&!Number.isFinite(lastAdverse)){accepted=false;reasons.push('native_suspension_date_required_before_reassessment');}
    else if(!['awaiting_reassessment','suspended_due_to_recovery','not_admissible'].includes(state)||time<=lastAdverse){accepted=false;reasons.push('new_dated_reassessment_after_suspension_required');}
    else if(o!.response==='adverse'||o!.recovered===false||o!.pain===true||o!.symptoms===true||o!.restriction===true){state=o!.pain===true||o!.symptoms===true||o!.restriction===true?'not_admissible':'suspended_due_to_recovery';recoveryHold=true;lastAdverse=time;lastReviewHash=null;reasons.push('persistent_adverse_response_pain_or_restriction');}
    else{
     if(o!.response!=='favourable'||o!.recovered!==true)reasons.push('recent_favourable_recovery_not_documented');
     if(o!.pain!==false||o!.symptoms!==false||o!.restriction!==false)reasons.push('symptoms_pain_and_restriction_status_required');
     if(!o!.previousToleranceDocumented||!Number.isFinite(o!.previousCompletedMinutes)||(o!.previousCompletedMinutes??0)<=0)reasons.push('previous_source_session_tolerance_not_documented');
     if(!o!.referenceUsable)reasons.push('physiological_reference_missing_or_uncertain');
     const capacity=subject.currentCapacityMinutes;
     if(capacity===null||!Number.isFinite(capacity)||capacity<=0||o!.capacityMinutes!==capacity)reasons.push('current_capacity_unknown_or_changed_without_separate_evidence');
     else if(subject.minutes>capacity)reasons.push('target_dose_exceeds_current_capacity');
     if(!o!.microcycleCompatible)reasons.push('microcycle_constraints_not_demonstrated');
     state=reasons.some(r=>['target_dose_exceeds_current_capacity','physiological_reference_missing_or_uncertain','microcycle_constraints_not_demonstrated'].includes(r))?'not_admissible':reasons.length?'awaiting_reassessment':'candidate_for_coach_review';
     if(state==='candidate_for_coach_review')lastReviewHash=digest({subject,observation:o,asOf:event.at});
     // A candidate review never clears the operative suspension; human authorization is a separate boundary.
    }
   }else{accepted=false;reasons.push('unknown_event_kind');}
  }
  if(accepted)lastTime=time;
  history.push({sequence:history.length+1,event,from,to:state,accepted,reasons,subjectHash:digest(subject),reviewPacketHash:lastReviewHash});
 }
 return{version:'det-v25-recovery-reassessment-1',subject:initialSubject,state,history,nativeSuspension:context.nativeSuspension??null,reviewPacketHash:lastReviewHash,recoveryHoldStillOperative:recoveryHold,currentCapacityMinutes:subject.currentCapacityMinutes,targetRecipeIndividualToleranceVerified:false,capacityIncreased:false,adaptationObserved:false,compensationMinutes:0,calendarModified:false,individualDoseApproved:state==='approved_by_coach',operationalAuthorization:false,simulation:context.simulation};
}
