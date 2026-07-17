import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { MergedPlan, MergedSession } from "@/lib/plan/mergePlanChunks";

// Injecte 4 fiches synthétiques dans WorkoutLibrary (source unique consommée
// par checksB10B11).
const SYNTHETIC_FICHES: LibraryWorkout[] = [
  {
    id: "TEST_RUN_MIXED_Z2_Z3",
    cat: "B", sport: "run", objectif: "test", necessite: "Recommandé", when: "",
    avoid: "", durationMin: [60, 90], metricKey: "pace", sportKey: "run",
    structure: [
      { part: "Warm-up", text: "10' Z1", zones: ["Z1"] },
      { part: "Main", text: "40' progressif Z2 → Z3", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "5' Z1", zones: ["Z1"] },
    ],
    variants: {},
  },
  {
    id: "TEST_RUN_BASE_AEROBIC",
    cat: "C", sport: "run", objectif: "test", necessite: "Recommandé", when: "",
    avoid: "", durationMin: [60, 90], metricKey: "pace", sportKey: "run",
    structure: [
      { part: "Warm-up", text: "10' Z1", zones: ["Z1"] },
      { part: "Main", text: "60' continu Z2", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "5' Z1", zones: ["Z1"] },
    ],
    variants: {},
  },
];

vi.mock("@/lib/workoutLibrary", () => ({
  WorkoutLibrary: SYNTHETIC_FICHES,
}));

// Import AFTER mock so FICHES_BY_ID is built from synthetic set.
import { checkB10 } from "../checksB10B11";

function makeSession(overrides: Partial<MergedSession>): MergedSession {
  return {
    weekNumber: 1, weekTheme: "T", phase: "base", dayName: "Lundi", dayIndex: 1,
    sport: "run", title: "S", details: "", isRest: false, isKeySession: true,
    catalogId: null, custom: false, durationMin: 60, zones: [],
    ...overrides,
  };
}

function makePlan(sessions: MergedSession[]): MergedPlan {
  return {
    title: "P", phases: [], totalWeeks: 1,
    weeks: [{ weekNumber: 1, theme: "T", phase: "base", sessions }],
  };
}

describe("B10.c dilution — nouvelle règle validée coach", () => {
  it("Cas 1 : instance garde le bloc intense (Z3) → PASS (pas de faux positif)", () => {
    const plan = makePlan([
      makeSession({
        catalogId: "TEST_RUN_MIXED_Z2_Z3",
        zones: ["Z1", "Z2", "Z3"],
        durationMin: 75,
      }),
    ]);
    const r = checkB10(plan);
    expect(r.details.join(" ")).not.toMatch(/dilué|dilution/i);
  });

  it("Cas 2 : instance perd le bloc Z3 → FAIL dilution", () => {
    const plan = makePlan([
      makeSession({
        catalogId: "TEST_RUN_MIXED_Z2_Z3",
        zones: ["Z1", "Z2"],
        durationMin: 75,
      }),
    ]);
    const r = checkB10(plan);
    expect(r.pass).toBe(false);
    expect(r.details.join(" ")).toMatch(/Z3 absente|dilué/i);
  });

  it("Cas 3 : base aérobie Z1/Z2 continu — aucun FAIL zone, aucun warning structure", () => {
    const plan = makePlan([
      makeSession({
        catalogId: "TEST_RUN_BASE_AEROBIC",
        zones: ["Z1", "Z2"],
        durationMin: 75,
        title: "Sortie longue Z2",
        details: "60' continu Z2",
      }),
    ]);
    const r = checkB10(plan);
    const all = r.details.join(" ");
    expect(all).not.toMatch(/TEST_RUN_BASE_AEROBIC.*(dilué|surcharge|structure)/i);
  });

  it("Cas 4 : fiche facile Z1/Z2, instance monte en Z3 → FAIL surcharge", () => {
    const plan = makePlan([
      makeSession({
        catalogId: "TEST_RUN_BASE_AEROBIC",
        zones: ["Z3"],
        durationMin: 75,
      }),
    ]);
    const r = checkB10(plan);
    expect(r.pass).toBe(false);
    expect(r.details.join(" ")).toMatch(/surcharge/i);
  });
});
