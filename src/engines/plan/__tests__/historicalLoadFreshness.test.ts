import { afterEach, describe, expect, it, vi } from "vitest";
import { computeDiagnostic } from "@/engines/diagnostic/computeDiagnostic";
import { QA_PROFILES } from "@/lib/plan/qa/syntheticProfiles";
import { buildPilotDiagnosticInput } from "@/lib/plan/qa/preparePilotTrainingPlanContext";
import { buildPlanConfigFromDiagnostic } from "../planConfigBuilder";
const profile = QA_PROFILES.find(p => p.id === "B-10K")!;
function prepare(date: string | null | undefined, tss7d: number | null = 240) {
  const diagnostic = computeDiagnostic({ ...buildPilotDiagnosticInput(profile), tss7d, snapshotDate: date });
  const before = JSON.stringify(diagnostic);
  const config = buildPlanConfigFromDiagnostic(diagnostic, { objective: "10K", ambition: "world_class", trainingLevel: "light", weeksAvailable: 12 });
  expect(JSON.stringify(diagnostic)).toBe(before);
  return { config, diagnostic };
}
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
describe("historical TSS is not current planning load", () => {
  it.each(["2026-06-30", null, undefined])("%s cannot silently change dose", date => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-26T12:00:00Z"));
    const { config, diagnostic } = prepare(date);
    expect(diagnostic._rawInput.tss7d).toBe(240);
    expect(config.recentLoad!.tss7d).toBeNull();
    expect(config.recentLoad!.status).toBe("unknown");
    expect(config.volumeRamp!.recentLoadAdjustment).toBeUndefined();
    expect(config.volumeRamp!.week1PctTarget).toBe(0.6);
    expect(config.volumeRamp!.week1HoursMax).toBe(2.4);
    expect(config.ambitionMeta!.trainingLevel).toBe("light");
    expect(config.weeklyHoursSource).toBe("internal-matrix");
  });
});

import { resolvePlanningSnapshotLoad } from "@/lib/planningSnapshotLoad";
import { SNAPSHOT_LOAD_FRESHNESS_DAYS, computeCRR } from "@/lib/chargeRecenteReference";
import { buildCoachVolumeBudget, computeWeekQuotaEntry, inferWeekType } from "../sessionSizingMatrix";
import { validateCoachLoadIssues } from "@/lib/plan/coachVolumeValidation";

