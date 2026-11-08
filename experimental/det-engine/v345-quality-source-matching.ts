/**
 * DET V3.45 — necessary combinatorial condition for an approved RUN quality
 * workout and distinct B13 source IDs across the SAME weekly slot domains.
 *
 * This is NOT a complete sporting certificate: clocks, 48h quality separation,
 * exact zones, volumes, load ramps, phase, limiter, and native validation remain.
 * A positive result means only "not refuted". Never invents a source or dose.
 */
import {hasDistinctSourceAssignment} from './v334-distinct-source-feasibility';

export type SourceQualityOption={sourceId:string|null;verifiedKeyQuality:boolean};
export type QualitySourceMatchingResult={
  verdict:'not_refuted'|'provably_unreachable_in_current_domains'|'unverified';
  reason:'quality_anchored_distinct_source_matching_exists'|
    'no_approved_quality_key_source'|'all_quality_anchors_conflict_with_source_uniqueness'|
    'unknown_source_identity'|'empty_or_missing_domain';
  qualitySourceCandidates:number;qualitySlotCount:number;checkedAnchors:number;
  scope:'same_athlete_week_approved_slot_source_ids_only';
  sportingAttestation:false;
};

export function assessQualityAnchoredSourceMatching(
  domains:readonly (readonly SourceQualityOption[])[],
):QualitySourceMatchingResult {
  const base={
    scope:'same_athlete_week_approved_slot_source_ids_only' as const,
    sportingAttestation:false as const,
  };
  const qualitySourceCandidates=domains.reduce((n,domain)=>
    n+new Set(domain.filter(c=>c.verifiedKeyQuality&&c.sourceId)
      .map(c=>c.sourceId!)).size,0);
  const qualitySlotCount=domains.filter(domain=>domain.some(c=>
    c.verifiedKeyQuality&&!!c.sourceId)).length;
  const result=(verdict:QualitySourceMatchingResult['verdict'],
    reason:QualitySourceMatchingResult['reason'],checkedAnchors:number):
    QualitySourceMatchingResult=>({
      ...base,verdict,reason,qualitySourceCandidates,qualitySlotCount,checkedAnchors,
    });
  if(!domains.length||domains.some(domain=>!domain.length))
    return result('unverified','empty_or_missing_domain',0);
  // Never prove impossibility when a source identity is missing; a real
  // official event has no training-card ID and is outside this certificate.
  if(domains.some(domain=>domain.some(c=>!c.sourceId)))
    return result('unverified','unknown_source_identity',0);
  if(!qualitySourceCandidates)
    return result('provably_unreachable_in_current_domains','no_approved_quality_key_source',0);
  const ids=domains.map(domain=>domain.map(c=>c.sourceId!));
  let checked=0;
  for(let slot=0;slot<domains.length;slot++){
    const tried=new Set<string>();
    for(const candidate of domains[slot]){
      if(!candidate.verifiedKeyQuality||!candidate.sourceId||
         tried.has(candidate.sourceId))continue;
      tried.add(candidate.sourceId);checked++;
      const anchored=ids.map((domain,index)=>
        index===slot?[candidate.sourceId!]:domain);
      if(hasDistinctSourceAssignment(anchored))
        return result('not_refuted','quality_anchored_distinct_source_matching_exists',checked);
    }
  }
  return result('provably_unreachable_in_current_domains',
    'all_quality_anchors_conflict_with_source_uniqueness',checked);
}
