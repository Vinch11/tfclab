import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Bug réel signalé par le coach (audit d'un plan IA généré, PDF) : la sortie
 * longue "Base aérobie Lydiard" (LYDIARD_RUN_AEROBIC_BASE_LONG) a été générée
 * avec EXACTEMENT la même durée (1h45) en S1 et S2, alors que sa propre fiche
 * affirme "La DURÉE augmente, pas l'intensité" et documente une progression
 * explicite sur plusieurs semaines (`when`: "Volume progressif sur 16-24
 * semaines"). La Règle #4 Progression (validateProgression) ne regarde que le
 * volume hebdomadaire TOTAL — une fiche-pilier figée peut s'y noyer si
 * d'autres séances de la semaine compensent en durée.
 */
function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Test",
    phase: "base",
    dayName: "Dimanche",
    dayIndex: 6,
    sport: "Course",
    title: "Séance",
    details: "",
    isRest: false,
    ...overrides,
  };
}

function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[], theme = "Standard", phase = "base"): ParsedWeek {
  return {
    weekNumber,
    theme,
    phase,
    sessions: sessions.map((s, i) => makeSession({
      weekNumber,
      weekTheme: theme,
      dayIndex: i % 7,
      dayName: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"][i % 7],
      ...s,
    })),
  };
}

function makePlan(weeks: ParsedWeek[]): ParsedPlan {
  return {
    title: "Plan TFCL™ — 70.3 Test Athlete — 7 semaines",
    phases: [],
    weeks,
    totalWeeks: weeks.length,
  };
}

describe("validateProgression — stagnation d'un pilier hebdomadaire déclaré progressif", () => {
  it("flague une fiche-pilier (Lydiard) dont la durée ne progresse PAS entre deux occurrences", () => {
    const weeks = [
      makeWeek(1, [{ title: "Base aérobie Lydiard", details: "Main: 1h45 en Z1-Z2 strict.", catalogId: "LYDIARD_RUN_AEROBIC_BASE_LONG" }]),
      makeWeek(2, [{ title: "Base aérobie Lydiard", details: "Main: 1h45 en Z1-Z2 strict.", catalogId: "LYDIARD_RUN_AEROBIC_BASE_LONG" }]),
    ];
    const result = validatePlan(makePlan(weeks));
    const issue = result.issues.find((i) => i.rule === "progression" && i.week === 2 && /n'a pas progressé/i.test(i.message));
    expect(issue).toBeDefined();
    expect(issue?.message).toMatch(/105min → 105min|1h45/);
  });

  it("ne flague pas quand la durée progresse réellement d'une occurrence à l'autre", () => {
    const weeks = [
      makeWeek(1, [{ title: "Base aérobie Lydiard", details: "Main: 1h30 en Z1-Z2 strict.", catalogId: "LYDIARD_RUN_AEROBIC_BASE_LONG" }]),
      makeWeek(2, [{ title: "Base aérobie Lydiard", details: "Main: 1h50 en Z1-Z2 strict.", catalogId: "LYDIARD_RUN_AEROBIC_BASE_LONG" }]),
    ];
    const result = validatePlan(makePlan(weeks));
    expect(result.issues.filter((i) => i.rule === "progression" && /n'a pas progressé/i.test(i.message))).toHaveLength(0);
  });

  it("ne flague pas une fiche répétée à l'identique quand elle n'est PAS déclarée progressive (ex: SFR)", () => {
    const weeks = [
      makeWeek(1, [{ sport: "Vélo", title: "SFR côte", details: "70' au total.", catalogId: "V3_BIKE_FORCE_SFR" }]),
      makeWeek(2, [{ sport: "Vélo", title: "SFR côte", details: "70' au total.", catalogId: "V3_BIKE_FORCE_SFR" }]),
    ];
    const result = validatePlan(makePlan(weeks));
    expect(result.issues.filter((i) => i.rule === "progression" && /n'a pas progressé/i.test(i.message))).toHaveLength(0);
  });

  it("ne flague pas une seule occurrence (rien à comparer)", () => {
    const weeks = [
      makeWeek(1, [{ title: "Base aérobie Lydiard", details: "Main: 1h45 en Z1-Z2 strict.", catalogId: "LYDIARD_RUN_AEROBIC_BASE_LONG" }]),
    ];
    const result = validatePlan(makePlan(weeks));
    expect(result.issues.filter((i) => i.rule === "progression" && /n'a pas progressé/i.test(i.message))).toHaveLength(0);
  });
});
