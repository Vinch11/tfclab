/**
 * Synthetic cohort generator (couche 2) — 500 profils CAP physiologiquement
 * cohérents pour stress-tester le Score G CAP.
 *
 * Principes :
 *  - Tirage corrélé : VMA ∈ [13, 22] km/h, ratio seuil/VMA ∈ [0.74, 0.92]
 *  - VLamax cible dérivé de Billat (ratio dominant), bruit gaussien σ=0.04
 *  - Puissance seuil : modèle Stryd-like, CR = f(VLamax)
 *  - Profil sprint : multiplicateurs liés à VLamax + bruit σ=5%
 *  - TTE : 20-90 min, anti-corrélé à VLamax
 *  - Couvre rare cases : élite endurant (VMA 21, ratio 0.92), sprinter (VMA 16, ratio 0.76)
 *
 * Sortie : CSV au format attendu par scripts/calibrateScoreGCAP.ts
 *  cols: vma,paceThresholdSecPerKm,runPowerThreshold,p1s,p5s,p30s,p60s,p5min,tte,weight,vlamaxMeasured
 *
 * Usage:
 *   bun run scripts/generateSyntheticCohort.ts
 *   CALIB_CSV=/mnt/documents/synthetic_cohort_500.csv bun run scripts/calibrateScoreGCAP.ts
 */
import fs from "node:fs";
import {
  REFERENCE_DISTRIBUTIONS,
  PLAUSIBILITY_BOUNDS,
} from "../src/lib/v2/literatureReferences";

const N = 500;
const OUT = "/mnt/documents/synthetic_cohort_500.csv";

// Mulberry32 PRNG (deterministic for reproducibility)
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
const rand = mulberry32(20260513);
const randn = () => {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
function drawTruncated(mean: number, sd: number, min: number, max: number): number {
  for (let i = 0; i < 20; i++) {
    const x = mean + sd * randn();
    if (x >= min && x <= max) return x;
  }
  return clamp(mean, min, max);
}
const runVo2Bound = PLAUSIBILITY_BOUNDS.find(b => b.metric === "run_vo2max")!;
const runVlaBound = PLAUSIBILITY_BOUNDS.find(b => b.metric === "run_vlamax")!;


const header = [
  "vma","paceThresholdSecPerKm","runPowerThreshold",
  "p1s","p5s","p30s","p60s","p5min","tte","weight","vlamaxMeasured",
].join(",");

const rows: string[] = [header];

let nElite = 0, nGlyco = 0, nMid = 0;

for (let i = 0; i < N; i++) {
  // Tier alterné (moitié trained sub-élite, moitié trained) — ancré littérature
  const tier: "subelite" | "trained" = i % 2 === 0 ? "subelite" : "trained";
  const dist = REFERENCE_DISTRIBUTIONS.run[tier]!;
  // VO2max ancré (Léger : VMA = VO2max / 3.5)
  const vo2 = drawTruncated(dist.vo2max.mean, dist.vo2max.sd, runVo2Bound.min, runVo2Bound.max);
  const vma = clamp(vo2 / 3.5, 13, 24);
  // VLamax ancré (draw indépendant borné littérature)
  const vlaMeasured = drawTruncated(dist.vlamax.mean, dist.vlamax.sd, runVlaBound.min, runVlaBound.max);
  // Ratio seuil/VMA dérivé de VLamax (Billat inversé)
  const ratio = clamp(0.92 - 0.20 * (vlaMeasured - 0.20) / 0.70, 0.74, 0.92);


  // Catégorisation diagnostique
  if (vlaMeasured < 0.35) nElite++;
  else if (vlaMeasured > 0.60) nGlyco++;
  else nMid++;

  // Poids : gaussien 65 ± 8 kg, tronqué
  const weight = clamp(65 + randn() * 8, 48, 92);

  // Puissance seuil (Stryd-like, CR varie avec profil)
  const vThr_ms = (vma * ratio) / 3.6;
  const CR = 0.98 + 0.10 * (vlaMeasured - 0.4) + randn() * 0.02; // J/kg/m
  const Pthr = clamp(CR * vThr_ms * weight, 100, 500);

  // Multiplicateurs sprint corrélés à VLamax (avec bruit 5% multiplicatif)
  const noise = () => 1 + randn() * 0.05;
  const m1 = (2.00 + 1.00 * vlaMeasured) * noise();
  const m5 = (1.60 + 0.80 * vlaMeasured) * noise();
  const m30 = (1.18 + 0.65 * vlaMeasured) * noise();
  const m60 = (1.05 + 0.35 * vlaMeasured) * noise();
  const rfm = clamp((0.95 - 0.18 * vlaMeasured) * noise(), 0.65, 1.05); // P_thr / P_5min

  // Garde monotonicité P1>P5>P30>P60
  const p1 = Pthr * m1;
  const p5 = Math.min(Pthr * m5, p1 * 0.95);
  const p30 = Math.min(Pthr * m30, p5 * 0.92);
  const p60 = Math.min(Pthr * m60, p30 * 0.95);
  const p5min = Pthr / rfm;

  // TTE : anti-corrélé VLamax + bruit
  const tte = clamp(Math.round(75 - 55 * (vlaMeasured - 0.2) / 0.7 + randn() * 6), 20, 95);

  const paceSecPerKm = Math.round(3600 / (vma * ratio));

  rows.push([
    vma.toFixed(2),
    paceSecPerKm,
    Pthr.toFixed(1),
    p1.toFixed(1), p5.toFixed(1), p30.toFixed(1), p60.toFixed(1), p5min.toFixed(1),
    tte,
    weight.toFixed(1),
    vlaMeasured.toFixed(3),
  ].join(","));
}

fs.mkdirSync("/mnt/documents", { recursive: true });
fs.writeFileSync(OUT, rows.join("\n") + "\n");

console.log(`✅ Cohorte synthétique générée : ${OUT}`);
console.log(`   N = ${N}`);
console.log(`   Élite endurant (VLa<0.35) : ${nElite} (${(100*nElite/N).toFixed(0)}%)`);
console.log(`   Mixte (0.35-0.60)         : ${nMid} (${(100*nMid/N).toFixed(0)}%)`);
console.log(`   Glycolytique (>0.60)      : ${nGlyco} (${(100*nGlyco/N).toFixed(0)}%)`);
console.log(`\n→ Pour calibrer :`);
console.log(`   CALIB_CSV=${OUT} bun run scripts/calibrateScoreGCAP.ts`);
