/**
 * D1.6 — V2 evidence-bearing slot proposal, READ-ONLY sidecar to the D1 planner.
 * This explicitly does not insert a workout or resolve native Lorang/ratio issues.
 * A synthetic numeric anchor is NOT verified merely because it is populated.
 */
import type { DayLower } from "@/lib/plan/planSchema";
import type { PhaseTag, WorkoutGoal, WorkoutTrainingLevel } from "@/types/workoutLibrary";
import { WORKOUT_V2_MODELS, type V2Sport } from "./catalog";
import {
  fitWorkoutV2ToDuration, type FitResult,
} from "./fit";
import type { WorkoutV2Input, WorkoutV2Candidate } from "./instantiate";
import { previewV2InPlan, type PlanV2Preview } from "./planBridge";
import {
  auditD14KeyStimulus, type D14StimulusWeekEvidence,
} from "./d14StimulusEvidence";

export type D16Focus = "threshold" | "vo2";
const INTENT: Record<D16Focus, "mlss" | "vo2max"> = {
  threshold: "mlss",
  vo2: "vo2max",
};
const ENDURANCE_SPORTS: readonly V2Sport[] = ["run", "bike", "swim"];
export interface D16Slot {
  week: number;
  day: DayLower;
  /** Original weekly-slot type, not a claimed physiological key session. */
  key: boolean;
  weekType: "load" | "recovery" | "taper" | "race";
  sport: V2Sport;
  durationSec: number;
  minDurationSec?: number;
  maxDurationSec?: number;
}
export interface D16CoachRequest {
  /** Explicit coaching hypothesis: no inference from aerobic/glycolytic labels. */
  limiter: string;
  focus: D16Focus;
  justification: string;
  /** A real coach's request to explore a stimulus, not automatic dose approval. */
  coachFocusReviewed: boolean;
}
export interface D16Provenance {
  /** Decoupled from numeric values. Must identify test or independently reviewed source. */
  anchorEvidenceId: string | null;
  /** Merely declaring an ID does not certify the method or individual dose. */
  verifiedForProvisionalTarget: boolean;
}
export interface D16Request {
  goal: WorkoutGoal;
  phase: PhaseTag;
  level: WorkoutTrainingLevel;
  slot: D16Slot;
  profileLimiters: readonly string[];
  coachRequest: D16CoachRequest | null;
  anchors: WorkoutV2Input["anchors"];
  provenance: D16Provenance;
  readiness: WorkoutV2Input["readiness"];
  pain: boolean;
  recoveryConcern: boolean;
}
export interface D16CandidateProposal {
  modelId: string;
  chosen: WorkoutV2Candidate;
  preview: PlanV2Preview;
  /** Deliberately fails dose and limiter review; those are not proved by structural fit. */
  stimulusAudit: D14StimulusWeekEvidence;
  targetWorkSeconds: number;
  fitAttempts: number;
}
export interface D16Result {
  status: "blocked" | "structured_candidate_coach_review";
  reasons: string[];
  proposals: D16CandidateProposal[];
  rejectedModels: Array<{ modelId: string; reasons: string[] }>;
  declaredCompetitionUnchanged: true;
  mayPersist: false;
  mayExport: false;
  mayModifyD1: false;
  mayApproveIndividualDose: false;
}
const fail = (reasons: string[], rejectedModels: D16Result["rejectedModels"] = []): D16Result => ({
  status: "blocked", reasons: [...new Set(reasons)], proposals: [], rejectedModels,
  declaredCompetitionUnchanged: true, mayPersist: false, mayExport: false,
  mayModifyD1: false, mayApproveIndividualDose: false,
});

/**
 * Returns independent, exact-duration, transparently structured V2 OPTIONS.
 * The native V1-based D1 engine must continue to reject what it cannot plan.
 */
