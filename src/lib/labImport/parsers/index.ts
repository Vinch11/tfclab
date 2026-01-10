// =============================================
// Lab Import Parsers - Main entry point
// =============================================

import { LabExtract, createEmptyLabExtract, ParserResult } from "../types";
import { isQuentinReport, parseQuentinReport } from "./quentinParser";
import { isMikaReport, parseMikaReport } from "./mikaParser";

export type ReportType = "auto" | "quentin" | "mika";

/**
 * Auto-detect report type from text content
 */
export function autoDetectParser(textByPage: string[]): "quentin" | "mika" | "unknown" {
  // Check Quentin first (more specific markers)
  if (isQuentinReport(textByPage)) {
    return "quentin";
  }
  
  // Then check Mika
  if (isMikaReport(textByPage)) {
    return "mika";
  }
  
  return "unknown";
}

/**
 * Parse text based on detected or specified report type
 */
export function parseLabReport(
  textByPage: string[],
  reportType: ReportType = "auto",
  usedOcr: boolean = false
): ParserResult {
  try {
    let detectedType: "quentin" | "mika" | "unknown";
    
    if (reportType === "auto") {
      detectedType = autoDetectParser(textByPage);
    } else {
      detectedType = reportType;
    }
    
    let extract: LabExtract;
    let parserUsed: "quentin" | "mika" | "generic" | "ocr";
    
    switch (detectedType) {
      case "quentin":
        extract = parseQuentinReport(textByPage);
        parserUsed = usedOcr ? "ocr" : "quentin";
        break;
      case "mika":
        extract = parseMikaReport(textByPage);
        parserUsed = usedOcr ? "ocr" : "mika";
        break;
      default:
        // Use generic parsing (try both parsers and merge)
        extract = parseGenericReport(textByPage);
        parserUsed = usedOcr ? "ocr" : "generic";
    }
    
    // Mark if OCR was used
    extract.raw.usedOcr = usedOcr;
    
    // Reduce confidence if OCR was used
    if (usedOcr) {
      extract.meta.sourceConfidence *= 0.7; // 30% confidence penalty for OCR
    }
    
    return {
      success: true,
      extract,
      error: null,
      parserUsed,
    };
  } catch (error) {
    return {
      success: false,
      extract: null,
      error: error instanceof Error ? error.message : "Erreur d'analyse inconnue",
      parserUsed: null,
    };
  }
}

/**
 * Generic parser that tries to extract common fields
 */
function parseGenericReport(textByPage: string[]): LabExtract {
  const extract = createEmptyLabExtract();
  extract.meta.reportType = "unknown";
  extract.raw.textPages = textByPage;
  
  const fullText = textByPage.join("\n");
  
  // Try Quentin parser first for all fields
  const quentinExtract = parseQuentinReport(textByPage);
  
  // Then try Mika parser
  const mikaExtract = parseMikaReport(textByPage);
  
  // Merge results, preferring non-null values
  extract.meta.reportDate = quentinExtract.meta.reportDate || mikaExtract.meta.reportDate;
  extract.meta.athleteName = quentinExtract.meta.athleteName || mikaExtract.meta.athleteName;
  
  // Anthropo
  extract.anthropo.weight_kg = quentinExtract.anthropo.weight_kg || mikaExtract.anthropo.weight_kg;
  extract.anthropo.height_cm = quentinExtract.anthropo.height_cm || mikaExtract.anthropo.height_cm;
  extract.anthropo.fat_pct = quentinExtract.anthropo.fat_pct || mikaExtract.anthropo.fat_pct;
  extract.anthropo.bmi = quentinExtract.anthropo.bmi || mikaExtract.anthropo.bmi;
  
  // Cardio
  extract.cardio.hr_max = quentinExtract.cardio.hr_max || mikaExtract.cardio.hr_max;
  extract.cardio.hr_rest = quentinExtract.cardio.hr_rest || mikaExtract.cardio.hr_rest;
  extract.cardio.hrv = quentinExtract.cardio.hrv || mikaExtract.cardio.hrv;
  extract.cardio.spo2 = quentinExtract.cardio.spo2 || mikaExtract.cardio.spo2;
  extract.cardio.bp_sys = quentinExtract.cardio.bp_sys || mikaExtract.cardio.bp_sys;
  extract.cardio.bp_dia = quentinExtract.cardio.bp_dia || mikaExtract.cardio.bp_dia;
  
  // Performance
  extract.performance.sport = 
    quentinExtract.performance.sport !== "unknown" ? quentinExtract.performance.sport :
    mikaExtract.performance.sport !== "unknown" ? mikaExtract.performance.sport : "unknown";
  
  extract.performance.vo2max_ml_kg_min = quentinExtract.performance.vo2max_ml_kg_min || mikaExtract.performance.vo2max_ml_kg_min;
  extract.performance.vo2max_l_min = quentinExtract.performance.vo2max_l_min || mikaExtract.performance.vo2max_l_min;
  extract.performance.vma_kmh = quentinExtract.performance.vma_kmh || mikaExtract.performance.vma_kmh;
  extract.performance.vma_pace_sec_km = quentinExtract.performance.vma_pace_sec_km || mikaExtract.performance.vma_pace_sec_km;
  extract.performance.ftp_w = quentinExtract.performance.ftp_w || mikaExtract.performance.ftp_w;
  extract.performance.pmax_w = quentinExtract.performance.pmax_w || mikaExtract.performance.pmax_w;
  extract.performance.pma_w = quentinExtract.performance.pma_w || mikaExtract.performance.pma_w;
  
  // Thresholds
  extract.thresholds.lt1 = quentinExtract.thresholds.lt1 || mikaExtract.thresholds.lt1;
  extract.thresholds.lt2 = quentinExtract.thresholds.lt2 || mikaExtract.thresholds.lt2;
  extract.thresholds.obla = quentinExtract.thresholds.obla || mikaExtract.thresholds.obla;
  
  // VLamax
  extract.vlamax = quentinExtract.vlamax.value ? quentinExtract.vlamax : mikaExtract.vlamax;
  
  // Lactate
  extract.lactate.lactate_max = quentinExtract.lactate.lactate_max || mikaExtract.lactate.lactate_max;
  
  // Glycemia
  extract.glycemia = quentinExtract.glycemia.min ? quentinExtract.glycemia : mikaExtract.glycemia;
  
  // Economy
  extract.economy.running_cost_ml_kg_km = quentinExtract.economy.running_cost_ml_kg_km || mikaExtract.economy.running_cost_ml_kg_km;
  
  // Notes
  extract.notes.push("Format non reconnu - extraction générique");
  
  // Average confidence
  extract.meta.sourceConfidence = 
    Math.max(quentinExtract.meta.sourceConfidence, mikaExtract.meta.sourceConfidence) * 0.8;
  
  extract.meta.discipline = extract.performance.sport !== "unknown" ? extract.performance.sport : null;
  
  return extract;
}

export { isQuentinReport, parseQuentinReport } from "./quentinParser";
export { isMikaReport, parseMikaReport } from "./mikaParser";
