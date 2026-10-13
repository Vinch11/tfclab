import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { FinalValidationPlanLike } from "@/lib/plan/qa/checkB13";

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    {
      id: "BUILD_ONLY_RUN",
      cat: "B", sport: "run", objectif: "Séance build", necessite: "Recommandé",
      when: "", phase: ["build"], avoid: "",
      durationMin: [40, 60], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "Seuil", zones: ["Z4"] }],
      variants: {}, tags: [], goals: ["10k"],
    },
  ];
  return { WorkoutLibrary: fiches };
});

import { computeFinalValidationIssues } from "@/lib/plan/qa/finalValidation";

function session(overrides: Partial<FinalValidationPlanLike["weeks"][number]["sessions"][number]>) {
  return { title: "Séance", details: "", isRest: false, catalogId: null, custom: false, ...overrides };
}

describe("computeFinalValidationIssues — orchestration B13 (critique) + B14 (avertissement)", () => {
  it("plan propre → aucune issue, hasCritical=false", () => {
    const plan: FinalValidationPlanLike = {
      weeks: [{ weekNumber: 1, phase: "build", sessions: [session({ catalogId: "BUILD_ONLY_RUN" })] }],
    };
    const r = computeFinalValidationIssues(plan);
    expect(r.issues).toEqual([]);
    expect(r.hasCritical).toBe(false);
  });

  it("doublon de catalogId → hasCritical=true, une issue 'error'", () => {
    const plan: FinalValidationPlanLike = {
      weeks: [{
        weekNumber: 1, phase: "build",
        sessions: [
          session({ catalogId: "BUILD_ONLY_RUN", dayName: "Mardi" }),
          session({ catalogId: "BUILD_ONLY_RUN", dayName: "Mercredi" }),
        ],
      }],
    };
    const r = computeFinalValidationIssues(plan);
    expect(r.hasCritical).toBe(true);
    expect(r.issues.filter((i) => i.severity === "error").length).toBe(1);
  });

  it("incohérence phase/fiche seule (B14) → hasCritical=false, une issue 'warning'", () => {
    const plan: FinalValidationPlanLike = {
      weeks: [{ weekNumber: 1, phase: "taper", sessions: [session({ catalogId: "BUILD_ONLY_RUN" })] }],
    };
    const r = computeFinalValidationIssues(plan);
    expect(r.hasCritical).toBe(false);
    expect(r.issues.length).toBe(1);
    expect(r.issues[0].severity).toBe("warning");
  });

  it("une incohérence critique ET un avertissement en même temps → hasCritical=true, les deux remontent", () => {
    const plan: FinalValidationPlanLike = {
      weeks: [{
        weekNumber: 1, phase: "taper", // phase mismatch pour BUILD_ONLY_RUN (B14)
        sessions: [
          session({ catalogId: "BUILD_ONLY_RUN", dayName: "Mardi" }),
          session({ catalogId: "BUILD_ONLY_RUN", dayName: "Mercredi" }), // doublon (B13)
        ],
      }],
    };
    const r = computeFinalValidationIssues(plan);
    expect(r.hasCritical).toBe(true);
    expect(r.issues.some((i) => i.severity === "error")).toBe(true);
    expect(r.issues.some((i) => i.severity === "warning")).toBe(true);
  });
});
