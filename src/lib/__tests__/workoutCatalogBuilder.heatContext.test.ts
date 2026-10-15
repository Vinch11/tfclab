import { describe, expect, it } from "vitest";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import { buildWorkoutCatalog } from "@/lib/workoutCatalogBuilder";
import { ficheUnconfirmedContextReason } from "@/lib/plan/planReconciler";

describe("chaleur : contexte explicitement demandé", () => {
  it("classe les protocoles chaleur et sauna, sans exclure les simples précautions météo", () => {
    for (const id of ["ENR_HEAT_ACCLIM_Z2", "HEAT_RUN_ACCLIM", "HEAT_SAUNA_POST_WORKOUT"]) {
      expect(ficheUnconfirmedContextReason(WorkoutLibrary.find(w => w.id === id)!)).toBe("heat");
    }
    const easy = WorkoutLibrary.find(w => w.id === "A_RUN_Z2_EASY")!;
    expect(ficheUnconfirmedContextReason({ ...easy, avoid: "Éviter la chaleur extrême" })).toBeNull();
  });

  it("exclut heat du catalogue 5K par défaut et avec un autre contexte confirmé", () => {
    for (const confirmedSpecialContexts of [undefined, new Set<"altitude">(["altitude"])]) {
      const catalog = buildWorkoutCatalog("5 KM", 5, 8, 12, { maxItems: 130, confirmedSpecialContexts });
      expect(catalog.some(w => w.id === "ENR_HEAT_ACCLIM_Z2")).toBe(false);
      expect(catalog.some(w => w.id === "A_RUN_Z2_EASY")).toBe(true);
      for (const item of catalog) {
        expect(ficheUnconfirmedContextReason(WorkoutLibrary.find(w => w.id === item.id)!)).not.toBe("heat");
      }
    }
  });

  it("conserve le protocole lorsque heat est explicitement confirmé", () => {
    const catalog = buildWorkoutCatalog("5 KM", 5, 8, 12, {
      maxItems: 130, confirmedSpecialContexts: new Set(["heat"]),
    });
    expect(catalog.some(w => w.id === "ENR_HEAT_ACCLIM_Z2")).toBe(true);
    expect(catalog.some(w => w.id === "ENR_ALTITUDE_EASY_RUN")).toBe(false);
  });
});
