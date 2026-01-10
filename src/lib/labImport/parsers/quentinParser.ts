// =============================================
// Parser for Quentin / SOC Brussels reports
// Enhanced version with robust extraction for tables, FR numbers, and thresholds
// =============================================

import { LabExtract, createEmptyLabExtract } from "../types";
import { 
  extractDate, 
  normalizeText,
  vmaToSecsPerKm
} from "./parserUtils";
import {
  normalizeNumber,
  parsePercent,
  parseWatt,
  parseBpm,
  parseMmol,
  parseMlKgMin,
  parseLMin,
  parseBloodPressure,
  isInRange,
  getValueStatus,
  logDebug,
  VALUE_RANGES,
} from "../normalize";

// =============================================
// Report Detection
// =============================================

/**
 * Check if text matches Quentin/SOC report format
 */
export function isQuentinReport(textByPage: string[]): boolean {
  const fullText = textByPage.join(" ").toLowerCase();
  
  const markers = [
    "tacx", "neo", "lactate plus", "lactate", 
    "seuil lactique", "hrv", "spo2", "palier",
    "soc", "brussels", "quentin", "pma", "vo2max"
  ];
  
  let matchCount = 0;
  for (const marker of markers) {
    if (fullText.includes(marker)) {
      matchCount++;
    }
  }
  
  return matchCount >= 3;
}

// =============================================
// Main Parser
// =============================================

/**
 * Parse Quentin / SOC Brussels report with enhanced extraction
 */
