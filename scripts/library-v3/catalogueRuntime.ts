/**
 * TFCLab V3 — isolated pilot runtime. NOT imported by the production generator.
 * The doctrine type is the sole source for metabolic domain IDs.
 * Distances in the pool are NEVER silently converted to minutes.
 */
import type { DoctrineDomainId } from "../../src/lib/zones/tfclDoctrine";
import { auditV31PrescriptionContract, type V3PrescriptionContract } from "./prescriptionContract";
import rawCatalogue from "./v3PilotCatalogue.json";
import bikeExpansion from "./v3BikeExpansion.json";
import runExpansion from "./v3RunExpansion.json";
import swimExpansion from "./v3SwimExpansion.json";
import strengthExpansion from "./v3StrengthExpansion.json";

export type V3Sport = "bike" | "run" | "swim" | "strength";
export type V3Intent = "recovery" | "moderate_lt1" | "mlss" | "vo2max" | "neuromuscular"
  | "max_strength" | "strength_endurance" | "technique_economy" | "mobility_prevention"
  | "mixed_specific" | "race_specific" | "fatmax" | "test";
type Bounds = { min: number; base: number; max: number };
type Role = "warmup" | "main" | "cooldown";
export type V3Leaf = {
  kind: "time" | "distance" | "reps";
  label: string;
  role: Role;
  domain: DoctrineDomainId | null;
  seconds?: Bounds;
  meters?: Bounds;
  reps?: Bounds;
  secPerRep?: number;
  sides?: number;
  estimated?: boolean;
};
export type V3Repeat = {
  kind: "repeat";
  label: string;
  count: Bounds;
  betweenSec: number;
  steps: V3Block[];
};
export type V3Block = V3Leaf | V3Repeat;
export interface V3Workout {
  id: string;
  version: string;
  sport: V3Sport;
  title: string;
  primaryIntent: V3Intent;
  primaryDomain: DoctrineDomainId | null;
  phase: string[];
  minimumLevel: "untrained" | "light" | "trained" | "highly_trained";
  focus: string;
  origin: string;
  evidence: { referenceIds: string[]; evidenceLevel: "principle_support_only"; sessionSpecificValidation: false };
  contraindications: string[];
  stopRule: string;
  minimumRecoveryHours: number;
  prerequisites: string[];
  methodology: string;
  blocks: V3Block[];
  automaticSelection: false;
  status: "candidate";
  /** V3.1 hard catalogue gate: every real source must carry this contract. */
  prescriptionContract: V3PrescriptionContract;
}
export interface V3Catalogue {
  schemaVersion: string;
  createdAt: string;
  status: string;
  count: number;
  counts: Record<string, number>;
  notice: string;
  references: Record<string, { url: string; claim: string }>;
  workouts: V3Workout[];
}
/**
 * All expansion files are candidates only, grouped by sport to keep the
 * authoring diff reviewable. No changes to the production WorkoutLibrary.
 */
const draftExpansions = [bikeExpansion, runExpansion, swimExpansion, strengthExpansion] as const;
export const v3PilotCatalogue: V3Catalogue = {
  ...(rawCatalogue as unknown as V3Catalogue),
  count: 400,
  counts: { bike: 100, run: 100, swim: 100, strength: 100 },
  workouts: [
    ...(rawCatalogue.workouts as unknown as V3Workout[]),
    ...draftExpansions.flatMap(exp => exp.workouts as unknown as V3Workout[]),
  ],
};
export const v3FullCatalogue = v3PilotCatalogue;

