import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { MergedPlan, MergedSession } from "@/lib/plan/mergePlanChunks";

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    {
      id: "V3_RECUP_YOGA_ATHLETE",
      cat: "D", sport: "strength", objectif: "yoga", necessite: "Recommandé", when: "",
      avoid: "", durationMin: [30, 50], metricKey: "cardiaque", sportKey: "running",
      structure: [
        { part: "Warm-up", text: "5' respiration", zones: [] },
        { part: "Main", text: "30' yoga", zones: [] },
        { part: "Cool-down", text: "5' savasana", zones: [] },
      ],
      variants: {},
    },
    {
      id: "TEST_RUN_BASE",
      cat: "C", sport: "run", objectif: "test", necessite: "Recommandé", when: "",
      avoid: "", durationMin: [60, 90], metricKey: "pace", sportKey: "run",
      structure: [
        { part: "Main", text: "60' Z2", zones: ["Z2"] },
      ],
      variants: {},
    },
  ];
  return { WorkoutLibrary: fiches };
});

import { checkB10 } from "../checksB10B11";

function makeSession(overrides: Partial<MergedSession>): MergedSession {
  return {
    weekNumber: 1, weekTheme: "T", phase: "base", dayName: "Lundi", dayIndex: 1,
    sport: "run", title: "S", details: "", isRest: false, isKeySession: false,
    catalogId: null, custom: false, durationMin: 40, zones: [],
    ...overrides,
  };
}
function makePlan(sessions: MergedSession[]): MergedPlan {
  return {
    title: "P", phases: [], totalWeeks: 1,
    weeks: [{ weekNumber: 1, theme: "T", phase: "base", sessions }],
  };
}

describe("B10.a discipline — non-cardio interchangeables", () => {
  it("fiche strength (yoga) placée dans un slot recovery → PASS (non flaggé)", () => {
    const plan = makePlan([
      makeSession({ catalogId: "V3_RECUP_YOGA_ATHLETE", sport: "recovery", durationMin: 40 }),
    ]);
    const r = checkB10(plan);
    expect(r.details.join(" ")).not.toMatch(/discipline .* ≠ fiche/);
  });

  it("fiche run placée dans un slot swim → FAIL (cardio ≠ cardio reste bloquant)", () => {
    const plan = makePlan([
      makeSession({ catalogId: "TEST_RUN_BASE", sport: "swim", durationMin: 70, zones: ["Z2"] }),
    ]);
    const r = checkB10(plan);
    expect(r.pass).toBe(false);
    expect(r.details.join(" ")).toMatch(/discipline swim ≠ fiche run/);
  });
});
