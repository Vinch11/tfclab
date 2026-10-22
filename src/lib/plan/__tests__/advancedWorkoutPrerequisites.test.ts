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

  it("autorise uniquement un profil hautement entraîné avec au moins 8 h", () => {
    expect(isLevelPrerequisiteIncompatible(ID, {
      trainingLevel: "highly_trained",
      trainingLevelSource: "manual",
      weeklyHours: 8,
    })).toBe(false);
  });

  it("permet une décision explicite du coach limitée à cette fiche", () => {
    expect(isLevelPrerequisiteIncompatible(ID, {
      trainingLevel: "light",
      trainingLevelSource: "manual",
      weeklyHours: 4,
      approvedAdvancedSessionIds: [ID],
    })).toBe(false);
    expect(isLevelPrerequisiteIncompatible("NORWEGIAN_WEEK_STRUCTURE_RUN", {
      trainingLevel: "light",
      trainingLevelSource: "manual",
      weeklyHours: 4,
      approvedAdvancedSessionIds: [ID],
    })).toBe(true);
  });
});

