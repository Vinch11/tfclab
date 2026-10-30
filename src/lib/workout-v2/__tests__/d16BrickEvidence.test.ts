import { describe, expect, it } from "vitest";
import { instantiateWorkoutV2 } from "../../../../experimental/workout-v2/instantiate";
import { extractD16StructuredBrick } from "../../../../experimental/workout-v2/d16BrickEvidence";
import { auditD14DurationRatios } from "../../../../experimental/workout-v2/d14RatioEvidence";

const makeBrick = () => instantiateWorkoutV2("V2_BRICK_01", {
  goal: "half", phase: "base", level: "trained", readiness: "ready",
  pain: false, recoveryConcern: false,
});

describe("D1.6: exact planned V2 brick component evidence without invented 50/50 split", () => {
  it("maps full V2 steps, including warmup and cooldown, into an exact bike/run/transition ratio", () => {
    const r = makeBrick();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const allocation = extractD16StructuredBrick(r.candidate);
    expect(allocation.ok).toBe(true);
    if (!allocation.ok) return;
    expect(allocation.durationSec).toBe(r.candidate.plannedDurationSec);
    expect(allocation.components).toEqual({
      bikeMin: 55, runMin: 20, transitionMin: 2, verified: true,
    });
    expect(allocation.executed).toBe(false);

    const ratio = auditD14DurationRatios([
      { sport: "swim", durationMin: 180 },
      { sport: "bike", durationMin: 600 },
      { sport: "run", durationMin: 185 },
      { sport: "brick", durationMin: allocation.durationSec / 60,
        brickComponents: allocation.components },
    ]);
    expect(ratio.status).toBe("observed_complete");
    expect(ratio.countedSeconds.brickUnattributed).toBe(0);
    expect(ratio.sharePct).toEqual({ swim: 17.3, bike: 62.9, run: 19.7, transition: 0.2 });
    expect(ratio.sportRatioTargetMeaningApproved).toBe(false);
    expect(ratio.mayReplaceProductionValidator).toBe(false);
  });

  it("rejects a mutated candidate or unsupported card rather than silently allocating time", () => {
    const r = makeBrick();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const altered = structuredClone(r.candidate);
    altered.steps[0].durationSec += 60;
    expect(extractD16StructuredBrick(altered)).toEqual({
      ok: false, reasons: ["unverified_brick_component_sum"],
    });
    const wrongSport = structuredClone(r.candidate);
    wrongSport.modelId = "V2_RUN_02";
    expect(extractD16StructuredBrick(wrongSport)).toEqual({
      ok: false, reasons: ["not_supported_v2_brick"],
    });
    const unallocatable = structuredClone(r.candidate);
    unallocatable.steps[1].sport = "strength";
    expect(extractD16StructuredBrick(unallocatable)).toEqual({
      ok: false, reasons: ["unrecognized_or_invalid_brick_step"],
    });
  });
});
