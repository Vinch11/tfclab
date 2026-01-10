// =============================================
// Layout-Based Parser for Quentin / SOC Brussels reports
// Uses x,y coordinates instead of fragile regex on linear text
// =============================================

import { LabExtract, createEmptyLabExtract, ExtractedValue, createExtractedValue } from "../types";
import { 
  LayoutExtractionResult, 
  ReconstructedLine, 
  DetectedTable,
  findLineWithPattern,
  findLinesWithPattern,
  extractValueNearAnchor,
} from "../pdfLayoutExtractor";
import { 
  normalizeNumber, 
  parseBloodPressure,
  isInRange,
  logDebug,
  VALUE_RANGES,
} from "../normalize";
import { extractDate } from "./parserUtils";

// =============================================
// Constants
// =============================================

const CONFIDENCE_THRESHOLD = 0.7; // Below this, mark as "verify"

// =============================================
// Main Parser
// =============================================

/**
 * Parse Quentin/SOC report using layout-aware extraction
 */
export function parseQuentinLayout(layout: LayoutExtractionResult): LabExtract {
  const extract = createEmptyLabExtract();
  extract.meta.reportType = "quentin";
  extract.raw.textPages = layout.linesByPage.map(
    lines => lines.map(l => l.text).join("\n")
  );
  extract.raw.usedOcr = false;
  
  const allLines = layout.linesByPage.flat();
  const fullText = layout.fullText;
  
  // Initialize field confidence tracking
  extract.fieldConfidence = {};
  
  // --- META ---
  extract.meta.reportDate = extractDate(fullText);
  
  const nameResult = extractWithAnchor(allLines, /(?:Nom|Athlète)/i, /([A-Za-zÀ-ÿ\s\-]{3,30})/);
  if (nameResult.value) {
    extract.meta.athleteName = nameResult.value as string;
  }
  
  // --- ANTHROPO ---
  const weightResult = extractNumericField(allLines, /Poids/i, /(\d{2,3}(?:[,.]\d{1,2})?)\s*(?:kg)?/, "weight_kg");
  if (weightResult.value !== null) {
    extract.anthropo.weight_kg = weightResult.value;
    extract.fieldConfidence.weight_kg = weightResult;
  }
  
  const heightResult = extractNumericField(allLines, /Taille/i, /(\d{3})\s*(?:cm)?/, "height_cm");
  if (heightResult.value !== null) {
    extract.anthropo.height_cm = heightResult.value;
    extract.fieldConfidence.height_cm = heightResult;
  }
  
  const fatResult = extractNumericField(allLines, /(?:masse grasse|MG|Fat)/i, /(\d{1,2}(?:[,.]\d{1,2})?)\s*%?/, "fat_pct");
  if (fatResult.value !== null) {
    extract.anthropo.fat_pct = fatResult.value;
    extract.fieldConfidence.fat_pct = fatResult;
  }
  
  // --- CARDIO ---
  // Priority: Look for "Résumé" or summary section first
  const summaryLines = findSummarySection(allLines);
  const priorityLines = summaryLines.length > 0 ? summaryLines : allLines;
  
  // FC max
  const hrMaxResult = extractNumericField(priorityLines, /FC\s*max|FCmax|HR\s*max/i, /(\d{2,3})/, "hr_max");
  if (hrMaxResult.value !== null) {
    extract.cardio.hr_max = hrMaxResult.value;
    extract.fieldConfidence.hr_max = hrMaxResult;
  }
  
  // FC repos
  const hrRestResult = extractNumericField(allLines, /FC\s*repos|FCR|HR\s*repos/i, /(\d{2,3})/, "hr_rest");
  if (hrRestResult.value !== null) {
    extract.cardio.hr_rest = hrRestResult.value;
    extract.fieldConfidence.hr_rest = hrRestResult;
  }
  
  // HRV
  const hrvResult = extractNumericField(allLines, /\bHRV\b|Variabilité/i, /(\d{2,3})/, "hrv");
  if (hrvResult.value !== null) {
    extract.cardio.hrv = hrvResult.value;
    extract.fieldConfidence.hrv = hrvResult;
  }
  
  // SpO2
  const spo2Result = extractNumericField(allLines, /SpO2|Saturation/i, /(\d{2,3})\s*%?/, "spo2");
  if (spo2Result.value !== null) {
    extract.cardio.spo2 = spo2Result.value;
    extract.fieldConfidence.spo2 = spo2Result;
  }
  
  // Blood pressure
  const bpResult = extractBloodPressure(allLines);
  if (bpResult.sys !== null) {
    extract.cardio.bp_sys = bpResult.sys;
    extract.cardio.bp_dia = bpResult.dia;
    extract.fieldConfidence.bp_sys = createExtractedValue(bpResult.sys, bpResult.confidence, bpResult.sourcePage, bpResult.sourceLine);
    extract.fieldConfidence.bp_dia = createExtractedValue(bpResult.dia, bpResult.confidence, bpResult.sourcePage, bpResult.sourceLine);
  }
  
  // --- PERFORMANCE ---
  // Detect sport type
  if (/vélo|bike|cyclisme|ergomètre|tacx|neo|cyclus/i.test(fullText)) {
    extract.performance.sport = "bike";
  } else if (/course|running|tapis|vma/i.test(fullText)) {
    extract.performance.sport = "run";
  } else if (/triathlon|tri|ironman/i.test(fullText)) {
    extract.performance.sport = "tri";
  }
  
  // VO2max (ml/kg/min) - priority from summary
  const vo2RelResult = extractNumericField(
    priorityLines, 
    /VO2\s*max/i, 
    /(\d{2}(?:[,.]\d{1,2})?)\s*(?:ml|mL)/i,
    "vo2max_ml_kg_min"
  );
  if (vo2RelResult.value !== null) {
    extract.performance.vo2max_ml_kg_min = vo2RelResult.value;
    extract.fieldConfidence.vo2max_ml_kg_min = vo2RelResult;
  }
  
  // VO2max (L/min)
  const vo2AbsResult = extractNumericField(
    allLines,
    /VO2\s*max/i,
    /(\d(?:[,.]\d{1,2})?)\s*[lL]\/min/i,
    "vo2max_l_min"
  );
  if (vo2AbsResult.value !== null) {
    extract.performance.vo2max_l_min = vo2AbsResult.value;
    extract.fieldConfidence.vo2max_l_min = vo2AbsResult;
  }
  
  // PMA
  const pmaResult = extractNumericField(
    priorityLines,
    /\bPMA\b|Puissance\s*(?:maximale\s*)?aérobie/i,
    /(\d{2,3})\s*(?:W|watts?)(?!\s*\/\s*kg)/i,
    "pma_w"
  );
  if (pmaResult.value !== null) {
    extract.performance.pma_w = pmaResult.value;
    extract.fieldConfidence.pma_w = pmaResult;
  }
  
  // Pmax
  const pmaxResult = extractNumericField(
    priorityLines,
    /\bPmax\b|P\s*max|Puissance\s*max/i,
    /(\d{3,4})\s*(?:W|watts?)/i,
    "pmax_w"
  );
  if (pmaxResult.value !== null) {
    extract.performance.pmax_w = pmaxResult.value;
    extract.fieldConfidence.pmax_w = pmaxResult;
  }
  
  // FTP
  const ftpResult = extractNumericField(
    allLines,
    /\bFTP\b|Functional\s*Threshold/i,
    /(\d{2,3})\s*(?:W|watts?)/i,
    "ftp_w"
  );
  if (ftpResult.value !== null) {
    extract.performance.ftp_w = ftpResult.value;
    extract.fieldConfidence.ftp_w = ftpResult;
  }
  
  // VMA
  const vmaResult = extractNumericField(
    allLines,
    /\bVMA\b|Vitesse\s*maximale\s*aérobie/i,
    /(\d{1,2}(?:[,.]\d{1,2})?)\s*(?:km\/h|km)?/i,
    "vma_kmh"
  );
  if (vmaResult.value !== null) {
    extract.performance.vma_kmh = vmaResult.value;
    extract.fieldConfidence.vma_kmh = vmaResult;
    // Convert to pace
    if (vmaResult.value > 0) {
      extract.performance.vma_pace_sec_km = Math.round(3600 / vmaResult.value);
    }
  }
  
  // --- THRESHOLDS ---
  extract.thresholds.lt1 = extractThresholdFromLines(allLines, ["SL1", "LT1", "Seuil\\s*Lactique\\s*1", "Seuil\\s*1"]);
  extract.thresholds.lt2 = extractThresholdFromLines(allLines, ["SL2", "LT2", "Seuil\\s*Lactique\\s*2", "Seuil\\s*2", "OBLA", "4\\s*mmol"]);
  
  // --- TABLE EXTRACTION ---
  if (layout.tables.length > 0) {
    const tableData = extractFromTables(layout.tables);
    
    // Fill missing values from table
    if (!extract.performance.pma_w && tableData.estimatedPma) {
      extract.performance.pma_w = tableData.estimatedPma;
      extract.fieldConfidence.pma_w = createExtractedValue(
        tableData.estimatedPma,
        0.6, // Lower confidence - estimated from table
        tableData.pageNum,
        "Estimé depuis table des paliers"
      );
    }
    
    // Glycemia from table
    if (tableData.glycemiaMin !== null || tableData.glycemiaMax !== null) {
      extract.glycemia.min = tableData.glycemiaMin;
      extract.glycemia.max = tableData.glycemiaMax;
      extract.fieldConfidence.glycemia_min = createExtractedValue(tableData.glycemiaMin, tableData.confidence, tableData.pageNum);
      extract.fieldConfidence.glycemia_max = createExtractedValue(tableData.glycemiaMax, tableData.confidence, tableData.pageNum);
    }
    
    // Store stage count
    if (tableData.stageCount > 0) {
      extract.notes.push(`Paliers détectés: ${tableData.stageCount}`);
    }
  }
  
  // --- LACTATE MAX ---
  const lactateMaxResult = extractNumericField(
    allLines,
    /Lactate\s*max|La\s*max|Lactat[ée]mie\s*max/i,
    /(\d{1,2}(?:[,.]\d{1,2})?)/,
    "lactate_max"
  );
  if (lactateMaxResult.value !== null) {
    extract.lactate.lactate_max = lactateMaxResult.value;
    extract.fieldConfidence.lactate_max = lactateMaxResult;
  }
  
  // --- VLamax ---
  const vlamaxResult = extractNumericField(
    allLines,
    /VLamax/i,
    /(\d(?:[,.]\d{1,2})?)/,
    "vlamax"
  );
  if (vlamaxResult.value !== null) {
    extract.vlamax.value = vlamaxResult.value;
    extract.vlamax.source = "lab";
    extract.fieldConfidence.vlamax = vlamaxResult;
  }
  
  // --- NOTES ---
  extract.notes.push("Rapport type Quentin / SOC Brussels (layout parser)");
  if (extract.meta.reportDate) {
    extract.notes.push(`Date du test: ${extract.meta.reportDate}`);
  }
  
  // Glycemia recommendations
  const glycemiaRecoLine = findLineWithPattern(allLines, /(?:cible|objectif|recommandation)[:\s]*\d{2,3}\s*[-–]\s*\d{2,3}/i);
  if (glycemiaRecoLine) {
    const match = glycemiaRecoLine.text.match(/(\d{2,3})\s*[-–]\s*(\d{2,3})/);
    if (match) {
      extract.glycemia.notes = `Cible: ${match[1]}-${match[2]} mg/dL`;
    }
  }
  
  // --- CONFIDENCE CALCULATION ---
  const fieldKeys = Object.keys(extract.fieldConfidence);
  const totalFields = 15;
  const foundFields = fieldKeys.filter(k => {
    const f = extract.fieldConfidence![k];
    return f && f.value !== null;
  }).length;
  
  const avgConfidence = fieldKeys.length > 0
    ? fieldKeys.reduce((sum, k) => sum + (extract.fieldConfidence![k]?.confidence || 0), 0) / fieldKeys.length
    : 0;
  
  extract.meta.sourceConfidence = Math.min(foundFields / totalFields, avgConfidence);
  extract.meta.discipline = extract.performance.sport !== "unknown" ? extract.performance.sport : null;
  
  logDebug({
    type: "info",
    field: "confidence",
    message: `Layout parser: ${foundFields}/${totalFields} fields, avg confidence ${Math.round(avgConfidence * 100)}%`,
  });
  
  return extract;
}

