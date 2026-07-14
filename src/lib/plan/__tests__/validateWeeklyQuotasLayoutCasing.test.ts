import { describe, it, expect } from "vitest";
import { validateWeeklyQuotas, type WeekQuotaEntry } from "../validateWeeklyQuotas";
import type { MergedPlan } from "../mergePlanChunks";
import { buildWeeklySlotLayout } from "@/engines/plan/weeklySlotLayout";
import { getWeeklyQuotaFor } from "@/engines/plan/sessionSizingMatrix";

// PHASE 2A.2 fix 1 — layout_drift ne doit plus faux-positiver sur casse jour.
describe("validateWeeklyQuotas — layout_drift casing insensitive", () => {
  it("sessions Mardi/Jeudi (capitalisées) matchent layout mardi/jeudi (lowercase)", () => {
    const q = getWeeklyQuotaFor({
      objectiveKey: "SEMI",
      ambition: "age_group",
      weeklyHours: 6,
    });
    const layout = buildWeeklySlotLayout(q.quota, q.floors, "load");
    const entry: WeekQuotaEntry = {
      quota: q.quota, floors: q.floors, weekType: "load",
      downgraded: false, layout,
    };
    // On construit une "vraie" semaine avec dayName capitalisés (comme mergePlanChunks)
    // couvrant TOUS les slots attendus par le layout, pour vérifier ZÉRO drift.
    const sessions = layout.days.flatMap(d => {
      if (d.isRest) return [];
      return d.slots.map((s, i) => ({
        weekNumber: 1, weekTheme: "", phase: "build" as const,
        dayName: d.dayName[0].toUpperCase() + d.dayName.slice(1),
        dayIndex: 0, sport: s.sport, title: `${s.sport} ${i}`, details: "",
        isRest: false, isKeySession: !!s.isKeySession, catalogId: null,
        custom: true, durationMin: s.minDurationMin ?? 90, zones: [],
      }));
    });
    const merged: MergedPlan = {
      title: "T", phases: [], totalWeeks: 1,
      weeks: [{ weekNumber: 1, theme: "", phase: "build", sessions }],
    };
    const issues = validateWeeklyQuotas(merged, { 1: entry });
    const layoutDrifts = issues.filter(i => i.code === "layout_drift");
    expect(layoutDrifts, JSON.stringify(layoutDrifts, null, 2)).toEqual([]);
  });
});
