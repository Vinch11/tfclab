import { it, expect } from "vitest";
import { applyCoachScheduleOverrides } from "../coachScheduleOverrides";
import { classifyMultiObjectiveGoalsClient } from "../multiObjectiveClassification";
import type { PlanConfig } from "@/hooks/useAITrainingPlan";

const config = { planStartDate: "2026-10-01", raceDate: "2026-10-08", weeksAvailable: 2,
  raceGoals: [{ objective: "Marathon", priority: "A", raceDate: "2026-10-08" }] } as PlanConfig;
it("guided date updates A and counts from the chosen start, also on regeneration", () => {
  const next = applyCoachScheduleOverrides(config, { durationMode: "date", raceDate: "2026-11-12", weeksAvailable: 1 });
  expect(next.weeksAvailable).toBe(7);
  expect(next.raceGoals?.[0].raceDate).toBe("2026-11-12");
  expect(next.raceGoals?.[0].weeksUntilRace).toBe(7);
});
it("free duration removes dated race contracts", () => {
  const next = applyCoachScheduleOverrides(config, { durationMode: "free", weeksAvailable: 33 });
  expect(next.weeksAvailable).toBe(33); expect(next.raceDate).toBeUndefined(); expect(next.raceGoals).toBeUndefined();
});
it("limiter-only stored policy cannot replace schedule", () => {
  expect(applyCoachScheduleOverrides(config, { sessionsPerWeek: 3 })).toBe(config);
});
it.each(["B", "C"] as const)("priority %s never creates a full independent peak", priority => {
  const goals = classifyMultiObjectiveGoalsClient([{ objective: "Marathon", priority: "A", raceDate: "2027-01-01" },
    { objective: "IM", priority, raceDate: "2027-06-01" }]);
  expect(goals[1].isFullPeak).toBe(false); expect(goals[1].taperWeeks).toBe(1); expect(goals[0].isFullPeak).toBe(true);
});