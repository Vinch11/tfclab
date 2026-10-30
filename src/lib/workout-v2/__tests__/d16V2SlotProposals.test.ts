import { describe, expect, it } from "vitest";
import { proposeD16V2ForSlot, type D16Request } from "../../../../experimental/workout-v2/d16V2SlotProposals";
import { D12_PROFILES } from "../../../../experimental/workout-v2/d12CohortAudit";
import { preparePlanningCaseContext, type PlanningCase } from "@/qa/sports-plan-lab/planningMatrix";

const baseline = (): D16Request => ({
  goal: "half", phase: "base", level: "trained",
  slot: {
    week: 2, day: "mardi", key: true, weekType: "load",
    sport: "bike", durationSec: 3600, minDurationSec: 3000, maxDurationSec: 4200,
  },
  profileLimiters: ["TTE", "VO2max"],
  coachRequest: {
    limiter: "TTE", focus: "threshold",
    justification: "Coach requests a reviewed experimental stimulus for the TTE limiter; hypothesis only.",
    coachFocusReviewed: true,
  },
  anchors: { ftpW: { value: 280, verified: true, sport: "bike" } },
  provenance: { anchorEvidenceId: "QA_EXPLICIT_VERIFIED_ANCHOR_NOT_REAL_ATHLETE", verifiedForProvisionalTarget: true },
  readiness: "ready", pain: false, recoveryConcern: false,
});

