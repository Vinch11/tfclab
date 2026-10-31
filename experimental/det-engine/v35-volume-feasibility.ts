/**
 * V35 — conservative bike-volume feasibility gate for a fully attributable
 * 70.3 candidate. Read-only, experimental, never a prescription optimizer.
 *
 * This gate answers a narrow question: "Could the declared WEEKLY hard caps
 * even accommodate enough extra bike time to meet a chosen swim ceiling?"
 * It deliberately ignores session availability, intra-week recovery, growth
 * coupling, and polarization when computing an UPPER bound. Therefore a
 * mathematically impossible result is sound; "room" is NEVER an approval.
 * No volume is added, no planned session is edited.
 */
import type { ParsedPlan } from '@/lib/aiPlanParser';
import type { RepairWorkoutMetadata } from '../../supabase/functions/_shared/repairSportingEquivalence';
import { auditPlannedMinuteDistribution } from './v31-time-ratio';

export interface V35WeekBudget {
  weekType:string;
  volumeBudget?:{ maxMinutes:number; weeklyIncreasePctMax:number; referenceSource?:'coach'|'internal-matrix' } | null;
}
export interface V35WeekHeadroom {
  week:number;
  plannedAllSessionMinutes:number;
  declaredCeilingMinutes:number|null;
  optimisticBikeHeadroomMinutes:number|null;
}
export type V35FeasibilityVerdict =
  'baseline_not_fully_attributable' |
  'baseline_duration_invalid' |
  'coach_volume_ceiling_missing' |
  'volume_ceiling_not_coach_confirmed' |
  'baseline_exceeds_declared_ceiling' |
  'provably_impossible_under_week_caps' |
  'room_under_caps_only_not_executable' |
  'already_within_planned_swim_ceiling';
export interface V35BikeVolumeFeasibility {
  scope:'load_weeks_only';
  verifiedBrickMinutesUnresolved:number;
  knownMinutes:{swim:number;bike:number;run:number};
  targetMaxSwimPct:number;
  baselineSwimPct:number|null;
  requiredAdditionalBikeMinutes:number|null;
  optimisticCombinedHeadroomMinutes:number|null;
  weeks:V35WeekHeadroom[];
  verdict:V35FeasibilityVerdict;
  interpretation:'necessary_condition_only_not_a_training_prescription';
}

/** This is only a generous necessary condition, NEVER a sufficient one. */
export function auditV35BikeOnlyFeasibility(
  plan:ParsedPlan,
  quotas:Readonly<Record<number,V35WeekBudget>>,
  approvedBricks:readonly RepairWorkoutMetadata[],
  targetMaxSwimPct=23,
):V35BikeVolumeFeasibility {
  if(!Number.isFinite(targetMaxSwimPct)||targetMaxSwimPct<=0||targetMaxSwimPct>=100)
    throw Error('v35_invalid_swim_ceiling');
  const types=Object.fromEntries(Object.entries(quotas).map(([week,q])=>[Number(week),q.weekType]));
  const distribution=auditPlannedMinuteDistribution(plan,types,approvedBricks);
  const total=distribution.knownTotalMinutes;
  const baselineSwimPct=total>0?100*distribution.knownMinutes.swim/total:null;
  // Ceil with a small numeric guard: meeting the threshold, not rounding it.
  const needed=total>0?Math.max(0,Math.ceil(distribution.knownMinutes.swim*100/targetMaxSwimPct-total-1e-9)):null;
  const weeks:V35WeekHeadroom[]=[];
  let baselineInvalid=false,missingCap=false,nonCoachCap=false,exceedsCap=false,headroom=0;
  for(const week of plan.weeks){
    if(types[week.weekNumber]!=='load')continue;
    let planned=0;
    for(const session of week.sessions){
      if(session.isRest || session.sport==='rest')continue;
      const minutes=session.durationMin;
      if(typeof minutes!=='number'||!Number.isSafeInteger(minutes)||minutes<0){
        baselineInvalid=true;
      } else planned+=minutes;
    }
    const cap=quotas[week.weekNumber]?.volumeBudget?.maxMinutes;
    const finiteCap=typeof cap==='number'&&Number.isSafeInteger(cap)&&cap>0?cap:null;
    if(finiteCap===null)missingCap=true;
    else{
      if(quotas[week.weekNumber]?.volumeBudget?.referenceSource!=='coach')nonCoachCap=true;
      if(planned>finiteCap)exceedsCap=true;
      headroom+=Math.max(0,finiteCap-planned);
    }
    weeks.push({week:week.weekNumber,plannedAllSessionMinutes:planned,
      declaredCeilingMinutes:finiteCap,
      optimisticBikeHeadroomMinutes:finiteCap===null?null:Math.max(0,finiteCap-planned)});
  }
  let verdict:V35FeasibilityVerdict;
  if(distribution.unresolvedBrickMinutes>0||!total||!weeks.length)verdict='baseline_not_fully_attributable';
  else if(baselineInvalid)verdict='baseline_duration_invalid';
  else if(missingCap)verdict='coach_volume_ceiling_missing';
  else if(nonCoachCap)verdict='volume_ceiling_not_coach_confirmed';
  else if(exceedsCap)verdict='baseline_exceeds_declared_ceiling';
  else if(needed===0)verdict='already_within_planned_swim_ceiling';
  else if(needed!==null&&headroom<needed)verdict='provably_impossible_under_week_caps';
  else verdict='room_under_caps_only_not_executable';
  return {scope:'load_weeks_only',
    verifiedBrickMinutesUnresolved:distribution.unresolvedBrickMinutes,
    knownMinutes:distribution.knownMinutes,
    targetMaxSwimPct,baselineSwimPct,
    requiredAdditionalBikeMinutes:distribution.unresolvedBrickMinutes===0?needed:null,
    optimisticCombinedHeadroomMinutes:missingCap?null:headroom,weeks,verdict,
    interpretation:'necessary_condition_only_not_a_training_prescription'};
}
