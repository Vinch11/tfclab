import { describe, it, expect } from "vitest";
import { validatePlan, type PlanValidationResult } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Test",
    phase: "base",
    dayName: "Lundi",
    dayIndex: 0,
    sport: "Course",
    title: "EF Z2 45min",
    details: "Zone 2 endurance fondamentale",
    isRest: false,
    ...overrides,
  };
}

function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[], theme = "Standard"): ParsedWeek {
  return {
    weekNumber,
    theme,
    phase: "base",
    sessions: sessions.map((s, i) => makeSession({
      weekNumber,
      weekTheme: theme,
      dayIndex: i % 7,
      dayName: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"][i % 7],
      ...s,
    })),
  };
}

function makePolarizedWeek(weekNumber: number, deload = false): ParsedWeek {
  if (deload) {
    return makeWeek(weekNumber, [
      { sport: "Course", title: "EF Z2 30min", details: "Récupération" },
      { sport: "Course", title: "EF Z2 30min", details: "Récup active" },
      { sport: "Repos", title: "Repos", details: "", isRest: true },
    ], "Décharge");
  }
  return makeWeek(weekNumber, [
    { sport: "Course", title: "EF Z2 45min", details: "Endurance fondamentale" },
    { sport: "Course", title: "EF Z2 50min", details: "Endurance" },
    { sport: "Course", title: "Intervalles seuil 3x10min", details: "Séance clé 🔑 Z5" },
    { sport: "Course", title: "EF Z2 40min", details: "Footing récup" },
    { sport: "Vélo", title: "Z2 60min", details: "Endurance vélo" },
    { sport: "Course", title: "Sortie longue 20km", details: "SL progressive 🔑" },
    { sport: "Repos", title: "Repos", details: "", isRest: true },
  ]);
}

function makePlan(weeks: ParsedWeek[]): ParsedPlan {
  return {
    title: "Test Plan",
    phases: [],
    weeks,
    totalWeeks: weeks.length,
  };
}

describe("planValidator", () => {
  it("validates a well-structured 8-week plan", () => {
    // 3:1 pattern: 3 load + 1 deload × 2
    const weeks = [
      makePolarizedWeek(1),
      makePolarizedWeek(2),
      makePolarizedWeek(3),
      makePolarizedWeek(4, true),
      makePolarizedWeek(5),
      makePolarizedWeek(6),
      makePolarizedWeek(7),
      makePolarizedWeek(8, true),
    ];
    const result = validatePlan(makePlan(weeks));

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.grade).toMatch(/^[AB]$/);
    expect(result.issues.filter(i => i.severity === "error")).toHaveLength(0);
  });

  it("detects missing deload weeks", () => {
    // 8 consecutive load weeks with no deload
    const weeks = Array.from({ length: 8 }, (_, i) => makePolarizedWeek(i + 1));
    const result = validatePlan(makePlan(weeks));

    const loadIssues = result.issues.filter(i => i.rule === "load_pattern" && i.severity === "error");
    expect(loadIssues.length).toBeGreaterThan(0);
  });

  it("detects poor polarization", () => {
    // All intensity, no easy sessions
    const badWeek = makeWeek(1, [
      { sport: "Course", title: "Intervalles VO2max 5x3min", details: "Z6" },
      { sport: "Course", title: "Seuil 2x20min", details: "Z5" },
      { sport: "Course", title: "Tempo marathon", details: "Z4a" },
      { sport: "Course", title: "VMA 30/30", details: "Z6" },
      { sport: "Course", title: "Fartlek seuil", details: "Z5 intervalles" },
    ]);
    const result = validatePlan(makePlan([badWeek]));

    const polarIssues = result.issues.filter(i => i.rule === "polarization");
    expect(polarIssues.length).toBeGreaterThan(0);
  });

  it("detects missing key sessions", () => {
    // All easy, no key sessions
    const easyWeek = makeWeek(1, [
      { sport: "Course", title: "EF Z2 40min", details: "Facile" },
      { sport: "Course", title: "EF Z2 45min", details: "Facile" },
      { sport: "Course", title: "EF Z2 50min", details: "Facile" },
      { sport: "Course", title: "EF Z2 35min", details: "Facile" },
      { sport: "Course", title: "EF Z2 40min", details: "Facile" },
    ]);
    const result = validatePlan(makePlan([easyWeek]));

    const keyIssues = result.issues.filter(i => i.rule === "key_sessions" && i.severity === "error");
    expect(keyIssues.length).toBeGreaterThan(0);
  });

  it("produces weekMetrics for each week", () => {
    const plan = makePlan([makePolarizedWeek(1), makePolarizedWeek(2)]);
    const result = validatePlan(plan);

    expect(result.weekMetrics).toHaveLength(2);
    expect(result.weekMetrics[0].weekNumber).toBe(1);
    expect(result.weekMetrics[0].activeSessions).toBeGreaterThan(0);
    expect(result.weekMetrics[0].keySessions).toBeGreaterThan(0);
  });
});
