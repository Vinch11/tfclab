/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Calibration harness — Pacing Envelope™ CS anchors & decay
 *
 * Audit RMSE des constantes CS_ANCHOR_60MIN / CS_DECAY_PER_DECADE
 * (src/lib/v2/pacingEnvelopeEngine.ts) contre des points de référence extraits
 * de la littérature publiée.
 *
 * BENCHMARKS EMBARQUÉS (voir provenance dans pacingEnvelopeEngine.ts) :
 *  - Smyth & Muniz-Pumares (2022) : marathon (210 min), 3 tiers.
 *  - Jones/Vanhatalo (2017)       : 30-60 min à ~CS pour élites.
 *  - Coyle (1995) + Jeukendrup    : 40K TT vélo (~55-60 min) ~90% FTP élite.
 *  - Zamparo/di Prampero (extrap) : 10K (~30-45 min) proche vCS élite.
 *
 * MODES :
 *  1) Baseline — évalue les constantes actuelles.
 *  2) Grid-search — recherche (anchor, decay) minimisant le RMSE pondéré.
 *
 * SORTIE :
 *  - Rapport console + markdown → /mnt/documents/calibration_pacing_anchors.md
 *
 * USAGE :
 *   bun run scripts/calibratePacingAnchors.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import fs from "node:fs";
import {
  CS_ANCHOR_60MIN,
  CS_DECAY_PER_DECADE,
  CS_OVER_FTP_RATIO,
  VCS_OVER_VMA_RATIO,
  computePctReferenceForCalibration,
  type AmbitionLevelNormalized,
} from "../src/lib/v2/pacingEnvelopeEngine";

// ─────────────────────────────────────────────────────────────────────────────
// BENCHMARKS LITTÉRATURE
// ─────────────────────────────────────────────────────────────────────────────
// Chaque point: (level, sport, durée_min, %CS_observé_littérature, poids, source)
// %CS est converti en interne en %référence (FTP ou VMA) via les ratios TFCL.
interface Benchmark {
  level: AmbitionLevelNormalized;
  sport: "bike" | "run";
  durationMin: number;
  observedPctCS: number;      // % de CS/CP soutenu
  weight: number;             // 1 = normal, 2 = ancrage fort
  source: string;
}

const BENCHMARKS: Benchmark[] = [
  // ── Smyth 2022 (marathon Strava, 25M sessions) — ancrages forts ──────────
  { level: "ELITE",       sport: "run",  durationMin: 150, observedPctCS: 96, weight: 2, source: "Smyth 2022 elite marathon ~2h30" },
  { level: "COMPETITOR",  sport: "run",  durationMin: 195, observedPctCS: 92, weight: 2, source: "Smyth 2022 competitor marathon ~3h15" },
  { level: "AGE_GROUP",   sport: "run",  durationMin: 240, observedPctCS: 88, weight: 2, source: "Smyth 2022 age-group marathon ~4h00" },
  { level: "FINISHER",    sport: "run",  durationMin: 300, observedPctCS: 82, weight: 1, source: "Smyth 2022 finisher marathon ~5h00 (extrapolé)" },

  // ── Jones/Vanhatalo 2017 — CS soutenue 30-60 min ─────────────────────────
  { level: "ELITE",       sport: "run",  durationMin: 45,  observedPctCS: 101, weight: 1, source: "Jones 2017 elite ~10K 45min" },
  { level: "COMPETITOR",  sport: "run",  durationMin: 50,  observedPctCS: 98,  weight: 1, source: "Jones 2017 competitor ~10K" },

  // ── Semi (105 min) — dérivé Smyth/Léger ──────────────────────────────────
  { level: "ELITE",       sport: "run",  durationMin: 65,  observedPctCS: 98,  weight: 1, source: "Semi elite ~1h05" },
  { level: "COMPETITOR",  sport: "run",  durationMin: 90,  observedPctCS: 95,  weight: 1, source: "Semi competitor ~1h30" },
  { level: "AGE_GROUP",   sport: "run",  durationMin: 110, observedPctCS: 91,  weight: 1, source: "Semi age-group ~1h50" },

  // ── Cyclisme — Coyle 1995 / Jeukendrup / Padilla 2000 ────────────────────
  { level: "WORLD_CLASS", sport: "bike", durationMin: 55,  observedPctCS: 105, weight: 1, source: "TT pro 40K ~55min (Padilla 2000)" },
  { level: "ELITE",       sport: "bike", durationMin: 60,  observedPctCS: 100, weight: 1, source: "40K TT elite ~1h" },
  { level: "COMPETITOR",  sport: "bike", durationMin: 70,  observedPctCS: 95,  weight: 1, source: "40K TT competitor" },
  { level: "AGE_GROUP",   sport: "bike", durationMin: 90,  observedPctCS: 90,  weight: 1, source: "GranFondo bike age-group" },

  // ── 70.3 (~5h) & IM (~10h) — extrapolation, pondération basse ────────────
  { level: "COMPETITOR",  sport: "bike", durationMin: 150, observedPctCS: 85,  weight: 1, source: "70.3 bike competitor ~2h30" },
  { level: "AGE_GROUP",   sport: "bike", durationMin: 180, observedPctCS: 80,  weight: 1, source: "70.3 bike age-group ~3h" },
  { level: "ELITE",       sport: "bike", durationMin: 240, observedPctCS: 82,  weight: 0.5, source: "IM bike elite ~4h (Laursen 2011)" },
  { level: "AGE_GROUP",   sport: "bike", durationMin: 360, observedPctCS: 72,  weight: 0.5, source: "IM bike age-group ~6h (extrap)" },
];

