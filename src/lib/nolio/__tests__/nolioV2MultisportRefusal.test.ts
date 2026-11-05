import { describe, expect, it } from "vitest";
import { buildDetStructuredBrick, type DetStructuredWorkout } from "../../../../experimental/det-engine/v400-structured-workout";
import { mapPlanToNolioV2, type DetWorkout } from "../../../../supabase/functions/_shared/nolioV2/plannedMapper";

const component = (sport: string, minutes: number): DetStructuredWorkout => ({
  schema: "det-structured-workout-v1", sourceId: `SYNTH_${sport}`, sport,
  chosenDurationMin: minutes, exactSeconds: minutes * 60,
  nodes: [{ kind: "step", role: "main", label: sport, domain: "LT1", dose: { seconds: minutes * 60 }, target: null }],
});

describe("reviewed multisport export remains an explicit refusal", () => {
  it.each([false, true])("cannot flatten or relabel a composition (relabel=%s)", (relabel) => {
    const b = buildDetStructuredBrick({ sourceId: "SYNTH_BRICK", bike: { status: "structured", workout: component("bike", 57) },
      run: { status: "structured", workout: component("run", 34) }, transitionSeconds: 300, chosenDurationMin: 96 });
    if (b.status !== "structured") throw new Error(b.reason);
    if (relabel) b.workout.sport = "bike";
    const before = JSON.stringify(b.workout);
    const r = mapPlanToNolioV2([{ sessionKey: "brick", date: "2026-11-09", title: "Synthetic reviewed brick", sport: b.workout.sport,
      catalogId: b.workout.sourceId, durationMin: 96, detStructuredWorkout: b.workout as unknown as DetWorkout }], {
      synthetic: true, athleteId: "usr_SYNTH", sportIds: { bike: "spt_BIKE", run: "spt_RUN", brick: "spt_BRICK" }, exerciseIds: {}, competition: null,
    });
    expect(r).toEqual({ operations: [], refusals: [{ sessionKey: "brick", reason: "multisport_contract_unconfirmed" }] });
    expect(JSON.stringify(b.workout)).toBe(before);
  });
});
