import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";
import type { ClassifiableRaceGoal } from "@/lib/plan/multiObjectiveClassification";

/**
 * Bug réel démontré (audit "plan 70.3 sans natation", 2026-10-23) : un plan
 * dont l'objectif principal déclaré est "703" a été généré avec une
 * compétition finale "10 km" au lieu du 70.3. Cause tracée :
 * `classifyMultiObjectiveGoalsClient` (multiObjectiveClassification.ts)
 * classait les objectifs datés PAR DATE SEULE et désignait
 * INCONDITIONNELLEMENT le dernier objectif daté comme pic final
 * (`isFullPeak: true`) — si un jalon secondaire avait une date postérieure
 * à l'objectif principal, il devenait le pic final, d'où la compétition
 * finale erronée côté génération.
 *
 * Correction Sprint 1 ("hiérarchie multiobjectifs", GRAND SPRINT P0,
 * 2026-10-23) : cette cause racine est maintenant CORRIGÉE DANS LA
 * CLASSIFICATION ELLE-MÊME (`classifyMultiObjectiveGoalsClient`/
 * `classifyMultiObjectiveGoals`, cf. multiObjectiveClassification.ts) —
 * un objectif non-éligible à un pic indépendant (10K/5K/Semi/Sprint/
 * Olympic) ne devient plus jamais `isFullPeak: true` simplement parce
 * qu'il est daté en dernier. Le scénario du bug réel (703 principal + 10K
 * daté après) ne produit donc plus de divergence du tout : le 10K reste
 * correctement un jalon, le 703 reste le pic final — AUCUNE erreur
 * `final_objective_mismatch` n'est plus nécessaire pour ce cas précis
 * (corrigé à la source, pas seulement détecté après coup).
 *
 * Cette suite verrouille `validateFinalObjectiveMatchesMainGoal`
 * (severity "error", rule "final_objective_mismatch", non-dérogeable —
 * voir criticalBlockingGate.test.ts) qui reste un filet de sécurité en
 * profondeur pour les cas RÉSIDUELS où la classification (même corrigée)
 * et l'objectif déclaré divergent malgré tout — typiquement une
 * incohérence de données (l'objectif principal n'a aucune entrée
 * correspondante dans `raceGoals`), pas une classification erronée.
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
  it("[CORRIGÉ À LA SOURCE, Sprint 1] 703 principal + 10K daté après : le 10K reste un jalon, AUCUNE erreur — la classification elle-même ne promeut plus le 10K en pic final", () => {
    const raceGoals: ClassifiableRaceGoal[] = [
      { objective: "703", raceDate: "2027-06-15", raceName: "Ironman 70.3 Nice", priority: "A" },
      { objective: "10K", raceDate: "2027-09-20", raceName: "Corrida WSL 10 km", priority: "B" },
    ];
    expect(mismatchIssues("703", raceGoals).length).toBe(0);
  });

  it("[TEST OBLIGATOIRE] 70.3 avec compétition finale 10 km : incohérence de données résiduelle (le 703 principal n'a aucune entrée dans raceGoals) → erreur bloquante", () => {
    // Scénario résiduel que le fix Sprint 1 NE PEUT PAS corriger : il
    // corrige la CLASSIFICATION (quel objectif daté devient le pic final
    // parmi ceux présents), pas une incohérence de données où l'objectif
    // principal déclaré n'a tout simplement aucune entrée correspondante
    // dans `raceGoals` (ex. date/nom de course corrompue ou mal associée) —
    // ici, seuls deux jalons non-éligibles (10K, 5K) sont présents, aucun
    // n'étant le 703 déclaré.
    const raceGoals: ClassifiableRaceGoal[] = [
      { objective: "5K", raceDate: "2027-04-10", raceName: "5K de printemps", priority: "C" },
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
