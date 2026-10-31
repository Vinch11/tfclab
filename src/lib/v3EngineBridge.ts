/**
 * TFCLab V3 -> real plan engine bridge (experimental, fail-closed).
 * Ingests all 400 V3 candidates. No live prescription is enabled by default.
 * The legacy planner requires numeric minutes: never invent pace for swimming,
 * nor claim strength movement-time estimates as an exact appointment duration.
 */
import type { LibraryWorkout, WorkoutGoal, PhaseTag } from "../types/workoutLibrary";
import { getDoctrineDomain } from "./zones/tfclDoctrine";
import {
  v3FullCatalogue, evaluateV3Workout,
  type Paces, type V3Workout, type V3Block, type Overrides,
} from "../../scripts/library-v3/catalogueRuntime";
import { screenV32Source } from "../../scripts/library-v3/sportingQualification";
import { qualifyV32ForAthlete, type V32IndividualInputs } from "../../scripts/library-v3/qualifyForAthlete";

const V3_GOALS: Record<V3Workout["sport"], WorkoutGoal[]> = {
  bike: ["ironman", "half", "sprint", "olympic"],
  run: ["5k", "10k", "semi", "marathon", "half", "ironman", "trail_short", "trail_long"],
  swim: ["ironman", "half", "sprint", "olympic"],
  strength: ["ironman", "half", "sprint", "olympic", "5k", "10k", "semi", "marathon", "trail_short", "trail_long"],
};
export type V3EngineRefusal = "NOT_REVIEWED_BY_COACH" | "UNKNOWN_ID" |
  "MISSING_SWIM_PACES" | "STRENGTH_DURATION_UNVERIFIED" | "UNSAFE_DATA" |
  "INDIVIDUAL_QUALIFICATION_FAILED";
export interface V3CoachPilotContext {
  coachReviewedIds: ReadonlySet<string>;
  /** Mandatory in practice: an athlete+source-bound V3.2 decision for every selected card. */
  individualInputsById?: ReadonlyMap<string,V32IndividualInputs>;
  acknowledgedExperimentalRisk: true;
  swimPaces?: Paces;
  sports?: readonly V3Workout["sport"][];
}
export interface V3AdapterResult {
  accepted: LibraryWorkout[];
  rejected: Array<{ id: string; code: V3EngineRefusal }>;
  totalCandidates: number;
  eligibleAfterReview: number;
}
function zonesOf(block: V3Block): string[] {
  if (block.kind === "repeat") return [...new Set(block.steps.flatMap(zonesOf))];
  return block.domain ? [getDoctrineDomain(block.domain).zone] : [];
}
function desc(block: V3Block): string {
  if (block.kind === "repeat") {
    return block.count.base + " séries: " + block.steps.map(desc).join(" + ") +
      " ; repos entre séries " + block.betweenSec + "s (pas de repos terminal)";
  }
  if (block.kind === "time") return block.seconds!.base + "s " + block.label;
  if (block.kind === "distance") return block.meters!.base + "m " + block.label;
  return block.reps!.base + " répétitions " + block.label +
    (block.sides === 2 ? " de chaque côté" : "");
}
function cat(intent: V3Workout["primaryIntent"]): LibraryWorkout["cat"] {
  if (intent === "test") return "C";
  if (["recovery", "moderate_lt1", "technique_economy", "mobility_prevention"].includes(intent)) return "A";
  if (["vo2max", "neuromuscular"].includes(intent)) return "C";
  return "B";
}
export const V3_ENGINE_IDS = new Set(v3FullCatalogue.workouts.map(w => w.id));

/** Fail-closed release/sync guard shared by plan page and Nolio controls. */
export function planContainsV3Candidate(
  plan: { weeks?: readonly { sessions?: readonly unknown[] }[] } | null | undefined,
): boolean {
  return !!plan?.weeks?.some(week =>
    week.sessions?.some(session => /V3P_(BIKE|RUN|SWIM|STRENGTH)_\d{3}/.test(JSON.stringify(session))));
}

