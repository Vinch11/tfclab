/**
 * Mader Power-Duration Curve Generator
 * Generates a modeled power curve from VO2max + VLamax using:
 * - Aerobic contribution (VO2 kinetics)
 * - Anaerobic contribution (glycolytic capacity = VLamax)
 * - W' (anaerobic work capacity) depletion model
 * 
 * Based on the 3-component model:
 * P(t) = CP + W'/t + P_neuromuscular × e^(-t/τ)
 * Where CP ≈ MLSS from Mader, W' derived from VLamax, τ ≈ 25s
 */

import { findMLSSPower, type MaderProfile } from "./maderMetabolicModel";

export interface MaderPowerDurationPoint {
  durationSec: number;
  durationLabel: string;
  powerWatts: number;
  component: "modeled";
}

export interface MaderPowerDurationCurve {
  points: MaderPowerDurationPoint[];
  cp: number;        // Critical Power (≈ MLSS)
  wPrime: number;    // W' in kJ
  pMax: number;      // Neuromuscular peak
  wPrimeSource: "regression" | "heuristic"; // R1: traçabilité de la source du W'
}

export interface MaderCurveOptions {
  /** R1: W' (Joules) issu de la régression CP — source de vérité prioritaire */
  wPrimeJOverride?: number;
  /** R1: CP (W) issu de la régression — prioritaire sur la MLSS Mader */
  cpOverride?: number;
}

/**
 * Generate a modeled power-duration curve from a Mader metabolic profile.
 * 
 * Model:
 *   P(t) = CP + W'/t + (Pmax - CP) × e^(-t/τ_neuro)
 *   
 * Where:
 *   CP = MLSS power from Mader model
 *   W' = f(VLamax, weight) — anaerobic capacity
 *   Pmax = f(VLamax, weight) — peak neuromuscular power
 *   τ_neuro ≈ 20-30s — neuromuscular decay constant
 */
export function generateMaderPowerDurationCurve(
  profile: MaderProfile,
  durations?: number[],
  options?: MaderCurveOptions
): MaderPowerDurationCurve {
  const { vo2max, vlamax, weight } = profile;
  const efficiency = profile.efficiency ?? 0.23;

  // 1. Critical Power — priorité à la régression CP (source de vérité), sinon MLSS Mader
  const cp = options?.cpOverride && options.cpOverride > 0
    ? options.cpOverride
    : findMLSSPower(profile);

  // 2. W' (anaerobic work capacity in Joules)
  // R1: priorité au W' issu de la régression CP (criticalPowerModel) pour cohérence avec l'UI.
  // Fallback heuristique uniquement si aucun override fourni.
  // Heuristique: W' (J) ≈ 320 · VLamax · poids → ~10–25 kJ pour la plage physiologique
  // (VLamax 0.30–0.70, poids 60–80 kg). Borné dans [8 000 ; 35 000] J pour rester plausible.
  const rawHeuristicJ = vlamax * weight * 320;
  const heuristicWPrimeJ = Math.min(35000, Math.max(8000, rawHeuristicJ));
  const wPrimeJ = options?.wPrimeJOverride && options.wPrimeJOverride > 0
    ? options.wPrimeJOverride
    : heuristicWPrimeJ;
  const wPrimeKJ = wPrimeJ / 1000;
  const wPrimeSource: "regression" | "heuristic" =
    options?.wPrimeJOverride && options.wPrimeJOverride > 0 ? "regression" : "heuristic";

  // 3. Pmax (neuromuscular peak power)
  const vo2LPerMin = vo2max * weight / 1000;
  const map = Math.round((vo2LPerMin * 20.9 * 1000 / 60) * efficiency);
  const pMax = Math.round(map + vlamax * weight * 8);

  // 4. Neuromuscular decay time constant
  const tauNeuro = 25; // seconds

  // 5. Generate curve at standard durations
  const standardDurations = durations ?? [1, 3, 5, 10, 15, 30, 45, 60, 120, 180, 300, 600, 1200, 1800, 2700, 3600];

  const points: MaderPowerDurationPoint[] = standardDurations.map(t => {
    const aerobicSustain = cp;
    const anaerobicContrib = t > 0 ? wPrimeJ / t : 0;
    const neuroContrib = (pMax - map) * Math.exp(-t / tauNeuro);

    let power = aerobicSustain + anaerobicContrib + neuroContrib;
    power = Math.min(power, pMax);
    if (t > 3600) {
      const fatigueFactor = 1 - (t - 3600) / 36000 * 0.05;
      power = Math.max(cp * 0.85, power * fatigueFactor);
    }

    return {
      durationSec: t,
      durationLabel: formatDur(t),
      powerWatts: Math.round(power),
      component: "modeled" as const,
    };
  });

  return { points, cp, wPrime: Math.round(wPrimeKJ), pMax, wPrimeSource };
}

function formatDur(sec: number): string {
  if (sec < 60) return `${sec}"`;
  if (sec < 3600) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}'${s}"` : `${m}'`;
  }
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/**
 * Merge Nolio observed data with Mader modeled data for overlay chart.
 * Returns unified data points with both "nolio" and "mader" values.
 */
export function buildOverlayData(
  nolioCurve: { durationSec: number; durationLabel: string; value: number }[],
  maderCurve: MaderPowerDurationPoint[],
): { durationSec: number; label: string; nolio: number | null; mader: number | null; delta: number | null; deltaPct: number | null }[] {
  // Collect all unique durations
  const durMap = new Map<number, { label: string; nolio: number | null; mader: number | null }>();

  for (const p of nolioCurve) {
    durMap.set(p.durationSec, { label: p.durationLabel, nolio: p.value, mader: null });
  }

  for (const p of maderCurve) {
    const existing = durMap.get(p.durationSec);
    if (existing) {
      existing.mader = p.powerWatts;
    } else {
      durMap.set(p.durationSec, { label: p.durationLabel, nolio: null, mader: p.powerWatts });
    }
  }

  // Also interpolate Mader values at Nolio durations if not exact match
  for (const [dur, entry] of durMap) {
    if (entry.mader === null && entry.nolio !== null) {
      entry.mader = interpolateMader(dur, maderCurve);
    }
  }

  return Array.from(durMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([durationSec, { label, nolio, mader }]) => {
      const delta = nolio != null && mader != null ? nolio - mader : null;
      const deltaPct = delta != null && mader != null && mader > 0 ? (delta / mader) * 100 : null;
      return { durationSec, label, nolio, mader, delta, deltaPct };
    });
}

function interpolateMader(targetSec: number, curve: MaderPowerDurationPoint[]): number | null {
  if (curve.length === 0) return null;
  if (targetSec <= curve[0].durationSec) return curve[0].powerWatts;
  if (targetSec >= curve[curve.length - 1].durationSec) return curve[curve.length - 1].powerWatts;

  for (let i = 0; i < curve.length - 1; i++) {
    if (curve[i].durationSec <= targetSec && curve[i + 1].durationSec >= targetSec) {
      const t1 = Math.log(curve[i].durationSec);
      const t2 = Math.log(curve[i + 1].durationSec);
      const t = Math.log(targetSec);
      const ratio = (t - t1) / (t2 - t1);
      return Math.round(curve[i].powerWatts + ratio * (curve[i + 1].powerWatts - curve[i].powerWatts));
    }
  }
  return null;
}
