import { describe, expect, it } from "vitest";
import { restoreStructuredPlan } from "../restoreStructuredPlan";
import { archivedSessionDayLabel } from "../archivedSessionDayLabel";
import { zSession } from "../planSchema";
import { validatePlan, isRaceDaySession } from "@/engines/plan/planValidator";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import type { ParsedPlan } from "@/lib/aiPlanParser";

const fixture = (): ParsedPlan => ({ title: "Synthetic 703", totalWeeks: 33, phases: [], weeks: [
  { weekNumber: 9, phase: "base", theme: "Objectif B", sessions: [{ weekNumber: 9, weekTheme: "Objectif B", phase: "base", dayName: "Samedi", dayIndex: 5, sport: "run", title: "COURSE : 10 km officiel", details: "10 km officiel le 19 décembre 2026", isRest: false, durationMin: 60, custom: true, catalogId: null }] },
  { weekNumber: 33, phase: "taper", theme: "Objectif A", sessions: [{ weekNumber: 33, weekTheme: "Objectif A", phase: "taper", dayName: "Dimanche", dayIndex: 6, sport: "brick", title: "COURSE : Ironman 70.3", details: "Compétition officielle le 6 juin 2027", isRest: false, custom: true, catalogId: null }] },
] });
const raceErrors = (p: ParsedPlan) => validatePlan(p, "703", undefined, [9, 33]).issues.filter(i => i.severity === "error" && ["race_catalog_conflict", "race_day", "race_day_unexpected"].includes(i.rule));

describe("coach historical race archive", () => {
  it("accepts the event identity of both official races without associating training cards", () => {
    const p = fixture();
    expect(raceErrors(p)).toEqual([]);
    expect(p.weeks.every(w => w.sessions.some(isRaceDaySession))).toBe(true);
  });
  it("keeps an incompatible historical archive intact while blocking its race/catalog association", () => {
    const historical = fixture();
    historical.weeks[0].sessions[0].catalogId = "V3_RUN_10K_RACE_SIM";
    historical.weeks[0].sessions[0].custom = false;
    const before = JSON.stringify(historical);
    const reopened = restoreStructuredPlan(JSON.parse(before))!;
    expect(raceErrors(reopened)).toContainEqual(expect.objectContaining({ rule: "race_catalog_conflict", week: 9, severity: "error" }));
    expect(JSON.stringify(historical)).toBe(before);
    expect(reopened.weeks[0].sessions[0].catalogId).toBe("V3_RUN_10K_RACE_SIM");
    expect(WorkoutLibrary.find(w => w.id === "V3_RUN_10K_RACE_SIM")!.objectif).toMatch(/Simulation/);
  });
  it("current structured schema refuses the same association, without forbidding genuine simulations", () => {
    const s = { day: "samedi", sport: "run", title: "COURSE : 10 km officiel", details: "Course officielle", durationMin: 60, zones: [], isKeySession: true, custom: false, catalogId: "V3_RUN_10K_RACE_SIM" };
    expect(zSession.safeParse(s).success).toBe(false);
    expect(zSession.safeParse({ ...s, custom: true, catalogId: null }).success).toBe(true);
    expect(zSession.safeParse({ ...s, title: "Simulation course 10K — dress rehearsal" }).success).toBe(true);
  });
  it("does not invent Monday for legacy days, missing data or conflicting fields", () => {
    expect(archivedSessionDayLabel({ day: "samedi" })).toBe("Samedi");
    expect(archivedSessionDayLabel({ day: 6 })).toBe("Samedi");
    expect(archivedSessionDayLabel({ dayIndex: 0 })).toBe("Lundi");
    expect(archivedSessionDayLabel({})).toBe("Jour non renseigné");
    expect(archivedSessionDayLabel({ day: 9, dayIndex: -1 })).toBe("Jour non renseigné");
    expect(archivedSessionDayLabel({ dayName: "Samedi", dayIndex: 0 })).toBe("Jour incohérent");
  });
  it("read-only restoration preserves all seven weekdays and leaves the original archive intact", () => {
    const archive = fixture();
    const original = archive.weeks[0].sessions[0];
    archive.weeks[0].sessions = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"].map((dayName, dayIndex) => ({ ...original, title: "Séance synthétique", dayName, dayIndex }));
    const before = structuredClone(archive);
    const reopened = restoreStructuredPlan(JSON.parse(JSON.stringify(archive)))!;
    expect(reopened).toEqual(archive);
    expect(reopened.weeks[0].sessions.map(archivedSessionDayLabel)).toEqual(["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]);
    expect(reopened.weeks[0].sessions.map(s => [s.dayName, s.dayIndex])).toEqual(archive.weeks[0].sessions.map(s => [s.dayName, s.dayIndex]));
    reopened.weeks[0].sessions[5].durationMin = 47;
    expect(archive).toEqual(before);
    expect(restoreStructuredPlan({ weeks: null })).toBeNull();
    expect(archive).toEqual(before);
  });
});
