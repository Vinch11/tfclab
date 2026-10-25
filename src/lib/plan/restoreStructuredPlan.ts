import type { ParsedPlan } from "@/lib/aiPlanParser";

/** A missing generation quota does not make a saved JSON plan a Markdown plan. */
export function restoreStructuredPlan(value: unknown): ParsedPlan | null {
  if (!value || typeof value !== "object") return null;
  const plan = value as ParsedPlan;
  if (typeof plan.title !== "string" || !Array.isArray(plan.weeks) || !Array.isArray(plan.phases)
    || !plan.weeks.every(week => week && Array.isArray(week.sessions))) return null;
  return structuredClone(plan);
}
