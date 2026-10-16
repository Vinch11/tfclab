import { describe, expect, it } from "vitest";
import {
  evaluateRepairSportingEquivalence,
  type RepairIntentFamily,
  type RepairWorkoutMetadata,
} from "../../../../supabase/functions/_shared/repairSportingEquivalence";

function metadata(
  id: string,
  intentFamily: RepairIntentFamily,
  overrides: Partial<RepairWorkoutMetadata> = {},
): RepairWorkoutMetadata {
  return {
    metadataVersion: 1,
    complete: true,
    id,
    sport: "run",
    title: id,
    objective: id,
    intentFamily,
    goals: ["5k"],
    objectiveSpecific: false,
    phases: ["build"],
    durationMin: [40, 60],
    mainZoneMax: 2,
    specialContext: null,
    prerequisiteKeys: [],
    necessity: "Recommandé",
    when: "Build",
    avoid: "",
    tags: [],
    structure: "Main Z2",
    zones: ["Z2"],
    ...overrides,
  };
}

describe("evaluateRepairSportingEquivalence", () => {
  const easy = metadata("EASY", "endurance_fondamentale");

  it("refuse les métadonnées absentes et l'intention unknown au lieu d'en faire un joker", () => {
    expect(evaluateRepairSportingEquivalence(easy, undefined).reasons)
      .toContain("candidate_metadata_incomplete");
    expect(evaluateRepairSportingEquivalence(easy, metadata("UNKNOWN", "other")).compatible)
      .toBe(false);
  });

  it("refuse un contexte ou un prérequis nouvellement introduit", () => {
    const candidate = metadata("NORWEGIAN", "endurance_fondamentale", {
      specialContext: "fatmax_module",
      prerequisiteKeys: ["lactatemetre"],
    });
    const result = evaluateRepairSportingEquivalence(easy, candidate);
    expect(result.reasons).toContain("special_context:fatmax_module");
    expect(result.reasons).toContain("prerequisite:lactatemetre");
  });

  it("applique l'objectif explicite et la phase sans bannir un simple nom de distance", () => {
    const named10k = metadata("10K_IN_NAME_ONLY", "endurance_fondamentale");
    expect(evaluateRepairSportingEquivalence(easy, named10k, { objective: "5K", phase: "build" }).compatible)
      .toBe(true);

    const ironmanOnly = metadata("IRONMAN_ONLY", "endurance_fondamentale", {
      goals: ["ironman"],
      objectiveSpecific: true,
    });
    expect(evaluateRepairSportingEquivalence(easy, ironmanOnly, { objective: "5K", phase: "build" }).reasons)
      .toContain("objective:5k");
  });

  it("protège recovery/deload même sans weeklyNotes", () => {
    const hard = metadata("HARD", "seuil", { mainZoneMax: 4, zones: ["Z4"] });
    const result = evaluateRepairSportingEquivalence(easy, hard, {
      phase: "build",
      weekType: "deload",
      allowedCandidateIntentFamilies: ["seuil"],
    });
    expect(result.reasons).toContain("recovery_zone:z4");
    expect(result.reasons).toContain("recovery_intent:seuil");
  });

  it("n'autorise une baisse d'intention que lorsque le chemin de réparation la déclare", () => {
    const threshold = metadata("THRESHOLD", "seuil", { mainZoneMax: 4, zones: ["Z4"] });
    expect(evaluateRepairSportingEquivalence(threshold, easy).compatible).toBe(false);
    expect(evaluateRepairSportingEquivalence(threshold, easy, {
      allowedCandidateIntentFamilies: ["endurance_fondamentale"],
    }).compatible).toBe(true);
  });
});
