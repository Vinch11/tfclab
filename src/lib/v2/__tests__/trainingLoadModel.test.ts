import { describe, it, expect } from "vitest";
import {
  computePmc,
  computePmcAllSports,
  nolioSportIdToBucket,
  detectSyncGap,
  CTL_TAU,
  ATL_TAU,
} from "@/lib/v2/trainingLoadModel";

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

describe("trainingLoadModel EMA", () => {
  it("CTL converges to steady TSS with tau=42", () => {
    const start = "2026-01-01";
    const daily = Array.from({ length: 300 }, (_, i) => ({
      date: addDays(start, i),
      tss: 100,
    }));
    const series = computePmc(daily);
    const last = series[series.length - 1];
    expect(last.ctl).toBeGreaterThan(99.5);
    expect(last.ctl).toBeLessThanOrEqual(100);
    expect(last.atl).toBeGreaterThan(99.9);
  });

  it("CTL after 42 days of 100 TSS approaches 63.4 (1 - 1/e)", () => {
    const start = "2026-01-01";
    const daily = Array.from({ length: 42 }, (_, i) => ({
      date: addDays(start, i),
      tss: 100,
    }));
    const series = computePmc(daily);
    // Discrete EMA with alpha=1/42 for 42 steps ≈ 63.7
    const day42 = series[41];
    expect(day42.ctl).toBeGreaterThan(60);
    expect(day42.ctl).toBeLessThan(66);
  });

  it("TSB uses YESTERDAY values (CTL_prev - ATL_prev)", () => {
    const start = "2026-01-01";
    const daily = [
      { date: addDays(start, 0), tss: 200 },
      { date: addDays(start, 1), tss: 0 },
    ];
    const series = computePmc(daily);
    // Day 0: prevCtl=0, prevAtl=0 => tsb=0
    expect(series[0].tsb).toBe(0);
    // Day 1: prevCtl=200/42, prevAtl=200/7
    const expected =
      Math.round(((200 / CTL_TAU) - (200 / ATL_TAU)) * 100) / 100;
    expect(series[1].tsb).toBe(expected);
  });

  it("missing days count as TSS=0 (real rest)", () => {
    const start = "2026-01-01";
    // Only one session on day 0, then nothing for 6 days
    const daily = [{ date: start, tss: 100 }];
    const series = computePmc(daily, {
      startDate: start,
      endDate: addDays(start, 6),
    });
    expect(series).toHaveLength(7);
    // ATL decays: after day 0 ATL≈14.29, then multiplied by (1 - 1/7) each day
    const atl0 = 100 / ATL_TAU;
    const atl6 = atl0 * Math.pow(1 - 1 / ATL_TAU, 6);
    expect(Math.abs(series[6].atl - atl6)).toBeLessThan(0.05);
  });

  it("global bucket sums per-sport TSS per day", () => {
    const rows = [
      { date: "2026-01-01", sport: "swim" as const, tss: 40 },
      { date: "2026-01-01", sport: "bike" as const, tss: 80 },
      { date: "2026-01-01", sport: "run" as const, tss: 30 },
      { date: "2026-01-02", sport: "run" as const, tss: 50 },
    ];
    const series = computePmcAllSports(rows);
    expect(series.global[0].tss).toBe(150);
    expect(series.global[1].tss).toBe(50);
    expect(series.swim[0].tss).toBe(40);
    expect(series.bike[0].tss).toBe(80);
  });

  it("Nolio sport_id → bucket mapping", () => {
    expect(nolioSportIdToBucket(19)).toBe("swim");
    expect(nolioSportIdToBucket(14)).toBe("bike");
    expect(nolioSportIdToBucket(18)).toBe("bike");
    expect(nolioSportIdToBucket(2)).toBe("run");
    expect(nolioSportIdToBucket(52)).toBe("run");
    expect(nolioSportIdToBucket(20)).toBe("other");
    expect(nolioSportIdToBucket(null)).toBe("other");
  });

  it("detectSyncGap: flags 5+ zero days after regular activity", () => {
    const ref = "2026-06-10";
    const rows: Array<{ date: string; tss: number }> = [];
    // 14 prior days: 5 active
    for (let i = 6; i < 20; i++) {
      rows.push({ date: addDays(ref, -i), tss: i % 3 === 0 ? 60 : 0 });
    }
    // last 6 days all zero (implicit)
    const res = detectSyncGap(rows, { referenceDate: ref });
    expect(res.flagged).toBe(true);
    expect(res.gapDays).toBeGreaterThanOrEqual(5);
  });

  it("detectSyncGap: does NOT flag athlete with recent activity", () => {
    const ref = "2026-06-10";
    const rows = [
      { date: addDays(ref, -1), tss: 80 },
      { date: addDays(ref, -3), tss: 50 },
    ];
    const res = detectSyncGap(rows, { referenceDate: ref });
    expect(res.flagged).toBe(false);
  });

  it("detectSyncGap: does NOT flag athlete without prior sync pattern", () => {
    const ref = "2026-06-10";
    // Only one session 3 weeks ago → no established pattern
    const rows = [{ date: addDays(ref, -25), tss: 100 }];
    const res = detectSyncGap(rows, { referenceDate: ref });
    expect(res.flagged).toBe(false);
  });
});