export function lookupV3Recipe(id: string): V3Workout | null {
  return v3FullCatalogue.workouts.find(w => w.id === id) ?? null;
}
export function materializeV3ForPlanEngine(
  recipe: V3Workout,
  options: { swimPaces?: Paces; overrides?: Overrides } = {},
): { workout: LibraryWorkout | null; code?: V3EngineRefusal } {
  if (screenV32Source(recipe).sourceStatus === "source_blocked") {
    return { workout: null, code: "UNSAFE_DATA" };
  }
  if (recipe.status !== "candidate" || recipe.automaticSelection !== false) {
    return { workout: null, code: "UNSAFE_DATA" };
  }
  try {
    const d = evaluateV3Workout(recipe, options);
    if (d.status === "unresolved") return { workout: null, code: "MISSING_SWIM_PACES" };
    if (d.status === "estimated" || recipe.sport === "strength") {
      return { workout: null, code: "STRENGTH_DURATION_UNVERIFIED" };
    }
    if (d.minutes === null || !Number.isFinite(d.minutes) || d.minutes <= 0) {
      return { workout: null, code: "UNSAFE_DATA" };
    }
    const phases = recipe.phase.filter((p): p is PhaseTag =>
      p === "base" || p === "build" || p === "peak" || p === "taper");
    if (!phases.length || !recipe.primaryIntent || !recipe.blocks.length) {
      return { workout: null, code: "UNSAFE_DATA" };
    }
    const sports: Record<string, "cyclisme" | "course" | "natation"> = {
      bike: "cyclisme", run: "course", swim: "natation",
    };
    const sport = sports[recipe.sport];
    if (!sport) return { workout: null, code: "UNSAFE_DATA" };
    const main = recipe.blocks.filter(b => b.kind === "repeat" || b.role === "main");
    if (!main.flatMap(zonesOf).length) return { workout: null, code: "UNSAFE_DATA" };
    const structure = recipe.blocks.map(b => ({
      part: b.kind === "repeat" ? "Main" : b.role === "warmup" ? "Warm-up" : b.role === "cooldown" ? "Cool-down" : "Main",
      text: desc(b),
      zones: zonesOf(b),
    }));
    // The historical engine carries integer minutes, not arbitrary fractions.
    // Refuse instead of making an unapproved dose by rounding a V3 source.
    if (d.seconds === null || !Number.isSafeInteger(d.seconds) || d.seconds % 60 !== 0) {
      return { workout: null, code: "UNSAFE_DATA" };
    }
    const minutes = d.seconds / 60;
    const workout: LibraryWorkout = {
      id: recipe.id, cat: cat(recipe.primaryIntent), sport,
      objectif: recipe.title + " — " + recipe.focus,
      necessite: "Optionnel", when: phases.join(", "), phase: phases,
      avoid: recipe.contraindications.join(" · "),
      durationMin: [minutes, minutes], // no fictional duration flexibility
      metricKey: recipe.sport === "bike" ? "puissance" : recipe.sport === "swim" ? "css" : "allure",
      sportKey: sport, structure, variants: {}, goals: [...V3_GOALS[recipe.sport]],
      tags: ["v3-pilot", "coach-only", recipe.primaryIntent, recipe.primaryDomain ?? "none"],
      physiology: { primary: recipe.primaryIntent, rationale: recipe.focus +
        " (V3 candidate, independent sporting review pending)" },
      prerequisites: {
        minimumTrainingLevel: recipe.minimumLevel,
        requireVerifiedProfile: ["sub_threshold", "mlss", "mixed_intensity", "vo2max", "neuromuscular", "race_specific"].includes(recipe.primaryIntent),
        requireExplicitCoachApproval: true,
      },
      notes: "EXPERIMENTAL V3 — base chronology maintained; dose cannot be silently widened",
    };
    return { workout };
  } catch {
    return { workout: null, code: "UNSAFE_DATA" };
  }
}

/**
 * Called by the actual buildWorkoutCatalog pipeline ONLY if the caller
 * supplies explicit per-ID coach-reviewed consent. Defaults to 0.
 * Scientific validation is not claimed, and no real plan is published.
 */
export function buildV3CoachPilotPool(ctx: V3CoachPilotContext): V3AdapterResult {
  if (ctx.acknowledgedExperimentalRisk !== true) throw new Error("V3_COACH_ACK_REQUIRED");
  const accepted: LibraryWorkout[] = [];
  const rejected: V3AdapterResult["rejected"] = [];
  for (const recipe of v3FullCatalogue.workouts) {
    if (ctx.sports && !ctx.sports.includes(recipe.sport)) continue;
    if (!ctx.coachReviewedIds.has(recipe.id)) {
      rejected.push({ id: recipe.id, code: "NOT_REVIEWED_BY_COACH" });
      continue;
    }
    // Legacy pilot cannot bypass V3.2 by supplying a bare set of reviewed IDs.
    // Missing individual inputs stay rejected; default pipeline behavior is unchanged.
    const individual = ctx.individualInputsById?.get(recipe.id);
    if (!individual || !qualifyV32ForAthlete(recipe, individual).eligibleToSubmitToDet) {
      rejected.push({ id: recipe.id, code: "INDIVIDUAL_QUALIFICATION_FAILED" });
      continue;
    }
    const out = materializeV3ForPlanEngine(recipe, { swimPaces: ctx.swimPaces });
    if (out.workout) accepted.push(out.workout);
    else rejected.push({ id: recipe.id, code: out.code ?? "UNSAFE_DATA" });
  }
  return { accepted, rejected, totalCandidates: v3FullCatalogue.workouts.length,
    eligibleAfterReview: accepted.length };
}
