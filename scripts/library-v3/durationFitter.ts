/**
 * Preview-only bounded session fitting. It never changes the physiological
 * domain, inserts sessions, or makes a candidate coach/production-approved.
 * The weekly planner MUST separately validate load, phase, limiters & recovery.
 */
import {
  evaluateV3Workout, type Overrides, type Paces, type V3Block,
  type V3Workout, type V3Duration,
} from "./catalogueRuntime";

export type FitCode =
  | "FIT_WITHIN_DECLARED_BOUNDS"
  | "OUTSIDE_DECLARED_BOUNDS"
  | "SWIM_PACE_REQUIRED"
  | "STRENGTH_DURATION_ONLY_ESTIMATED"
  | "INVALID_TARGET";
export interface V3Fit {
  code: FitCode;
  fitsSlot: boolean;
  candidateOnly: true;
  automaticSelectionAllowed: false;
  targetMin: number;
  overrides: Overrides;
  original: V3Duration;
  computed: V3Duration;
  residualSeconds: number | null;
}
interface Knob { path: string; values: number[]; kind: "count" | "seconds" | "meters"; priority: number }
function discrete(min: number, base: number, max: number, step: number, limit = 500): number[] {
  const out = new Set<number>([min, base, max]);
  const count = Math.ceil((max - min) / step);
  // If a malicious template exposes too many values, sample deterministically
  // and refuse to exhaust the process. Always preserve endpoints.
  const stride = Math.max(1, Math.ceil(count / limit));
  for (let i = 0; i <= count; i += stride) out.add(Math.min(max, min + i * step));
  return [...out].filter(v => Number.isFinite(v) && v >= min && v <= max).sort((a, b) => a - b);
}
function collect(blocks: V3Block[], prefix = ""): Knob[] {
  return blocks.flatMap((block, i): Knob[] => {
    const path = prefix ? prefix + "." + i : String(i);
    if (block.kind === "repeat") return [
      ...(block.count.max > block.count.min ? [{ path: path + ".count", kind: "count" as const,
        priority: 3, values: discrete(block.count.min, block.count.base, block.count.max, 1) }] : []),
      ...collect(block.steps, path),
    ];
    if (block.kind === "time" && block.seconds!.max > block.seconds!.min) {
      const isEasy = block.domain === "recovery" || block.domain === "moderate_lt1";
      return [{ path: path + ".seconds", kind: "seconds" as const, priority: isEasy ? 0 : 1,
        values: discrete(block.seconds!.min, block.seconds!.base, block.seconds!.max, 30) }];
    }
    if (block.kind === "distance" && block.meters!.max > block.meters!.min) {
      const isEasy = block.domain === "recovery" || block.domain === "moderate_lt1";
      return [{ path: path + ".meters", kind: "meters" as const, priority: isEasy ? 0 : 2,
        values: discrete(block.meters!.min, block.meters!.base, block.meters!.max, 25) }];
    }
    // Repetition-number edits are deliberately excluded from fitting strength
    // sessions, where estimated movement time is not appointment duration.
    return [];
  });
}
export function fitV3Duration(
  workout: V3Workout,
  targetMin: number,
  options: { swimPaces?: Paces; toleranceSeconds?: number } = {},
): V3Fit {
  const original = evaluateV3Workout(workout, { swimPaces: options.swimPaces });
  const skeleton: V3Fit = {
    code: "INVALID_TARGET", fitsSlot: false, candidateOnly: true,
    automaticSelectionAllowed: false, targetMin, overrides: {},
    original, computed: original, residualSeconds: null,
  };
  if (!Number.isFinite(targetMin) || targetMin <= 0) return skeleton;
  const tolerance = options.toleranceSeconds ?? 30;
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 600)
    return skeleton;
  if (original.status === "unresolved") return { ...skeleton, code: "SWIM_PACE_REQUIRED" };
  if (original.status === "estimated")
    return { ...skeleton, code: "STRENGTH_DURATION_ONLY_ESTIMATED" };
  const target = targetMin * 60;
  const knobs = collect(workout.blocks).sort((a, b) => a.priority - b.priority || a.path.localeCompare(b.path));
  let best: Overrides = {}, result = original;
  let delta = Math.abs((original.seconds ?? Infinity) - target);
  // Repeat coordinate descent; a change is committed only if it makes the
  // absolute duration error strictly smaller. All candidates are bounded.
  for (let pass = 0; pass < 5 && delta > tolerance; pass++) {
    let improved = false;
    for (const knob of knobs) {
      let chosen: number | undefined, local = delta;
      for (const value of knob.values) {
        const overrides = { ...best, [knob.path]: value };
        let candidate: V3Duration;
        try { candidate = evaluateV3Workout(workout, { swimPaces: options.swimPaces, overrides }); }
        catch { continue; }
        if (candidate.seconds === null || candidate.status !== "confirmed") continue;
        const candidateDelta = Math.abs(candidate.seconds - target);
        if (candidateDelta < local - 1e-7) { local = candidateDelta; chosen = value; }
      }
      if (chosen !== undefined) {
        best = { ...best, [knob.path]: chosen };
        result = evaluateV3Workout(workout, { swimPaces: options.swimPaces, overrides: best });
        delta = local;
        improved = true;
      }
    }
    if (!improved) break;
  }
  const fitsSlot = delta <= tolerance;
  return {
    ...skeleton,
    code: fitsSlot ? "FIT_WITHIN_DECLARED_BOUNDS" : "OUTSIDE_DECLARED_BOUNDS",
    fitsSlot,
    overrides: best,
    computed: result,
    residualSeconds: result.seconds === null ? null : result.seconds - target,
  };
}