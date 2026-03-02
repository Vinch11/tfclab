import { describe, it, expect } from "vitest";
import { calibrateVLamaxFromMLSS, findMLSSPower, MaderProfile } from "../maderMetabolicModel";

/**
 * Validation profiles based on literature and INSCYD-validated datasets:
 * 
 * The Mader MLSS relationship: MLSS_pct = 100 × (1 − α × VLamax / VO2max_abs)
 * gives: VLamax = (1 − FTP/MAP) × VO2max_abs / α
 * 
 * Profiles:
 *   IM Elite:    FTP=280W, VO2max=63, 70kg → MAP≈354W → FTP/MAP=79% → VLamax ≈ 0.31
 *   AG Finisher: FTP=200W, VO2max=48, 80kg → MAP≈308W → FTP/MAP=65% → VLamax ≈ 0.45
 *   Sprinter:    FTP=250W, VO2max=58, 88kg → MAP≈409W → FTP/MAP=61% → VLamax ≈ 0.66
 *   Elite Road:  FTP=350W, VO2max=78, 68kg → MAP≈425W → FTP/MAP=82% → VLamax ≈ 0.31
 */

describe("calibrateVLamaxFromMLSS", () => {
  it("IM Elite — FTP 280W, VO2max 63, 70kg → VLamax ~0.25–0.40", () => {
    const result = calibrateVLamaxFromMLSS(280, 63, 70);
    expect(result).toBeGreaterThanOrEqual(0.25);
    expect(result).toBeLessThanOrEqual(0.40);
  });

  it("AG Finisher — FTP 200W, VO2max 48, 80kg → VLamax ~0.38–0.55", () => {
    const result = calibrateVLamaxFromMLSS(200, 48, 80);
    expect(result).toBeGreaterThanOrEqual(0.38);
    expect(result).toBeLessThanOrEqual(0.55);
  });

  it("Track Sprinter — FTP 250W, VO2max 58, 88kg → VLamax ~0.55–0.80", () => {
    const result = calibrateVLamaxFromMLSS(250, 58, 88);
    expect(result).toBeGreaterThanOrEqual(0.55);
    expect(result).toBeLessThanOrEqual(0.80);
  });

  it("Elite Road — FTP 350W, VO2max 78, 68kg → VLamax ~0.25–0.40", () => {
    const result = calibrateVLamaxFromMLSS(350, 78, 68);
    expect(result).toBeGreaterThanOrEqual(0.25);
    expect(result).toBeLessThanOrEqual(0.40);
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