// =============================================
// Helper Functions
// =============================================

/**
 * Find summary section lines
 */
function findSummarySection(lines: ReconstructedLine[]): ReconstructedLine[] {
  const summaryPatterns = [
    /^Résumé\b/i,
    /^Synthèse\b/i,
    /^Résultats\b/i,
  ];
  
  let inSummary = false;
  const summaryLines: ReconstructedLine[] = [];
  
  for (const line of lines) {
    if (summaryPatterns.some(p => p.test(line.text))) {
      inSummary = true;
      continue;
    }
    
    if (inSummary) {
      // End of summary
      if (/^(?:Paliers?|Protocole|Graphique|Tableau)\b/i.test(line.text)) {
        break;
      }
      summaryLines.push(line);
    }
  }
  
  return summaryLines;
}

/**
 * Extract numeric field with anchor pattern
 */
function extractNumericField(
  lines: ReconstructedLine[],
  anchorPattern: RegExp,
  valuePattern: RegExp,
  rangeKey: string
): ExtractedValue<number | null> {
  const anchorLine = findLineWithPattern(lines, anchorPattern);
  
  if (!anchorLine) {
    return createExtractedValue(null, 0, null, null);
  }
  
  // Try to find value on same line
  const lineIndex = lines.indexOf(anchorLine);
  const searchLines = [anchorLine];
  
  // Also check next 2 lines
  if (lineIndex + 1 < lines.length) searchLines.push(lines[lineIndex + 1]);
  if (lineIndex + 2 < lines.length) searchLines.push(lines[lineIndex + 2]);
  
  for (const line of searchLines) {
    const match = line.text.match(valuePattern);
    if (match && match[1]) {
      const value = normalizeNumber(match[1]);
      
      if (value !== null) {
        // Validate range
        const range = VALUE_RANGES[rangeKey];
        let confidence = 0.8;
        
        if (range && !isInRange(value, rangeKey)) {
          logDebug({
            type: "warning",
            field: rangeKey,
            message: `Value ${value} outside range [${range.min}-${range.max}]`,
            value,
          });
          confidence = 0.4; // Low confidence for out-of-range
        }
        
        // Boost confidence if found on same line as anchor
        if (line === anchorLine) confidence = Math.min(confidence + 0.1, 1);
        
        logDebug({
          type: "match",
          field: rangeKey,
          message: `Found value`,
          value,
          pattern: valuePattern.source,
        });
        
        return createExtractedValue(
          value,
          confidence,
          line.pageNum,
          line.text
        );
      }
    }
  }
  
  return createExtractedValue(null, 0, anchorLine.pageNum, anchorLine.text);
}

