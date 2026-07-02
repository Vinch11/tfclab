/**
 * Calibration harness for Score G CAP (vlamaxRunV2Enhanced).
 *
 * Modes:
 *  1) CSV mode  — set CALIB_CSV=/tmp/cap_cohort.csv (cols: vma,paceThresholdSecPerKm,
 *                 p1s,p5s,p30s,p60s,p5min,tte,vlamaxMeasured)
 *  2) Synthetic — default: 40 physiologically coherent profiles where the
 *                 VLamax target is derived from the pace ratio (Billat 2001).
 *                 Power profile is generated from a Stryd-like running power
 *                 model (CR ≈ 0.98 J/kg/m) modulated by the glycolytic target.
 *
 * Reports:
 *  - Baseline RMSE (current normalizations) vs target & vs vlamaxCapEstimator
 *  - Best grid-search RMSE + recommended (S5, S30, S60, E mid/range, fusion α)
 *  - Improvement % and inter-method delta reduction
 *  - Markdown summary to /mnt/documents/calibration_score_g_cap.md
 *
 * Usage:
 *   bun run scripts/calibrateScoreGCAP.ts
 */
import fs from "node:fs";
import { computeVLamaxRunV2Enhanced, type VLamaxRunV2EnhancedInput } from "../src/lib/v2/vlamaxRunV2Enhanced";
import { estimateVLamaxCap } from "../src/lib/v2/vlamaxCapEstimator";
import {
  REFERENCE_DISTRIBUTIONS,
  PLAUSIBILITY_BOUNDS,
  POPULATION_TARGETS,
  getPopulationTarget,
  checkPlausibility,
} from "../src/lib/v2/literatureReferences";
import { predictRunMLSSPctFromVLaCE } from "../src/lib/v2/runMLSSPredictor";

// ─────────────────────────────────────────────
// 1) Profile generation — ANCRÉ LITTÉRATURE
// ─────────────────────────────────────────────
interface Profile extends VLamaxRunV2EnhancedInput {
  vlamaxTarget: number;
  vo2maxTarget: number;
  paceRatio: number;
}

