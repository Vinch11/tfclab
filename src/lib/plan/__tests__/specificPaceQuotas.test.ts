import { describe, it, expect } from "vitest";
import { expectedSpecificMinutes, checkSpecificPaceQuotas, racePaceMinutes } from "../specificPaceQuotas";

describe("quotas d'allure spécifique", () => {
  it("10 km compétiteur, phase spécifique : 25–40 min", () => {
    expect(expectedSpecificMinutes("10 km", "specific", "competitor")).toEqual([25, 40]);
  });
  it("finisher ×0,5 et élite ×1,2", () => {
    expect(expectedSpecificMinutes("marathon", "specific", "finisher")).toEqual([30, 60]);
    expect(expectedSpecificMinutes("marathon", "specific", "elite")).toEqual([72, 144]);
  });
  it("plafond 20 % du volume hebdo", () => {
    expect(expectedSpecificMinutes("marathon", "specific", "competitor", 200)).toEqual([40, 40]);
  });
  it("lit 3×8' à allure 10 km = 24 min", () => {
    expect(racePaceMinutes("Échauffement 15' puis 3×8' allure 10 km r 2'")).toBe(24);
  });
  it("avertit si une semaine spécifique 10 km n'a aucune allure de course", () => {
    const plan = { weeks: [{ weekNumber: 5, phase: "Spécifique", sessions: [{ title: "Footing", details: "45' Z2", isRest: false, durationMin: 45 }] }] };
    const issues = checkSpecificPaceQuotas(plan, "10K", "competitor");
    expect(issues[0]).toMatchObject({ rule: "specific_pace_quota_low", severity: "warning" });
  });
});
