import { describe, expect, it, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { PlanChunk, PlanSession } from "@/lib/plan/planSchema";

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    {
      id: "ORIG_RUN_SPRINT_PEAK_ONLY",
      cat: "Sprint", sport: "run", objectif: "Sprints maximaux sur plat",
      necessite: "Recommandé", when: "Peak", phase: ["peak"], avoid: "",
      durationMin: [35, 45], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "6x80m sprint maximal", zones: ["Z6"] }],
      variants: {}, tags: ["sprint"], goals: ["5k"],
      physiology: { primary: "neuromuscular", rationale: "Sprints maximaux." },
    },
    {
      id: "V2_RUN_SPRINT_PLAT",
      cat: "Sprint", sport: "course", objectif: "Sprints plat — effort maximal",
      necessite: "Recommandé", when: "Build", phase: ["build"],
      avoid: "Ischio-jambiers fragiles, sol mouillé",
      durationMin: [35, 45], metricKey: "allure", sportKey: "course",
      structure: [{ part: "Main", text: "6-8 x 80-100m sprint max R:3 min", zones: ["Z6"] }],
      variants: {}, tags: ["sprint"], goals: ["5k"],
      physiology: { primary: "neuromuscular", rationale: "Sprints maximaux." },
    },
  ];
  return { WorkoutLibrary: fiches };
});

import { runReconciler } from "@/lib/plan/planReconciler";

function session(): PlanSession {
  return {
    day: "mardi", sport: "run", title: "Sprints maximaux", details: "6x80m",
    isKeySession: true, custom: false, catalogId: "ORIG_RUN_SPRINT_PEAK_ONLY",
    durationMin: 40, zones: ["Z6"],
  };
}

function chunk(s: PlanSession): PlanChunk {
  return { weeks: [{ weekNumber: 5, phase: "build", theme: "Vitesse", sessions: [s] }] };
}

describe("runReconciler — sécurité des substitutions", () => {
  it("ne réintroduit pas V2_RUN_SPRINT_PLAT sans prérequis confirmés, même si c'est l'unique voisin injecté", () => {
    const s = session();
    runReconciler([chunk(s)], {}, 1, ["V2_RUN_SPRINT_PLAT"], {
      globalTotalWeeks: 12,
      beginnerIntensitySignal: {
        trainingLevel: "trained",
        trainingLevelSource: "manual",
        weeklyHours: 8,
      },
    });
    expect(s.catalogId).toBe("ORIG_RUN_SPRINT_PEAK_ONLY");
  });

  it("autorise la substitution après profil fiable et revue coach nominative", () => {
    const s = session();
    runReconciler([chunk(s)], {}, 1, ["V2_RUN_SPRINT_PLAT"], {
      globalTotalWeeks: 12,
      beginnerIntensitySignal: {
        trainingLevel: "trained",
        trainingLevelSource: "manual",
        weeklyHours: 8,
        approvedAdvancedSessionIds: ["V2_RUN_SPRINT_PLAT"],
      },
    });
    expect(s.catalogId).toBe("V2_RUN_SPRINT_PLAT");
  });
});
