import { qualifyReference, requalifyReference, type ReferenceEvidence, type ScientificQualification } from "@/lib/scientificQualification";
import type { AnchorTestEntry, AnchorTier } from "./vlamaxCapAnchorCalibration";

export const DECLARED_CAP_REFERENCE_LABEL = "VLamax de référence déclarée — provenance scientifique non vérifiée";
export const CAP_COHORT_CSV_VERSION = "tfclab.vlamax-cap-cohort.csv.v2";
export const DECLARED_QUALITY_LABELS: Record<AnchorTier, string> = {
  lab: "Qualité déclarée 4–5", field: "Qualité déclarée 2–3", rejected: "Qualité déclarée < 2 (exclue)",
};
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Optional existing evidence convention; absent historical metadata is never reconstructed. */
export function qualifyCohortReference(row: { athlete_id: string; date: string; raw_values: unknown }): ScientificQualification {
  const rv = record(row.raw_values) ? row.raw_values : {};
  const evidence = record(rv.physiologicalEvidence) ? rv.physiologicalEvidence.vlamax : null;
  const value = Number(rv.vlamaxRunMeasured);
  return qualifyReference(record(evidence) && evidence.date === row.date ? evidence as unknown as ReferenceEvidence : null,
    { subjectId: row.athlete_id, quantity: "vlamax", discipline: "run", unit: "mmol/L/s", value: Number.isFinite(value) ? value : null });
}
function checkedQualification(q: ScientificQualification | undefined, entry: AnchorTestEntry): ScientificQualification {
  const checked = requalifyReference(q, entry.vlamaxRunMeasured, "run", entry.athleteId);
  return checked.observedAt === entry.date ? checked : requalifyReference(null, entry.vlamaxRunMeasured, "run", entry.athleteId);
}
export function cohortReferenceLabel(q: ScientificQualification | undefined, entry: AnchorTestEntry): string {
  const checked = checkedQualification(q, entry);
  return checked.status === "unknown" ? DECLARED_CAP_REFERENCE_LABEL : checked.label;
}
/** Preserve internal report values and grouping; qualify only the displayed interpretation. */
export function cohortStatisticalNote(note: string): string {
  return note.replace("ancrages valides.", "accord descriptif aux références déclarées ; validation indépendante non établie.")
    .replace("réancrage non statuable.", "accord descriptif non statuable.")
    .replace("réancrage Sprint/Puissance recommandé.", "écart descriptif à examiner ; aucune calibration approuvée.")
    .replace("Réduire ancrages Sprint/Puissance d'environ", "Amplitude interne indicative de réduction à examiner indépendamment :")
    .replace("Augmenter ancrages Sprint/Puissance d'environ", "Amplitude interne indicative d'augmentation à examiner indépendamment :");
}

/** V2 export: numeric values and historical internal tiers unchanged, scientific claims explicit. */
export function entriesToCSV(entries: AnchorTestEntry[], qualifications: ReadonlyMap<string, ScientificQualification> = new Map()): string {
  const headers = ["schema_version", "record_date_declared", "athlete_id", "athlete_name", "quality_group_declared",
    "legacy_internal_quality_tier_NOT_scientific_method", "protocol_quality_declared", "vlamax_reference_declared_mmolLs",
    "sprint15s_distance_m", "running_power_max_w", "vma_kmh", "pace_threshold_sec_per_km", "predicted_vlamax", "delta_vlamax",
    "scientific_qualification", "reference_nature", "scientific_method", "scientific_method_kind", "observation_date", "source_ref",
    "primary_measurement_source_ref", "scientific_uncertainty_status", "reported_scientific_uncertainty_json",
    "individual_validity_established", "individual_dose_approved", "notes"];
  const rows = entries.map(e => {
    const q = checkedQualification(qualifications.get(e.id), e);
    return [CAP_COHORT_CSV_VERSION, e.date, e.athleteId, e.athleteName ?? "", DECLARED_QUALITY_LABELS[e.tier], e.tier,
      e.protocolQuality, e.vlamaxRunMeasured, e.sprint15sDistance ?? "", e.runningPowerMax ?? "", e.vma ?? "", e.paceThresholdSecPerKm ?? "",
      e.predictedVLamax ?? "", e.deltaVLamax ?? "", q.status, q.nature, q.method ?? "", q.evidence?.methodKind ?? "", q.observedAt ?? "", q.sourceRef ?? "",
      q.evidence?.primaryMeasurementSourceRef ?? "", q.uncertaintyStatus, q.uncertainty ? JSON.stringify(q.uncertainty) : "", false, false, e.notes ?? ""]
      .map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  return [headers.join(","), ...rows].join("\n");
}
