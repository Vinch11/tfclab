import { afterEach, describe, expect, it, vi } from "vitest";
import { computeAppAthleteContext } from "../appPlanningPipeline";
import { legacyAppDiagnostic } from "./fixtures/legacyAppDiagnostic";

// Compare against the actual pre-integration callback, not another call to the
// extracted builder. Synthetic rows only; no network and no paid generation.
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
describe("existing app diagnostic preserved when connecting DET", () => {
  it.each(["Marathon", "Semi", "10K", "TrailShort", "TrailMountain", "703", "IM"])(
    "%s: complete diagnostic and limiter ranking equal the pre-DET app", (objective) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-11-04T12:00:00Z"));
      vi.spyOn(console, "log").mockImplementation(() => {});
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("NETWORK_FORBIDDEN"); });
      const athlete = { id: "parity-synthetic", name: "Synthetic parity", birth_date: "1984-03-11", sex: "M", weight: 85 };
      for (const pace of [222, 300]) {
        const src = { snapshots: [{ id: "s1", athlete_id: athlete.id, date: "2026-11-01", sport_main: "run", ftp: 296, weight: 85,
          vma: 17, vo2max: 56, css: 95, fc_max: 185, pace_threshold_sec_per_km: pace, vlamax: 0.45,
          vlamax_run: 0.4, tte_observed_min: 45, tte_observed_min_run: 40, fatigue_state: "normal",
          run_economy_score: 72, run_hr_drift_pct: 4, tss_7d: 380 }], tests: [],
          checkins: [{ date_iso: "2026-11-03", sleep: 7, fatigue: 3, soreness: 2, stress: 4, motivation: 8, pain_flag: false }] };
        const reference = legacyAppDiagnostic(athlete, objective, "age_group", src);
        const current = computeAppAthleteContext(athlete, objective, "age_group", src);
        expect(reference).not.toBeNull();
        expect(current?.diagnostic).toEqual(reference);
      }
    });
});