export function parseQuentinReport(textByPage: string[]): LabExtract {
  const extract = createEmptyLabExtract();
  extract.meta.reportType = "quentin";
  extract.raw.textPages = textByPage;
  extract.raw.usedOcr = false;
  
  const fullText = textByPage.join("\n");
  const normalizedText = normalizeText(fullText);
  
  // Track extraction sources
  const fieldSources: Record<string, number> = {};
  
  // --- META ---
  extract.meta.reportDate = extractDate(fullText);
  
  // Extract athlete name
  const nameMatch = fullText.match(/(?:Nom|Athlète|Nom de l'athlète)[:\s]*([A-Za-zÀ-ÿ\s\-]+?)(?:\n|Date|Âge|Sexe|$)/i);
  if (nameMatch) {
    extract.meta.athleteName = nameMatch[1].trim();
    logDebug({ type: "match", field: "athleteName", message: "Found athlete name", value: extract.meta.athleteName });
  }
  
  // --- ANTHROPO ---
  extract.anthropo.weight_kg = extractWithMultiplePatterns(fullText, [
    /Poids[:\s]*(\d{2,3}(?:[,.]\d{1,2})?)\s*(?:kg)?/i,
    /(\d{2,3}(?:[,.]\d)?)\s*kg\b/i,
  ], "weight_kg", fieldSources, textByPage);
  
  extract.anthropo.height_cm = extractWithMultiplePatterns(fullText, [
    /Taille[:\s]*(\d{3})\s*(?:cm)?/i,
    /(\d{3})\s*cm\b/i,
  ], "height_cm", fieldSources, textByPage);
  
  extract.anthropo.fat_pct = extractWithMultiplePatterns(fullText, [
    /(?:masse grasse|MG|Fat|%\s*MG)[:\s]*(\d{1,2}(?:[,.]\d{1,2})?)\s*%?/i,
    /(\d{1,2}(?:[,.]\d)?)\s*%\s*(?:MG|masse grasse|fat)/i,
  ], "fat_pct", fieldSources, textByPage);
  
  // --- CARDIO (Priority: Résumé section first) ---
  // FC max
  extract.cardio.hr_max = extractFromSummaryFirst(fullText, textByPage, [
    /FC\s*max[:\s]*(\d{2,3})\s*(?:bpm)?/i,
    /FCmax[:\s]*(\d{2,3})/i,
    /HR\s*max[:\s]*(\d{2,3})/i,
    /Fréquence\s*cardiaque\s*max(?:imale)?[:\s]*(\d{2,3})/i,
  ], "hr_max", fieldSources);
  
  // FC repos
  extract.cardio.hr_rest = extractWithMultiplePatterns(fullText, [
    /FC\s*repos[:\s]*(\d{2,3})\s*(?:bpm)?/i,
    /FCR[:\s]*(\d{2,3})/i,
    /HR\s*repos[:\s]*(\d{2,3})/i,
    /Fréquence\s*cardiaque\s*(?:au\s*)?repos[:\s]*(\d{2,3})/i,
  ], "hr_rest", fieldSources, textByPage);
  
  // HRV
  extract.cardio.hrv = extractWithMultiplePatterns(fullText, [
    /HRV[:\s]*(\d{2,3})/i,
    /Variabilité[:\s]*(\d{2,3})/i,
  ], "hrv", fieldSources, textByPage);
  
  // SpO2
  extract.cardio.spo2 = extractWithMultiplePatterns(fullText, [
    /SpO2[:\s]*(\d{2,3})\s*%?/i,
    /Saturation[:\s]*(\d{2,3})\s*%?/i,
  ], "spo2", fieldSources, textByPage);
  
  // Blood pressure (TA 12/7 -> 120/70)
  const bpPatterns = [
    /(?:TA|BP|Tension)[:\s]*(\d{1,3}\s*[\/\-]\s*\d{1,3})/i,
    /(\d{2,3})\s*[\/\-]\s*(\d{2,3})\s*(?:mmHg)?/i,
  ];
  for (const pattern of bpPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      const bp = parseBloodPressure(match[1] || `${match[1]}/${match[2]}`);
      if (bp && isInRange(bp.sys, "bp_sys") && isInRange(bp.dia, "bp_dia")) {
        extract.cardio.bp_sys = bp.sys;
        extract.cardio.bp_dia = bp.dia;
        logDebug({ type: "match", field: "bp", message: `Blood pressure: ${bp.sys}/${bp.dia}`, pattern: pattern.source });
        break;
      }
    }
  }
  
  // --- PERFORMANCE (Priority: Résumé section) ---
  // Detect sport type
  if (/vélo|bike|cyclisme|ergomètre|tacx|neo|cyclus/i.test(fullText)) {
    extract.performance.sport = "bike";
  } else if (/course|running|tapis|vma/i.test(fullText)) {
    extract.performance.sport = "run";
  } else if (/triathlon|tri|ironman/i.test(fullText)) {
    extract.performance.sport = "tri";
  }
  
  // VO2max - two forms: ml/kg/min AND L/min
  extract.performance.vo2max_ml_kg_min = extractFromSummaryFirst(fullText, textByPage, [
    /VO2\s*max[:\s]*(\d{2}(?:[,.]\d{1,2})?)\s*(?:ml\/(?:kg\/)?min|mL\/kg\/min|ml\/min\/kg)/i,
    /VO2\s*max[:\s]*(\d{2}(?:[,.]\d{1,2})?)\s*ml/i,
    /(\d{2}(?:[,.]\d{1,2})?)\s*ml\/kg\/min/i,
  ], "vo2max_ml_kg_min", fieldSources);
  
  extract.performance.vo2max_l_min = extractWithMultiplePatterns(fullText, [
    /VO2\s*max[:\s]*(\d(?:[,.]\d{1,2})?)\s*[lL]\/min/i,
    /(\d(?:[,.]\d{1,2})?)\s*[lL]\/min/i,
  ], "vo2max_l_min", fieldSources, textByPage);
  
  // VMA
  extract.performance.vma_kmh = extractWithMultiplePatterns(fullText, [
    /VMA[:\s]*(\d{1,2}(?:[,.]\d{1,2})?)\s*(?:km\/h|km)?/i,
  ], "vma_kmh", fieldSources, textByPage);
  
  if (extract.performance.vma_kmh) {
    extract.performance.vma_pace_sec_km = vmaToSecsPerKm(extract.performance.vma_kmh);
  }
  
  // PMA (Puissance Maximale Aérobie) - careful: also exists as W/kg
  extract.performance.pma_w = extractFromSummaryFirst(fullText, textByPage, [
    /PMA[:\s]*(\d{2,3})\s*(?:W|watts?)(?!\s*\/\s*kg)/i,
    /Puissance\s*(?:maximale\s*)?aérobie[:\s]*(\d{2,3})\s*W/i,
  ], "pma_w", fieldSources);
  
  // Pmax (Sprint power)
  extract.performance.pmax_w = extractFromSummaryFirst(fullText, textByPage, [
    /Pmax[:\s]*(\d{3,4})\s*(?:W|watts?)/i,
    /P\s*max[:\s]*(\d{3,4})\s*W/i,
    /Puissance\s*max(?:imale)?[:\s]*(\d{3,4})\s*W/i,
  ], "pmax_w", fieldSources);
  
  // FTP
  extract.performance.ftp_w = extractWithMultiplePatterns(fullText, [
    /FTP[:\s]*(\d{2,3})\s*(?:W|watts?)/i,
    /Functional\s*Threshold[:\s]*(\d{2,3})\s*W/i,
  ], "ftp_w", fieldSources, textByPage);
  
  // --- THRESHOLDS (SL1/SL2) ---
  extract.thresholds.lt1 = extractThreshold(fullText, textByPage, ["SL1", "LT1", "Seuil\\s*Lactique\\s*1", "Seuil\\s*1"], fieldSources);
  extract.thresholds.lt2 = extractThreshold(fullText, textByPage, ["SL2", "LT2", "Seuil\\s*Lactique\\s*2", "Seuil\\s*2", "OBLA", "4\\s*mmol"], fieldSources);
  
  // OBLA specific (4 mmol threshold)
  if (!extract.thresholds.lt2 || !extract.thresholds.lt2.lactate) {
    const oblaMatch = extractThreshold(fullText, textByPage, ["OBLA", "4\\s*mmol"], fieldSources);
    if (oblaMatch) {
      if (!oblaMatch.lactate) oblaMatch.lactate = 4.0;
      extract.thresholds.obla = oblaMatch;
    }
  }
  
  // --- VLamax ---
  const vlamaxMatch = fullText.match(/VLamax[:\s]*(\d(?:[,.]\d{1,2})?)/i);
  if (vlamaxMatch) {
    extract.vlamax.value = normalizeNumber(vlamaxMatch[1]);
    extract.vlamax.source = "lab";
    logDebug({ type: "match", field: "vlamax", message: "Found VLamax", value: extract.vlamax.value });
  }
  
  // --- LACTATE MAX ---
  extract.lactate.lactate_max = extractWithMultiplePatterns(fullText, [
    /Lactate\s*max[:\s]*(\d{1,2}(?:[,.]\d{1,2})?)\s*(?:mmol)?/i,
    /La\s*max[:\s]*(\d{1,2}(?:[,.]\d{1,2})?)/i,
    /Lactatémie\s*max(?:imale)?[:\s]*(\d{1,2}(?:[,.]\d{1,2})?)/i,
  ], "lactate_max", fieldSources, textByPage);
  
  // --- GLYCEMIA ---
  const glycemiaResult = extractGlycemia(fullText, textByPage);
  if (glycemiaResult) {
    extract.glycemia = glycemiaResult;
  }
  
  // --- STAGE TABLE PARSING ---
  const stageData = parseStageTable(textByPage);
  if (stageData.length > 0) {
    // Use stage data to fill in missing values or validate existing ones
    const lastStage = stageData[stageData.length - 1];
    
    // If PMA not found, estimate from last complete stage
    if (!extract.performance.pma_w && lastStage.watts) {
      // Check if this looks like the max stage
      const hasHighLactate = lastStage.lactate && lastStage.lactate > 8;
      if (hasHighLactate) {
        extract.performance.pma_w = lastStage.watts;
        logDebug({ type: "info", field: "pma_w", message: "Estimated PMA from stage table", value: lastStage.watts });
      }
    }
    
    // Extract glycemia range from stages
    const glycemiaValues = stageData.map(s => s.glycemia).filter((v): v is number => v != null);
    if (glycemiaValues.length > 0 && !extract.glycemia.min) {
      extract.glycemia.min = Math.min(...glycemiaValues);
      extract.glycemia.max = Math.max(...glycemiaValues);
      logDebug({ type: "info", field: "glycemia", message: `Range from stages: ${extract.glycemia.min}-${extract.glycemia.max}` });
    }
    
    // Store stage data in notes for reference
    extract.notes.push(`Paliers détectés: ${stageData.length}`);
  }
  
  // --- NOTES ---
  extract.notes.push("Rapport type Quentin / SOC Brussels");
  if (extract.meta.reportDate) {
    extract.notes.push(`Date du test: ${extract.meta.reportDate}`);
  }
  
  // Add glycemia recommendations if found
  const glycemiaRecoMatch = fullText.match(/(?:cible|objectif|recommandation)[:\s]*(\d{2,3})\s*[-–]\s*(\d{2,3})\s*(?:mg\/dl|mg\/dL)?/i);
  if (glycemiaRecoMatch) {
    extract.glycemia.notes = `Cible: ${glycemiaRecoMatch[1]}-${glycemiaRecoMatch[2]} mg/dL`;
    logDebug({ type: "match", field: "glycemia_reco", message: `Found glycemia target: ${extract.glycemia.notes}` });
  }
  
  // --- CONFIDENCE CALCULATION ---
  let fieldsFound = 0;
  const totalFields = 15;
  
  if (extract.anthropo.weight_kg) fieldsFound++;
  if (extract.cardio.hr_max) fieldsFound++;
  if (extract.cardio.hr_rest) fieldsFound++;
  if (extract.cardio.hrv) fieldsFound++;
  if (extract.cardio.spo2) fieldsFound++;
  if (extract.performance.vo2max_ml_kg_min) fieldsFound++;
  if (extract.performance.vo2max_l_min) fieldsFound++;
  if (extract.performance.vma_kmh || extract.performance.ftp_w) fieldsFound++;
  if (extract.thresholds.lt1) fieldsFound++;
  if (extract.thresholds.lt2) fieldsFound++;
  if (extract.meta.reportDate) fieldsFound++;
  if (extract.performance.pmax_w || extract.performance.pma_w) fieldsFound++;
  if (extract.lactate.lactate_max) fieldsFound++;
  if (extract.glycemia.min || extract.glycemia.max) fieldsFound++;
  if (extract.anthropo.fat_pct) fieldsFound++;
  
  extract.meta.sourceConfidence = fieldsFound / totalFields;
  extract.meta.discipline = extract.performance.sport !== "unknown" ? extract.performance.sport : null;
  
  logDebug({ type: "info", field: "confidence", message: `Fields found: ${fieldsFound}/${totalFields}`, value: extract.meta.sourceConfidence });
  
  return extract;
}

// =============================================
// Helper Functions
// =============================================

/**
 * Extract value trying multiple patterns
 */
function extractWithMultiplePatterns(
  text: string,
  patterns: RegExp[],
  fieldName: string,
  fieldSources: Record<string, number>,
  textByPage: string[]
): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const value = normalizeNumber(match[1]);
      if (value != null) {
        // Find which page contains this match
        const pageNum = findPageWithMatch(textByPage, pattern);
        if (pageNum != null) fieldSources[fieldName] = pageNum;
        
        // Validate range if applicable
        const rangeKey = fieldName;
        if (VALUE_RANGES[rangeKey]) {
          if (!isInRange(value, rangeKey)) {
            logDebug({ type: "warning", field: fieldName, message: `Value out of range`, value, pattern: pattern.source });
            continue; // Try next pattern
          }
        }
        
        logDebug({ type: "match", field: fieldName, message: "Extracted value", value, pattern: pattern.source });
        return value;
      }
    }
  }
  return null;
}

