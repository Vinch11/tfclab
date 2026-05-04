/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VLamax Trace Persistence (P2)
 *
 * Sérialise un VLamaxBikeV2EnhancedResult + input vers une ligne
 * `calibration_evidence` afin de permettre la traçabilité inter-versions
 * (regression tests, debug, comparatif méthode-par-méthode).
 *
 * Stockage : table `calibration_evidence` (champ raw_values jsonb)
 *  - evidence_type   = "VLAMAX_MODEL_TRACE"
 *  - source_type     = "TEST_PROTOCOL" (placeholder, type non utilisé pour le scoring)
 *  - used_in_calibration = false (trace pure, n'entre PAS dans le calcul)
 *  - protocol_quality = 5 (snapshot machine, pas un test athlète)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  VLamaxBikeV2EnhancedInput,
  VLamaxBikeV2EnhancedResult,
} from "./vlamaxBikeV2Enhanced";

export const VLAMAX_TRACE_VERSION = "tfcl_v2.3_p0_p1_p2";
export const VLAMAX_TRACE_EVIDENCE_TYPE = "VLAMAX_MODEL_TRACE";

export interface VLamaxTracePayload {
  version: string;
  capturedAt: string;
  input: VLamaxBikeV2EnhancedInput;
  result: {
    value: number;
    rangeMin: number;
    rangeMax: number;
    confidence: number;
    confidenceLabel: string;
    formula: string;
    formulaLabel: string;
    pedagogicalMessage: string;
    warnings: string[];
    sources: string[];
    percentile?: number;
    isOutlier?: boolean;
    cluster?: { id: string; label: string } | null;
  };
  components: VLamaxBikeV2EnhancedResult["components"];
  // Convenience extracts for queries / dashboards
  hybridTier?: string | null;
  rfm?: number | null;
  scoreG?: number | null;
  divergence?: number | null;
  methods?: Record<string, number | null>;
}

function extractMethodsFromComponents(
  c: VLamaxBikeV2EnhancedResult["components"]
): Record<string, number | null> {
  if (!c) return {};
  // The components object holds method-by-method values; we expose the most useful keys.
  const anyC = c as any;
  return {
    mader_mlss: anyC.mader_mlss ?? anyC.maderMLSS ?? null,
    mader_tte: anyC.mader_tte ?? anyC.maderTTE ?? null,
    score_g: anyC.scoreG ?? anyC.score_g ?? null,
    w_prime_implied: anyC.w_prime_vlamax ?? anyC.wPrimeImplied ?? null,
    final_value: anyC.finalValue ?? null,
  };
}

function extractRfm(input: VLamaxBikeV2EnhancedInput): number | null {
  if (!input.ftp || !input.map5min_w) return null;
  return Number((input.ftp / input.map5min_w).toFixed(3));
}

export function buildVLamaxTracePayload(
  input: VLamaxBikeV2EnhancedInput,
  result: VLamaxBikeV2EnhancedResult
): VLamaxTracePayload {
  const anyC = (result.components ?? {}) as any;
  return {
    version: VLAMAX_TRACE_VERSION,
    capturedAt: new Date().toISOString(),
    input,
    result: {
      value: result.value,
      rangeMin: result.rangeMin,
      rangeMax: result.rangeMax,
      confidence: result.confidence,
      confidenceLabel: result.confidenceLabel,
      formula: result.formula,
      formulaLabel: result.formulaLabel,
      pedagogicalMessage: result.pedagogicalMessage,
      warnings: result.warnings,
      sources: result.sources,
      percentile: result.percentile,
      isOutlier: result.isOutlier,
      cluster: result.cluster
        ? { id: result.cluster.clusterId ?? "", label: result.cluster.label ?? "" }
        : null,
    },
    components: result.components,
    hybridTier: anyC.hybridTier ?? null,
    rfm: extractRfm(input),
    scoreG: anyC.scoreG ?? null,
    divergence: anyC.divergence ?? anyC.deltaMax ?? null,
    methods: extractMethodsFromComponents(result.components),
  };
}

export interface PersistVLamaxTraceArgs {
  athleteId: string;
  coachId: string;
  input: VLamaxBikeV2EnhancedInput;
  result: VLamaxBikeV2EnhancedResult;
  notes?: string;
}

export async function persistVLamaxTrace({
  athleteId,
  coachId,
  input,
  result,
  notes,
}: PersistVLamaxTraceArgs): Promise<{ id: string } | null> {
  const payload = buildVLamaxTracePayload(input, result);

  const { data, error } = await supabase
    .from("calibration_evidence")
    .insert({
      athlete_id: athleteId,
      coach_id: coachId,
      date: new Date().toISOString().split("T")[0],
      // Casts: ces littéraux sortent du union strict mais la colonne DB est text libre.
      source_type: "TEST_PROTOCOL" as any,
      evidence_type: VLAMAX_TRACE_EVIDENCE_TYPE as any,
      raw_values: payload as any,
      protocol_quality: 5,
      validity: "OK" as any,
      confidence_evidence: result.confidence,
      used_in_calibration: false,
      calibration_weight: 0,
      notes: notes ?? `Snapshot trace VLamax (${result.value.toFixed(3)} mmol/L/s)`,
    })
    .select("id")
    .single();

  if (error) {
    if (import.meta.env.DEV) console.error("persistVLamaxTrace error", error);
    return null;
  }
  return { id: data.id };
}

export async function loadVLamaxTraces(
  athleteId: string,
  limit = 30
): Promise<Array<{ id: string; date: string; payload: VLamaxTracePayload }>> {
  const { data, error } = await supabase
    .from("calibration_evidence")
    .select("id,date,raw_values,evidence_type")
    .eq("athlete_id", athleteId)
    .eq("evidence_type", VLAMAX_TRACE_EVIDENCE_TYPE)
    .order("date", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data
    .filter((r) => r.raw_values && typeof r.raw_values === "object")
    .map((r) => ({
      id: r.id,
      date: r.date,
      payload: r.raw_values as unknown as VLamaxTracePayload,
    }));
}
