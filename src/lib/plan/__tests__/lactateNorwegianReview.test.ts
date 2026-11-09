import { describe, expect, it } from "vitest";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import { buildWorkoutCatalog } from "@/lib/workoutCatalogBuilder";
import { auditedWorkoutMetadataFor } from "@/lib/workoutPhysiologyMetadata";
import { isLevelPrerequisiteIncompatible } from "@/lib/plan/levelPrerequisiteCompatibility";
import { intentFamilyOf } from "@/lib/plan/intentFamily";

const profile = { trainingLevel: "trained", trainingLevelSource: "manual", weeklyHours: 8 };
const objectives = ["5 KM", "10 KM", "Semi-marathon", "Marathon", "Trail", "Half", "Ironman"];
const doubleDayIds = ["NORWEGIAN_RUN_THRESHOLD_LOW_AM", "NORWEGIAN_RUN_THRESHOLD_HIGH_PM", "NORWEGIAN_RUN_DOUBLE_THRESHOLD_DAY", "NORWEGIAN_WEEK_STRUCTURE_RUN", "URBAN_COTES_NORVEGIEN_DOUBLE_SEUIL"];

describe("revue lactate et norvégien — règles nominatives", () => {
  it.each(["NORWEGIAN_RUN_THRESHOLD_LOW_VOLUME", "NORWEGIAN_BIKE_THRESHOLD_LOW"])("%s reste une séance unique sous-seuil, pas une double journée ni LT1", id => {
    const card = WorkoutLibrary.find(w => w.id === id);
    expect(card).toBeDefined();
    if (!card) return;
    expect(card.physiology?.primary).toBe("sub_threshold");
    expect(intentFamilyOf(card)).toBe("seuil");
    expect(isLevelPrerequisiteIncompatible(id, profile)).toBe(false);
  });
  it("la navette course au seuil n'est pas classée VO₂max mais reste fermée tant que ses exclusions sont invérifiables", () => {
    expect(auditedWorkoutMetadataFor("B_RUN_LACTATE_SHUTTLE")?.physiology.primary).toBe("mlss");
    expect(isLevelPrerequisiteIncompatible("B_RUN_LACTATE_SHUTTLE", { ...profile, approvedAdvancedSessionIds: ["B_RUN_LACTATE_SHUTTLE"] })).toBe(true);
  });
  it.each(["ENR_RUN_LACTATE_CLEARANCE", "ENR_BIKE_LACTATE_SHUTTLE"])("%s garde son domaine sévère et son autorisation nominative", id => {
    expect(auditedWorkoutMetadataFor(id)?.physiology.primary).toBe("vo2max");
    expect(isLevelPrerequisiteIncompatible(id, profile)).toBe(true);
    expect(isLevelPrerequisiteIncompatible(id, { ...profile, approvedAdvancedSessionIds: [id] })).toBe(false);
  });
  it.each(doubleDayIds)("%s exige une approbation qui ne remplace pas le profil fiable", id => {
    expect(isLevelPrerequisiteIncompatible(id, { ...profile, trainingLevel: "highly_trained" })).toBe(true);
    expect(isLevelPrerequisiteIncompatible(id, { ...profile, trainingLevelSource: "fallback-prudent", approvedAdvancedSessionIds: [id] })).toBe(true);
    expect(isLevelPrerequisiteIncompatible(id, { ...profile, trainingLevel: "highly_trained", approvedAdvancedSessionIds: [id] })).toBe(false);
  });
  it("l'accord double seuil ne contourne ni le niveau ni les 8 heures déjà exigées", () => {
    const approvedAdvancedSessionIds = ["NORWEGIAN_RUN_DOUBLE_THRESHOLD_DAY"];
    expect(isLevelPrerequisiteIncompatible(approvedAdvancedSessionIds[0], { ...profile, approvedAdvancedSessionIds })).toBe(true);
    expect(isLevelPrerequisiteIncompatible(approvedAdvancedSessionIds[0], { ...profile, trainingLevel: "highly_trained", weeklyHours: 7, approvedAdvancedSessionIds })).toBe(true);
  });
  it("le test lactate reste inaccessible sans revue coach", () => {
    expect(isLevelPrerequisiteIncompatible("NORWEGIAN_RUN_LACTATE_TEST_PROTOCOL", profile)).toBe(true);
  });
  it.each(objectives)("%s : aucune double journée ni navette fermée ne fuit dans le catalogue", objective => {
    const ids = buildWorkoutCatalog(objective, 5, 8, 16, { maxItems: 100000, phaseOverride: ["build"], beginnerIntensitySignal: profile, limiters: ["TTE"] }).map(w => w.id);
    for (const id of [...doubleDayIds, "B_RUN_LACTATE_SHUTTLE", "ENR_RUN_LACTATE_CLEARANCE", "ENR_BIKE_LACTATE_SHUTTLE", "NORWEGIAN_RUN_LACTATE_TEST_PROTOCOL"]) expect(ids, id).not.toContain(id);
    if (objective !== "Trail") expect(ids).toContain("NORWEGIAN_RUN_THRESHOLD_LOW_VOLUME");
  });
});