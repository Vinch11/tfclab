export interface CoachDecisionV25 {
 id:string;subjectHash:string;scope:'planning_floor_only'|'session_prescription';decision:'approve'|'reject';
 actorId:string;actorRole:'qualified_coach';recordedAt:string;reason:string;signature:string;synthetic:boolean;
}
export type CoachVerifierV25=(document:CoachDecisionV25)=>boolean;
/** An external authenticated human-record verifier is required. It is never supplied by the offline harness. */
export function verifyCoachDecisionV25(document:CoachDecisionV25|undefined,subjectHash:string,scope:CoachDecisionV25['scope'],simulation:boolean,verifier?:CoachVerifierV25){
 if(!document)return{status:'pending_explicit_decision',approved:false,reason:'no_human_decision_document'};
 if(simulation||document.synthetic)return{status:'rejected_untrusted_document',approved:false,reason:'simulation_cannot_create_coach_approval'};
 if(document.subjectHash!==subjectHash||document.scope!==scope||document.actorRole!=='qualified_coach'||!document.id||!document.actorId||!document.reason||!document.signature||!Number.isFinite(Date.parse(document.recordedAt)))return{status:'rejected_untrusted_document',approved:false,reason:'wrong_subject_scope_or_incomplete_human_record'};
 if(!verifier||!verifier(document))return{status:'rejected_untrusted_document',approved:false,reason:'authenticated_human_record_verification_unavailable_or_failed'};
 return{status:document.decision==='approve'?'verified_explicit_decision':'rejected_by_explicit_decision',approved:document.decision==='approve',reason:'verified_human_record_for_this_subject_and_scope'};
}
