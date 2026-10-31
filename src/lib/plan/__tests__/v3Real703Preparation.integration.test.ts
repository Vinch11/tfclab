import { describe, expect, it } from "vitest";
import { preparePrevalidationFixture } from "@/qa/sports-plan-lab/prevalidationFixtures";
import { prepareGenerationContracts } from "@/lib/plan/prepareGenerationContracts";
import { syntheticV32BikeInputs } from "@/lib/__tests__/v32SyntheticPilotFixture";

/**
 * Real production preparation path: goal -> physiology/context -> phase/chunk
 * catalogues -> provider repair metadata. All data synthetic and offline.
 */
describe("V3 in the REAL 70.3 generation-preparation engine", () => {
  it("selects a named reviewed candidate but keeps the legacy default unchanged", () => {
    const fixture = preparePrevalidationFixture("B-70.3");
    const meta = fixture.planConfig.ambitionMeta;
    expect(meta).toBeDefined();
    const config = {
      ...fixture.planConfig,
      ambitionMeta: { ...meta!, trainingLevel: "trained" as const, trainingLevelSource: "manual" as const },
      _outputFormat: "json" as const,
    };
    const baseline = prepareGenerationContracts(fixture.athleteData, config, { rotationSeed: 11 });
    expect(baseline.allowedCatalogIds.some(id => id.startsWith("V3P_"))).toBe(false);
    const pilot = prepareGenerationContracts(fixture.athleteData, config, {
      rotationSeed: 11,
      v3CoachPilot: {
        coachReviewedIds: new Set(["V3P_BIKE_008"]),
        individualInputsById:new Map([["V3P_BIKE_008",syntheticV32BikeInputs("V3P_BIKE_008")]]),
        acknowledgedExperimentalRisk: true,
      },
    });
    expect(pilot.allowedCatalogIds).toContain("V3P_BIKE_008");
    expect(
      Object.values(pilot.phaseRepairCatalogs).flat().some(card => card.id === "V3P_BIKE_008") ||
      pilot.chunkRepairCatalogs.flat().some(card => card.id === "V3P_BIKE_008"),
    ).toBe(true);
    expect(pilot.phaseRepairCatalogs).toBeDefined();
    expect(pilot.chunkRepairCatalogs).toBeDefined();
  }, 60000);
});
