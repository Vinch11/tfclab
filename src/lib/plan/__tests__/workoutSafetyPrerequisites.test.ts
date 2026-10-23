import { describe, expect, it } from "vitest";
import { isLevelPrerequisiteIncompatible } from "@/lib/plan/levelPrerequisiteCompatibility";
import { auditedSafetyPrerequisitesFor } from "@/lib/workoutSafetyPrerequisites";

const VERIFIED_PROFILE = {
  trainingLevel: "trained",
  trainingLevelSource: "manual",
  weeklyHours: 8,
} as const;

const ABSOLUTE_AUTO_BLOCK = [
  "TPL_SWIM_HYPOXIE",
  "A_HEAT_ACCLIM_RUN",
  "C_HEAT_ACCLIM_BIKE_INDOOR",
];

const REVIEW_REQUIRED = [
  "D_PAP_PRE_RACE",
  "CONTRAST_RUN_FORCE_SPEED",
  "C_STR_RE_ECONOMY_BLAGROVE",
  "C_STR_CYCLIST_PEDAL_POWER",
  "C_STR_LOWER_PRO",
  "URBAN_EXCENTRIQUE_DESCENTE_SALLE",
  "V2_RUN_SPRINT_PLAT",
  "B_BIKE_SPRINT_NEUROMUSCULAR",
  "V2_BIKE_SPRINT_NEUROMUSCULAR",
  "B_BIKE_CP_W_PRIME_TEST",
  "B_SWIM_SPRINT_25s",
  "KENYAN_RUN_DOUBLE_DAY",
  "EXPE_HORS_VILLE_BACK_TO_BACK",
  "KENYAN_WEEK_STRUCTURE_MARATHON",
  "BILLAT_RUN_LACTATE_TOLERANCE",
  "ENR_RUN_NORWEGIAN_4X8",
  "ENR_RUN_NORWEGIAN_5X6",
  "ENR_RUN_LACTATE_CLEARANCE",
  "B_RUN_LACTATE_SHUTTLE",
  "NORWEGIAN_RUN_LACTATE_TEST_PROTOCOL",
  "ENR_BIKE_LACTATE_SHUTTLE",
  "ENR_BIKE_NORWEGIAN_5X5",
  "SEILER_BIKE_4X4MIN",
  "V2_BIKE_TABATA",
  "V3_BIKE_VO2_TABATA",
  "BILLAT_SWIM_30_30",
];

describe("prérequis de sécurité ciblés — premier lot audit 2026-10", () => {
  it("bloque toujours hypoxie et chaleur dans la sélection automatique, même avec profil et accord coach", () => {
    for (const id of ABSOLUTE_AUTO_BLOCK) {
      expect(auditedSafetyPrerequisitesFor(id)?.blockAutomaticSelection).toBe(true);
      expect(isLevelPrerequisiteIncompatible(id, {
        ...VERIFIED_PROFILE,
        trainingLevel: "highly_trained",
        approvedAdvancedSessionIds: [id],
      })).toBe(true);
    }
  });

  it("refuse les protocoles maximaux, doubles journées et charges lourdes sans revue coach nominative", () => {
    expect(REVIEW_REQUIRED).toHaveLength(26);
    for (const id of REVIEW_REQUIRED) {
      expect(isLevelPrerequisiteIncompatible(id, VERIFIED_PROFILE), id).toBe(true);
    }
  });

  it("une approbation seule ne compense jamais un profil absent ou non fiable", () => {
    const id = "V2_RUN_SPRINT_PLAT";
    expect(isLevelPrerequisiteIncompatible(id, {
      trainingLevel: "trained",
      trainingLevelSource: "fallback-prudent",
      approvedAdvancedSessionIds: [id],
    })).toBe(true);
  });

  it("autorise un protocole revu lorsque le profil est fiable et l'approbation porte exactement sur son ID", () => {
    const id = "V2_RUN_SPRINT_PLAT";
    expect(isLevelPrerequisiteIncompatible(id, {
      ...VERIFIED_PROFILE,
      approvedAdvancedSessionIds: [id],
    })).toBe(false);
    expect(isLevelPrerequisiteIncompatible("D_PAP_PRE_RACE", {
      ...VERIFIED_PROFILE,
      approvedAdvancedSessionIds: [id],
    })).toBe(true);
  });

  it("maintient une séance ordinaire hors périmètre", () => {
    expect(isLevelPrerequisiteIncompatible("A_RUN_Z2_EASY", undefined)).toBe(false);
    expect(auditedSafetyPrerequisitesFor("A_RUN_Z2_EASY")).toBeUndefined();
  });
});
