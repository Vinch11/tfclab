// =============================================
// Lab Extract to Snapshot Mapper
// =============================================

import { LabExtract, ExtractedField, SnapshotDelta } from "./types";
import { DbSnapshot } from "@/hooks/useCloudData";
import { deriveMetabolicProfile } from "@/types/snapshot";

/**
 * Map LabExtract to DbSnapshot fields
 */
export function mapExtractToSnapshot(
  extract: LabExtract,
  athleteGoal: string
): Partial<DbSnapshot> {
  // Determine sport_main
  let sportMain: string = "bike";
  if (extract.performance.sport === "run" || extract.performance.vma_kmh) {
    sportMain = "run";
  } else if (extract.performance.sport === "tri") {
    sportMain = "tri";
  } else if (extract.performance.ftp_w || extract.performance.pmax_w) {
    sportMain = "bike";
  }
  
  // Build notes
  const notes: string[] = [
    "Import labo (PDF)",
    ...extract.notes,
  ];
  
  if (extract.thresholds.lt1?.speed_kmh) {
    notes.push(`SL1: ${extract.thresholds.lt1.speed_kmh} km/h`);
  }
  if (extract.thresholds.lt2?.speed_kmh) {
    notes.push(`SL2: ${extract.thresholds.lt2.speed_kmh} km/h`);
  }
  if (extract.thresholds.obla?.speed_kmh) {
    notes.push(`OBLA: ${extract.thresholds.obla.speed_kmh} km/h`);
  }
  if (extract.economy.running_cost_ml_kg_km) {
    notes.push(`Économie: ${extract.economy.running_cost_ml_kg_km} ml/kg/km`);
  }
  
  // Calculate metabolic profile if we have VO2max and VLamax
  const { profile, score } = deriveMetabolicProfile(
    extract.vlamax.value,
    extract.performance.vo2max_ml_kg_min
  );
  
  // Convert confidence from 0-1 to 0-100 scale for schema validation
  const confidencePercent = extract.meta.sourceConfidence != null 
    ? Math.round(extract.meta.sourceConfidence * 100) 
    : null;
  
  const snapshot: Partial<DbSnapshot> = {
    date: extract.meta.reportDate || new Date().toISOString().slice(0, 10),
    source: "lab_import",
    
    // Performance - ensure integers where needed
    vo2max: extract.performance.vo2max_ml_kg_min,
    vma: extract.performance.vma_kmh,
    ftp: extract.performance.ftp_w != null ? Math.round(extract.performance.ftp_w) : null,
    pmax_5s: extract.performance.pmax_w != null ? Math.round(extract.performance.pmax_w) : null,
    
    // Anthropo
    weight_kg: extract.anthropo.weight_kg,
    fat_pct: extract.anthropo.fat_pct,
    
    // Cardio - ensure integer
    fc_max: extract.cardio.hr_max != null ? Math.round(extract.cardio.hr_max) : null,
    
    // VLamax (only if explicitly in report)
    vlamax: extract.vlamax.value,
    
    // Metabolic
    metabolic_profile: profile,
    metabolic_score: score != null ? Math.round(score) : null,
    
    // Confidence as percentage (0-100)
    confidence: confidencePercent,
    
    // Notes
    coach_notes: notes.join(" | "),
  };
  
  return snapshot;
}

/**
 * Convert LabExtract to array of editable fields for validation UI
 */
