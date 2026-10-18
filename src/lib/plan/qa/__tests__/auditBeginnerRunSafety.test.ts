import { describe, expect, it } from "vitest";
import type { MergedPlan, MergedSession } from "@/lib/plan/mergePlanChunks";
import { auditBeginnerRunSafety } from "../auditBeginnerRunSafety";

function run(weekNumber: number, dayIndex: number, durationMin: number, title = "Endurance facile"): MergedSession {
  return {
    weekNumber, weekTheme: "Base", phase: "base", dayName: "Mercredi", dayIndex,
    sport: "run", title, details: "", isRest: false, isKeySession: false,
    catalogId: null, custom: true, durationMin, zones: ["Z1"],
  };
}
function plan(weeks: MergedSession[][]): MergedPlan {
  return {
    title: "Test", phases: [{ name: "base", weeks: "S1-S2" }],
    weeks: weeks.map((sessions, i) => ({
      weekNumber: i + 1, theme: "Base", phase: "base", sessions,
    })),
    totalWeeks: weeks.length,
  };
}
const beginner = {
  trainingLevel: "untrained", highRunInjuryRisk: true,
  week1RunHoursMax: 1.2, weeklyRunIncreasePctMax: 0.1,
  runSessionsPerWeek: 3, hasPriorLoadForDeload: false,
};
describe("P0 B-5K — deterministic read-only run safety audit", () => {
  it("detects week-one running volume over 72 minutes", () => {
    const issues = auditBeginnerRunSafety(plan([[run(1, 1, 30), run(1, 3, 45)]]), beginner);
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "week_one_volume_exceeded", actual: 75, limit: 72, severity: "critical" }),
    ]));
  });
  it("excludes strength from running volume and running-session quota", () => {
    const strength = { ...run(1, 5, 60, "Renforcement"), sport: "strength" };
    const issues = auditBeginnerRunSafety(plan([[run(1, 1, 30), run(1, 3, 40), strength]]), beginner);
    expect(issues.some(i => i.code === "week_one_volume_exceeded" || i.code === "weekly_session_quota_exceeded")).toBe(false);
  });
  it("detects a 20% increase over a 10% weekly cap", () => {
    const issues = auditBeginnerRunSafety(plan([[run(1, 1, 50)], [run(2, 1, 60)]]), beginner);
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "weekly_volume_ramp_exceeded", weekNumber: 2, actual: 60, limit: 55 }),
    ]));
  });
  it("detects four running sessions against a three-run quota", () => {
    const issues = auditBeginnerRunSafety(plan([[
      run(1, 0, 15), run(1, 1, 15), run(1, 3, 15), run(1, 5, 15),
    ]]), beginner);
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "weekly_session_quota_exceeded", actual: 4, limit: 3 }),
    ]));
  });
  it("flags Over-Under for an untrained runner with high injury risk", () => {
    const issues = auditBeginnerRunSafety(plan([[run(1, 5, 60, "Over-Under seuil")]]), beginner);
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "advanced_intensity_high_injury_risk", severity: "critical" }),
    ]));
  });
  it("flags a first-week deload without prior load, but not with documented history", () => {
    const p = plan([[run(1, 1, 30, "Footing de décharge")]]);
    expect(auditBeginnerRunSafety(p, beginner).some(i => i.code === "unjustified_initial_deload")).toBe(true);
    expect(auditBeginnerRunSafety(p, { ...beginner, hasPriorLoadForDeload: true })
      .some(i => i.code === "unjustified_initial_deload")).toBe(false);
  });
  it("does not apply beginner-only restrictions to trained athletes", () => {
    const p = plan([[run(1, 1, 90, "Over-Under") ]]);
    expect(auditBeginnerRunSafety(p, { ...beginner, trainingLevel: "trained" })).toEqual([]);
  });
});
