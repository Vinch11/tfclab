import { describe, expect, it } from "vitest";
import { previewV3Workout } from "../../../../scripts/library-v3/coachPreview";
import {
  auditV3Catalogue, evaluateV3Workout, v3PilotCatalogue,
  type V3Workout,
} from "../../../../scripts/library-v3/catalogueRuntime";

const byId = (id: string): V3Workout => {
  const workout = v3PilotCatalogue.workouts.find(w => w.id === id);
  if (!workout) throw new Error("missing fixture: " + id);
  return workout;
};

describe("TFCLab V3 pilot — isolated structured recipes", () => {
  it("contains 100 actual candidate recipes, 40 bike and 20 in each other sport", () => {
    expect(v3PilotCatalogue.workouts).toHaveLength(100);
    expect(v3PilotCatalogue.counts).toEqual({ bike: 40, run: 20, swim: 20, strength: 20 });
    expect(new Set(v3PilotCatalogue.workouts.map(w => w.id)).size).toBe(100);
  });
  it("all candidates pass the metadata and structure audit", () => {
    expect(auditV3Catalogue()).toEqual([]);
  });
  it("does not expose unreviewed candidates to the live plan engine", () => {
    for (const w of v3PilotCatalogue.workouts) {
      expect(w.automaticSelection, w.id).toBe(false);
      expect(w.status, w.id).toBe("candidate");
      expect(w.evidence.sessionSpecificValidation, w.id).toBe(false);
    }
  });
  it("calculates bike LT2 blocks and only the between-repetition recoveries", () => {
    // 18 min warmup + 3 × 12 min + 2 × 6 min rest + 12 min cooldown.
    const w = byId("V3P_BIKE_008");
    expect(evaluateV3Workout(w).minutes).toBe(78);
    expect(evaluateV3Workout(w, { overrides: { "1.count": 4 } }).minutes).toBe(96);
    expect(() => evaluateV3Workout(w, { overrides: { "1.count": 5 } }))
      .toThrow("V3_OUT_OF_BOUNDS");
    expect(evaluateV3Workout(w).minutes).toBe(78); // no mutation
  });
  it("preserves run VO2 effort minutes, rests and cooldown", () => {
    const w = byId("V3P_RUN_009");
    expect(evaluateV3Workout(w).minutes).toBe(59);
  });
  it("does not invent swim distance-to-time without measured paces", () => {
    const w = byId("V3P_SWIM_007");
    const unresolved = evaluateV3Workout(w);
    expect(unresolved.distanceM).toBe(1700);
    expect(unresolved.status).toBe("unresolved");
    expect(unresolved.minutes).toBeNull();
    expect(unresolved.unknown.length).toBeGreaterThan(0);
    // A concrete athlete has provided paces for every referenced domain.
    const computed = evaluateV3Workout(w, { swimPaces: { recovery: 120, mlss: 100 } });
    expect(computed.status).toBe("confirmed");
    expect(computed.seconds).toBe(2020);
    expect(computed.distanceM).toBe(1700);
  });
  it("never claims strength set-time estimates are exact training durations", () => {
    const result = evaluateV3Workout(byId("V3P_STRENGTH_001"));
    expect(result.status).toBe("estimated");
    expect(result.estimated).toBe(true);
    expect(result.seconds).toBeGreaterThan(0);
  });
  it("detects duplicate IDs, missing physiological intent and unsourced evidence", () => {
    const clone = structuredClone(v3PilotCatalogue);
    clone.workouts[1].id = clone.workouts[0].id;
    clone.workouts[2].primaryIntent = "" as never;
    clone.workouts[3].evidence.referenceIds = ["MADE_UP"];
    const errors = auditV3Catalogue(clone);
    expect(errors.some(e => e.includes("DUPLICATE_ID"))).toBe(true);
    expect(errors.some(e => e.includes("MISSING_INTENT"))).toBe(true);
    expect(errors.some(e => e.includes("UNTRACEABLE_REFERENCE"))).toBe(true);
  });
});
describe("TFCLab V3 pilot — read-only previews", () => {
  it("renders threshold blocks without inventing %FTP or an extra final rest", () => {
    const p = previewV3Workout(byId("V3P_BIKE_008"));
    expect(p.durationText).toContain("78.0 min");
    expect(p.sections.some(s => s.includes("3×"))).toBe(true);
    expect(p.fullText).toContain("Statut : candidat non validé");
    expect(p.automaticallyPrescribable).toBe(false);
  });
  it("shows measured swim distance but refuses a fabricated duration", () => {
    const p = previewV3Workout(byId("V3P_SWIM_007"));
    expect(p.distanceM).toBe(1700);
    expect(p.durationText).toContain("non résolue");
    expect(p.unresolved.length).toBeGreaterThan(0);
    expect(p.fullText).toContain("Distance : 1700 m");
  });
  it("reports strength appointment time as indicative, not exact", () => {
    const p = previewV3Workout(byId("V3P_STRENGTH_001"));
    expect(p.durationText).toContain("indicative");
  });
  it("rejects overrides outside safety bounds during preview", () => {
    expect(() => previewV3Workout(byId("V3P_BIKE_008"), { overrides: { "1.count": 100 } }))
      .toThrow("V3_OUT_OF_BOUNDS");
  });
});
