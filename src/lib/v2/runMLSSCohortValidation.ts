/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RUN MLSS COHORT VALIDATION ENGINE — TFCL™
 *
 * Élargit la cohorte de validation Modèle C au-delà de N=14 (calibration interne)
 * en agrégeant les tests terrain saisis par les coaches.
 *
 * Source : `calibration_evidence` filtrée sur `evidence_type=RUN_MLSS_COHORT_TEST`.
 * Trace pure (used_in_calibration=false) — n'altère pas le Modèle C, sert
 * uniquement à mesurer la généralisation et publier un RMSE recalculé.
 *
 * ANALYSE DUAL-TIER :
 *   - LAB    : protocol_quality ≥ 4 (test seuil 30 min validé + VLamax mesurée + CE mesurée)
 *   - FIELD  : protocol_quality 2-3 (terrain, estimations OK)
 *   - REJECT : protocol_quality < 2 → exclu de l'analyse
 *
 * RMSE recalculé pondéré (qualité 4=1.0, 3=0.7, 2=0.5).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { predictRunMLSSPctFromVLaCE } from "@/lib/v2/runMLSSPredictor";

export const RUN_MLSS_COHORT_EVIDENCE_TYPE = "RUN_MLSS_COHORT_TEST";

export type CohortTier = "lab" | "field" | "rejected";

export interface CohortTestEntry {
  id: string;
  athleteId: string;
  athleteName?: string | null;
  date: string;
  // Inputs Modèle C
  vlamaxRun: number;
  runningEconomy: number;
  // Mesure terrain : pace seuil (sec/km) + VMA (km/h) → MLSS_pct observé
  paceThresholdSecPerKm: number;
  vmaKmh: number;
  observedMLSSPct: number;
  // Quality
  protocolQuality: 1 | 2 | 3 | 4 | 5;
  tier: CohortTier;
  // Métadonnées contextuelles
  fatigueIndex?: number | null;
  testProtocol?: string | null;
  notes?: string | null;
  // Calculé : prédiction + delta
  predictedMLSSPct: number | null;
  deltaPct: number | null;
  weight: number;
}

export interface CohortTierStats {
  n: number;
  rmse: number | null;          // pondéré
  bias: number | null;          // mean(predicted - observed) pondéré
  mae: number | null;           // mean abs delta pondéré
  withinThreshold: {
    pct1: number;               // % de tests dans ±1 pt
    pct3: number;               // % de tests dans ±3 pts
    pct5: number;               // % de tests dans ±5 pts
  };
  meanVlamax: number | null;
  meanCe: number | null;
  meanObserved: number | null;
}

export interface CohortReport {
  total: number;
  retained: number;
  rejected: number;
  byTier: {
    lab: CohortTierStats;
    field: CohortTierStats;
    combined: CohortTierStats;
  };
  entries: CohortTestEntry[];
  // Comparaison vs RMSE calibration interne (2.64% sur N=14+3)
  baselineRmse: number;
  generalizationVerdict:
    | "insufficient"   // < 10 entrées
    | "consistent"     // RMSE field ≤ baseline × 1.5
    | "drifting"       // RMSE field > baseline × 1.5 et ≤ × 2
    | "incoherent";    // RMSE field > baseline × 2 → modèle à recalibrer
  notes: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const QUALITY_WEIGHTS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0,
  2: 0.5,
  3: 0.7,
  4: 1.0,
  5: 1.0,
};

const COHORT_BASELINE_RMSE = 2.64; // %VO2max, calibration N=14+3

export function classifyTier(protocolQuality: number): CohortTier {
  if (protocolQuality >= 4) return "lab";
  if (protocolQuality >= 2) return "field";
  return "rejected";
}

/** Calcule le MLSS observé en % VO2max depuis pace seuil + VMA. */
export function deriveObservedMLSSPct(
  paceThresholdSecPerKm: number,
  vmaKmh: number,
): number | null {
  if (paceThresholdSecPerKm <= 0 || vmaKmh <= 0) return null;
  const speedKmh = 3600 / paceThresholdSecPerKm;
  const ratio = (speedKmh / vmaKmh) * 100;
  if (ratio < 50 || ratio > 100) return null;
  return Number(ratio.toFixed(1));
}

