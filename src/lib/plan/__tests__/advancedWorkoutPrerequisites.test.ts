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
      approvedAdvancedSessionIds: [ID],
    })).toBe(false);
  });

  it("une décision explicite ne contourne pas le niveau et le volume", () => {
    expect(isLevelPrerequisiteIncompatible(ID, {
      trainingLevel: "light",
      trainingLevelSource: "manual",
      weeklyHours: 4,
      approvedAdvancedSessionIds: [ID],
    })).toBe(true);
    expect(isLevelPrerequisiteIncompatible("NORWEGIAN_WEEK_STRUCTURE_RUN", {
      trainingLevel: "light",
      trainingLevelSource: "manual",
      weeklyHours: 4,
      approvedAdvancedSessionIds: [ID],
    })).toBe(true);
  });
});
