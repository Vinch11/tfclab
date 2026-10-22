import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";
import type { ClassifiableRaceGoal } from "@/lib/plan/multiObjectiveClassification";

/**
 * Correction sprint qualité Marathon/Ironman (oct. 2026), #C-bis (demande
 * coach explicite) : 4e signal de `validateMilestoneTransition` — la reprise
 * après un jalon run-only (10K) dans un plan dont l'objectif final est
 * triathlon (703/IM) doit réorienter vers la spécificité natation/vélo, SANS
 * imposer de répartition fixe (comparaison auto-référencée à la part
 * moyenne du reste de CE plan, hors fenêtre du jalon).
 *
 * Même plan de référence (20 semaines) que
 * `planValidator.milestoneTransition.test.ts` : 10K le 2026-02-09 → S6 ;
 * 70.3 le 2026-05-20 → S20 ; `planStartDate` 2026-01-05.
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
  return { title: "Plan TFCL™ — 10K→70.3 Test Athlete (spécificité)", phases: [], weeks, totalWeeks: weeks.length };
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
  return makeWeek(weekNumber, [{ sport: "Course", title: "🏁 COURSE OBJECTIF", details: "Jour J — 10K" }], "Jalon 10K");
}
function ironman703RaceWeek(weekNumber: number): ParsedWeek {
  return makeWeek(weekNumber, [{ sport: "Course", title: "🏁 COURSE OBJECTIF", details: "Jour J — 70.3" }], "Jour J");
}

const PLAN_START_DATE = "2026-01-05";
const TENK_RACE_DATE = "2026-02-09"; // → S6
const RACE_703_DATE = "2026-05-20"; // → S20 (dernière semaine)
const RACE_GOALS_10K_TO_703: ClassifiableRaceGoal[] = [
  { objective: "10K", raceDate: TENK_RACE_DATE, priority: "B" },
  { objective: "703", raceDate: RACE_703_DATE, priority: "A" },
];

/** Semaine "baseline" représentative de l'objectif final (natation+vélo
 *  ≈72% du volume) — utilisée pour toutes les semaines de charge hors
 *  fenêtre du jalon (S1-S3, S10-S11, S13-S15, S17). */
const BASELINE_TRI = { nat: 40, velo: 140, course: 70 }; // 250min, swim+bike=72%

function buildPlan(resumeMix: { nat: number; velo: number; course: number }): ParsedPlan {
  const b = BASELINE_TRI;
  const weeks: ParsedWeek[] = [
    triWeek(1, b.nat, b.velo, b.course),
    triWeek(2, b.nat, b.velo, b.course),
    triWeek(3, b.nat, b.velo, b.course),
    triWeek(4, 20, 80, 60),       // préparation jalon (S-2)
    triWeek(5, 20, 80, 60),       // préparation jalon (S-1)
    tenKRaceWeek(6),              // jour du 10K
    triWeek(7, 0, 0, 40),         // récupération post-jalon
    triWeek(8, resumeMix.nat, resumeMix.velo, resumeMix.course),  // reprise
    triWeek(9, resumeMix.nat, resumeMix.velo, resumeMix.course),  // reprise
    triWeek(10, b.nat, b.velo, b.course),
    triWeek(11, b.nat, b.velo, b.course),
    triWeek(12, b.nat, b.velo, b.course), // décharge par position (cadence 4) — exclue de la baseline
    triWeek(13, b.nat, b.velo, b.course),
    triWeek(14, b.nat, b.velo, b.course),
    triWeek(15, b.nat, b.velo, b.course),
    triWeek(16, b.nat, b.velo, b.course), // décharge par position
    triWeek(17, b.nat, b.velo, b.course),
    triWeek(18, b.nat, b.velo, b.course), // affûtage (703, taperWeeks=2) — exclu de la baseline
    triWeek(19, b.nat, b.velo, b.course), // affûtage — exclu de la baseline
    ironman703RaceWeek(20),       // pic complet final
  ];
  return makePlan(weeks);
}

describe("validateMilestoneTransition — réorientation de la spécificité après le jalon 10K (Correction C-bis)", () => {
  it("la reprise reste centrée sur la course (natation/vélo marginaux) alors que le reste du plan est nettement plus équilibré → signalé", () => {
    const plan = buildPlan({ nat: 5, velo: 20, course: 200 }); // 225min, swim+bike=11%
    const result = validatePlan(plan, "703", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, RACE_GOALS_10K_TO_703, PLAN_START_DATE);
    const issue = result.issues.find(i => i.rule === "progression" && /part natation\+vélo pendant la reprise/i.test(i.message));
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("warning");
  });

  it("la reprise réintroduit natation/vélo dans une proportion proche du reste du plan → aucune alerte (pas de répartition fixe imposée)", () => {
    const plan = buildPlan({ nat: 35, velo: 130, course: 80 }); // 245min, swim+bike=67% (proche des 72% baseline)
    const result = validatePlan(plan, "703", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, RACE_GOALS_10K_TO_703, PLAN_START_DATE);
    const issue = result.issues.find(i => i.rule === "progression" && /part natation\+vélo pendant la reprise/i.test(i.message));
    expect(issue).toBeUndefined();
  });
});
