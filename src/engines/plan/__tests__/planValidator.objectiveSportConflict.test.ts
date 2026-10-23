import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Bug réel (B-5K-BEGINNER, Pilot Cockpit, 2026-10-13) : un plan "premier 5 km
 * dans 12 semaines" a été généré avec 0 séance de course à pied (35 vélo, 12
 * renfo, 1 récupération) et a noté 69/100 sans AUCUN signal bloquant —
 * `validateSportRatio` reste muet dans ce cas (son garde-fou `primaryTotal
 * < 10` ni ses déviations de ratio ne couvrent "0 séance tout court" d'un
 * objectif mono-discipline), et aucune autre règle ne reliait objectif↔
 * contenu réel. Cette suite verrouille `validateObjectiveSportCoherence`,
 * le nouveau contrôle bloquant (severity "error", hors score pondéré —
 * CRITICAL_SCORE_CEILING s'applique via allIssues).
 *
 * Audit "plan 70.3 sans natation" (2026-10-23) : cas réel démontré, plan de
 * 32 semaines objectif 70.3 généré avec 0 natation, 7 vélo, 163 course. Le
 * contrôle ci-dessus ne couvrait QUE les objectifs mono-discipline — les
 * objectifs multi-discipline (IM/703/Sprint/Olympic) en sortaient
 * immédiatement, sans aucun filet de présence. Les tests marqués
 * [CORRECTIF audit 70.3] verrouillent la nouvelle branche multi-sport :
 * absence totale d'une discipline dont SPORT_RATIO_TARGETS déclare une
 * borne basse > 0, sauf bannissement explicite du coach.
 */

function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Test",
    phase: "build",
    dayName: "Mardi",
    dayIndex: 1,
    sport: "Vélo",
    title: "Séance vélo",
    details: "",
    isRest: false,
    ...overrides,
  };
}

/** Plan de N semaines, 3 séances vélo par semaine, 0 séance de course. */
function makeAllBikePlan(weeks = 3): ParsedPlan {
  const parsedWeeks: ParsedWeek[] = Array.from({ length: weeks }, (_, i) => ({
    weekNumber: i + 1,
    theme: "Test",
    phase: "build",
    sessions: [
      makeSession({ weekNumber: i + 1, dayName: "Lundi", dayIndex: 0 }),
      makeSession({ weekNumber: i + 1, dayName: "Mercredi", dayIndex: 2 }),
      makeSession({ weekNumber: i + 1, dayName: "Vendredi", dayIndex: 4 }),
    ],
  }));
  return { title: "Plan Test", phases: [], weeks: parsedWeeks, totalWeeks: weeks } as ParsedPlan;
}

function conflictIssues(plan: ParsedPlan, objective: string, constraintsText?: string) {
  const vr = validatePlan(
    plan, objective, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
    undefined, constraintsText,
  );
  return vr.issues.filter((i) => i.rule === "objective_sport_conflict");
}

