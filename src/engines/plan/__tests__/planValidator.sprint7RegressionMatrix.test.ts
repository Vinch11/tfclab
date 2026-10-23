import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";
import type { ClassifiableRaceGoal } from "@/lib/plan/multiObjectiveClassification";

/**
 * GRAND SPRINT P0, Sprint 7 ("tests de régression multisport et route"),
 * 2026-10-23 : 10 scénarios déterministes représentatifs, chacun vérifiant
 * des invariants de validité réels (jamais la simple absence d'exception).
 * Consolide — sans dupliquer leur logique de test unitaire propre — les
 * correctifs des sprints 1-6 sur des scénarios complets représentatifs
 * d'un usage réel du moteur.
 */

function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1, weekTheme: "Test", phase: "build", dayName: "Lundi", dayIndex: 0,
    sport: "Course", title: "EF", details: "45min", isRest: false, ...overrides,
  };
}

function triWeek(weekNumber: number, natCount: number, veloCount: number, courseCount: number, theme = "Build", phase = "build"): ParsedWeek {
  const sessions: ParsedSession[] = [];
  const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  let d = 0;
  for (let i = 0; i < natCount; i++) sessions.push(makeSession({ weekNumber, sport: "Natation", details: "40min", dayName: days[d % 7], dayIndex: d++ % 7 }));
  for (let i = 0; i < veloCount; i++) sessions.push(makeSession({ weekNumber, sport: "Vélo", details: "90min", dayName: days[d % 7], dayIndex: d++ % 7 }));
  for (let i = 0; i < courseCount; i++) sessions.push(makeSession({ weekNumber, sport: "Course", details: "50min", dayName: days[d % 7], dayIndex: d++ % 7 }));
  return { weekNumber, theme, phase, sessions };
}

function makePlan(weeks: ParsedWeek[], title = "Plan Test"): ParsedPlan {
  return { title, phases: [], weeks, totalWeeks: weeks.length } as ParsedPlan;
}

function vp(
  plan: ParsedPlan, objective: string, constraintsText?: string,
  raceGoals?: ClassifiableRaceGoal[], planStartDate?: string, strengthSessionsPerWeek?: number,
) {
  return validatePlan(
    plan, objective,
    undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
    undefined, constraintsText, undefined, undefined, undefined,
    raceGoals, planStartDate, undefined, undefined, strengthSessionsPerWeek,
  );
}

