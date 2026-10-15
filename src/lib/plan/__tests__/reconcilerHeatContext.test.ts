import { describe, expect, it, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { PlanChunk, PlanSession } from "../planSchema";

vi.mock("@/lib/workoutLibrary", () => {
  const fiche = (id: string, tags: string[], durationMin: [number, number]): LibraryWorkout => ({
    id, tags, durationMin, cat: "A", sport: "run", objectif: "Endurance facile", necessite: "Recommandé",
    when: "Build", phase: ["build"], avoid: "", metricKey: "pace", sportKey: "run",
    structure: [{ part: "Main", text: "Z2 continu", zones: ["Z2"] }], variants: {}, goals: [],
  });
  return { WorkoutLibrary: [
    fiche("A_RUN_EASY", ["endurance"], [30, 40]),
    fiche("A_RUN_ALTITUDE", ["altitude"], [30, 40]),
    fiche("ENR_HEAT_ACCLIM_Z2", ["heat"], [50, 70]),
    fiche("HEAT_RUN_SHORT", ["heat"], [30, 40]),
  ] };
});
import { runReconciler } from "../planReconciler";

function repair(id: string) {
  const session = { day: "dimanche", sport: "run", title: "Endurance", details: "",
    catalogId: id, custom: false, durationMin: 60, zones: ["Z2"], isKeySession: false } as PlanSession;
  const chunk = { weeks: [{ weekNumber: 5, phase: "build", theme: "T", sessions: [session] }] } as PlanChunk;
  const result = runReconciler([chunk], {}, 2, new Set(["ENR_HEAT_ACCLIM_Z2"]), { globalTotalWeeks: 12 });
  return { session, result };
}

describe("réparation : pas de chaleur introduite implicitement", () => {
  it.each(["A_RUN_EASY", "A_RUN_ALTITUDE"])("ne remplace pas %s par une fiche heat", id => {
    const { session, result } = repair(id);
    expect(session.catalogId).toBe(id);
    expect(result.counters.id_substituted_duration).toBe(0);
    expect(result.counters.duration_unresolved).toBeGreaterThan(0);
  });
  it("peut préserver un contexte chaleur déjà présent", () => {
    const { session } = repair("HEAT_RUN_SHORT");
    expect(session.catalogId).toBe("ENR_HEAT_ACCLIM_Z2");
  });
});
