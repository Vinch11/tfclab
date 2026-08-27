import { describe, it, expect } from "vitest";
import { normalizeGoal, buildWorkoutCatalog } from "@/lib/workoutCatalogBuilder";

/**
 * Batch 2 — exposition UI Sprint/Olympic. normalizeGoal() n'avait aucune
 * branche pour ces deux valeurs UI littérales ("Sprint"/"Olympic") : elles
 * tombaient tout au bas de la fonction sur `return []`, ce qui désactivait
 * silencieusement le bonus de score goal-match (scoreWorkout, w.goals.some)
 * pour tout plan Sprint/Olympic — sélection de séances non-différenciée par
 * distance. Fix : alignées sur "half" (70.3), le référentiel structurel le
 * plus proche en intensité/durée (même choix que buildFewShotExamples côté
 * edge function, pour la même raison).
 */
describe("normalizeGoal — Sprint/Olympic triathlon", () => {
  it("mappe Sprint/Olympic vers ['half'], jamais un tableau vide", () => {
    expect(normalizeGoal("Sprint")).toEqual(["half"]);
    expect(normalizeGoal("Olympic")).toEqual(["half"]);
    expect(normalizeGoal("sprint")).toEqual(["half"]);
    expect(normalizeGoal("olympic")).toEqual(["half"]);
  });

  it("ne casse pas les objectifs déjà reconnus (703/IM/triathlon générique)", () => {
    expect(normalizeGoal("70.3")).toEqual(["half"]);
    expect(normalizeGoal("Ironman")).toEqual(["ironman"]);
    expect(normalizeGoal("Triathlon")).toEqual(["ironman", "half"]);
  });
});

describe("buildWorkoutCatalog — objectifs Sprint/Olympic produisent un catalogue non vide", () => {
  it("retourne des fiches pour Sprint", () => {
    const list = buildWorkoutCatalog("Sprint", 1, 6, 12);
    expect(list.length).toBeGreaterThan(5);
  });

  it("retourne des fiches pour Olympic", () => {
    const list = buildWorkoutCatalog("Olympic", 1, 6, 12);
    expect(list.length).toBeGreaterThan(5);
  });
});
