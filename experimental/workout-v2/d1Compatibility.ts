/**
 * D1.1 vs V2 — STRICT, READ-ONLY demonstration of a real catalogue refusal.
 *
 * This is not an admissibility model for any other sport or plan. It pins the
 * original BRICK_STAGE1_INTRO source and the D1 slot demands, and refuses to
 * confuse a valid length calculation with a source-authorized brick.
 * No quota, floor, source, fitness model or phase is changed.
 */
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import type { WorkoutV2Candidate } from "./instantiate";
import { getWorkoutV1Lineage } from "./v1Lineage";

export interface D1BrickSlot {
  week: 1 | 2 | 3 | 4;
  minBikeExerciseSec: number;
  minBrickElapsedSec: number;
  availableSec: number;
}
export interface D1BrickReview {
  status: "refused" | "source_compatible_needs_individual_review";
  sourceV1Id: "BRICK_STAGE1_INTRO";
  candidateModelId: string;
  week: number;
  bikeExerciseSec: number;
  runExerciseSec: number;
  elapsedSec: number;
  reasons: string[];
  individualPrescriptionApproved: false;
  scientificallyValidated: false;
  canAutoInsert: false;
}
export const D1_BASE_SLOT_CONTRACTS: readonly D1BrickSlot[] = [
  { week: 1, minBikeExerciseSec: 70*60, minBrickElapsedSec: 90*60, availableSec: 600*60 },
  { week: 2, minBikeExerciseSec: 80*60, minBrickElapsedSec: 100*60, availableSec: 600*60 },
  { week: 3, minBikeExerciseSec: 85*60, minBrickElapsedSec: 105*60, availableSec: 600*60 },
  { week: 4, minBikeExerciseSec: 70*60, minBrickElapsedSec: 90*60, availableSec: 600*60 },
] as const;
/** D1 contractual reference only: #427 4db4d55 / docs/d1.1/REPORT.md.
 * Not an athlete's measurement nor a sports recommendation. */
const SOURCE = {
  id: "BRICK_STAGE1_INTRO",
  phase: "base",
  totalMin: [60,90],
  bikeMin: [45,60],
  runMin: [15,20],
  bikeText: "45–60' Z2 facile",
  runText: "15–20' Z1 très facile (focus sensation transition)",
} as const;
function exactPinnedStage1Source(): boolean {
  const v1=WorkoutLibrary.find(x=>x.id===SOURCE.id);
  if(!v1 || v1.sport!=="brick" || !v1.phase?.includes(SOURCE.phase) ||
     v1.durationMin[0]!==SOURCE.totalMin[0] || v1.durationMin[1]!==SOURCE.totalMin[1] ||
     !v1.variants?.half?.includes("Base")) return false;
  const bike=v1.structure.find(x=>x.part==="Bike");
  const run=v1.structure.find(x=>x.part==="Run");
  return bike?.text===SOURCE.bikeText && run?.text===SOURCE.runText &&
    bike.zones.join(",")==="Z2" && run.zones.join(",")==="Z1";
}
export function reviewD1BrickCandidate(
  candidate: WorkoutV2Candidate, slot: D1BrickSlot,
): D1BrickReview {
  const reasons:string[]=[];
  if (!exactPinnedStage1Source()) reasons.push("v1_source_changed_or_unverifiable");
  const lineage=getWorkoutV1Lineage(candidate.modelId);
  if(candidate.modelId!=="V2_BRICK_01" || candidate.sport!=="brick" ||
     lineage?.sourceV1Id!==SOURCE.id || lineage.relationship!=="inspired_by_not_equivalent" ||
     candidate.goal!=="half" || candidate.phase!=="base" ||
     candidate.status!=="coach_review_required" ||
     candidate.schemaVersion!=="tfclab.workout.v2.pilot.1")
    reasons.push("candidate_not_stage1_base_703");
  if(!D1_BASE_SLOT_CONTRACTS.some(x=>x.week===slot.week &&
      x.minBikeExerciseSec===slot.minBikeExerciseSec &&
      x.minBrickElapsedSec===slot.minBrickElapsedSec &&
      x.availableSec===slot.availableSec)) reasons.push("d1_contract_not_pinned");
  const elapsed=candidate.steps.reduce((n,s)=>n+s.durationSec,0);
  const bike=candidate.steps.filter(s=>s.sport==="bike").reduce((n,s)=>n+s.durationSec,0);
  const run=candidate.steps.filter(s=>s.sport==="run").reduce((n,s)=>n+s.durationSec,0);
  if(!Number.isSafeInteger(candidate.plannedDurationSec) ||
     candidate.plannedDurationSec!==elapsed || candidate.steps.some(x=>!Number.isSafeInteger(x.durationSec)||x.durationSec<=0))
    reasons.push("candidate_exact_time_invalid");
  if (elapsed<SOURCE.totalMin[0]*60 || elapsed>SOURCE.totalMin[1]*60)
    reasons.push("stage1_source_total_out_of_bounds");
  if (bike<SOURCE.bikeMin[0]*60 || bike>SOURCE.bikeMin[1]*60)
    reasons.push("stage1_source_bike_out_of_bounds");
  if (run<SOURCE.runMin[0]*60 || run>SOURCE.runMin[1]*60)
    reasons.push("stage1_source_run_out_of_bounds");
  if (bike<slot.minBikeExerciseSec) reasons.push("d1_long_bike_component_not_met");
  if (elapsed<slot.minBrickElapsedSec) reasons.push("d1_brick_minimum_not_met");
  if (elapsed>slot.availableSec) reasons.push("d1_availability_exceeded");
  return {
    status: reasons.length ? "refused" : "source_compatible_needs_individual_review",
    sourceV1Id:SOURCE.id,
    candidateModelId:candidate.modelId,
    week:slot.week,
    bikeExerciseSec:bike,
    runExerciseSec:run,
    elapsedSec:elapsed,
    reasons,
    individualPrescriptionApproved:false,
    scientificallyValidated:false,
    canAutoInsert:false,
  };
}
/** Categorical fact: no Stage1 candidate can satisfy D1 long-bike floor while
 * its original <=60min bike bound is enforced. That is independent of fitting.
 */
export function diagnoseD1Stage1StructuralConflict() {
  return D1_BASE_SLOT_CONTRACTS.map(s=>({
    week:s.week,
    minBikeMinutes:s.minBikeExerciseSec/60,
    minBrickMinutes:s.minBrickElapsedSec/60,
    maxStage1BikeMinutes:SOURCE.bikeMin[1],
    maxStage1TotalMinutes:SOURCE.totalMin[1],
    bikeConflict:s.minBikeExerciseSec>SOURCE.bikeMin[1]*60,
    totalConflict:s.minBrickElapsedSec>SOURCE.totalMin[1]*60,
    outcome:"refused" as const,
  }));
}
