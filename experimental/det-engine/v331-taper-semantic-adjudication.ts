/**
 * DET V3.31 — experimental source-based taper semantics, NOT a release rule.
 * This reconciles ONE native lexical "seuil" phase error only after a
 * separate, explicit athlete/week/source/dose-specific coach adjudication.
 * All original native findings remain in the audit. No global waiver and no
 * scientific safety attestation; other native blockers are untouched.
 */
import type {ParsedPlan,ParsedSession} from '@/lib/aiPlanParser';
import type {RepairWorkoutMetadata} from '../../supabase/functions/_shared/repairSportingEquivalence';
import {candidateViolatesNativeTaperPhase} from './v315-taper-phase-prefilter';
import {verifyReviewedTaperKeyStimulus,type ProvenTaperStimulus,type TaperSourceEvidence} from './v329-proven-taper-quality';
import {matchingStructuredDose} from './v310-structured-zone-dose';

export interface ExplicitTaperCoachReview {
  athleteContextId:string;sourceId:string;weekNumber:number;
  durationMin:number;highMin:number;unknownMin:number;
  intent:'brief_controlled_mlss_reminder';
  individuallyApproved:true;
}
export interface NativeTaperIssue {
  code:string;week?:number;severity:string;message?:string;
}
export interface TaperSemanticDecision {
  week:number;sourceId:string|null;title:string;
  disposition:'accepted_source_reviewed'|'native_seuil_text_reconciled'|'refused';
  reason:string;originalNativeIssue?:NativeTaperIssue;
  structuredDose?:ProvenTaperStimulus;
}
export interface TaperSemanticAdjudication {
  verdict:'verified'|'blocked';issues:NativeTaperIssue[];
  decisions:TaperSemanticDecision[];originalNativeIssues:NativeTaperIssue[];
  nativeIssuesPreservedInAudit:true;scientificAttestation:false;
  experimentalOnly:true;
}
const nativeMessage=(session:ParsedSession)=>
  'S'+session.weekNumber+': "'+session.title+
  '" inadapté en phase "'+session.phase+
  '" — contenu typique d\'une phase différente';