export function proposeD16V2ForSlot(input: D16Request): D16Result {
  const slot = input.slot;
  const request = input.coachRequest;
  const errors: string[] = [];
  if (!Number.isSafeInteger(slot.week) || slot.week < 1) errors.push("invalid_week");
  if (slot.weekType !== "load" || slot.key !== true) errors.push("not_load_key_slot");
  if (!ENDURANCE_SPORTS.includes(slot.sport)) errors.push("not_supported_key_sport");
  if (!Number.isSafeInteger(slot.durationSec) || slot.durationSec <= 0) errors.push("invalid_slot_duration");
  if (slot.minDurationSec !== undefined && slot.durationSec < slot.minDurationSec) errors.push("slot_minimum_unmet");
  if (slot.maxDurationSec !== undefined && slot.durationSec > slot.maxDurationSec) errors.push("slot_maximum_exceeded");
  if (!request?.coachFocusReviewed || !request.justification.trim()) errors.push("coach_focus_missing");
  if (!request?.limiter || !input.profileLimiters.includes(request.limiter)) errors.push("limiter_not_in_profile");
  if (!input.provenance.anchorEvidenceId?.trim() || input.provenance.verifiedForProvisionalTarget !== true)
    errors.push("anchor_provenance_unverified");
  if (input.readiness !== "ready" || input.pain || input.recoveryConcern)
    errors.push("recovery_or_pain_gate");
  if (errors.length || !request) return fail(errors);

  const eligible = WORKOUT_V2_MODELS.filter(model =>
    model.sport === slot.sport &&
    model.goals.includes(input.goal) &&
    model.phases.includes(input.phase) &&
    model.intent === INTENT[request.focus],
  ).sort((a, b) => a.id.localeCompare(b.id));
  if (!eligible.length) return fail(["no_v2_model_for_sport_goal_phase_focus"]);
  const proposals: D16CandidateProposal[] = [];
  const rejectedModels: D16Result["rejectedModels"] = [];
  for (const model of eligible) {
    const athleteInput: WorkoutV2Input = {
      goal: input.goal, phase: input.phase, level: input.level,
      readiness: input.readiness, pain: input.pain, recoveryConcern: input.recoveryConcern,
      anchors: input.anchors, maxDurationSec: slot.durationSec,
    };
    const fit: FitResult = fitWorkoutV2ToDuration(model.id, athleteInput, slot.durationSec);
    if (fit.ok === false) { rejectedModels.push({ modelId: model.id, reasons: fit.reasons }); continue; }
    const chosen = fit.candidate;
    // Only target-work steps; warm-up, cooldown, and recoveries are never
    // misclassified as actual threshold / VO2 stimulus minutes.
    const workSteps = chosen.steps.filter(step =>
      step.label.includes("répétition") &&
      step.target !== null &&
      step.target.anchor === model.target.anchor &&
      step.sport === slot.sport,
    );
    const targetWorkSeconds = workSteps.reduce((n, s) => n + s.durationSec, 0);
    if (!targetWorkSeconds || !workSteps.every(s => s.target?.anchor !== "rpe")) {
      rejectedModels.push({ modelId: model.id, reasons: ["structured_target_work_missing"] });
      continue;
    }
    const preview = previewV2InPlan(chosen, slot.day);
    if (preview.ok === false) {
      rejectedModels.push({ modelId: model.id, reasons: preview.reasons });
      continue;
    }
    const stimulusAudit = auditD14KeyStimulus(slot.week, slot.weekType, [{
      id: chosen.modelId,
      sport: slot.sport,
      key: slot.key,
      intentFamily: request.focus === "threshold" ? "seuil" : "vo2",
      workSegments: [{
        seconds: targetWorkSeconds, physiologicalTarget: request.focus,
        referenceVerified: true,
      }],
      // Explicitly NOT granted by fitting a temporal template.
      doseAdequacyReviewed: false, limiterMatchVerified: false,
      phaseCompatible: true, readinessCompatible: true,
    }]);
    proposals.push({
      modelId: model.id, chosen, preview: preview.preview, stimulusAudit,
      targetWorkSeconds, fitAttempts: fit.attempts,
    });
  }
  if (!proposals.length) return fail(["no_structured_v2_candidate_satisfies_slot"], rejectedModels);
  return {
    status: "structured_candidate_coach_review",
    reasons: ["dose_and_limiter_effect_not_independently_validated"],
    proposals, rejectedModels, declaredCompetitionUnchanged: true,
    mayPersist: false, mayExport: false, mayModifyD1: false,
    mayApproveIndividualDose: false,
  };
}
