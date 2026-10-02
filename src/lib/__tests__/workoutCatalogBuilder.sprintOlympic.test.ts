import { describe, it, expect } from "vitest";
import { normalizeGoal, buildWorkoutCatalog } from "@/lib/workoutCatalogBuilder";

/**
 * Batch 2 — exposition UI Sprint/Olympic. normalizeGoal() n'avait aucune
 * branche pour ces deux valeurs UI littérales ("Sprint"/"Olympic") : elles
 * tombaient tout au bas de la fonction sur `return []`, ce qui désactivait
 * silencieusement le bonus de score goal-match (scoreWorkout, w.goals.some)
 * pour tout plan Sprint/Olympic — sélection de séances non-différenciée par
 * distance. Premier fix : alignées sur "half" (70.3), le référentiel
 * structurel le plus proche en intensité/durée.
 *
 * Audit suivant (combler lacune Sprint/Olympique/5K) : "half" seul restait
 * un alias — aucune fiche ne pouvait jamais documenter de variant/goal
 * "sprint"/"olympic" dédié. Fix : ces deux clés existent désormais (voir
 * WorkoutGoal, EnrichedWorkoutsShortFormats), gardées EN PLUS de "half" pour
 * ne pas perdre l'accès au pool 70.3 existant.
 */
describe("normalizeGoal — Sprint/Olympic triathlon", () => {
  it("mappe Sprint/Olympic vers leur clé dédiée + 'half', jamais un tableau vide", () => {
    expect(normalizeGoal("Sprint")).toEqual(["sprint", "half"]);
    expect(normalizeGoal("Olympic")).toEqual(["olympic", "half"]);
    expect(normalizeGoal("sprint")).toEqual(["sprint", "half"]);
    expect(normalizeGoal("olympic")).toEqual(["olympic", "half"]);
  });

  it("ne casse pas les objectifs déjà reconnus (703/IM/triathlon générique)", () => {
    expect(normalizeGoal("70.3")).toEqual(["half"]);
    expect(normalizeGoal("Ironman")).toEqual(["ironman"]);
    expect(normalizeGoal("Triathlon")).toEqual(["ironman", "half"]);
  });
});

describe("normalizeGoal — 5K", () => {
  it("mappe 5K vers sa clé dédiée + '10k' (repli structurel), plus seulement '10k'", () => {
    expect(normalizeGoal("5K")).toEqual(["5k", "10k"]);
    expect(normalizeGoal("5km")).toEqual(["5k", "10k"]);
    expect(normalizeGoal("5 km")).toEqual(["5k", "10k"]);
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

/**
 * Combler lacune Sprint/Olympique/5K — EnrichedWorkoutsShortFormats fournit
 * désormais des fiches calibrées sur la durée/intensité propre à chaque
 * format (pas des fiches 70.3/10K génériques reconduites). Ces tests
 * vérifient qu'elles sont effectivement atteignables depuis le catalogue
 * construit pour chacun des trois objectifs, avec un texte de variant
 * documenté spécifiquement pour cet objectif (pas un repli générique).
 */
describe("buildWorkoutCatalog — fiches dédiées Sprint/Olympique/5K atteignables", () => {
  it("expose au moins une fiche dédiée Sprint (brick/bike/run/swim) avec variant 'sprint'", () => {
    const list = buildWorkoutCatalog("Sprint", 1, 10, 12, { maxItems: 80 });
    const dedicated = list.filter(w => w.id.includes("SPRINT") && (w.id.startsWith("B_SPRINT_") || w.id.startsWith("C_SPRINT_") || w.id === "BRIQUE_SPRINT_RACE_PACE"));
    expect(dedicated.length).toBeGreaterThan(0);
    const withVariant = dedicated.find(w => w.variants?.startsWith("sprint:"));
    expect(withVariant).toBeDefined();
  });

  it("expose au moins une fiche dédiée Olympique (brick/bike/run/swim) avec variant 'olympic'", () => {
    const list = buildWorkoutCatalog("Olympic", 1, 10, 12, { maxItems: 80 });
    const dedicated = list.filter(w => w.id.includes("OLY") && (w.id.startsWith("B_OLY_") || w.id.startsWith("C_OLY_") || w.id === "BRIQUE_OLY_RACE_PACE"));
    expect(dedicated.length).toBeGreaterThan(0);
    const withVariant = dedicated.find(w => w.variants?.startsWith("olympic:"));
    expect(withVariant).toBeDefined();
  });

  it("expose au moins une fiche dédiée 5K (VO2max/allure spécifique) avec variant '5k'", () => {
    const list = buildWorkoutCatalog("5K", 1, 10, 12, { maxItems: 80 });
    const dedicated = list.filter(w => w.id.startsWith("C_5K_") || w.id === "B_5K_FINISH_KICK" || w.id === "TT_5K_TEST" || w.id === "V2_RUN_5K_ALLURE_SPECIFIQUE");
    expect(dedicated.length).toBeGreaterThan(0);
    const withVariant = dedicated.find(w => w.variants?.startsWith("5k:"));
    expect(withVariant).toBeDefined();
  });
});