export function extractToValidationFields(extract: LabExtract): ExtractedField[] {
  const fields: ExtractedField[] = [];
  
  // Meta
  fields.push({
    key: "reportDate",
    label: "Date du test",
    value: extract.meta.reportDate,
    pageSource: null,
    status: extract.meta.reportDate ? "ok" : "not_found",
    editable: true,
  });
  
  fields.push({
    key: "athleteName",
    label: "Nom de l'athlète",
    value: extract.meta.athleteName,
    pageSource: null,
    status: extract.meta.athleteName ? "ok" : "not_found",
    editable: true,
  });
  
  // Anthropo
  fields.push({
    key: "weight_kg",
    label: "Poids (kg)",
    value: extract.anthropo.weight_kg,
    pageSource: null,
    status: extract.anthropo.weight_kg ? "ok" : "not_found",
    editable: true,
  });
  
  fields.push({
    key: "height_cm",
    label: "Taille (cm)",
    value: extract.anthropo.height_cm,
    pageSource: null,
    status: extract.anthropo.height_cm ? "ok" : "not_found",
    editable: true,
  });
  
  fields.push({
    key: "fat_pct",
    label: "Masse grasse (%)",
    value: extract.anthropo.fat_pct,
    pageSource: null,
    status: extract.anthropo.fat_pct ? "ok" : "not_found",
    editable: true,
  });
  
  // Cardio
  fields.push({
    key: "hr_max",
    label: "FC max (bpm)",
    value: extract.cardio.hr_max,
    pageSource: null,
    status: extract.cardio.hr_max ? "ok" : "not_found",
    editable: true,
  });
  
  fields.push({
    key: "hr_rest",
    label: "FC repos (bpm)",
    value: extract.cardio.hr_rest,
    pageSource: null,
    status: extract.cardio.hr_rest ? "ok" : "not_found",
    editable: true,
  });
  
  fields.push({
    key: "hrv",
    label: "HRV",
    value: extract.cardio.hrv,
    pageSource: null,
    status: extract.cardio.hrv ? "ok" : "not_found",
    editable: true,
  });
  
  fields.push({
    key: "spo2",
    label: "SpO2 (%)",
    value: extract.cardio.spo2,
    pageSource: null,
    status: extract.cardio.spo2 ? "ok" : "not_found",
    editable: true,
  });
  
  // Performance
  fields.push({
    key: "vo2max_ml_kg_min",
    label: "VO2max (ml/kg/min)",
    value: extract.performance.vo2max_ml_kg_min,
    pageSource: null,
    status: extract.performance.vo2max_ml_kg_min ? "ok" : "not_found",
    editable: true,
  });
  
  fields.push({
    key: "vma_kmh",
    label: "VMA (km/h)",
    value: extract.performance.vma_kmh,
    pageSource: null,
    status: extract.performance.vma_kmh ? "ok" : "not_found",
    editable: true,
  });
  
  fields.push({
    key: "ftp_w",
    label: "FTP (W)",
    value: extract.performance.ftp_w,
    pageSource: null,
    status: extract.performance.ftp_w ? "ok" : "not_found",
    editable: true,
  });
  
  fields.push({
    key: "pmax_w",
    label: "Pmax (W)",
    value: extract.performance.pmax_w,
    pageSource: null,
    status: extract.performance.pmax_w ? "ok" : "not_found",
    editable: true,
  });
  
  // VLamax
  fields.push({
    key: "vlamax",
    label: "VLamax (mmol/L/s)",
    value: extract.vlamax.value,
    pageSource: null,
    status: extract.vlamax.value ? "ok" : "not_found",
    editable: true,
  });
  
  // Lactate
  fields.push({
    key: "lactate_max",
    label: "Lactate max (mmol/L)",
    value: extract.lactate.lactate_max,
    pageSource: null,
    status: extract.lactate.lactate_max ? "ok" : "not_found",
    editable: true,
  });
  
  // Economy
  fields.push({
    key: "running_economy",
    label: "Économie course (ml/kg/km)",
    value: extract.economy.running_cost_ml_kg_km,
    pageSource: null,
    status: extract.economy.running_cost_ml_kg_km ? "ok" : "not_found",
    editable: true,
  });
  
  // Mark fields as "verify" if OCR was used
  if (extract.raw.usedOcr) {
    for (const field of fields) {
      if (field.status === "ok") {
        field.status = "verify";
      }
    }
  }
  
  return fields;
}

