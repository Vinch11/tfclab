import { describe, expect, it, vi } from "vitest";
import type { PlanChunk, PlanSession } from "@/lib/plan/planSchema";

vi.mock("@/lib/workoutLibrary", () => ({ WorkoutLibrary: [
  { id: "ORIGINAL_THRESHOLD_PEAK", cat: "B", sport: "course", objectif: "Seuil", necessite: "Recommandé", when: "Peak", phase: ["peak"], durationMin: [55, 75], metricKey: "allure", sportKey: "course", structure: [{ part: "Main", text: "Intervalles au seuil", zones: ["Z4"] }], tags: ["threshold"], goals: ["10k"], physiology: { primary: "mlss", rationale: "Seuil." } },
  { id: "NORWEGIAN_RUN_THRESHOLD_HIGH_PM", cat: "B", sport: "course", objectif: "Seuil haut", necessite: "Recommandé", when: "Build", phase: ["build"], durationMin: [55, 75], metricKey: "allure", sportKey: "course", structure: [{ part: "Main", text: "Intervalles au seuil", zones: ["Z4"] }], tags: ["threshold"], goals: ["10k"], physiology: { primary: "mlss", rationale: "Seuil." } },
] }));
import { runReconciler } from "@/lib/plan/planReconciler";

describe("substitutions norvégiennes — approbation partagée avec le catalogue", () => {
  it.each(["5K", "10K", "SEMI", "MARATHON", "TRAIL", "703", "IRONMAN"])("%s : le voisin PM ne contourne pas la revue coach", objectiveKey => {
    const s: PlanSession = { day: "mardi", sport: "run", title: "Seuil", details: "Intervalles au seuil", catalogId: "ORIGINAL_THRESHOLD_PEAK", durationMin: 65, zones: ["Z4"], isKeySession: true, custom: false };
    const chunk: PlanChunk = { weeks: [{ weekNumber: 5, phase: "build", theme: "Seuil", sessions: [s] }] };
    runReconciler([chunk], {}, 1, ["NORWEGIAN_RUN_THRESHOLD_HIGH_PM"], { objectiveKey, globalTotalWeeks: 12, beginnerIntensitySignal: { trainingLevel: "highly_trained", trainingLevelSource: "manual", weeklyHours: 8 } });
    expect(s.catalogId).toBe("ORIGINAL_THRESHOLD_PEAK");
  });
});