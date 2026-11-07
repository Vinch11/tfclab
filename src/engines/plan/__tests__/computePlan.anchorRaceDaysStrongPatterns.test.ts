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
  it("S33 : conserve l'épreuve nommée une seule fois et le rappel d'activation du même dimanche, y compris après réouverture", () => {
    const named = makeSession({ weekNumber: 33, dayIndex: 6, dayName: "Dimanche", sport: "Triathlon",
      title: "COURSE : Ironman test synthétique", details: "3,8 km natation, 180 km vélo, 42,2 km course. Nutrition revue par le coach." });
    const generic = makeSession({ weekNumber: 33, dayIndex: 6, dayName: "Dimanche", title: "🏁 COURSE OBJECTIF — IM", details: "Jour J — Ironman." });
    const activation = makeSession({ weekNumber: 33, dayIndex: 6, dayName: "Dimanche", title: "Activation neuromusculaire",
      details: "10min activation avant la compétition, mobilité légère." });
    const weeks = Array.from({ length: 32 }, (_, i) => makeWeek(i + 1, [makeSession({ weekNumber: i + 1 })]));
    weeks.push(makeWeek(33, [generic, named, activation]));
    const config = makeConfig({ objective: "IM", weeksAvailable: 33, planStartDate: "2026-01-05",
      raceGoals: [{ objective: "IM", priority: "A", raceDate: "2026-08-23" }] });
    let result = postProcessParsedPlan(makePlan(weeks), config).plan;
    for (let pass = 0; pass < 2; pass++) {
      const week = result.weeks.find(w => w.weekNumber === 33)!;
      expect(week.sessions.filter(isRaceDaySession)).toHaveLength(1);
      expect(week.sessions.find(isRaceDaySession)).toMatchObject({ title: named.title, details: named.details, dayIndex: 6, weekNumber: 33 });
      expect(week.sessions.find(s => s.title === activation.title)?.details).toBe(activation.details);
      expect(week.sessions).toHaveLength(2);
      expect(result.weeks.filter(w => w.sessions.some(isRaceDaySession)).map(w => w.weekNumber)).toEqual([33]);
      result = postProcessParsedPlan(result, config).plan;
    }
  });

  it("S33 multi-objectifs : un marathon futur hors calendrier ne détourne pas le rattachement de l'épreuve 10 km présente", () => {
    const race = makeSession({ weekNumber: 33, dayIndex: 6, dayName: "Dimanche", title: "COURSE : 10 km test synthétique",
      details: "10 km chronométrés. Allure marathon cible 4:00/km. Consigne propre à la course présente." });
    const weeks = Array.from({ length: 32 }, (_, i) => makeWeek(i + 1, [makeSession({ weekNumber: i + 1 })]));
    weeks.push(makeWeek(33, [race]));
    const config = makeConfig({ objective: "10K", weeksAvailable: 33, planStartDate: "2026-01-05",
      raceGoals: [
        { objective: "Marathon", priority: "A", raceDate: "2026-10-11" },
        { objective: "10K", priority: "B", raceDate: "2026-08-23" },
      ] });
    const result = postProcessParsedPlan(makePlan(weeks), config).plan;
    const event = result.weeks.find(w => w.weekNumber === 33)!.sessions.filter(isRaceDaySession);
    expect(event).toHaveLength(1);
    expect(event[0].title).toBe(race.title);
    // Existing micro-coherence rule must read the actual 10 km goal, not the future marathon.
    expect(event[0].details).not.toMatch(/allure marathon/i);
    expect(event[0].details).toContain("Consigne propre à la course présente");
  });

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
