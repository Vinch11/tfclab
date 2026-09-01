import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Bug réel signalé par le coach (audit d'un plan IA généré, PDF) : le test de
 * calibration FatMax (FATMAX_BIKE_ZONE_FINDER, protocole à usage unique) a
 * été généré 3x dans la même semaine (mardi/mercredi/jeudi), et la séance SFR
 * (V3_BIKE_FORCE_SFR, dont la propre fiche indique "Base/Build, 1x/semaine
 * max") a été générée 2x dans la même semaine — parce que la Règle #17
 * Anti-Répétition (validateAntiRepetition) ne comparait les séances QUE d'une
 * semaine à l'autre (même jour, semaines consécutives), jamais au sein d'une
 * même semaine.
 */
function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Test",
    phase: "base",
    dayName: "Lundi",
    dayIndex: 0,
    sport: "Vélo",
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

describe("validateAntiRepetition — duplication intra-semaine (fiches test/fréquence plafonnée)", () => {
  it("flague un protocole de test/calibration (tag \"test\") généré plusieurs fois dans la même semaine", () => {
    const week = makeWeek(2, [
      { sport: "Vélo", title: "Test FatMax", details: "Calibration zone lipidique", catalogId: "FATMAX_BIKE_ZONE_FINDER" },
      { sport: "Vélo", title: "Test FatMax", details: "Calibration zone lipidique", catalogId: "FATMAX_BIKE_ZONE_FINDER" },
      { sport: "Vélo", title: "Test FatMax", details: "Calibration zone lipidique", catalogId: "FATMAX_BIKE_ZONE_FINDER" },
    ]);
    const result = validatePlan(makePlan([week]));
    const issue = result.issues.find(
      (i) => i.rule === "anti_repetition" && i.week === 2 && /test\/calibration/i.test(i.message),
    );
    expect(issue).toBeDefined();
    expect(issue?.message).toMatch(/3x/);
  });

  it("flague une fiche plafonnée par sa propre fiche (\"1x/semaine max\") générée 2x dans la même semaine", () => {
    const week = makeWeek(1, [
      { sport: "Vélo", title: "SFR côte", details: "Force résistance", catalogId: "V3_BIKE_FORCE_SFR" },
      { sport: "Vélo", title: "SFR côte", details: "Force résistance", catalogId: "V3_BIKE_FORCE_SFR" },
    ]);
    const result = validatePlan(makePlan([week]));
    const issue = result.issues.find(
      (i) => i.rule === "anti_repetition" && i.week === 1 && /1x\/semaine max/i.test(i.message),
    );
    expect(issue).toBeDefined();
  });

  it("ne flague pas une fiche plafonnée à \"1x/semaine max\" quand elle n'apparaît qu'une fois", () => {
    const week = makeWeek(1, [
      { sport: "Vélo", title: "SFR côte", details: "Force résistance", catalogId: "V3_BIKE_FORCE_SFR" },
      { sport: "Course", title: "EF Z2 45min", details: "Endurance" },
    ]);
    const result = validatePlan(makePlan([week]));
    expect(result.issues.filter((i) => i.rule === "anti_repetition" && i.week === 1)).toHaveLength(0);
  });

  it("ne flague pas une même fiche répétée sur deux SEMAINES DIFFÉRENTES (hors scope de ce contrôle intra-semaine)", () => {
    const weeks = [
      makeWeek(1, [{ sport: "Vélo", title: "SFR côte", details: "", catalogId: "V3_BIKE_FORCE_SFR" }]),
      makeWeek(2, [{ sport: "Vélo", title: "SFR côte", details: "", catalogId: "V3_BIKE_FORCE_SFR" }]),
    ];
    const result = validatePlan(makePlan(weeks));
    expect(result.issues.filter((i) => i.rule === "anti_repetition" && /1x\/semaine max/i.test(i.message))).toHaveLength(0);
  });

  it("ne flague pas une séance générique (EF/récupération) répétée plusieurs fois dans la semaine — pas de faux positif", () => {
    const week = makeWeek(1, [
      { sport: "Course", title: "EF Z2 45min", details: "Endurance" },
      { sport: "Course", title: "EF Z2 45min", details: "Endurance" },
      { sport: "Course", title: "EF Z2 45min", details: "Endurance" },
    ]);
    const result = validatePlan(makePlan([week]));
    expect(result.issues.filter((i) => i.rule === "anti_repetition" && i.week === 1)).toHaveLength(0);
  });
});
