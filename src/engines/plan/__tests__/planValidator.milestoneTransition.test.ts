import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";
import type { ClassifiableRaceGoal } from "@/lib/plan/multiObjectiveClassification";

/**
 * Correction sprint qualité Marathon/Ironman (oct. 2026), #B (demande coach
 * explicite) : validation APRÈS génération des semaines qui ENTOURENT un
 * jalon run-only (10K) dans un plan dont l'objectif FINAL est triathlon
 * (70.3) — maintien natation/vélo, récupération réelle après le jalon,
 * continuité de la reprise vers l'objectif final. Signalé explicitement,
 * jamais corrigé.
 *
 * Plan de référence (20 semaines) : 10K le 2026-02-09 → S6 ; 70.3 le
 * 2026-05-20 → S20 (dernière semaine, pic complet). `planStartDate`
 * 2026-01-05. S4-S5 = préparation du jalon, S6 = jour du 10K, S7 =
 * récupération, S8-S9 = reprise vers le 70.3.
 */
function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1, weekTheme: "Test", phase: "base", dayName: "Dimanche", dayIndex: 6,
    sport: "Course", title: "Séance", details: "", isRest: false, ...overrides,
  };
}
function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[], theme = "Standard", phase = "base"): ParsedWeek {
  return {
    weekNumber, theme, phase,
    sessions: sessions.map((s, i) => makeSession({
      weekNumber, weekTheme: theme,
      dayIndex: i % 7, dayName: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"][i % 7],
      ...s,
    })),
  };
}
function makePlan(weeks: ParsedWeek[]): ParsedPlan {
  return { title: "Plan TFCL™ — 10K→70.3 Test Athlete", phases: [], weeks, totalWeeks: weeks.length };
}
function sportSessions(sport: string, totalMin: number): Partial<ParsedSession>[] {
  if (totalMin <= 0) return [];
  if (totalMin <= 200) return [{ sport, title: `${sport} A`, details: `${totalMin}min` }];
  const half = Math.ceil(totalMin / 2);
  return [{ sport, title: `${sport} A`, details: `${half}min` }, { sport, title: `${sport} B`, details: `${totalMin - half}min` }];
}
function triWeek(weekNumber: number, natMin: number, veloMin: number, courseMin: number): ParsedWeek {
  return makeWeek(weekNumber, [
    ...sportSessions("Natation", natMin),
    ...sportSessions("Vélo", veloMin),
    ...sportSessions("Course", courseMin),
  ], "Build");
}
function tenKRaceWeek(weekNumber: number): ParsedWeek {
  return makeWeek(weekNumber, [
    { sport: "Course", title: "🏁 COURSE OBJECTIF", details: "Jour J — 10K" },
  ], "Jalon 10K");
}
function ironman703RaceWeek(weekNumber: number): ParsedWeek {
  return makeWeek(weekNumber, [
    { sport: "Course", title: "🏁 COURSE OBJECTIF", details: "Jour J — 70.3" },
  ], "Jour J");
}

const PLAN_START_DATE = "2026-01-05";
const TENK_RACE_DATE = "2026-02-09"; // → S6
const RACE_703_DATE = "2026-05-20"; // → S20 (dernière semaine)
const RACE_GOALS_10K_TO_703: ClassifiableRaceGoal[] = [
  { objective: "10K", raceDate: TENK_RACE_DATE, priority: "B" },
  { objective: "703", raceDate: RACE_703_DATE, priority: "A" },
];

interface PlanOpts {
  /** S4-S5 (préparation du jalon) incluent-elles natation+vélo ? */
  prepHasSwimBike: boolean;
  /** Multiplicateur de volume de S7 (récupération) vs S4-S5 — <1 = vraie récupération. */
  recoveryFactor: number;
  /** Multiplicateur de volume de S8-S9 (reprise) vs S7 (récupération) — >1 = reprise visible. */
  resumeFactor: number;
}

function buildPlan(opts: PlanOpts): ParsedPlan {
  const prep = opts.prepHasSwimBike
    ? { nat: 40, velo: 150, course: 60 }
    : { nat: 0, velo: 0, course: 120 }; // mini-taper 10K run-only (comportement générique actuel)
  const prepTotal = prep.nat + prep.velo + prep.course;
  const recoveryTotal = Math.round(prepTotal * opts.recoveryFactor);
  const resumeTotal = Math.round(recoveryTotal * opts.resumeFactor);

  const weeks: ParsedWeek[] = [
    triWeek(1, 60, 240, 90),
    triWeek(2, 62, 245, 92),
    triWeek(3, 65, 250, 95),
    triWeek(4, prep.nat, prep.velo, prep.course), // préparation jalon (S-2)
    triWeek(5, prep.nat, prep.velo, prep.course), // préparation jalon (S-1)
    tenKRaceWeek(6), // jour du 10K
    triWeek(7, 0, 0, recoveryTotal), // récupération post-jalon (course légère seulement, réaliste au lendemain d'un 10K)
    triWeek(8, 30, resumeTotal * 0.5, resumeTotal * 0.3), // reprise
    triWeek(9, 35, resumeTotal * 0.55, resumeTotal * 0.35), // reprise
    ...Array.from({ length: 10 }, (_, i) => triWeek(10 + i, 60, 240, 90)), // S10-S19
    ironman703RaceWeek(20), // pic complet final
  ];
  return makePlan(weeks);
}

