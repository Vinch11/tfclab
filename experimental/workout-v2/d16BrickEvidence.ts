/**
 * D1.6 — exact, recipe-STRUCTURED brick allocation.
 * This is a planned theoretical split, never proof of workout execution,
 * nutritional feasibility or readiness. Only complete V2 pilot step arrays
 * are accepted. Never infer 50/50 from a V1 brick duration.
 */
import type { WorkoutV2Candidate } from "./instantiate";
import type { D14BrickComponents } from "./d14RatioEvidence";

export type D16BrickSplit =
  | { ok: true; planned: true; executed: false; durationSec: number; components: D14BrickComponents }
  | { ok: false; reasons: string[] };

export function extractD16StructuredBrick(candidate: WorkoutV2Candidate): D16BrickSplit {
  if (!["V2_BRICK_01", "V2_BRICK_02"].includes(candidate.modelId) ||
      candidate.sport !== "brick" ||
      candidate.schemaVersion !== "tfclab.workout.v2.pilot.1") {
    return { ok: false, reasons: ["not_supported_v2_brick"] };
  }
  if (!Number.isSafeInteger(candidate.plannedDurationSec) || candidate.plannedDurationSec <= 0) {
    return { ok: false, reasons: ["invalid_planned_duration"] };
  }
  const sum = { bike: 0, run: 0, transition: 0 };
  let total = 0;
  for (const step of candidate.steps) {
    if (!Number.isSafeInteger(step.durationSec) || step.durationSec <= 0 ||
        !["bike", "run", "transition"].includes(step.sport)) {
      return { ok: false, reasons: ["unrecognized_or_invalid_brick_step"] };
    }
    sum[step.sport as "bike" | "run" | "transition"] += step.durationSec;
    total += step.durationSec;
  }
  if (total !== candidate.plannedDurationSec ||
      sum.bike <= 0 || sum.run <= 0 || sum.transition <= 0 ||
      !Object.values(sum).every(n => Number.isSafeInteger(n) && n % 60 === 0)) {
    return { ok: false, reasons: ["unverified_brick_component_sum"] };
  }
  return { ok: true, planned: true, executed: false, durationSec: total,
    components: { bikeMin: sum.bike / 60, runMin: sum.run / 60,
      transitionMin: sum.transition / 60, verified: true },
  };
}
