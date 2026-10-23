import { describe, expect, it } from "vitest";
import { buildWorkoutCatalog } from "@/lib/workoutCatalogBuilder";

const ALL_PHASES = ["base", "build", "peak", "taper"] as const;

function runCatalog(approvedAdvancedSessionIds: readonly string[] = []) {
  return new Set(buildWorkoutCatalog("5 KM", 1, 12, 12, {
    maxItems: 100_000,
    sportFilter: ["course", "run"],
    phaseOverride: [...ALL_PHASES],
    beginnerIntensitySignal: {
      trainingLevel: "trained",
      trainingLevelSource: "manual",
      weeklyHours: 8,
      approvedAdvancedSessionIds,
    },
  }).map(entry => entry.id));
}

describe("buildWorkoutCatalog — prérequis de sécurité ciblés", () => {
  it("retire les protocoles revus tant que leur approbation nominative manque", () => {
    expect(runCatalog()).not.toContain("V2_RUN_SPRINT_PLAT");
  });

  it("rend un protocole conditionnel disponible après profil fiable et approbation nominative", () => {
    expect(runCatalog(["V2_RUN_SPRINT_PLAT"])).toContain("V2_RUN_SPRINT_PLAT");
  });

  it("ne laisse jamais une approbation réautoriser la chaleur automatiquement", () => {
    expect(runCatalog(["A_HEAT_ACCLIM_RUN"])).not.toContain("A_HEAT_ACCLIM_RUN");
  });

  it("préserve une séance ordinaire du même catalogue", () => {
    expect(runCatalog()).toContain("A_RUN_Z2_EASY");
  });
});
