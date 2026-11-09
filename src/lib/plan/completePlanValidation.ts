import type { ParsedPlan } from '@/lib/aiPlanParser';
import type { FinalValidationIssue } from './qa/finalValidation';
/** Exact scope check after assembly: a successful first window is not a plan. */
export function completePlanCoverageIssues(plan:Pick<ParsedPlan,'weeks'|'totalWeeks'>, expected:number):FinalValidationIssue[] {
  if(!Number.isInteger(expected)||expected<1||plan.totalWeeks!==expected||plan.weeks.length!==expected||plan.weeks.some((w,i)=>w.weekNumber!==i+1)) {
    return [{rule:'complete_plan_week_coverage',severity:'error',message:`Plan incomplet ou semaines incohérentes : ${expected} semaines attendues.`}];
  }
  return [];
}