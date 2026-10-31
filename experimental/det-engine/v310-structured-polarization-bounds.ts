/**
 * Necessary (never sufficient) per-slot feasibility tests for V310.
 * The exact linear form of >=75% of CLASSIFIABLE training minutes is
 *     low - 3*(mid+high) >= 0.
 * The exact linear form of <=30% unknown of ALL training minutes is
 *     7*unknown - 3*(low+mid+high) <= 0.
 * For each remaining slot we independently grant the mathematically best
 * eligible candidate, ignoring catalogue reuse, chronology and weekly cap.
 * This produces a truly OPTIMISTIC bound: it can prove impossibility but
 * can never label a real admissible combination impossible.
 */
import type {NativeZoneDose} from './v39-strict-native-polarization-target';

export interface BoundedZoneChoice {
  dose:NativeZoneDose;
  isKeyQuality:boolean;
}
export type ZoneFeasibilityReason =
  'missing_certified_slot'|'required_quality_unavailable'|
  'easy_fraction_impossible'|'unknown_fraction_impossible'|'not_refuted';
export interface ZoneNecessaryBounds {
  reason:ZoneFeasibilityReason;
  maxEasyMargin:number|null;
  minUnknownMargin:number|null;
  maxEasyMarginWithQuality:number|null;
  remainingSlots:number;
}
const easy=(d:NativeZoneDose)=>d.low-3*d.nonLow;
const unknown=(d:NativeZoneDose)=>7*d.unknown-3*(d.low+d.nonLow);
const valid=(d:NativeZoneDose)=>[d.low,d.nonLow,d.unknown].every(x=>
  Number.isFinite(x)&&x>=0);
const eps=1e-8;

export function assessStructuredZoneNecessaryBounds(
  chosen:readonly BoundedZoneChoice[],
  remaining:readonly (readonly (BoundedZoneChoice|null)[])[],
  requireKeyQuality:boolean,
):ZoneNecessaryBounds {
  let bestEasy=0,minUnknown=0;
  let alreadyQuality=false;
  for(const selected of chosen){
    if(!valid(selected.dose))return {reason:'missing_certified_slot',
      maxEasyMargin:null,minUnknownMargin:null,
      maxEasyMarginWithQuality:null,remainingSlots:remaining.length};
    bestEasy+=easy(selected.dose);
    minUnknown+=unknown(selected.dose);
    alreadyQuality ||= selected.isKeyQuality;
  }
  let bestQualityDelta=-Infinity;
  let anyQuality=false;
  for(const domain of remaining){
    const candidates=domain.filter((x):x is BoundedZoneChoice=>
      x!==null&&valid(x.dose));
    if(!candidates.length)return {reason:'missing_certified_slot',
      maxEasyMargin:null,minUnknownMargin:null,
      maxEasyMarginWithQuality:null,remainingSlots:remaining.length};
    const best=Math.max(...candidates.map(x=>easy(x.dose)));
    bestEasy+=best;
    minUnknown+=Math.min(...candidates.map(x=>unknown(x.dose)));
    const quality=candidates.filter(x=>x.isKeyQuality);
    if(quality.length){
      anyQuality=true;
      // Force AT LEAST one key-quality card: its loss relative to each
      // slot's best independent easy-margin may be unavoidable.
      bestQualityDelta=Math.max(bestQualityDelta,
        Math.max(...quality.map(x=>easy(x.dose)))-best);
    }
  }
  const requiredQualityAbsent=requireKeyQuality&&!alreadyQuality;
  const bestWithQuality=requiredQualityAbsent?
    (anyQuality?bestEasy+bestQualityDelta:null):bestEasy;
  const reason:ZoneFeasibilityReason=
    requiredQualityAbsent&&!anyQuality?'required_quality_unavailable':
    bestWithQuality!==null&&bestWithQuality< -eps?'easy_fraction_impossible':
    minUnknown>eps?'unknown_fraction_impossible':'not_refuted';
  return {reason,maxEasyMargin:bestEasy,minUnknownMargin:minUnknown,
    maxEasyMarginWithQuality:bestWithQuality,remainingSlots:remaining.length};
}
