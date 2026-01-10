// =============================================
// Lab Import Parsers - Main entry point
// Now supports layout-aware parsing for better table extraction
// =============================================

import { LabExtract, createEmptyLabExtract, ParserResult } from "../types";
import { isQuentinReport, parseQuentinReport } from "./quentinParser";
import { isMikaReport, parseMikaReport } from "./mikaParser";
import { parseQuentinLayout } from "./quentinLayoutParser";
import { LayoutExtractionResult } from "../pdfLayoutExtractor";

export type ReportType = "auto" | "quentin" | "mika";

/**
 * Auto-detect report type from text content
 */
export function autoDetectParser(textByPage: string[]): "quentin" | "mika" | "unknown" {
  if (isQuentinReport(textByPage)) return "quentin";
  if (isMikaReport(textByPage)) return "mika";
  return "unknown";
}

/**
 * Parse using layout-aware extraction (preferred for Quentin)
 */
export function parseWithLayout(
  layout: LayoutExtractionResult,
  reportType: ReportType = "auto",
  usedOcr: boolean = false
): ParserResult {
  try {
    const textByPage = layout.linesByPage.map(lines => lines.map(l => l.text).join("\n"));
    let detectedType = reportType === "auto" ? autoDetectParser(textByPage) : reportType;
    
    let extract: LabExtract;
    let parserUsed: "quentin" | "mika" | "generic" | "ocr";
    
    if (detectedType === "quentin") {
      // Use layout parser for Quentin (better table handling)
      extract = parseQuentinLayout(layout);
      parserUsed = usedOcr ? "ocr" : "quentin";
    } else if (detectedType === "mika") {
      extract = parseMikaReport(textByPage);
      parserUsed = usedOcr ? "ocr" : "mika";
    } else {
      extract = parseGenericReport(textByPage);
      parserUsed = usedOcr ? "ocr" : "generic";
    }
    
    extract.raw.usedOcr = usedOcr;
    if (usedOcr) extract.meta.sourceConfidence *= 0.7;
    
    return { success: true, extract, error: null, parserUsed };
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
 * Parse text based on detected or specified report type (legacy)
 */
export function parseLabReport(
  textByPage: string[],
  reportType: ReportType = "auto",
  usedOcr: boolean = false
): ParserResult {
  try {
    let detectedType = reportType === "auto" ? autoDetectParser(textByPage) : reportType;
    
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
        extract = parseGenericReport(textByPage);
        parserUsed = usedOcr ? "ocr" : "generic";
    }
    
    extract.raw.usedOcr = usedOcr;
    if (usedOcr) extract.meta.sourceConfidence *= 0.7;
    
    return { success: true, extract, error: null, parserUsed };
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
  
  const quentinExtract = parseQuentinReport(textByPage);
  const mikaExtract = parseMikaReport(textByPage);
  
  // Merge results, preferring non-null values
  extract.meta.reportDate = quentinExtract.meta.reportDate || mikaExtract.meta.reportDate;
  extract.meta.athleteName = quentinExtract.meta.athleteName || mikaExtract.meta.athleteName;
  extract.anthropo = { ...extract.anthropo, ...pickNonNull(quentinExtract.anthropo, mikaExtract.anthropo) };
  extract.cardio = { ...extract.cardio, ...pickNonNull(quentinExtract.cardio, mikaExtract.cardio) };
  extract.performance = { ...extract.performance, ...pickNonNull(quentinExtract.performance, mikaExtract.performance) };
  extract.thresholds = { ...extract.thresholds, ...pickNonNull(quentinExtract.thresholds, mikaExtract.thresholds) };
  extract.vlamax = quentinExtract.vlamax.value ? quentinExtract.vlamax : mikaExtract.vlamax;
  extract.lactate = pickNonNull(quentinExtract.lactate, mikaExtract.lactate);
  extract.glycemia = quentinExtract.glycemia.min ? quentinExtract.glycemia : mikaExtract.glycemia;
  extract.economy = pickNonNull(quentinExtract.economy, mikaExtract.economy);
  extract.notes.push("Format non reconnu - extraction générique");
  extract.meta.sourceConfidence = Math.max(quentinExtract.meta.sourceConfidence, mikaExtract.meta.sourceConfidence) * 0.8;
  extract.meta.discipline = extract.performance.sport !== "unknown" ? extract.performance.sport : null;
  
  return extract;
}

function pickNonNull<T extends Record<string, unknown>>(a: T, b: T): T {
  const result = { ...a };
  for (const key of Object.keys(b) as (keyof T)[]) {
    if (result[key] === null || result[key] === undefined) {
      result[key] = b[key];
    }
  }
  return result;
}

export { isQuentinReport, parseQuentinReport } from "./quentinParser";
export { isMikaReport, parseMikaReport } from "./mikaParser";
export { parseQuentinLayout } from "./quentinLayoutParser";
