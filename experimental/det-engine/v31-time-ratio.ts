/**
 * V31 isolated, read-only planned-minute distribution audit.
 * DOES NOT replace or waive the historic count-based planValidator.
 *
 * It uses the deterministic solver's planned slot minutes; this does not
 * attest full legacy source execution. An undecomposable brick stays unknown,
 * never a fabricated 50/50 split. V3 base brick is verified 65+5+35 exactly.
 */
import type { ParsedPlan } from '@/lib/aiPlanParser';
import type { RepairWorkoutMetadata } from '../../supabase/functions/_shared/repairSportingEquivalence';
import { V3_BASE_BRICK_ID } from './v31-v3-brick';

export type Discipline='swim'|'bike'|'run';
export type MinuteInterval={minPct:number;maxPct:number};
export interface PlannedMinuteDistribution {
  scope:'load_weeks_only';
  weeks:number[];
  knownMinutes:Record<Discipline,number>;
  knownTotalMinutes:number;
  verifiedTransitionMinutes:number;
  unresolvedBrickMinutes:number;
  unresolvedBricks:Array<{week:number;id:string|null;minutes:number}>;
  percentagesIfKnownOnly:Record<Discipline,number|null>;
  conservativeBounds:Record<Discipline,MinuteInterval>;
  interpretation:'diagnostic_only_not_a_prescription_validation';
}

function assertMinutes(n:number|undefined):number {
  if(typeof n!=='number'||!Number.isSafeInteger(n)||n<=0)
    throw Error('v31_planned_duration_unavailable');
  return n;
}

export function splitExactV3BaseBrick(
  id:string|undefined, details:string|undefined,totalDurationMin:number|undefined,
):{bike:number;run:number;transition:number}|null {
  if(id!==V3_BASE_BRICK_ID)return null;
  const text=details??'';
  const bike=/\bVélo\s+(\d+)\s+min\s*:/i.exec(text);
  const run=/\bCourse\s+(\d+)\s+min\s*:/i.exec(text);
  const transition=/\bTransition\s+(\d+)\s+min\b/i.exec(text);
  if(!bike||!run||!transition)throw Error('v31_v3_brick_structure_missing');
  const b=Number(bike[1]),r=Number(run[1]),t=Number(transition[1]);
  const sum=b+r+t;
  if(!Number.isSafeInteger(sum)||b<=0||r<=0||t<0||
     sum!==assertMinutes(totalDurationMin))
    throw Error('v31_v3_brick_component_sum_mismatch');
  return {bike:b,run:r,transition:t};
}

/**
 * Only split a candidate using its actual individually-reviewed metadata.
 * A text fragment that *resembles* "bike + transition + run" is not proof.
 */
export function splitVerifiedV3Brick(
 id:string|undefined,details:string|undefined,totalDurationMin:number|undefined,
 approved:readonly RepairWorkoutMetadata[],
):{bike:number;run:number;transition:number}|null {
 const source=approved.find(x=>x.id===id);
 if(!source)return null;
 if(source.sport!=='brick'||!source.tags.includes('two-reviewed-components')||
   !source.tags.some(tag=>tag==='v3-brick-composition-candidate'||tag==='v3-v32-experimental-composition')){
   throw Error('v31_untrusted_composite_provenance');
 }
 if(details!==source.structure||source.durationMin[0]!==source.durationMin[1]||
   source.durationMin[0]!==totalDurationMin){
   throw Error('v31_composite_structure_or_duration_tampered');
 }
 if(source.tags.includes('v3-v32-experimental-composition') &&
    (!source.tags.some(tag=>/^bike-source:V3P_BIKE_\d{3}$/.test(tag))||
     !source.tags.some(tag=>/^run-source:V3P_RUN_\d{3}$/.test(tag)))){
   throw Error('v31_v32_component_provenance_missing');
 }
 const text=details??'';
 const bike=/\bVélo\s+(\d+)\s+min\s*:/i.exec(text);
 const run=/\bCourse\s+(\d+)\s+min\s*:/i.exec(text);
 const transition=/\bTransition\s+(\d+)\s+min\b/i.exec(text);
 if(!bike||!run||!transition)throw Error('v31_verified_composition_missing_timeline');
 const b=Number(bike[1]),r=Number(run[1]),t=Number(transition[1]);
 if(b<=0||r<=0||t<0||!Number.isSafeInteger(b+r+t)||
   b+r+t!==assertMinutes(totalDurationMin)){
   throw Error('v31_verified_composition_dose_mismatch');
 }
 return {bike:b,run:r,transition:t};
}

export function auditPlannedMinuteDistribution(
  plan:ParsedPlan,weekTypes:Readonly<Record<number,string>>,
  verifiedCompositions:readonly RepairWorkoutMetadata[]=[],
):PlannedMinuteDistribution {
  const known:Record<Discipline,number>={swim:0,bike:0,run:0};
  const weeks:number[]=[];
  const unresolvedBricks:PlannedMinuteDistribution['unresolvedBricks']=[];
  let unresolvedBrickMinutes=0,verifiedTransitionMinutes=0;
  for(const week of plan.weeks){
    if(weekTypes[week.weekNumber]!=='load')continue;
    weeks.push(week.weekNumber);
    for(const session of week.sessions){
      if(session.isRest||session.sport==='strength'||session.sport==='rest')continue;
      if(!['swim','bike','run','brick'].includes(session.sport))continue;
      const minutes=assertMinutes(session.durationMin);
      if(session.sport==='brick'){
        const split=splitVerifiedV3Brick(session.catalogId??undefined,
          session.details,minutes,verifiedCompositions);
        if(!split){
          unresolvedBrickMinutes+=minutes;
          unresolvedBricks.push({week:week.weekNumber,id:session.catalogId??null,minutes});
          continue;
        }
        known.bike+=split.bike;known.run+=split.run;
        verifiedTransitionMinutes+=split.transition;
        continue;
      }
      known[session.sport as Discipline]+=minutes;
    }
  }
  const knownTotal=known.swim+known.bike+known.run;
  const allPossible=knownTotal+unresolvedBrickMinutes;
  const percentagesIfKnownOnly={} as Record<Discipline,number|null>;
  const conservativeBounds={} as Record<Discipline,MinuteInterval>;
  for(const sport of ['swim','bike','run'] as const){
    percentagesIfKnownOnly[sport]=knownTotal?100*known[sport]/knownTotal:null;
    // Unresolved legacy brick minutes can include bike/run/transition, never swim.
    const minPct=allPossible?100*known[sport]/allPossible:0;
    const maxPct=sport==='swim'
      ?(knownTotal?100*known.swim/knownTotal:100)
      :(allPossible?100*(known[sport]+unresolvedBrickMinutes)/allPossible:100);
    conservativeBounds[sport]={minPct,maxPct};
  }
  return {scope:'load_weeks_only',weeks,knownMinutes:known,
    knownTotalMinutes:knownTotal,verifiedTransitionMinutes,
    unresolvedBrickMinutes,unresolvedBricks,percentagesIfKnownOnly,conservativeBounds,
    interpretation:'diagnostic_only_not_a_prescription_validation'};
}
