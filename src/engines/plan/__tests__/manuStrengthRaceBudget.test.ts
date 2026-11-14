import { describe, expect, it } from "vitest";
import { computeWeekQuotaEntry } from "../sessionSizingMatrix";
import { buildWeeklySlotLayout } from "../weeklySlotLayout";
import { planningFeasibility } from "../../../../supabase/functions/_shared/planningFeasibility";

describe("Manu mandatory strength budget", () => {
  it("funds both of the coach's two strength sessions in the Ironman race week", () => {
    const entry = computeWeekQuotaEntry("Ironman", "competitor", 17.5, "race", false,
      { strengthSessionsPerWeek: 2, maxSessionsPerDay: 3 });
    if (!entry) throw new Error("Missing Ironman quota");
    expect(entry.quota.strength).toEqual({ min: 2, max: 2 });
    expect(entry.quota.totalSessions).toEqual({ min: 12, max: 12 });
    const layout = buildWeeklySlotLayout(entry.quota, entry.floors, "race");
    expect(layout.days.flatMap(d => d.slots).filter(s => s.sport === "strength")).toHaveLength(2);
    expect(planningFeasibility(entry.quota, layout)).toEqual([]);
  });

  it.each(["5K", "10K", "Semi", "Marathon", "Ironman 70.3", "Ironman"])(
    "keeps %s race and load calendars feasible for an explicit 0 or 2 strength sessions", objective => {
      for (const weekType of ["load", "recovery", "taper", "race"] as const) {
        for (const strength of [0, 2]) {
          const entry = computeWeekQuotaEntry(objective, "competitor", 17.5, weekType, false,
            { strengthSessionsPerWeek: strength, maxSessionsPerDay: 3 });
          if (!entry) throw new Error(`Missing quota: ${objective}`);
          expect(entry.quota.strength).toEqual({ min: strength, max: strength });
          expect(entry.quota.totalSessions.min).toBeLessThanOrEqual(entry.quota.totalSessions.max);
          expect(planningFeasibility(entry.quota, buildWeeklySlotLayout(entry.quota, entry.floors, weekType))).toEqual([]);
        }
      }
    });
});