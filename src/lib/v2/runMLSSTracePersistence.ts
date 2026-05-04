/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Run MLSS Trace Persistence (P3 — Modèle C)
 *
 * Sérialise un diagnostic Run MLSS (effectivePct + effectiveSource +
 * prediction Modèle C + cross-validation) vers `calibration_evidence`.
 *
 * Objectif : traçabilité longitudinale du Modèle C (RMSE 2.64 %, N=14+3),
 * équivalent du système evidence/snapshots déjà fait pour VLamax.
 *
 * Stockage : table `calibration_evidence` (champ raw_values jsonb)
 *  - evidence_type   = "RUN_MLSS_MODEL_C_TRACE"
 *  - source_type     = "TEST_PROTOCOL" (placeholder, type non utilisé pour le scoring)
 *  - used_in_calibration = false (trace pure, n'entre PAS dans le calcul)
 *  - protocol_quality = source "observed" → 5, "predicted" → 3
 *
 * Dédup : voir `hasRunMLSSTraceForSignatureToday` — un seul trace/jour par
 * (athleteId, signature payload) afin d'éviter le spam à chaque render.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { supabase } from "@/integrations/supabase/client";
import type { AthleteDiagnostic } from "@/engines/diagnostic";

export const RUN_MLSS_TRACE_VERSION = "tfcl_run_mlss_modele_c_v1";
export const RUN_MLSS_TRACE_EVIDENCE_TYPE = "RUN_MLSS_MODEL_C_TRACE";

export type RunMLSSDiagnostic = NonNullable<AthleteDiagnostic["runMLSS"]>;

export interface RunMLSSTraceInputs {
  vlamaxRun: number | null;
  runningEconomy: number | null;
  paceThresholdSecPerKm: number | null;
  vmaKmh: number | null;
}

export interface RunMLSSTracePayload {
  version: string;
  capturedAt: string;
  inputs: RunMLSSTraceInputs;
  effectivePct: number | null;
  effectiveSource: "observed" | "predicted" | "none";
  observedPct: number | null;
  prediction: RunMLSSDiagnostic["prediction"];
  crossValidation: RunMLSSDiagnostic["crossValidation"];
  // Convenience extracts for queries / dashboards
  predictedPct: number | null;
  predictionConfidence: number | null;
  crossValidationDeltaPct: number | null;
  crossValidationSeverity: string | null;
  rmseExpected: number | null;
}

/**
 * Construit une signature compacte pour dédupliquer les traces (mêmes inputs +
 * même résultat = même signature). Utilisé par `hasRunMLSSTraceForSignatureToday`.
 */
export function buildRunMLSSSignature(
  inputs: RunMLSSTraceInputs,
  diag: RunMLSSDiagnostic,
): string {
  const parts = [
    diag.effectiveSource,
    diag.effectivePct?.toFixed(1) ?? "n",
    diag.observedPct?.toFixed(1) ?? "n",
    diag.prediction?.mlssPct?.toFixed(1) ?? "n",
    inputs.vlamaxRun?.toFixed(2) ?? "n",
    inputs.runningEconomy?.toFixed(0) ?? "n",
    inputs.paceThresholdSecPerKm?.toFixed(0) ?? "n",
    inputs.vmaKmh?.toFixed(2) ?? "n",
  ];
  return parts.join("|");
}

export function buildRunMLSSTracePayload(
  inputs: RunMLSSTraceInputs,
  diag: RunMLSSDiagnostic,
): RunMLSSTracePayload {
  return {
    version: RUN_MLSS_TRACE_VERSION,
    capturedAt: new Date().toISOString(),
    inputs,
    effectivePct: diag.effectivePct,
    effectiveSource: diag.effectiveSource,
    observedPct: diag.observedPct,
    prediction: diag.prediction,
    crossValidation: diag.crossValidation,
    predictedPct: diag.prediction?.mlssPct ?? null,
    predictionConfidence: diag.prediction?.confidence ?? null,
    crossValidationDeltaPct: diag.crossValidation?.deltaPct ?? null,
    crossValidationSeverity: diag.crossValidation?.severity ?? null,
    rmseExpected: diag.prediction?.trace?.rmseExpected ?? null,
  };
}

export interface PersistRunMLSSTraceArgs {
  athleteId: string;
  coachId: string;
  inputs: RunMLSSTraceInputs;
  diag: RunMLSSDiagnostic;
  notes?: string;
}

/**
 * Vérifie si un trace avec la même signature existe déjà pour aujourd'hui.
 * Évite la persistance redondante à chaque render de la page Running.
 */
export async function hasRunMLSSTraceForSignatureToday(
  athleteId: string,
  signature: string,
): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("calibration_evidence")
    .select("id, raw_values")
    .eq("athlete_id", athleteId)
    .eq("evidence_type", RUN_MLSS_TRACE_EVIDENCE_TYPE)
    .eq("date", today)
    .limit(20);

  if (error || !data) return false;
  return data.some((row) => {
    const rv = row.raw_values as { _signature?: string } | null;
    return rv && typeof rv === "object" && rv._signature === signature;
  });
}

export async function persistRunMLSSTrace({
  athleteId,
  coachId,
  inputs,
  diag,
  notes,
}: PersistRunMLSSTraceArgs): Promise<{ id: string } | null> {
  if (!athleteId || !coachId) return null;
  if (diag.effectiveSource === "none" || diag.effectivePct == null) return null;

  const payload = buildRunMLSSTracePayload(inputs, diag);
  const signature = buildRunMLSSSignature(inputs, diag);

  // Dédup intra-journée
  const exists = await hasRunMLSSTraceForSignatureToday(athleteId, signature);
  if (exists) return null;

  const protocolQuality = diag.effectiveSource === "observed" ? 5 : 3;
  const confidence =
    diag.effectiveSource === "observed"
      ? 0.9
      : diag.prediction?.confidence ?? 0.6;

  const { data, error } = await supabase
    .from("calibration_evidence")
    .insert({
      athlete_id: athleteId,
      coach_id: coachId,
      date: new Date().toISOString().split("T")[0],
      source_type: "TEST_PROTOCOL" as any,
      evidence_type: RUN_MLSS_TRACE_EVIDENCE_TYPE as any,
      raw_values: { ...payload, _signature: signature } as any,
      protocol_quality: protocolQuality,
      validity: "OK" as any,
      confidence_evidence: confidence,
      used_in_calibration: false,
      calibration_weight: 0,
      notes:
        notes ??
        `Run MLSS Modèle C — ${diag.effectiveSource} ${diag.effectivePct?.toFixed(1)}% VO2max`,
    })
    .select("id")
    .single();

  if (error) {
    if (import.meta.env.DEV) console.error("persistRunMLSSTrace error", error);
    return null;
  }
  return { id: data.id };
}

export async function loadRunMLSSTraces(
  athleteId: string,
  limit = 30,
): Promise<Array<{ id: string; date: string; payload: RunMLSSTracePayload }>> {
  const { data, error } = await supabase
    .from("calibration_evidence")
    .select("id,date,raw_values,evidence_type")
    .eq("athlete_id", athleteId)
    .eq("evidence_type", RUN_MLSS_TRACE_EVIDENCE_TYPE)
    .order("date", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data
    .filter((r) => r.raw_values && typeof r.raw_values === "object")
    .map((r) => ({
      id: r.id,
      date: r.date,
      payload: r.raw_values as unknown as RunMLSSTracePayload,
    }));
}
