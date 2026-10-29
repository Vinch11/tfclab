import type { ScoreEnvelope } from "@/lib/scoreEnvelope";
/** Scientific claims are independent of storage and of the engine's legacy source category. */
export interface ReferenceEvidence {
  value: number; unit: string; discipline: "run" | "bike" | "swim" | "unknown";
  subjectId?: string | null; quantity?: string | null; sourceRef?: string | null;
  method?: string | null; date?: string | null;
  nature?: "measured" | "calculated" | "estimated" | "declared" | "unknown";
  methodKind?: "blood_lactate_protocol" | "field_protocol" | "physiological_model" | "coach_declaration";
  primaryMeasurementSourceRef?: string | null;
  documentedUncertainty?: { absoluteBound: number; unit: string; basis: string; sourceRef: string } | null;
}
export interface ScientificQualification {
  status: "unknown" | "documented_context";
  value: number | null; evidence: ReferenceEvidence | null;
  nature: NonNullable<ReferenceEvidence["nature"]>;
  label: string;
  subjectId: string | null; quantity: string; discipline: string; unit: string;
  method: string | null; observedAt: string | null; sourceRef: string | null;
  uncertainty: ReferenceEvidence["documentedUncertainty"];
  uncertaintyStatus: "unknown" | "reported_not_independently_verified";
  admissibility: "not_established" | "documented_context_only";
  individualValidityEstablished: false; individualDoseApproved: false;
  reasons: string[];
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const identifiable = (v: unknown): v is string => typeof v === "string" && /^[a-z][a-z0-9+.-]*:\S+$/i.test(v);
const date = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
export function qualifyReference(e: ReferenceEvidence | null | undefined, context: { subjectId: string; quantity: string; discipline: string; value: number | null; unit: string }): ScientificQualification {
  e = record(e) ? e as unknown as ReferenceEvidence : null;
  const reasons: string[] = [];
  if (!e || e.subjectId !== context.subjectId || !context.subjectId || e.quantity !== context.quantity || e.discipline !== context.discipline || !["run", "bike", "swim"].includes(e.discipline) || e.unit !== context.unit || !Number.isFinite(e.value) || e.value !== context.value) reasons.push("missing_or_incompatible_subject_quantity_discipline_unit_value");
  if ((typeof e?.method !== "string" || !e.method.trim()) || !date(e.date) || !identifiable(e.sourceRef)) reasons.push("missing_method_observation_date_or_identifiable_source");
  const nature = e?.nature;
  const kind = e?.methodKind;
  if (context.quantity === "vlamax" && nature === "measured") reasons.push("blood_lactate_measurement_is_not_direct_glycolytic_flux_measurement");
  if (kind === "blood_lactate_protocol") {
    if (!identifiable(e?.primaryMeasurementSourceRef) || !["calculated", "estimated"].includes(nature)) reasons.push("missing_primary_lactate_source_or_derived_nature");
  } else if (kind === "field_protocol") {
    if (nature !== "estimated") reasons.push("field_estimate_required");
  } else if (kind === "physiological_model") {
    if (!["calculated", "estimated"].includes(nature)) reasons.push("model_inference_required");
  } else if (kind === "coach_declaration") {
    if (nature !== "declared") reasons.push("coach_declaration_required");
  } else reasons.push("method_kind_not_documented");
  const known = reasons.length === 0;
  const uncertainty = e?.documentedUncertainty;
  const reported = known && uncertainty && Number.isFinite(uncertainty.absoluteBound) && uncertainty.absoluteBound >= 0 && uncertainty.unit === context.unit && typeof uncertainty.basis === "string" && !!uncertainty.basis.trim() && identifiable(uncertainty.sourceRef);
  const labels = { blood_lactate_protocol: "VLamax dérivée de mesures de lactate sanguin déclarées — protocole documenté, source non vérifiée indépendamment", field_protocol: "VLamax estimée — protocole terrain documenté", physiological_model: "VLamax calculée — inférence de modèle documentée", coach_declaration: "VLamax déclarée par le coach — origine déclarative" };
  const retainedEvidence = known ? Object.fromEntries(["value", "unit", "discipline", "subjectId", "quantity", "sourceRef", "method", "date", "nature", "methodKind", "primaryMeasurementSourceRef", "documentedUncertainty"].filter(key => e[key] !== undefined).map(key => [key, e[key]])) as unknown as ReferenceEvidence : null;
  return { value: context.value, evidence: retainedEvidence, status: known ? "documented_context" : "unknown", nature: known ? nature : "unknown",
    label: known ? labels[kind] : "VLamax — provenance scientifique inconnue (référence consultable)",
    subjectId: known ? e.subjectId : null, quantity: context.quantity, discipline: context.discipline, unit: context.unit,
    method: known ? e.method : null, observedAt: known ? e.date : null, sourceRef: known ? e.sourceRef : null,
    uncertainty: reported ? uncertainty : null, uncertaintyStatus: reported ? "reported_not_independently_verified" : "unknown",
    admissibility: known ? "documented_context_only" : "not_established", individualValidityEstablished: false, individualDoseApproved: false, reasons };
}
export const UNKNOWN_VLAMAX_LABEL = "VLamax — provenance scientifique inconnue (référence consultable)";
export const VLA_HEURISTIC_NOTICE = "Score et marge heuristiques internes ; ni probabilité de validité individuelle ni précision expérimentale démontrée.";

/** Stored/cached display labels and admissibility flags are never authoritative. */
export function requalifyReference(q: ScientificQualification | null | undefined, value: number | null, discipline = "unknown", subjectId?: string | null): ScientificQualification {
  return qualifyReference(record(q) ? q.evidence as ReferenceEvidence : null, { subjectId: typeof subjectId === "string" ? subjectId : "", quantity: "vlamax", discipline, unit: "mmol/L/s", value });
}
export function scientificReferenceLabel(q: ScientificQualification | null | undefined, value: number | null, discipline?: string, subjectId?: string | null): string {
  return requalifyReference(q, value, discipline, subjectId).label;
}

export function scientificUncertaintyLabel(q: ScientificQualification | null | undefined, value: number | null, discipline?: string, subjectId?: string | null): string {
  const checked = requalifyReference(q, value, discipline, subjectId);
  return checked.uncertainty ? `Incertitude rapportée : ± ${checked.uncertainty.absoluteBound} ${checked.uncertainty.unit} ; ${checked.uncertainty.basis} ; source ${checked.uncertainty.sourceRef} (non vérifiée indépendamment)` : "Incertitude scientifique inconnue";
}

/** Mapping method and nature are distinct; an estimated model is not a field test. */
export function qualifiedScientificOrigin(q: ScientificQualification): "field_estimate" | "model_inference" | "coach_declared" | "unknown" {
  if (q.status !== "documented_context") return "unknown";
  switch (q.evidence?.methodKind) {
    case "field_protocol": return "field_estimate";
    case "physiological_model": case "blood_lactate_protocol": return "model_inference";
    case "coach_declaration": return "coach_declared";
    default: return "unknown";
  }
}
export function hasDocumentedLactateReference(e: ReferenceEvidence | null | undefined, subjectId: string | null | undefined, discipline: string, value: number | null): boolean {
  const q = qualifyReference(e, { subjectId: subjectId ?? "", quantity: "vlamax", discipline, value, unit: "mmol/L/s" });
  return q.status === "documented_context" && q.evidence?.methodKind === "blood_lactate_protocol";
}

/** Validate JSON shapes at the presentation boundary without changing the stored object. */
export function qualifyScoreEnvelope(input: unknown, subjectId?: string | null, discipline = "unknown"): ScoreEnvelope {
  const e = record(input) ? input : {};
  const strings = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const sources = ["MEASURED", "ESTIMATED", "MODELLED", "DERIVED", "UNKNOWN"] as const;
  const labels = ["FAIBLE", "MODÉRÉE", "ÉLEVÉE"] as const;
  const envelope: ScoreEnvelope = {
    metricId: typeof e.metricId === "string" ? e.metricId : "unknown",
    label: typeof e.label === "string" ? e.label : "Donnée — provenance inconnue",
    value: finite(e.value) ? e.value : null,
    range: record(e.range) && finite(e.range.low) && finite(e.range.high) && e.range.low <= e.range.high ? { low: e.range.low, high: e.range.high } : null,
    unit: typeof e.unit === "string" ? e.unit : undefined,
    source: sources.includes(e.source as ScoreEnvelope["source"]) ? e.source as ScoreEnvelope["source"] : "UNKNOWN",
    confidence: finite(e.confidence) && e.confidence >= 0 && e.confidence <= 1 ? e.confidence : 0,
    confidenceLabel: labels.includes(e.confidenceLabel as ScoreEnvelope["confidenceLabel"]) ? e.confidenceLabel as ScoreEnvelope["confidenceLabel"] : "FAIBLE",
    uncertaintyNote: typeof e.uncertaintyNote === "string" ? e.uncertaintyNote : "Incertitude inconnue",
    contextNote: typeof e.contextNote === "string" ? e.contextNote : "",
    why: strings(e.why), recommendations: strings(e.recommendations),
  };
  if (typeof e.metricId !== "string" || !e.metricId.trim()) return { ...envelope, label: "Donnée — provenance inconnue", source: "UNKNOWN" };
  if (envelope.metricId !== "vlamax") return envelope;
  const q = requalifyReference(envelope.unit === "mmol/L/s" ? e.scientificQualification as ScientificQualification : null, envelope.value, discipline, subjectId);
  return { ...envelope, scientificQualification: q, label: q.label,
    source: q.status !== "documented_context" || q.nature === "declared" ? "UNKNOWN" : q.evidence?.methodKind === "physiological_model" ? "MODELLED" : q.nature === "estimated" ? "ESTIMATED" : "DERIVED",
    uncertaintyNote: `${VLA_HEURISTIC_NOTICE} ${scientificUncertaintyLabel(q, envelope.value, discipline, subjectId)}`,
    why: envelope.why.map(text => text.startsWith("[Note interne/historique") ? text : `[Note interne/historique, pas une preuve de mesure] ${text}`),
  };
}
