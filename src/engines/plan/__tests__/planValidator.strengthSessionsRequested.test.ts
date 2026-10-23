import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * GRAND SPRINT P0, Sprint 6 ("décisions du coach"), 2026-10-23 : "contrôler
 * la présence du renforcement demandé". `strengthSessionsPerWeek` (UI
 * "Renforcement/sem", 0-3) est transmis au prompt système comme une
 * instruction stricte ("Inclure EXACTEMENT N séance(s) de renforcement/PPG
 * par semaine") — jusqu'ici jamais vérifié sur le plan réellement généré.
 * Cette suite verrouille `validateStrengthSessionsRequested`.
 */

function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1, weekTheme: "Test", phase: "build", dayName: "Lundi", dayIndex: 0,
    sport: "Course", title: "EF", details: "45min", isRest: false, ...overrides,
  };
}

function makeWeek(weekNumber: number, strengthCount: number, theme = "Build", phase = "build"): ParsedWeek {
  const sessions: ParsedSession[] = [
    makeSession({ weekNumber, sport: "Course", details: "45min", dayName: "Lundi", dayIndex: 0 }),
    makeSession({ weekNumber, sport: "Course", details: "50min", dayName: "Mercredi", dayIndex: 2 }),
  ];
  for (let i = 0; i < strengthCount; i++) {
    sessions.push(makeSession({
      weekNumber, sport: "Renfo", title: "Renforcement", details: "30min",
      dayName: ["Mardi", "Jeudi", "Vendredi"][i], dayIndex: [1, 3, 4][i],
    }));
  }
  return { weekNumber, theme, phase, sessions };
}

function makePlan(weeks: ParsedWeek[]): ParsedPlan {
  return { title: "Plan Test", phases: [], weeks, totalWeeks: weeks.length } as ParsedPlan;
}

function strengthIssues(plan: ParsedPlan, strengthSessionsPerWeek: number) {
  const vr = validatePlan(
    plan, "Marathon",
    undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
    undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
    strengthSessionsPerWeek,
  );
  return vr.issues.filter((i) => i.rule === "strength_sessions_requested");
}

// Plans suffisamment longs pour que S1-S3 (semaines testées) restent
// clairement "load" — un plan court place les dernières semaines en
// taper/recovery PAR POSITION (inferWeekType), hors périmètre de ce
// contrôle comme de toutes les règles basées sur isContentOrScheduleDeload.
function padWeeks(early: ParsedWeek[], strengthCountForPadding: number, totalWeeks = 10): ParsedWeek[] {
  const weeks = [...early];
  for (let w = early.length + 1; w <= totalWeeks; w++) weeks.push(makeWeek(w, strengthCountForPadding));
  return weeks;
}

describe("validateStrengthSessionsRequested — respect du renforcement demandé par le coach", () => {
  it("[TEST OBLIGATOIRE] 2 séances demandées, 0 présentes → erreur (Δ=-2, hors tolérance)", () => {
    const plan = makePlan(padWeeks([makeWeek(1, 0), makeWeek(2, 0), makeWeek(3, 0)], 2));
    const issues = strengthIssues(plan, 2);
    const earlyIssues = issues.filter((i) => i.week! <= 3);
    expect(earlyIssues.length).toBe(3);
    expect(earlyIssues.every((i) => i.severity === "error")).toBe(true);
  });

  it("0 séance demandée explicitement (\"Aucun\"), mais renforcement présent → signalé", () => {
    const plan = makePlan(padWeeks([makeWeek(1, 2), makeWeek(2, 2)], 0));
    const issues = strengthIssues(plan, 0);
    const earlyIssues = issues.filter((i) => i.week! <= 2);
    expect(earlyIssues.length).toBe(2);
    expect(earlyIssues[0].message).toContain("2 séance(s)");
    expect(earlyIssues[0].message).toContain("0 demandée(s)");
  });

  it("nombre exact respecté chaque semaine → aucune alerte", () => {
    const plan = makePlan(padWeeks([makeWeek(1, 2), makeWeek(2, 2), makeWeek(3, 2)], 2));
    expect(strengthIssues(plan, 2).filter((i) => i.week! <= 3)).toHaveLength(0);
  });

  it("écart d'une seule séance → avertissement, pas une erreur (tolérance au bruit, pas au-delà)", () => {
    const plan = makePlan(padWeeks([makeWeek(1, 1)], 2));
    const issues = strengthIssues(plan, 2).filter((i) => i.week === 1);
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe("warning");
  });

  it("strengthSessionsPerWeek omis → contrôle inactif (comportement inchangé)", () => {
    const plan = makePlan(padWeeks([makeWeek(1, 0)], 0));
    const vr = validatePlan(plan, "Marathon");
    expect(vr.issues.filter((i) => i.rule === "strength_sessions_requested")).toHaveLength(0);
  });

  it("semaine de décharge exclue du contrôle (hors périmètre, comme les autres règles de ce fichier)", () => {
    const plan = makePlan(padWeeks([
      makeWeek(1, 2), makeWeek(2, 2), makeWeek(3, 2),
      makeWeek(4, 0, "Décharge", "base"), // thème "Décharge" → DELOAD_PATTERNS
      makeWeek(5, 2), makeWeek(6, 2),
    ], 2));
    const issues = strengthIssues(plan, 2);
    expect(issues.some((i) => i.week === 4)).toBe(false);
  });
});