interface RawEvidenceRow {
  id: string;
  athlete_id: string;
  date: string;
  protocol_quality: number;
  fatigue_index?: number | null;
  notes?: string | null;
  raw_values: Record<string, unknown>;
}

export function buildCohortEntry(
  row: RawEvidenceRow,
  athleteName?: string | null,
): CohortTestEntry | null {
  const rv = row.raw_values || {};
  const vlamaxRun = Number(rv.vlamaxRun);
  const ce = Number(rv.runningEconomy);
  const pace = Number(rv.paceThresholdSecPerKm);
  const vma = Number(rv.vmaKmh);
  const protocol = Number(rv.testProtocol ?? "") ? null : (rv.testProtocol as string | null);

  if (!Number.isFinite(vlamaxRun) || vlamaxRun <= 0) return null;
  if (!Number.isFinite(ce) || ce <= 0) return null;
  if (!Number.isFinite(pace) || pace <= 0) return null;
  if (!Number.isFinite(vma) || vma <= 0) return null;

  const observed = deriveObservedMLSSPct(pace, vma);
  if (observed == null) return null;

  const q = Math.max(1, Math.min(5, row.protocol_quality)) as 1 | 2 | 3 | 4 | 5;
  const tier = classifyTier(q);

  const prediction = predictRunMLSSPctFromVLaCE(vlamaxRun, ce);
  const predicted = prediction?.mlssPct ?? null;
  const delta = predicted != null ? Number((predicted - observed).toFixed(2)) : null;

  return {
    id: row.id,
    athleteId: row.athlete_id,
    athleteName: athleteName ?? null,
    date: row.date,
    vlamaxRun,
    runningEconomy: ce,
    paceThresholdSecPerKm: pace,
    vmaKmh: vma,
    observedMLSSPct: observed,
    protocolQuality: q,
    tier,
    fatigueIndex: row.fatigue_index ?? null,
    testProtocol: protocol,
    notes: row.notes ?? null,
    predictedMLSSPct: predicted,
    deltaPct: delta,
    weight: QUALITY_WEIGHTS[q],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════════

function weightedMean(values: number[], weights: number[]): number | null {
  if (values.length === 0) return null;
  const wSum = weights.reduce((a, b) => a + b, 0);
  if (wSum <= 0) return null;
  return values.reduce((acc, v, i) => acc + v * weights[i], 0) / wSum;
}

function emptyStats(): CohortTierStats {
  return {
    n: 0,
    rmse: null,
    bias: null,
    mae: null,
    withinThreshold: { pct1: 0, pct3: 0, pct5: 0 },
    meanVlamax: null,
    meanCe: null,
    meanObserved: null,
  };
}

function computeTierStats(entries: CohortTestEntry[]): CohortTierStats {
  const usable = entries.filter((e) => e.deltaPct != null && e.weight > 0);
  if (usable.length === 0) return emptyStats();

  const deltas = usable.map((e) => e.deltaPct as number);
  const weights = usable.map((e) => e.weight);
  const wSum = weights.reduce((a, b) => a + b, 0);

  const sqErr = deltas.map((d) => d * d);
  const wMSE = sqErr.reduce((acc, v, i) => acc + v * weights[i], 0) / wSum;
  const rmse = Math.sqrt(wMSE);

  const bias = deltas.reduce((acc, v, i) => acc + v * weights[i], 0) / wSum;
  const mae =
    deltas.reduce((acc, v, i) => acc + Math.abs(v) * weights[i], 0) / wSum;

  const pct1 = (usable.filter((e) => Math.abs(e.deltaPct!) <= 1).length / usable.length) * 100;
  const pct3 = (usable.filter((e) => Math.abs(e.deltaPct!) <= 3).length / usable.length) * 100;
  const pct5 = (usable.filter((e) => Math.abs(e.deltaPct!) <= 5).length / usable.length) * 100;

  return {
    n: usable.length,
    rmse: Number(rmse.toFixed(2)),
    bias: Number(bias.toFixed(2)),
    mae: Number(mae.toFixed(2)),
    withinThreshold: {
      pct1: Number(pct1.toFixed(1)),
      pct3: Number(pct3.toFixed(1)),
      pct5: Number(pct5.toFixed(1)),
    },
    meanVlamax: Number(weightedMean(usable.map((e) => e.vlamaxRun), weights)?.toFixed(3) ?? "0") || null,
    meanCe: Number(weightedMean(usable.map((e) => e.runningEconomy), weights)?.toFixed(0) ?? "0") || null,
    meanObserved: Number(weightedMean(usable.map((e) => e.observedMLSSPct), weights)?.toFixed(1) ?? "0") || null,
  };
}

export function buildCohortReport(entries: CohortTestEntry[]): CohortReport {
  const lab = entries.filter((e) => e.tier === "lab");
  const field = entries.filter((e) => e.tier === "field");
  const rejected = entries.filter((e) => e.tier === "rejected");
  const combined = [...lab, ...field];

  const labStats = computeTierStats(lab);
  const fieldStats = computeTierStats(field);
  const combinedStats = computeTierStats(combined);

  const notes: string[] = [];

  // Verdict de généralisation : on regarde le combined (lab + field)
  let verdict: CohortReport["generalizationVerdict"];
  if (combinedStats.n < 10) {
    verdict = "insufficient";
    notes.push(`Cohorte trop petite (N=${combinedStats.n}, min 10) — verdict non statuable`);
  } else {
    const rmse = combinedStats.rmse ?? Infinity;
    if (rmse <= COHORT_BASELINE_RMSE * 1.5) {
      verdict = "consistent";
      notes.push(`RMSE cohorte ${rmse}% ≤ baseline ×1.5 (${(COHORT_BASELINE_RMSE * 1.5).toFixed(2)}%) — Modèle C généralise`);
    } else if (rmse <= COHORT_BASELINE_RMSE * 2) {
      verdict = "drifting";
      notes.push(`RMSE cohorte ${rmse}% — dérive modérée, surveiller le bias (${combinedStats.bias})`);
    } else {
      verdict = "incoherent";
      notes.push(`RMSE cohorte ${rmse}% > baseline ×2 — recalibration Modèle C à envisager`);
    }
  }

  if (combinedStats.bias != null && Math.abs(combinedStats.bias) > 1.5) {
    notes.push(
      combinedStats.bias > 0
        ? `Biais positif (+${combinedStats.bias}%) : modèle sur-estime le MLSS terrain`
        : `Biais négatif (${combinedStats.bias}%) : modèle sous-estime le MLSS terrain`,
    );
  }

  if (labStats.n >= 5 && fieldStats.n >= 5 && labStats.rmse != null && fieldStats.rmse != null) {
    const ratio = fieldStats.rmse / labStats.rmse;
    if (ratio > 1.5) {
      notes.push(`RMSE terrain (${fieldStats.rmse}%) significativement > labo (${labStats.rmse}%) — bruit d'estimation domine`);
    } else {
      notes.push(`RMSE terrain et labo cohérents (ratio ${ratio.toFixed(2)}) — Modèle C robuste hors labo`);
    }
  }

  return {
    total: entries.length,
    retained: combined.length,
    rejected: rejected.length,
    byTier: { lab: labStats, field: fieldStats, combined: combinedStats },
    entries,
    baselineRmse: COHORT_BASELINE_RMSE,
    generalizationVerdict: verdict,
    notes,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT CSV (pour publication / analyse externe)
// ═══════════════════════════════════════════════════════════════════════════════

export function entriesToCSV(entries: CohortTestEntry[]): string {
  const headers = [
    "date",
    "athlete_id",
    "athlete_name",
    "tier",
    "protocol_quality",
    "vlamax_run_mmolLs",
    "running_economy_mlO2kgkm",
    "pace_threshold_sec_per_km",
    "vma_kmh",
    "observed_mlss_pct",
    "predicted_mlss_pct",
    "delta_pct",
    "fatigue_index",
    "notes",
  ];
  const rows = entries.map((e) =>
    [
      e.date,
      e.athleteId,
      e.athleteName ?? "",
      e.tier,
      e.protocolQuality,
      e.vlamaxRun,
      e.runningEconomy,
      e.paceThresholdSecPerKm,
      e.vmaKmh,
      e.observedMLSSPct,
      e.predictedMLSSPct ?? "",
      e.deltaPct ?? "",
      e.fatigueIndex ?? "",
      (e.notes ?? "").replace(/[\r\n]/g, " ").replace(/"/g, "'"),
    ]
      .map((v) => `"${v}"`)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}
