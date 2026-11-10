import { describe, it, expect } from "vitest";
import { computeWeekQuotaEntry } from "../sessionSizingMatrix";
import { buildWeeklySlotLayout } from "../weeklySlotLayout";
import { planningFeasibility } from "@/lib/plan/planningFeasibility";

function entry(opts: Parameters<typeof computeWeekQuotaEntry>[5] = {}) {
  const value = computeWeekQuotaEntry("Marathon", "age_group", 10, "load", false, { sessionsPerWeek: 5, ...opts });
  if (!value) throw Error("Missing marathon quota");
  return value;
}
describe("configuration changes deterministic prescription", () => {
  it("zero strength clears quota, floor and calendar", () => {
    const q = entry({ strengthSessionsPerWeek: 0 });
    expect(q.quota.strength).toEqual({ min: 0, max: 0 });
    expect(q.floors.minStrengthPerWeek).toBe(0);
    expect(buildWeeklySlotLayout(q.quota, q.floors, "load").days.flatMap(d => d.slots).filter(s => s.sport === "strength")).toHaveLength(0);
  });
  it("three strength sessions are additional to five cardio", () => {
    const q = entry({ strengthSessionsPerWeek: 3 });
    expect(q.quota.strength).toEqual({ min: 3, max: 3 });
    expect(q.quota.totalSessions).toEqual({ min: 8, max: 8 });
  });
  it("zero doubles never creates a double and reports an impossible eight-slot request", () => {
    const q = entry({ strengthSessionsPerWeek: 3, maxDoubleDaysPerWeek: 0 });
    const l = buildWeeklySlotLayout(q.quota, q.floors, "load");
    expect(l.days.every(d => d.slots.length <= 1)).toBe(true);
    expect(planningFeasibility(q.quota, l)).toContain("minimum_sessions_exceed_available_capacity");
  });
  it("maintenance requires two bike and two swim, preserves run and prohibits brick", () => {
    const base = entry({ strengthSessionsPerWeek: 0 });
    const q = entry({ strengthSessionsPerWeek: 0, maintenance: { velo: true, natation: true } });
    expect(q.quota.run).toEqual(base.quota.run);
    expect(q.quota.bike).toEqual({ min: 2, max: 2 });
    expect(q.quota.swim).toEqual({ min: 2, max: 2 });
    expect(q.quota.brick.max).toBe(0);
    expect(q.quota.totalSessions.min).toBe(9);
  });
  it("unchecked maintenance removes both sports only in a run cycle", () => {
    const q = entry({ maintenance: { velo: false, natation: false } });
    expect(q.quota.bike.max).toBe(0); expect(q.quota.swim.max).toBe(0);
    const tri = computeWeekQuotaEntry("703", "age_group", 10, "load", false);
    expect(tri?.quota.swim.min).toBe(3);
  });
  it("maximum one double is respected even by fallback placement", () => {
    const q = entry({ strengthSessionsPerWeek: 2, maxDoubleDaysPerWeek: 1 });
    const l = buildWeeklySlotLayout(q.quota, q.floors, "load");
    expect(l.days.filter(d => d.slots.length >= 2).length).toBeLessThanOrEqual(1);
  });
});