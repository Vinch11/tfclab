/**
 * Conservative, READ-ONLY feasibility bounds for the LEGACY
 * session-count sport-ratio validator. NOT a replacement for duration-weighted
 * sporting programming and not a release decision.
 *
 * This proves a contradiction only when even the most permissive (independent)
 * count bounds cannot reach the current ratio target. Ignoring slot/calendar
 * coupling makes the bounds WIDER, hence never a false impossibility proof.
 */
import type { WeeklyQuota } from '@/engines/plan/sessionSizingMatrix';

type Sport='swim'|'bike'|'run';
type RatioBand=[number,number];
export interface RatioTarget {
  swim:RatioBand;bike:RatioBand;run:RatioBand;
}
export interface CountRatioBound {
  sport:Sport; minimumPossiblePct:number;maximumPossiblePct:number;
  targetPct:RatioBand; tolerancePct:number;
  provablyBelow:boolean;provablyAbove:boolean;
}
export interface CountRatioFeasibility {
  weeks:number;countFloor:Record<Sport|'brick',number>;
  countCeiling:Record<Sport|'brick',number>;
  bounds:CountRatioBound[];
  impossibilities:Sport[];
}
export function auditCountRatioQuotaFeasibility(
  quotas:readonly Pick<WeeklyQuota,'swim'|'bike'|'run'|'brick'>[],
  targets:RatioTarget,tolerancePct=3
):CountRatioFeasibility {
  if(!quotas.length||!Number.isFinite(tolerancePct)||tolerancePct<0)
    throw Error('ratio_audit_invalid_input');
  const kinds=['swim','bike','run','brick'] as const;
  for(const q of quotas)for(const k of kinds)
    if(!Number.isSafeInteger(q[k].min)||!Number.isSafeInteger(q[k].max)||
      q[k].min<0||q[k].max<q[k].min)throw Error('ratio_audit_invalid_quota');
  const floor=Object.fromEntries(kinds.map(k=>[k,quotas.reduce((n,q)=>n+q[k].min,0)])) as Record<Sport|'brick',number>;
  const ceiling=Object.fromEntries(kinds.map(k=>[k,quotas.reduce((n,q)=>n+q[k].max,0)])) as Record<Sport|'brick',number>;
  // Native validator adds Math.round(brickCount*0.5) to BOTH bike and run.
  const brickMin=Math.round(floor.brick*0.5),brickMax=Math.round(ceiling.brick*0.5);
  const minimum:Record<Sport,number>={swim:floor.swim,bike:floor.bike+brickMin,run:floor.run+brickMin};
  const maximum:Record<Sport,number>={swim:ceiling.swim,bike:ceiling.bike+brickMax,run:ceiling.run+brickMax};
  const sports=['swim','bike','run'] as const;
  const bounds=sports.map((sport):CountRatioBound=>{
    const other=sports.filter(s=>s!==sport);
    const minDenom=minimum[sport]+other.reduce((n,s)=>n+maximum[s],0);
    const maxDenom=maximum[sport]+other.reduce((n,s)=>n+minimum[s],0);
    const lower=minDenom>0?100*minimum[sport]/minDenom:0;
    const upper=maxDenom>0?100*maximum[sport]/maxDenom:100;
    const target=targets[sport];
    return {sport,minimumPossiblePct:lower,maximumPossiblePct:upper,
      targetPct:target,tolerancePct,
      provablyBelow:upper<target[0]-tolerancePct,
      provablyAbove:lower>target[1]+tolerancePct};
  });
  return {weeks:quotas.length,countFloor:floor,countCeiling:ceiling,bounds,
    impossibilities:bounds.filter(b=>b.provablyBelow||b.provablyAbove).map(b=>b.sport)};
}
