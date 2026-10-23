import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";
import type { ClassifiableRaceGoal } from "@/lib/plan/multiObjectiveClassification";

/**
 * GRAND SPRINT P0 — Sprint 1/4 ("hiérarchie multiobjectifs" / "calendrier et
 * périodisation"), 2026-10-23 : "Détecter les incohérences calendaires" et
 * "corriger les situations où une erreur de calendrier désactive
 * silencieusement le contrôle du Jour J". Deux garde-fous verrouillés ici :
 *
 * 1. `validateRaceCalendarCoherence` (nouvelle règle "calendar_incoherence") :
 *    une course datée avant le début du plan, ou largement après sa fin,
 *    n'est plus silencieusement ignorée — avertissement visible.
 * 2. `validateRaceDayPresence` : une semaine cible (date de course → numéro
 *    de semaine) qui ne correspond à aucune semaine réelle du plan généré
 *    ne désactive plus silencieusement tout le contrôle "Jour J" pour cette
 *    course — avertissement visible au lieu d'un `continue` muet.
 */

function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Test",
    phase: "build",
    dayName: "Lundi",
    dayIndex: 0,
    sport: "Course",
    title: "EF Z2",
    details: "",
    isRest: false,
    ...overrides,
  };
}

function makePlan(weeks: number): ParsedPlan {
  const parsedWeeks: ParsedWeek[] = Array.from({ length: weeks }, (_, i) => ({
    weekNumber: i + 1,
    theme: "Test",
    phase: "build",
    sessions: [makeSession({ weekNumber: i + 1 })],
  }));
  return { title: "Plan Test", phases: [], weeks: parsedWeeks, totalWeeks: weeks } as ParsedPlan;
}

function calendarIssues(
  plan: ParsedPlan,
  objective: string,
  raceGoals: ClassifiableRaceGoal[],
  planStartDate: string,
) {
  const vr = validatePlan(
    plan, objective,
    undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
    undefined, undefined, undefined, undefined, undefined,
    raceGoals, planStartDate,
  );
  return vr.issues.filter((i) => i.rule === "calendar_incoherence");
}

describe("validateRaceCalendarCoherence — incohérences calendaires explicites", () => {
  it("course datée AVANT le début du plan → avertissement visible, pas une ignorance silencieuse", () => {
    const issues = calendarIssues(
      makePlan(12), "Marathon",
      [{ objective: "Marathon", raceDate: "2026-12-01", raceName: "Marathon de Paris", priority: "A" }],
      "2027-01-04",
    );
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe("warning");
    expect(issues[0].message).toContain("Marathon de Paris");
    expect(issues[0].message).toContain("avant le début du plan");
  });

  it("course datée largement AU-DELÀ de la durée réelle du plan → avertissement visible", () => {
    const issues = calendarIssues(
      makePlan(8), "Marathon",
      [{ objective: "Marathon", raceDate: "2027-06-01", raceName: "Marathon lointain", priority: "A" }],
      "2027-01-04",
    );
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe("warning");
    expect(issues[0].message).toContain("au-delà");
  });

  it("course datée exactement dans les bornes (avec la tolérance de +1 semaine) → aucune alerte", () => {
    expect(calendarIssues(
      makePlan(8), "Marathon",
      [{ objective: "Marathon", raceDate: "2027-02-28", raceName: "Marathon", priority: "A" }], // semaine 9 (tolérance)
      "2027-01-04",
    ).length).toBe(0);
  });

  it("aucune course datée dans les bornes normales → aucune alerte", () => {
    expect(calendarIssues(
      makePlan(12), "Marathon",
      [{ objective: "Marathon", raceDate: "2027-03-22", raceName: "Marathon de Paris", priority: "A" }],
      "2027-01-04",
    ).length).toBe(0);
  });

  it("raceGoals/planStartDate omis → contrôle inactif (comportement inchangé)", () => {
    const vr = validatePlan(makePlan(8), "Marathon");
    expect(vr.issues.filter((i) => i.rule === "calendar_incoherence")).toHaveLength(0);
  });

  it("reste un avertissement arbitrable par le coach — jamais une erreur bloquante pour cette règle", () => {
    const vr = validatePlan(
      makePlan(8), "Marathon",
      undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined,
      [{ objective: "Marathon", raceDate: "2026-12-01", raceName: "Marathon", priority: "A" }],
      "2027-01-04",
    );
    const calendarIssues = vr.issues.filter((i) => i.rule === "calendar_incoherence");
    expect(calendarIssues.length).toBeGreaterThan(0);
    expect(calendarIssues.every((i) => i.severity === "warning")).toBe(true);
  });
});

describe("validateRaceDayPresence — semaine cible hors plan réel (erreur de calendrier)", () => {
  it("numéro de semaine calculé au-delà du plan réel → avertissement explicite, plus un 'continue' muet", () => {
    const plan = makePlan(8);
    const vr = validatePlan(plan, "Marathon", undefined, [15]); // S15 n'existe pas (plan de 8 sem.)
    const raceDayIssues = vr.issues.filter((i) => i.rule === "race_day");
    expect(raceDayIssues.some((i) => i.severity === "warning" && i.message.includes("Incohérence calendaire"))).toBe(true);
  });

  it("numéro de semaine calculé dans les bornes réelles → comportement inchangé (signale l'absence de Jour J normalement)", () => {
    const plan = makePlan(8);
    const vr = validatePlan(plan, "Marathon", undefined, [8]);
    const raceDayIssues = vr.issues.filter((i) => i.rule === "race_day");
    expect(raceDayIssues.some((i) => i.message.includes("Jour de course absent"))).toBe(true);
    expect(raceDayIssues.some((i) => i.message.includes("Incohérence calendaire"))).toBe(false);
  });
});
