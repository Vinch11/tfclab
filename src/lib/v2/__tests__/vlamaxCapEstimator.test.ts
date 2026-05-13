import { describe, it, expect } from "vitest";
import { estimateVLamaxCap, canEstimateVLamaxCap, formatVLamaxCapEstimate } from "../vlamaxCapEstimator";

describe("vlamaxCapEstimator (estimateVLamaxCap)", () => {
  describe("missing data policy", () => {
    it("returns insufficient when no input is provided", () => {
      const r = estimateVLamaxCap({ vma: null, paceThresholdSecPerKm: null });
      expect(r.method).toBe("insufficient");
      expect(r.value).toBe(0);
      expect(r.confidence).toBe(0);
      expect(r.sources).toEqual([]);
    });

    it("never returns the legacy 0.42 fallback", () => {
      const r = estimateVLamaxCap({ vma: null, paceThresholdSecPerKm: null });
      expect(r.value).not.toBe(0.42);
    });

    it("canEstimateVLamaxCap returns false when no signal", () => {
      expect(canEstimateVLamaxCap({ vma: null, paceThresholdSecPerKm: null })).toBe(false);
    });

    it("canEstimateVLamaxCap returns true with at least VMA", () => {
      expect(canEstimateVLamaxCap({ vma: 18, paceThresholdSecPerKm: null })).toBe(true);
    });

    it("formatVLamaxCapEstimate handles insufficient", () => {
      const r = estimateVLamaxCap({ vma: null, paceThresholdSecPerKm: null });
      expect(formatVLamaxCapEstimate(r)).toBe("Données insuffisantes");
    });
  });

  describe("measured lab value (dominant source)", () => {
    it("anchors estimation around the lab measurement", () => {
      const r = estimateVLamaxCap({
        vma: 18,
        paceThresholdSecPerKm: 240,
        vlamaxRunMeasured: 0.45,
      });
      expect(r.method).not.toBe("insufficient");
      expect(r.sources).toContain("Mesure labo");
      expect(r.value).toBeGreaterThan(0.30);
      expect(r.value).toBeLessThan(0.60);
    });
  });

  describe("pace ratio path (no lab/power)", () => {
    it("low VLamax for ratio close to 1 (seuil ~ VMA)", () => {
      const r = estimateVLamaxCap({
        vma: 18,
        paceThresholdSecPerKm: 3600 / (18 * 0.95),
      });
      expect(r.value).toBeGreaterThanOrEqual(0.20);
      expect(r.value).toBeLessThanOrEqual(0.30);
    });

    it("high VLamax for low ratio", () => {
      const r = estimateVLamaxCap({
        vma: 18,
        paceThresholdSecPerKm: 3600 / (18 * 0.72),
      });
      expect(r.value).toBeGreaterThan(0.55);
    });

    it("monotonic decrease as pace ratio increases", () => {
      const ratios = [0.75, 0.80, 0.85, 0.90];
      const values = ratios.map(ratio =>
        estimateVLamaxCap({
          vma: 18,
          paceThresholdSecPerKm: 3600 / (18 * ratio),
        }).value
      );
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeLessThanOrEqual(values[i - 1] + 1e-6);
      }
    });
  });

  describe("sprint 15s anchor (P4 attenuated for running)", () => {
    it("short sprint (50m) yields low VLamax", () => {
      const r = estimateVLamaxCap({
        vma: null,
        paceThresholdSecPerKm: null,
        sprint15sDistance: 50,
      });
      expect(r.value).toBeGreaterThanOrEqual(0.20);
      expect(r.value).toBeLessThan(0.40);
    });

    it("long sprint (130m) yields higher VLamax than short sprint", () => {
      const low = estimateVLamaxCap({ vma: null, paceThresholdSecPerKm: null, sprint15sDistance: 50 });
      const high = estimateVLamaxCap({ vma: null, paceThresholdSecPerKm: null, sprint15sDistance: 130 });
      expect(high.value).toBeGreaterThan(low.value);
    });
  });

  describe("physiological bounds", () => {
    it("never exceeds [0.20, 0.90] even with extreme inputs", () => {
      const cases = [
        { vma: 25, paceThresholdSecPerKm: 3600 / (25 * 0.50) },
        { vma: 10, paceThresholdSecPerKm: 3600 / (10 * 0.99) },
        { vma: null, paceThresholdSecPerKm: null, sprint15sDistance: 200 },
        { vma: null, paceThresholdSecPerKm: null, sprint15sDistance: 10 },
      ];
      for (const c of cases) {
        const r = estimateVLamaxCap(c as any);
        if (r.method !== "insufficient") {
          expect(r.value).toBeGreaterThanOrEqual(0.20);
          expect(r.value).toBeLessThanOrEqual(0.90);
        }
      }
    });
  });
});
