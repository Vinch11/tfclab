import { describe, it, expect } from "vitest";
import { calibrateVLamaxFromMLSS, findMLSSPower, MaderProfile } from "../maderMetabolicModel";

/**
 * Validation profiles based on N=44 laboratory dataset (Nov 2026 refit).
 *
 * The Mader MLSS relationship: MLSS_pct = 100 × (1 − α × VLamax / VO2max_abs)
 * gives: VLamax = (1 − FTP/MAP_theoretical) × VO2max_abs / α
 *
 * α=1.98 (calibrated on N=44, RMSE 3.7%) replaces the previous α=2.5.
 * Forward (findMLSSPower) and inverse (calibrateVLamaxFromMLSS) MUST stay
 * aligned to preserve round-trip consistency.
 *
 * NOTE: The inverse function is intrinsically biased upward when no observed
 * MAP is provided (MAP_theoretical over-estimates true MAP). The bounds below
 * reflect the inverse's mathematical output, not the laboratory ground truth
 * for these athlete archetypes.
 */

describe("calibrateVLamaxFromMLSS", () => {
  it("IM Elite — FTP 280W, VO2max 63, 70kg → VLamax ~0.40–0.55", () => {
    const result = calibrateVLamaxFromMLSS(280, 63, 70);
    expect(result).toBeGreaterThanOrEqual(0.40);
    expect(result).toBeLessThanOrEqual(0.55);
  });

  it("AG Finisher — FTP 200W, VO2max 48, 80kg → VLamax ~0.55–0.75", () => {
    const result = calibrateVLamaxFromMLSS(200, 48, 80);
    expect(result).toBeGreaterThanOrEqual(0.55);
    expect(result).toBeLessThanOrEqual(0.75);
  });

  it("Track Sprinter — FTP 250W, VO2max 58, 88kg → VLamax ~0.85–1.10", () => {
    const result = calibrateVLamaxFromMLSS(250, 58, 88);
    expect(result).toBeGreaterThanOrEqual(0.85);
    expect(result).toBeLessThanOrEqual(1.10);
  });

  it("Elite Road — FTP 350W, VO2max 78, 68kg → VLamax ~0.40–0.55", () => {
    const result = calibrateVLamaxFromMLSS(350, 78, 68);
    expect(result).toBeGreaterThanOrEqual(0.40);
    expect(result).toBeLessThanOrEqual(0.55);
  });

  it("higher FTP at same VO2max/weight → lower VLamax (more aerobic)", () => {
    const low = calibrateVLamaxFromMLSS(220, 55, 75);
    const high = calibrateVLamaxFromMLSS(280, 55, 75);
    expect(high).toBeLessThan(low);
  });

  it("returns value within physiological bounds [0.10–1.20]", () => {
    const profiles = [
      { ftp: 150, vo2: 40, w: 90 },
      { ftp: 400, vo2: 85, w: 60 },
      { ftp: 280, vo2: 55, w: 75 },
    ];
    for (const p of profiles) {
      const result = calibrateVLamaxFromMLSS(p.ftp, p.vo2, p.w);
      expect(result).toBeGreaterThanOrEqual(0.10);
      expect(result).toBeLessThanOrEqual(1.20);
    }
  });

  it("round-trip consistency: calibrate → predict → same FTP (±2W)", () => {
    const testCases = [
      { ftp: 280, vo2: 63, w: 70 },
      { ftp: 200, vo2: 48, w: 80 },
      { ftp: 350, vo2: 78, w: 68 },
    ];
    for (const tc of testCases) {
      const vlamax = calibrateVLamaxFromMLSS(tc.ftp, tc.vo2, tc.w);
      const profile: MaderProfile = { vo2max: tc.vo2, vlamax, weight: tc.w };
      const predictedFTP = findMLSSPower(profile);
      expect(Math.abs(predictedFTP - tc.ftp)).toBeLessThanOrEqual(2);
    }
  });
});
