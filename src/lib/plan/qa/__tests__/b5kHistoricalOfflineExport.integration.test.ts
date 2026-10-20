import { describe, expect, it } from "vitest";
import type { MergedPlan, MergedSession } from "@/lib/plan/mergePlanChunks";
import { auditBeginnerRunSafety } from "../auditBeginnerRunSafety";
import { buildPilotSafetyExport } from "../buildPilotSafetyExport";
import { B5K_RUN_FIXTURE_20261017 } from "./fixtures/b5kRun20261017";

function historicalReducedPlan(): MergedPlan {
  return {
    title: "B-5K-BEGINNER reduced historical fixture (no athlete data)",
    totalWeeks: 12,
    phases: [{ name: "historical", weeks: "S1-S12" }],
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
}

describe("historical P0 offline export — end-to-end without AI", () => {
  it("keeps the full reduced plan and links its session-level warnings", () => {
    const plan = historicalReducedPlan();
    const issues = auditBeginnerRunSafety(plan, {
      trainingLevel: "untrained",
      highRunInjuryRisk: true,
      week1RunHoursMax: 1.2,
      weeklyRunIncreasePctMax: 0.1,
      runSessionsPerWeek: 3,
      hasPriorLoadForDeload: false,
    });
    const report = buildPilotSafetyExport(plan, issues);
    expect(report.mode).toBe("diagnostic_only");
    expect(report.finalMergedPlan).toEqual(plan);
    expect(report.finalMergedPlan.weeks).toHaveLength(12);
    expect(report.safetyIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "week_one_volume_exceeded", weekNumber: 1, matchStatus: "week_level" }),
      expect.objectContaining({ code: "advanced_intensity_high_injury_risk", matchStatus: "matched" }),
    ]));
    expect(report.summary.total).toBe(issues.length);
    expect(report.summary.critical).toBeGreaterThan(0);
    expect(JSON.parse(JSON.stringify(report)).finalMergedPlan.weeks).toHaveLength(12);
  });
  it("does not assert absence of advanced-intensity risk when risk level is unknown", () => {
    const issues = auditBeginnerRunSafety(historicalReducedPlan(), {
      trainingLevel: "untrained", highRunInjuryRisk: false,
      week1RunHoursMax: null, weeklyRunIncreasePctMax: null,
      runSessionsPerWeek: null, hasPriorLoadForDeload: false,
    });
    expect(issues.some(issue => issue.code === "advanced_intensity_high_injury_risk")).toBe(false);
    // A skipped conditional check is NOT evidence of safe intensity.
  });
});
