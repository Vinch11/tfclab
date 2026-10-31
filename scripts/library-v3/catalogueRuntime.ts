/**
 * TFCLab V3 — isolated pilot runtime. NOT imported by the production generator.
 * The doctrine type is the sole source for metabolic domain IDs.
 * Distances in the pool are NEVER silently converted to minutes.
 */
import type { DoctrineDomainId } from "../../src/lib/zones/tfclDoctrine";
import rawCatalogue from "./v3PilotCatalogue.json";
import bikeNext100 from "./v3BikeNext100.json";
import runNext100 from "./v3RunNext100.json";
import swimNext100 from "./v3SwimNext100.json";
import strengthNext100 from "./v3StrengthNext100.json";
import bikeExpansion from "./v3BikeExpansion.json";
import runExpansion from "./v3RunExpansion.json";
import swimExpansion from "./v3SwimExpansion.json";
import strengthExpansion from "./v3StrengthExpansion.json";

export type V3Sport = "bike" | "run" | "swim" | "strength";
export type V3Intent = "recovery" | "moderate_lt1" | "mlss" | "vo2max" | "neuromuscular"
  | "max_strength" | "strength_endurance" | "technique_economy" | "mobility_prevention"
  | "mixed_specific" | "race_specific" | "fatmax" | "test";
export type Bounds = { min: number; base: number; max: number };
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
  /** A repetition target inside a confirmed TIME BOX; not a time estimator. */
  repsTarget?: Bounds;
  rpeRange?: { min: number; max: number };
};
export type V3Repeat = {
  kind: "repeat";
  label: string;
  count: Bounds;
  betweenSec: number;
  betweenSecBounds?: Bounds;
  steps: V3Block[];
};
export type V3Block = V3Leaf | V3Repeat;
export interface V3SessionPrescription {
  physiologicalIntent: { statement: string; primaryIntent: V3Intent; primaryDomain: DoctrineDomainId | null; domainIds: DoctrineDomainId[]; limiterKeys: string[]; goal: string; uncertainty: string };
  individualization: { anchors: Array<{ domain: DoctrineDomainId | null; key: string; transform: string; missing: string }>; missingAnchorBehavior: string; coachMustConfirmMeasurements: boolean; strengthLoadSelection: string; swimCssPolicy: string };
  parameters: Array<{ path: string; unit: string; min: number; base: number; max: number; risk: string }>;
  duration: { formula: string; classification: "estimated_not_slot_confirmed" | "requires_individual_pace" | "timeboxed_executable" | "exact_time"; requiredMeasurements: string[]; unknownBehavior: string; strengthRepsInterpretation: string };
  admissibility: { minimumLevel: "untrained" | "light" | "trained" | "highly_trained"; phases: string[]; minimumRecoveryHours: number; prerequisites: string[]; contraindications: string[]; stopRule: string; requiresIndividualCoachReview: boolean; requiresLoadAndFatigueCheck: boolean; requiresWeeklySportingValidation: boolean; notAutoApproved: boolean };
}
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
  prescription: V3SessionPrescription;
  automaticSelection: false;
  status: "candidate";
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
/** 400 heritage sources are still available as a stable pilot snapshot. */
export const v3FullCatalogue: V3Catalogue = {
  ...v3PilotCatalogue,
  schemaVersion: "3.1.0-candidate-800",
  count: 800,
  counts: { bike: 200, run: 200, swim: 200, strength: 200 },
  workouts: [...v3PilotCatalogue.workouts,
    ...bikeNext100.workouts as unknown as V3Workout[],
    ...runNext100.workouts as unknown as V3Workout[],
    ...swimNext100.workouts as unknown as V3Workout[],
    ...strengthNext100.workouts as unknown as V3Workout[]],
};

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
    const declaredRest = block.betweenSecBounds;
    let actualRest = block.betweenSec;
    if (declaredRest) {
      const selected = overrides[path + ".betweenSec"] ?? declaredRest.base;
      if (![declaredRest.min,declaredRest.base,declaredRest.max,selected].every(Number.isFinite) ||
          declaredRest.min < 0 || declaredRest.min > declaredRest.base || declaredRest.base > declaredRest.max ||
          declaredRest.base !== block.betweenSec || selected < declaredRest.min || selected > declaredRest.max ||
          !Number.isSafeInteger(selected)) throw new Error("V3_REST_OUT_OF_BOUNDS:" + path);
      actualRest=selected;
    }
    const rest = (count - 1) * actualRest;
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
  const estimated = accumulation.estimated || (workout.sport === "strength" &&
    workout.prescription?.duration.classification !== "timeboxed_executable");
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
    if (block.betweenSecBounds && (
      ![block.betweenSecBounds.min,block.betweenSecBounds.base,block.betweenSecBounds.max].every(Number.isSafeInteger) ||
      block.betweenSecBounds.min < 0 || block.betweenSecBounds.min > block.betweenSecBounds.base ||
      block.betweenSecBounds.base !== block.betweenSec || block.betweenSec > block.betweenSecBounds.max))
      errors.push(path + ":INVALID_REST_BOUNDS");
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
  if (block.repsTarget && (block.kind !== "time" || ![block.repsTarget.min,block.repsTarget.base,block.repsTarget.max].every(Number.isSafeInteger) ||
    block.repsTarget.min < 1 || block.repsTarget.min > block.repsTarget.base || block.repsTarget.base > block.repsTarget.max)) errors.push(path + ":INVALID_TIMEBOX_REP_TARGET");
  if (block.rpeRange && (block.kind !== "time" || block.rpeRange.min < 1 || block.rpeRange.max > 10 || block.rpeRange.min > block.rpeRange.max)) errors.push(path + ":INVALID_RPE_RANGE");
  if (block.kind === "distance" && !block.domain) errors.push(path + ":MISSING_DISTANCE_DOMAIN");
  if (!block.label?.trim()) errors.push(path + ":EMPTY_INSTRUCTION");
}

