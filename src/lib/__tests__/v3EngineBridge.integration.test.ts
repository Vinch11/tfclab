import { describe, expect, it } from "vitest";
import { buildWorkoutCatalog, serializeCatalogForPrompt } from "../workoutCatalogBuilder";
import { buildV3CoachPilotPool, lookupV3Recipe, materializeV3ForPlanEngine, planContainsV3Candidate } from "../v3EngineBridge";
import { validateSessionCataloguePlan } from "../plan/sessionCatalogueValidation";

const REVIEWED = { coachReviewedIds: new Set(["V3P_BIKE_008"]), acknowledgedExperimentalRisk: true as const };
const noHistoric = [/^(?!V3P_)/];
const makeCatalog = (ids: Set<string>) =>
  buildWorkoutCatalog("half", 3, 4, 12, {
    v3CoachPilot: { coachReviewedIds: ids, acknowledgedExperimentalRisk: true },
    sportFilter: ["cyclisme"],
    phaseOverride: ["build"],
    strictPhaseFilter: true,
    beginnerIntensitySignal: { trainingLevel: "trained", trainingLevelSource: "manual" },
    excludeIdPatterns: noHistoric,
    maxItems: 20,
  });

describe("V3 -> REAL TFCLab workoutCatalogBuilder (isolated coach pilot)", () => {
  it("registers exactly 400 V3 identities without auto-approving one", () => {
    const pool = buildV3CoachPilotPool({
      coachReviewedIds: new Set<string>(), acknowledgedExperimentalRisk: true,
    });
    expect(pool.totalCandidates).toBe(400);
    expect(pool.accepted).toHaveLength(0);
    expect(pool.rejected).toHaveLength(400);
    expect(pool.rejected.every(x => x.code === "NOT_REVIEWED_BY_COACH")).toBe(true);
  });

  it("allows the real plan engine to score an explicit reviewed bike recipe", () => {
    const entries = makeCatalog(new Set(["V3P_BIKE_008"]));
    const session = entries.find(x => x.id === "V3P_BIKE_008");
    expect(session).toBeDefined();
    expect(session?.sport).toBe("cyclisme");
    expect(session?.physiology?.primary).toBe("mlss");
    expect(session?.canonicalDurationMin).toBe(78);
    expect(session?.repairMetadata.mainZoneMax).toBeGreaterThanOrEqual(4);
    expect(serializeCatalogForPrompt(entries)).toContain("V3P_BIKE_008");
  });

  it("cannot select unreviewed V3 by default even with the same week and goal", () => {
    expect(makeCatalog(new Set<string>()).some(e => e.id.startsWith("V3P_"))).toBe(false);
    const defaultPool = buildWorkoutCatalog("half", 3, 4, 12, {
      sportFilter: ["cyclisme"], phaseOverride: ["build"], maxItems: 30,
    });
    expect(defaultPool.some(e => e.id.startsWith("V3P_"))).toBe(false);
  });

  it("refuses a coach-reviewed V3 interval if level is lower or not manually verified", () => {
    const common = {
      v3CoachPilot: REVIEWED,
      sportFilter: ["cyclisme" as const], phaseOverride: ["build" as const],
      strictPhaseFilter: true, excludeIdPatterns: noHistoric,
    };
    const low = buildWorkoutCatalog("half", 3, 4, 12, {
      ...common, beginnerIntensitySignal: { trainingLevel: "light", trainingLevelSource: "manual" },
    });
    expect(low.some(e => e.id === "V3P_BIKE_008")).toBe(false);
    const unverified = buildWorkoutCatalog("half", 3, 4, 12, {
      ...common, beginnerIntensitySignal: { trainingLevel: "trained", trainingLevelSource: "unknown" },
    });
    expect(unverified.some(e => e.id === "V3P_BIKE_008")).toBe(false);
  });

  it("does not fabricate swimming time or strength appointment minutes", () => {
    const swim = lookupV3Recipe("V3P_SWIM_007")!;
    const strength = lookupV3Recipe("V3P_STRENGTH_001")!;
    expect(materializeV3ForPlanEngine(swim).code).toBe("MISSING_SWIM_PACES");
    expect(materializeV3ForPlanEngine(strength).code).toBe("STRENGTH_DURATION_UNVERIFIED");
    const pool = buildV3CoachPilotPool({
      coachReviewedIds: new Set([swim.id, strength.id]), acknowledgedExperimentalRisk: true,
    });
    expect(pool.accepted).toHaveLength(0);
    expect(pool.rejected.map(r => r.code)).toContain("MISSING_SWIM_PACES");
    expect(pool.rejected.map(r => r.code)).toContain("STRENGTH_DURATION_UNVERIFIED");
  });

  it("blocks V3 saving and Nolio for an experimental session even when ID appears in details", () => {
    expect(planContainsV3Candidate({
      weeks: [{ sessions: [{ catalogId: "V3P_BIKE_008" }] }],
    })).toBe(true);
    expect(planContainsV3Candidate({
      weeks: [{ sessions: [{ title: "Alternative", details: "V3P_RUN_002" }] }],
    })).toBe(true);
    expect(planContainsV3Candidate({
      weeks: [{ sessions: [{ catalogId: "A_RUN_Z2_EASY" }] }],
    })).toBe(false);
  });

  it("validates real V3 ID and duration in the final session catalogue contract", () => {
    const card = materializeV3ForPlanEngine(lookupV3Recipe("V3P_BIKE_008")!).workout!;
    expect(card.durationMin).toEqual([78, 78]);
    const plan = {
      weeks: [{
        weekNumber: 3,
        phase: "build",
        sessions: [{
          catalogId: card.id,
          sport: "bike",
          title: card.objectif,
          details: card.structure.map(s => s.text).join(" ; "),
          durationMin: 78,
          zones: ["Z4"],
        }],
      }],
    };
    const good = validateSessionCataloguePlan(plan, "half", REVIEWED);
    expect(good.filter(i => i.severity === "error")).toEqual([]);
    const wrongDuration = structuredClone(plan);
    wrongDuration.weeks[0].sessions[0].durationMin = 100;
    const rejected = validateSessionCataloguePlan(wrongDuration, "half", REVIEWED);
    expect(rejected.some(i => i.message.includes("catalogue_duration"))).toBe(true);
    const missing = validateSessionCataloguePlan(plan, "half");
    expect(missing.some(i => i.message.includes("catalogue_metadata_missing"))).toBe(true);
  });
});
