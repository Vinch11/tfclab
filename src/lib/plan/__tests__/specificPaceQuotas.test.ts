import { describe, it, expect } from "vitest";
import { expectedSpecificMinutes, checkSpecificPaceQuotas, racePaceMinutes, weeklyPaceObjective } from "../specificPaceQuotas";

describe("quotas d'allure spécifique", () => {
  it("Séville 21 février prime sur IM 27 juin sans devenir un pic A", () => {
    const calendar = {planStartDate:"2026-11-16", objective:"IRONMAN", raceDate:"2027-06-27", raceGoals:[{objective:"Marathon",raceDate:"2027-02-21",priority:"B"}]};
    expect(weeklyPaceObjective("IRONMAN", 1, calendar)).toBe("marathon");
    expect(weeklyPaceObjective("IRONMAN", 14, calendar)).toBe("marathon");
    expect(weeklyPaceObjective("IRONMAN", 18, calendar)).toBe("IRONMAN");
    expect(calendar.raceGoals[0].priority).toBe("B");
  });
  it("allure IM facultative en base, sans supprimer l'allure marathon", () => {
    expect(expectedSpecificMinutes("IRONMAN", "base", "competitor")).toEqual([0,60]);
    expect(expectedSpecificMinutes("Marathon", "base", "competitor")).toEqual([15,20]);
  });
  it("le cycle marathon est vérifié comme marathon et le vélo ne remplit pas son quota", () => {
    const w = {weekNumber:1,phase:"base",cycleObjective:"Marathon",sessions:[{title:"Vélo",details:"3×10min allure course",sport:"bike",isRest:false,durationMin:60},{title:"Course",details:"15min à allure marathon",sport:"run",isRest:false,durationMin:100}]};
    expect(checkSpecificPaceQuotas({weeks:[w]}, "IRONMAN", "competitor")).toEqual([]);
    expect(checkSpecificPaceQuotas({weeks:[{...w,sessions:w.sessions.slice(0,1)}]}, "IRONMAN", "competitor")[0]?.rule).toBe("specific_pace_quota_low");
  });
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

describe("niveau et coefficient coach", () => {
  it("débutant plafonné ×0,6 en spécifique", () => {
    expect(expectedSpecificMinutes("10 km", "specific", "competitor", undefined, { trainingLevel: "untrained" })).toEqual([15, 24]);
  });
  it("coefficient coach remplace l'ambition", () => {
    expect(expectedSpecificMinutes("10 km", "specific", "finisher", undefined, { coachCoef: 1.2 })).toEqual([30, 48]);
  });
});
