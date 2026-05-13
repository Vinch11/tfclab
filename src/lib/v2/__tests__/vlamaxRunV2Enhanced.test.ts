import { describe, it, expect } from "vitest";
import { computeVLamaxRunV2Enhanced } from "../vlamaxRunV2Enhanced";

describe("vlamaxRunV2Enhanced", () => {
  describe("missing data policy", () => {
    it("returns insufficient when no usable signal", () => {
      const r = computeVLamaxRunV2Enhanced({ runPowerThreshold: 0 });
      expect(r.formula).toBe("insufficient");
      expect(r.value).toBe(0);
      expect(r.rangeMin).toBe(0);
      expect(r.rangeMax).toBe(0);
    });

    it("does not silently fall back to neutral 0.42", () => {
      const r = computeVLamaxRunV2Enhanced({ runPowerThreshold: 0 });
      expect(r.value).not.toBe(0.42);
    });
  });

  describe("pace-only path (VMA/seuil cross-validation)", () => {
    it("VLamax low when threshold is close to VMA (ratio ~0.92)", () => {
      const r = computeVLamaxRunV2Enhanced({
        runPowerThreshold: 0,
        vma: 20,
        paceThresholdSecPerKm: 3600 / (20 * 0.92), // ratio = 0.92
      });
      expect(r.formula).not.toBe("insufficient");
      expect(r.value).toBeGreaterThanOrEqual(0.20);
      expect(r.value).toBeLessThanOrEqual(0.30);
    });

    it("VLamax high when threshold is far from VMA (ratio ~0.75)", () => {
      const r = computeVLamaxRunV2Enhanced({
        runPowerThreshold: 0,
        vma: 20,
        paceThresholdSecPerKm: 3600 / (20 * 0.75),
      });
      expect(r.formula).not.toBe("insufficient");
      expect(r.value).toBeGreaterThan(0.55);
    });

    it("respects physiological bounds [0.20, 0.90]", () => {
      const ratios = [0.6, 0.7, 0.8, 0.9, 0.95, 1.0];
      for (const ratio of ratios) {
        const r = computeVLamaxRunV2Enhanced({
          runPowerThreshold: 0,
          vma: 18,
          paceThresholdSecPerKm: 3600 / (18 * ratio),
        });
        if (r.formula !== "insufficient") {
          expect(r.value).toBeGreaterThanOrEqual(0.20);
          expect(r.value).toBeLessThanOrEqual(0.90);
        }
      }
    });
  });

  describe("dual-validation (pace + power)", () => {
    it("uses both signals when available", () => {
      const r = computeVLamaxRunV2Enhanced({
        runPowerThreshold: 280,
        runPower30s: 420,
        runPower60s: 360,
        runPower5min: 310,
        vma: 18,
        paceThresholdSecPerKm: 3600 / 15.5,
      });
      expect(r.formula).not.toBe("insufficient");
      expect(r.sources).toContain("VMA/Seuil");
      expect(r.value).toBeGreaterThanOrEqual(0.20);
      expect(r.value).toBeLessThanOrEqual(0.90);
    });
  });

  describe("monotonicity", () => {
    it("VLamax decreases monotonically as pace ratio increases", () => {
      const ratios = [0.75, 0.80, 0.85, 0.90];
      const values = ratios.map(ratio => {
        const r = computeVLamaxRunV2Enhanced({
          runPowerThreshold: 0,
          vma: 18,
          paceThresholdSecPerKm: 3600 / (18 * ratio),
        });
        return r.value;
      });
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeLessThanOrEqual(values[i - 1] + 1e-6);
      }
    });
  });
});
