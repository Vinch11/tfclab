/**
 * D1.5 isolated, fail-closed selection gate.
 *
 * A V1 catalogue intent or slot label does NOT establish a physiological dose.
 * A preferred card is possible only with an explicit per-slot synthetic/coached
 * reviewed contract. This is an experimental ORDERING hint, never an override
 * of catalogue eligibility, recovery rules, quotas or downstream validation.
 */
import { normalizeRepairSport, type RepairWorkoutMetadata } from "../../supabase/functions/_shared/repairSportingEquivalence";
import type { DaySlot } from "@/engines/plan/weeklySlotLayout";

export type D15Target = "threshold" | "vo2";
export interface D15SlotContext {
  week: number;
  dayIndex: number;
  phase?: string;
  weekType?: string;
  prescribedDurationSec: number;
  slot: Pick<DaySlot, "sport" | "isKeySession">;
}
export interface D15ReviewEvidence {
  cardId: string;
  sport: string;
  week: number;
  dayIndex: number;
  phase: string;
  /** Explicitly linked to a limiter actually carried by this plan. */
  limiter: string;
  target: D15Target;
  workSeconds: number;
  /** Exactly the V1 fiche version and selected dose this review covered. */
  reviewedStructure: string;
  reviewedDurationSec: number;
  /** ALL fields must come from a separate explicit review; never inferred from an ID or title. */
  structuredSegmentsVerified: boolean;
  sportAnchorVerified: boolean;
  limiterMatchReviewed: boolean;
  doseReviewed: boolean;
  phaseReviewed: boolean;
  recoveryAndPainReviewed: boolean;
  weeklyHardDayLoadReviewed: boolean;
  sameSportSpacingReviewed: boolean;
}
export interface D15SelectionAssessment {
  preferred: boolean;
  reasons: string[];
  evidence: D15ReviewEvidence | null;
  requiresCoachApproval: true;
  mayAutoApprovePlan: false;
}
const TARGET_INTENT: Record<D15Target, string> = { threshold: "seuil", vo2: "vo2" };
type Candidate = Pick<RepairWorkoutMetadata, "id" | "sport" | "intentFamily" | "structure" | "durationMin">;

/**
 * The order of reviewed candidates is deliberately not interpreted as proof of
 * a quantitative benefit. Tie breaking remains deterministic in the planner.
 */
export function assessD15Candidate(
  card: Candidate,
  context: D15SlotContext,
  planLimiterOrder: readonly string[],
  reviews: readonly D15ReviewEvidence[],
): D15SelectionAssessment {
  const matching = reviews.filter(r =>
    r.cardId === card.id && r.week === context.week &&
    r.dayIndex === context.dayIndex && r.sport === normalizeRepairSport(card.sport) &&
    r.phase === context.phase,
  );
  const reasons: string[] = [];
  if (!context.slot.isKeySession || context.weekType !== "load")
    reasons.push("not_load_key_slot");
  if (normalizeRepairSport(card.sport) !== context.slot.sport) reasons.push("sport_mismatch");
  if (matching.length !== 1) reasons.push(matching.length ? "ambiguous_review" : "review_missing");
  const review = matching.length === 1 ? matching[0] : null;
  if (review) {
    if (!planLimiterOrder.includes(review.limiter)) reasons.push("limiter_not_in_plan");
    if (card.structure !== review.reviewedStructure || !card.structure.trim()) reasons.push("stale_or_missing_structure_review");
    if (!Number.isSafeInteger(context.prescribedDurationSec) || context.prescribedDurationSec <= 0 ||
        context.prescribedDurationSec !== review.reviewedDurationSec ||
        context.prescribedDurationSec < card.durationMin[0] * 60 ||
        context.prescribedDurationSec > card.durationMin[1] * 60) reasons.push("duration_review_mismatch");
    if (card.intentFamily !== TARGET_INTENT[review.target]) reasons.push("intent_target_mismatch");
    if (!Number.isSafeInteger(review.workSeconds) || review.workSeconds <= 0 ||
        review.workSeconds > context.prescribedDurationSec) reasons.push("target_work_duration_invalid");
    for (const key of [
      "structuredSegmentsVerified", "sportAnchorVerified", "limiterMatchReviewed",
      "doseReviewed", "phaseReviewed", "recoveryAndPainReviewed",
      "weeklyHardDayLoadReviewed", "sameSportSpacingReviewed",
    ] as const) {
      if (review[key] !== true) reasons.push(key + "_not_confirmed");
    }
  }
  return {
    preferred: reasons.length === 0,
    reasons,
    evidence: review,
    requiresCoachApproval: true,
    mayAutoApprovePlan: false,
  };
}

/** Preferences only; NEVER filters a catalogue domain or removes its original alternatives. */
export function sortD15Candidates<T>(
  entries: readonly T[],
  eligibleForPreference: (item: T) => boolean,
  originalCompare: (a: T, b: T) => number,
): T[] {
  return [...entries].sort((a, b) =>
    Number(eligibleForPreference(b)) - Number(eligibleForPreference(a)) ||
    originalCompare(a, b),
  );
}