/** Each pace is personally supplied in sec/100m for the corresponding domain. */
export type Paces = Partial<Record<DoctrineDomainId, number>>;
export type Overrides = Record<string, number>;
interface Accumulation {
  seconds: number | null;
  distanceM: number;
  estimated: boolean;
  unknown: string[];
}
export interface V3Duration {
  seconds: number | null;
  minutes: number | null;
  distanceM: number;
  estimated: boolean;
  unknown: string[];
  status: "confirmed" | "estimated" | "unresolved";
}
function assertPositiveFinite(n: number, label: string, allowZero = false): void {
  if (!Number.isFinite(n) || (allowZero ? n < 0 : n <= 0)) throw new Error("V3_INVALID_NUMBER:" + label);
}
function boundValue(bounds: Bounds, value: number | undefined, label: string): number {
  const picked = value ?? bounds.base;
  assertPositiveFinite(picked, label);
  if (!Number.isFinite(bounds.min) || !Number.isFinite(bounds.max) ||
      bounds.min <= 0 || bounds.min > bounds.base || bounds.base > bounds.max ||
      picked < bounds.min || picked > bounds.max) throw new Error("V3_OUT_OF_BOUNDS:" + label);
  return picked;
}
function mergeParts(parts: Accumulation[]): Accumulation {
  const unknown = parts.flatMap(p => p.unknown);
  return {
    seconds: parts.every(p => p.seconds !== null) ? parts.reduce((s, p) => s + (p.seconds ?? 0), 0) : null,
    distanceM: parts.reduce((s, p) => s + p.distanceM, 0),
    estimated: parts.some(p => p.estimated),
    unknown,
  };
}
function evaluateBlock(
  block: V3Block, path: string, swimPaces: Paces, overrides: Overrides
): Accumulation {
  if (block.kind === "repeat") {
    const count = boundValue(block.count, overrides[path + ".count"], path + ".count");
    if (!Number.isInteger(count)) throw new Error("V3_INVALID_REPEAT:" + path);
    assertPositiveFinite(block.betweenSec, path + ".betweenSec", true);
    if (block.steps.length === 0) throw new Error("V3_EMPTY_REPEAT:" + path);
    const inner = mergeParts(block.steps.map((step, idx) => evaluateBlock(step, path + "." + idx, swimPaces, overrides)));
    const rest = (count - 1) * block.betweenSec;
    return {
      seconds: inner.seconds === null ? null : count * inner.seconds + rest,
      distanceM: count * inner.distanceM,
      estimated: inner.estimated,
      unknown: inner.unknown,
    };
  }
  const fields = ["seconds", "meters", "reps"] as const;
  const expected = block.kind === "time" ? "seconds" : block.kind === "distance" ? "meters" : "reps";
  if (fields.filter(k => block[k] !== undefined).length !== 1 || block[expected] === undefined)
    throw new Error("V3_UNIT_MISMATCH:" + path);
  const quantity = boundValue(block[expected]!, overrides[path + "." + expected], path + "." + expected);
  if (block.kind === "time") return { seconds: quantity, distanceM: 0, estimated: false, unknown: [] };
  if (block.kind === "reps") {
    assertPositiveFinite(block.secPerRep ?? NaN, path + ".secPerRep");
    assertPositiveFinite(block.sides ?? NaN, path + ".sides");
    // Movement-time approximation, not a fixed appointment duration. Set-up and loading
    // variation are unmeasured; this result can NEVER be "confirmed".
    return { seconds: quantity * block.secPerRep! * block.sides!, distanceM: 0, estimated: true, unknown: [] };
  }
  if (!block.domain) throw new Error("V3_MISSING_SWIM_DOMAIN:" + path);
  const pace = swimPaces[block.domain];
  if (pace === undefined) return {
    seconds: null, distanceM: quantity, estimated: false,
    unknown: [path + ":pace:" + block.domain],
  };
  assertPositiveFinite(pace, path + ".pace");
  return { seconds: quantity * pace / 100, distanceM: quantity, estimated: false, unknown: [] };
}
export function evaluateV3Workout(
  workout: V3Workout,
  opts: { swimPaces?: Paces; overrides?: Overrides } = {}
): V3Duration {
  const accumulation = mergeParts(workout.blocks.map((b, i) =>
    evaluateBlock(b, String(i), opts.swimPaces ?? {}, opts.overrides ?? {})
  ));
  const estimated = accumulation.estimated || workout.sport === "strength";
  const status = accumulation.seconds === null ? "unresolved" : estimated ? "estimated" : "confirmed";
  return {
    seconds: accumulation.seconds,
    minutes: accumulation.seconds === null ? null : accumulation.seconds / 60,
    distanceM: accumulation.distanceM,
    estimated,
    unknown: [...new Set(accumulation.unknown)],
    status,
  };
}
const DOMAINS = new Set<DoctrineDomainId>([
  "recovery", "moderate_lt1", "tempo", "im_pace", "703_pace", "marathon_pace",
  "sub_threshold", "semi_pace", "mlss", "vo2max", "neuromuscular",
]);
const INTENTS = new Set<V3Intent>([
  "recovery", "moderate_lt1", "mlss", "vo2max", "neuromuscular", "max_strength",
  "strength_endurance", "technique_economy", "mobility_prevention",
  "mixed_specific", "race_specific", "fatmax", "test",
]);
function validateBlock(block: V3Block, path: string, errors: string[]): void {
  if (block.kind === "repeat") {
    if (!block.steps?.length) errors.push(path + ":EMPTY_REPEAT");
    if (!Number.isFinite(block.betweenSec) || block.betweenSec < 0) errors.push(path + ":INVALID_REST");
    try { boundValue(block.count, undefined, path + ".count"); } catch (e) { errors.push(String(e)); }
    if (!Number.isInteger(block.count?.base)) errors.push(path + ":FRACTIONAL_COUNT");
    block.steps?.forEach((b, i) => validateBlock(b, path + "." + i, errors));
    return;
  }
  if (!["time", "distance", "reps"].includes(block.kind)) {
    errors.push(path + ":UNKNOWN_KIND"); return;
  }
  if (block.domain !== null && !DOMAINS.has(block.domain)) errors.push(path + ":UNKNOWN_DOCTRINE");
  const key = block.kind === "time" ? "seconds" : block.kind === "distance" ? "meters" : "reps";
  const fields = ["seconds", "meters", "reps"] as const;
  if (fields.filter(f => block[f] !== undefined).length !== 1) errors.push(path + ":AMBIGUOUS_UNITS");
  const quantity = block[key];
  if (quantity === undefined) errors.push(path + ":MISSING_QUANTITY");
  else {
    try { boundValue(quantity, undefined, path + "." + key); } catch (e) { errors.push(String(e)); }
  }
  if (block.kind === "reps" && (!block.secPerRep || !block.sides)) errors.push(path + ":UNRESOLVED_REPS_TIME");
  if (block.kind === "distance" && !block.domain) errors.push(path + ":MISSING_DISTANCE_DOMAIN");
  if (!block.label?.trim()) errors.push(path + ":EMPTY_INSTRUCTION");
}
export function auditV3Catalogue(catalogue: V3Catalogue = v3PilotCatalogue): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const w of catalogue.workouts) {
    if (ids.has(w.id)) errors.push(w.id + ":DUPLICATE_ID");
    errors.push(...auditV31PrescriptionContract(w));
    ids.add(w.id);
    if (!/^V3P_(BIKE|RUN|SWIM|STRENGTH)_\d{3}$/.test(w.id)) errors.push(w.id + ":BAD_ID");
    if (!INTENTS.has(w.primaryIntent)) errors.push(w.id + ":MISSING_INTENT");
    if (w.primaryDomain !== null && !DOMAINS.has(w.primaryDomain)) errors.push(w.id + ":UNKNOWN_PRIMARY_DOMAIN");
    if (!w.focus?.trim() || !w.stopRule?.trim() || !w.contraindications?.length ||
        !w.phase?.length || !w.minimumLevel) errors.push(w.id + ":MISSING_METADATA");
    if (w.automaticSelection !== false || w.status !== "candidate") errors.push(w.id + ":UNAPPROVED_SELECTION");
    if (w.evidence?.sessionSpecificValidation !== false ||
        w.evidence?.evidenceLevel !== "principle_support_only") errors.push(w.id + ":UNJUSTIFIED_EVIDENCE");
    if (!w.evidence?.referenceIds?.length || w.evidence.referenceIds.some(ref => !catalogue.references[ref]))
      errors.push(w.id + ":UNTRACEABLE_REFERENCE");
    if (!w.blocks?.some(b => b.kind === "repeat" || b.role === "main"))
      errors.push(w.id + ":NO_WORK_BLOCK");
    w.blocks?.forEach((b, i) => validateBlock(b, w.id + "." + i, errors));
    try {
      const result = evaluateV3Workout(w);
      if (w.sport === "swim" && result.status !== "unresolved") errors.push(w.id + ":INVENTED_SWIM_PACE");
      if (w.sport === "strength" && result.status === "confirmed" &&
          w.blocks.some(b => b.kind === "reps")) errors.push(w.id + ":FALSE_STRENGTH_PRECISION");
    } catch (err) { errors.push(w.id + ":CANNOT_COMPUTE:" + String(err)); }
  }
  if (catalogue.workouts.length !== catalogue.count) errors.push("COUNT_MISMATCH");
  for (const sport of ["swim", "bike", "run", "strength"]) {
    if (catalogue.workouts.filter(w => w.sport === sport).length !== catalogue.counts[sport])
      errors.push("SPORT_COUNT_MISMATCH:" + sport);
  }
  return errors;
}