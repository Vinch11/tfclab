/**
 * TFCLab — Workout Library V2: pure candidate instantiator.
 * Isolated from the legacy library and from Nolio; NEVER authorizes a prescription.
 * All time arithmetic uses integer seconds. No implicit repetition / rest.
 */
export type V2Sport = "swim" | "bike" | "run" | "trail" | "strength" | "brick";
export type V2Goal =
  | "start_to_run" | "5k" | "10k" | "semi" | "marathon"
  | "sprint" | "olympic" | "half" | "ironman"
  | "trail_short" | "trail_mountain" | "trail_long" | "trail_ultra"
  | "time_trial" | "open_water" | "general_fitness";
export type V2Phase = "base" | "build" | "peak" | "taper";
export type V2Level = "untrained" | "light" | "trained" | "highly_trained";
export type V2IntensityClass = "low" | "moderate" | "high" | "neuromuscular";
export type V2EvidenceLevel = "research_informed_coach_model" | "tfclab_design";
export type V2Metric = "cssSecPer100m";

export interface V2NumberParameter {
  min: number;
  max: number;
  step: number;
  default: number;
}
export type V2Block =
  | { kind: "continuous"; label: string; seconds: string; target: string; sport?: V2Sport }
  | { kind: "intervals"; label: string; repeats: string; workSeconds: string; recoverySeconds: string;
      target: string; recoveryTarget: string; sport?: V2Sport }
  | { kind: "swim_crawl_intervals"; label: string; repeats: string; distanceMeters: string;
      recoverySeconds: string; cssPaceFactor: number; target: string }
  | { kind: "strength_sets"; label: string; sets: string; reps: string; tempoSecondsPerRep: string;
      recoverySeconds: string; target: string };
export interface V2WorkoutTemplate {
  id: string;
  name: string;
  sport: V2Sport;
  goals: V2Goal[];
  phases: V2Phase[];
  intent: string;
  intensityClass: V2IntensityClass;
  minimumLevel: V2Level;
  evidenceLevel: V2EvidenceLevel;
  sourceIds: string[];
  requiredMetrics: V2Metric[];
  parameters: Record<string, V2NumberParameter>;
  blocks: V2Block[];
  coachNotes: string;
}
export interface V2AthleteContext {
  goal: V2Goal;
  phase: V2Phase;
  level: V2Level;
  availableSeconds: number | null;
  readiness: "good" | "poor" | "unknown";
  pain: "no" | "yes" | "unknown";
  metrics: Partial<Record<V2Metric, number>>;
}
export interface V2Event {
  label: string;
  sport: V2Sport;
  type: "work" | "recovery" | "strength";
  durationSeconds: number;
  target: string;
  distanceMeters?: number;
  repetitions?: number;
}
export type V2InstantiatedWorkout =
  | { status: "blocked"; templateId: string; reasons: string[]; warnings: string[];
      events: V2Event[]; totalSeconds: 0; parameters: Record<string, number>; approval: "never_automatic" }
  | { status: "candidate"; templateId: string; reasons: []; warnings: string[];
      events: V2Event[]; totalSeconds: number; parameters: Record<string, number>; approval: "never_automatic" };

