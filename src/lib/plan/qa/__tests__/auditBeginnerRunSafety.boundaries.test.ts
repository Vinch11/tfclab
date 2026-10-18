import { describe, expect, it } from "vitest";
import type { MergedPlan, MergedSession } from "@/lib/plan/mergePlanChunks";
import { auditBeginnerRunSafety } from "../auditBeginnerRunSafety";

const config = {
  trainingLevel: "untrained", highRunInjuryRisk: true,
  week1RunHoursMax: 1.2, weeklyRunIncreasePctMax: 0.1,
  runSessionsPerWeek: 3, hasPriorLoadForDeload: false,
};
function s(weekNumber: number, dayIndex: number, durationMin: number, title = "Footing"): MergedSession {
  return {
    weekNumber, weekTheme: "Base", phase: "base", dayName: "Jour", dayIndex,
    sport: "run", title, details: "", isRest: false, isKeySession: false,
    catalogId: null, custom: true, durationMin, zones: ["Z1"],
  };
}
function plan(...weeks: MergedSession[][]): MergedPlan {
  return {
    title: "P0 boundary audit", totalWeeks: weeks.length,
    phases: [{ name: "base", weeks: "S1-S3" }],
    weeks: weeks.map((sessions, i) => ({
      weekNumber: i + 1, theme: "Base", phase: "base", sessions,
    })),
  };
}
describe("P0 safety — boundary and ambiguity regression", () => {
  it("does not flag an exactly 72-minute initial run week", () => {
    const issues = auditBeginnerRunSafety(plan([s(1, 1, 32), s(1, 3, 40)]), config);
    expect(issues.some(i => i.code === "week_one_volume_exceeded")).toBe(false);
  });
  it("does not flag an exactly 10% week-on-week increase", () => {
    const issues = auditBeginnerRunSafety(plan([s(1, 1, 50)], [s(2, 1, 55)]), config);
    expect(issues.some(i => i.code === "weekly_volume_ramp_exceeded")).toBe(false);
  });
  it("sorts weeks before calculating volume progression", () => {
    const p = plan([s(1, 1, 50)], [s(2, 1, 60)]);
    p.weeks.reverse();
    const issues = auditBeginnerRunSafety(p, config);
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "weekly_volume_ramp_exceeded", weekNumber: 2 }),
    ]));
  });
  it("does not count rest days as running sessions", () => {
    const rest = { ...s(1, 4, 0, "Repos"), isRest: true };
    const issues = auditBeginnerRunSafety(plan([
      s(1, 0, 20), s(1, 1, 20), s(1, 2, 20), rest,
    ]), config);
    expect(issues.some(i => i.code === "weekly_session_quota_exceeded")).toBe(false);
  });
  it("does not claim a deload is unjustified when prior history is documented", () => {
    const issues = auditBeginnerRunSafety(
      plan([s(1, 1, 25, "Footing de décharge")]),
      { ...config, hasPriorLoadForDeload: true },
    );
    expect(issues.some(i => i.code === "unjustified_initial_deload")).toBe(false);
  });
  it("does not flag an ordinary race-day title as advanced intensity by keyword alone", () => {
    const issues = auditBeginnerRunSafety(plan([s(1, 6, 25, "COURSE OBJECTIF — Jour J 5 km")]), config);
    expect(issues.some(i => i.code === "advanced_intensity_high_injury_risk")).toBe(false);
  });
  it("does not issue volume or quota alerts when their contracts are not supplied", () => {
    const issues = auditBeginnerRunSafety(plan([s(1, 1, 120)]), {
      trainingLevel: "untrained", highRunInjuryRisk: false,
    });
    expect(issues).toEqual([]);
  });
});
