/**
 * Billat Anchor Recalibration (Option A)
 * 
 * Utilise la cohorte Billat (literature_cohort_profiles, N=20) pour valider
 * et recalibrer l'ancrage Ratio Seuil/VMA → VLamax du vlamaxCapEstimator.
 * 
 * Approche :
 *  1) Pour chaque profil Billat avec CE et VMA, dériver VLamax cible via
 *     l'inverse du Modèle C (runMLSSPredictor) en supposant MLSS_pct
 *     standard élite Billat (88-91% VO2max selon catégorie).
 *  2) Calculer le ratio_seuil/VMA correspondant (vMLSS = VMA × ratio).
 *  3) Comparer la sortie actuelle de l'anchor vs VLamax cible.
 *  4) Émettre RMSE, bias, et suggestion de re-pente.
 * 
 * Run: bunx tsx scripts/billatAnchorRecalibration.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Modèle C inverse : étant donné MLSS_pct + CE, retrouver VLamax
function inverseModelC(mlssPct: number, ce: number): number {
  // MLSS_pct = 1 − 0.337·VLa − 0.0021·(CE−200)
  // VLa = (1 − MLSS_pct/100 − 0.0021·(CE−200)) / 0.337
  return (1 - mlssPct / 100 - 0.0021 * (ce - 200)) / 0.337;
}

// Anchor actuel : ratio seuil/VMA → VLamax (lignes 174-180 vlamaxCapEstimator)
function currentAnchor(ratio: number): number {
  if (ratio >= 0.95) return 0.22;
  if (ratio <= 0.70) return 0.72;
  return 0.72 - (ratio - 0.70) * 2.0;
}

// Conventions Billat / consensus élite:
//  - Elite marathon/Kenyan runners        → MLSS ≈ 91% VO2max
//  - National/sub-elite long distance     → MLSS ≈ 89%
//  - Well-trained                         → MLSS ≈ 87%
//  - Trained 30-30 / continuous           → MLSS ≈ 84%
function expectedMLSSPct(label: string): number {
  const l = label.toLowerCase();
  if (l.includes("kenyan") || l.includes("elite marathon") || l.includes("ultra-trail")) return 91;
  if (l.includes("elite") || l.includes("national")) return 90;
  if (l.includes("sub-elite") || l.includes("well-trained") || l.includes("long distance") || l.includes("long-distance")) return 88;
  return 85;
}

async function main() {
  const { data, error } = await supabase
    .from("literature_cohort_profiles")
    .select("study_author, study_year, cohort_label, vo2max, vma_kmh, running_economy")
    .ilike("study_author", "%billat%");

  if (error || !data) { console.error(error); process.exit(1); }

  console.log(`\n=== Billat Anchor Recalibration (N=${data.length}) ===\n`);
  const rows: Array<{ label: string; ratio: number; vlaTarget: number; vlaCurrent: number; delta: number }> = [];

  for (const p of data) {
    if (!p.vma_kmh || !p.running_economy) continue;
    const mlssPct = expectedMLSSPct(p.cohort_label ?? "");
    const vlaTarget = inverseModelC(mlssPct, Number(p.running_economy));
    const vMLSS = Number(p.vma_kmh) * (mlssPct / 100); // approximation: vMLSS ≈ VMA × MLSS_pct
    const ratio = vMLSS / Number(p.vma_kmh);
    const vlaCurrent = currentAnchor(ratio);
    const delta = vlaCurrent - vlaTarget;
    rows.push({
      label: `${p.study_year} ${p.cohort_label?.slice(0, 40)}`,
      ratio,
      vlaTarget: +vlaTarget.toFixed(3),
      vlaCurrent: +vlaCurrent.toFixed(3),
      delta: +delta.toFixed(3),
    });
  }

  console.table(rows);

  if (rows.length === 0) {
    console.log("Aucun profil Billat avec CE+VMA exploitable.");
    return;
  }

  const deltas = rows.map(r => r.delta);
  const bias = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const rmse = Math.sqrt(deltas.reduce((a, b) => a + b * b, 0) / deltas.length);
  const mae = deltas.reduce((a, b) => a + Math.abs(b), 0) / deltas.length;

  console.log(`\n--- Statistiques ---`);
  console.log(`  N exploitable  : ${rows.length}`);
  console.log(`  Bias (mmol/L/s): ${bias.toFixed(3)} ${bias > 0 ? "(estimateur surestime)" : "(estimateur sous-estime)"}`);
  console.log(`  RMSE           : ${rmse.toFixed(3)} (cible ≤ 0.08)`);
  console.log(`  MAE            : ${mae.toFixed(3)}`);

  console.log(`\n--- Suggestion de réancrage ---`);
  if (Math.abs(bias) <= 0.04) {
    console.log(`  ✅ Bias dans la tolérance (±0.04). Aucun ajustement nécessaire.`);
  } else {
    const adjPct = (bias * 100).toFixed(0);
    console.log(`  ⚠️  Bias ${bias > 0 ? "+" : ""}${bias.toFixed(3)} → décaler la pente Ratio Seuil/VMA de ${bias > 0 ? "−" : "+"}${Math.abs(Number(adjPct))}%`);
    console.log(`     Ligne 179 vlamaxCapEstimator : 0.72 → ${(0.72 - bias).toFixed(2)}`);
  }

  // RMSE mode source-comparison: élites Billat vs anchor
  const elites = rows.filter(r => r.label.toLowerCase().includes("elite") || r.label.toLowerCase().includes("kenyan"));
  if (elites.length >= 3) {
    const eBias = elites.reduce((a, r) => a + r.delta, 0) / elites.length;
    console.log(`\n  Sous-cohorte ÉLITES (N=${elites.length}) : bias ${eBias > 0 ? "+" : ""}${eBias.toFixed(3)}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
