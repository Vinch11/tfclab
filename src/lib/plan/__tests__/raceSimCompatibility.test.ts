/**
 * Mission 2D (palier 1, consigne coach) : vérifie la portée EXACTE du
 * hard-ban nominatif sur les 5 fiches *_RACE_SIM dont l'incompatibilité
 * avec 5K/10K a été démontrée par simulation sur le catalogue réel (cf.
 * MISSION2D_VALIDATION_FINALE.md §1-2) — jamais une règle plus large que
 * les incompatibilités mesurées :
 *  - V3_RUN_10K_RACE_SIM : exclue UNIQUEMENT pour 5K (native pour 10K).
 *  - *_MARATHON/*_SEMI (4 IDs) : exclues pour 5K ET 10K, jamais pour leur
 *    distance native, jamais pour marathon (semi-RACE_SIM y relève d'une
 *    pénalité — palier 2, non implémenté ici — pas d'une exclusion).
 */
import { describe, it, expect } from "vitest";
import { isRaceSimIncompatibleWithObjective } from "@/lib/plan/raceSimCompatibility";

const FIVE_IDS = [
  "V3_RUN_10K_RACE_SIM",
  "ENR_RACE_SIM_MARATHON",
  "V3_RACESIM_MARATHON",
  "ENR_RACE_SIM_SEMI",
  "V3_RACESIM_SEMI",
];

describe("isRaceSimIncompatibleWithObjective — Mission 2D palier 1", () => {
  it("objectif 5K : les 5 IDs sont exclus", () => {
    for (const id of FIVE_IDS) {
      expect(isRaceSimIncompatibleWithObjective(id, "5k")).toBe(true);
    }
  });

  it("objectif 10K : les 4 IDs semi/marathon sont exclus, V3_RUN_10K_RACE_SIM (natif) reste autorisée", () => {
    expect(isRaceSimIncompatibleWithObjective("V3_RUN_10K_RACE_SIM", "10k")).toBe(false);
    for (const id of ["ENR_RACE_SIM_MARATHON", "V3_RACESIM_MARATHON", "ENR_RACE_SIM_SEMI", "V3_RACESIM_SEMI"]) {
      expect(isRaceSimIncompatibleWithObjective(id, "10k")).toBe(true);
    }
  });

  it("objectif semi : aucun des 5 IDs n'est exclu (natif pour les fiches semi, hors de propos pour 10K/marathon)", () => {
    for (const id of FIVE_IDS) {
      expect(isRaceSimIncompatibleWithObjective(id, "semi")).toBe(false);
    }
  });

  it("objectif marathon : aucun des 5 IDs n'est exclu — les fiches semi-RACE_SIM relèvent d'une pénalité (palier 2), jamais d'une exclusion pour cet objectif", () => {
    for (const id of FIVE_IDS) {
      expect(isRaceSimIncompatibleWithObjective(id, "marathon")).toBe(false);
    }
  });

  it("insensible à la casse (\"5K\"/\"10K\" façon normalizeObjectiveKey, \"5k\"/\"10k\" façon WorkoutGoal)", () => {
    expect(isRaceSimIncompatibleWithObjective("V3_RUN_10K_RACE_SIM", "5K")).toBe(true);
    expect(isRaceSimIncompatibleWithObjective("v3_run_10k_race_sim", "5k")).toBe(true);
  });

  it("fiche non concernée : jamais exclue, quel que soit l'objectif", () => {
    expect(isRaceSimIncompatibleWithObjective("A_RUN_Z2_EASY", "5k")).toBe(false);
    expect(isRaceSimIncompatibleWithObjective("A_RUN_Z2_EASY", "10k")).toBe(false);
  });

  it("objectif absent/non reconnu (70.3, Ironman, trail, start_to_run, null) : aucune exclusion — règle scopée, jamais générale", () => {
    for (const id of FIVE_IDS) {
      expect(isRaceSimIncompatibleWithObjective(id, "half")).toBe(false);
      expect(isRaceSimIncompatibleWithObjective(id, "ironman")).toBe(false);
      expect(isRaceSimIncompatibleWithObjective(id, "trail_short")).toBe(false);
      expect(isRaceSimIncompatibleWithObjective(id, "start_to_run")).toBe(false);
      expect(isRaceSimIncompatibleWithObjective(id, null)).toBe(false);
      expect(isRaceSimIncompatibleWithObjective(id, undefined)).toBe(false);
    }
  });
});
