/**
 * Convergence non-regression tests between the two CAP engines.
 *
 * vlamaxCapEstimator is the PRIMARY source for vlamax_run (snapshot/diagnostic/mini-rapport).
 * vlamaxRunV2Enhanced is the FALLBACK Score G running-power estimator.
 *
 * For shared signals (pace ratio + VMA) both engines should land in the same
 * physiological zone — large divergences indicate a calibration regression.
 */
import { describe, it, expect } from "vitest";
import { computeVLamaxRunV2Enhanced } from "../vlamaxRunV2Enhanced";
import { estimateVLamaxCap } from "../vlamaxCapEstimator";

const TOLERANCE = 0.20; // both engines must agree within ±0.20 mmol/L/s

interface Profile {
  name: string;
  vma: number;
  paceRatio: number; // pace_threshold / VMA
}

const PROFILES: Profile[] = [
  { name: "Endurant — seuil proche VMA",   vma: 18, paceRatio: 0.92 },
  { name: "Équilibré — ratio modéré",       vma: 18, paceRatio: 0.85 },
  { name: "Glycolytique — seuil bas",       vma: 18, paceRatio: 0.78 },
  { name: "VMA basse, équilibré",           vma: 14, paceRatio: 0.85 },
  { name: "VMA élevée, endurant",           vma: 22, paceRatio: 0.90 },
];

describe("CAP VLamax — convergence between engines", () => {
  for (const p of PROFILES) {
    it(`profile "${p.name}" — both engines agree within ±${TOLERANCE}`, () => {
      const paceSecPerKm = 3600 / (p.vma * p.paceRatio);

      const primary = estimateVLamaxCap({
        vma: p.vma,
        paceThresholdSecPerKm: paceSecPerKm,
      });
      const fallback = computeVLamaxRunV2Enhanced({
        runPowerThreshold: 0,
        vma: p.vma,
        paceThresholdSecPerKm: paceSecPerKm,
      });

      expect(primary.method).not.toBe("insufficient");
      expect(fallback.formula).not.toBe("insufficient");

      const delta = Math.abs(primary.value - fallback.value);
      expect(delta).toBeLessThanOrEqual(TOLERANCE);
    });
  }

  it("both engines preserve monotonicity in the same direction", () => {
    const ratios = [0.75, 0.82, 0.88, 0.93];
    const primaryVals = ratios.map(ratio =>
      estimateVLamaxCap({
        vma: 18,
        paceThresholdSecPerKm: 3600 / (18 * ratio),
      }).value
    );
    const fallbackVals = ratios.map(ratio =>
      computeVLamaxRunV2Enhanced({
        runPowerThreshold: 0,
        vma: 18,
        paceThresholdSecPerKm: 3600 / (18 * ratio),
      }).value
    );

    for (let i = 1; i < ratios.length; i++) {
      expect(primaryVals[i]).toBeLessThanOrEqual(primaryVals[i - 1] + 1e-6);
      expect(fallbackVals[i]).toBeLessThanOrEqual(fallbackVals[i - 1] + 1e-6);
    }
  });

  it("both engines respect the same physiological bounds [0.20, 0.90]", () => {
    const ratios = [0.65, 0.75, 0.85, 0.95];
    for (const ratio of ratios) {
      const pace = 3600 / (18 * ratio);
      const a = estimateVLamaxCap({ vma: 18, paceThresholdSecPerKm: pace });
      const b = computeVLamaxRunV2Enhanced({
        runPowerThreshold: 0, vma: 18, paceThresholdSecPerKm: pace,
      });
      if (a.method !== "insufficient") {
        expect(a.value).toBeGreaterThanOrEqual(0.20);
        expect(a.value).toBeLessThanOrEqual(0.90);
      }
      if (b.formula !== "insufficient") {
        expect(b.value).toBeGreaterThanOrEqual(0.20);
        expect(b.value).toBeLessThanOrEqual(0.90);
      }
    }
  });

  it("both engines return insufficient on empty input (no silent fallback)", () => {
    const a = estimateVLamaxCap({ vma: null, paceThresholdSecPerKm: null });
    const b = computeVLamaxRunV2Enhanced({ runPowerThreshold: 0 });
    expect(a.method).toBe("insufficient");
    expect(b.formula).toBe("insufficient");
    expect(a.value).toBe(0);
    expect(b.value).toBe(0);
  });
});
