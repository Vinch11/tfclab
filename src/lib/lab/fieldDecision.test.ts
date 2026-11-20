import { describe, expect, it } from "vitest";
import type { DbSnapshot, DbTest } from "@/hooks/useCloudData";
import {
  describeFieldGap,
  rankedFieldGaps,
} from "@/lib/coachingCompass/rankedFieldGaps";
import { fieldDayObservations } from "@/lib/fieldDayObservations";
import { fitBikeOnNolio } from "./nolioCalibration";
import { periodForecast } from "./periodForecast";
import { followupEvidence, raceForecastReview } from "./replay";

const first: DbSnapshot = {
  id: "a",
  athlete_id: "runner",
  coach_id: "c",
  source: "manual",
  date: "2026-01-15",
  created_at: "2026-01-15T01:00:00Z",
  updated_at: "2026-01-15T01:00:00Z",
};
const later = { ...first, id: "b", date: "2026-02-28" };
const rank = {
  metric: {
    metric: "TTE",
    target: 45,
    value: 35,
    gap: -10,
    weightedImpact: 12,
    weight: 0.8,
  },
  impact: 12,
  hypothesis: false,
};
const effort = (durationSec: number, value: number, date = first.date) => ({
  durationSec,
  value,
  date,
});
const bike = [
  [30, 480],
  [120, 340],
  [300, 320],
  [1200, 285],
].map(([t, w]) => effort(t, w));

describe("field decisions for a coach", () => {
  it("expresses native units and an increasing decoupling separately from the inverted ranking gap", () => {
    expect(describeFieldGap(rank).comparison).toContain("-10 min");
    expect(
      describeFieldGap({
        ...rank,
        metric: {
          ...rank.metric,
          metric: "Durabilité (découplage)",
          value: 8,
          target: 5,
          gap: -3,
        },
      }).comparison,
    ).toContain("+3 points");
    expect(rankedFieldGaps(null)).toEqual([]);
  });
  it("preserves isolated real measurements but excludes untouched formula-derived Day durations", () => {
    const old = {
      ...first,
      source: "bike_track_day",
      tte_observed_min: 30,
      coach_notes: "Bilan · TTE 30min",
    };
    expect(fieldDayObservations(old).tte_observed_min).toBeNull();
    expect(
      fieldDayObservations({ ...old, tte_mode: "OBSERVED" }).tte_observed_min,
    ).toBe(30);
    expect(
      fieldDayObservations({ ...old, updated_at: later.date }).tte_observed_min,
    ).toBe(30);
    expect(
      fieldDayObservations({
        ...first,
        source: "track_day",
        vma: 15,
        pace_threshold_sec_per_km: 280,
        tte_observed_min_run: 33,
        coach_notes: "TFCL Track Day™",
      }).tte_observed_min_run,
    ).toBeNull();
  });
  it("reports bounded model sensitivity without changing the fitted values", () => {
    const fit = fitBikeOnNolio(
      {
        vo2max: 55,
        poids: 75,
        vlamaxEffectif: { value: 0.4, source: "estimated", confidence: 0 },
      },
      bike,
    )!;
    expect(fit.sensitivity.profiles).toBeGreaterThan(1);
    expect(fit.sensitivity.vlaMin).toBeLessThanOrEqual(fit.vlamax);
    expect(fit.sensitivity.vlaMax).toBeGreaterThanOrEqual(fit.vlamax);
  });
  it("scores the same future effort against both old predictions, excluding leaked or foreign evidence", () => {
    const repeat = [effort(300, 305, later.date), effort(300, 900, first.date)];
    const score = (rows: DbSnapshot[]) =>
      periodForecast(
        "bike",
        bike,
        repeat,
        first.date,
        later.date,
        first.athlete_id,
        rows,
      );
    const state = { ...first, weight_kg: 75, vo2max: 55 };
    expect(
      score([
        { ...state, updated_at: later.date },
        { ...state, athlete_id: "other" },
      ]),
    ).toEqual([]);
    const rows = score([state]);
    expect(rows).toHaveLength(1);
    expect(rows[0].baselineError).toBe(15);
  });
  it("scores later running data in seconds per kilometre without bike inputs", () => {
    const run = [180, 300, 600].map((t) => effort(t, 4 + 100 / t));
    const [row] = periodForecast(
      "run",
      run,
      [effort(300, 4, later.date)],
      first.date,
      later.date,
      first.athlete_id,
      [],
    );
    expect(row.observed).toBe(250);
    expect(row.prediction).toBeCloseTo(1000 / (4 + 100 / 300));
  });
  it("compares a dated road race to the previous same-distance performance and refuses backfilled rows", () => {
    const prior = { ...first, time_10k_sec: 2500, time_10k_date: "2026-01-10" };
    const race = { ...later, time_10k_sec: 2480, time_10k_date: "2026-02-14" };
    expect(
      raceForecastReview(prior, race, "10K", "competitor")?.baselineError,
    ).toBe(20);
    expect(
      raceForecastReview(
        { ...prior, updated_at: later.date },
        race,
        "10K",
        "competitor",
      ),
    ).toBeNull();
    expect(raceForecastReview(prior, race, "703", "competitor")).toBeNull();
  });
  it("tracks the original target using a later independent protocol in the original sport", () => {
    const t = {
      athlete_id: first.athlete_id,
      sport: "run",
      name: "Tenue au seuil",
      id: "t",
      raw: {
        tte_minutes: 40,
        testDate: later.date,
        thresholdDate: first.date,
        thresholdReference: "4:45/km",
        conditionsConfirmed: true,
        thresholdConfirmed: true,
        continuousConfirmed: true,
        exhaustionConfirmed: true,
      },
    } as unknown as DbTest;
    const rows = followupEvidence(rank, first, later, "Semi", [
      t,
      { ...t, sport: "bike" },
      { ...t, athlete_id: "other" },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].text).toContain("5 min sous");
    expect(followupEvidence(rank, first, later, "703", [t])).toEqual([]);
  });
});
