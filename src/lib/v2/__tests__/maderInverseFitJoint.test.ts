/**
 * Tests for fitMaderJoint
 *
 * Strategy: generate synthetic 4-effort sets from known (VLamax, VO2max)
 * via the same forward model, then check that the inverse fit recovers
 * the parameters within a reasonable tolerance and that the joint MLSS
 * (CP) matches the seed CP within ~3%.
 */

import { describe, it, expect } from "vitest";
import { fitMaderJoint, canRunMaderJointFit } from "../maderInverseFitJoint";
import { findMLSSPower, type MaderProfile } from "../maderMetabolicModel";

const TAU = 25;
const ENERGY_PER_O2 = 20.9;

function forward(
  vla: number,
  vo2: number,
  weight: number,
  efficiency = 0.23
) {
  const profile: MaderProfile = { vo2max: vo2, vlamax: vla, weight, efficiency };
  const cp = findMLSSPower(profile);
  const vo2LPerMin = (vo2 * weight) / 1000;
  const map = Math.round(((vo2LPerMin * ENERGY_PER_O2 * 1000) / 60) * efficiency);
  const wPrimeJ = Math.min(35000, Math.max(8000, vla * weight * 320));
  const pMax = Math.round(map + vla * weight * 8);
  const at = (t: number) =>
    Math.round(
      Math.min(pMax, cp + wPrimeJ / t + (pMax - map) * Math.exp(-t / TAU))
    );
  return {
    p30s_w: at(30),
    p60s_w: at(60),
    map5min_w: at(300),
    ftp: cp,
    cp,
  };
}

describe("fitMaderJoint — synthetic profile recovery", () => {
  const profiles = [
    { label: "endurance/marathon", vla: 0.30, vo2: 65, weight: 68 },
    { label: "mixed amateur",      vla: 0.45, vo2: 55, weight: 72 },
    { label: "sprinteur",          vla: 0.70, vo2: 50, weight: 78 },
    { label: "elite cyclist",      vla: 0.35, vo2: 78, weight: 70 },
    { label: "masters",            vla: 0.40, vo2: 48, weight: 75 },
  ];

  for (const p of profiles) {
    it(`recovers ${p.label} within tolerance`, () => {
      const synth = forward(p.vla, p.vo2, p.weight);
      const result = fitMaderJoint({
        p30s_w: synth.p30s_w,
        p60s_w: synth.p60s_w,
        map5min_w: synth.map5min_w,
        ftp: synth.ftp,
        tte_min: 40,
        weight_kg: p.weight,
      });

      // CP / MLSS recovered within ~3%
      const cpDeltaPct = Math.abs((result.cp - synth.cp) / synth.cp) * 100;
      expect(cpDeltaPct).toBeLessThan(3.5);

      // RMSE under 4% (the "high precision" threshold)
      expect(result.rmsePct).toBeLessThan(4);

      // Convergence flag must be true on clean synthetic data
      expect(result.convergence).toBe(true);

      // MLSS CI propagated via Poffé 2024 sensitivities — joint fit boost
      // brings it close to the publication's ~10% upper bound on field data
      expect(result.mlssConfidenceInterval.uncertaintyPct).toBeLessThan(12);
    });
  }
});

describe("fitMaderJoint — degraded input", () => {
  it("returns convergence=false when residuals are too large", () => {
    // Inconsistent set: huge sprint but tiny MAP → no Mader profile fits well
    const result = fitMaderJoint({
      p30s_w: 1400,
      p60s_w: 900,
      map5min_w: 220, // way too low vs the sprints
      ftp: 180,
      tte_min: 40,
      weight_kg: 72,
    });
    expect(result.convergence).toBe(false);
  });

  it("canRunMaderJointFit returns false on missing fields", () => {
    expect(canRunMaderJointFit(null)).toBe(false);
    expect(canRunMaderJointFit({})).toBe(false);
    expect(
      canRunMaderJointFit({
        p30s_w: 800,
        p60s_w: 500,
        map5min_w: 350,
        weight_kg: 72,
        // missing ftp
      } as any)
    ).toBe(false);
    expect(
      canRunMaderJointFit({
        p30s_w: 800,
        p60s_w: 500,
        map5min_w: 350,
        ftp: 250,
        weight_kg: 72,
      })
    ).toBe(true);
  });
});
