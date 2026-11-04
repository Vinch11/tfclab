/**
 * DET V3.11 (experimental). Necessary, never sufficient, global triathlon
 * minute-ratio bounds over the ACTUAL admitted candidate domains of every
 * loading-week slot. We deliberately allow independent per-slot extrema:
 * the resulting interval contains all feasible assignments, including
 * ones that would violate weekly budget/recovery or source reuse.
 *
 * A missing exact brick/source cannot be converted into a zero-minute
 * contribution: the entire proof becomes UNVERIFIED, never IMPOSSIBLE.
 */
export type RatioSport='swim'|'bike'|'run';
export type ExactSportMinutes=Record<RatioSport,number>&{transition:number};
export type RatioTargetRanges=Readonly<Record<RatioSport,readonly [number,number]>>;
export interface RatioSlotDomain {
  week:number;
  sport:string;
  choices:readonly (ExactSportMinutes|null)[];
}
export interface SportRatioBound {
  minPct:number;
  maxPct:number;
  target:[number,number];
  outOfReach:boolean;
}
export interface GlobalSourceRatioEnvelope {
  verdict:'not_refuted'|'provably_unreachable_in_current_domains'|'unverified';
  reason:string;
  scope:'load_weeks_only';
  slotCount:number;
  candidateCount:number;
  bounds:Record<RatioSport,SportRatioBound>|null;
  offendingSports:RatioSport[];
  interpretation:'necessary_not_sufficient_current_approved_slots_only';
}
const sports=['swim','bike','run'] as const;
const dimensions=['swim','bike','run','transition'] as const;
const valid=(v:number)=>Number.isFinite(v)&&v>=0;
export function assessGlobalSourceRatioEnvelope(
  slots:readonly RatioSlotDomain[],
  targets:RatioTargetRanges,
):GlobalSourceRatioEnvelope {
  const base:GlobalSourceRatioEnvelope={
    verdict:'unverified',reason:'insufficient_source_provenance',
    scope:'load_weeks_only',slotCount:slots.length,
    candidateCount:slots.reduce((sum,s)=>sum+s.choices.length,0),
    bounds:null,offendingSports:[],
    interpretation:'necessary_not_sufficient_current_approved_slots_only',
  };
  if(!slots.length||sports.some(s=>{
    const target=targets[s];
    return !target||target.length!==2||target.some(v=>!valid(v)||v>100)||
      target[0]>target[1];
  }))return {...base,reason:'no_load_slots_or_invalid_targets'};
  const mins={swim:0,bike:0,run:0};
  const maxs={swim:0,bike:0,run:0};
  for(const slot of slots){
    if(!Number.isSafeInteger(slot.week)||slot.week<=0||!slot.choices.length)
      return {...base,reason:'invalid_or_empty_source_slot'};
    if(slot.choices.some(c=>!c||dimensions.some(s=>!valid(c[s]))||
      c.swim+c.bike+c.run+c.transition<=0))
      return {...base,reason:'unverified_source_or_brick_dose'};
    const choices=slot.choices as ExactSportMinutes[];
    for(const sport of sports){
      mins[sport]+=Math.min(...choices.map(c=>c[sport]));
      maxs[sport]+=Math.max(...choices.map(c=>c[sport]));
    }
  }
  const bounds={} as Record<RatioSport,SportRatioBound>;
  for(const sport of sports){
    const other=sports.filter(s=>s!==sport);
    const minDenominator=mins[sport]+other.reduce((n,s)=>n+maxs[s],0);
    const maxDenominator=maxs[sport]+other.reduce((n,s)=>n+mins[s],0);
    if(minDenominator<=0||maxDenominator<=0)
      return {...base,reason:'total_endurance_minutes_not_proven'};
    // Independent candidate extrema deliberately WIDEN the interval.
    const minPct=100*mins[sport]/minDenominator;
    const maxPct=100*maxs[sport]/maxDenominator;
    bounds[sport]={minPct,maxPct,target:[...targets[sport]],
      outOfReach:minPct>targets[sport][1]+1e-9||
        maxPct<targets[sport][0]-1e-9};
  }
  const offendingSports=sports.filter(s=>bounds[s].outOfReach);
  return {...base,bounds,offendingSports,
    verdict:offendingSports.length?'provably_unreachable_in_current_domains':'not_refuted',
    reason:offendingSports.length?'strict_ratio_outside_optimistic_domain_envelope':
      'source_domains_do_not_refute_global_ratio'};
}
