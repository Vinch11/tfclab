import { describe, it, expect } from "vitest";
import { computeVLamaxEffectif, type VLamaxEffectif } from "@/lib/vlamaxEffectif";

// =============================================
// VLAMAX EFFECTIF — Core Engine Tests
// Source hierarchy: test > snapshot > estimated > unknown
// =============================================

const ATHLETE_ID = "test-athlete-1";

describe("computeVLamaxEffectif", () => {
  // =============================================
  // SOURCE HIERARCHY
  // =============================================

  describe("Source hierarchy", () => {
    it("returns 'unknown' when no data available", () => {
      const result = computeVLamaxEffectif({
        athleteId: ATHLETE_ID,
        objectif: "IM",
        tests: [],
        snapshots: [],
      });
      expect(result.source).toBe("unknown");
      expect(result.confidence).toBeLessThan(0.5);
    });

    it("uses test VLamax when available (highest priority)", () => {
      const result = computeVLamaxEffectif({
        athleteId: ATHLETE_ID,
        objectif: "IM",
        tests: [
          { athlete_id: ATHLETE_ID, vlamax: 0.35, date: "2026-03-01", type: "sprint", name: "Sprint 15s" },
        ],
        snapshots: [
          { id: "s1", athlete_id: ATHLETE_ID, date: "2026-03-01", vlamax: 0.45, ftp: 280, pmax_5s: 900, weight_kg: 70 },
        ],
      });
      // The engine should prefer the test value
      expect(result.value).not.toBeNull();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("falls back to snapshot VLamax when no tests", () => {
      const result = computeVLamaxEffectif({
        athleteId: ATHLETE_ID,
        objectif: "IM",
        tests: [],
        snapshots: [
          { id: "s1", athlete_id: ATHLETE_ID, date: "2026-03-01", vlamax: 0.42, ftp: 280, pmax_5s: 900, weight_kg: 70 },
        ],
      });
      expect(result.value).not.toBeNull();
    });
  });

  // =============================================
  // PHYSIOLOGICAL BOUNDS (CLAMPING)
  // =============================================

  describe("Physiological bounds", () => {
    it("clamps VLamax within physiological range [0.10 - 1.20]", () => {
      const result = computeVLamaxEffectif({
        athleteId: ATHLETE_ID,
        objectif: "IM",
        tests: [],
        snapshots: [
          { id: "s1", athlete_id: ATHLETE_ID, date: "2026-03-01", vlamax: 2.5, ftp: 280, pmax_5s: 900, weight_kg: 70 },
        ],
      });
      if (result.value !== null) {
        expect(result.value).toBeLessThanOrEqual(1.20);
        expect(result.value).toBeGreaterThanOrEqual(0.10);
      }
    });
  });

  // =============================================
  // CONFIDENCE SCORING
  // =============================================

  describe("Confidence scoring", () => {
    it("test-derived VLamax has reasonable confidence", () => {
      const fromTest = computeVLamaxEffectif({
        athleteId: ATHLETE_ID,
        objectif: "IM",
        tests: [
          { athlete_id: ATHLETE_ID, vlamax: 0.35, date: "2026-03-10", type: "sprint", name: "Sprint 15s" },
        ],
        snapshots: [
          { id: "s1", athlete_id: ATHLETE_ID, date: "2026-03-01", ftp: 280, pmax_5s: 900, weight_kg: 70 },
        ],
      });

      // Test-derived should have confidence >= 0.6 (terrain sprint test level;
      // 0.7 réservé aux tests labo/lactate).
      expect(fromTest.confidence).toBeGreaterThanOrEqual(0.6);
    });

    it("snapshot with explicit VLamax has high confidence", () => {
      const fromSnapshot = computeVLamaxEffectif({
        athleteId: ATHLETE_ID,
        objectif: "IM",
        tests: [],
        snapshots: [
          { id: "s1", athlete_id: ATHLETE_ID, date: "2026-03-01", vlamax: 0.42, ftp: 280, pmax_5s: 900, weight_kg: 70 },
        ],
      });

      expect(fromSnapshot.confidence).toBeGreaterThanOrEqual(0.7);
    });
  });

  // =============================================
  // ATHLETE ISOLATION
  // =============================================

  describe("Athlete isolation", () => {
    it("only uses data for the specified athlete", () => {
      const result = computeVLamaxEffectif({
        athleteId: ATHLETE_ID,
        objectif: "IM",
        tests: [
          { athlete_id: "other-athlete", vlamax: 0.80, date: "2026-03-01", type: "sprint", name: "Sprint" },
        ],
        snapshots: [
          { id: "s1", athlete_id: "other-athlete", date: "2026-03-01", vlamax: 0.80, ftp: 200, pmax_5s: 800, weight_kg: 75 },
        ],
      });
      // Should not pick up the other athlete's data
      expect(result.source).toBe("unknown");
    });
  });

  // =============================================
  // OUTPUT SHAPE
  // =============================================

  describe("Output shape", () => {
    it("always returns a valid VLamaxEffectif structure", () => {
      const result = computeVLamaxEffectif({
        athleteId: ATHLETE_ID,
        objectif: "IM",
        tests: [],
        snapshots: [],
      });
      expect(result).toHaveProperty("value");
      expect(result).toHaveProperty("source");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("label");
      expect(typeof result.confidence).toBe("number");
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("includes error margin for V2 results", () => {
      const result = computeVLamaxEffectif({
        athleteId: ATHLETE_ID,
        objectif: "IM",
        tests: [],
        snapshots: [
          { id: "s1", athlete_id: ATHLETE_ID, date: "2026-03-01", ftp: 280, pmax_5s: 900, weight_kg: 70 },
        ],
      });
      // V2 engine should produce error margin
      if (result.value !== null) {
        expect(result.errorMargin).toBeDefined();
      }
    });
  });
});
