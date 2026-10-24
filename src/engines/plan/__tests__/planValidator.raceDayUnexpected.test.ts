import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Correction ciblée "plan multiobjectifs réel" (2026-10-24), constat n°1 :
 * incident réel confirmé — un plan 70.3 (33 semaines) avec UN SEUL 10 km WSL
 * déclaré (présent à sa semaine réelle, S9) s'est vu attribuer un DEUXIÈME
 * 10 km inventé en S24. Aucun contrôle existant ne vérifiait cette direction :
 * `validateRaceDayPresence` ne vérifiait que la PRÉSENCE d'un Jour J aux
 * semaines attendues, jamais l'ABSENCE de Jour J ailleurs. Cette suite
 * verrouille le nouveau contrôle `race_day_unexpected`.
 */

function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1, weekTheme: "Test", phase: "build", dayName: "Lundi", dayIndex: 0,
    sport: "Course", title: "EF", details: "45min", isRest: false, ...overrides,
  };
}

function makeWeek(weekNumber: number, opts: { raceDay?: boolean } = {}): ParsedWeek {
  const sessions: ParsedSession[] = [
    makeSession({ weekNumber, sport: "Natation", details: "45min", dayName: "Lundi", dayIndex: 0 }),
    makeSession({ weekNumber, sport: "Vélo", details: "90min", dayName: "Mercredi", dayIndex: 2 }),
    makeSession({ weekNumber, sport: "Course", details: "50min", dayName: "Vendredi", dayIndex: 4 }),
  ];
  if (opts.raceDay) {
    sessions.push(makeSession({
      weekNumber, sport: "Course", title: "🏁 COURSE OBJECTIF", details: "Jour J — pacing et nutrition",
      dayName: "Dimanche", dayIndex: 6,
    }));
  }
  return { weekNumber, theme: "Build", phase: "build", sessions };
}

function makePlan(totalWeeks: number, raceWeeks: number[]): ParsedPlan {
  const weeks: ParsedWeek[] = [];
  for (let w = 1; w <= totalWeeks; w++) weeks.push(makeWeek(w, { raceDay: raceWeeks.includes(w) }));
  return { title: "Plan Test", phases: [], weeks, totalWeeks } as ParsedPlan;
}

function raceDayIssues(plan: ParsedPlan, raceWeekNumbers: number[] | undefined) {
  const vr = validatePlan(plan, "IRONMAN 70.3", undefined, raceWeekNumbers);
  return vr.issues.filter((i) => i.rule === "race_day_unexpected");
}

describe("validateRaceDayPresence — course non déclarée (race_day_unexpected)", () => {
  it("[TEST OBLIGATOIRE] course déclarée en S5 et S10, course supplémentaire inventée en S7 → erreur bloquante", () => {
    const plan = makePlan(10, [5, 7, 10]); // S7 = course NON déclarée côté raceWeekNumbers
    const issues = raceDayIssues(plan, [5, 10]);
    expect(issues).toHaveLength(1);
    expect(issues[0].week).toBe(7);
    expect(issues[0].severity).toBe("error");
    expect(issues[0].message).toContain("non déclarée");
  });

  it("courses strictement aux semaines déclarées → aucune alerte", () => {
    const plan = makePlan(10, [5, 10]);
    expect(raceDayIssues(plan, [5, 10])).toHaveLength(0);
  });

  it("raceWeekNumbers non fourni (profil sans raceDate, ex. QA synthétique) → contrôle inactif, jamais de faux positif spéculatif", () => {
    // Une course "supplémentaire" en S7 ne peut pas être qualifiée d'inattendue
    // sans liste fiable de courses déclarées — le contrôle s'abstient plutôt
    // que de spéculer (cf. mission : pas de correction spéculative).
    const plan = makePlan(10, [7, 10]);
    expect(raceDayIssues(plan, undefined)).toHaveLength(0);
  });

  it("raceWeekNumbers vide → contrôle inactif (même abstention que undefined)", () => {
    const plan = makePlan(10, [7, 10]);
    expect(raceDayIssues(plan, [])).toHaveLength(0);
  });
});
