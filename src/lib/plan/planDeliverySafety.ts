import {toast} from 'sonner';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {validateRaceCalendar} from './raceCalendarValidation';
import {validateCoachLoadIssues} from './coachVolumeValidation';
import type {RaceCalendarConfig} from '../../../supabase/functions/_shared/raceCalendarProtection';

/** Read-only boundary check; the full plan is checked even for a one-session export. */
export function planDeliveryIssues(plan:ParsedPlan, calendar:RaceCalendarConfig={}) {
  const stored=plan as ParsedPlan & {_planStartDate?:string;_objective?:string;_raceDate?:string;_raceGoals?:RaceCalendarConfig['raceGoals']};
  const resolved={planStartDate:stored._planStartDate,objective:stored._objective,raceDate:stored._raceDate,raceGoals:stored._raceGoals,...calendar};
  return [...validateRaceCalendar(plan,resolved),...validateCoachLoadIssues(plan,plan.weeklyQuotas)];
}
/** Volume, race and week checks never refuse a delivery: they are surfaced as a visible warning. */
export function assertPlanDeliverySafe(plan:ParsedPlan, calendar:RaceCalendarConfig={}) {
  const issues=planDeliveryIssues(plan,calendar).filter(i=>i.severity==='error');
  if(issues.length)toast.warning(`À vérifier : ${issues[0].message}${issues.length>1?` (+${issues.length-1} autre(s))`:''}`,{duration:20000});
  return issues;
}