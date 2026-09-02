import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Bug réel signalé par le coach (audit d'un plan IA régénéré, PDF) : la
 * semaine "Spécifique LCW & Race Power" (Bloc 3 · Race-Specific LCW) porte
 * TOUT le travail modéré/dur sur le vélo (Sweet Spot Hills, TT Position Aéro,
 * TT Race Pace LCW), tandis que les 4 séances de course de la même semaine
 * sont EXACTEMENT la même fiche générique de récupération Z2 (A_RUN_Z2_EASY)
 * — zéro contenu qualité/spécifique course dans une semaine dont le nom même
 * promet "Race Power". Le coach : "la partie course à pied est très timide...
 * ça ne correspond pas à la phase du plan."
 */
function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Test",
    phase: "Bloc 3 · Race-Specific LCW",
    dayName: "Mardi",
    dayIndex: 1,
    sport: "Vélo",
    title: "Séance",
    details: "",
    isRest: false,
    ...overrides,
  };
}

function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[], theme: string, phase = "Bloc 3 · Race-Specific LCW"): ParsedWeek {
  return {
    weekNumber,
    theme,
    phase,
    sessions: sessions.map((s, i) => makeSession({ weekNumber, weekTheme: theme, phase, dayIndex: i % 7, ...s })),
  };
}

function makePlan(weeks: ParsedWeek[]): ParsedPlan {
  return {
    title: "Plan TFCL™ — 703 Test Athlete — 7 semaines",
    phases: [],
    weeks,
    totalWeeks: weeks.length,
  };
}

const HARD_BIKE = (day: number) => ({ sport: "Vélo", dayIndex: day, title: "Séance vélo dure", details: "40min Z4 seuil continu" });
const EASY_RUN = (day: number) => ({ sport: "Course", dayIndex: day, title: "Récupération course", details: "45min Z1-Z2 relâché", catalogId: "A_RUN_Z2_EASY" });
const HARD_RUN = (day: number) => ({ sport: "Course", dayIndex: day, title: "Séance course dure", details: "30min Z4 seuil continu" });

describe("validatePolarization — écart d'intensité entre sports en semaine race-specific", () => {
  it("flague quand le vélo porte tout le travail qualité et la course reste 100% bas-régime", () => {
    const week = makeWeek(5, [
      HARD_BIKE(1), EASY_RUN(1),
      HARD_BIKE(2), EASY_RUN(2),
      HARD_BIKE(3), EASY_RUN(3),
      EASY_RUN(4),
    ], "Spécifique LCW & Race Power");
    const result = validatePlan(makePlan([week]));
    const issue = result.issues.find((i) => i.rule === "polarization" && i.week === 5 && /100% bas-régime/i.test(i.message));
    expect(issue).toBeDefined();
    expect(issue?.message).toMatch(/Course reste 100% bas-régime/);
  });

  it("ne flague pas quand la course porte AUSSI du contenu qualité cette semaine-là", () => {
    const week = makeWeek(5, [
      HARD_BIKE(1), EASY_RUN(1),
      HARD_BIKE(2), HARD_RUN(2),
      HARD_BIKE(3), EASY_RUN(3),
      EASY_RUN(4),
    ], "Spécifique LCW & Race Power");
    const result = validatePlan(makePlan([week]));
    expect(result.issues.filter((i) => i.rule === "polarization" && /100% bas-régime/i.test(i.message))).toHaveLength(0);
  });

  it("n'applique pas ce contrôle à une semaine qui ne se déclare pas race-specific", () => {
    const week = makeWeek(2, [
      HARD_BIKE(1), EASY_RUN(1),
      HARD_BIKE(2), EASY_RUN(2),
      HARD_BIKE(3), EASY_RUN(3),
      EASY_RUN(4),
    ], "Développement Durabilité", "Bloc 1 · Fondation");
    const result = validatePlan(makePlan([week]));
    expect(result.issues.filter((i) => i.rule === "polarization" && /100% bas-régime/i.test(i.message))).toHaveLength(0);
  });
});