// ─────────────────────────────────────────────────────────────────────────────
// ÉVALUATION
// ─────────────────────────────────────────────────────────────────────────────
interface EvalResult {
  rmse: number;
  bias: number;
  n: number;
  worst: Array<{ bench: Benchmark; predicted: number; expected: number; err: number }>;
}

function evaluate(
  anchors: Record<AmbitionLevelNormalized, number>,
  decays: Record<AmbitionLevelNormalized, number>
): EvalResult {
  let sumSq = 0;
  let sumErr = 0;
  let sumW = 0;
  const errs: Array<{ bench: Benchmark; predicted: number; expected: number; err: number }> = [];

  for (const b of BENCHMARKS) {
    const anchor = anchors[b.level];
    const decay = decays[b.level];
    const pctCS_pred = anchor - decay * Math.log10(Math.max(b.durationMin, 5) / 60);
    const ratio = b.sport === "bike" ? CS_OVER_FTP_RATIO : VCS_OVER_VMA_RATIO;
    const pctRef_pred = pctCS_pred * ratio;
    const pctRef_expected = b.observedPctCS * ratio;
    const err = pctRef_pred - pctRef_expected;

    sumSq += b.weight * err * err;
    sumErr += b.weight * err;
    sumW += b.weight;
    errs.push({ bench: b, predicted: pctRef_pred, expected: pctRef_expected, err });
  }

  errs.sort((a, b) => Math.abs(b.err) - Math.abs(a.err));
  return {
    rmse: Math.sqrt(sumSq / sumW),
    bias: sumErr / sumW,
    n: BENCHMARKS.length,
    worst: errs.slice(0, 5),
  };
}