/**
 * Extract with anchor and string value
 */
function extractWithAnchor(
  lines: ReconstructedLine[],
  anchorPattern: RegExp,
  valuePattern: RegExp
): { value: string | null; confidence: number } {
  const line = findLineWithPattern(lines, anchorPattern);
  if (!line) return { value: null, confidence: 0 };
  
  const match = line.text.match(valuePattern);
  if (match && match[1]) {
    return { value: match[1].trim(), confidence: 0.7 };
  }
  
  return { value: null, confidence: 0 };
}

/**
 * Extract blood pressure
 */
function extractBloodPressure(lines: ReconstructedLine[]): {
  sys: number | null;
  dia: number | null;
  confidence: number;
  sourcePage: number | null;
  sourceLine: string | null;
} {
  const bpLine = findLineWithPattern(lines, /(?:TA|BP|Tension)/i);
  
  if (!bpLine) {
    return { sys: null, dia: null, confidence: 0, sourcePage: null, sourceLine: null };
  }
  
  const bp = parseBloodPressure(bpLine.text);
  
  if (bp) {
    return {
      sys: bp.sys,
      dia: bp.dia,
      confidence: 0.8,
      sourcePage: bpLine.pageNum,
      sourceLine: bpLine.text,
    };
  }
  
  return { sys: null, dia: null, confidence: 0, sourcePage: bpLine.pageNum, sourceLine: bpLine.text };
}

