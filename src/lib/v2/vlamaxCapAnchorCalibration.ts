/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VLAMAX CAP ANCHOR CALIBRATION (P4) — TFCL™
 *
 * Objectif : valider/recalibrer empiriquement les ancrages d'interpolation
 * du `vlamaxCapEstimator` (Sprint 15s & Puissance Max CAP) à partir de la
 * cohorte coach.
 *
 * Source : `calibration_evidence` filtrée sur `evidence_type=VLAMAX_CAP_ANCHOR`.
 * Contrainte : chaque entrée DOIT contenir `vlamaxRunMeasured` (mesure labo
 * lactate) et au moins un des deux : `sprint15sDistance` ou `runningPowerMax`.
 *
 * Réutilise la même structure dual-tier que `runMLSSCohortValidation.ts` :
 *   - LAB    (protocol_quality ≥ 4) : poids 1.0
 *   - FIELD  (protocol_quality 2-3) : poids 0.5-0.7
 *   - REJECT (< 2)                  : exclu
 *
 * Trace pure (used_in_calibration=false) — n'altère pas l'estimateur.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { estimateVLamaxCap } from "@/lib/v2/vlamaxCapEstimator";

export const VLAMAX_CAP_ANCHOR_EVIDENCE_TYPE = "VLAMAX_CAP_ANCHOR";

export type AnchorTier = "lab" | "field" | "rejected";

export interface AnchorTestEntry {
  id: string;
  athleteId: string;
  athleteName?: string | null;
  date: string;
  // Mesure de référence (labo)
  vlamaxRunMeasured: number; // mmol/L/s
  // Inputs disponibles (au moins un)
  sprint15sDistance?: number | null;
  runningPowerMax?: number | null;
  vma?: number | null;
  paceThresholdSecPerKm?: number | null;
  // Quality
  protocolQuality: 1 | 2 | 3 | 4 | 5;
  tier: AnchorTier;
  notes?: string | null;
  // Calculé : prédiction estimateur SANS la mesure labo (pour tester l'estimation)
  predictedVLamax: number | null;
  deltaVLamax: number | null;
  weight: number;
}

export interface AnchorTierStats {
  n: number;
  rmse: number | null;       // mmol/L/s pondéré
  bias: number | null;
  mae: number | null;
  withinThreshold: {
    pct005: number;          // % dans ±0.05
    pct010: number;          // % dans ±0.10
    pct015: number;          // % dans ±0.15
  };
}

export interface AnchorReport {
  total: number;
  retained: number;
  rejected: number;
  byTier: { lab: AnchorTierStats; field: AnchorTierStats; combined: AnchorTierStats };
  // Sous-cohortes par source utilisée
  bySource: {
    sprintOnly: AnchorTierStats;
    powerOnly: AnchorTierStats;
    both: AnchorTierStats;
  };
  entries: AnchorTestEntry[];
  // Suggestions de réancrage (si N ≥ 10 et bias significatif)
  anchorSuggestions: string[];
  generalizationVerdict: "insufficient" | "consistent" | "drifting" | "incoherent";
  notes: string[];
}

const QUALITY_WEIGHTS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0, 2: 0.5, 3: 0.7, 4: 1.0, 5: 1.0,
};

const ANCHOR_BASELINE_RMSE = 0.08; // mmol/L/s — tolérance d'estimation cible

export function classifyAnchorTier(protocolQuality: number): AnchorTier {
  if (protocolQuality >= 4) return "lab";
  if (protocolQuality >= 2) return "field";
  return "rejected";
}

interface RawEvidenceRow {
  id: string;
  athlete_id: string;
  date: string;
  protocol_quality: number;
  notes?: string | null;
  raw_values: Record<string, unknown>;
}

export function buildAnchorEntry(
  row: RawEvidenceRow,
  athleteName?: string | null,
): AnchorTestEntry | null {
  const rv = row.raw_values || {};
  const measured = Number(rv.vlamaxRunMeasured);
  if (!Number.isFinite(measured) || measured <= 0) return null;

  const sprint = Number(rv.sprint15sDistance);
  const pmax = Number(rv.runningPowerMax);
  const vma = Number(rv.vma);
  const pace = Number(rv.paceThresholdSecPerKm);

  const hasSprint = Number.isFinite(sprint) && sprint > 0;
  const hasPower = Number.isFinite(pmax) && pmax > 0;
  if (!hasSprint && !hasPower) return null; // doit avoir au moins une source à tester

  const q = Math.max(1, Math.min(5, row.protocol_quality)) as 1 | 2 | 3 | 4 | 5;
  const tier = classifyAnchorTier(q);

  // IMPORTANT : on prédit SANS la mesure labo pour tester réellement l'estimateur
  const est = estimateVLamaxCap({
    vma: Number.isFinite(vma) && vma > 0 ? vma : null,
    paceThresholdSecPerKm: Number.isFinite(pace) && pace > 0 ? pace : null,
    sprint15sDistance: hasSprint ? sprint : null,
    runningPowerMax: hasPower ? pmax : null,
  });

  const predicted = est?.value ?? null;
  const delta = predicted != null ? Number((predicted - measured).toFixed(3)) : null;

  return {
    id: row.id,
    athleteId: row.athlete_id,
    athleteName: athleteName ?? null,
    date: row.date,
    vlamaxRunMeasured: measured,
    sprint15sDistance: hasSprint ? sprint : null,
    runningPowerMax: hasPower ? pmax : null,
    vma: Number.isFinite(vma) && vma > 0 ? vma : null,
    paceThresholdSecPerKm: Number.isFinite(pace) && pace > 0 ? pace : null,
    protocolQuality: q,
    tier,
    notes: row.notes ?? null,
    predictedVLamax: predicted,
    deltaVLamax: delta,
    weight: QUALITY_WEIGHTS[q],
  };
}