// Cross-validation avec la fonction publique (sanity check)
function verifyPublicFn(): void {
  for (const b of BENCHMARKS.slice(0, 3)) {
    const internal = computePctReferenceForCalibration(b.durationMin, b.level, b.sport);
    const anchor = CS_ANCHOR_60MIN[b.level];
    const decay = CS_DECAY_PER_DECADE[b.level];
    const ratio = b.sport === "bike" ? CS_OVER_FTP_RATIO : VCS_OVER_VMA_RATIO;
    const expected = Math.max(55, Math.min(100, (anchor - decay * Math.log10(b.durationMin / 60)) * ratio));
    if (Math.abs(internal - expected) > 0.01) {
      throw new Error(`Mismatch pour ${b.level}/${b.sport}/${b.durationMin}min : ${internal} vs ${expected}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GRID-SEARCH par tier (anchor ± 4, decay ± 6)
// ─────────────────────────────────────────────────────────────────────────────
function gridSearchPerTier(): { anchors: Record<AmbitionLevelNormalized, number>; decays: Record<AmbitionLevelNormalized, number> } {
  const bestAnchors = { ...CS_ANCHOR_60MIN };
  const bestDecays = { ...CS_DECAY_PER_DECADE };
  const tiers: AmbitionLevelNormalized[] = ["WORLD_CLASS", "ELITE", "COMPETITOR", "AGE_GROUP", "FINISHER"];

  for (const tier of tiers) {
    const tierBench = BENCHMARKS.filter((b) => b.level === tier);
    if (tierBench.length === 0) continue;

    let bestRmse = Infinity;
    let bestA = bestAnchors[tier];
    let bestD = bestDecays[tier];

    for (let a = CS_ANCHOR_60MIN[tier] - 4; a <= CS_ANCHOR_60MIN[tier] + 4; a += 0.5) {
      for (let d = Math.max(3, CS_DECAY_PER_DECADE[tier] - 6); d <= CS_DECAY_PER_DECADE[tier] + 6; d += 0.5) {
        let sq = 0;
        let w = 0;
        for (const b of tierBench) {
          const pctCS_pred = a - d * Math.log10(b.durationMin / 60);
          const ratio = b.sport === "bike" ? CS_OVER_FTP_RATIO : VCS_OVER_VMA_RATIO;
          const err = (pctCS_pred - b.observedPctCS) * ratio;
          sq += b.weight * err * err;
          w += b.weight;
        }
        const rmse = Math.sqrt(sq / w);
        if (rmse < bestRmse) {
          bestRmse = rmse;
          bestA = a;
          bestD = d;
        }
      }
    }

    bestAnchors[tier] = Math.round(bestA * 2) / 2;
    bestDecays[tier] = Math.round(bestD * 2) / 2;
  }

  return { anchors: bestAnchors, decays: bestDecays };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
function main(): void {
  verifyPublicFn();
  console.log("═══ Calibration Pacing Envelope™ anchors ═══\n");
  console.log(`N benchmarks : ${BENCHMARKS.length}`);
  console.log(`Cible RMSE   : ≤ 3 pts %référence (FTP/VMA)\n`);

  const baseline = evaluate(CS_ANCHOR_60MIN, CS_DECAY_PER_DECADE);
  console.log(`── BASELINE (constantes actuelles) ──`);
  console.log(`  RMSE : ${baseline.rmse.toFixed(2)} pts`);
  console.log(`  Bias : ${baseline.bias >= 0 ? "+" : ""}${baseline.bias.toFixed(2)} pts`);
  console.log(`  5 pires écarts :`);
  for (const w of baseline.worst) {
    console.log(
      `    ${w.bench.level.padEnd(12)} ${w.bench.sport} ${String(w.bench.durationMin).padStart(4)}min → ` +
        `pred=${w.predicted.toFixed(1)}% attendu=${w.expected.toFixed(1)}% (Δ${w.err >= 0 ? "+" : ""}${w.err.toFixed(1)}) — ${w.bench.source}`
    );
  }

  const { anchors, decays } = gridSearchPerTier();
  const optimized = evaluate(anchors, decays);
  console.log(`\n── GRID-SEARCH (anchor ± 4, decay ± 6, pas 0.5) ──`);
  console.log(`  RMSE : ${optimized.rmse.toFixed(2)} pts (${optimized.rmse < baseline.rmse ? "−" : "+"}${Math.abs(baseline.rmse - optimized.rmse).toFixed(2)})`);
  console.log(`  Bias : ${optimized.bias >= 0 ? "+" : ""}${optimized.bias.toFixed(2)} pts`);
  console.log(`\n  Recommandations :`);
  const tiers: AmbitionLevelNormalized[] = ["WORLD_CLASS", "ELITE", "COMPETITOR", "AGE_GROUP", "FINISHER"];
  for (const t of tiers) {
    const dA = anchors[t] - CS_ANCHOR_60MIN[t];
    const dD = decays[t] - CS_DECAY_PER_DECADE[t];
    console.log(
      `    ${t.padEnd(12)} anchor=${CS_ANCHOR_60MIN[t]}→${anchors[t]} (${dA >= 0 ? "+" : ""}${dA.toFixed(1)})   ` +
        `decay=${CS_DECAY_PER_DECADE[t]}→${decays[t]} (${dD >= 0 ? "+" : ""}${dD.toFixed(1)})`
    );
  }

  const improvementPct = ((baseline.rmse - optimized.rmse) / baseline.rmse) * 100;
  console.log(`\n  Amélioration RMSE : ${improvementPct >= 0 ? "" : "+"}${(-improvementPct).toFixed(1)}%`);

  // ── Markdown report ──────────────────────────────────────────────────────
  const md = `# Calibration Pacing Envelope™ — CS anchors & decay

_Généré : ${new Date().toISOString()}_

## Baseline (constantes actuelles)
- **RMSE** : ${baseline.rmse.toFixed(2)} pts %référence
- **Bias** : ${baseline.bias >= 0 ? "+" : ""}${baseline.bias.toFixed(2)} pts
- **N**    : ${baseline.n} benchmarks littérature

### 5 pires écarts
| Tier | Sport | Durée | Prédit | Attendu | Δ | Source |
|------|-------|-------|--------|---------|----|--------|
${baseline.worst
  .map(
    (w) =>
      `| ${w.bench.level} | ${w.bench.sport} | ${w.bench.durationMin}min | ${w.predicted.toFixed(1)}% | ${w.expected.toFixed(1)}% | ${w.err >= 0 ? "+" : ""}${w.err.toFixed(1)} | ${w.bench.source} |`
  )
  .join("\n")}

## Grid-search optimal (± 4 anchor / ± 6 decay, pas 0.5)
- **RMSE** : ${optimized.rmse.toFixed(2)} pts (${improvementPct.toFixed(1)}% d'amélioration)
- **Bias** : ${optimized.bias >= 0 ? "+" : ""}${optimized.bias.toFixed(2)} pts

### Recommandations
| Tier | Anchor (actuel → recommandé) | Decay (actuel → recommandé) |
|------|------------------------------|------------------------------|
${tiers
  .map(
    (t) =>
      `| ${t} | ${CS_ANCHOR_60MIN[t]} → **${anchors[t]}** | ${CS_DECAY_PER_DECADE[t]} → **${decays[t]}** |`
  )
  .join("\n")}

## Décision
Si l'amélioration RMSE est < 15 %, garder les constantes actuelles (bruit
d'échantillonnage). Sinon, mettre à jour \`CS_ANCHOR_60MIN\` / \`CS_DECAY_PER_DECADE\`
dans \`src/lib/v2/pacingEnvelopeEngine.ts\` et re-run les tests.
`;

  const outPath = "/mnt/documents/calibration_pacing_anchors.md";
  fs.writeFileSync(outPath, md, "utf8");
  console.log(`\n📄 Rapport écrit : ${outPath}`);
}

main();
