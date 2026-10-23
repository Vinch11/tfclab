import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";
import type { ClassifiableRaceGoal } from "@/lib/plan/multiObjectiveClassification";

/**
 * Bug réel démontré (audit "plan 70.3 sans natation", 2026-10-23) : un plan
 * dont l'objectif principal déclaré est "703" a été généré avec une
 * compétition finale "10 km" au lieu du 70.3. Cause tracée :
 * `classifyMultiObjectiveGoalsClient` (multiObjectiveClassification.ts)
 * classe les objectifs datés PAR DATE SEULE et désigne INCONDITIONNELLEMENT
 * le dernier objectif daté comme pic final (`isFullPeak: true`) — si un
 * jalon secondaire a une date postérieure à l'objectif principal, il devient
 * le pic final, d'où la compétition finale erronée côté génération.
 *
 * Cette suite verrouille `validateFinalObjectiveMatchesMainGoal`, le nouveau
 * contrôle bloquant (severity "error", rule "final_objective_mismatch",
 * non-dérogeable — voir criticalBlockingGate.test.ts) qui détecte cette
 * substitution en réutilisant la MÊME fonction de classification sur les
 * MÊMES `raceGoals` déjà transmis à `validatePlan`.
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

function makeMinimalPlan(): ParsedPlan {
  const week: ParsedWeek = {
    weekNumber: 1,
    theme: "Test",
    phase: "build",
    sessions: [makeSession()],
  };
  return { title: "Plan Test", phases: [], weeks: [week], totalWeeks: 1 } as ParsedPlan;
}

function mismatchIssues(objective: string, raceGoals: ClassifiableRaceGoal[], plan: ParsedPlan = makeMinimalPlan()) {
  const vr = validatePlan(
    plan, objective,
    undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
    undefined, undefined, undefined, undefined, undefined,
    raceGoals,
  );
  return vr.issues.filter((i) => i.rule === "final_objective_mismatch");
}

describe("validateFinalObjectiveMatchesMainGoal — régression audit plan 70.3 sans natation", () => {
  it("[TEST OBLIGATOIRE] 70.3 avec compétition finale 10 km à la place du 70.3 → erreur bloquante", () => {
    const raceGoals: ClassifiableRaceGoal[] = [
      { objective: "703", raceDate: "2027-06-15", raceName: "Ironman 70.3 Nice", priority: "A" },
      { objective: "10K", raceDate: "2027-09-20", raceName: "Corrida WSL 10 km", priority: "B" },
    ];
    const issues = mismatchIssues("703", raceGoals);
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe("error");
    expect(issues[0].message).toContain("703");
    expect(issues[0].message).toContain("Corrida WSL 10 km");
  });

  it("[TEST OBLIGATOIRE] plan 10 km valide (objectif = pic final) → aucune erreur", () => {
    const raceGoals: ClassifiableRaceGoal[] = [
      { objective: "10K", raceDate: "2027-05-10", raceName: "Corrida locale", priority: "A" },
    ];
    expect(mismatchIssues("10K", raceGoals).length).toBe(0);
  });

  it("objectif principal = pic final calculé → aucune erreur, même avec plusieurs jalons", () => {
    const raceGoals: ClassifiableRaceGoal[] = [
      { objective: "10K", raceDate: "2027-03-01", raceName: "10K préparation", priority: "B" },
      { objective: "703", raceDate: "2027-06-15", raceName: "Ironman 70.3 Nice", priority: "A" },
    ];
    expect(mismatchIssues("703", raceGoals).length).toBe(0);
  });

  it("un seul objectif (le principal, sans jalon secondaire) → contrôle inactif (raceGoals.length < 2)", () => {
    const raceGoals: ClassifiableRaceGoal[] = [
      { objective: "703", raceDate: "2027-06-15", priority: "A" },
    ];
    expect(mismatchIssues("703", raceGoals).length).toBe(0);
  });

  it("raceGoals omis → contrôle inactif (comportement inchangé pour tout appelant qui ne le fournit pas encore)", () => {
    const vr = validatePlan(makeMinimalPlan(), "703");
    expect(vr.issues.filter((i) => i.rule === "final_objective_mismatch").length).toBe(0);
  });

  it("jalon secondaire sans date → n'entre jamais dans le calcul du pic final (non classé 'dated'), aucune erreur", () => {
    const raceGoals: ClassifiableRaceGoal[] = [
      { objective: "703", raceDate: "2027-06-15", priority: "A" },
      { objective: "10K", priority: "B" }, // pas de raceDate
    ];
    expect(mismatchIssues("703", raceGoals).length).toBe(0);
  });

  it("plafonne le score global à 69 malgré de bons sous-scores ailleurs (CRITICAL_SCORE_CEILING)", () => {
    const raceGoals: ClassifiableRaceGoal[] = [
      { objective: "703", raceDate: "2027-06-15", priority: "A" },
      { objective: "10K", raceDate: "2027-09-20", priority: "B" },
    ];
    const vr = validatePlan(
      makeMinimalPlan(), "703",
      undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined,
      raceGoals,
    );
    expect(vr.score).toBeLessThanOrEqual(69);
  });

  it("variantes d'orthographe de l'objectif ('70.3' vs '703') reconnues comme identiques (normalizeObjectiveKey) — aucune fausse alerte", () => {
    const raceGoals: ClassifiableRaceGoal[] = [
      { objective: "70.3", raceDate: "2027-06-15", priority: "A" },
    ];
    // Même avec un second jalon antérieur (donc pas le pic final), le pic
    // final reste "70.3" lui-même : pas de divergence.
    const raceGoalsWithEarlierMilestone: ClassifiableRaceGoal[] = [
      { objective: "10K", raceDate: "2027-03-01", priority: "B" },
      { objective: "70.3", raceDate: "2027-06-15", priority: "A" },
    ];
    expect(mismatchIssues("703", raceGoals).length).toBe(0);
    expect(mismatchIssues("703", raceGoalsWithEarlierMilestone).length).toBe(0);
  });
});
