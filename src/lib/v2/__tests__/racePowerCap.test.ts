import { describe, it, expect } from "vitest";
import { capBikeRaceIF } from "../racePowerCap";

describe("capBikeRaceIF — cap logarithmique IF vélo par TTE", () => {
  it("cas Cath : 703 age_group, TTE 35', bike leg 150' → IF ≤ 0.75", () => {
    const r = capBikeRaceIF({ objective: "703", ambition: "age_group", tteMin: 35, raceDurationMin: 150 });
    expect(r).not.toBeNull();
    expect(r!.wasCapped).toBe(true);
    expect(r!.cappedPctFTP).toBeLessThanOrEqual(75);
    expect(r!.cappedPctFTP).toBeGreaterThanOrEqual(72);
    expect(r!.baselineIF).toBe(0.80);
  });

  it("TTE suffisante (60') pour 703 150' → pas de cap", () => {
    const r = capBikeRaceIF({ objective: "703", ambition: "age_group", tteMin: 60, raceDurationMin: 150 });
    expect(r!.wasCapped).toBe(false);
    expect(r!.cappedPctFTP).toBe(80);
  });

  it("IM elite TTE 45' bike 270' → cap significatif", () => {
    const r = capBikeRaceIF({ objective: "im", ambition: "elite", tteMin: 45, raceDurationMin: 270 });
    expect(r!.wasCapped).toBe(true);
    expect(r!.cappedPctFTP).toBeLessThan(79);
    expect(r!.cappedPctFTP).toBeGreaterThanOrEqual(72);
  });

  it("objectif non-tri → null (marathon, semi, trail non concernés)", () => {
    expect(capBikeRaceIF({ objective: "marathon", ambition: "age_group", tteMin: 35 })).toBeNull();
    expect(capBikeRaceIF({ objective: "semi", ambition: "elite", tteMin: 30 })).toBeNull();
    expect(capBikeRaceIF({ objective: "trail", ambition: "elite", tteMin: 40 })).toBeNull();
  });

  it("TTE null → renvoie baseline avec warning", () => {
    const r = capBikeRaceIF({ objective: "703", ambition: "age_group", tteMin: null });
    expect(r!.wasCapped).toBe(false);
    expect(r!.rationale).toContain("TTE non observée");
  });

  it("floor IF 0.55 respecté même TTE catastrophique", () => {
    const r = capBikeRaceIF({ objective: "im", ambition: "finisher", tteMin: 10, raceDurationMin: 400 });
    expect(r!.cappedIF).toBeGreaterThanOrEqual(0.55);
  });
});
