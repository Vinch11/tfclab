/**
 * DET V3.14 — optimistic necessary bounds for cumulative TRIATHLON minutes.
 * Only previously certified load-week contributions and admissible exact V3
 * doses enter this proof. The component is a search guard, NOT a validator
 * waiver or independent evidence of sporting feasibility.
 */
import type {TriContribution,TriMinutes,TriSport} from './v312-triathlon-dose-trajectory';

export const TRIATHLON_STRICT_MINUTE_RANGES:Record<'703'|'IM',Record<TriSport,readonly [number,number]>>={
  '703':{swim:[15,20],bike:[40,50],run:[30,40]},
  IM:{swim:[15,20],bike:[45,55],run:[25,35]},
};
const sports=['swim','bike','run'] as const;
const validMinutes=(c:TriContribution|null):c is TriContribution=>
  c!==null&&sports.every(s=>Number.isFinite(c[s])&&c[s]>=0)&&
  Number.isFinite(c.transition)&&c.transition>=0&&
  sports.reduce((total,s)=>total+c[s],0)+c.transition>0;
const validLedger=(v:Readonly<TriMinutes>)=>
  sports.every(s=>Number.isFinite(v[s])&&v[s]>=0);
const add=(a:TriMinutes,b:TriContribution):TriMinutes=>({
  swim:a.swim+b.swim,bike:a.bike+b.bike,run:a.run+b.run,
});
const denominator=(v:Readonly<TriMinutes>)=>v.swim+v.bike+v.run;
export interface CumulativeMinuteRatioBound {
  verdict:'not_refuted'|'provably_outside_current_domains'|'unverified';
  bounds:Record<TriSport,{minPct:number;maxPct:number}>|null;
  outside:TriSport[];
  /** Always a necessary condition, never a certification of an actual plan. */
  interpretation:'optimistic_independent_slot_bounds_only';
}
export function assessCumulativeTriathlonRatioPotential(
  objective:'703'|'IM',
  prior:Readonly<TriMinutes>,
  selected:readonly (TriContribution|null)[],
  remaining:readonly (readonly (TriContribution|null)[])[],
):CumulativeMinuteRatioBound {
  const unverified=():CumulativeMinuteRatioBound=>({
    verdict:'unverified',bounds:null,outside:[],
    interpretation:'optimistic_independent_slot_bounds_only',
  });
  if(!validLedger(prior)||selected.some(c=>!validMinutes(c)))return unverified();
  const strictDomains=remaining.map(domain=>domain.filter(validMinutes));
  if(strictDomains.some(domain=>!domain.length))return unverified();
  const known=selected.reduce((sum,c)=>add(sum,c as TriContribution),{
    swim:prior.swim,bike:prior.bike,run:prior.run,
  } as TriMinutes);
  const minima={...known},maxima={...known};
  for(const domain of strictDomains){
    for(const s of sports){
      minima[s]+=Math.min(...domain.map(c=>c[s]));
      maxima[s]+=Math.max(...domain.map(c=>c[s]));
    }
  }
  // For each sport, maximize its denominator competitors separately to
  // produce an optimistic LOWER bound; reverse for the UPPER bound.
  // Coupled slot choices may narrow this interval, NEVER widen it.
  const bounds={} as Record<TriSport,{minPct:number;maxPct:number}>;
  const outside:TriSport[]=[];
  for(const sport of sports){
    const others=sports.filter(s=>s!==sport);
    const smallestDenominator=minima[sport]+others.reduce((n,s)=>n+maxima[s],0);
    const largestNumeratorDenominator=maxima[sport]+others.reduce((n,s)=>n+minima[s],0);
    if(smallestDenominator<=0||largestNumeratorDenominator<=0)return unverified();
    const minPct=100*minima[sport]/smallestDenominator;
    const maxPct=100*maxima[sport]/largestNumeratorDenominator;
    bounds[sport]={minPct,maxPct};
    const [minTarget,maxTarget]=TRIATHLON_STRICT_MINUTE_RANGES[objective][sport];
    if(minPct>maxTarget+1e-9||maxPct<minTarget-1e-9)outside.push(sport);
  }
  return {verdict:outside.length?'provably_outside_current_domains':'not_refuted',
    bounds,outside,interpretation:'optimistic_independent_slot_bounds_only'};
}
export function hasExactStrictTriathlonRatio(
  objective:'703'|'IM',
  prior:Readonly<TriMinutes>,
  selected:readonly (TriContribution|null)[],
):boolean {
  const p=assessCumulativeTriathlonRatioPotential(objective,prior,selected,[]);
  if(p.verdict!=='not_refuted'||!p.bounds)return false;
  return sports.every(s=>{
    const [lo,hi]=TRIATHLON_STRICT_MINUTE_RANGES[objective][s];
    return p.bounds![s].minPct>=lo-1e-9&&p.bounds![s].maxPct<=hi+1e-9;
  });
}
