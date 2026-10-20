import { describe, expect, it } from "vitest";
import type { MergedPlan, MergedSession } from "@/lib/plan/mergePlanChunks";
import type { BeginnerSafetyIssue } from "../auditBeginnerRunSafety";
import { buildPilotSafetyExport } from "../buildPilotSafetyExport";

function session(dayIndex: number, title: string): MergedSession {
  return {
    weekNumber: 1, weekTheme: "Base", phase: "base",
    dayName: "Mercredi", dayIndex, sport: "run", title,
    details: "4 × 8 min", isRest: false, isKeySession: true,
    catalogId: "V2_RUN_OVER_UNDER", custom: false, durationMin: 60, zones: ["Z4"],
  };
}
const issue = (overrides: Partial<BeginnerSafetyIssue> = {}): BeginnerSafetyIssue => ({
  code: "advanced_intensity_high_injury_risk", weekNumber: 1, severity: "critical",
  actual: null, limit: null, message: "Revue", sessionRef: "w1-d2-V2_RUN_OVER_UNDER",
  sessionTitle: "Over-Under", catalogId: "V2_RUN_OVER_UNDER", sessionDurationMin: 60,
  ...overrides,
});
function plan(sessions: MergedSession[]): MergedPlan {
  return {
    title: "Export", totalWeeks: 1,
    phases: [{ name: "base", weeks: "S1" }],
    weeks: [{ weekNumber: 1, theme: "Base", phase: "base", sessions }],
  };
}
describe("pilot safety export — offline link semantics", () => {
  it("preserves the complete merged plan and matches a single alert", () => {
    const p = plan([session(2, "Over-Under")]);
    const report = buildPilotSafetyExport(p, [issue()]);
    expect(report.finalMergedPlan).toBe(p);
    expect(report.safetyIssues[0].matchStatus).toBe("matched");
    expect(report.safetyIssues[0].match).toMatchObject({ weekNumber: 1, dayIndex: 2 });
    expect(report.mode).toBe("diagnostic_only");
  });
  it("does not invent a session link for week-level alerts", () => {
    const report = buildPilotSafetyExport(plan([session(2, "Over-Under")]), [
      issue({ code: "week_one_volume_exceeded", sessionRef: null, sessionTitle: null,
        catalogId: null, sessionDurationMin: null }),
    ]);
    expect(report.safetyIssues[0].matchStatus).toBe("week_level");
    expect(report.safetyIssues[0].match).toBeNull();
  });
  it("marks duplicate sessions ambiguous rather than choosing arbitrarily", () => {
    const report = buildPilotSafetyExport(plan([
      session(2, "Over-Under"), session(2, "Over-Under"),
    ]), [issue()]);
    expect(report.safetyIssues[0].matchStatus).toBe("ambiguous");
    expect(report.safetyIssues[0].match).toBeNull();
  });
  it("reports unmatched alerts rather than linking to a different session", () => {
    const report = buildPilotSafetyExport(plan([session(3, "Over-Under")]), [issue()]);
    expect(report.safetyIssues[0].matchStatus).toBe("unmatched");
    expect(report.summary.unmatched).toBe(1);
  });
});
