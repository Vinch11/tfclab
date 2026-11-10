import type { PlanConfig } from "@/hooks/useAITrainingPlan";
import type { CoachProfileFormPayload } from "@/components/CoachProfileForm";
import { computeGoalWeekFromDates } from "./multiObjectiveClassification";

/** Explicit guided dates and duration survive regeneration; stored limiter-only policies do not replace the visible frequency. */
export function applyCoachScheduleOverrides(config: PlanConfig, payload: Partial<CoachProfileFormPayload>): PlanConfig {
  if (!payload.durationMode) return config;
  if (payload.durationMode === "free") return { ...config, weeksAvailable: payload.weeksAvailable ?? config.weeksAvailable, raceDate: undefined, raceGoals: undefined };
  const raceDate = payload.raceDate ?? config.raceDate;
  const goals = config.raceGoals?.map(goal => goal.priority === "A" ? { ...goal, raceDate,
    weeksUntilRace: computeGoalWeekFromDates(config.planStartDate, raceDate) } : goal);
  const weeks = Math.max(0, ...[raceDate, ...(goals ?? []).map(g => g.raceDate)]
    .map(date => computeGoalWeekFromDates(config.planStartDate, date) ?? 0));
  return { ...config, raceDate, raceGoals: goals, weeksAvailable: weeks || payload.weeksAvailable || config.weeksAvailable };
}