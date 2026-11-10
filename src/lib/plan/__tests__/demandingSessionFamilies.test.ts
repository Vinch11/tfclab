import { describe, expect, it } from "vitest";
import { AUDITED_WORKOUT_SAFETY_PREREQUISITES } from "@/lib/workoutSafetyPrerequisites";
import { isLevelPrerequisiteIncompatible } from "@/lib/plan/levelPrerequisiteCompatibility";
import { approvedIdsForFamilies, DEMANDING_SESSION_FAMILIES } from "@/lib/plan/demandingSessionFamilies";

const verified = { trainingLevel: "trained", trainingLevelSource: "manual" } as const;

describe("Séances exigeantes — autorisation par famille", () => {
  it("chaque fiche à accord coach appartient à exactement une famille", () => {
    const needing = Object.entries(AUDITED_WORKOUT_SAFETY_PREREQUISITES)
      .filter(([, p]) => p.requireExplicitCoachApproval).map(([id]) => id).sort();
    const listed = DEMANDING_SESSION_FAMILIES.flatMap(f => f.workoutIds);
    expect([...listed].sort()).toEqual(needing);
    expect(new Set(listed).size).toBe(listed.length);
  });

  it("désactivé par défaut : double seuil refusé sans autorisation", () => {
    expect(isLevelPrerequisiteIncompatible("NORWEGIAN_RUN_DOUBLE_THRESHOLD_DAY", { ...verified, approvedAdvancedSessionIds: approvedIdsForFamilies([]) })).toBe(true);
  });

  it("famille autorisée + très entraîné vérifié ≥ 8 h : double seuil sélectionnable", () => {
    expect(isLevelPrerequisiteIncompatible("NORWEGIAN_RUN_DOUBLE_THRESHOLD_DAY", { trainingLevel: "highly_trained", trainingLevelSource: "manual", weeklyHours: 8, approvedAdvancedSessionIds: approvedIdsForFamilies(["double_threshold"]) })).toBe(false);
  });

  it("l'autorisation ne contourne pas le niveau minimum (entraîné < très entraîné)", () => {
    expect(isLevelPrerequisiteIncompatible("NORWEGIAN_RUN_DOUBLE_THRESHOLD_DAY", { ...verified, weeklyHours: 10, approvedAdvancedSessionIds: approvedIdsForFamilies(["double_threshold"]) })).toBe(true);
  });

  it("l'autorisation ne contourne pas un profil non vérifié", () => {
    expect(isLevelPrerequisiteIncompatible("ENR_BIKE_LACTATE_SHUTTLE", { trainingLevel: "trained", trainingLevelSource: "fallback-prudent", approvedAdvancedSessionIds: approvedIdsForFamilies(["lactate_shuttles"]) })).toBe(true);
  });

  it("la navette course au seuil reste bloquée même toutes familles autorisées", () => {
    const all = approvedIdsForFamilies(DEMANDING_SESSION_FAMILIES.map(f => f.key));
    expect(all).not.toContain("B_RUN_LACTATE_SHUTTLE");
    expect(isLevelPrerequisiteIncompatible("B_RUN_LACTATE_SHUTTLE", { ...verified, approvedAdvancedSessionIds: [...all, "B_RUN_LACTATE_SHUTTLE"] })).toBe(true);
  });

  it("une autre famille n'ouvre pas les doubles seuils", () => {
    expect(isLevelPrerequisiteIncompatible("NORWEGIAN_RUN_DOUBLE_THRESHOLD_DAY", { ...verified, approvedAdvancedSessionIds: approvedIdsForFamilies(["sprints_max_tests"]) })).toBe(true);
  });
});