/**
 * Extract from "Résumé" or summary section first, then fallback to full text
 */
function extractFromSummaryFirst(
  fullText: string,
  textByPage: string[],
  patterns: RegExp[],
  fieldName: string,
  fieldSources: Record<string, number>
): number | null {
  // Try to find summary section
  const summaryPatterns = [
    /Résumé[:\s]*([\s\S]*?)(?:Paliers?|Protocole|$)/i,
    /Synthèse[:\s]*([\s\S]*?)(?:Paliers?|Protocole|$)/i,
    /Résultats[:\s]*([\s\S]*?)(?:Paliers?|Protocole|$)/i,
  ];
  
  for (const summaryPattern of summaryPatterns) {
    const summaryMatch = fullText.match(summaryPattern);
    if (summaryMatch) {
      const summaryText = summaryMatch[1];
      const result = extractWithMultiplePatterns(summaryText, patterns, fieldName, fieldSources, textByPage);
      if (result != null) {
        logDebug({ type: "info", field: fieldName, message: "Found in summary section" });
        return result;
      }
    }
  }
  
  // Fallback to full text
  return extractWithMultiplePatterns(fullText, patterns, fieldName, fieldSources, textByPage);
}

/**
 * Find which page contains a pattern match
 */
function findPageWithMatch(textByPage: string[], pattern: RegExp): number | null {
  for (let i = 0; i < textByPage.length; i++) {
    if (pattern.test(textByPage[i])) {
      return i;
    }
  }
  return null;
}

