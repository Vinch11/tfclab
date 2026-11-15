import { describe, expect, it } from "vitest";
import { buildCoachVolumeBudget, recommendedWeeklyRange, resolveCoachHoursReference } from "../sessionSizingMatrix";
import { validateCoachInitialLoad, validateCoachVolumeBudgets } from "@/lib/plan/coachVolumeValidation";

// Reference hours are planning inputs, never measured athlete load.
describe("Auto uses the displayed sport and ambition range, not a hidden midpoint", () => {
  it("Ironman competitor resolves the displayed 15–20 h endurance reference", () => {
    expect(resolveCoachHoursReference("Ironman", "competitor")).toEqual({ hours: 15, minHours: 15, maxHours: 20, source: "recommended-range" });
  });
  it.each(["IM", "703", "Marathon", "Semi", "10K", "5K", "Sprint", "Olympic", "StartToRun"])("%s uses the same endpoints as the display", objective => {
    const displayed = recommendedWeeklyRange(objective, "competitor");
    const resolved = resolveCoachHoursReference(objective, "competitor");
    expect(displayed).not.toBeNull();
    expect(resolved).toMatchObject({ minHours: displayed?.hours[0], maxHours: displayed?.hours[1], source: "recommended-range" });
  });
  it("explicit coach hours take precedence over the reference", () => {
    expect(resolveCoachHoursReference("IM", "competitor", 12)).toEqual({ hours: 12, source: "coach" });
  });
  it("uncovered objectives have no invented hours", () => {
    expect(resolveCoachHoursReference("Trail ultra", "competitor")).toBeUndefined();
    expect(resolveCoachHoursReference("Unrecognized sport", "elite")).toBeUndefined();
  });
  it("beginner walk/run retains the existing 1–3 h safety envelope", () => {
    expect(recommendedWeeklyRange("StartToRun", "competitor")?.hours).toEqual([1, 3]);
  });
});

const ramp = { week1HoursMax: 12, weeklyHoursTarget: 15, weeklyHoursMin: 15, weeklyHoursMax: 20,
  week1PctTarget: .8, rampWeeks: 2, weeklyIncreasePctMax: .1 };
const shape = { totalWeeks: 32, objective: "IM" };
describe("Auto reference reaches weekly contracts without overriding recovery", () => {
  it("uses the low endpoint after ramp and increases the target before taper", () => {
    const early = buildCoachVolumeBudget(ramp, 5, "load", "recommended-range", shape);
    const late = buildCoachVolumeBudget(ramp, 29, "load", "recommended-range", shape);
    expect(early?.targetMinutes).toBeGreaterThanOrEqual(15 * 60);
    expect(late?.targetMinutes).toBeGreaterThan(early?.targetMinutes ?? Infinity);
    expect(late?.maxMinutes).toBeLessThanOrEqual(20 * 60);
  });
  it("recovery is below the surrounding load target", () => {
    const load = buildCoachVolumeBudget(ramp, 8, "load", "recommended-range", shape);
    const recovery = buildCoachVolumeBudget(ramp, 8, "recovery", "recommended-range", shape);
    expect(recovery?.targetMinutes).toBeLessThan(load?.targetMinutes ?? 0);
    expect(recovery?.maxMinutes).toBeLessThan(15 * 60);
  });
  it("race is exempt and taper has its own reduced envelope", () => {
    expect(buildCoachVolumeBudget(ramp, 32, "race", "recommended-range", shape)).toBeUndefined();
    expect(buildCoachVolumeBudget(ramp, 31, "taper", "recommended-range", shape)?.maxMinutes).toBeLessThan(15*60);
  });
  it("strength cannot hide an endurance deficit and Auto still requires initial review", () => {
    const budget = buildCoachVolumeBudget(ramp, 1, "load", "recommended-range", shape);
    const plan = { weeks: [{ weekNumber: 1, phase: "base", sessions: [
      { sport: "bike", durationMin: 600, title: "Endurance", details: "", isRest: false },
      { sport: "strength", durationMin: 300, title: "Renforcement", details: "", isRest: false },
    ] }] };
    const quotas = { 1: { weekType: "load", volumeBudget: budget } };
    expect(validateCoachVolumeBudgets(plan, quotas)).toContainEqual(expect.objectContaining({ rule: "coach_volume_under_min", severity: "error" }));
    expect(validateCoachInitialLoad(plan, quotas)).toContainEqual(expect.objectContaining({ rule: "coach_initial_load_unverified", severity: "warning" }));
  });
});