/**
 * Apply edited fields back to extract
 */
export function applyFieldEdits(
  extract: LabExtract,
  editedFields: Record<string, string | number | null>
): LabExtract {
  const updated = { ...extract };
  
  if (editedFields.reportDate !== undefined) {
    updated.meta.reportDate = editedFields.reportDate as string;
  }
  if (editedFields.athleteName !== undefined) {
    updated.meta.athleteName = editedFields.athleteName as string;
  }
  if (editedFields.weight_kg !== undefined) {
    updated.anthropo.weight_kg = editedFields.weight_kg as number;
  }
  if (editedFields.height_cm !== undefined) {
    updated.anthropo.height_cm = editedFields.height_cm as number;
  }
  if (editedFields.fat_pct !== undefined) {
    updated.anthropo.fat_pct = editedFields.fat_pct as number;
  }
  if (editedFields.hr_max !== undefined) {
    updated.cardio.hr_max = editedFields.hr_max as number;
  }
  if (editedFields.hr_rest !== undefined) {
    updated.cardio.hr_rest = editedFields.hr_rest as number;
  }
  if (editedFields.hrv !== undefined) {
    updated.cardio.hrv = editedFields.hrv as number;
  }
  if (editedFields.spo2 !== undefined) {
    updated.cardio.spo2 = editedFields.spo2 as number;
  }
  if (editedFields.vo2max_ml_kg_min !== undefined) {
    updated.performance.vo2max_ml_kg_min = editedFields.vo2max_ml_kg_min as number;
  }
  if (editedFields.vma_kmh !== undefined) {
    updated.performance.vma_kmh = editedFields.vma_kmh as number;
  }
  if (editedFields.ftp_w !== undefined) {
    updated.performance.ftp_w = editedFields.ftp_w as number;
  }
  if (editedFields.pmax_w !== undefined) {
    updated.performance.pmax_w = editedFields.pmax_w as number;
  }
  if (editedFields.vlamax !== undefined) {
    updated.vlamax.value = editedFields.vlamax as number;
    if (editedFields.vlamax) {
      updated.vlamax.source = "lab";
    }
  }
  if (editedFields.lactate_max !== undefined) {
    updated.lactate.lactate_max = editedFields.lactate_max as number;
  }
  if (editedFields.running_economy !== undefined) {
    updated.economy.running_cost_ml_kg_km = editedFields.running_economy as number;
  }
  
  return updated;
}

/**
 * Compare imported snapshot with previous snapshot
 */
export function compareWithPrevious(
  imported: Partial<DbSnapshot>,
  previous: DbSnapshot | null
): SnapshotDelta[] {
  if (!previous) return [];
  
  const deltas: SnapshotDelta[] = [];
  
  const comparisons: { field: keyof DbSnapshot; label: string }[] = [
    { field: "weight_kg", label: "Poids (kg)" },
    { field: "vo2max", label: "VO2max" },
    { field: "vma", label: "VMA (km/h)" },
    { field: "ftp", label: "FTP (W)" },
    { field: "fc_max", label: "FC max" },
    { field: "fat_pct", label: "Masse grasse (%)" },
    { field: "pmax_5s", label: "Pmax (W)" },
    { field: "vlamax", label: "VLamax" },
  ];
  
  for (const { field, label } of comparisons) {
    const prevVal = previous[field] as number | null | undefined;
    const impVal = imported[field] as number | null | undefined;
    
    if (impVal != null || prevVal != null) {
      let delta = "—";
      if (prevVal != null && impVal != null) {
        const diff = impVal - prevVal;
        const sign = diff >= 0 ? "+" : "";
        delta = `${sign}${diff.toFixed(1)}`;
      } else if (impVal != null && prevVal == null) {
        delta = "Nouveau";
      }
      
      deltas.push({
        field,
        label,
        previous: prevVal ?? null,
        imported: impVal ?? null,
        delta,
      });
    }
  }
  
  return deltas;
}
