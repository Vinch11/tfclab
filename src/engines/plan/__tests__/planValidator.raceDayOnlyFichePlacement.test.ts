import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Bug réel signalé par le coach ("à partir de S5, aucune intensité, aucun
 * travail spécifique") : `D_PRE_RACE_ACTIVATION_RUN` (catalogue : `when` =
 * "Matin compétition (J)") a été généré un MARDI ordinaire de S5, 2 semaines
 * avant la course, et `ENR_TAPER_SHAKEOUT_RUN` (`when` = "Veille de
 * course") un JEUDI de S6, 8 jours avant la course. Deux fiches conçues
 * comme des rituels de jour J (très courtes, peu spécifiques par nature —
 * 10-25min, Z1) utilisées comme du contenu hebdomadaire ordinaire. Aucun
 * contrôle existant (checkB11/flagsFor) ne détectait ce sens : B11 vérifie
 * seulement qu'une fiche N'EST PAS exclue de la race-week, jamais qu'elle y
 * est CONFINÉE.
 */
function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 5,
    weekTheme: "Spécificité LCW",
    phase: "Bloc 4 · Race-Specific LCW",
    dayName: "Mardi",
    dayIndex: 1,
    sport: "Course",
    title: "Séance",
    details: "",
    isRest: false,
    ...overrides,
  };
}

function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[], theme = "Chantier", phase = "Chantier"): ParsedWeek {
  return {
    weekNumber,
    theme,
    phase,
    sessions: sessions.map((s, i) => makeSession({ weekNumber, weekTheme: theme, dayIndex: s.dayIndex ?? i, ...s })),
  };
}

function makePlan(weeks: ParsedWeek[]): ParsedPlan {
  return { title: "Plan TFCL™ — 70.3 LCW Cath — 7 semaines", phases: [], weeks, totalWeeks: weeks.length };
}

describe("validateRaceDayOnlyFichePlacement — fiches 'jour J' hors semaine de course", () => {
  it("flague D_PRE_RACE_ACTIVATION_RUN (\"Matin compétition (J)\") placée un mardi ordinaire, loin de la course", () => {
    const week = makeWeek(5, [
      { dayIndex: 1, dayName: "Mardi", title: "Activation Allure Course", catalogId: "D_PRE_RACE_ACTIVATION_RUN" },
    ], "Spécificité LCW 1", "Bloc 4 · Race-Specific LCW");
    const result = validatePlan(makePlan([week]));
    const issue = result.issues.find((i) => i.rule === "race_day_only_fiche_misplaced" && i.week === 5);
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("error");
    expect(issue?.message).toMatch(/Matin compétition/);
  });

  it("flague ENR_TAPER_SHAKEOUT_RUN (\"Veille de course\") placée 8 jours avant la course, hors race-week", () => {
    const week = makeWeek(6, [
      { dayIndex: 3, dayName: "Jeudi", title: "Shakeout J-1", catalogId: "ENR_TAPER_SHAKEOUT_RUN" },
    ], "Affûtage & Surcompensation", "Bloc 4 · Race-Specific LCW");
    const result = validatePlan(makePlan([week]));
    const issue = result.issues.find((i) => i.rule === "race_day_only_fiche_misplaced" && i.week === 6);
    expect(issue).toBeDefined();
  });

  it("ne flague pas ces mêmes fiches quand elles sont utilisées DANS la vraie semaine de course", () => {
    const week = makeWeek(7, [
      { dayIndex: 3, dayName: "Jeudi", title: "Shakeout J-1", catalogId: "ENR_TAPER_SHAKEOUT_RUN" },
      { dayIndex: 5, dayName: "Samedi", title: "🏁 COURSE OBJECTIF A — Étape 2/3 — Vélo", details: "" },
    ], "Race Week", "Affûtage");
    const result = validatePlan(makePlan([week]));
    expect(result.issues.filter((i) => i.rule === "race_day_only_fiche_misplaced")).toHaveLength(0);
  });

  it("ne flague pas une fiche générique sans restriction 'jour J' dans son `when`", () => {
    const week = makeWeek(5, [
      { dayIndex: 1, dayName: "Mardi", title: "SFR côte", catalogId: "V3_BIKE_FORCE_SFR" },
    ], "Spécificité LCW 1", "Bloc 4 · Race-Specific LCW");
    const result = validatePlan(makePlan([week]));
    expect(result.issues.filter((i) => i.rule === "race_day_only_fiche_misplaced")).toHaveLength(0);
  });
});
