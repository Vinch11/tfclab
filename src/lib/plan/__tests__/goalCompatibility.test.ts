import { describe, it, expect } from "vitest";
import { normalizeGoal, isGoalIncompatibleWithObjective } from "../goalCompatibility";

/**
 * Audit "B-5K-BEGINNER round 3" (JSON réel 2026-10-14, consigne coach) :
 * verrouille le périmètre EXACT de `isGoalIncompatibleWithObjective` — le
 * hard-ban cross-distance doit s'appliquer aux objectifs COURTS (5k/10k/
 * semi) et NE JAMAIS affecter marathon/half(70.3)/ironman/trail, pour
 * garantir zéro régression sur ces objectifs (consigne coach explicite :
 * "vérifie les effets sur... 70.3 et Ironman").
 */
describe("normalizeGoal — alias objectif (consigne coach : 5 KM / 5K / 10K / semi / marathon)", () => {
  it("reconnaît toutes les variantes d'écriture de '5 km' comme équivalentes", () => {
    expect(normalizeGoal("5 KM")).toEqual(["5k", "10k"]);
    expect(normalizeGoal("5K")).toEqual(["5k", "10k"]);
    expect(normalizeGoal("5k")).toEqual(["5k", "10k"]);
    expect(normalizeGoal("5km")).toEqual(["5k", "10k"]);
    expect(normalizeGoal("Premier 5 km dans 12 semaines")).toEqual(["5k", "10k"]);
  });

  it("reconnaît toutes les variantes d'écriture de '10 km'", () => {
    expect(normalizeGoal("10K")).toEqual(["10k", "semi"]);
    expect(normalizeGoal("10km")).toEqual(["10k", "semi"]);
    expect(normalizeGoal("10 km")).toEqual(["10k", "semi"]);
  });

  it("Semi / Marathon / 70.3 / Ironman gardent leur goal primaire correct", () => {
    expect(normalizeGoal("Semi")[0]).toBe("semi");
    expect(normalizeGoal("Marathon")[0]).toBe("marathon");
    expect(normalizeGoal("70.3")[0]).toBe("half");
    expect(normalizeGoal("Ironman")[0]).toBe("ironman");
  });
});

describe("isGoalIncompatibleWithObjective — portée (jamais sur marathon/half/ironman/trail)", () => {
  const CANOVA_GOALS = ["marathon", "semi", "half", "ironman"] as const;
  const SLEEP_LOW_GOALS = ["ironman", "half", "marathon", "semi"] as const; // GOALS_ALL_ENDURANCE

  it("5 KM — exclut une fiche goals=['marathon','semi','half','ironman'] (cas réel CANOVA_RUN_INTRODUCTIVE_PHASE)", () => {
    expect(isGoalIncompatibleWithObjective([...CANOVA_GOALS], normalizeGoal("5 KM"))).toBe(true);
  });

  it("5 KM — exclut une fiche goals=['marathon','semi'] (cas réel V2_RUN_NEGATIVE_SPLIT_RACE_SIM, GOALS_RUN)", () => {
    expect(isGoalIncompatibleWithObjective(["marathon", "semi"], normalizeGoal("5 KM"))).toBe(true);
  });

  it("5 KM — exclut une fiche GOALS_ALL_ENDURANCE (cas réel FM_RUN_SLEEP_LOW_AM/FM_RUN_FATMAX_ZONE)", () => {
    expect(isGoalIncompatibleWithObjective([...SLEEP_LOW_GOALS], normalizeGoal("5 KM"))).toBe(true);
  });

  it("5 KM — n'exclut PAS une fiche sans `goals` du tout (métadonnée absente, consigne coach explicite)", () => {
    expect(isGoalIncompatibleWithObjective(undefined, normalizeGoal("5 KM"))).toBe(false);
    expect(isGoalIncompatibleWithObjective([], normalizeGoal("5 KM"))).toBe(false);
  });

  it("5 KM — n'exclut PAS une fiche goals=GOALS_ALL (inclut '5k', cas réel ENR_ALTITUDE_EASY_RUN/V2_RUN_MENTAL_FATIGUE — laissé à la garde findReplacement)", () => {
    expect(isGoalIncompatibleWithObjective(["ironman", "half", "sprint", "olympic", "marathon", "semi", "10k", "5k"], normalizeGoal("5 KM"))).toBe(false);
  });

  it("10K — une fiche marathon pure (goals=['marathon'], sans 'semi') est exclue", () => {
    expect(isGoalIncompatibleWithObjective(["marathon"], normalizeGoal("10K"))).toBe(true);
  });

  it("10K — la fiche Canova/GOALS_RUN (qui inclut 'semi') N'est PAS exclue : normalizeGoal('10K') inclut 'semi' en repli structurel pré-existant (adjacence 10K/semi déjà présente avant ce correctif, hors périmètre round 3)", () => {
    expect(isGoalIncompatibleWithObjective([...CANOVA_GOALS], normalizeGoal("10K"))).toBe(false);
    expect(isGoalIncompatibleWithObjective(["marathon", "semi"], normalizeGoal("10K"))).toBe(false);
  });

  it("Semi — une fiche marathon/ironman/half SANS 'semi' est exclue, mais la fiche Canova (qui inclut 'semi') ne l'est PAS", () => {
    expect(isGoalIncompatibleWithObjective(["ironman", "half"], normalizeGoal("Semi"))).toBe(true);
    expect(isGoalIncompatibleWithObjective([...CANOVA_GOALS], normalizeGoal("Semi"))).toBe(false);
  });

  it("Marathon — AUCUNE exclusion, quel que soit `goals` de la fiche (zéro régression garantie)", () => {
    expect(isGoalIncompatibleWithObjective([...CANOVA_GOALS], normalizeGoal("Marathon"))).toBe(false);
    expect(isGoalIncompatibleWithObjective(["5k"], normalizeGoal("Marathon"))).toBe(false);
    expect(isGoalIncompatibleWithObjective(["trail_ultra"], normalizeGoal("Marathon"))).toBe(false);
  });

  it("70.3 (half) — AUCUNE exclusion (zéro régression garantie)", () => {
    expect(isGoalIncompatibleWithObjective(["5k"], normalizeGoal("70.3"))).toBe(false);
    expect(isGoalIncompatibleWithObjective(["marathon"], normalizeGoal("70.3"))).toBe(false);
  });

  it("Ironman — AUCUNE exclusion (zéro régression garantie)", () => {
    expect(isGoalIncompatibleWithObjective(["5k"], normalizeGoal("Ironman"))).toBe(false);
    expect(isGoalIncompatibleWithObjective(["semi"], normalizeGoal("Ironman"))).toBe(false);
  });

  it("Trail — AUCUNE exclusion (objectif non court, zéro régression garantie)", () => {
    expect(isGoalIncompatibleWithObjective(["marathon"], normalizeGoal("Trail 50K"))).toBe(false);
  });
});
