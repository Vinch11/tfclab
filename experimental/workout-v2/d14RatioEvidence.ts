/**
 * D1.4 — Read-only duration-ratio evidence, not an alternative production policy.
 *
 * A complete sport split requires explicit, verified bike/run/transition
 * components of every brick. An unallocated brick is counted ONCE in the
 * endurance denominator, but never silently allocated between bike and run.
 * Missing or invalid session duration makes all percentages inconclusive.
 */
export type D14EnduranceSport = "swim" | "bike" | "run" | "brick";
export type D14Sport = D14EnduranceSport | "strength" | "rest";

export interface D14BrickComponents {
  bikeMin: number;
  runMin: number;
  transitionMin: number;
  verified: boolean;
}
export interface D14RatioSession {
  sport: D14Sport | string;
  durationMin?: number | null;
  brickComponents?: D14BrickComponents | null;
}
export type D14RatioReason =
  | "missing_duration"
  | "invalid_duration"
  | "invalid_sport"
  | "brick_components_unverified"
  | "brick_components_invalid"
  | "no_endurance";
export interface D14RatioEvidence {
  status: "observed_complete" | "non_conclusive";
  reasonCodes: D14RatioReason[];
  enduranceSeconds: number | null;
  countedSeconds: {
    swim: number;
    bike: number;
    run: number;
    transition: number;
    brickUnattributed: number;
  };
  /** Shares are null when the denominator or the corresponding allocation is unknown. */
  sharePct: { swim: number | null; bike: number | null; run: number | null; transition: number | null };
  /** Conservative extrema, NOT independent simultaneously feasible prescriptions. */
  possibleBikePct: [number, number] | null;
  possibleRunPct: [number, number] | null;
  comparisonUnit: "structured_endurance_time";
  sportRatioTargetMeaningApproved: false;
  mayReplaceProductionValidator: false;
}
const ENDURANCE = new Set<D14Sport>(["swim", "bike", "run", "brick"]);
const asSeconds = (minutes: number): number | null => {
  if (!Number.isFinite(minutes) || minutes < 0) return null;
  const seconds = minutes * 60;
  return Number.isSafeInteger(seconds) ? seconds : null;
};
const percent = (part: number, total: number): number =>
  Math.round((part / total) * 1000) / 10;

/** Never mutates input or interprets existing target bands as time-based policy. */
export function auditD14DurationRatios(sessions: readonly D14RatioSession[]): D14RatioEvidence {
  const values = { swim: 0, bike: 0, run: 0, transition: 0, brickUnattributed: 0 };
  const reasons = new Set<D14RatioReason>();
  let total = 0;
  for (const session of sessions) {
    if (session.sport === "rest" || session.sport === "strength") continue;
    if (!ENDURANCE.has(session.sport as D14Sport)) {
      reasons.add("invalid_sport");
      continue;
    }
    if (session.durationMin == null) {
      reasons.add("missing_duration");
      continue;
    }
    const seconds = asSeconds(session.durationMin);
    if (seconds === null || seconds <= 0) {
      reasons.add("invalid_duration");
      continue;
    }
    total += seconds;
    if (session.sport !== "brick") {
      values[session.sport as "swim" | "bike" | "run"] += seconds;
      continue;
    }
    const components = session.brickComponents;
    if (!components || components.verified !== true) {
      reasons.add("brick_components_unverified");
      values.brickUnattributed += seconds;
      continue;
    }
    const bike = asSeconds(components.bikeMin);
    const run = asSeconds(components.runMin);
    const transition = asSeconds(components.transitionMin);
    if (bike === null || run === null || transition === null ||
        bike <= 0 || run <= 0 || bike + run + transition !== seconds) {
      reasons.add("brick_components_invalid");
      values.brickUnattributed += seconds;
      continue;
    }
    values.bike += bike;
    values.run += run;
    values.transition += transition;
  }
  if (total === 0) reasons.add("no_endurance");
  const unknownDuration = ["missing_duration", "invalid_duration", "invalid_sport", "no_endurance"]
    .some(code => reasons.has(code as D14RatioReason));
  const complete = !reasons.size && total > 0;
  const denominator = !unknownDuration && total > 0 ? total : null;
  const splitKnown = denominator !== null && values.brickUnattributed === 0;
  return {
    status: complete ? "observed_complete" : "non_conclusive",
    reasonCodes: [...reasons].sort(),
    enduranceSeconds: denominator,
    countedSeconds: values,
    sharePct: {
      swim: denominator ? percent(values.swim, denominator) : null,
      bike: splitKnown ? percent(values.bike, denominator!) : null,
      run: splitKnown ? percent(values.run, denominator!) : null,
      transition: splitKnown ? percent(values.transition, denominator!) : null,
    },
    possibleBikePct: denominator ? [
      percent(values.bike, denominator), percent(values.bike + values.brickUnattributed, denominator),
    ] : null,
    possibleRunPct: denominator ? [
      percent(values.run, denominator), percent(values.run + values.brickUnattributed, denominator),
    ] : null,
    comparisonUnit: "structured_endurance_time",
    sportRatioTargetMeaningApproved: false,
    mayReplaceProductionValidator: false,
  };
}
