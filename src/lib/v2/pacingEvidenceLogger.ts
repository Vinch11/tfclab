/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Pacing Evidence Logger — TFCL
 *
 * Persiste dans `pacing_envelope_evidence` :
 *   - l'enveloppe prédite (centre/low/high, confiance, snapshot complet)
 *   - l'intensité effectivement soutenue en course (à remplir a posteriori)
 *
 * Alimente à terme la calibration RMSE réelle des constantes CS anchors/decay
 * (cf. scripts/calibratePacingAnchors.ts).
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  PacingEnvelopeResult,
  RaceObjective,
  AmbitionLevelNormalized,
} from "@/lib/v2/pacingEnvelopeEngine";

export interface LogPacingEvidenceInput {
  athleteId?: string | null;
  raceDate: string; // ISO YYYY-MM-DD
  ambition?: AmbitionLevelNormalized | null;
  envelope: PacingEnvelopeResult;
  predictedDurationMin?: number | null;
  referenceValue?: number | null; // FTP (W) ou VMA (km/h) utilisé au calcul
  notes?: string | null;
}

export interface UpdatePacingObservedInput {
  evidenceId: string;
  observedAvgIntensityPct: number;
  observedMaxIntensityPct?: number | null;
  observedDurationMin?: number | null;
  notes?: string | null;
}

/**
 * Log une prédiction (juste après le calcul de l'enveloppe, avant la course).
 * La partie `observed_*` est laissée nulle — à remplir via updatePacingObserved().
 */
export async function logPacingEvidence(
  input: LogPacingEvidenceInput
): Promise<{ id: string } | { error: string }> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return { error: "Utilisateur non authentifié" };
  }

  const { envelope, raceDate, athleteId, ambition, predictedDurationMin, referenceValue, notes } = input;

  const { data, error } = await supabase
    .from("pacing_envelope_evidence")
    .insert({
      user_id: userData.user.id,
      athlete_id: athleteId ?? null,
      race_date: raceDate,
      race_objective: envelope.raceObjective as RaceObjective,
      sport: envelope.sport,
      ambition: ambition ?? null,
      predicted_center_pct: envelope.boundary.centerPct,
      predicted_low_pct: envelope.boundary.lowPct,
      predicted_high_pct: envelope.boundary.highPct,
      predicted_duration_min: predictedDurationMin ?? null,
      predicted_confidence: envelope.confidence,
      reference_base: envelope.boundary.referenceBase,
      reference_value: referenceValue ?? null,
      envelope_snapshot: envelope as unknown as Record<string, unknown>,
      notes: notes ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

/**
 * Renseigne l'intensité observée après la course (a posteriori).
 */
export async function updatePacingObserved(
  input: UpdatePacingObservedInput
): Promise<{ ok: true } | { error: string }> {
  const { evidenceId, observedAvgIntensityPct, observedMaxIntensityPct, observedDurationMin, notes } = input;

  const { error } = await supabase
    .from("pacing_envelope_evidence")
    .update({
      observed_avg_intensity_pct: observedAvgIntensityPct,
      observed_max_intensity_pct: observedMaxIntensityPct ?? null,
      observed_duration_min: observedDurationMin ?? null,
      notes: notes ?? undefined,
    })
    .eq("id", evidenceId);

  if (error) return { error: error.message };
  return { ok: true };
}

/**
 * Calcul RMSE cumulé (prédit vs observé) sur toutes les preuves disponibles.
 * Filtres optionnels par objectif / sport pour audit ciblé.
 */
export async function computePacingEvidenceRMSE(filters?: {
  raceObjective?: RaceObjective;
  sport?: "bike" | "run";
}): Promise<{
  n: number;
  rmse: number | null;
  bias: number | null;
  worstDeltas: Array<{ id: string; predicted: number; observed: number; delta: number }>;
} | { error: string }> {
  let query = supabase
    .from("pacing_envelope_evidence")
    .select("id, predicted_center_pct, observed_avg_intensity_pct")
    .not("observed_avg_intensity_pct", "is", null);

  if (filters?.raceObjective) query = query.eq("race_objective", filters.raceObjective);
  if (filters?.sport) query = query.eq("sport", filters.sport);

  const { data, error } = await query;
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { n: 0, rmse: null, bias: null, worstDeltas: [] };
  }

  const deltas = data.map((row) => {
    const predicted = Number(row.predicted_center_pct);
    const observed = Number(row.observed_avg_intensity_pct);
    return { id: row.id as string, predicted, observed, delta: predicted - observed };
  });

  const n = deltas.length;
  const rmse = Math.sqrt(deltas.reduce((s, d) => s + d.delta * d.delta, 0) / n);
  const bias = deltas.reduce((s, d) => s + d.delta, 0) / n;
  const worstDeltas = [...deltas].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5);

  return { n, rmse, bias, worstDeltas };
}
