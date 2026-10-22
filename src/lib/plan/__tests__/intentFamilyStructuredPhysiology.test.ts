import { describe, expect, it } from "vitest";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import { intentFamilyOf } from "@/lib/plan/intentFamily";

const expectedFamilies: Readonly<Record<string, string>> = {
  B_BIKE_VO2_3MIN: "vo2",
  B_RUN_VO2_5x3_PRO: "vo2",
  BILLAT_RUN_VO2MAX_LONG_5MIN: "vo2",
  BILLAT_RUN_FARTLEK_VO2: "vo2",
  SEILER_BIKE_4X8MIN: "vo2",
  SEILER_BIKE_Z1_LONG: "endurance_fondamentale",
  LYDIARD_RUN_AEROBIC_BASE_MEDIUM: "endurance_fondamentale",
  NORWEGIAN_RUN_THRESHOLD_HIGH_PM: "seuil",
  C_STR_MAX_LOWER_HEAVY: "force",
  D_RUN_RECOVERY_30_PRO: "recuperation",
};

describe("intentFamilyOf — métadonnées physiologiques structurées", () => {
  it.each(Object.entries(expectedFamilies))(
    "%s est classée par son stimulus réel",
    (id, expected) => {
      const workout = WorkoutLibrary.find(candidate => candidate.id === id);
      expect(workout, `fiche ${id} absente`).toBeDefined();
      expect(workout?.physiology?.primary).toBeTruthy();
      expect(intentFamilyOf(workout!)).toBe(expected);
    },
  );

  it("classe les variantes D_RECOVERY comme récupération malgré leur texte technique", () => {
    for (let index = 1; index <= 10; index++) {
      const workout = WorkoutLibrary.find(candidate => candidate.id === `D_RECOVERY_VAR_${index}_PRO`);
      expect(workout).toBeDefined();
      expect(intentFamilyOf(workout!)).toBe("recuperation");
    }
  });

  it("conserve le classifieur historique pour une fiche non auditée", () => {
    const workout = WorkoutLibrary.find(candidate => candidate.id === "A_RUN_Z2_EASY");
    expect(workout).toBeDefined();
    expect(workout?.physiology).toBeUndefined();
    expect(intentFamilyOf(workout!)).toBe("technique");
  });
});

