import { describe, expect, it, vi } from "vitest";
import { applySlFloorIndividualization, computeWeekQuotaEntry } from "@/engines/plan/sessionSizingMatrix";
import { snapshotSLFloorAudit, traceSLFloorConsumer } from "../slFloorAudit";
import { buildWeekQuotaTransport } from "../weekQuotaTransport";
import { validateWeeklyQuotas } from "../validateWeeklyQuotas";
import type { MergedPlan } from "../mergePlanChunks";

describe("tracer les valeurs déjà calculées, y compris individualisation inactive", () => {
  it.each([null, { week1PctTarget: 0.8, rampWeeks: 2, weeklyIncreasePctMax: 0.1 }])("rampe %j : provenance conservée dans le même quota sérialisé et validé", volumeRamp => {
    const nominal = computeWeekQuotaEntry("703", "age_group", 12, "load", false)!;
    const result = applySlFloorIndividualization(nominal.floors, 1, "load", volumeRamp, null);
    const floorAudit = snapshotSLFloorAudit({ localWeek: 1, globalWeek: 1, weeklyHours: 12, volumeRamp, injuryRisk: null,
      nominal: nominal.floors, individualized: result.floors, reasons: result.reasons, appliedPct: result.appliedPct });
    const entry = { ...nominal, floors: result.floors, floorAudit };
    const sent = JSON.parse(JSON.stringify(buildWeekQuotaTransport(1, entry)))._weeklyQuotas[1];
    expect(sent.floorAudit.volumeRamp).toEqual(volumeRamp);
    expect(sent.floorAudit.nominal.slLongRideMin).toBe(120);
    expect(sent.floorAudit.individualized.slLongRideMin).toBe(volumeRamp ? 95 : 120);
    expect(sent.floors).toEqual(sent.floorAudit.individualized);
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      const issues = validateWeeklyQuotas({ weeks: [{ weekNumber: 1, sessions: [] }] } as unknown as MergedPlan, { 1: sent });
      expect(issues.some(i => i.severity === "critical")).toBe(true);
      expect(spy.mock.calls[0][1]).toMatchObject({ stage: "validation", consumedFloors: result.floors });
      const before = spy.mock.calls.length;
      traceSLFloorConsumer("post_processing", 1, { ...entry, floorAudit: undefined });
      expect(spy.mock.calls.length).toBe(before); // no invented history
    } finally { spy.mockRestore(); }
    nominal.floors.slLongRideMin = 999;
    expect(floorAudit.nominal.slLongRideMin).toBe(120); // immutable snapshot, no live-form reread
  });
});
