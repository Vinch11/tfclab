import { describe, expect, it } from "vitest";
import { brickBlueprints, previewV3Brick } from "../../../../scripts/library-v3/brickComposer";
import { fitV3Duration } from "../../../../scripts/library-v3/durationFitter";
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
  it("contains 400 actual candidate recipes, 100 in each sport", () => {
    expect(v3PilotCatalogue.workouts).toHaveLength(400);
    expect(v3PilotCatalogue.counts).toEqual({ bike: 100, run: 100, swim: 100, strength: 100 });
    expect(new Set(v3PilotCatalogue.workouts.map(w => w.id)).size).toBe(400);
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

describe("TFCLab V3 — 400 candidate coverage and non-duplication", () => {
  const all = v3PilotCatalogue.workouts;
  it("has contiguous stable IDs per sport with exactly 100 each", () => {
    for (const sport of ["BIKE", "RUN", "SWIM", "STRENGTH"]) {
      const ids = all.filter(w => w.sport === sport.toLowerCase()).map(w => w.id).sort();
      expect(ids).toEqual(Array.from({ length: 100 }, (_, i) => "V3P_" + sport + "_" + String(i + 1).padStart(3, "0")));
    }
  });
  it("has no exact duplicate recipe when ignoring metadata, IDs and titles", () => {
    const bySport = new Map<string, Set<string>>();
    for (const w of all) {
      const key = JSON.stringify({ blocks: w.blocks, primaryIntent: w.primaryIntent, primaryDomain: w.primaryDomain });
      const seen = bySport.get(w.sport) ?? new Set<string>();
      expect(seen.has(key), w.id + " is an exact clone").toBe(false);
      seen.add(key);
      bySport.set(w.sport, seen);
    }
  });
  it("each athlete-facing numeric quantity is strictly positive and within its declared bounds", () => {
    function walk(blocks: V3Workout["blocks"]): void {
      for (const block of blocks) {
        if (block.kind === "repeat") {
          expect(block.count.min).toBeGreaterThan(0);
          expect(block.count.min).toBeLessThanOrEqual(block.count.base);
          expect(block.count.base).toBeLessThanOrEqual(block.count.max);
          expect(block.betweenSec).toBeGreaterThanOrEqual(0);
          walk(block.steps);
        } else {
          const bounds = block.seconds ?? block.meters ?? block.reps;
          expect(bounds?.min, block.label).toBeGreaterThan(0);
          expect(bounds?.min).toBeLessThanOrEqual(bounds!.base);
          expect(bounds!.base).toBeLessThanOrEqual(bounds!.max);
        }
      }
    }
    all.forEach(w => walk(w.blocks));
  });
  it("every swim recipe remains unresolved without a personal pace", () => {
    for (const w of all.filter(w => w.sport === "swim")) {
      const result = evaluateV3Workout(w);
      expect(result.status, w.id).toBe("unresolved");
      expect(result.minutes, w.id).toBeNull();
      expect(result.distanceM, w.id).toBeGreaterThan(0);
    }
  });
  it("every swimming recipe becomes computable only with explicit per-domain pace", () => {
    const swimPaces = { recovery: 140, moderate_lt1: 120, tempo: 110, sub_threshold: 105,
      mlss: 100, vo2max: 95, neuromuscular: 90 };
    for (const w of all.filter(w => w.sport === "swim")) {
      const result = evaluateV3Workout(w, { swimPaces });
      expect(result.status, w.id).toBe("confirmed");
      expect(result.seconds, w.id).toBeGreaterThan(0);
    }
  });
  it("strength recipes with exercises do not misrepresent estimated duration as exact", () => {
    for (const w of all.filter(w => w.sport === "strength")) {
      const result = evaluateV3Workout(w);
      expect(result.status, w.id).toBe("estimated");
      expect(result.estimated, w.id).toBe(true);
    }
  });
  it("all candidate intensities map to the shared TFCL doctrine", () => {
    const allowed = new Set([
      "recovery", "moderate_lt1", "tempo", "im_pace", "703_pace", "marathon_pace",
      "sub_threshold", "semi_pace", "mlss", "vo2max", "neuromuscular",
    ]);
    for (const w of all) {
      function walk(blocks: V3Workout["blocks"]): void {
        blocks.forEach(b => {
          if (b.kind === "repeat") walk(b.steps);
          else if (b.domain !== null) expect(allowed.has(b.domain), w.id).toBe(true);
        });
      }
      walk(w.blocks);
    }
  });
});
describe("TFCLab V3 — deterministic bounded slot fitting (PREVIEW ONLY)", () => {
  it("can fit 96 min threshold bike by selecting an allowed additional block, never changing its domain", () => {
    const w = byId("V3P_BIKE_008");
    const original = JSON.stringify(w);
    const implicit = fitV3Duration(w, 96);
    expect(implicit.fitsSlot).toBe(false); // no extra threshold rep just to fill a slot
    const fitted = fitV3Duration(w, 96, { allowWorksetChange: true });
    expect(fitted.code).toBe("FIT_WITHIN_DECLARED_BOUNDS");
    expect(fitted.fitsSlot).toBe(true);
    expect(fitted.computed.minutes).toBe(96);
    expect(fitted.automaticSelectionAllowed).toBe(false);
    expect(JSON.stringify(w)).toBe(original);
  });
  it("refuses a target that cannot be reached within bounded variants", () => {
    const result = fitV3Duration(byId("V3P_BIKE_008"), 180);
    expect(result.fitsSlot).toBe(false);
    expect(result.code).toBe("OUTSIDE_DECLARED_BOUNDS");
  });
  it("refuses swimming slot-duration fitting without the relevant actual pace", () => {
    const result = fitV3Duration(byId("V3P_SWIM_007"), 40);
    expect(result.code).toBe("SWIM_PACE_REQUIRED");
    expect(result.fitsSlot).toBe(false);
  });
  it("never converts estimated strength time into an exact scheduled 50min slot", () => {
    const result = fitV3Duration(byId("V3P_STRENGTH_001"), 50);
    expect(result.code).toBe("STRENGTH_DURATION_ONLY_ESTIMATED");
    expect(result.automaticSelectionAllowed).toBe(false);
  });
  it("refuses invalid targets before any optimization", () => {
    const result = fitV3Duration(byId("V3P_BIKE_008"), -1);
    expect(result.code).toBe("INVALID_TARGET");
    expect(result.fitsSlot).toBe(false);
  });
});

describe("TFCLab V3 — 70.3/IM brick previews are explicit compositions, not live appointments", () => {
  it("models eight separate candidates without counting bricks inside 400 workouts", () => {
    expect(brickBlueprints).toHaveLength(8);
    expect(v3PilotCatalogue.workouts).toHaveLength(400);
    for (const blueprint of brickBlueprints) {
      const preview = previewV3Brick(blueprint.id);
      expect(preview.durationCalculated).toBe(true);
      expect(preview.totalMinutes).toBeGreaterThanOrEqual(100);
      expect(preview.totalMinutes).toBeCloseTo(
        preview.bikeMinutes + preview.transitionMinutes + preview.runMinutes, 8,
      );
      expect(preview.automaticSelectionAllowed).toBe(false);
      expect(preview.releaseDecision).toBe("NO_GO_SPORTING_AND_PERSISTENCE");
    }
  });
  it("refuses an unknown brick without silently replacing its components", () => {
    expect(() => previewV3Brick("V3B_UNKNOWN")).toThrow("V3_BRICK_UNKNOWN");
  });
});