/**
 * Extract threshold from lines
 */
function extractThresholdFromLines(
  lines: ReconstructedLine[],
  labelPatterns: string[]
): { hr: number | null; speed_kmh: number | null; power_w: number | null; lactate: number | null } | null {
  const result = { hr: null as number | null, speed_kmh: null as number | null, power_w: null as number | null, lactate: null as number | null };
  let found = false;
  
  for (const label of labelPatterns) {
    const pattern = new RegExp(label, "i");
    const thresholdLines = findLinesWithPattern(lines, pattern);
    
    for (const line of thresholdLines) {
      // Extract HR
      const hrMatch = line.text.match(/(\d{2,3})\s*(?:bpm|FC)/i);
      if (hrMatch) {
        const hr = normalizeNumber(hrMatch[1]);
        if (hr && isInRange(hr, "stage_bpm")) {
          result.hr = hr;
          found = true;
        }
      }
      
      // Extract Power
      const powerMatch = line.text.match(/(\d{2,3})\s*(?:W|watts?)/i);
      if (powerMatch) {
        const power = normalizeNumber(powerMatch[1]);
        if (power && isInRange(power, "stage_watts")) {
          result.power_w = power;
          found = true;
        }
      }
      
      // Extract Lactate
      const lactateMatch = line.text.match(/(\d{1,2}(?:[,.]\d{1,2})?)\s*(?:mmol|mM)/i);
      if (lactateMatch) {
        const lactate = normalizeNumber(lactateMatch[1]);
        if (lactate && isInRange(lactate, "stage_lactate")) {
          result.lactate = lactate;
          found = true;
        }
      }
      
      // Extract Speed
      const speedMatch = line.text.match(/(\d{1,2}(?:[,.]\d)?)\s*(?:km\/h|km)/i);
      if (speedMatch) {
        result.speed_kmh = normalizeNumber(speedMatch[1]);
        found = true;
      }
      
      if (found) break;
    }
    
    if (found) break;
  }
  
  return found ? result : null;
}

