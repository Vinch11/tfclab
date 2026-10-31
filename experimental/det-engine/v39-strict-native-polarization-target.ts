/**
 * V3.9 exploratory selection gate against the existing native text-based
 * time-in-zone estimator. It is NOT scientific source-zone attestation.
 * Source admission, recovery and all native validators remain mandatory.
 */
import type {ParsedSession} from '@/lib/aiPlanParser';
import {estimateSessionZoneMinutes,parseSessionDurationMin} from '@/engines/plan/planValidator';

export interface NativeZoneDose {
  low:number;nonLow:number;unknown:number;
}
export interface NativePolarizationTarget extends NativeZoneDose {
  admissible:boolean;reason:string;
  lowPctOfClassifiable:number|null;unknownPctOfTotal:number|null;
  mid:number;high:number;
}
const isFrequencyOnlyStrength=(s:ParsedSession)=>
  /^(?:strength|renforcement|renfo)$/i.test(s.sport);

/** Null means its real training duration cannot be established. */
export function nativeZoneDoseForCandidate(s:ParsedSession):NativeZoneDose|null {
  if(s.isRest)return {low:0,nonLow:0,unknown:0};
  const duration=parseSessionDurationMin(s);
  if(duration===null||!Number.isFinite(duration)||duration<=0){
    // Strength is prescribed in FREQUENCY, not fabricated aerobic minutes.
    // The native parser also attributes zero zone time when timing is absent.
    return isFrequencyOnlyStrength(s)?{low:0,nonLow:0,unknown:0}:null;
  }
  const z=estimateSessionZoneMinutes(s,duration);
  return {low:z.low,nonLow:z.mid+z.high,unknown:z.unknown};
}
/**
 * Safe optimistic UPPER bound for possible Z1/Z2 share:
 * grant EACH remaining slot its maximal easy minutes AND its minimal
 * non-easy minutes, even if from different candidates. Ignore unknown time,
 * weekly hours, consumed source IDs and chronology in this upper bound.
 * Therefore, an upper bound BELOW 75 proves the current slot domains
 * cannot reach 75 using the native estimator, never the opposite.
 */
export function optimisticNativeLowShareUpperBound(
  chosen:readonly NativeZoneDose[],
  remainingDomains:readonly (readonly (NativeZoneDose|null)[])[],
):{upperPct:number|null;provablyBelow75:boolean;unmeasuredDomain:boolean} {
  let maxLow=chosen.reduce((n,p)=>n+p.low,0);
  let minNonLow=chosen.reduce((n,p)=>n+p.nonLow,0);
  for(const domain of remainingDomains){
    const valid=domain.filter((x):x is NativeZoneDose=>x!==null);
    if(!valid.length)return {upperPct:null,provablyBelow75:false,unmeasuredDomain:true};
    maxLow+=Math.max(...valid.map(x=>x.low));
    minNonLow+=Math.min(...valid.map(x=>x.nonLow));
  }
  const total=maxLow+minNonLow;
  const upperPct=total>0?100*maxLow/total:null;
  return {upperPct,provablyBelow75:upperPct!==null&&upperPct<75-1e-9,
    unmeasuredDomain:false};
}
export function assessStrictNativePolarizationTarget(
  sessions:readonly ParsedSession[],
):NativePolarizationTarget {
  let low=0,mid=0,high=0,unknown=0;
  for(const s of sessions.filter(s=>!s.isRest)){
    const duration=parseSessionDurationMin(s);
    if(duration===null||!Number.isFinite(duration)||duration<=0){
      if(isFrequencyOnlyStrength(s))continue;
      return {admissible:false,reason:'training_duration_not_verified',
        lowPctOfClassifiable:null,unknownPctOfTotal:null,
        low,mid,high,unknown,nonLow:mid+high};
    }
    const z=estimateSessionZoneMinutes(s,duration);
    low+=z.low;mid+=z.mid;high+=z.high;unknown+=z.unknown;
  }
  const known=low+mid+high;
  const total=known+unknown;
  const lowPct=known?100*low/known:null;
  const unknownPct=total?100*unknown/total:null;
  const reason=!known?'no_classifiable_zone_minutes':
    unknownPct!==null&&unknownPct>30?'native_unknown_zone_time_exceeds_30_pct':
    lowPct!==null&&lowPct<75?'native_low_intensity_below_strict_75_pct':
    'native_zone_time_target_met';
  return {admissible:reason==='native_zone_time_target_met',reason,
    lowPctOfClassifiable:lowPct,unknownPctOfTotal:unknownPct,
    low,mid,high,nonLow:mid+high,unknown};
}
