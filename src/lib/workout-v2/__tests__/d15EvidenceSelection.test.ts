import { describe, expect, it } from "vitest";
import {
  assessD15Candidate, sortD15Candidates, type D15ReviewEvidence,
  type D15SlotContext,
} from "../../../../experimental/workout-v2/d15EvidenceSelection";
import { D12_PROFILES, projectD12Profile } from "../../../../experimental/workout-v2/d12Projection";

const CARD = {
  id: "THRESHOLD_REVIEWED", sport: "Vélo", intentFamily: "seuil" as const,
  structure: "15min échauffement ; 3 × 8min cible individualisée ; récupérations ; retour au calme",
  durationMin: [50, 75] as [number, number],
};
const SLOT: D15SlotContext = {
  week: 2, dayIndex: 2, weekType: "load", phase: "base",
  slot: { sport: "bike", isKeySession: true },
  prescribedDurationSec: 60 * 60,
};
const REVIEW: D15ReviewEvidence = {
  cardId: CARD.id, sport: "bike", week: 2, dayIndex: 2, phase: "base",
  limiter: "TTE", target: "threshold", workSeconds: 3 * 8 * 60,
  reviewedStructure: CARD.structure, reviewedDurationSec: 60 * 60,
  structuredSegmentsVerified: true,
  sportAnchorVerified: true,
  limiterMatchReviewed: true,
  doseReviewed: true,
  phaseReviewed: true,
  recoveryAndPainReviewed: true,
  weeklyHardDayLoadReviewed: true,
  sameSportSpacingReviewed: true,
};

describe("D1.5: proof-gated preference not high-intensity quota filling", () => {
  it("fails closed when no reviewed individual proof is provided", () => {
    const result = assessD15Candidate(CARD, SLOT, ["TTE"], []);
    expect(result.preferred).toBe(false);
    expect(result.reasons).toContain("review_missing");
    expect(result.mayAutoApprovePlan).toBe(false);
  });

  it("can only prefer a card with an exact reviewed stimulus, limiter and slot", () => {
    const result = assessD15Candidate(CARD, SLOT, ["VO2max", "TTE"], [REVIEW]);
    expect(result.preferred).toBe(true);
    expect(result.reasons).toEqual([]);
    expect(result.requiresCoachApproval).toBe(true);
    expect(result.mayAutoApprovePlan).toBe(false);
    const alternatives = [
      { id: "TECH", approved: false, oldRank: 0 },
      { id: CARD.id, approved: result.preferred, oldRank: 4 },
      { id: "EASY", approved: false, oldRank: 1 },
    ];
    const before = [...alternatives].sort((a, b) => a.oldRank - b.oldRank).map(x => x.id);
    const after = sortD15Candidates(alternatives, x => x.approved, (a, b) => a.oldRank - b.oldRank).map(x => x.id);
    expect(before).toEqual(["TECH", "EASY", CARD.id]);
    expect(after).toEqual([CARD.id, "TECH", "EASY"]);
    expect(alternatives[0].id).toBe("TECH"); // immutable
    expect(sortD15Candidates(alternatives, () => false, (a,b) => a.oldRank - b.oldRank).map(x=>x.id)).toEqual(before);
  });

  it("refuses optimistic priority from intent only, wrong sport, bad phase and recovery week", () => {
    expect(assessD15Candidate(CARD, SLOT, ["TTE"], [{ ...REVIEW, doseReviewed: false }]).reasons)
      .toContain("doseReviewed_not_confirmed");
    expect(assessD15Candidate(CARD, SLOT, ["TTE"], [{ ...REVIEW, sportAnchorVerified: false }]).preferred).toBe(false);
    expect(assessD15Candidate(CARD, SLOT, [], [REVIEW]).reasons).toContain("limiter_not_in_plan");
    expect(assessD15Candidate(CARD, { ...SLOT, slot: { sport: "run", isKeySession: true } }, ["TTE"], [REVIEW]).reasons)
      .toContain("sport_mismatch");
    expect(assessD15Candidate(CARD, { ...SLOT, weekType: "recovery" }, ["TTE"], [REVIEW]).reasons)
      .toContain("not_load_key_slot");
    expect(assessD15Candidate(CARD, { ...SLOT, slot: { sport: "bike", isKeySession: false } }, ["TTE"], [REVIEW]).preferred).toBe(false);
    expect(assessD15Candidate(CARD, { ...SLOT, phase: "build" }, ["TTE"], [REVIEW]).preferred).toBe(false);
    expect(assessD15Candidate({ ...CARD, intentFamily: "technique" }, SLOT, ["TTE"], [REVIEW]).reasons)
      .toContain("intent_target_mismatch");
  });

  it("refuses edited V1 card, mismatched dose, inflated work and contradictory duplicate reviews", () => {
    expect(assessD15Candidate({ ...CARD, structure: "edited" }, SLOT, ["TTE"], [REVIEW]).reasons)
      .toContain("stale_or_missing_structure_review");
    expect(assessD15Candidate(CARD, { ...SLOT, prescribedDurationSec: 61 * 60 }, ["TTE"], [REVIEW]).reasons)
      .toContain("duration_review_mismatch");
    expect(assessD15Candidate(CARD, SLOT, ["TTE"], [{ ...REVIEW, workSeconds: 5000 }]).reasons)
      .toContain("target_work_duration_invalid");
    expect(assessD15Candidate(CARD, SLOT, ["TTE"], [REVIEW, REVIEW]).reasons)
      .toContain("ambiguous_review");
  });

  it.each(D12_PROFILES)("leaves D1.2 %s unchanged with no independently reviewed dose", profile => {
    const original = projectD12Profile(profile);
    const replay = projectD12Profile(profile, [{ ...REVIEW, cardId: "NOT_IN_PREPARED_CATALOG" }]);
    expect(original.status).toBe("candidate");
    expect(replay.status).toBe("candidate");
    expect(original.reviewedSelections).toEqual([]);
    expect(replay.reviewedSelections).toEqual([]);
    expect(replay.weeksConstructed).toBe(original.weeksConstructed);
    expect(replay.slotsByWeek).toEqual(original.slotsByWeek);
    expect(replay.criticalDetails).toEqual(original.criticalDetails);
    expect(replay.weeklyPreview).toEqual(original.weeklyPreview);
    expect(replay.realPlanValidated).toBe(false);
    expect(replay.individualPrescriptionApproved).toBe(false);
  });
});