function validateSessionPrescription(w: V3Workout, errors: string[]): void {
  const p=w.prescription;
  if (!p?.physiologicalIntent || !p?.individualization || !p?.duration || !p?.admissibility || !Array.isArray(p.parameters)) {
    errors.push(w.id+":MISSING_PRESCRIPTION_CONTRACT");return;
  }
  const domains=new Set<string>(),distances=new Set<string>(),expected=new Map<string,Bounds>();
  let estimated=false;
  const walk=(blocks:V3Block[],prefix=""):void=>blocks.forEach((b,i)=>{
    const path=prefix?prefix+"."+i:String(i);
    if(b.kind==="repeat"){
      expected.set(path+".count",b.count);
      if(b.betweenSecBounds)expected.set(path+".betweenSec",b.betweenSecBounds);
      walk(b.steps,path);
    }else{
      if(b.domain)domains.add(b.domain);
      if(b.kind==="distance"&&b.domain)distances.add(b.domain);
      if(b.kind==="reps")estimated=true;
      const k=b.kind==="time"?"seconds":b.kind==="distance"?"meters":"reps";
      expected.set(path+"."+k,b[k]!);
      if(b.repsTarget)expected.set(path+".repsTarget",b.repsTarget);
    }
  });
  walk(w.blocks);
  const d=[...domains].sort(),declared=[...p.physiologicalIntent.domainIds].sort();
  if (JSON.stringify(d)!==JSON.stringify(declared) || p.physiologicalIntent.primaryIntent!==w.primaryIntent ||
      p.physiologicalIntent.primaryDomain!==w.primaryDomain || p.physiologicalIntent.statement!==w.focus ||
      !p.physiologicalIntent.limiterKeys?.length || p.physiologicalIntent.limiterKeys.some(x=>!x.trim()))
    errors.push(w.id+":INTENT_OR_LIMITERS_MISMATCH");
  const actualAnchors=p.individualization.anchors;
  if(!Array.isArray(actualAnchors)||actualAnchors.length!==Math.max(1,d.length) ||
      (w.sport!=="strength"&&d.some(domain=>!actualAnchors.some(a=>a.domain===domain&&a.key&&a.transform&&a.missing==="unresolved"))) ||
      p.individualization.missingAnchorBehavior!=="unresolved_no_numeric_target"||
      p.individualization.coachMustConfirmMeasurements!==true)
    errors.push(w.id+":UNRESOLVED_INTENSITY_CONTRACT");
  const expectedDuration=estimated?"estimated_not_slot_confirmed":distances.size?"requires_individual_pace":w.sport==="strength"?"timeboxed_executable":"exact_time";
  if(p.duration.classification!==expectedDuration || !p.duration.formula?.includes("SUM(") ||
     p.duration.unknownBehavior!=="unresolved_not_filled_or_rounded" ||
     JSON.stringify([...distances].sort().map(x=>"swim_domain_pace_sec_per_100m."+x))!==
       JSON.stringify([...p.duration.requiredMeasurements].sort()))
    errors.push(w.id+":DURATION_CONTRACT_MISMATCH");
  if(p.parameters.length!==expected.size || new Set(p.parameters.map(k=>k.path)).size!==expected.size ||
     p.parameters.some(k=>{const b=expected.get(k.path);return !b||k.min!==b.min||k.base!==b.base||k.max!==b.max||!k.risk||!k.unit;}))
    errors.push(w.id+":PARAMETER_CONTRACT_MISMATCH");
  if(p.admissibility.minimumLevel!==w.minimumLevel || JSON.stringify(p.admissibility.phases)!==JSON.stringify(w.phase) ||
     p.admissibility.minimumRecoveryHours!==w.minimumRecoveryHours ||
     JSON.stringify(p.admissibility.prerequisites)!==JSON.stringify(w.prerequisites) ||
     JSON.stringify(p.admissibility.contraindications)!==JSON.stringify(w.contraindications) ||
     p.admissibility.stopRule!==w.stopRule || p.admissibility.notAutoApproved!==true ||
     p.admissibility.requiresIndividualCoachReview!==true || p.admissibility.requiresLoadAndFatigueCheck!==true ||
     p.admissibility.requiresWeeklySportingValidation!==true)
    errors.push(w.id+":ADMISSIBILITY_CONTRACT_MISMATCH");
}

export function auditV3Catalogue(catalogue: V3Catalogue = v3FullCatalogue): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const w of catalogue.workouts) {
    if (ids.has(w.id)) errors.push(w.id + ":DUPLICATE_ID");
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
    validateSessionPrescription(w,errors);
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