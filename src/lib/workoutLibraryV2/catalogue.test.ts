import { describe, expect, it } from "vitest";
import { instantiateV2Workout, type V2AthleteContext, type V2WorkoutTemplate } from "./engine";
import { V2_BY_ID, V2_GOALS, V2_SOURCES, V2_WORKOUTS } from "./catalogue";

function athlete(t: V2WorkoutTemplate): V2AthleteContext {
  return {
    goal: t.goals[0], phase: t.phases[0], level: "highly_trained",
    availableSeconds: 30000, readiness: "good", pain: "no",
    metrics: { cssSecPer100m: 90 },
  };
}
describe("TFCLab Workout Library V2 — isolated 20-family core", () => {
  it("has 20 distinct families and covers all six supported sports", () => {
    expect(V2_WORKOUTS).toHaveLength(20);
    expect(new Set(V2_WORKOUTS.map(t => t.id)).size).toBe(20);
    expect(new Set(V2_WORKOUTS.map(t => t.sport))).toEqual(
      new Set(["swim", "bike", "run", "trail", "strength", "brick"]));
    expect(new Set(V2_GOALS).size).toBe(16);
    for (const goal of V2_GOALS) expect(V2_WORKOUTS.some(t => t.goals.includes(goal))).toBe(true);
  });
  it("requires auditable source metadata and limits for every family", () => {
    for (const t of V2_WORKOUTS) {
      expect(t.blocks.length).toBeGreaterThan(0);
      expect(t.phases.length).toBeGreaterThan(0);
      expect(t.goals.length).toBeGreaterThan(0);
      expect(t.coachNotes.length).toBeGreaterThan(30);
      for (const source of t.sourceIds) expect(V2_SOURCES[source]?.url).toMatch(/^https:\/\//);
      for (const [key, d] of Object.entries(t.parameters)) {
        expect(key.length).toBeGreaterThan(0);
        expect(d.default).toBeGreaterThanOrEqual(d.min);
        expect(d.default).toBeLessThanOrEqual(d.max);
        expect((d.default - d.min) % d.step).toBe(0);
      }
    }
  });
  it("instantiates all 20 default recipes with exact positive integer seconds", () => {
    for (const t of V2_WORKOUTS) {
      const result = instantiateV2Workout(t, athlete(t));
      expect(result.status, t.id + " " + JSON.stringify(result.reasons)).toBe("candidate");
      expect(result.totalSeconds).toBeGreaterThan(0);
      expect(Number.isSafeInteger(result.totalSeconds)).toBe(true);
      expect(result.events.every(e => Number.isSafeInteger(e.durationSeconds) && e.durationSeconds > 0)).toBe(true);
      expect(result.events.reduce((n, e) => n + e.durationSeconds, 0)).toBe(result.totalSeconds);
      expect(result.approval).toBe("never_automatic");
      expect(result.warnings).toContain("coach_review_required_before_prescription_and_nolio");
    }
  });
  it("is bit-identical across 20 replays per template", () => {
    for (const t of V2_WORKOUTS) {
      const expected = JSON.stringify(instantiateV2Workout(t, athlete(t)));
      for (let n = 0; n < 20; n++) expect(JSON.stringify(instantiateV2Workout(t, athlete(t)))).toBe(expected);
    }
  });
  it("does not invent recovery after the last repeat", () => {
    const t = V2_BY_ID.get("V2_RU05")!;
    const result = instantiateV2Workout(t, athlete(t));
    expect(result.status).toBe("candidate");
    expect(result.events.filter(e => e.type === "recovery")).toHaveLength(5);
    expect(result.totalSeconds).toBe(2220); // 10min + 6x2min + 5x2min + 5min
  });
  it("computes swim crawl distance from a known CSS, without pretending drills are paced", () => {
    const t = V2_BY_ID.get("V2_SW02")!;
    const result = instantiateV2Workout(t, athlete(t));
    expect(result.status).toBe("candidate");
    expect(result.events.filter(e => e.distanceMeters === 300)).toHaveLength(5);
    expect(result.totalSeconds).toBe(2540);
    const unknown = instantiateV2Workout(t, { ...athlete(t), metrics: {} });
    expect(unknown.status).toBe("blocked");
    expect(unknown.reasons).toContain("required_metric_missing:cssSecPer100m");
    expect(unknown.events).toHaveLength(0);
  });
  it("keeps mixed-sport brick transition explicit", () => {
    const result = instantiateV2Workout(V2_BY_ID.get("V2_BR01")!, athlete(V2_BY_ID.get("V2_BR01")!));
    expect(result.status).toBe("candidate");
    expect(result.events.map(e => e.sport)).toEqual(["bike", "bike", "brick", "run", "run"]);
    expect(result.totalSeconds).toBe(5580);
  });
  it("refuses out-of-bounds and out-of-step parameter overrides", () => {
    const t = V2_BY_ID.get("V2_RU05")!;
    for (const override of [{ run: 3600 }, { run: 100 }, { unknown: 1 }, { n: 0 }]) {
      const r = instantiateV2Workout(t, athlete(t), override);
      expect(r.status).toBe("blocked");
      expect(r.events).toHaveLength(0);
      expect(r.reasons.some(x => /parameter|unknown/.test(x))).toBe(true);
    }
  });
  it("refuses wrong goal, phase, level, pain and inadequate availability", () => {
    const t = V2_BY_ID.get("V2_RU03")!;
    const ctx = athlete(t);
    const cases: V2AthleteContext[] = [
      { ...ctx, goal: "ironman" },
      { ...ctx, phase: "base" },
      { ...ctx, level: "untrained" },
      { ...ctx, pain: "yes" },
      { ...ctx, pain: "unknown" },
      { ...ctx, readiness: "unknown" },
      { ...ctx, readiness: "poor" },
      { ...ctx, availableSeconds: 600 },
      { ...ctx, availableSeconds: null },
    ];
    for (const invalid of cases) {
      const r = instantiateV2Workout(t, invalid);
      expect(r.status).toBe("blocked");
      expect(r.events).toHaveLength(0);
    }
  });
  it("signals unknown readiness for easy work without declaring individual safety", () => {
    const t = V2_BY_ID.get("V2_RU05")!;
    const r = instantiateV2Workout(t, { ...athlete(t), readiness: "unknown", pain: "unknown" });
    expect(r.status).toBe("candidate");
    expect(r.warnings).toContain("recovery_unknown_review_required");
    expect(r.warnings).toContain("pain_status_unknown_review_required");
    expect(r.approval).toBe("never_automatic");
  });
  it("never exports or sends to Nolio from this candidate-only engine", () => {
    const t = V2_BY_ID.get("V2_ST01")!;
    const r = instantiateV2Workout(t, athlete(t));
    expect(r.approval).toBe("never_automatic");
    expect(Object.keys(r)).not.toContain("nolioPayload");
    expect(Object.keys(r)).not.toContain("exportApproved");
  });
});
