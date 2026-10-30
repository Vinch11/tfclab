/**
 * Offline, pure, bounded recipe instantiator. No Gemini, network, Nolio or
 * persistence. It returns CANDIDATES ONLY: never an approved athlete dose.
 */
import type { PhaseTag, WorkoutGoal, WorkoutTrainingLevel } from "@/types/workoutLibrary";
import { WORKOUT_V2_MODELS, type AnchorKey, type RecipeParameter, type TargetRule, type WorkoutV2Model } from "./catalog";

export type AthleteAnchor = {
  value: number;
  verified: boolean;
  sport: "run" | "bike" | "swim";
};
type RequiredAnchor = Exclude<AnchorKey, "rpe">;
export type WorkoutV2Input = {
  goal: WorkoutGoal;
  phase: PhaseTag;
  level: WorkoutTrainingLevel;
  readiness: "ready" | "uncertain" | "adverse";
  pain: boolean;
  recoveryConcern: boolean;
  parameters?: Partial<Record<RecipeParameter, number>>;
  anchors?: Partial<Record<RequiredAnchor, AthleteAnchor>>;
  maxDurationSec?: number;
};
export type V2Target = {
  description: string;
  anchor: AnchorKey;
  unit: "RPE" | "W" | "sec/km" | "sec/100m";
  lower: number;
  upper: number;
};
export type V2Step = {
  order: number;
  label: string;
  sport: "run" | "bike" | "swim" | "trail" | "strength" | "transition";
  durationSec: number;
  target: V2Target | null;
};
export type WorkoutV2Candidate = {
  status: "coach_review_required";
  schemaVersion: "tfclab.workout.v2.pilot.1";
  modelId: string;
  goal: WorkoutGoal;
  phase: PhaseTag;
  intent: string;
  sport: string;
  parameters: Partial<Record<RecipeParameter, number>>;
  plannedDurationSec: number;
  steps: V2Step[];
  evidence: readonly string[];
  limitations: string[];
};
export type WorkoutV2Result = { ok: true; candidate: WorkoutV2Candidate } | { ok: false; reasons: string[] };

const LEVELS: readonly WorkoutTrainingLevel[] = ["untrained", "light", "trained", "highly_trained"];
const EXPECTED_SPORT: Record<RequiredAnchor, "run" | "bike" | "swim"> = {
  ftpW: "bike", vmaKmh: "run", thresholdPaceSecKm: "run",
  cssSecPer100m: "swim", racePaceSecKm: "run",
};
const MIN_MAX: Record<RequiredAnchor, [number, number]> = {
  ftpW: [50, 1000],
  vmaKmh: [5, 32],
  thresholdPaceSecKm: [110, 1200],
  cssSecPer100m: [35, 300],
  racePaceSecKm: [110, 1200],
};
function resolve(rule: TargetRule, anchors: WorkoutV2Input["anchors"]): { target: V2Target | null; reason?: string } {
  if (rule.anchor === "rpe") {
    return { target: { anchor: "rpe", description: rule.description, unit: "RPE", lower: rule.lower, upper: rule.upper } };
  }
  const ref = anchors?.[rule.anchor];
  const [min, max] = MIN_MAX[rule.anchor];
  if (!ref || !ref.verified || ref.sport !== EXPECTED_SPORT[rule.anchor] ||
      !Number.isFinite(ref.value) || ref.value < min || ref.value > max) {
    return { target: null, reason: `anchor_${rule.anchor}_missing_or_unverified` };
  }
  let lower: number;
  let upper: number;
  let unit: V2Target["unit"];
  if (rule.anchor === "ftpW") {
    lower = Math.round(ref.value * rule.lower);
    upper = Math.round(ref.value * rule.upper);
    unit = "W";
  } else if (rule.anchor === "vmaKmh") {
    lower = Math.round(3600 / (ref.value * rule.upper));
    upper = Math.round(3600 / (ref.value * rule.lower));
    unit = "sec/km";
  } else {
    lower = Math.round(ref.value / rule.upper);
    upper = Math.round(ref.value / rule.lower);
    unit = rule.anchor === "cssSecPer100m" ? "sec/100m" : "sec/km";
  }
  return { target: { anchor: rule.anchor, description: rule.description, unit, lower, upper } };
}
function asSport(sport: WorkoutV2Model["sport"]): V2Step["sport"] {
  return sport === "trail" ? "trail" : sport === "brick" ? "bike" : sport;
}

