import { describe, expect, it } from "vitest";
import type { MergedPlan, MergedSession } from "@/lib/plan/mergePlanChunks";
import { auditBeginnerRunSafety } from "../auditBeginnerRunSafety";
import { B5K_RUN_FIXTURE_20261017 } from "./fixtures/b5kRun20261017";

const plan: MergedPlan = {
  title: "B-5K-BEGINNER historical run-only fixture",
  phases: [{ name: "historical", weeks: "S1-S12" }],
  totalWeeks: 12,
  weeks: Array.from({ length: 12 }, (_, i) => {
    const weekNumber = i + 1;
    const sessions: MergedSession[] = B5K_RUN_FIXTURE_20261017
      .filter(row => row[0] === weekNumber)
      .map(([week, day, minutes, title]) => ({
        weekNumber: week, weekTheme: "Historical", phase: "historical",
        dayName: "Jour", dayIndex: day, sport: "run", title, details: "",
        isRest: false, isKeySession: false, catalogId: null,
        custom: true, durationMin: minutes, zones: [],
      }));
    return { weekNumber, theme: "Historical", phase: "historical", sessions };
  }),
};
const config = {
  trainingLevel: "untrained", highRunInjuryRisk: true,
  week1RunHoursMax: 1.2, weeklyRunIncreasePctMax: 0.1,
  runSessionsPerWeek: 3, hasPriorLoadForDeload: false,
};

describe("P0 historical B-5K 2026-10-17 — reduced fixture regression", () => {
  const issues = auditBeginnerRunSafety(plan, config);
  it("retains the observed 115-minute S1 run volume above the 72-minute run-only cap", () => {
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "week_one_volume_exceeded", weekNumber: 1, actual: 115, limit: 72,
      }),
    ]));
  });
  it("retains advanced-intensity flags for six Over-Under sessions and Norwegian thresholds", () => {
    const advanced = issues.filter(issue => issue.code === "advanced_intensity_high_injury_risk");
    expect(advanced.length).toBe(8);
    expect(advanced.filter(issue => [1, 2, 4, 5, 7, 8].includes(issue.weekNumber)).length).toBe(6);
  });
  it("retains first-week deload and week-12 four-run quota alerts", () => {
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "unjustified_initial_deload", weekNumber: 1 }),
      expect.objectContaining({ code: "weekly_session_quota_exceeded", weekNumber: 12, actual: 4, limit: 3 }),
    ]));
  });
  it("detects the 65-to-125-minute rebound after S3, without treating the increase as a proven clinical risk", () => {
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "weekly_volume_ramp_exceeded", weekNumber: 4, actual: 125, limit: 71.5,
      }),
    ]));
  });
});
