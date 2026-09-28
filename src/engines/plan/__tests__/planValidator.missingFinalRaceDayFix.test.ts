import { describe, it, expect } from "vitest";
import { computeMissingFinalRaceDayFix } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Bug réel (audit "plan multi-objectifs Sables d'Olonne", plan Ironman 39
 * semaines, retour ChatGPT relayé par le coach) : un plan censé se terminer
 * en S39 sur l'Ironman finissait sur "Dimanche — strength — Activation
 * Neuromusculaire & Mobilité Race Day" — le Jour J avait complètement
 * disparu. Le verrouillage n'existait qu'en instruction texte du prompt
 * (promptHelpers.ts), et `validateRaceDayPresence` ne s'exécutait qu'à la
 * sauvegarde (handleSaveToPlan), jamais juste après la génération — un
 * coach consultant le plan avant de sauvegarder ne voyait rien.
 *
 * `computeMissingFinalRaceDayFix` détecte ce cas précis en amont (verrou à
 * la génération, AITrainingPlanPage.tsx) : la dernière semaine du plan
 * correspond-elle à la date de l'objectif final daté, et si oui, contient-
 * elle bien une séance de Jour J ?
 */
function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Thème",
    phase: "taper",
    dayName: "Dimanche",
    dayIndex: 6,
    sport: "run",
    title: "Séance",
    details: "",
    isRest: false,
    ...overrides,
  };
}

function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[]): ParsedWeek {
  return {
    weekNumber,
    theme: `Semaine ${weekNumber}`,
    phase: "taper",
    sessions: sessions.map((s, i) => makeSession({ weekNumber, dayIndex: s.dayIndex ?? i, ...s })),
  };
}

function makePlan(totalWeeks: number, lastWeekSessions: Partial<ParsedSession>[]): ParsedPlan {
  const weeks: ParsedWeek[] = [];
  for (let w = 1; w < totalWeeks; w++) {
    weeks.push(makeWeek(w, [{ title: "Footing", isRest: false }]));
  }
  weeks.push(makeWeek(totalWeeks, lastWeekSessions));
  return { title: "Plan TFCL™ — Ironman — 39 semaines", phases: [], weeks, totalWeeks };
}

// Plan de 39 semaines démarrant un lundi (planStartDate ancré lundi, comme
// mapSessionsToDates l'exige) — semaine 39 tombe donc sur J = start + 38*7.
const PLAN_START = "2026-09-28"; // lundi
const WEEK_39_SUNDAY = "2027-06-27"; // dimanche de la semaine 39 (Sables d'Olonne)

describe("computeMissingFinalRaceDayFix — verrou Jour J à la génération", () => {
  it("détecte l'absence du Jour J en dernière semaine quand elle correspond à la date de l'objectif final", () => {
    const plan = makePlan(39, [
      { title: "Activation Neuromusculaire & Mobilité Race Day", sport: "strength", catalogId: "D_ACTIVATION_PRERACE" },
    ]);
    const fix = computeMissingFinalRaceDayFix(plan, [WEEK_39_SUNDAY], PLAN_START);
    expect(fix).not.toBeNull();
    expect(fix?.weekNumber).toBe(39);
    expect(fix?.finalRaceDate).toBe(WEEK_39_SUNDAY);
  });

  it("ne signale rien si le Jour J est bien présent en dernière semaine", () => {
    const plan = makePlan(39, [
      { title: "🏁 COMPÉTITION — Ironman Les Sables d'Olonne", sport: "run" },
    ]);
    const fix = computeMissingFinalRaceDayFix(plan, [WEEK_39_SUNDAY], PLAN_START);
    expect(fix).toBeNull();
  });

  it("reconnaît différents marqueurs de Jour J valides (pas seulement l'emoji 🏁)", () => {
    for (const title of ["Jour J — Marathon de Séville", "Course Objectif A", "Race Day"]) {
      const plan = makePlan(39, [{ title }]);
      const fix = computeMissingFinalRaceDayFix(plan, [WEEK_39_SUNDAY], PLAN_START);
      expect(fix, `titre "${title}" devrait être reconnu comme Jour J`).toBeNull();
    }
  });

  it("ne signale rien si la dernière semaine du plan NE correspond PAS à l'objectif final daté (plan tronqué/partiel)", () => {
    // Le plan ne fait que 20 semaines mais l'objectif final tombe en S39 —
    // ce plan n'est pas censé se terminer sur cette course, rien à verrouiller.
    const plan = makePlan(20, [{ title: "Footing tranquille" }]);
    const fix = computeMissingFinalRaceDayFix(plan, [WEEK_39_SUNDAY], PLAN_START);
    expect(fix).toBeNull();
  });

  it("ne signale rien en l'absence de tout objectif daté", () => {
    const plan = makePlan(39, [{ title: "Footing tranquille" }]);
    const fix = computeMissingFinalRaceDayFix(plan, [null, undefined, ""], PLAN_START);
    expect(fix).toBeNull();
  });

  it("utilise l'objectif daté le PLUS TARDIF quand plusieurs dates sont fournies (plan multi-objectifs)", () => {
    const SEVILLE = "2027-02-21"; // objectif intermédiaire (Marathon de Séville)
    const plan = makePlan(39, [
      { title: "Activation Neuromusculaire & Mobilité Race Day", sport: "strength" },
    ]);
    // Seul le Jour J de l'objectif FINAL (Sables, dernière semaine) doit être
    // vérifié ici — Séville tombe bien plus tôt dans le plan (S21).
    const fix = computeMissingFinalRaceDayFix(plan, [SEVILLE, WEEK_39_SUNDAY], PLAN_START);
    expect(fix?.finalRaceDate).toBe(WEEK_39_SUNDAY);
    expect(fix?.weekNumber).toBe(39);
  });

  it("ne plante pas sur un plan vide", () => {
    const plan: ParsedPlan = { title: "Vide", phases: [], weeks: [], totalWeeks: 0 };
    expect(computeMissingFinalRaceDayFix(plan, [WEEK_39_SUNDAY], PLAN_START)).toBeNull();
  });
});