function emptyStats(): AnchorTierStats {
  return {
    n: 0, rmse: null, bias: null, mae: null,
    withinThreshold: { pct005: 0, pct010: 0, pct015: 0 },
  };
}

function computeStats(entries: AnchorTestEntry[]): AnchorTierStats {
  const usable = entries.filter((e) => e.deltaVLamax != null && e.weight > 0);
  if (usable.length === 0) return emptyStats();

  const deltas = usable.map((e) => e.deltaVLamax as number);
  const weights = usable.map((e) => e.weight);
  const wSum = weights.reduce((a, b) => a + b, 0);

  const wMSE = deltas.reduce((acc, d, i) => acc + d * d * weights[i], 0) / wSum;
  const rmse = Math.sqrt(wMSE);
  const bias = deltas.reduce((acc, d, i) => acc + d * weights[i], 0) / wSum;
  const mae = deltas.reduce((acc, d, i) => acc + Math.abs(d) * weights[i], 0) / wSum;

  const pct005 = (usable.filter((e) => Math.abs(e.deltaVLamax!) <= 0.05).length / usable.length) * 100;
  const pct010 = (usable.filter((e) => Math.abs(e.deltaVLamax!) <= 0.10).length / usable.length) * 100;
  const pct015 = (usable.filter((e) => Math.abs(e.deltaVLamax!) <= 0.15).length / usable.length) * 100;

  return {
    n: usable.length,
    rmse: Number(rmse.toFixed(3)),
    bias: Number(bias.toFixed(3)),
    mae: Number(mae.toFixed(3)),
    withinThreshold: {
      pct005: Number(pct005.toFixed(1)),
      pct010: Number(pct010.toFixed(1)),
      pct015: Number(pct015.toFixed(1)),
    },
  };
}

export function buildAnchorReport(entries: AnchorTestEntry[]): AnchorReport {
  const lab = entries.filter((e) => e.tier === "lab");
  const field = entries.filter((e) => e.tier === "field");
  const rejected = entries.filter((e) => e.tier === "rejected");
  const combined = [...lab, ...field];

  const sprintOnly = combined.filter((e) => e.sprint15sDistance != null && e.runningPowerMax == null);
  const powerOnly = combined.filter((e) => e.runningPowerMax != null && e.sprint15sDistance == null);
  const both = combined.filter((e) => e.sprint15sDistance != null && e.runningPowerMax != null);

  const labStats = computeStats(lab);
  const fieldStats = computeStats(field);
  const combinedStats = computeStats(combined);

  const notes: string[] = [];
  const anchorSuggestions: string[] = [];

  let verdict: AnchorReport["generalizationVerdict"];
  if (combinedStats.n < 10) {
    verdict = "insufficient";
    notes.push(`Cohorte trop petite (N=${combinedStats.n}, min 10) — réancrage non statuable.`);
  } else {
    const rmse = combinedStats.rmse ?? Infinity;
    if (rmse <= ANCHOR_BASELINE_RMSE) {
      verdict = "consistent";
      notes.push(`RMSE ${rmse} ≤ tolérance ${ANCHOR_BASELINE_RMSE} — ancrages valides.`);
    } else if (rmse <= ANCHOR_BASELINE_RMSE * 1.5) {
      verdict = "drifting";
      notes.push(`RMSE ${rmse} > tolérance, dérive modérée. Inspecter le bias (${combinedStats.bias}).`);
    } else {
      verdict = "incoherent";
      notes.push(`RMSE ${rmse} > 1.5×tolérance — réancrage Sprint/Puissance recommandé.`);
    }
  }

  if (combinedStats.bias != null && Math.abs(combinedStats.bias) > 0.04 && combinedStats.n >= 10) {
    if (combinedStats.bias > 0) {
      anchorSuggestions.push(
        `Bias +${combinedStats.bias} : estimateur surestime VLamax. Réduire ancrages Sprint/Puissance d'environ ${(combinedStats.bias * 100).toFixed(0)}%.`,
      );
    } else {
      anchorSuggestions.push(
        `Bias ${combinedStats.bias} : estimateur sous-estime VLamax. Augmenter ancrages Sprint/Puissance d'environ ${(Math.abs(combinedStats.bias) * 100).toFixed(0)}%.`,
      );
    }
  }

  return {
    total: entries.length,
    retained: combined.length,
    rejected: rejected.length,
    byTier: { lab: labStats, field: fieldStats, combined: combinedStats },
    bySource: {
      sprintOnly: computeStats(sprintOnly),
      powerOnly: computeStats(powerOnly),
      both: computeStats(both),
    },
    entries,
    anchorSuggestions,
    generalizationVerdict: verdict,
    notes,
  };
}

/** Helper d'enregistrement : payload `raw_values` à insérer dans `calibration_evidence`. */
export function buildAnchorRawValues(input: {
  vlamaxRunMeasured: number;
  sprint15sDistance?: number | null;
  runningPowerMax?: number | null;
  vma?: number | null;
  paceThresholdSecPerKm?: number | null;
}): Record<string, number> {
  const out: Record<string, number> = { vlamaxRunMeasured: input.vlamaxRunMeasured };
  if (input.sprint15sDistance != null) out.sprint15sDistance = input.sprint15sDistance;
  if (input.runningPowerMax != null) out.runningPowerMax = input.runningPowerMax;
  if (input.vma != null) out.vma = input.vma;
  if (input.paceThresholdSecPerKm != null) out.paceThresholdSecPerKm = input.paceThresholdSecPerKm;
  return out;
}
