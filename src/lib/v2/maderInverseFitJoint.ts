/**
 * Mader Inverse Fit Joint
 * ───────────────────────
 * Joint inverse fit of (VLamax, VO2max) from the 4 efforts of the
 * TFCL Reference Week (P30s, P60s, MAP 5min, FTP + TTE).
 *
 * Rationale: when the 4 efforts are available, we can constrain both
 * VLamax (sprint/glycolytic side) and VO2max (MAP/aerobic side) jointly
 * via the Mader power-duration model — this is the same idea INSCYD
 * exploits to claim ~3% MLSS precision from field data alone.
 *
 * Inputs (single Reference-Week snapshot):
 *   p30s_w, p60s_w, map5min_w, ftp, tte_min, weight_kg
 *
 * Forward model (consistent with maderPowerDurationCurve.ts):
 *   CP   = findMLSSPower(VLamax, VO2max, weight)
 *   W'   ≈ 320 · VLamax · weight                          (J)
 *   Pmax ≈ MAP + VLamax · weight · 8
 *   P(t) = CP + W'/t + (Pmax - MAP) · exp(-t/25)
 *
 * Optimisation: 2-pass grid search on (VLamax, VO2max), RMSE % over
 * the 4 observed points (P30s, P60s, MAP5, FTP). TTE is used as a
 * soft penalty on |CP - FTP|.
 *
 * Returns the calibrated profile, the RMSE, the MLSS estimate with
 * Poffé 2024 confidence interval, and a convergence flag.
 */

import { findMLSSPower, type MaderProfile } from "./maderMetabolicModel";
import {
  computeMLSSConfidenceInterval,
  type MLSSConfidenceInterval,
} from "./inscydPoffe2024Sensitivity";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface MaderJointFitInput {
  p30s_w: number;
  p60s_w: number;
  map5min_w: number;
  ftp: number;
  /** Time-to-exhaustion at FTP, minutes (optional soft constraint). */
  tte_min?: number | null;
  weight_kg: number;
  /** Gross mechanical efficiency. Defaults to 0.23. */
  efficiency?: number;
}

