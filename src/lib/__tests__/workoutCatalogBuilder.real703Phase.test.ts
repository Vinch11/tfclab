import { describe, expect, it } from "vitest";
import { buildWorkoutCatalog, phasesForWeekRange } from "../workoutCatalogBuilder";
import { WorkoutLibrary } from "../workoutLibrary";
import { ficheAllowedPhases } from "../plan/phaseNormalization";

describe("703 S2 — brique Build/Peak", () => {
  it("la fiche réelle garde ses phases et son contenu tempo", () => {
    const w = WorkoutLibrary.find(w => w.id === "BR_HALF_RACEPACE_PRO")!;
    expect(w.phase).toEqual(["build", "peak"]);
    expect(ficheAllowedPhases(w)).toEqual(new Set(["build", "peak"]));
    expect(w.structure.map(p => p.text).join(" ")).toContain("SST");
  });
  it("le catalogue initial Fondation S1-S5 exclut la fiche sans modifier ses métadonnées", () => {
    expect(phasesForWeekRange(1, 5, 33)).toEqual(["base"]);
    const entries = buildWorkoutCatalog("703", 1, 5, 33, { maxItems: 130 });
    expect(entries.some(e => e.id === "BR_HALF_RACEPACE_PRO")).toBe(false);
    expect(entries.length).toBeGreaterThan(0);
  });
});
