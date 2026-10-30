import { describe, expect, it } from "vitest";
import { auditD14KeyStimulus } from "../../../../experimental/workout-v2/d14StimulusEvidence";
import { D12_PROFILES, projectD12Profile } from "../../../../experimental/workout-v2/d12Projection";
import { preparePlanningCaseContext, type PlanningCase } from "@/qa/sports-plan-lab/planningMatrix";
import { prepareGenerationContracts } from "@/lib/plan/prepareGenerationContracts";

describe("D1.4 evidence of a specific physiological stimulus, not a key label", () => {
  it("does not confuse KEY, catalogue zone, or threshold intent with a validated dose", () => {
    const week = auditD14KeyStimulus(1, "load", [
      { id: "TECH", sport: "swim", key: true, intentFamily: "technique" },
      { id: "THRESHOLD", sport: "bike", key: true, intentFamily: "seuil" },
      { id: "VO2_UNKEYED", sport: "run", key: false, intentFamily: "vo2",
        workSegments: [{ seconds: 900, physiologicalTarget: "vo2", referenceVerified: true }],
        limiterMatchVerified: true, phaseCompatible: true, readinessCompatible: true },
    ]);
    expect(week.keyLabeledIds).toEqual(["TECH", "THRESHOLD"]);
    expect(week.intensityIntentIds).toEqual(["THRESHOLD"]);
    expect(week.structuredTargetIds).toEqual([]);
    expect(week.individuallySupportedIds).toEqual([]);
    expect(week.selectedKeyWithoutStimulusEvidence).toEqual(["TECH", "THRESHOLD"]);
    expect(week.status).toBe("missing_verified_stimulus");
    expect(week.canAutoInsert).toBe(false);
  });

  it("separates timed evidence, limiter evidence and recovery permission", () => {
    const incomplete = auditD14KeyStimulus(2, "load", [{
      id: "REAL_INTERVALS", sport: "bike", key: true, intentFamily: "vo2",
      workSegments: [{ seconds: 900, physiologicalTarget: "vo2", referenceVerified: true }],
      doseAdequacyReviewed: false, limiterMatchVerified: false, phaseCompatible: true, readinessCompatible: true,
    }]);
    expect(incomplete.structuredTargetIds).toEqual(["REAL_INTERVALS"]);
    expect(incomplete.individuallySupportedIds).toEqual([]);
    expect(incomplete.status).toBe("missing_verified_stimulus");

    const candidate = auditD14KeyStimulus(2, "load", [{
      id: "REAL_INTERVALS", sport: "bike", key: true, intentFamily: "vo2",
      workSegments: [{ seconds: 900, physiologicalTarget: "vo2", referenceVerified: true }],
      doseAdequacyReviewed: true, limiterMatchVerified: true, phaseCompatible: true, readinessCompatible: true,
    }]);
    expect(candidate.status).toBe("supported_pending_coach_review");
    expect(candidate.sportsGo).toBe(false);
    expect(candidate.canAutoInsert).toBe(false);
    expect(auditD14KeyStimulus(4, "recovery", [{
      id: "HIT", sport: "bike", key: true, intentFamily: "vo2",
    }]).status).toBe("not_applicable");
    expect(() => auditD14KeyStimulus(0, "load", [])).toThrow("D14_INVALID_WEEK");
  });

  it.each(D12_PROFILES)("makes the missing structure visible for real D1.2-selected cards (%s)", profile => {
    const spec: PlanningCase = {
      id: "D1_" + profile, objective: "703", level: "trained", ambition: "age_group",
      load: "known_synthetic", physiology: profile, constraints: "unrestricted",
      duration: "native", intermediate: false,
    };
    const { prepared } = preparePlanningCaseContext(spec);
    const preparation = prepareGenerationContracts(prepared.athleteData,
      { ...prepared.planConfig, planStartDate: "2026-10-26" }, { rotationSeed: 0 });
    const cards = [...new Map([
      ...Object.values(preparation.phaseRepairCatalogs).flat(),
      ...preparation.chunkRepairCatalogs.flat(),
      ...preparation.chunkRegenRepairCatalogs.flat(),
    ].map(m => [m.id, m])).values()];
    const byId = new Map(cards.map(m => [m.id, m]));
    const projection = projectD12Profile(profile);
    expect(projection.status).toBe("candidate");
    for (const week of projection.weeklyPreview) {
      const annotated = week.sessions.map(s => ({
        id: s.id, sport: s.sport, key: s.key,
        intentFamily: s.id ? byId.get(s.id)?.intentFamily : null,
        // No model-labelled text is upgraded into verified timed work segments.
      }));
      const evidence = auditD14KeyStimulus(week.week, week.week === 4 ? "recovery" : "load", annotated);
      expect(evidence.canAutoInsert).toBe(false);
      expect(evidence.sportsGo).toBe(false);
      expect(evidence.individuallySupportedIds).toEqual([]);
      expect(evidence.status).toBe(week.week === 4 ? "not_applicable" : "missing_verified_stimulus");
    }
  });
});
