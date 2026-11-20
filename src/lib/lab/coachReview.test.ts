import { describe, expect, it } from "vitest";
import {
  compareRecords,
  previousPeriod,
  earlierBilans,
  recordReading,
  coachingAction,
} from "./coachReview";
import { replayPriorities } from "./replay";
import { OBJECTIVE_DEMANDS } from "@/lib/coachingCompass/objectiveDemands";
import type { DbSnapshot } from "@/hooks/useCloudData";
const p = (durationSec: number, value: number) => ({
  durationSec,
  value,
  date: "2026-10-01",
});
const snapshot = (id: string, date: string, athlete_id = "a"): DbSnapshot => ({
  id,
  date,
  athlete_id,
  coach_id: "coach",
  source: "test",
});
describe("bilan de terrain", () => {
  it("compares disjoint periods of equal inclusive length across leap day", () => {
    expect(previousPeriod("2024-03-01", "2024-03-02")).toEqual({
      from: "2024-02-28",
      to: "2024-02-29",
    });
    expect(previousPeriod("2024-03-03", "2024-03-02")).toBeNull();
  });
  it("does not turn unmatched durations into a decline or combine sports", () => {
    const rows = compareRecords(
      [p(300, 315), p(1200, 270)],
      [p(300, 330), p(60, 400)],
      "bike",
    );
    expect(rows.map((r) => r.delta)).toEqual([null, 15, null]);
    expect(recordReading(rows, "bike", "703")).toContain("Il manque");
    expect(
      recordReading(
        compareRecords(
          [p(300, 315), p(1200, 270)],
          [p(300, 330), p(1200, 270)],
          "bike",
        ),
        "bike",
        "703",
      ),
    ).toContain("ne montre pas encore");
    expect(compareRecords([p(300, 4)], [p(300, 5)], "run")[0].delta).toBe(-50);
  });
  it("replays only earlier dates for the same athlete and covers every objective", () => {
    const first = { ...snapshot("first", "2026-08-01"), vma: 12 };
    const last = snapshot("last", "2026-09-01");
    expect(
      earlierBilans([first, last, snapshot("x", "2026-01-01", "b")], last),
    ).toEqual([first]);
    for (const goal of Object.keys(OBJECTIVE_DEMANDS)) {
      expect(coachingAction(goal, "run", true).length).toBeGreaterThan(25);
      expect(
        replayPriorities(first, goal, "competitor", 35).every(
          (r) => r.metric.value != null,
        ),
      ).toBe(true);
    }
    expect(
      replayPriorities(first, "10K", "competitor", 35).map(
        (r) => r.metric.metric,
      ),
    ).toContain("VMA");
    expect(replayPriorities(first, "10K", "competitor", 15)).toEqual([]);
  });
});
