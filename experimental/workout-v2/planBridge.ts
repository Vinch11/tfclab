/**
 * Pilot-only V2 → actual TFCLab plan session schema bridge.
 * Exact content only. No mutation of planner, library V1, or athlete data.
 *
 * DO NOT call this directly from the production plan generator:
 * - all drafts require human review;
 * - historical schema stores whole MINUTES only;
 * - a parametric V2 workout is CUSTOM, never a forged V1 catalogue ID;
 * - structured V2 steps remain a separate sidecar and are NOT sent to Nolio.
 */
import { zSession, type DayLower, type PlanSession } from "@/lib/plan/planSchema";
import type { WorkoutV2Candidate } from "./instantiate";
import { getWorkoutV1Lineage } from "./v1Lineage";

export type PlanV2Preview = {
  status: "coach_review_required";
  canAutoInsert: false;
  canExportNolio: false;
  sourceV1Id: string;
  modelId: string;
  planSession: PlanSession;
  exactSteps: WorkoutV2Candidate["steps"];
  plannedDurationSec: number;
  warnings: readonly string[];
};
export type PlanV2BridgeResult =
  | { ok: true; preview: PlanV2Preview }
  | { ok: false; reasons: string[] };

const sportForSchema = (sport: WorkoutV2Candidate["sport"]): PlanSession["sport"] =>
  sport === "trail" ? "run" : sport as PlanSession["sport"];

function displaySeconds(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m${String(s).padStart(2,"0")}s`;
}
function targetText(target: WorkoutV2Candidate["steps"][number]["target"]) {
  if (!target) return "cible non assignée";
  return `${target.lower}–${target.upper} ${target.unit}, réf ${target.anchor} (${target.description})`;
}
export function previewV2InPlan(
  candidate: WorkoutV2Candidate,
  day: DayLower,
): PlanV2BridgeResult {
  if (candidate.status !== "coach_review_required" ||
    candidate.schemaVersion !== "tfclab.workout.v2.pilot.1") return { ok:false, reasons:["candidate_not_pilot_v2"] };
  const lineage = getWorkoutV1Lineage(candidate.modelId);
  if (!lineage || lineage.relationship !== "inspired_by_not_equivalent") {
    return { ok:false, reasons:["provenance_v1_unavailable"] };
  }
  if (!Number.isSafeInteger(candidate.plannedDurationSec) ||
      candidate.plannedDurationSec <= 0 ||
      candidate.steps.reduce((n,s)=>n+s.durationSec,0)!==candidate.plannedDurationSec ||
      candidate.steps.some(s=>!Number.isSafeInteger(s.durationSec)||s.durationSec<=0)) {
    return { ok:false, reasons:["invalid_exact_schedule"] };
  }
  // The existing zSession's durationMin is an integer; never floor/ceil a second.
  if (candidate.plannedDurationSec % 60 !== 0) {
    return { ok:false, reasons:["legacy_plan_schema_cannot_represent_exact_seconds"] };
  }
  const details = [
    `CANDIDAT V2 — RÉVISION COACH OBLIGATOIRE — NON VALIDÉ POUR PRESCRIPTION`,
    `Source V1 (${lineage.sourceV1Id}) : inspiration seulement, jamais équivalence / substitution automatique.`,
    `Intention : ${candidate.intent}; phase: ${candidate.phase}; objectif: ${candidate.goal}.`,
    ...candidate.steps.map(s=>`${s.order}. [${s.sport}] ${s.label}: ${displaySeconds(s.durationSec)} — ${targetText(s.target)}`),
    `TOTAL EXACT: ${displaySeconds(candidate.plannedDurationSec)}`,
    ...candidate.limitations,
    `Divergence V1: ${lineage.discrepancy}`,
  ].join("\n");
  const input = {
    day,
    sport: sportForSchema(candidate.sport),
    title: `CANDIDAT V2 ${candidate.modelId}`,
    details,
    durationMin: candidate.plannedDurationSec / 60,
    isKeySession: false,
    zones: [],
    custom: true as const,
    catalogId: null,
  };
  const parsed = zSession.safeParse(input);
  if (!parsed.success) return { ok:false, reasons:["legacy_plan_schema_rejected_candidate"] };
  return { ok:true, preview: {
    status:"coach_review_required",
    canAutoInsert:false,
    canExportNolio:false,
    sourceV1Id:lineage.sourceV1Id,
    modelId:candidate.modelId,
    planSession:parsed.data,
    exactSteps:candidate.steps,
    plannedDurationSec:candidate.plannedDurationSec,
    warnings:[
      "Custom candidate only; not V1 catalogue-equivalent.",
      "The V1 publication and Nolio pipeline are not modified.",
      "No automatic insertion, prescription approval or export.",
    ],
  } };
}