describe("validateMilestoneTransition — transition 10K → 70.3 (jalon run-only, objectif final triathlon)", () => {
  it("natation/vélo absentes pendant la préparation du jalon 10K → signalé explicitement, semaine par semaine, discipline par discipline", () => {
    const plan = buildPlan({ prepHasSwimBike: false, recoveryFactor: 0.4, resumeFactor: 2 });
    const result = validatePlan(plan, "703", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, RACE_GOALS_10K_TO_703, PLAN_START_DATE);
    const swimS4 = result.issues.find(i => i.rule === "progression" && i.week === 4 && /Natation absente/i.test(i.message));
    const bikeS4 = result.issues.find(i => i.rule === "progression" && i.week === 4 && /Vélo absente/i.test(i.message));
    const swimS5 = result.issues.find(i => i.rule === "progression" && i.week === 5 && /Natation absente/i.test(i.message));
    expect(swimS4).toBeDefined();
    expect(bikeS4).toBeDefined();
    expect(swimS5).toBeDefined();
  });

  it("natation/vélo maintenues (en volume réduit) pendant la préparation du jalon → aucune alerte de maintien", () => {
    const plan = buildPlan({ prepHasSwimBike: true, recoveryFactor: 0.4, resumeFactor: 2 });
    const result = validatePlan(plan, "703", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, RACE_GOALS_10K_TO_703, PLAN_START_DATE);
    const maintienIssues = result.issues.filter(i => i.rule === "progression" && /absente pendant la préparation du jalon/i.test(i.message));
    expect(maintienIssues).toHaveLength(0);
  });

  it("pas de récupération visible après le 10K (volume S7 aussi élevé que la préparation) → signalé", () => {
    const plan = buildPlan({ prepHasSwimBike: true, recoveryFactor: 1.2, resumeFactor: 1.5 });
    const result = validatePlan(plan, "703", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, RACE_GOALS_10K_TO_703, PLAN_START_DATE);
    const recoveryIssue = result.issues.find(i => i.rule === "progression" && i.week === 7 && /pas de récupération visible/i.test(i.message));
    expect(recoveryIssue).toBeDefined();
  });

  it("récupération réelle après le 10K (volume S7 nettement réduit) → aucune alerte de récupération", () => {
    const plan = buildPlan({ prepHasSwimBike: true, recoveryFactor: 0.4, resumeFactor: 2 });
    const result = validatePlan(plan, "703", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, RACE_GOALS_10K_TO_703, PLAN_START_DATE);
    const recoveryIssue = result.issues.find(i => i.rule === "progression" && i.week === 7 && /pas de récupération visible/i.test(i.message));
    expect(recoveryIssue).toBeUndefined();
  });

  it("la reprise (S8-S9) qui reste au niveau de la récupération, sans progresser vers le 70.3 → signalé", () => {
    const plan = buildPlan({ prepHasSwimBike: true, recoveryFactor: 0.4, resumeFactor: 0.9 }); // reprise < récupération
    const result = validatePlan(plan, "703", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, RACE_GOALS_10K_TO_703, PLAN_START_DATE);
    const continuityIssue = result.issues.find(i => i.rule === "progression" && /ne progresse pas vers l'objectif final/i.test(i.message));
    expect(continuityIssue).toBeDefined();
  });

  it("la reprise (S8-S9) qui progresse clairement vers le 70.3 → aucune alerte de continuité", () => {
    const plan = buildPlan({ prepHasSwimBike: true, recoveryFactor: 0.4, resumeFactor: 2 });
    const result = validatePlan(plan, "703", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, RACE_GOALS_10K_TO_703, PLAN_START_DATE);
    const continuityIssue = result.issues.find(i => i.rule === "progression" && /ne progresse pas vers l'objectif final/i.test(i.message));
    expect(continuityIssue).toBeUndefined();
  });

  it("objectif FINAL run-only (Marathon) avec le même jalon 10K : la règle reste inactive, même en l'absence de natation/vélo (rien à maintenir en course à pied pure)", () => {
    const plan = buildPlan({ prepHasSwimBike: false, recoveryFactor: 1.2, resumeFactor: 0.9 }); // ce profil serait signalé 3x en contexte triathlon
    const raceGoalsMarathon: ClassifiableRaceGoal[] = [
      { objective: "10K", raceDate: TENK_RACE_DATE, priority: "B" },
      { objective: "Marathon", raceDate: RACE_703_DATE, priority: "A" },
    ];
    const result = validatePlan(plan, "Marathon", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, raceGoalsMarathon, PLAN_START_DATE);
    const milestoneIssues = result.issues.filter(i => i.rule === "progression" && (/absente pendant la préparation du jalon/i.test(i.message) || /pas de récupération visible/i.test(i.message) || /ne progresse pas vers l'objectif final/i.test(i.message)));
    expect(milestoneIssues).toHaveLength(0);
  });

  it("plan mono-objectif (raceGoals/planStartDate omis) : comportement inchangé, règle inactive", () => {
    const plan = buildPlan({ prepHasSwimBike: false, recoveryFactor: 1.2, resumeFactor: 0.9 });
    const result = validatePlan(plan, "703");
    const milestoneIssues = result.issues.filter(i => i.rule === "progression" && (/absente pendant la préparation du jalon/i.test(i.message) || /pas de récupération visible/i.test(i.message) || /ne progresse pas vers l'objectif final/i.test(i.message)));
    expect(milestoneIssues).toHaveLength(0);
  });
});
