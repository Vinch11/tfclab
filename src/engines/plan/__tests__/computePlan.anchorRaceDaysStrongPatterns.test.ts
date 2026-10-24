import { describe, it, expect } from "vitest";
import { postProcessParsedPlan } from "../computePlan";
import { isRaceDaySession } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "../types";
import type { PlanGenerationConfig } from "../types";

/**
 * Correction ciblée "P0 génération invalide" (2026-10-24), incident réel
 * n°1 : "Jour de course absent de la dernière semaine" alors que les
 * contrôles de réparation déterministes sont censés garantir sa présence.
 * Cause démontrée : `anchorRaceDays`/`dedupRaceDays` (computePlan.ts)
 * utilisaient leur propre copie LARGE de la détection "jour de course" —
 * jamais mise à jour après le correctif planValidator.ts (distinction
 * fort/faible + exclusion des rituels de préparation, audit "plan
 * multi-objectifs Sables d'Olonne"). Un simple rappel d'activation
 * mentionnant accessoirement "compétition" suffisait à faire croire au
 * filet déterministe qu'un Jour J existait déjà — il renonçait alors à en
 * fabriquer un réel, exactement comme le validateur en détecte l'absence.
 *
 * Ces tests vérifient le PROGRAMME PRODUIT (présence réelle d'une séance de
 * Jour J après post-traitement), pas seulement l'absence d'alerte.
 */

function makeSession(overrides: Partial<ParsedSession>): ParsedSession {
  return {
    weekNumber: 1, weekTheme: "Build", phase: "build", dayName: "Lundi", dayIndex: 0,
    sport: "Course", title: "EF", details: "45min", isRest: false, ...overrides,
  };
}

function makeWeek(weekNumber: number, sessions: ParsedSession[]): ParsedWeek {
  return { weekNumber, theme: "Build", phase: "build", sessions };
}

function makePlan(weeks: ParsedWeek[]): ParsedPlan {
  return { title: "Plan Test", phases: [], weeks, totalWeeks: weeks.length } as ParsedPlan;
}

function makeConfig(overrides: Partial<PlanGenerationConfig>): PlanGenerationConfig {
  return {
    objective: "IRONMAN 70.3",
    weeksAvailable: 12,
    mode: "ai",
    ...overrides,
  };
}

describe("anchorRaceDays/dedupRaceDays — détection Jour J alignée sur planValidator (plus de faux 'déjà présent')", () => {
  it("[TEST OBLIGATOIRE] semaine finale avec seulement un rappel d'activation (pas un vrai Jour J) → un vrai Jour J est fabriqué, le rappel est conservé", () => {
    const planStartDate = "2027-01-04"; // lundi
    const raceDate = "2027-03-28"; // dimanche, fin de S12 (diffDays=83 → semaine 12)

    const weeks: ParsedWeek[] = [];
    for (let w = 1; w <= 11; w++) {
      weeks.push(makeWeek(w, [
        makeSession({ weekNumber: w, dayName: "Lundi", dayIndex: 0, details: "60min" }),
        makeSession({ weekNumber: w, dayName: "Mercredi", dayIndex: 2, details: "45min" }),
      ]));
    }
    // Semaine finale (S12) : AUCUN vrai Jour J, seulement un rappel d'activation
    // qui mentionne accessoirement "compétition" — l'ancienne regex LARGE
    // (sans distinction fort/faible) l'aurait pris pour un Jour J réel.
    const activation = makeSession({
      weekNumber: 12, dayName: "Dimanche", dayIndex: 6, sport: "Course",
      title: "Activation neuromusculaire", details: "20min activation avant la compétition, mobilité légère.",
    });
    weeks.push(makeWeek(12, [activation]));

    const plan = makePlan(weeks);
    const config = makeConfig({
      weeksAvailable: 12,
      planStartDate,
      raceGoals: [{ objective: "IRONMAN 70.3", priority: "A", raceDate }],
    });

    // Vérifie la précondition du test : avant correction, cette séance
    // n'est PAS reconnue comme un vrai Jour J par le validateur.
    expect(isRaceDaySession(activation)).toBe(false);

    const { plan: result } = postProcessParsedPlan(plan, config);
    const lastWeek = result.weeks.find((w) => w.weekNumber === 12)!;

    // Le rappel d'activation original est toujours présent, inchangé.
    expect(lastWeek.sessions.some((s) => s.title === "Activation neuromusculaire")).toBe(true);
    // ET un vrai Jour J a bien été fabriqué — le programme produit contient
    // désormais réellement la compétition, pas seulement "aucune alerte".
    const realRaceDay = lastWeek.sessions.filter(isRaceDaySession);
    expect(realRaceDay.length).toBeGreaterThan(0);
  });

  it("[TEST OBLIGATOIRE] rappel pré-course légitime en semaine voisine (S11) → jamais déplacé à tort vers S12, un vrai Jour J est fabriqué séparément", () => {
    const planStartDate = "2027-01-04";
    const raceDate = "2027-03-28"; // S12

    const weeks: ParsedWeek[] = [];
    for (let w = 1; w <= 10; w++) {
      weeks.push(makeWeek(w, [makeSession({ weekNumber: w, dayName: "Lundi", dayIndex: 0 })]));
    }
    // S11 : rappel allure compétition la veille — légitime, PAS le Jour J,
    // mais matche l'ancienne regex LARGE ("compétition") sans le mot-clé
    // fort (🏁/"course objectif"/"jour de course|compétition").
    const eveReminder = makeSession({
      weekNumber: 11, dayName: "Dimanche", dayIndex: 6, sport: "Course",
      title: "Rappel allure compétition", details: "15min rappel allure compétition, veille de course.",
    });
    weeks.push(makeWeek(11, [eveReminder]));
    // S12 (finale) : aucune séance de Jour J.
    weeks.push(makeWeek(12, [makeSession({ weekNumber: 12, dayName: "Mardi", dayIndex: 1, details: "30min" })]));

    const plan = makePlan(weeks);
    const config = makeConfig({
      weeksAvailable: 12,
      planStartDate,
      raceGoals: [{ objective: "IRONMAN 70.3", priority: "A", raceDate }],
    });

    expect(isRaceDaySession(eveReminder)).toBe(false);

    const { plan: result } = postProcessParsedPlan(plan, config);
    const week11 = result.weeks.find((w) => w.weekNumber === 11)!;
    const week12 = result.weeks.find((w) => w.weekNumber === 12)!;

    // Le rappel légitime de S11 n'a PAS été volé/déplacé vers S12.
    expect(week11.sessions.some((s) => s.title === "Rappel allure compétition")).toBe(true);
    // S12 contient désormais un vrai Jour J, fabriqué indépendamment.
    expect(week12.sessions.some(isRaceDaySession)).toBe(true);
  });
});