export interface MaderJointFitResult {
  vlamax: number;
  vo2max: number;
  efficiency: number;
  weight_kg: number;
  cp: number;
  mlssEstimated: number;
  mlssConfidenceInterval: MLSSConfidenceInterval;
  rmsePct: number;
  convergence: boolean;
  /** Per-point residuals (% of observed). */
  residuals: {
    p30s: number;
    p60s: number;
    map5min: number;
    ftp: number;
  };
  /** Inputs echoed for traceability. */
  inputs: MaderJointFitInput;
  /** "joint" tag for downstream consumers. */
  method: "mader_joint_4efforts";
  /** ISO timestamp. */
  computedAt: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Forward model
// ────────────────────────────────────────────────────────────────────────────

const TAU_NEURO = 25; // seconds
const ENERGY_PER_O2 = 20.9; // kJ per L O2

function maderForward(
  vlamax: number,
  vo2max: number,
  weight: number,
  efficiency: number,
  durationsSec: number[]
): { cp: number; map: number; powers: number[] } {
  const profile: MaderProfile = { vo2max, vlamax, weight, efficiency };
  const cp = findMLSSPower(profile);

  // MAP (aerobic peak)
  const vo2LPerMin = (vo2max * weight) / 1000;
  const map = Math.round(((vo2LPerMin * ENERGY_PER_O2 * 1000) / 60) * efficiency);

  // W' heuristic (same as maderPowerDurationCurve.ts)
  const rawWPrime = vlamax * weight * 320;
  const wPrimeJ = Math.min(35000, Math.max(8000, rawWPrime));

  // Pmax (neuromuscular)
  const pMax = Math.round(map + vlamax * weight * 8);

  const powers = durationsSec.map((t) => {
    const aerobic = cp;
    const anaerobic = t > 0 ? wPrimeJ / t : 0;
    const neuro = (pMax - map) * Math.exp(-t / TAU_NEURO);
    let p = aerobic + anaerobic + neuro;
    p = Math.min(p, pMax);
    return p;
  });

  return { cp, map, powers };
}

// ────────────────────────────────────────────────────────────────────────────
// Cost function (RMSE % over 4 efforts + soft FTP/TTE penalty)
// ────────────────────────────────────────────────────────────────────────────

interface CostObserved {
  p30s: number;
  p60s: number;
  map5min: number;
  ftp: number;
}

function residualPct(modeled: number, observed: number): number {
  if (!observed || observed <= 0) return 0;
  return ((modeled - observed) / observed) * 100;
}

function evaluate(
  vlamax: number,
  vo2max: number,
  weight: number,
  efficiency: number,
  obs: CostObserved
): { rmsePct: number; cp: number; residuals: MaderJointFitResult["residuals"] } {
  const { cp, powers } = maderForward(
    vlamax,
    vo2max,
    weight,
    efficiency,
    [30, 60, 300]
  );
  const [pm30, pm60, pmMap] = powers;

  const r30 = residualPct(pm30, obs.p30s);
  const r60 = residualPct(pm60, obs.p60s);
  const rMap = residualPct(pmMap, obs.map5min);
  const rFtp = residualPct(cp, obs.ftp);

  // Equal-weighted RMSE on the 4 points
  const sq = r30 * r30 + r60 * r60 + rMap * rMap + rFtp * rFtp;
  const rmsePct = Math.sqrt(sq / 4);

  return {
    rmsePct,
    cp,
    residuals: { p30s: r30, p60s: r60, map5min: rMap, ftp: rFtp },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Joint inverse fit
// ────────────────────────────────────────────────────────────────────────────

/**
 * Compute the joint Mader fit on the 4 TFCL Reference-Week efforts.
 * Two-pass grid search (coarse → refined) — deterministic, no external solver.
 *
 * Convergence: RMSE < 4% on the 4 efforts AND |CP - FTP| < 5%.
 * (4% is the boundary for "high precision" vs the ~5% baseline; the target
 *  is ~3%.)
 */
export function fitMaderJoint(input: MaderJointFitInput): MaderJointFitResult {
  const efficiency = input.efficiency ?? 0.23;
  const weight = input.weight_kg;
  const obs: CostObserved = {
    p30s: input.p30s_w,
    p60s: input.p60s_w,
    map5min: input.map5min_w,
    ftp: input.ftp,
  };

  // ─── Pass 1: coarse ────────────────────────────────────────────────────
  let bestVla = 0.45;
  let bestVo2 = 55;
  let bestRmse = Infinity;
  let bestCp = obs.ftp;
  let bestResiduals: MaderJointFitResult["residuals"] = {
    p30s: 0,
    p60s: 0,
    map5min: 0,
    ftp: 0,
  };

  for (let vla = 0.2; vla <= 0.9; vla += 0.05) {
    for (let vo2 = 40; vo2 <= 85; vo2 += 2) {
      const r = evaluate(vla, vo2, weight, efficiency, obs);
      if (r.rmsePct < bestRmse) {
        bestRmse = r.rmsePct;
        bestVla = vla;
        bestVo2 = vo2;
        bestCp = r.cp;
        bestResiduals = r.residuals;
      }
    }
  }

  // ─── Pass 2: refined around the coarse optimum ────────────────────────
  const vlaLo = Math.max(0.15, bestVla - 0.05);
  const vlaHi = Math.min(0.95, bestVla + 0.05);
  const vo2Lo = Math.max(35, bestVo2 - 2);
  const vo2Hi = Math.min(90, bestVo2 + 2);

  for (let vla = vlaLo; vla <= vlaHi; vla += 0.005) {
    for (let vo2 = vo2Lo; vo2 <= vo2Hi; vo2 += 0.2) {
      const r = evaluate(vla, vo2, weight, efficiency, obs);
      if (r.rmsePct < bestRmse) {
        bestRmse = r.rmsePct;
        bestVla = vla;
        bestVo2 = vo2;
        bestCp = r.cp;
        bestResiduals = r.residuals;
      }
    }
  }

  // ─── MLSS confidence interval (Poffé 2024) ─────────────────────────────
  // Confidence boosted because both inputs are constrained by the joint fit.
  const mlssCI = computeMLSSConfidenceInterval({
    pmlssW: bestCp,
    vo2maxConfidence: 0.9,
    vlamaxConfidence: 0.9,
  });

  // ─── Soft TTE check (optional) ─────────────────────────────────────────
  // If observed TTE < 25 min at FTP, weak data → degrade convergence flag.
  const tteOk = input.tte_min == null ? true : input.tte_min >= 25;

  const ftpDeltaPct = Math.abs(bestResiduals.ftp);
  const convergence = bestRmse < 4 && ftpDeltaPct < 5 && tteOk;

  return {
    vlamax: Number(bestVla.toFixed(3)),
    vo2max: Number(bestVo2.toFixed(1)),
    efficiency,
    weight_kg: weight,
    cp: bestCp,
    mlssEstimated: bestCp,
    mlssConfidenceInterval: mlssCI,
    rmsePct: Number(bestRmse.toFixed(2)),
    convergence,
    residuals: {
      p30s: Number(bestResiduals.p30s.toFixed(2)),
      p60s: Number(bestResiduals.p60s.toFixed(2)),
      map5min: Number(bestResiduals.map5min.toFixed(2)),
      ftp: Number(bestResiduals.ftp.toFixed(2)),
    },
    inputs: input,
    method: "mader_joint_4efforts",
    computedAt: new Date().toISOString(),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Guard: check that the 4 efforts are present and plausible
// ────────────────────────────────────────────────────────────────────────────

export function canRunMaderJointFit(
  input: Partial<MaderJointFitInput> | null | undefined
): boolean {
  if (!input) return false;
  return (
    typeof input.p30s_w === "number" && input.p30s_w > 0 &&
    typeof input.p60s_w === "number" && input.p60s_w > 0 &&
    typeof input.map5min_w === "number" && input.map5min_w > 0 &&
    typeof input.ftp === "number" && input.ftp > 0 &&
    typeof input.weight_kg === "number" && input.weight_kg > 30
  );
}
