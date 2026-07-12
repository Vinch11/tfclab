import { describe, it, expect } from "vitest";
import { computeLorangStrategy, type LorangStrategyInput } from "../lorangStrategyEngine";

const baseInput = (overrides: Partial<LorangStrategyInput> = {}): LorangStrategyInput => ({
  physiology: {
    vo2max: 55,
    vo2maxTarget: 58,
    ftpKg: 3.5,
    ftpKgTarget: 3.8,
    vlamax: 0.44,
    vlamaxTarget: 0.30, // ← BUG SIMULÉ : target bike au lieu de run
    tte: 35,
    tteTarget: 50,
    fatmax: 65,
    fatmaxTarget: 65,
    economy: 75,
  },
  athlete: {
    age: 35,
    discipline: "703",
    ambition: "age_group",
    hasGIIssues: false,
  },
  availability: { score: 80, level: "high", hasAlerts: false, hrvOutOfRange2Days: false },
  context: { daysToRace: 120, isRaceWeek: false, currentPhase: "base" },
  ...overrides,
});

describe("Sprint Ban — garde-fou #2 (audit Cath 07/2026)", () => {
  it("cas Cath : 703 age_group VLamax 0.44 (dans range.max 0.44) → PAS de Sprint Ban", () => {
    const result = computeLorangStrategy(baseInput());
    expect(result.hasSprintBan).toBe(false);
    expect(result.prohibitions.find(p => p.prohibition === "sprints")).toBeUndefined();
  });

  it("VLamax 0.55 sur 703 (au-dessus de range.max 0.44) → Sprint Ban fires", () => {
    const result = computeLorangStrategy(
      baseInput({
        physiology: {
          ...baseInput().physiology,
          vlamax: 0.55,
        },
      })
    );
    expect(result.hasSprintBan).toBe(true);
  });

  it("VLamax 0.44 sur marathon (range.max 0.42) → Sprint Ban fires", () => {
    const result = computeLorangStrategy(
      baseInput({
        athlete: { ...baseInput().athlete, discipline: "marathon" },
      })
    );
    expect(result.hasSprintBan).toBe(true);
  });

  it("finisher n'a jamais de Sprint Ban", () => {
    const result = computeLorangStrategy(
      baseInput({
        physiology: { ...baseInput().physiology, vlamax: 0.60 },
        athlete: { ...baseInput().athlete, ambition: "finisher" },
      })
    );
    expect(result.hasSprintBan).toBe(false);
  });

  it("semi/10K/5K : jamais de Sprint Ban (les sprints sont bénéfiques)", () => {
    const result = computeLorangStrategy(
      baseInput({
        physiology: { ...baseInput().physiology, vlamax: 0.70 },
        athlete: { ...baseInput().athlete, discipline: "semi" },
      })
    );
    expect(result.hasSprintBan).toBe(false);
  });
});