export function instantiateWorkoutV2(modelId: string, input: WorkoutV2Input): WorkoutV2Result {
  const model = WORKOUT_V2_MODELS.find(m => m.id === modelId);
  if (!model) return { ok: false, reasons: ["unknown_model"] };
  const errors: string[] = [];
  if (!model.goals.includes(input.goal)) errors.push("goal_incompatible");
  if (!model.phases.includes(input.phase)) errors.push("phase_incompatible");
  const levelIndex = LEVELS.indexOf(input.level);
  if (levelIndex < 0 || levelIndex < LEVELS.indexOf(model.minTrainingLevel)) errors.push("training_level_incompatible");
  if (input.readiness !== "ready") errors.push("readiness_not_confirmed");
  if (input.pain) errors.push("pain_present");
  if (input.recoveryConcern) errors.push("recovery_concern");
  if (input.maxDurationSec !== undefined && (!Number.isSafeInteger(input.maxDurationSec) || input.maxDurationSec <= 0))
    errors.push("invalid_available_duration");
  const params: Partial<Record<RecipeParameter, number>> = {};
  for (const key of Object.keys(input.parameters ?? {}) as RecipeParameter[]) {
    if (!Object.prototype.hasOwnProperty.call(model.params, key)) errors.push(`unknown_parameter_${key}`);
  }
  for (const [key, bound] of Object.entries(model.params) as Array<[RecipeParameter, NonNullable<WorkoutV2Model["params"][RecipeParameter]>]>) {
    const value = input.parameters?.[key] ?? bound.default;
    if (!Number.isSafeInteger(value) || value < bound.min || value > bound.max || (value - bound.min) % bound.step !== 0) {
      errors.push(`parameter_${key}_out_of_bounds`);
    } else params[key] = value;
  }
  const main = resolve(model.target, input.anchors);
  if (main.reason) errors.push(main.reason);
  const second = model.secondTarget ? resolve(model.secondTarget, input.anchors) : { target: null };
  if ("reason" in second && second.reason) errors.push(second.reason);
  if (errors.length) return { ok: false, reasons: [...new Set(errors)] };

  const v = (key: RecipeParameter): number => params[key] ?? 0;
  const steps: V2Step[] = [];
  const push = (label: string, durationSec: number, sport: V2Step["sport"], target: V2Target | null = null) => {
    if (!Number.isSafeInteger(durationSec) || durationSec < 0) throw new Error("invalid_segment_duration");
    if (durationSec > 0) steps.push({ order: steps.length + 1, label, sport, durationSec, target });
  };
  const sport = asSport(model.sport);
  push("Échauffement progressif", v("warmupSec"), sport);
  if (model.mode === "steady") {
    push("Bloc continu", v("mainSec"), sport, main.target);
  } else if (model.mode === "intervals" || model.mode === "swim_intervals") {
    let effortSeconds = v("workSec");
    if (model.mode === "swim_intervals") {
      const css = input.anchors?.cssSecPer100m?.value;
      if (!css || !Number.isSafeInteger(css) || (css * v("swimRepDistanceM")) % 100 !== 0)
        return { ok: false, reasons: ["swim_target_time_not_exact"] };
      effortSeconds = css * v("swimRepDistanceM") / 100;
    }
    const sets = model.mode === "swim_intervals" ? 1 : v("sets");
    for (let s = 0; s < sets; s++) {
      if (s) push("Récupération entre séries", v("betweenSetsSec"), sport);
      for (let rep = 0; rep < v("repeats"); rep++) {
        push(`Série ${s+1}, répétition ${rep+1}`, effortSeconds, sport, main.target);
        if (rep < v("repeats") - 1) push("Récupération entre répétitions", v("recoverySec"), sport);
      }
    }
  } else if (model.mode === "runwalk") {
    for (let rep = 0; rep < v("repeats"); rep++) {
      push(`Course facile ${rep+1}`, v("workSec"), sport, main.target);
      if (rep < v("repeats") - 1) push("Marche", v("walkSec"), sport);
    }
  } else if (model.mode === "brick") {
    push("Vélo", v("bikeSec"), "bike", main.target);
    push("Transition / changement de sport", v("transitionSec"), "transition");
    push("Course après vélo", v("runSec"), "run", second.target);
  } else if (model.mode === "strength") {
    const exercises = model.exercises ?? [];
    if (!exercises.length) return { ok: false, reasons: ["strength_exercises_missing"] };
    for (let set = 0; set < v("sets"); set++) {
      if (set) push("Repos entre tours", v("betweenSetsSec"), "strength");
      for (let e = 0; e < exercises.length; e++) {
        if (e) push("Repos / transition entre exercices", v("strengthRestSec"), "strength");
        push(`Tour ${set+1} : ${exercises[e]} — ${v("strengthReps")} répétitions, tempo ${v("strengthTempoSec")}s`,
          v("strengthReps") * v("strengthTempoSec"), "strength", main.target);
      }
    }
  }
  push("Retour au calme", v("cooldownSec"), model.mode === "brick" ? "run" : sport);
  const total = steps.reduce((sum, step) => sum + step.durationSec, 0);
  if (!Number.isSafeInteger(total) || total <= 0) return { ok: false, reasons: ["invalid_total_duration"] };
  if (input.maxDurationSec !== undefined && total > input.maxDurationSec)
    return { ok: false, reasons: ["time_budget_exceeded"] };
  return { ok: true, candidate: {
    status: "coach_review_required", schemaVersion: "tfclab.workout.v2.pilot.1",
    modelId: model.id, goal: input.goal, phase: input.phase, intent: model.intent, sport: model.sport,
    parameters: params, plannedDurationSec: total, steps, evidence: model.evidence,
    limitations: [
      "Doses et plages paramétriques éditoriales non validées pour un individu.",
      "Durée calculée = prescription théorique, non durée d'exécution observée.",
      "Aucune approbation, sauvegarde, publication ni export Nolio automatique.",
      model.coachNotes,
    ],
  } };
}
