// =============================================
// Lab Extract to Snapshot Mapper
// =============================================

import { LabExtract, ExtractedField, SnapshotDelta } from "./types";
import { DbSnapshot } from "@/hooks/useCloudData";
import { deriveMetabolicProfile } from "@/types/snapshot";
import { getValueStatus, VALUE_RANGES } from "./normalize";

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
  
  // Add threshold info to notes
  if (extract.thresholds.lt1) {
    const lt1Parts = [];
    if (extract.thresholds.lt1.power_w) lt1Parts.push(`${extract.thresholds.lt1.power_w}W`);
    if (extract.thresholds.lt1.hr) lt1Parts.push(`${extract.thresholds.lt1.hr}bpm`);
    if (extract.thresholds.lt1.lactate) lt1Parts.push(`${extract.thresholds.lt1.lactate}mmol`);
    if (lt1Parts.length > 0) notes.push(`SL1: ${lt1Parts.join(", ")}`);
  }
  if (extract.thresholds.lt2) {
    const lt2Parts = [];
    if (extract.thresholds.lt2.power_w) lt2Parts.push(`${extract.thresholds.lt2.power_w}W`);
    if (extract.thresholds.lt2.hr) lt2Parts.push(`${extract.thresholds.lt2.hr}bpm`);
    if (extract.thresholds.lt2.lactate) lt2Parts.push(`${extract.thresholds.lt2.lactate}mmol`);
    if (lt2Parts.length > 0) notes.push(`SL2: ${lt2Parts.join(", ")}`);
  }
  if (extract.economy.running_cost_ml_kg_km) {
    notes.push(`Économie: ${extract.economy.running_cost_ml_kg_km} ml/kg/km`);
  }
  if (extract.glycemia.notes) {
    notes.push(extract.glycemia.notes);
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
  
  // Helper to add field with automatic range validation
  const addField = (
    key: string, 
    label: string, 
    value: number | string | null,
    rangeKey?: string
  ) => {
    let status: "ok" | "verify" | "not_found" = "not_found";
    if (value != null) {
      if (rangeKey && typeof value === "number") {
        status = getValueStatus(value, rangeKey);
      } else {
        status = "ok";
      }
    }
    
    fields.push({
      key,
      label,
      value,
      pageSource: null,
      status,
      editable: true,
    });
  };
  
  // Meta
  addField("reportDate", "Date du test", extract.meta.reportDate);
  addField("athleteName", "Nom de l'athlète", extract.meta.athleteName);
  
  // Anthropo
  addField("weight_kg", "Poids (kg)", extract.anthropo.weight_kg, "weight_kg");
  addField("height_cm", "Taille (cm)", extract.anthropo.height_cm, "height_cm");
  addField("fat_pct", "Masse grasse (%)", extract.anthropo.fat_pct, "fat_pct");
  
  // Cardio
  addField("hr_max", "FC max (bpm)", extract.cardio.hr_max, "hr_max");
  addField("hr_rest", "FC repos (bpm)", extract.cardio.hr_rest, "hr_rest");
  addField("hrv", "HRV", extract.cardio.hrv, "hrv");
  addField("spo2", "SpO2 (%)", extract.cardio.spo2, "spo2");
  
  // Blood pressure
  if (extract.cardio.bp_sys || extract.cardio.bp_dia) {
    addField("bp", "Tension artérielle", 
      extract.cardio.bp_sys && extract.cardio.bp_dia 
        ? `${extract.cardio.bp_sys}/${extract.cardio.bp_dia}` 
        : null
    );
  }
  
  // Performance
  addField("vo2max_ml_kg_min", "VO2max (ml/kg/min)", extract.performance.vo2max_ml_kg_min, "vo2max_ml_kg_min");
  addField("vo2max_l_min", "VO2max (L/min)", extract.performance.vo2max_l_min, "vo2max_l_min");
  addField("vma_kmh", "VMA (km/h)", extract.performance.vma_kmh, "vma_kmh");
  addField("pma_w", "PMA (W)", extract.performance.pma_w, "pma_w");
  addField("pmax_w", "Pmax (W)", extract.performance.pmax_w, "pmax_w");
  addField("ftp_w", "FTP (W)", extract.performance.ftp_w, "ftp_w");
  
  // Thresholds LT1
  if (extract.thresholds.lt1) {
    const lt1 = extract.thresholds.lt1;
    addField("lt1_power", "SL1 Puissance (W)", lt1.power_w, "stage_watts");
    addField("lt1_hr", "SL1 FC (bpm)", lt1.hr, "stage_bpm");
    addField("lt1_lactate", "SL1 Lactate (mmol)", lt1.lactate, "stage_lactate");
  } else {
    addField("lt1_power", "SL1 Puissance (W)", null);
    addField("lt1_hr", "SL1 FC (bpm)", null);
    addField("lt1_lactate", "SL1 Lactate (mmol)", null);
  }
  
  // Thresholds LT2
  if (extract.thresholds.lt2) {
    const lt2 = extract.thresholds.lt2;
    addField("lt2_power", "SL2 Puissance (W)", lt2.power_w, "stage_watts");
    addField("lt2_hr", "SL2 FC (bpm)", lt2.hr, "stage_bpm");
    addField("lt2_lactate", "SL2 Lactate (mmol)", lt2.lactate, "stage_lactate");
  } else {
    addField("lt2_power", "SL2 Puissance (W)", null);
    addField("lt2_hr", "SL2 FC (bpm)", null);
    addField("lt2_lactate", "SL2 Lactate (mmol)", null);
  }
  
  // VLamax
  addField("vlamax", "VLamax (mmol/L/s)", extract.vlamax.value);
  
  // Lactate
  addField("lactate_max", "Lactate max (mmol/L)", extract.lactate.lactate_max, "lactate_max");
  
  // Glycemia
  addField("glycemia_min", "Glycémie min (mg/dL)", extract.glycemia.min, "glycemia");
  addField("glycemia_max", "Glycémie max (mg/dL)", extract.glycemia.max, "glycemia");
  
  // Economy
  addField("running_economy", "Économie course (ml/kg/km)", extract.economy.running_cost_ml_kg_km);
  
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
