import { describe, expect, it } from "vitest";
import { auditD14DurationRatios } from "../../../../experimental/workout-v2/d14RatioEvidence";
import { D12_PROFILES, projectD12Profile } from "../../../../experimental/workout-v2/d12Projection";

describe("D1.4 duration ratios: complete evidence only, never production approval", () => {
  it("computes all percentages only with an exact verified brick split", () => {
    const input = [
      { sport: "swim", durationMin: 90 },
      { sport: "bike", durationMin: 160 },
      { sport: "run", durationMin: 90 },
      { sport: "brick", durationMin: 75, brickComponents: {
        bikeMin: 55, runMin: 18, transitionMin: 2, verified: true,
      } },
      { sport: "strength", durationMin: null },
    ];
    const result = auditD14DurationRatios(input);
    expect(result.status).toBe("observed_complete");
    expect(result.reasonCodes).toEqual([]);
    expect(result.enduranceSeconds).toBe(415 * 60);
    expect(result.sharePct.swim).toBe(21.7);
    expect(result.sharePct.bike).toBe(51.8);
    expect(result.sharePct.run).toBe(26);
    expect(result.sharePct.transition).toBe(0.5);
    expect(result.countedSeconds.brickUnattributed).toBe(0);
    expect(result.sportRatioTargetMeaningApproved).toBe(false);
    expect(result.mayReplaceProductionValidator).toBe(false);
    expect(input[3].brickComponents.bikeMin).toBe(55);
  });

  it("does not invent the bike/run split when the total brick duration is known", () => {
    const result = auditD14DurationRatios([
      { sport: "swim", durationMin: 180 },
      { sport: "bike", durationMin: 600 },
      { sport: "run", durationMin: 185 },
      { sport: "brick", durationMin: 100 },
    ]);
    expect(result.enduranceSeconds).toBe(1065 * 60);
    expect(result.sharePct.swim).toBe(16.9);
    expect(result.sharePct.bike).toBeNull();
    expect(result.sharePct.run).toBeNull();
    expect(result.possibleBikePct).toEqual([56.3, 65.7]);
    expect(result.possibleRunPct).toEqual([17.4, 26.8]);
    expect(result.status).toBe("non_conclusive");
    expect(result.reasonCodes).toContain("brick_components_unverified");
  });

  it("rejects incomplete, invalid, or fabricated durations rather than dividing partial totals", () => {
    for (const duration of [undefined, null, -1, Infinity, NaN, 0, 0.00001]) {
      const result = auditD14DurationRatios([
        { sport: "swim", durationMin: 60 },
        { sport: "bike", durationMin: duration },
      ]);
      expect(result.status).toBe("non_conclusive");
      expect(result.sharePct.swim).toBeNull();
      expect(result.enduranceSeconds).toBeNull();
    }
    const invalidBrick = auditD14DurationRatios([
      { sport: "swim", durationMin: 60 },
      { sport: "brick", durationMin: 70,
        brickComponents: { bikeMin: 50, runMin: 15, transitionMin: 2, verified: true } },
    ]);
    expect(invalidBrick.reasonCodes).toContain("brick_components_invalid");
    expect(invalidBrick.countedSeconds.brickUnattributed).toBe(4200);
    expect(invalidBrick.sharePct.bike).toBeNull();
    const unsupported = auditD14DurationRatios([{ sport: "unknown_sport", durationMin: 40 }]);
    expect(unsupported.reasonCodes).toContain("invalid_sport");
    expect(unsupported.status).toBe("non_conclusive");
  });

  it.each(D12_PROFILES)("audits the unchanged experimental candidate %s without a false sports GO", profile => {
    const projection = projectD12Profile(profile);
    expect(projection.status).toBe("candidate");
    const selected = projection.weeklyPreview.filter(w => w.week <= 3).flatMap(w => w.sessions);
    const audit = auditD14DurationRatios(selected.map(s => ({ sport: s.sport, durationMin: s.minutes })));
    const baseline = {
      aerobic_dominant: { swim: 16.9, total: 1065 },
      glycolytic_dominant: { swim: 17.6, total: 1110 },
      balanced_typical: { swim: 17.9, total: 1090 },
    }[profile];
    expect(audit.enduranceSeconds).toBe(baseline.total * 60);
    expect(audit.sharePct.swim).toBe(baseline.swim);
    expect(audit.status).toBe("non_conclusive");
    expect(audit.reasonCodes).toContain("brick_components_unverified");
    expect(audit.sharePct.bike).toBeNull();
    expect(audit.sharePct.run).toBeNull();
    expect(audit.mayReplaceProductionValidator).toBe(false);
  });
});