/**
 * Extract data from detected tables
 */
function extractFromTables(tables: DetectedTable[]): {
  stageCount: number;
  estimatedPma: number | null;
  glycemiaMin: number | null;
  glycemiaMax: number | null;
  pageNum: number | null;
  confidence: number;
} {
  const result = {
    stageCount: 0,
    estimatedPma: null as number | null,
    glycemiaMin: null as number | null,
    glycemiaMax: null as number | null,
    pageNum: null as number | null,
    confidence: 0,
  };
  
  // Find the best table (highest confidence)
  const bestTable = tables.reduce((best, t) => 
    t.confidence > (best?.confidence || 0) ? t : best,
    null as DetectedTable | null
  );
  
  if (!bestTable) return result;
  
  result.pageNum = bestTable.pageNum;
  result.confidence = bestTable.confidence;
  result.stageCount = bestTable.dataRows.length;
  
  // Find column indices
  const wattsColIdx = bestTable.columns.findIndex(c => c.type === "watts");
  const glycemiaColIdx = bestTable.columns.findIndex(c => c.type === "glycemia");
  const lactateColIdx = bestTable.columns.findIndex(c => c.type === "lactate");
  
  // Extract max watts from last row with high lactate
  if (wattsColIdx >= 0 && lactateColIdx >= 0) {
    // Find row with highest lactate
    let maxLactate = 0;
    let maxLactateWatts: number | null = null;
    
    for (const row of bestTable.dataRows) {
      const lactate = row.cells[lactateColIdx]?.numericValue;
      const watts = row.cells[wattsColIdx]?.numericValue;
      
      if (lactate && lactate > maxLactate) {
        maxLactate = lactate;
        if (watts && watts > 100) {
          maxLactateWatts = watts;
        }
      }
    }
    
    // If high lactate (> 8), this is likely PMA
    if (maxLactate > 8 && maxLactateWatts) {
      result.estimatedPma = maxLactateWatts;
      logDebug({
        type: "info",
        field: "pma_w",
        message: `Estimated PMA from table: ${maxLactateWatts}W at ${maxLactate} mmol`,
      });
    }
  }
  
  // Extract glycemia range
  if (glycemiaColIdx >= 0) {
    const glycemiaValues = bestTable.dataRows
      .map(r => r.cells[glycemiaColIdx]?.numericValue)
      .filter((v): v is number => v !== null && v >= 40 && v <= 300);
    
    if (glycemiaValues.length > 0) {
      result.glycemiaMin = Math.min(...glycemiaValues);
      result.glycemiaMax = Math.max(...glycemiaValues);
      logDebug({
        type: "info",
        field: "glycemia",
        message: `Range from table: ${result.glycemiaMin}-${result.glycemiaMax}`,
      });
    }
  }
  
  return result;
}
