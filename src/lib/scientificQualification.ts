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
const identifiable = (v: unknown): v is string => typeof v === "string" && /^[a-z][a-z0-9+.-]*:\S+$/i.test(v);
const date = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
export function qualifyReference(e: ReferenceEvidence | null | undefined, context: { subjectId: string; quantity: string; discipline: string; value: number | null; unit: string }): ScientificQualification {
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
export function requalifyReference(q: ScientificQualification | null | undefined, value: number | null, discipline = q?.discipline ?? "unknown"): ScientificQualification {
  return qualifyReference(q?.evidence, { subjectId: q?.subjectId ?? "", quantity: "vlamax", discipline, unit: "mmol/L/s", value });
}
export function scientificReferenceLabel(q: ScientificQualification | null | undefined, value: number | null, discipline?: string): string {
  return requalifyReference(q, value, discipline).label;
}

export function scientificUncertaintyLabel(q: ScientificQualification | null | undefined, value: number | null, discipline?: string): string {
  const checked = requalifyReference(q, value, discipline);
  return checked.uncertainty ? `Incertitude rapportée : ± ${checked.uncertainty.absoluteBound} ${checked.uncertainty.unit} ; ${checked.uncertainty.basis} ; source ${checked.uncertainty.sourceRef} (non vérifiée indépendamment)` : "Incertitude scientifique inconnue";
}

/** Presentation overlay only: the historical payload is neither mutated nor migrated. */
export function qualifyScoreEnvelope(envelope: ScoreEnvelope): ScoreEnvelope {
  if (envelope.metricId !== "vlamax") return envelope;
  const q = requalifyReference(envelope.scientificQualification, envelope.value);
  return { ...envelope, scientificQualification: q, label: q.label,
    source: q.status !== "documented_context" || q.nature === "declared" ? "UNKNOWN" : q.nature === "estimated" ? "ESTIMATED" : q.evidence?.methodKind === "physiological_model" ? "MODELLED" : "DERIVED",
    uncertaintyNote: `${VLA_HEURISTIC_NOTICE} ${scientificUncertaintyLabel(q, envelope.value)}`,
    why: envelope.why.map(text => text.startsWith("[Note interne/historique") ? text : `[Note interne/historique, pas une preuve de mesure] ${text}`),
  };
}