describe("validateObjectiveSportCoherence — régression B-5K-BEGINNER", () => {
  it("signale une erreur bloquante pour un objectif 5K sans aucune séance de course, sans contrainte le justifiant", () => {
    const issues = conflictIssues(makeAllBikePlan(), "5 KM");
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe("error");
    expect(issues[0].message).toContain("Course");
    expect(issues[0].message).not.toContain("interdit");
  });

  it("distingue le cas où la course est explicitement bannie par une contrainte coach réelle", () => {
    const issues = conflictIssues(makeAllBikePlan(), "5 KM", "aucune course à pied");
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe("error");
    expect(issues[0].message).toContain("incompatibilité objectif/contraintes");
  });

  it("plafonne le score global à 69 malgré de bons sous-scores ailleurs (CRITICAL_SCORE_CEILING)", () => {
    const vr = validatePlan(
      makeAllBikePlan(), "5 KM", undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined,
    );
    expect(vr.score).toBeLessThanOrEqual(69);
  });

  it("ne signale rien quand l'objectif de course est bien respecté (séances de course présentes)", () => {
    const week: ParsedWeek = {
      weekNumber: 1,
      theme: "Test",
      phase: "build",
      sessions: [
        makeSession({ sport: "Course", dayName: "Lundi", dayIndex: 0 }),
        makeSession({ sport: "Course", dayName: "Mercredi", dayIndex: 2 }),
        makeSession({ sport: "Course", dayName: "Vendredi", dayIndex: 4 }),
      ],
    };
    const plan: ParsedPlan = { title: "Plan Test", phases: [], weeks: [week], totalWeeks: 1 } as ParsedPlan;
    expect(conflictIssues(plan, "5 KM").length).toBe(0);
  });

  it("[CORRECTIF audit 70.3] signale une erreur bloquante pour un objectif multi-discipline (703) sans natation ni course (régression : retournait 0 avant le correctif)", () => {
    const issues = conflictIssues(makeAllBikePlan(), "703");
    expect(issues.length).toBe(2);
    expect(issues.every((i) => i.severity === "error")).toBe(true);
    const messages = issues.map((i) => i.message);
    expect(messages.some((m) => m.includes("Natation"))).toBe(true);
    expect(messages.some((m) => m.includes("Course"))).toBe(true);
    expect(messages.every((m) => !m.includes("Vélo"))).toBe(true); // vélo présent, pas manquant
  });

  it("[CORRECTIF audit 70.3] signale une erreur bloquante pour un objectif multi-discipline (IM) sans natation ni course", () => {
    const issues = conflictIssues(makeAllBikePlan(), "Ironman");
    expect(issues.length).toBe(2);
    expect(issues.every((i) => i.severity === "error")).toBe(true);
  });

  it("[CORRECTIF audit 70.3] cas réel reproduit : plan 70.3 multi-semaines avec 0 natation, vélo minoritaire, course majoritaire → erreur bloquante sur la natation seule (vélo et course présents, même déséquilibrés)", () => {
    const weeks: ParsedWeek[] = Array.from({ length: 4 }, (_, i) => ({
      weekNumber: i + 1,
      theme: "Test",
      phase: "build",
      sessions: [
        makeSession({ weekNumber: i + 1, sport: "Vélo", dayName: "Lundi", dayIndex: 0 }),
        makeSession({ weekNumber: i + 1, sport: "Course", dayName: "Mardi", dayIndex: 1 }),
        makeSession({ weekNumber: i + 1, sport: "Course", dayName: "Mercredi", dayIndex: 2 }),
        makeSession({ weekNumber: i + 1, sport: "Course", dayName: "Jeudi", dayIndex: 3 }),
        makeSession({ weekNumber: i + 1, sport: "Course", dayName: "Vendredi", dayIndex: 4 }),
        makeSession({ weekNumber: i + 1, sport: "Course", dayName: "Samedi", dayIndex: 5 }),
      ],
    }));
    const plan: ParsedPlan = { title: "Plan 70.3 sans natation", phases: [], weeks, totalWeeks: 4 } as ParsedPlan;
    const issues = conflictIssues(plan, "703");
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe("error");
    expect(issues[0].message).toContain("Natation");
  });

  it("respecte le bannissement explicite d'une discipline dans un objectif multi-discipline (natation interdite par contrainte coach, 703)", () => {
    const issues = conflictIssues(makeAllBikePlan(), "703", "natation interdite, contre-indication médicale");
    // Vélo présent (non manquant). Course absente et NON bannie → doit rester signalée.
    expect(issues.length).toBe(1);
    expect(issues[0].message).toContain("Course");
    expect(issues.some((i) => i.message.includes("Natation"))).toBe(false);
  });

  it("ne signale rien pour un objectif multi-discipline quand les 3 disciplines sont présentes (même déséquilibrées) — couvert par validateSportRatio, pas par ce contrôle de présence", () => {
    const week: ParsedWeek = {
      weekNumber: 1,
      theme: "Test",
      phase: "build",
      sessions: [
        makeSession({ sport: "Natation", dayName: "Lundi", dayIndex: 0 }),
        makeSession({ sport: "Vélo", dayName: "Mardi", dayIndex: 1 }),
        makeSession({ sport: "Vélo", dayName: "Mercredi", dayIndex: 2 }),
        makeSession({ sport: "Course", dayName: "Jeudi", dayIndex: 3 }),
        makeSession({ sport: "Course", dayName: "Vendredi", dayIndex: 4 }),
        makeSession({ sport: "Course", dayName: "Samedi", dayIndex: 5 }),
      ],
    };
    const plan: ParsedPlan = { title: "Plan Test", phases: [], weeks: [week], totalWeeks: 1 } as ParsedPlan;
    expect(conflictIssues(plan, "703").length).toBe(0);
  });

  it("n'applique pas ce contrôle à un plan entièrement vide (couvert par d'autres règles)", () => {
    const week: ParsedWeek = {
      weekNumber: 1,
      theme: "Test",
      phase: "build",
      sessions: [makeSession({ sport: "Repos", isRest: true, dayName: "Lundi", dayIndex: 0 })],
    };
    const plan: ParsedPlan = { title: "Plan Test", phases: [], weeks: [week], totalWeeks: 1 } as ParsedPlan;
    expect(conflictIssues(plan, "5 KM").length).toBe(0);
  });

  it("reconnaît aussi les variantes '5 km'/'5km'/'5k' de l'objectif (régression normalizeObjectiveKey)", () => {
    expect(conflictIssues(makeAllBikePlan(), "5 km").length).toBe(1);
    expect(conflictIssues(makeAllBikePlan(), "5km").length).toBe(1);
    expect(conflictIssues(makeAllBikePlan(), "5k").length).toBe(1);
    expect(conflictIssues(makeAllBikePlan(), "Premier 5 km dans 12 semaines").length).toBe(1);
  });
});