const LEVELS: V2Level[] = ["untrained", "light", "trained", "highly_trained"];
const isIntegerPositive = (value: number) => Number.isSafeInteger(value) && value > 0;
const isIntegerNonnegative = (value: number) => Number.isSafeInteger(value) && value >= 0;
const isRecord = (value: unknown): value is Record<string, number> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function instantiateV2Workout(
  template: V2WorkoutTemplate,
  athlete: V2AthleteContext,
  overrides: Record<string, number> = {},
): V2InstantiatedWorkout {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const resolved: Record<string, number> = {};

  if (!template.goals.includes(athlete.goal)) reasons.push("goal_incompatible");
  if (!template.phases.includes(athlete.phase)) reasons.push("phase_incompatible");
  if (LEVELS.indexOf(athlete.level) < LEVELS.indexOf(template.minimumLevel)) reasons.push("level_insufficient");
  if (!isIntegerPositive(athlete.availableSeconds as number)) reasons.push("availability_unknown_or_invalid");
  if (athlete.pain === "yes") reasons.push("pain_reported");
  if (athlete.pain === "unknown") {
    if (template.intensityClass !== "low") reasons.push("pain_status_unknown");
    else warnings.push("pain_status_unknown_review_required");
  }
  if (athlete.readiness === "poor") reasons.push("recovery_unfavourable");
  if (athlete.readiness === "unknown") {
    if (template.intensityClass === "high" || template.intensityClass === "neuromuscular") {
      reasons.push("recovery_unknown_for_intense_session");
    } else {
      warnings.push("recovery_unknown_review_required");
    }
  }
  if (!isRecord(overrides)) reasons.push("overrides_invalid");
  const safeOverrides = isRecord(overrides) ? overrides : {};
  for (const key of Object.keys(safeOverrides)) {
    if (!(key in template.parameters)) reasons.push("unknown_parameter:" + key);
  }
  for (const [key, def] of Object.entries(template.parameters)) {
    const v = Object.prototype.hasOwnProperty.call(safeOverrides, key) ? safeOverrides[key] : def.default;
    if (![def.min, def.max, def.step, def.default].every(Number.isSafeInteger) ||
      def.step <= 0 || def.min < 0 || def.max < def.min ||
      def.default < def.min || def.default > def.max ||
      !Number.isSafeInteger(v) || v < def.min || v > def.max ||
      (v - def.min) % def.step !== 0) reasons.push("parameter_out_of_range:" + key);
    else resolved[key] = v;
  }
  for (const metric of template.requiredMetrics) {
    if (typeof athlete.metrics[metric] !== "number" || !Number.isFinite(athlete.metrics[metric]) ||
      (athlete.metrics[metric] as number) <= 0) reasons.push("required_metric_missing:" + metric);
  }
  const blocked = (): V2InstantiatedWorkout => ({
    status: "blocked", templateId: template.id, reasons: [...new Set(reasons)],
    warnings, events: [], totalSeconds: 0, parameters: resolved, approval: "never_automatic",
  });
  if (reasons.length > 0) return blocked();

  const events: V2Event[] = [];
  const append = (event: V2Event) => {
    if (!isIntegerPositive(event.durationSeconds) || !isIntegerNonnegative(event.distanceMeters ?? 0)) {
      reasons.push("non_executable_segment:" + event.label);
      return;
    }
    events.push(event);
  };
  const val = (key: string): number => {
    if (!Object.prototype.hasOwnProperty.call(resolved, key)) {
      reasons.push("missing_parameter_reference:" + key);
      return 0;
    }
    return resolved[key];
  };
  for (const block of template.blocks) {
    const sport = "sport" in block && block.sport ? block.sport : template.sport;
    if (block.kind === "continuous") {
      append({ label: block.label, sport, type: "work", durationSeconds: val(block.seconds), target: block.target });
    } else if (block.kind === "intervals") {
      const repeats = val(block.repeats), duration = val(block.workSeconds), rest = val(block.recoverySeconds);
      if (!isIntegerPositive(repeats) || !isIntegerPositive(duration) || !isIntegerNonnegative(rest)) {
        reasons.push("invalid_interval:" + block.label);
        continue;
      }
      for (let i = 0; i < repeats; i++) {
        append({ label: block.label + " " + (i + 1) + "/" + repeats, sport, type: "work",
          durationSeconds: duration, target: block.target });
        // No recovery after the last repetition. Zero recovery creates no phantom segment.
        if (i < repeats - 1 && rest > 0) append({ label: block.label + " récupération", sport,
          type: "recovery", durationSeconds: rest, target: block.recoveryTarget });
      }
    } else if (block.kind === "swim_crawl_intervals") {
      const repeats = val(block.repeats), distance = val(block.distanceMeters), rest = val(block.recoverySeconds);
      const css = athlete.metrics.cssSecPer100m as number;
      if (!isIntegerPositive(repeats) || !isIntegerPositive(distance) || !isIntegerNonnegative(rest) ||
        !(block.cssPaceFactor > 0) || !Number.isFinite(block.cssPaceFactor)) {
        reasons.push("invalid_swim_interval:" + block.label);
        continue;
      }
      const duration = Math.round(distance / 100 * css * block.cssPaceFactor);
      for (let i = 0; i < repeats; i++) {
        append({ label: block.label + " " + (i + 1) + "/" + repeats, sport: "swim", type: "work",
          durationSeconds: duration, distanceMeters: distance, target: block.target + " (crawl uniquement)" });
        if (i < repeats - 1 && rest > 0) append({ label: block.label + " récupération", sport: "swim",
          type: "recovery", durationSeconds: rest, target: "Récupération" });
      }
    } else {
      const sets = val(block.sets), reps = val(block.reps), tempo = val(block.tempoSecondsPerRep);
      const rest = val(block.recoverySeconds);
      if (!isIntegerPositive(sets) || !isIntegerPositive(reps) || !isIntegerPositive(tempo) ||
        !isIntegerNonnegative(rest)) {
        reasons.push("invalid_strength_sets:" + block.label);
        continue;
      }
      for (let i = 0; i < sets; i++) {
        append({ label: block.label + " " + (i + 1) + "/" + sets, sport: "strength", type: "strength",
          durationSeconds: reps * tempo, repetitions: reps, target: block.target });
        if (i < sets - 1 && rest > 0) append({ label: block.label + " récupération", sport: "strength",
          type: "recovery", durationSeconds: rest, target: "Repos" });
      }
    }
  }
  const totalSeconds = events.reduce((sum, e) => sum + e.durationSeconds, 0);
  if (!isIntegerPositive(totalSeconds) || !Number.isSafeInteger(totalSeconds)) reasons.push("total_duration_invalid");
  if (athlete.availableSeconds !== null && totalSeconds > athlete.availableSeconds) reasons.push("availability_exceeded");
  if (reasons.length > 0) return blocked();
  warnings.push("coach_review_required_before_prescription_and_nolio");
  return { status: "candidate", templateId: template.id, reasons: [], warnings, events,
    totalSeconds, parameters: resolved, approval: "never_automatic" };
}