describe("existing freshness convention, planning only", () => {
  const now = new Date("2026-10-26T12:00:00Z");
  it.each([
    ["2026-10-26", 240, "recent", 240],
    ["2026-10-12", 240, "recent", 240],
    ["2026-10-11", 240, "stale", null],
    ["2026-06-30", 240, "stale", null],
    [null, 240, "missing-date", null],
    ["nonsense", 240, "invalid-date", null],
    ["2026-02-30", 240, "invalid-date", null],
    ["2026-10-27", 240, "future-date", null],
    ["2026-10-26", 0, "missing-value", null],
    ["2026-10-26", null, "missing-value", null],
  ] as const)("%s / %s → %s", (date, tss, reason, usable) => {
    expect(resolvePlanningSnapshotLoad(tss, date, now)).toEqual({ tss7d: usable, reason });
  });
  it("reuses the 14-day convention without invalidating historical physiological CRR", () => {
    vi.useFakeTimers(); vi.setSystemTime(now);
    expect(SNAPSHOT_LOAD_FRESHNESS_DAYS).toBe(14);
    const historic = computeCRR({ tss7d: 240, snapshotDate: "2026-06-30" });
    expect(historic).toMatchObject({ value: 240, source: "SNAPSHOT", isValid: true });
    expect(resolvePlanningSnapshotLoad(historic.value, historic.lastUpdated, now).tss7d).toBeNull();
  });
  it("fresh measured load retains the existing recovery rule, manual level and limiters", () => {
    vi.useFakeTimers(); vi.setSystemTime(now);
    const d = computeDiagnostic({ ...buildPilotDiagnosticInput(profile), tss7d: 1000, snapshotDate: "2026-10-25" });
    const c = buildPlanConfigFromDiagnostic(d, { objective: "10K", ambition: "world_class", trainingLevel: "highly_trained", weeksAvailable: 12 });
    expect(c.recentLoad).toMatchObject({ source: "SNAPSHOT", tss7d: 1000, status: "overload" });
    expect(c.ambitionMeta!.trainingLevel).toBe("highly_trained");
    expect(c.volumeRamp!.recentLoadAdjustment!.effectiveLevel).toBe("light");
    expect(c.volumeRamp!.weeklyIncreasePctMax).toBe(0.07);
    const oldDateSamePhysiology = computeDiagnostic({ ...d._rawInput, snapshotDate: "2026-06-30" });
    expect(oldDateSamePhysiology.effectifs).toEqual(d.effectifs);
    expect(oldDateSamePhysiology.limiter).toEqual(d.limiter);
    expect(buildPlanConfigFromDiagnostic(oldDateSamePhysiology, { objective: "10K", ambition: "world_class", trainingLevel: "highly_trained", weeksAvailable: 12 }).identifiedLimitersRaw).toEqual(c.identifiedLimitersRaw);
  });
  it("recent low TSS still prudently reduces dose without replacing the chosen light level", () => {
    vi.useFakeTimers(); vi.setSystemTime(now);
    const { config } = prepare("2026-10-25");
    expect(config.recentLoad).toMatchObject({ source: "SNAPSHOT", tss7d: 240, status: "low" });
    expect(config.volumeRamp!.week1PctTarget).toBe(0.4);
    expect(config.volumeRamp!.week1HoursMax).toBe(1.6);
    expect(config.ambitionMeta!.trainingLevel).toBe("light");
  });
  it("stale, missing-date and zero TSS preserve qualitative dose and final checks across 12 weeks", () => {
    vi.useFakeTimers(); vi.setSystemTime(now);
    const scenarios = [prepare("2026-06-30", 240), prepare("2026-06-30", 1000), prepare(null, 240), prepare("2026-10-26", 0), prepare(null, null)];
    const baseline = scenarios[0].config;
    for (const { config: c } of scenarios) {
      expect(c.volumeRamp).toEqual(baseline.volumeRamp);
      expect(c.ambition).toBe(baseline.ambition);
      expect(c.recentLoad!.status).toBe("unknown");
      const quotas = Object.fromEntries(Array.from({ length: 12 }, (_, i) => {
        const n = i + 1, weekType = inferWeekType(n, 12, "10K", 32);
        return [n, { ...computeWeekQuotaEntry("10K", c.ambition!, c.weeklyHours!, weekType, false)!, volumeBudget: buildCoachVolumeBudget(c.volumeRamp, n, weekType, c.weeklyHoursSource) }];
      }));
      // Same synthetic prescription, deliberately below the caps, not a model-generated plan.
      const plan = { weeks: Array.from({ length: 12 }, (_, i) => ({ weekNumber: i + 1, phase: "base", sessions: [
        { sport: "run", title: "Endurance facile", details: "", durationMin: (i + 1) % 4 === 0 ? 56 : 80, isRest: false },
      ] })) };
      expect(validateCoachLoadIssues(plan, quotas).filter(i => i.severity === "error")).toEqual([]);
      expect(validateCoachLoadIssues(plan, quotas).some(i => i.rule === "coach_initial_load_unverified")).toBe(true);
      plan.weeks[0].sessions[0].durationMin = 1000;
      expect(validateCoachLoadIssues(plan, quotas).some(i => i.rule === "coach_load_violation" && i.severity === "error")).toBe(true);
    }
  });
});


import * as decisionEngine from "@/engines/decision";
import { prepareTrainingPlanContext } from "../prepareTrainingPlanContext";
describe("real preparation path retains history but gates decision load", () => {
  it.each(["2026-06-30", null, "2026-10-25"])("%s gates the planning decision context too", date => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-26T12:00:00Z"));
    const spy = vi.spyOn(decisionEngine, "computeDecision");
    const { diagnostic } = prepare(date);
    const result = prepareTrainingPlanContext({ diagnostic, formConfig: {
      objective: "10K", ambition: "world_class", trainingLevel: "light", weeksAvailable: 12,
    } });
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls.at(-1)![0].load!.tss7d).toBe(date === "2026-10-25" ? 240 : null);
    expect(result.diagnostic._rawInput.tss7d).toBe(240);
    expect(result.diagnostic.limiter).toEqual(diagnostic.limiter);
    expect(result.diagnostic.effectifs).toEqual(diagnostic.effectifs);
  });
});