// Mulberry32 PRNG (deterministic)
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRandn(rand: () => number) {
  return () => {
    const u = Math.max(rand(), 1e-9);
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}
const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Truncated normal draw clamped to plausibility bounds. */
function drawTruncated(mean: number, sd: number, min: number, max: number, randn: () => number): number {
  for (let i = 0; i < 20; i++) {
    const x = mean + sd * randn();
    if (x >= min && x <= max) return x;
  }
  return clampN(mean, min, max);
}

function genSynthetic(): Profile[] {
  const rand = mulberry32(20260702);
  const randn = makeRandn(rand);
  const profiles: Profile[] = [];
  const runVo2Bound = PLAUSIBILITY_BOUNDS.find(b => b.metric === "run_vo2max")!;
  const runVlaBound = PLAUSIBILITY_BOUNDS.find(b => b.metric === "run_vlamax")!;

  // 20 subelite + 20 trained = 40 profils ancrés
  const tiers: Array<"subelite" | "trained"> = ["subelite", "trained"];
  for (const tier of tiers) {
    const dist = REFERENCE_DISTRIBUTIONS.run[tier]!;
    for (let i = 0; i < 20; i++) {
      const vo2 = drawTruncated(dist.vo2max.mean, dist.vo2max.sd, runVo2Bound.min, runVo2Bound.max, randn);
      const vla = drawTruncated(dist.vlamax.mean, dist.vlamax.sd, runVlaBound.min, runVlaBound.max, randn);
      // VMA (km/h) ≈ VO2max / 3.5 (Léger)
      const vma = vo2 / 3.5;
      // Ratio seuil/VMA inversé depuis Billat : vla = 0.20 + 0.70·(0.92-ratio)/0.20
      const ratio = clampN(0.92 - 0.20 * (vla - 0.20) / 0.70, 0.74, 0.92);
      const weight = clampN(65 + randn() * 7, 50, 90);

      const vThreshold_ms = (vma * ratio) / 3.6;
      const CR = 1.00 + 0.10 * (vla - 0.4);
      const Pthr = CR * vThreshold_ms * weight;
      const m1 = 2.0 + 1.0 * vla, m5 = 1.6 + 0.8 * vla;
      const m30 = 1.20 + 0.65 * vla, m60 = 1.05 + 0.35 * vla;
      const rfm = 0.95 - 0.18 * vla;
      const tte = Math.round(60 - 40 * (vla - 0.2) / 0.6);

      profiles.push({
        vma, paceThresholdSecPerKm: 3600 / (vma * ratio),
        runPowerThreshold: Pthr,
        runPower1s: Pthr * m1, runPower5s: Pthr * m5,
        runPower30s: Pthr * m30, runPower60s: Pthr * m60,
        runPower5min: Pthr / rfm,
        tteMin: tte,
        weightKg: weight, protocolQuality: 4,
        vlamaxTarget: vla, vo2maxTarget: vo2, paceRatio: ratio,
      });
    }
  }
  return profiles;
}



function loadCSV(path: string): Profile[] {
  const txt = fs.readFileSync(path, "utf8");
  const [head, ...rows] = txt.trim().split(/\r?\n/);
  const cols = head.split(",").map(s => s.trim());
  const idx = (n: string) => cols.indexOf(n);
  const out: Profile[] = [];
  for (const r of rows) {
    const v = r.split(",").map(s => s.trim());
    const num = (n: string) => { const i = idx(n); return i >= 0 && v[i] !== "" ? Number(v[i]) : null; };
    const vma = num("vma"), pace = num("paceThresholdSecPerKm"), tgt = num("vlamaxMeasured");
    if (vma == null || pace == null || tgt == null) continue;
    out.push({
      vma, paceThresholdSecPerKm: pace,
      runPowerThreshold: num("p_thr") ?? num("runPowerThreshold") ?? 0,
      runPower1s: num("p1s"), runPower5s: num("p5s"),
      runPower30s: num("p30s"), runPower60s: num("p60s"),
      runPower5min: num("p5min"), tteMin: num("tte"),
      weightKg: num("weight") ?? 70, protocolQuality: 4,
      vlamaxTarget: tgt, paceRatio: 3600 / pace / vma,
    });
  }
  return out;
}

// ─────────────────────────────────────────────
// 2) Score G with TUNABLE normalizations (mirror of production)
// ─────────────────────────────────────────────
interface Knobs {
  S5_mid: number; S5_range: number;
  S30_mid: number; S30_range: number;
  S60_mid: number; S60_range: number;
  E_top: number; E_range: number;
  alpha: number; // fusion weight on Score G (1-alpha goes to pace)
}

const BASELINE: Knobs = {
  S5_mid: 1.6, S5_range: 1.2,
  S30_mid: 1.20, S30_range: 0.80,
  S60_mid: 1.08, S60_range: 0.55,
  E_top: 0.92, E_range: 0.22,
  alpha: 0.60,
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function scoreGTunable(p: Profile, k: Knobs): { vScoreG: number | null; vPace: number | null; vFinal: number } {
  // Pace
  let vPace: number | null = null;
  if (p.vma && p.paceThresholdSecPerKm) {
    const ratio = (3600 / p.paceThresholdSecPerKm!) / p.vma!;
    vPace = clamp(0.20 + 0.70 * clamp((0.92 - ratio) / 0.20, 0, 1), 0.20, 0.90);
  }
  // Score G
  let vScoreG: number | null = null;
  const RPT = p.runPowerThreshold;
  if (RPT && RPT > 0 && p.runPower5s && p.runPower30s) {
    const r1 = p.runPower1s ? p.runPower1s / RPT : null;
    const r5 = p.runPower5s / RPT;
    const r30 = p.runPower30s / RPT;
    const r60 = p.runPower60s ? p.runPower60s / RPT : null;
    const rfm = p.runPower5min ? RPT / p.runPower5min : null;
    const D = p.tteMin ? clamp((60 - p.tteMin) / 30, 0, 1) : null;

    const S1 = r1 != null ? clamp((r1 - 2.0) / 1.5, 0, 1) : null;
    const S5 = clamp((r5 - k.S5_mid) / k.S5_range, 0, 1);
    const S30 = clamp((r30 - k.S30_mid) / k.S30_range, 0, 1);
    const S60 = r60 != null ? clamp((r60 - k.S60_mid) / k.S60_range, 0, 1) : null;
    const E = rfm != null ? clamp((k.E_top - rfm) / k.E_range, 0, 1) : null;

    let g = 0, w = 0;
    const add = (s: number | null, weight: number) => { if (s != null) { g += s * weight; w += weight; } };
    add(S1, 0.08); add(S5, 0.22); add(S30, 0.28); add(S60, 0.15); add(E, 0.15); add(D, 0.12);
    if (w > 0) g = g / w;
    vScoreG = clamp(0.20 + 0.70 * g, 0.20, 0.90);
  }
  // Fusion
  let vFinal: number;
  if (vScoreG != null && vPace != null) vFinal = vPace * (1 - k.alpha) + vScoreG * k.alpha;
  else vFinal = vScoreG ?? vPace ?? 0;
  return { vScoreG, vPace, vFinal: clamp(vFinal, 0.20, 0.90) };
}

// ─────────────────────────────────────────────
// 3) Metrics
// ─────────────────────────────────────────────
function rmse(arr: number[]): number {
  return Math.sqrt(arr.reduce((s, x) => s + x * x, 0) / arr.length);
}

function evaluate(profiles: Profile[], k: Knobs) {
  const errVsTarget: number[] = [];
  const deltaVsCapEst: number[] = [];
  for (const p of profiles) {
    const { vFinal } = scoreGTunable(p, k);
    errVsTarget.push(vFinal - p.vlamaxTarget);
    const cap = estimateVLamaxCap({
      vma: p.vma ?? null,
      paceThresholdSecPerKm: p.paceThresholdSecPerKm ?? null,
      tteMin: p.tteMin ?? null,
      runningPowerMax: p.runPower5s ?? null,
      runningPowerThreshold: p.runPowerThreshold ?? null,
    });
    if (cap.method !== "insufficient") deltaVsCapEst.push(vFinal - cap.value);
  }
  return {
    rmseTarget: rmse(errVsTarget),
    rmseDelta: rmse(deltaVsCapEst),
    biasTarget: errVsTarget.reduce((s, x) => s + x, 0) / errVsTarget.length,
  };
}

// ─────────────────────────────────────────────
// 4) Grid search
// ─────────────────────────────────────────────
function gridSearch(profiles: Profile[]) {
  let best = { knobs: BASELINE, score: Infinity, eval: evaluate(profiles, BASELINE) };
  const grid = {
    S5_mid: [1.4, 1.5, 1.6, 1.7],
    S5_range: [1.0, 1.2, 1.4],
    S30_mid: [1.05, 1.15, 1.20, 1.30],
    S30_range: [0.65, 0.80, 0.95],
    S60_mid: [0.95, 1.05, 1.15],
    S60_range: [0.45, 0.55, 0.70],
    E_top: [0.88, 0.92, 0.95],
    E_range: [0.18, 0.22, 0.26],
    alpha: [0.50, 0.55, 0.60, 0.65, 0.70],
  };
  for (const S5_mid of grid.S5_mid)
  for (const S5_range of grid.S5_range)
  for (const S30_mid of grid.S30_mid)
  for (const S30_range of grid.S30_range)
  for (const S60_mid of grid.S60_mid)
  for (const S60_range of grid.S60_range)
  for (const E_top of grid.E_top)
  for (const E_range of grid.E_range)
  for (const alpha of grid.alpha) {
    const k = { S5_mid, S5_range, S30_mid, S30_range, S60_mid, S60_range, E_top, E_range, alpha };
    const ev = evaluate(profiles, k);
    // Composite : pénalise erreur cible (60%) + écart vs cap-estimator (40%)
    const score = 0.6 * ev.rmseTarget + 0.4 * ev.rmseDelta;
    if (score < best.score) best = { knobs: k, score, eval: ev };
  }
  return best;
}

// ─────────────────────────────────────────────
// 5) Main
// ─────────────────────────────────────────────
const csvPath = process.env.CALIB_CSV;
const profiles = csvPath && fs.existsSync(csvPath) ? loadCSV(csvPath) : genSynthetic();
const mode = csvPath && fs.existsSync(csvPath) ? `CSV (${csvPath})` : "synthetic";
console.log(`Mode: ${mode} — N=${profiles.length} profiles`);

const baseEval = evaluate(profiles, BASELINE);
console.log("\nBASELINE (production constants):");
console.log(`  RMSE vs target            : ${baseEval.rmseTarget.toFixed(4)}`);
console.log(`  RMSE vs vlamaxCapEstimator: ${baseEval.rmseDelta.toFixed(4)}`);
console.log(`  Bias vs target            : ${baseEval.biasTarget.toFixed(4)}`);

console.log("\nRunning grid search...");
const best = gridSearch(profiles);
console.log("\nBEST KNOBS:");
console.log(JSON.stringify(best.knobs, null, 2));
console.log(`  RMSE vs target            : ${best.eval.rmseTarget.toFixed(4)}`);
console.log(`  RMSE vs vlamaxCapEstimator: ${best.eval.rmseDelta.toFixed(4)}`);
console.log(`  Bias vs target            : ${best.eval.biasTarget.toFixed(4)}`);

const targetGain = (1 - best.eval.rmseTarget / baseEval.rmseTarget) * 100;
const deltaGain = (1 - best.eval.rmseDelta / baseEval.rmseDelta) * 100;
console.log(`\nImprovement: target RMSE ${targetGain.toFixed(1)}%, inter-method delta ${deltaGain.toFixed(1)}%`);

// Markdown report
const md = `# Calibration Score G CAP — ${new Date().toISOString().slice(0, 10)}

**Mode**: ${mode}
**N profiles**: ${profiles.length}

## Baseline (production)
- RMSE vs target: **${baseEval.rmseTarget.toFixed(4)}** mmol/L/s
- RMSE vs vlamaxCapEstimator: **${baseEval.rmseDelta.toFixed(4)}**
- Bias vs target: ${baseEval.biasTarget.toFixed(4)}

## Recommandé (grid-search)
\`\`\`json
${JSON.stringify(best.knobs, null, 2)}
\`\`\`
- RMSE vs target: **${best.eval.rmseTarget.toFixed(4)}**
- RMSE vs vlamaxCapEstimator: **${best.eval.rmseDelta.toFixed(4)}**
- Bias vs target: ${best.eval.biasTarget.toFixed(4)}

## Gain
- Target RMSE: ${targetGain.toFixed(1)}%
- Inter-method delta: ${deltaGain.toFixed(1)}%

## Application
${targetGain > 10 || deltaGain > 15
  ? "✅ Gain significatif — appliquer les nouvelles constantes dans `src/lib/v2/vlamaxRunV2Enhanced.ts` (lignes 230-234 et fusion ligne 284)."
  : "⚠️ Gain marginal (< 10–15%) — ne pas modifier les constantes; le harness reste exécutable pour future cohorte labo (CALIB_CSV)."}
`;
const outPath = "/mnt/documents/calibration_score_g_cap.md";
fs.mkdirSync("/mnt/documents", { recursive: true });
fs.writeFileSync(outPath, md);
console.log(`\nReport: ${outPath}`);
