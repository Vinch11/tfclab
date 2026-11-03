/**
 * DET V3.35 — fail-closed, source-backed running race specificity.
 * A title containing "simulation" or "allure semi" is NOT a certificate.
 * Approval is athlete/objective-scoped upstream; exact V3 blocks must agree.
 * Pure experiment: no deployed validator or planner is changed.
 */
import type {ParsedSession} from '@/lib/aiPlanParser';
import type {StructuredZoneDose} from './v310-structured-zone-dose';
import {matchingStructuredDose} from './v310-structured-zone-dose';

export type RunningSpecificObjective='semi'|'marathon'|'10k';
export type ReviewedRunningSpecificSource={
  sourceId:string;objective:RunningSpecificObjective;
};
export type RunningSpecificDecision=
  | {verified:true;sourceId:string;objective:RunningSpecificObjective;
     durationMin:number;highMin:number;scientificAttestation:false}
  | {verified:false;reason:string;scientificAttestation:false};

export function verifyReviewedRunningRaceSpecific(
  session:ParsedSession,objective:RunningSpecificObjective,
  approved:((id:string)=>ReviewedRunningSpecificSource|null|undefined)|undefined,
  source:((id:string,durationMin:number)=>StructuredZoneDose|null|undefined)|undefined,
):RunningSpecificDecision {
  const refuse=(reason:string):RunningSpecificDecision=>({
    verified:false,reason,scientificAttestation:false,
  });
  const id=session.catalogId;
  if(session.isRest||session.custom===true||session.sport!=='run'||
     !id||!/^V3P_RUN_\d{3}$/.test(id))
    return refuse('not_a_reviewed_v3_run_source');
  const minutes=session.durationMin;
  if(typeof minutes!=='number'||!Number.isFinite(minutes)||minutes<=0)
    return refuse('missing_positive_session_duration');
  if(!approved||!source)return refuse('source_proof_provider_unavailable');
  let review:ReviewedRunningSpecificSource|null|undefined;
  try { review=approved(id); }
  catch { return refuse('source_review_provider_failed'); }
  if(!review||review.sourceId!==id||review.objective!==objective)
    return refuse('athlete_review_or_goal_does_not_match_source');
  let ledger:StructuredZoneDose|null|undefined;
  try { ledger=source(id,minutes); }
  catch { return refuse('source_dose_provider_failed'); }
  const checked=matchingStructuredDose(ledger??null,minutes);
  if(!checked||checked.provenance!=='v3_individually_configured_blocks_only'||
     checked.sourceIds.length!==1||checked.sourceIds[0]!==id)
    return refuse('exact_individual_source_blocks_unverified');
  // Both the reviewed semi_pace and marathon_pace main blocks are Z4 under
  // TFCL doctrine. A zero-quality activation cannot pass as race-specific.
  if(checked.high<=0)return refuse('no_proven_specific_main_intensity');
  return {verified:true,sourceId:id,objective,durationMin:minutes,
    highMin:checked.high,scientificAttestation:false};
}