/**
 * Extract threshold data (LT1/LT2/OBLA)
 */
function extractThreshold(
  fullText: string,
  textByPage: string[],
  labelPatterns: string[],
  fieldSources: Record<string, number>
): { hr: number | null; speed_kmh: number | null; power_w: number | null; lactate: number | null } | null {
  const result = { hr: null as number | null, speed_kmh: null as number | null, power_w: null as number | null, lactate: null as number | null };
  let found = false;
  
  for (const label of labelPatterns) {
    // Look for structured line like "SL1: 116 bpm, 175 W, 2.2 mmol"
    const linePattern = new RegExp(`${label}[:\\s]*([^\\n]{10,100})`, "i");
    const lineMatch = fullText.match(linePattern);
    
    if (lineMatch) {
      const line = lineMatch[1];
      
      // Extract HR
      const hrMatch = line.match(/(\d{2,3})\s*(?:bpm|FC)/i);
      if (hrMatch) {
        const hr = parseBpm(hrMatch[1]);
        if (hr && isInRange(hr, "stage_bpm")) {
          result.hr = hr;
          found = true;
        }
      }
      
      // Extract Power
      const powerMatch = line.match(/(\d{2,3})\s*(?:W|watts?)/i);
      if (powerMatch) {
        const power = parseWatt(powerMatch[1]);
        if (power && isInRange(power, "stage_watts")) {
          result.power_w = power;
          found = true;
        }
      }
      
      // Extract Lactate
      const lactateMatch = line.match(/(\d{1,2}(?:[,.]\d{1,2})?)\s*(?:mmol|mM)/i);
      if (lactateMatch) {
        const lactate = parseMmol(lactateMatch[1]);
        if (lactate && isInRange(lactate, "stage_lactate")) {
          result.lactate = lactate;
          found = true;
        }
      }
      
      // Extract Speed
      const speedMatch = line.match(/(\d{1,2}(?:[,.]\d)?)\s*(?:km\/h|km)/i);
      if (speedMatch) {
        result.speed_kmh = normalizeNumber(speedMatch[1]);
        found = true;
      }
      
      if (found) {
        logDebug({ type: "match", field: `threshold_${label}`, message: `Found threshold data`, value: JSON.stringify(result) });
        break;
      }
    }
  }
  
  return found ? result : null;
}

