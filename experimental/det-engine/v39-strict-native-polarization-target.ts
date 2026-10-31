/**
 * V3.9 exploratory selection gate against the existing native text-based
 * time-in-zone estimator. This is NOT scientific source-zone attestation:
 * it only avoids accepting a week that its existing validator would call
 * unpolarized. All source and recovery gates still apply independently.
 */
import type {ParsedSession} from '@/lib/aiPlanParser';
import {estimateSessionZoneMinutes,parseSessionDurationMin} from '@/engines/plan/planValidator';

export interface NativePolarizationTarget {
  admissible:boolean;reason:string;
  lowPctOfClassifiable:number|null;unknownPctOfTotal:number|null;
  low:number;mid:number;high:number;unknown:number;
}
export function assessStrictNativePolarizationTarget(
  sessions:readonly ParsedSession[],
):NativePolarizationTarget {
  let low=0,mid=0,high=0,unknown=0;
  for(const s of sessions.filter(s=>!s.isRest)){
    const duration=parseSessionDurationMin(s);
    if(duration===null||!Number.isFinite(duration)||duration<=0)return {
      admissible:false,reason:'training_duration_not_verified',
      lowPctOfClassifiable:null,unknownPctOfTotal:null,
      low,mid,high,unknown,
    };
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
    low,mid,high,unknown};
}
