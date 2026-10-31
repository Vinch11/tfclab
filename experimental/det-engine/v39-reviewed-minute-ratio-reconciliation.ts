/**
 * V3.9 experimental migration gate: historical session-COUNT sport ratios
 * may be reclassified ONLY after the same calendar proves exact endurance
 * minutes and all three STRICT discipline ratios with source-traced bricks.
 *
 * Default native behavior remains untouched; no production imports.
 * Frequency floors / range drifts remain independent, non-waivable guards.
 * This is an opt-in evidence-backed replacement, NOT a validator bypass.
 */
import type {ParsedPlan} from '@/lib/aiPlanParser';
import type {RepairWorkoutMetadata} from '../../supabase/functions/_shared/repairSportingEquivalence';
import {auditPlannedMinuteDistribution} from './v31-time-ratio';
import {SPORT_RATIO_TARGETS} from '@/engines/plan/planValidator';
import {parseAthleteConstraints} from '@/lib/plan/constraintRules';

export type RatioIssue={code:string;week?:number;severity:string;message?:string};
export interface MinuteRatioReconciliation {
  verdict:'replaced_count_only_with_proven_minutes'|'refused'|'not_needed';
  reason:string;
  ratios:Record<'swim'|'bike'|'run',number>|null;
  issues:RatioIssue[];
  nativeCountIssueCount:number;
}
const sports=['swim','bike','run'] as const;
export function reconcileNativeTriathlonCountRatio(input:{
  plan:ParsedPlan;
  weekTypes:Readonly<Record<number,string>>;
  objective:'703'|'IM';
  verifiedCompositions:readonly RepairWorkoutMetadata[];
  nativeIssues:readonly RatioIssue[];
  quotaIssues:readonly RatioIssue[];
  coachConstraintsText?:string|null;
}):MinuteRatioReconciliation {
  const {plan,weekTypes,objective,verifiedCompositions,nativeIssues,quotaIssues,
    coachConstraintsText}=input;
  const nativeCountIssueCount=nativeIssues.filter(x=>x.code==='sport_ratio').length;
  const fail=(reason:string):MinuteRatioReconciliation=>({
    verdict:'refused',reason,ratios:null,issues:[...nativeIssues],nativeCountIssueCount,
  });
  if(!nativeCountIssueCount)return {
    verdict:'not_needed',reason:'no_native_count_ratio_issue',
    ratios:null,issues:[...nativeIssues],nativeCountIssueCount,
  };
  // The exact SAME native constraint parser determines whether any sport
  // was excluded. A sprint prohibition or day-only scheduling restriction
  // does not itself redistribute swim/bike/run volume targets, and all its
  // independent prohibition and calendar validators still run.
  // A full/ambiguous sport restriction must NOT be migrated: its targets may
  // have been legitimately redistributed by the native sport-ratio rule.
  const parsedConstraints=parseAthleteConstraints(coachConstraintsText??'');
  if(parsedConstraints.bannedSports.length||parsedConstraints.ambiguousRestrictions.length)
    return fail('banned_or_ambiguous_sport_target_redistribution_unverified');
  if(quotaIssues.some(x=>['quota_floor_violation','quota_range_drift'].includes(x.code)||
    ['critical','error','blocking'].includes(x.severity)))
    return fail('frequency_or_structural_quota_not_verified');
  if(!plan.weeks.length || plan.weeks.some(w=>!weekTypes[w.weekNumber]))
    return fail('week_type_missing');
  if(!plan.weeks.some(w=>weekTypes[w.weekNumber]==='load'))
    return fail('no_loading_weeks');
  let audit:ReturnType<typeof auditPlannedMinuteDistribution>;
  try{
    audit=auditPlannedMinuteDistribution(plan,weekTypes,verifiedCompositions);
  }catch{return fail('source_dose_or_brick_timeline_unverifiable');}
  if(!audit.weeks.length||audit.unresolvedBrickMinutes!==0||
     audit.unresolvedBricks.length>0||audit.knownTotalMinutes<=0)
    return fail('unresolved_endurance_brick_or_empty_minutes');
  const targets=SPORT_RATIO_TARGETS[objective];
  const total=audit.knownTotalMinutes;
  const ratios=Object.fromEntries(sports.map(sport=>[
    sport,100*audit.knownMinutes[sport]/total,
  ])) as Record<'swim'|'bike'|'run',number>;
  if(sports.some(sport=>!targets?.[sport]||
     ratios[sport]<targets[sport]![0]||ratios[sport]>targets[sport]![1]))
    return fail('strict_sport_minutes_out_of_bounds');
  // Preserve original historical diagnoses as visible warnings, including
  // their original severity, but only after a stricter minutes-based proof.
  // Other native plan and weekly-quota issues remain completely unchanged.
  const issues=nativeIssues.map(issue=>issue.code!=='sport_ratio'?issue:{
    ...issue,code:'det_superseded_count_sport_ratio_diagnostic',severity:'warning',
    message:JSON.stringify({historicalSeverity:issue.severity,historicalMessage:issue.message,
      verifiedMinutes:audit.knownMinutes,ratios,targets,scope:audit.scope}),
  });
  issues.push({code:'det_strict_minute_sport_ratio_verified',severity:'warning',
    message:JSON.stringify({ratios,targets,knownMinutes:audit.knownMinutes,
      exactBricksOnly:true,scope:audit.scope,
      frequencyQuotaAudit:'separate_and_mandatory'})});
  return {verdict:'replaced_count_only_with_proven_minutes',
    reason:'all_three_strict_minute_ratios_and_frequency_verified',
    ratios,issues,nativeCountIssueCount};
}
