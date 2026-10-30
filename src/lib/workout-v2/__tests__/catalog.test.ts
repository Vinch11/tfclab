import { describe, expect, it } from "vitest";
import { WORKOUT_V2_MODELS, WORKOUT_V2_GOALS, WORKOUT_V2_SPORTS, workoutV2Coverage } from "../../../../experimental/workout-v2/catalog";
import { instantiateWorkoutV2, type AthleteAnchor, type WorkoutV2Input } from "../../../../experimental/workout-v2/instantiate";

const anchors: NonNullable<WorkoutV2Input["anchors"]> = {
  ftpW: { value: 270, verified: true, sport: "bike" },
  vmaKmh: { value: 16, verified: true, sport: "run" },
  thresholdPaceSecKm: { value: 250, verified: true, sport: "run" },
  racePaceSecKm: { value: 275, verified: true, sport: "run" },
  cssSecPer100m: { value: 95, verified: true, sport: "swim" },
};
function input(model: (typeof WORKOUT_V2_MODELS)[number]): WorkoutV2Input {
  return { goal: model.goals[0], phase: model.phases[0], level: model.minTrainingLevel,
    readiness: "ready", pain: false, recoveryConcern: false, anchors };
}
describe("TFCLab Workout Library V2 isolated pilot", () => {
  it("contains exactly 20 unique families and all currently declared goals and sports", () => {
    expect(WORKOUT_V2_MODELS).toHaveLength(20);
    expect(new Set(WORKOUT_V2_MODELS.map(m => m.id)).size).toBe(20);
    expect(new Set(WORKOUT_V2_GOALS).size).toBe(13);
    const coverage = workoutV2Coverage();
    expect(Object.keys(coverage.goals)).toHaveLength(13);
    expect(Object.keys(coverage.sports)).toHaveLength(6);
    for (const goal of WORKOUT_V2_GOALS) expect(coverage.goals[goal].length).toBeGreaterThan(0);
    for (const sport of WORKOUT_V2_SPORTS) expect(coverage.sports[sport].length).toBeGreaterThan(0);
  });
  it.each(WORKOUT_V2_MODELS)("instantiates %s reproducibly, every second accounted for", model => {
    const first = instantiateWorkoutV2(model.id, input(model));
    const second = instantiateWorkoutV2(model.id, input(model));
    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const c = first.candidate;
    expect(c.status).toBe("coach_review_required");
    expect(c.plannedDurationSec).toBe(c.steps.reduce((t, s) => t + s.durationSec, 0));
    expect(c.steps.length).toBeGreaterThan(0);
    expect(c.steps.every(s => Number.isSafeInteger(s.durationSec) && s.durationSec > 0)).toBe(true);
    expect(c.evidence.length).toBeGreaterThan(0);
  });
  it("rejects non-admissible objective, phase, level and pain/recovery states", () => {
    const m = WORKOUT_V2_MODELS.find(m => m.id === "V2_RUN_05")!;
    const bad = instantiateWorkoutV2(m.id, { ...input(m), goal: "ironman", phase: "base",
      level: "untrained", readiness: "uncertain", pain: true, recoveryConcern: true });
    expect(bad.ok).toBe(false);
    if (bad.ok === false) expect(bad.reasons).toEqual(expect.arrayContaining([
      "goal_incompatible", "phase_incompatible", "training_level_incompatible",
      "readiness_not_confirmed", "pain_present", "recovery_concern",
    ]));
  });
  it("rejects unknown and out-of-range or unaligned parameters, never clamps", () => {
    const m = WORKOUT_V2_MODELS[0];
    expect(instantiateWorkoutV2(m.id, { ...input(m), parameters: { repeats: 999 } }).ok).toBe(false);
    expect(instantiateWorkoutV2(m.id, { ...input(m), parameters: { walkSec: 91 } }).ok).toBe(false);
    expect(instantiateWorkoutV2(m.id, { ...input(m), parameters: { ftpW: 270 } as never }).ok).toBe(false);
  });
  it("requires sport-matched verified anchors; never substitutes FTP into run or CSS into drills", () => {
    const m = WORKOUT_V2_MODELS.find(m => m.id === "V2_RUN_05")!;
    const missing = instantiateWorkoutV2(m.id, { ...input(m), anchors: {} });
    expect(missing.ok).toBe(false);
    if (missing.ok === false) expect(missing.reasons).toContain("anchor_vmaKmh_missing_or_unverified");
    const incorrect: AthleteAnchor = { value: 16, sport: "bike", verified: true };
    expect(instantiateWorkoutV2(m.id, { ...input(m), anchors: { vmaKmh: incorrect } }).ok).toBe(false);
    const drill = WORKOUT_V2_MODELS.find(m => m.id === "V2_SWIM_03")!;
    expect(instantiateWorkoutV2(drill.id, { ...input(drill), anchors: {} }).ok).toBe(true);
  });
  it("rejects sessions exceeding availability instead of silently shortening", () => {
    const m = WORKOUT_V2_MODELS.find(m => m.id === "V2_BRICK_01")!;
    const good = instantiateWorkoutV2(m.id, input(m));
    expect(good.ok).toBe(true);
    if (!good.ok) return;
    const short = instantiateWorkoutV2(m.id, { ...input(m), maxDurationSec: good.candidate.plannedDurationSec - 1 });
    expect(short).toEqual({ ok: false, reasons: ["time_budget_exceeded"] });
  });
  it("does not insert final recovery after the final repetition", () => {
    const m = WORKOUT_V2_MODELS.find(m => m.id === "V2_RUN_01")!;
    const outcome = instantiateWorkoutV2(m.id, input(m));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const c = outcome.candidate;
    const p = c.parameters;
    const expected = p.warmupSec! + p.cooldownSec! + p.repeats! * p.workSec! +
      (p.repeats! - 1) * p.walkSec!;
    expect(c.plannedDurationSec).toBe(expected);
  });
  it("retains actual sport-specific units and does not manufacture HR zones for strength", () => {
    for (const id of ["V2_STRENGTH_01", "V2_STRENGTH_02"]) {
      const m = WORKOUT_V2_MODELS.find(m => m.id === id)!;
      const result = instantiateWorkoutV2(id, input(m));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.candidate.steps.some(s => s.target?.unit === "RPE")).toBe(true);
    }
    const swim = WORKOUT_V2_MODELS.find(m => m.id === "V2_SWIM_02")!;
    const result = instantiateWorkoutV2(swim.id, input(swim));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.candidate.steps.some(s => s.target?.unit === "sec/100m")).toBe(true);
  });
});
