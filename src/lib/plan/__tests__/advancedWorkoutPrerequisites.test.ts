import { describe, expect, it } from "vitest";
import { isLevelPrerequisiteIncompatible } from "@/lib/plan/levelPrerequisiteCompatibility";

const ID = "NORWEGIAN_RUN_DOUBLE_THRESHOLD_DAY";

describe("prérequis déterministes — journée double seuil norvégienne", () => {
  it("refuse l'absence de profil vérifié", () => {
    expect(isLevelPrerequisiteIncompatible(ID, undefined)).toBe(true);
    expect(isLevelPrerequisiteIncompatible(ID, {
      trainingLevel: "highly_trained",
      trainingLevelSource: "fallback-prudent",
      weeklyHours: 12,
    })).toBe(true);
  });

  it("refuse un niveau ou un volume insuffisant", () => {
    expect(isLevelPrerequisiteIncompatible(ID, {
      trainingLevel: "light",
      trainingLevelSource: "manual",
      weeklyHours: 10,
    })).toBe(true);
    expect(isLevelPrerequisiteIncompatible(ID, {
      trainingLevel: "highly_trained",
      trainingLevelSource: "manual",
      weeklyHours: 7,
    })).toBe(true);
  });

  // Depuis la revue lactate/norvégien du 2026-11-09, une vraie double journée
  // exige en plus une approbation coach nominative
  // (`workoutSafetyPrerequisites.ts`, `lactateNorwegianReview.test.ts`).
  it("un profil hautement entraîné avec au moins 8 h ne suffit plus sans approbation nominative", () => {
    const profile = { trainingLevel: "highly_trained", trainingLevelSource: "manual", weeklyHours: 8 };
    expect(isLevelPrerequisiteIncompatible(ID, profile)).toBe(true);
    expect(isLevelPrerequisiteIncompatible(ID, { ...profile, approvedAdvancedSessionIds: [ID] })).toBe(false);
  });

  it("l'approbation du coach ne lève ni le niveau ni le volume, et reste limitée à cette fiche", () => {
    expect(isLevelPrerequisiteIncompatible(ID, {
      trainingLevel: "light",
      trainingLevelSource: "manual",
      weeklyHours: 4,
      approvedAdvancedSessionIds: [ID],
    })).toBe(true);
    expect(isLevelPrerequisiteIncompatible("NORWEGIAN_WEEK_STRUCTURE_RUN", {
      trainingLevel: "highly_trained",
      trainingLevelSource: "manual",
      weeklyHours: 12,
      approvedAdvancedSessionIds: [ID],
    })).toBe(true);
  });
});
