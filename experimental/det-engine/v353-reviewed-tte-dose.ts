/**
 * DET V3.53 — narrowly interpreted TTE-compatible threshold-dose evidence.
 *
 * Native "tte" and original V3 "threshold_tolerance" are NOT the same ID.
 * Only a source explicitly reviewed for this athlete, carrying a genuinely
 * MLSS-domain prescription and >=20 exact Z4–Z6 minutes is counted as an
 * experimental TTE-relevant threshold session. This is NOT a measured TTE
 * adaptation or independent scientific validation. Marathon pace, Z2 and
 * generic durability never become threshold work by label or synonym.
 */
import {matchingStructuredDose,type StructuredZoneDose} from './v310-structured-zone-dose';

export interface ThresholdTteDecision {
  verified:boolean;
  sourceId:string;
  verifiedThresholdMin:number;
  basis:'mlss_source_and_exact_z4_blocks'|'unverified';
  reason:string|null;
  scientificAttestation:false;
}
const norm=(v:string)=>v.trim().toLowerCase().replace(/[\s-]+/g,'_');
export function verifyReviewedTteThresholdDose(args:{
  sourceId:string;
  durationMin:number;
  dose:StructuredZoneDose|null|undefined;
  sourceLimiterKeys:readonly string[]|null|undefined;
  sourcePrimaryDomain:string|null|undefined;
}):ThresholdTteDecision {
  const refusal=(reason:string):ThresholdTteDecision=>({
    verified:false,sourceId:args.sourceId,verifiedThresholdMin:0,
    basis:'unverified',reason,scientificAttestation:false,
  });
  if(!/^V3P_RUN_\d{3}$/.test(args.sourceId))
    return refusal('not_an_individually_reviewed_v3_run_source');
  const d=matchingStructuredDose(args.dose??null,args.durationMin);
  if(!d||d.provenance!=='v3_individually_configured_blocks_only'||
     d.sourceIds.length!==1||d.sourceIds[0]!==args.sourceId)
    return refusal('missing_exact_single_source_v3_blocks');
  const keys=args.sourceLimiterKeys;
  if(args.sourcePrimaryDomain!=='mlss'||!Array.isArray(keys)||
    !keys.some(k=>norm(k)==='threshold_tolerance')||
    !keys.some(k=>norm(k)==='fractional_utilization'))
    return refusal('not_a_verified_mlss_threshold_tolerance_source');
  // Mirrors native TTE's >=20min sustained-threshold target. Total exact
  // threshold-zone work, NOT inferred aerobic/warmup/recovery time.
  if(d.high<20)return refusal('less_than_20_minutes_exact_threshold_work');
  return {verified:true,sourceId:args.sourceId,verifiedThresholdMin:d.high,
    basis:'mlss_source_and_exact_z4_blocks',reason:null,scientificAttestation:false};
}
