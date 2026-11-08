import type { ParsedPlan } from "@/lib/aiPlanParser";
import type { FrozenAppPlanningInput } from "@/lib/det/appPlanningInput";

export interface PlanArchiveMetadata {
  _planStartDate: string;
  _objective: string;
  _raceName: string;
  _raceDate: string;
  _raceGoals: unknown[];
  _coachLimiterOrder: string[];
}

/** Bind the generated DET calendar to the existing page input, before display.
 * Only archive metadata is added; no session, diagnostic or limiter is changed.
 */
export function bindAppPlanMetadata(plan: ParsedPlan, input: FrozenAppPlanningInput): ParsedPlan {
  const c = input.config;
  return { ...plan,
    _planStartDate: c.planStartDate,
    _objective: c.objective,
    _raceName: c.raceName ?? "",
    _raceDate: c.raceDate ?? "",
    _raceGoals: structuredClone(c.raceGoals ?? []),
    _coachLimiterOrder: [...(input.limiters.coachOverride ?? [])],
  } as ParsedPlan;
}

/** A DET archive must describe its generated calendar, never the live form.
 * Historical DET versions can use their existing saved metadata or the exact
 * coach-input snapshot. AI's existing metadata behavior is preserved.
 */
export function planArchiveMetadata(plan: ParsedPlan, form: PlanArchiveMetadata): PlanArchiveMetadata {
  const p = plan as ParsedPlan & Partial<PlanArchiveMetadata> & {
    _provenance?: { engine?: string; coachInputs?: { planStartDate?: string; objective?: string; raceDate?: string; coachLimiterOrder?: string[] | null } };
  };
  if (p._provenance?.engine !== "det") return structuredClone(form);
  const source = p._provenance.coachInputs;
  const start = p._planStartDate ?? source?.planStartDate;
  const objective = p._objective ?? source?.objective;
  if (!start || !objective) throw new Error("Dates ou objectif du plan DET indisponibles : rechargez sa version, rien n'a été enregistré.");
  return {
    _planStartDate: start, _objective: objective,
    _raceName: p._raceName ?? "", _raceDate: p._raceDate ?? source?.raceDate ?? "",
    _raceGoals: structuredClone(p._raceGoals ?? []),
    _coachLimiterOrder: [...(p._coachLimiterOrder ?? source?.coachLimiterOrder ?? [])],
  };
}