describe("Sprint 7 — matrice de régression multisport et route (10 scénarios)", () => {
  it("1. 70.3 avec 10K intermédiaire (jalon avant l'objectif A) → aucune fausse alerte, natation/vélo maintenus", () => {
    const weeks = Array.from({ length: 16 }, (_, i) => triWeek(i + 1, 2, 3, 3));
    const plan = makePlan(weeks, "Plan 70.3 avec 10K prépa");
    const raceGoals: ClassifiableRaceGoal[] = [
      { objective: "10K", raceDate: "2027-02-01", raceName: "10K prépa", priority: "B" },
      { objective: "703", raceDate: "2027-04-19", raceName: "Ironman 70.3", priority: "A" },
    ];
    const vr = vp(plan, "703", undefined, raceGoals, "2027-01-04");
    expect(vr.issues.filter(i => i.rule === "objective_sport_conflict")).toHaveLength(0);
    expect(vr.issues.filter(i => i.rule === "final_objective_mismatch")).toHaveLength(0);
  });

  it("2. 70.3 avec 10K secondaire POSTÉRIEUR à l'objectif A → corrigé à la source : le 10K reste un jalon, aucune substitution d'objectif final", () => {
    const weeks = Array.from({ length: 16 }, (_, i) => triWeek(i + 1, 2, 3, 3));
    const plan = makePlan(weeks, "Plan 70.3, 10K daté après");
    const raceGoals: ClassifiableRaceGoal[] = [
      { objective: "703", raceDate: "2027-02-01", raceName: "Ironman 70.3", priority: "A" },
      { objective: "10K", raceDate: "2027-04-19", raceName: "Corrida de clôture", priority: "B" },
    ];
    const vr = vp(plan, "703", undefined, raceGoals, "2027-01-04");
    // Le contenu réel (natation/vélo présents) + la classification corrigée
    // (le 10K, daté après, ne devient PAS le pic final car inéligible à un
    // pic indépendant) : aucune alerte, contrairement au cas réel audité.
    expect(vr.issues.filter(i => i.rule === "objective_sport_conflict")).toHaveLength(0);
    expect(vr.issues.filter(i => i.rule === "final_objective_mismatch")).toHaveLength(0);

    // Filet de sécurité : si le contenu réel, lui, a bien 0 natation (anomalie
    // de génération indépendante de la classification), le garde-fou 1 le
    // détecte toujours — la correction de hiérarchie ne masque jamais un vrai défaut de contenu.
    const weeksNoSwim = Array.from({ length: 16 }, (_, i) => triWeek(i + 1, 0, 3, 5));
    const planNoSwim = makePlan(weeksNoSwim, "Plan 70.3, 10K daté après, 0 natation");
    const vrNoSwim = vp(planNoSwim, "703", undefined, raceGoals, "2027-01-04");
    expect(vrNoSwim.issues.some(i => i.rule === "objective_sport_conflict" && i.severity === "error")).toBe(true);
  });

  it("3. Ironman avec marathon préparatoire (double pic légitime, écart suffisant) → aucune fausse alerte", () => {
    const weeks = Array.from({ length: 30 }, (_, i) => triWeek(i + 1, 2, 3, 4));
    const plan = makePlan(weeks, "Plan Marathon + Ironman");
    const raceGoals: ClassifiableRaceGoal[] = [
      { objective: "Marathon", raceDate: "2027-03-01", raceName: "Marathon de Paris", priority: "B" },
      { objective: "IM", raceDate: "2027-09-05", raceName: "Ironman Nice", priority: "A" },
    ];
    const vr = vp(plan, "IM", undefined, raceGoals, "2027-01-04");
    expect(vr.issues.filter(i => i.rule === "final_objective_mismatch")).toHaveLength(0);
    expect(vr.issues.filter(i => i.rule === "objective_sport_conflict")).toHaveLength(0);
  });

  it("4. Marathon avec semi-marathon intermédiaire (jalon non-éligible, quel que soit l'écart) → aucune fausse alerte", () => {
    const weeks = Array.from({ length: 16 }, (_, i) => triWeek(i + 1, 0, 0, 5));
    const plan = makePlan(weeks, "Plan Marathon + Semi prépa");
    const raceGoals: ClassifiableRaceGoal[] = [
      { objective: "Semi", raceDate: "2027-02-15", raceName: "Semi de prépa", priority: "B" },
      { objective: "Marathon", raceDate: "2027-04-25", raceName: "Marathon de Paris", priority: "A" },
    ];
    const vr = vp(plan, "Marathon", undefined, raceGoals, "2027-01-04");
    expect(vr.issues.filter(i => i.rule === "final_objective_mismatch")).toHaveLength(0);
  });

  it("5. 10 km avec compétition 5 km préparatoire (aucun des deux éligible à un pic indépendant) → le 10K (objectif A) reste le pic final", () => {
    const weeks = Array.from({ length: 10 }, (_, i) => triWeek(i + 1, 0, 0, 4));
    const plan = makePlan(weeks, "Plan 10K + 5K prépa");
    const raceGoals: ClassifiableRaceGoal[] = [
      { objective: "5K", raceDate: "2027-01-25", raceName: "5K de prépa", priority: "B" },
      { objective: "10K", raceDate: "2027-03-08", raceName: "10K objectif", priority: "A" },
    ];
    const vr = vp(plan, "10K", undefined, raceGoals, "2027-01-04");
    expect(vr.issues.filter(i => i.rule === "final_objective_mismatch")).toHaveLength(0);
  });

  it("6. Plan débutant à faible fréquence (finisher, 2-3 séances/sem) → pas de sur-signalement artificiel", () => {
    const weeks = Array.from({ length: 8 }, (_, i) => triWeek(i + 1, 0, 0, 2));
    const plan = makePlan(weeks, "Plan débutant 5K");
    const vr = validatePlan(
      plan, "5K", undefined, undefined, undefined, undefined, undefined, undefined,
      { sessionsPerWeek: 2 }, undefined, "finisher",
    );
    // Densité conforme à la cible déclarée (2/sem) : pas d'alerte de densité.
    expect(vr.issues.filter(i => i.rule === "session_density")).toHaveLength(0);
    // Objectif mono-discipline avec du contenu réel : pas de conflit objectif/contenu.
    expect(vr.issues.filter(i => i.rule === "objective_sport_conflict")).toHaveLength(0);
  });

  it("7. Plan avec semaines de décharge → les contrôles basés sur le volume excluent correctement ces semaines de la comparaison", () => {
    const weeks: ParsedWeek[] = [
      triWeek(1, 0, 0, 5), triWeek(2, 0, 0, 5), triWeek(3, 0, 0, 5),
      triWeek(4, 0, 0, 2, "Décharge", "base"), // vraie semaine de décharge, volume nettement réduit
      triWeek(5, 0, 0, 5), triWeek(6, 0, 0, 5),
    ];
    const plan = makePlan(weeks, "Plan avec décharge S4");
    const vr = vp(plan, "Marathon");
    // La semaine de décharge, à volume nettement plus bas, ne doit jamais
    // être signalée comme une anomalie de "chute brutale" ou de progression —
    // elle est hors périmètre de validateProgression (isContentOrScheduleDeload).
    expect(vr.issues.some(i => i.rule === "progression" && i.week === 4)).toBe(false);
  });

  it("8. Plan avec restriction PARTIELLE de discipline ('en eau froide') → l'absence réelle de la discipline reste signalée (pas un faux bannissement total)", () => {
    const weeks = Array.from({ length: 10 }, (_, i) => triWeek(i + 1, 0, 3, 5));
    const plan = makePlan(weeks, "Plan 703, natation réellement absente malgré restriction partielle");
    const vr = vp(plan, "703", "natation interdite en eau froide uniquement");
    const conflictIssues = vr.issues.filter(i => i.rule === "objective_sport_conflict");
    expect(conflictIssues.some(i => i.message.includes("Natation"))).toBe(true);
    // Le message ne doit pas prétendre à une "incompatibilité objectif/contraintes"
    // (réservée aux VRAIS bannissements totaux, cf. Sprint 2) pour cette ambiguïté.
    expect(conflictIssues.some(i => i.message.includes("incompatibilité objectif/contraintes"))).toBe(false);
  });

  it("9. Plan avec demande explicite de renforcement (2/sem) non respectée → signalé ; respectée → aucune alerte", () => {
    const weeksNoStrength = Array.from({ length: 6 }, (_, i) => triWeek(i + 1, 0, 0, 4));
    const vrMissing = vp(makePlan(weeksNoStrength, "Plan sans renfo"), "Marathon", undefined, undefined, undefined, 2);
    expect(vrMissing.issues.some(i => i.rule === "strength_sessions_requested" && i.severity === "error")).toBe(true);

    const weeksWithStrength: ParsedWeek[] = Array.from({ length: 6 }, (_, i) => {
      const w = triWeek(i + 1, 0, 0, 4);
      w.sessions.push(
        makeSession({ weekNumber: i + 1, sport: "Renfo", details: "30min", dayName: "Samedi", dayIndex: 5 }),
        makeSession({ weekNumber: i + 1, sport: "Renfo", details: "30min", dayName: "Dimanche", dayIndex: 6 }),
      );
      return w;
    });
    const vrOk = vp(makePlan(weeksWithStrength, "Plan avec renfo"), "Marathon", undefined, undefined, undefined, 2);
    expect(vrOk.issues.filter(i => i.rule === "strength_sessions_requested")).toHaveLength(0);
  });

  it("10. Plan avec objectif final mal positionné (incohérence de données : l'objectif principal n'a aucune entrée dans raceGoals) → refus bloquant, non-dérogeable", () => {
    const weeks = Array.from({ length: 16 }, (_, i) => triWeek(i + 1, 2, 3, 3));
    const plan = makePlan(weeks, "Plan 703 mal positionné");
    const raceGoals: ClassifiableRaceGoal[] = [
      { objective: "10K", raceDate: "2027-02-01", raceName: "10K isolé", priority: "B" },
      { objective: "5K", raceDate: "2027-04-19", raceName: "5K isolé", priority: "C" },
    ];
    const vr = vp(plan, "703", undefined, raceGoals, "2027-01-04");
    const mismatch = vr.issues.filter(i => i.rule === "final_objective_mismatch");
    expect(mismatch.length).toBe(1);
    expect(mismatch[0].severity).toBe("error");
    expect(vr.score).toBeLessThanOrEqual(69);
  });
});
