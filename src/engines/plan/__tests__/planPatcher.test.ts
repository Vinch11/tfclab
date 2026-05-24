import { describe, it, expect } from "vitest";
import {
  applyDeload,
  redistributeMissedSession,
  swapModality,
  shiftRaceDate,
  truncateAfterWeek,
  summarizePastWeeks,
} from "../planPatcher";
import type { ParsedPlan, ParsedSession } from "@/lib/aiPlanParser";

function makeSession(over: Partial<ParsedSession>): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Base",
    phase: "Base",
    dayName: "Lundi",
    dayIndex: 0,
    sport: "Vélo",
    title: "Endurance Z2",
    details: "",
    isRest: false,
    ...over,
  };
}

function makePlan(): ParsedPlan {
  return {
    title: "Plan Test",
    phases: [],
    totalWeeks: 4,
    weeks: [
      {
        weekNumber: 1,
        theme: "Semaine 1",
        phase: "Base",
        sessions: [
          makeSession({ dayIndex: 0, dayName: "Lundi", title: "Repos", sport: "Repos", isRest: true }),
          makeSession({ dayIndex: 1, dayName: "Mardi", title: "Intervals seuil 4x8" }),
          makeSession({ dayIndex: 2, dayName: "Mercredi", title: "Endurance Z2" }),
          makeSession({ dayIndex: 3, dayName: "Jeudi", title: "VO2 5x3min" }),
          makeSession({ dayIndex: 4, dayName: "Vendredi", title: "Off", sport: "Off", isRest: true }),
        ],
      },
      { weekNumber: 2, theme: "Semaine 2", phase: "Base", sessions: [] },
      { weekNumber: 3, theme: "Taper -2", phase: "Taper", sessions: [] },
      { weekNumber: 4, theme: "Race", phase: "Race", sessions: [] },
    ],
  };
}

describe("planPatcher", () => {
  it("applyDeload allège les séances intenses", () => {
    const { plan, diff, warnings } = applyDeload(makePlan(), {
      weekNumber: 1,
      reductionPct: 0.3,
      reason: "Fatigue élevée",
    });
    expect(warnings).toEqual([]);
    expect(diff.length).toBeGreaterThan(0);
    const w1 = plan.weeks.find((w) => w.weekNumber === 1)!;
    expect(w1.coachNotes).toContain("DELOAD");
    // Jour OFF préservé
    expect(w1.sessions.find((s) => s.dayIndex === 4)!.isRest).toBe(true);
  });

  it("redistributeMissedSession reporte au prochain jour OFF", () => {
    const { plan, diff } = redistributeMissedSession(makePlan(), {
      weekNumber: 1,
      dayIndex: 1,
      strategy: "move_next",
    });
    expect(diff[0].type).toBe("session_moved");
    const w1 = plan.weeks.find((w) => w.weekNumber === 1)!;
    // Mardi devient repos, vendredi récupère la séance
    expect(w1.sessions.find((s) => s.dayIndex === 1)!.isRest).toBe(true);
    expect(w1.sessions.find((s) => s.dayIndex === 4)!.title).toContain("reportée");
  });

  it("swapModality change le sport sans toucher le titre principal", () => {
    const { plan, diff } = swapModality(makePlan(), {
      weekNumber: 1,
      dayIndex: 2,
      newSport: "Home-trainer",
      reason: "Douleur cheville",
    });
    expect(diff[0].type).toBe("session_swapped");
    const sess = plan.weeks[0].sessions.find((s) => s.dayIndex === 2)!;
    expect(sess.sport).toBe("Home-trainer");
    expect(sess.details).toContain("SWAP");
  });

  it("shiftRaceDate annote les 3 dernières semaines", () => {
    const { diff } = shiftRaceDate(makePlan(), { weeksShift: 2, reason: "Course reportée" });
    expect(diff.length).toBeGreaterThanOrEqual(2);
    expect(diff.every((d) => d.type === "taper_shift")).toBe(true);
  });

  it("truncateAfterWeek coupe le plan à la semaine donnée", () => {
    const { plan } = truncateAfterWeek(makePlan(), 2);
    expect(plan.weeks.map((w) => w.weekNumber)).toEqual([1, 2]);
  });

  it("summarizePastWeeks produit un résumé non vide", () => {
    const summary = summarizePastWeeks(makePlan().weeks);
    expect(summary).toContain("S1");
  });
});
