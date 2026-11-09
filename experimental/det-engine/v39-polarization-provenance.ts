/**
 * Read-only source attribution for the NATIVE polarization validator.
 * The native parser infers zone minutes from text/structured zones; it is
 * NOT an independent physiological proof. This audit changes no scores,
 * zones, session dose, validator result or release decision.
 */
import type {ParsedPlan,ParsedSession} from '@/lib/aiPlanParser';
import {estimateSessionZoneMinutes,parseSessionDurationMin} from '@/engines/plan/planValidator';

export interface PolarizationSourceAttribution {
  id:string|null;week:number;day:string;sport:string;durationMin:number|null;
  lowMin:number;midMin:number;highMin:number;unknownMin:number;
  zones:readonly string[];
}
export interface PolarizationWeekAttribution {
  week:number;lowPctOfClassifiable:number|null;unknownPctOfTotal:number|null;
  observedSessions:PolarizationSourceAttribution[];
  provenance:'native_text_zone_estimate_only_not_independent_proof';
}
function attribute(s:ParsedSession,week:number):PolarizationSourceAttribution {
  const duration=parseSessionDurationMin(s);
  const zones=estimateSessionZoneMinutes(s,duration);
  return {id:s.catalogId??null,week,day:s.dayName,sport:s.sport,
    durationMin:duration,lowMin:zones.low,midMin:zones.mid,
    highMin:zones.high,unknownMin:zones.unknown,zones:s.zones??[]};
}
export function diagnoseNativePolarizationWeeks(
  plan:ParsedPlan,failedWeekNumbers:readonly number[],
):PolarizationWeekAttribution[] {
  const failed=new Set(failedWeekNumbers.filter(Number.isSafeInteger));
  return plan.weeks.filter(w=>failed.has(w.weekNumber)).map(w=>{
    const rows=w.sessions.filter(s=>!s.isRest).map(s=>attribute(s,w.weekNumber));
    const low=rows.reduce((n,x)=>n+x.lowMin,0);
    const mid=rows.reduce((n,x)=>n+x.midMin,0);
    const high=rows.reduce((n,x)=>n+x.highMin,0);
    const unknown=rows.reduce((n,x)=>n+x.unknownMin,0);
    const known=low+mid+high;
    const grand=known+unknown;
    return {week:w.weekNumber,
      lowPctOfClassifiable:known>0?100*low/known:null,
      unknownPctOfTotal:grand>0?100*unknown/grand:null,
      observedSessions:rows.sort((a,b)=>
        (b.midMin+b.highMin)-(a.midMin+a.highMin)||a.day.localeCompare(b.day)),
      provenance:'native_text_zone_estimate_only_not_independent_proof' as const,
    };
  });
}