/**
 * Extract glycemia data
 */
function extractGlycemia(
  fullText: string,
  textByPage: string[]
): { min: number | null; max: number | null; notes: string | null } {
  const result = { min: null as number | null, max: null as number | null, notes: null as string | null };
  
  // Direct min/max patterns
  const minMatch = fullText.match(/glyc[ée]mie\s*min(?:imale)?[:\s]*(\d{1,3}(?:[,.]\d)?)/i);
  const maxMatch = fullText.match(/glyc[ée]mie\s*max(?:imale)?[:\s]*(\d{1,3}(?:[,.]\d)?)/i);
  
  if (minMatch) result.min = normalizeNumber(minMatch[1]);
  if (maxMatch) result.max = normalizeNumber(maxMatch[1]);
  
  // Range pattern "glycémie 60-120"
  const rangeMatch = fullText.match(/glyc[ée]mie[:\s]*(\d{1,3})\s*[-–]\s*(\d{1,3})/i);
  if (rangeMatch) {
    result.min = normalizeNumber(rangeMatch[1]);
    result.max = normalizeNumber(rangeMatch[2]);
  }
  
  // Carbohydrate recommendations
  const carbRecoMatch = fullText.match(/(\d{2,3})\s*[-–]\s*(\d{2,3})\s*g(?:rammes?)?\s*(?:de\s*)?(?:glucides?|CHO)/i);
  if (carbRecoMatch) {
    result.notes = `Apport recommandé: ${carbRecoMatch[1]}-${carbRecoMatch[2]}g glucides/h`;
  }
  
  return result;
}

