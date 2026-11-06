import type { PlanConfig } from '@/hooks/useAITrainingPlan';
import { normalizeRepairGoal } from '../../supabase/functions/_shared/repairSportingEquivalence';
import { isRealYmd } from '../../supabase/functions/_shared/nolioV2/localTime';

/** Actual declarations only. Never infer event time, priority or recovery. */
export function multiGoalProblems(config: PlanConfig): string[] {
  const goals = config.raceGoals ?? [];
  if (goals.length < 2) return [];
  const p: string[] = [], dates = new Set<string>();
  if(goals.some(g=>g.raceFormat==='lcw_3day'))p.push('multi_goal_lcw_requires_per_discipline_event_contract');
  const start = isRealYmd(config.planStartDate ?? '') ? Date.parse(config.planStartDate + 'T00:00:00Z') : NaN;
  const end = start + (config.weeksAvailable ?? 0) * 86400000 * 7;
  const primary = goals.filter(g => g.priority === 'A');
  if(primary.length===1&&primary[0].raceDate!==config.raceDate)p.push('multi_goal_primary_date_mismatch');
  if (primary.length !== 1 || normalizeRepairGoal(primary[0]?.objective ?? '') !== normalizeRepairGoal(config.objective ?? '')) p.push('multi_goal_primary_identity_invalid');
  for (const g of goals) {
    if (!(g.priority==='A'?['10k','semi','marathon','half','ironman']:['10k','semi','marathon']).includes(normalizeRepairGoal(g.objective) ?? '')) p.push('multi_goal_running_objective_unqualified');
    if (!['A','B'].includes(g.priority)) p.push('multi_goal_priority_not_qualified');
    if (!g.raceDate || !isRealYmd(g.raceDate)) { p.push('multi_goal_date_missing'); continue; }
    if (dates.has(g.raceDate)) p.push('multi_goal_duplicate_date');
    dates.add(g.raceDate);
    const at = Date.parse(g.raceDate + 'T00:00:00Z');
    if (!Number.isFinite(start) || at < start || at >= end) p.push('multi_goal_date_outside_plan');
    if (typeof g.targetTimeMinutes !== 'number' || !Number.isFinite(g.targetTimeMinutes) || g.targetTimeMinutes <= 0) p.push('multi_goal_explicit_event_duration_required');
    if (g.priority === 'B' && primary[0]?.raceDate && at >= Date.parse(primary[0].raceDate + 'T00:00:00Z')) p.push('multi_goal_secondary_after_primary');
  }
  const sorted=[...goals].sort((a,b)=>(a.raceDate??'').localeCompare(b.raceDate??''));
  for(let i=1;i<sorted.length;i++){const a=Date.parse(sorted[i-1].raceDate+'T00:00:00Z'),b=Date.parse(sorted[i].raceDate+'T00:00:00Z');if(Math.floor((b-start)/604800000)-Math.floor((a-start)/604800000)<2)p.push('multi_goal_recovery_window_overlap');}
  return [...new Set(p)];
}