// This is an explicit narrow threshold-language rule, not a general "hard
// session" exemption. Other forbidden words still veto the reconciliation.
const dangerousContent=/chantier|force\s*max|blocs?\s*concentré|\bbuild\b|\bvo2\s*max\b|\bvma\b|fractionn[eé]/i;
const thresholdWord=/\bseuil\b/i;
const highZone=/z\s*[4-7]/i;
export function reconcileReviewedTaperSemantics(args:{
  plan:ParsedPlan;nativeIssues:readonly NativeTaperIssue[];
  cards:readonly RepairWorkoutMetadata[];
  source:TaperSourceEvidence|undefined;
  athleteContextId:string;
  explicitReviewFor:(session:ParsedSession)=>ExplicitTaperCoachReview|null|undefined;
}):TaperSemanticAdjudication {
  const originalNativeIssues=args.nativeIssues.map(i=>({...i}));
  const issues=originalNativeIssues.map(i=>({...i}));
  const decisions:TaperSemanticDecision[]=[];
  let blocked=false;
  const refuse=(session:ParsedSession,reason:string)=>{
    blocked=true;
    decisions.push({week:session.weekNumber,sourceId:session.catalogId??null,
      title:session.title,disposition:'refused',reason});
  };
  if(!args.athleteContextId?.trim()){
    return {verdict:'blocked',issues,decisions:[],originalNativeIssues,
      nativeIssuesPreservedInAudit:true,scientificAttestation:false,
      experimentalOnly:true};
  }
  for(const week of args.plan.weeks){
    if(week.phase.trim().toLowerCase()!=='taper')continue;
    for(const session of week.sessions){
      if(session.isRest)continue;
      // The untouched native race identity rule is authoritative. The race
      // itself must never be classified as a taper training stimulus here.
      if(session.custom===true&&session.catalogId==null&&
         session.durationMin===0&&session.title.startsWith('COURSE :')&&
         session.details.startsWith('Épreuve déclarée ; durée à confirmer'))continue;
      const card=args.cards.find(c=>c.id===session.catalogId);
      if(!card){refuse(session,'taper_workout_source_not_identified');continue;}
      const endurance=['swim','bike','run','brick'].includes(session.sport);
      // A harmless-looking title or Z2 label must not hide a real Z4 block.
      // Check ALL taper endurance sources, not only labelled key sessions.
      let ledger:ReturnType<TaperSourceEvidence>|null=null;
      if(endurance){
        try{ledger=args.source?.(card.id,session.durationMin)??null;}
        catch{ledger=null;}
        const checked=matchingStructuredDose(ledger??null,session.durationMin);
        if(!checked||
           checked.provenance!=='v3_individually_configured_blocks_only'||
           checked.sourceIds.length!==1||checked.sourceIds[0]!==card.id){
          refuse(session,'taper_training_source_dose_unverified');continue;
        }
      }
      const nativeForbidden=candidateViolatesNativeTaperPhase(session);
      if(!nativeForbidden&&card.mainZoneMax<4&&
         !session.zones?.some(z=>highZone.test(z))&&
         (ledger?.high??0)===0)continue;
      const text=session.title+' '+session.details;
      if(nativeForbidden &&
         (!thresholdWord.test(text)||dangerousContent.test(text))){
        refuse(session,'native_forbidden_non_threshold_taper_content');continue;
      }
      const proof=verifyReviewedTaperKeyStimulus(session,card,args.source);
      if(proof.verified===false){refuse(session,'source_proof_'+proof.reason);continue;}
      let review:ExplicitTaperCoachReview|null|undefined;
      try{review=args.explicitReviewFor(session);}catch{review=null;}
      if(!review||review.individuallyApproved!==true||
         review.intent!=='brief_controlled_mlss_reminder'||
         review.athleteContextId!==args.athleteContextId||
         review.sourceId!==proof.evidence.sourceId||
         review.weekNumber!==session.weekNumber||
         review.durationMin!==proof.evidence.durationMin||
         review.highMin!==proof.evidence.highMin||
         review.unknownMin!==proof.evidence.unknownMin){
        refuse(session,'explicit_individual_taper_review_missing_or_mismatched');
        continue;
      }
      if(nativeForbidden){
        const expected=nativeMessage(session);
        const matching=issues.map((issue,index)=>({issue,index})).filter(x=>
          x.issue.code==='phase_coherence'&&x.issue.severity==='error'&&
          x.issue.week===session.weekNumber&&x.issue.message===expected);
        // No ambiguous matching / hidden native errors. Duplicate titles
        // in a week are never eligible for reconciliation.
        const duplicate=week.sessions.filter(s=>
          !s.isRest&&s.title===session.title).length!==1;
        if(matching.length!==1||duplicate){
          refuse(session,'native_phase_issue_missing_or_ambiguous');continue;
        }
        const found=matching[0];
        const old={...found.issue};
        // Experimental migration only, recorded with the original blocker.
        // The UI's released native validator and source text remain intact.
        issues[found.index]={...found.issue,severity:'warning'};
        decisions.push({week:session.weekNumber,
          sourceId:proof.evidence.sourceId,title:session.title,
          disposition:'native_seuil_text_reconciled',
          reason:'one_exact_native_threshold_text_error_with_explicit_review',
          originalNativeIssue:old,structuredDose:proof.evidence});
      }else{
        decisions.push({week:session.weekNumber,
          sourceId:proof.evidence.sourceId,title:session.title,
          disposition:'accepted_source_reviewed',
          reason:'exact_source_dose_and_individual_taper_review',
          structuredDose:proof.evidence});
      }
    }
  }
  return {verdict:blocked?'blocked':'verified',issues,decisions,
    originalNativeIssues,nativeIssuesPreservedInAudit:true,
    scientificAttestation:false,experimentalOnly:true};
}
