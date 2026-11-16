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
export function assertPlanDeliverySafe(plan:ParsedPlan, calendar:RaceCalendarConfig={}) {
  const error=planDeliveryIssues(plan,calendar).find(i=>i.severity==='error');
  if(error)throw Error(`Plan non conforme : ${error.message}`);
}