describe("D1.6: structured V2 data for an actual key-slot hypothesis", () => {
  it("constructs an exact structured threshold candidate without claiming an approved dose", () => {
    const request = baseline();
    const r = proposeD16V2ForSlot(request);
    expect(r.status).toBe("structured_candidate_coach_review");
    expect(r.proposals).toHaveLength(1);
    const p = r.proposals[0];
    expect(p.modelId).toBe("V2_BIKE_02");
    expect(p.chosen.plannedDurationSec).toBe(3600);
    expect(p.chosen.steps.reduce((n, s) => n + s.durationSec, 0)).toBe(3600);
    expect(p.targetWorkSeconds).toBeGreaterThan(0);
    expect(p.targetWorkSeconds).toBeLessThan(3600);
    expect(p.preview.planSession.durationMin).toBe(60);
    expect(p.preview.planSession.catalogId).toBeNull();
    expect(p.preview.planSession.custom).toBe(true);
    expect(p.preview.canAutoInsert).toBe(false);
    expect(p.preview.canExportNolio).toBe(false);
    expect(p.stimulusAudit.structuredTargetIds).toEqual(["V2_BIKE_02"]);
    expect(p.stimulusAudit.individuallySupportedIds).toEqual([]);
    expect(p.stimulusAudit.status).toBe("missing_verified_stimulus");
    expect(r.mayApproveIndividualDose).toBe(false);
    expect(r.mayModifyD1).toBe(false);
    expect(r.mayPersist).toBe(false);
    expect(r.mayExport).toBe(false);
    expect(request.anchors?.ftpW?.verified).toBe(true);
  });

  it("uses an explicit coach-selected focus to distinguish VO2 from threshold, not athlete archetype", () => {
    const high = proposeD16V2ForSlot({
      ...baseline(), phase: "build",
      coachRequest: {
        limiter: "VO2max", focus: "vo2", coachFocusReviewed: true,
        justification: "Independent coach review hypothesis for a VO2-focused session.",
      },
    });
    expect(high.status).toBe("structured_candidate_coach_review");
    expect(high.proposals.map(x => x.modelId)).toEqual(["V2_BIKE_03"]);
    expect(high.proposals[0].stimulusAudit.structuredTargetIds).toEqual(["V2_BIKE_03"]);
    expect(high.proposals[0].stimulusAudit.individuallySupportedIds).toEqual([]);
    const baselineResult = proposeD16V2ForSlot(baseline());
    expect(baselineResult.proposals[0].modelId).not.toBe(high.proposals[0].modelId);
    expect(high.mayApproveIndividualDose).toBe(false);
  });

  it("does not convert raw FTP or VMA to verified, nor assume source provenance from a numeric value", () => {
    const unverifiedAnchor = proposeD16V2ForSlot({
      ...baseline(), anchors: { ftpW: { value: 280, verified: false, sport: "bike" } },
    });
    expect(unverifiedAnchor.status).toBe("blocked");
    expect(unverifiedAnchor.rejectedModels[0].reasons).toContain("anchor_ftpW_missing_or_unverified");

    const noSource = proposeD16V2ForSlot({
      ...baseline(), provenance: { anchorEvidenceId: null, verifiedForProvisionalTarget: false },
    });
    expect(noSource.status).toBe("blocked");
    expect(noSource.reasons).toContain("anchor_provenance_unverified");
    expect(noSource.proposals).toEqual([]);
  });

  it("rejects missing coach limiter, incompatible week, pain, unknown reference, time, and phase", () => {
    const candidates: Array<[D16Request, string]> = [
      [{ ...baseline(), coachRequest: null }, "coach_focus_missing"],
      [{ ...baseline(), coachRequest: { ...baseline().coachRequest!, limiter: "Fabricated" } }, "limiter_not_in_profile"],
      [{ ...baseline(), slot: { ...baseline().slot, key: false } }, "not_load_key_slot"],
      [{ ...baseline(), slot: { ...baseline().slot, weekType: "recovery" } }, "not_load_key_slot"],
      [{ ...baseline(), recoveryConcern: true }, "recovery_or_pain_gate"],
      [{ ...baseline(), pain: true }, "recovery_or_pain_gate"],
      [{ ...baseline(), readiness: "uncertain" }, "recovery_or_pain_gate"],
      [{ ...baseline(), slot: { ...baseline().slot, durationSec: 4800 } }, "slot_maximum_exceeded"],
      [{ ...baseline(), slot: { ...baseline().slot, durationSec: 0 } }, "invalid_slot_duration"],
      [{ ...baseline(), coachRequest: { ...baseline().coachRequest!, coachFocusReviewed: false } }, "coach_focus_missing"],
      [{ ...baseline(), phase: "taper" }, "no_v2_model_for_sport_goal_phase_focus"],
    ];
    for (const [input, expectedReason] of candidates) {
      const r = proposeD16V2ForSlot(input);
      expect(r.status).toBe("blocked");
      expect(r.reasons).toContain(expectedReason);
      expect(r.mayModifyD1).toBe(false);
      expect(r.mayExport).toBe(false);
    }
  });

  it.each(D12_PROFILES)("fails safely on actual synthetic 70.3 profile %s without certified test provenance", profile => {
    const spec: PlanningCase = {
      id: "D1_" + profile, objective: "703", level: "trained", ambition: "age_group",
      load: "known_synthetic", physiology: profile, constraints: "unrestricted",
      duration: "native", intermediate: false,
    };
    const { prepared } = preparePlanningCaseContext(spec);
    const limiterOrder = prepared.planConfig.identifiedLimitersRaw ?? [];
    const result = proposeD16V2ForSlot({
      ...baseline(),
      profileLimiters: limiterOrder,
      coachRequest: {
        limiter: limiterOrder[0] ?? "not_documented",
        focus: "threshold", justification: "Exploratory test only, no actual athlete verification",
        coachFocusReviewed: true,
      },
      anchors: { ftpW: {
        value: prepared.athleteData.ftp ?? 0, sport: "bike", verified: false,
      } },
      provenance: { anchorEvidenceId: null, verifiedForProvisionalTarget: false },
    });
    expect(result.status).toBe("blocked");
    expect(result.proposals).toEqual([]);
    expect(result.reasons).toContain("anchor_provenance_unverified");
    expect(result.declaredCompetitionUnchanged).toBe(true);
    expect(result.mayApproveIndividualDose).toBe(false);
  });
});