// =============================================
// Stage Table Parser
// =============================================

interface StageData {
  stage: number;
  watts: number | null;
  hr: number | null;
  lactate: number | null;
  cadence: number | null;
  glycemia: number | null;
}

/**
 * Parse stage/palier table from PDF text
 * Handles messy column extraction with heuristics
 */
function parseStageTable(textByPage: string[]): StageData[] {
  const stages: StageData[] = [];
  const fullText = textByPage.join("\n");
  
  // Find table header
  const headerPatterns = [
    /Palier|Stage|Étape/i,
    /W|Watts|Puissance/i,
    /FC|HR|bpm/i,
    /Lactate|La|mmol/i,
  ];
  
  // Look for table structure
  const lines = fullText.split("\n");
  let inTable = false;
  let stageNum = 0;
  
  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;
    
    // Detect table start
    if (/(?:Palier|Stage)[^\d]*(?:W|Watts|Puissance)/i.test(cleanLine)) {
      inTable = true;
      continue;
    }
    
    // Detect table end
    if (inTable && /(?:Résumé|Synthèse|Conclusion|Recommandation)/i.test(cleanLine)) {
      break;
    }
    
    if (inTable || /^\s*\d+\s+\d{2,3}\s+\d{2,3}/.test(cleanLine)) {
      // Try to parse as stage row
      const numbers = cleanLine.match(/\d+(?:[,.]\d+)?/g);
      if (numbers && numbers.length >= 3) {
        stageNum++;
        const stage: StageData = {
          stage: stageNum,
          watts: null,
          hr: null,
          lactate: null,
          cadence: null,
          glycemia: null,
        };
        
        // Heuristic assignment based on value ranges
        for (const numStr of numbers) {
          const num = normalizeNumber(numStr);
          if (num == null) continue;
          
          // Watts: 50-500
          if (stage.watts == null && num >= 50 && num <= 500 && num % 5 === 0) {
            stage.watts = num;
          }
          // HR: 60-220
          else if (stage.hr == null && num >= 60 && num <= 220 && Number.isInteger(num)) {
            stage.hr = num;
          }
          // Lactate: 0.5-25 (decimal expected)
          else if (stage.lactate == null && num >= 0.5 && num <= 25 && numStr.includes(",") || numStr.includes(".")) {
            stage.lactate = num;
          }
          // Cadence: 40-140
          else if (stage.cadence == null && num >= 40 && num <= 140 && Number.isInteger(num)) {
            stage.cadence = num;
          }
          // Glycemia: 40-250
          else if (stage.glycemia == null && num >= 40 && num <= 250 && Number.isInteger(num)) {
            stage.glycemia = num;
          }
        }
        
        // Only add if we got at least watts and HR
        if (stage.watts != null || stage.hr != null) {
          stages.push(stage);
          inTable = true; // Confirm we're in table
        }
      }
    }
  }
  
  if (stages.length > 0) {
    logDebug({ type: "info", field: "stageTable", message: `Parsed ${stages.length} stages` });
  }
  
  return stages;
}
