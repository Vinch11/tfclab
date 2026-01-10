// =============================================
// Parser for Mika / Cosmed Quark reports
// Enhanced version with robust extraction for running-focused lab tests
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
  parseBpm,
  parseMmol,
  parseMlKgMin,
  parseLMin,
  isInRange,
  logDebug,
  VALUE_RANGES,
} from "../normalize";

// =============================================
// Report Detection
// =============================================

/**
 * Check if text matches Mika/Cosmed report format
 */
export function isMikaReport(textByPage: string[]): boolean {
  const fullText = textByPage.join(" ").toLowerCase();
  
  const markers = [
    "cosmed", "quark", "obla", "économie de course",
    "running economy", "vma absolue", "résumé résultats",
    "mika", "analyse métabolique", "cpet", "ergo",
    "tapis", "treadmill", "vo2 peak", "ventilatory threshold"
  ];
  
  let matchCount = 0;
  for (const marker of markers) {
    if (fullText.includes(marker)) {
      matchCount++;
    }
  }
  
  return matchCount >= 2;
}

// =============================================
// Main Parser
// =============================================

/**
 * Parse Mika / Cosmed Quark report with enhanced extraction
 */
export function parseMikaReport(textByPage: string[]): LabExtract {
  const extract = createEmptyLabExtract();
  extract.meta.reportType = "mika";
  extract.raw.textPages = textByPage;
  extract.raw.usedOcr = false;
  
  const fullText = textByPage.join("\n");
  const normalizedText = normalizeText(fullText);
  
  // Track extraction sources
  const fieldSources: Record<string, number> = {};
  
  // --- META ---
  extract.meta.reportDate = extractDate(fullText);
  
  // Extract athlete name
  const namePatterns = [
    /(?:Nom|Patient|Sujet|Athlète)[:\s]*([A-Za-zÀ-ÿ\s\-]+?)(?:\n|Date|Âge|Sexe|Né|$)/i,
    /(?:Name|Subject)[:\s]*([A-Za-zÀ-ÿ\s\-]+?)(?:\n|Date|Age|Sex|$)/i,
  ];
  for (const pattern of namePatterns) {
    const match = fullText.match(pattern);
    if (match) {
      extract.meta.athleteName = match[1].trim();
      logDebug({ type: "match", field: "athleteName", message: "Found athlete name", value: extract.meta.athleteName });
      break;
    }
  }
  
  // --- ANTHROPO ---
  extract.anthropo.weight_kg = extractWithMultiplePatterns(fullText, [
    /(?:Poids|Weight)[:\s]*(\d{2,3}(?:[,.]\d{1,2})?)\s*(?:kg)?/i,
    /(\d{2,3}(?:[,.]\d)?)\s*kg\b/i,
  ], "weight_kg", fieldSources, textByPage);
  
  // Height - handle both cm and meters
  let heightValue = extractWithMultiplePatterns(fullText, [
    /(?:Taille|Height)[:\s]*(\d{3})\s*(?:cm)?/i,
    /(\d{3})\s*cm\b/i,
    /(?:Taille|Height)[:\s]*([12][,.]\d{2})\s*m/i,
  ], "height_cm", fieldSources, textByPage);
  
  // Convert meters to cm if needed
  if (heightValue && heightValue < 3) {
    heightValue = Math.round(heightValue * 100);
    logDebug({ type: "info", field: "height_cm", message: "Converted from meters", value: heightValue });
  }
  extract.anthropo.height_cm = heightValue;
  
  extract.anthropo.fat_pct = extractWithMultiplePatterns(fullText, [
    /(?:masse grasse|body fat|MG|Fat)[:\s]*(\d{1,2}(?:[,.]\d{1,2})?)\s*%?/i,
    /(\d{1,2}(?:[,.]\d)?)\s*%\s*(?:MG|fat|masse)/i,
    /(?:BF|Body\s*Fat)[:\s]*(\d{1,2}(?:[,.]\d)?)/i,
  ], "fat_pct", fieldSources, textByPage);
  
  // BMI
  extract.anthropo.bmi = extractWithMultiplePatterns(fullText, [
    /(?:BMI|IMC)[:\s]*(\d{1,2}(?:[,.]\d{1,2})?)/i,
  ], null, fieldSources, textByPage);
  
  // --- CARDIO ---
  // FC max (priority: summary section first)
  extract.cardio.hr_max = extractFromSummaryFirst(fullText, textByPage, [
    /FC\s*max[:\s]*(\d{2,3})\s*(?:bpm)?/i,
    /FCmax[:\s]*(\d{2,3})/i,
    /HR\s*max[:\s]*(\d{2,3})/i,
    /(?:Fréquence|Heart\s*rate)\s*max(?:imale|imum)?[:\s]*(\d{2,3})/i,
    /Peak\s*HR[:\s]*(\d{2,3})/i,
  ], "hr_max", fieldSources);
  
  // FC repos
  extract.cardio.hr_rest = extractWithMultiplePatterns(fullText, [
    /FC\s*repos[:\s]*(\d{2,3})\s*(?:bpm)?/i,
    /FCR[:\s]*(\d{2,3})/i,
    /HR\s*rest[:\s]*(\d{2,3})/i,
    /Resting\s*(?:HR|heart\s*rate)[:\s]*(\d{2,3})/i,
  ], "hr_rest", fieldSources, textByPage);
  
  // HRV (if available)
  extract.cardio.hrv = extractWithMultiplePatterns(fullText, [
    /HRV[:\s]*(\d{2,3})/i,
    /RMSSD[:\s]*(\d{2,3})/i,
  ], "hrv", fieldSources, textByPage);
  
  // SpO2
  extract.cardio.spo2 = extractWithMultiplePatterns(fullText, [
    /SpO2[:\s]*(\d{2,3})\s*%?/i,
    /Saturation[:\s]*(\d{2,3})\s*%?/i,
    /O2\s*Sat[:\s]*(\d{2,3})/i,
  ], "spo2", fieldSources, textByPage);
  
  // --- PERFORMANCE ---
  // Mika/Cosmed reports are typically running-focused but can be bike
  if (/vélo|bike|cyclisme|ergomètre|cyclus/i.test(fullText)) {
    extract.performance.sport = "bike";
  } else if (/triathlon|tri|ironman/i.test(fullText)) {
    extract.performance.sport = "tri";
  } else {
    extract.performance.sport = "run"; // Default for Cosmed
  }
  
  // VO2max - multiple formats (ml/kg/min AND L/min)
  extract.performance.vo2max_ml_kg_min = extractFromSummaryFirst(fullText, textByPage, [
    /VO2\s*max[:\s]*(\d{2}(?:[,.]\d{1,2})?)\s*(?:ml\/(?:kg\/)?min|mL\/kg\/min|ml\/min\/kg)/i,
    /VO2\s*peak[:\s]*(\d{2}(?:[,.]\d{1,2})?)\s*(?:ml|mL)/i,
    /(\d{2}(?:[,.]\d{1,2})?)\s*ml[\/\.]kg[\/\.]min/i,
    /VO2\s*(?:max|peak)[:\s]*(\d{2}(?:[,.]\d)?)/i,
  ], "vo2max_ml_kg_min", fieldSources);
  
  extract.performance.vo2max_l_min = extractWithMultiplePatterns(fullText, [
    /VO2\s*(?:max|peak)[:\s]*(\d(?:[,.]\d{1,2})?)\s*[lL]\/min/i,
    /(\d(?:[,.]\d{1,2})?)\s*[lL]\/min/i,
  ], "vo2max_l_min", fieldSources, textByPage);
  
  // VMA (Vitesse Maximale Aérobie) - key for Mika running tests
  extract.performance.vma_kmh = extractFromSummaryFirst(fullText, textByPage, [
    /VMA(?:\s*absolue)?[:\s]*(\d{1,2}(?:[,.]\d{1,2})?)\s*(?:km\/h|km)?/i,
    /Vitesse\s*maximale\s*(?:aérobie)?[:\s]*(\d{1,2}(?:[,.]\d)?)\s*km/i,
    /vVO2max[:\s]*(\d{1,2}(?:[,.]\d)?)\s*km/i,
    /Peak\s*speed[:\s]*(\d{1,2}(?:[,.]\d)?)\s*km/i,
  ], "vma_kmh", fieldSources);
  
  if (extract.performance.vma_kmh) {
    extract.performance.vma_pace_sec_km = vmaToSecsPerKm(extract.performance.vma_kmh);
    logDebug({ type: "info", field: "vma_pace", message: `Calculated pace: ${extract.performance.vma_pace_sec_km}s/km` });
  }
  
  // PMA (if bike test)
  if (extract.performance.sport === "bike" || extract.performance.sport === "tri") {
    extract.performance.pma_w = extractWithMultiplePatterns(fullText, [
      /PMA[:\s]*(\d{2,3})\s*(?:W|watts?)(?!\s*\/\s*kg)/i,
      /(?:MAP|Max\s*Aerobic\s*Power)[:\s]*(\d{2,3})\s*W/i,
    ], "pma_w", fieldSources, textByPage);
    
    extract.performance.pmax_w = extractWithMultiplePatterns(fullText, [
      /Pmax[:\s]*(\d{3,4})\s*(?:W|watts?)/i,
      /Peak\s*power[:\s]*(\d{3,4})\s*W/i,
    ], "pmax_w", fieldSources, textByPage);
    
    extract.performance.ftp_w = extractWithMultiplePatterns(fullText, [
      /FTP[:\s]*(\d{2,3})\s*(?:W|watts?)/i,
    ], "ftp_w", fieldSources, textByPage);
  }
  
  // --- THRESHOLDS (Running-focused: VT1, VT2, OBLA) ---
  // VT1 / Seuil ventilatoire 1 / LT1
  extract.thresholds.lt1 = extractRunningThreshold(fullText, textByPage, [
    "VT1", "SV1", "Seuil\\s*ventilatoire\\s*1", "Seuil\\s*1", "SL1", "LT1", "AT"
  ], fieldSources);
  
  // VT2 / Seuil ventilatoire 2 / LT2
  extract.thresholds.lt2 = extractRunningThreshold(fullText, textByPage, [
    "VT2", "SV2", "Seuil\\s*ventilatoire\\s*2", "Seuil\\s*2", "SL2", "LT2", "RCP"
  ], fieldSources);
  
  // OBLA (4 mmol threshold) - key for Mika reports
  extract.thresholds.obla = extractRunningThreshold(fullText, textByPage, [
    "OBLA", "4\\s*mmol", "Seuil\\s*lactique", "MLSS"
  ], fieldSources);
  
  // Set lactate value for OBLA if not found
  if (extract.thresholds.obla && !extract.thresholds.obla.lactate) {
    extract.thresholds.obla.lactate = 4.0;
  }
  
  // --- RUNNING ECONOMY (key for Mika) ---
  extract.economy.running_cost_ml_kg_km = extractWithMultiplePatterns(fullText, [
    /[eé]conomie\s*(?:de\s*)?course[:\s]*(\d{2,3}(?:[,.]\d{1,2})?)/i,
    /running\s*economy[:\s]*(\d{2,3}(?:[,.]\d)?)/i,
    /RE[:\s]*(\d{2,3}(?:[,.]\d)?)\s*(?:ml|mL)/i,
    /(\d{2,3}(?:[,.]\d)?)\s*ml[\/\.]kg[\/\.]km/i,
    /Coût\s*(?:énergétique|O2)[:\s]*(\d{2,3}(?:[,.]\d)?)/i,
  ], null, fieldSources, textByPage);
  
  if (extract.economy.running_cost_ml_kg_km) {
    logDebug({ type: "match", field: "running_economy", message: "Found running economy", value: extract.economy.running_cost_ml_kg_km });
  }
  
  // --- VLamax (if explicitly mentioned) ---
  const vlamaxPatterns = [
    /VLamax[:\s]*(\d(?:[,.]\d{1,2})?)/i,
    /Glycolytic\s*capacity[:\s]*(\d(?:[,.]\d{1,2})?)/i,
  ];
  for (const pattern of vlamaxPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      extract.vlamax.value = normalizeNumber(match[1]);
      extract.vlamax.source = "lab";
      logDebug({ type: "match", field: "vlamax", message: "Found VLamax", value: extract.vlamax.value });
      break;
    }
  }
  
  // --- LACTATE MAX ---
  extract.lactate.lactate_max = extractWithMultiplePatterns(fullText, [
    /Lactate\s*max[:\s]*(\d{1,2}(?:[,.]\d{1,2})?)\s*(?:mmol)?/i,
    /La\s*max[:\s]*(\d{1,2}(?:[,.]\d{1,2})?)/i,
    /Lactat[ée]mie\s*max(?:imale)?[:\s]*(\d{1,2}(?:[,.]\d)?)/i,
    /Peak\s*lactate[:\s]*(\d{1,2}(?:[,.]\d)?)/i,
    /\[La\]\s*max[:\s]*(\d{1,2}(?:[,.]\d)?)/i,
  ], "lactate_max", fieldSources, textByPage);
  
  // --- VENTILATORY DATA (Cosmed specific) ---
  const veMax = extractWithMultiplePatterns(fullText, [
    /VE\s*max[:\s]*(\d{2,3}(?:[,.]\d)?)\s*(?:L\/min|l\/min)?/i,
    /Ventilation\s*max[:\s]*(\d{2,3}(?:[,.]\d)?)/i,
  ], null, fieldSources, textByPage);
  
  const rfMax = extractWithMultiplePatterns(fullText, [
    /(?:RF|RR|Breathing\s*rate)\s*max[:\s]*(\d{2,3})/i,
    /Fréquence\s*respiratoire\s*max[:\s]*(\d{2,3})/i,
  ], null, fieldSources, textByPage);
  
  const rerMax = extractWithMultiplePatterns(fullText, [
    /RER\s*max[:\s]*(\d(?:[,.]\d{1,2})?)/i,
    /QR\s*max[:\s]*(\d(?:[,.]\d{1,2})?)/i,
    /Quotient\s*respiratoire[:\s]*(\d(?:[,.]\d{1,2})?)/i,
  ], null, fieldSources, textByPage);
  
  // Add ventilatory data to notes
  if (veMax) extract.notes.push(`VE max: ${veMax} L/min`);
  if (rfMax) extract.notes.push(`RF max: ${rfMax}/min`);
  if (rerMax) extract.notes.push(`RER max: ${rerMax}`);
  
  // --- TIME TO EXHAUSTION (test duration) ---
  const tteMatch = fullText.match(/(?:Durée|Time|TTE)[:\s]*(\d{1,2})[:\s]?(\d{2})\s*(?:min|:)/i);
  if (tteMatch) {
    const minutes = parseInt(tteMatch[1]) + parseInt(tteMatch[2]) / 60;
    extract.notes.push(`Durée test: ${tteMatch[1]}:${tteMatch[2]}`);
    logDebug({ type: "info", field: "test_duration", message: `Test duration: ${minutes.toFixed(1)} min` });
  }
  
  // --- NOTES ---
  extract.notes.push("Rapport type Mika / Cosmed Quark");
  if (extract.economy.running_cost_ml_kg_km) {
    extract.notes.push(`Économie de course: ${extract.economy.running_cost_ml_kg_km} ml/kg/km`);
  }
  if (extract.meta.reportDate) {
    extract.notes.push(`Date du test: ${extract.meta.reportDate}`);
  }
  
  // --- CONFIDENCE CALCULATION ---
  let fieldsFound = 0;
  const totalFields = 14;
  
  if (extract.anthropo.weight_kg) fieldsFound++;
  if (extract.anthropo.height_cm) fieldsFound++;
  if (extract.cardio.hr_max) fieldsFound++;
  if (extract.cardio.hr_rest) fieldsFound++;
  if (extract.performance.vo2max_ml_kg_min) fieldsFound++;
  if (extract.performance.vo2max_l_min) fieldsFound++;
  if (extract.performance.vma_kmh) fieldsFound++;
  if (extract.thresholds.lt1) fieldsFound++;
  if (extract.thresholds.lt2 || extract.thresholds.obla) fieldsFound++;
  if (extract.meta.reportDate) fieldsFound++;
  if (extract.economy.running_cost_ml_kg_km) fieldsFound++;
  if (extract.lactate.lactate_max) fieldsFound++;
  if (extract.anthropo.fat_pct) fieldsFound++;
  if (veMax || rerMax) fieldsFound++;
  
  extract.meta.sourceConfidence = fieldsFound / totalFields;
  extract.meta.discipline = extract.performance.sport;
  
  logDebug({ type: "info", field: "confidence", message: `Fields found: ${fieldsFound}/${totalFields}`, value: extract.meta.sourceConfidence });
  
  return extract;
}

// =============================================
// Helper Functions
// =============================================

/**
 * Extract value trying multiple patterns with validation
 */
function extractWithMultiplePatterns(
  text: string,
  patterns: RegExp[],
  rangeKey: string | null,
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
        if (pageNum != null && rangeKey) fieldSources[rangeKey] = pageNum;
        
        // Validate range if applicable
        if (rangeKey && VALUE_RANGES[rangeKey]) {
          if (!isInRange(value, rangeKey)) {
            logDebug({ type: "warning", field: rangeKey, message: `Value out of range`, value, pattern: pattern.source });
            continue; // Try next pattern
          }
        }
        
        logDebug({ type: "match", field: rangeKey || "unknown", message: "Extracted value", value, pattern: pattern.source });
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
  rangeKey: string,
  fieldSources: Record<string, number>
): number | null {
  // Try to find summary section (common in Cosmed reports)
  const summaryPatterns = [
    /Résumé\s*(?:des\s*)?résultats?[:\s]*([\s\S]*?)(?:Graphiques?|Courbes?|Protocol|$)/i,
    /Summary[:\s]*([\s\S]*?)(?:Graphs?|Curves?|Protocol|$)/i,
    /Résultats\s*principaux[:\s]*([\s\S]*?)(?:Détails?|Protocol|$)/i,
    /Peak\s*Values[:\s]*([\s\S]*?)(?:Time|Protocol|$)/i,
  ];
  
  for (const summaryPattern of summaryPatterns) {
    const summaryMatch = fullText.match(summaryPattern);
    if (summaryMatch) {
      const summaryText = summaryMatch[1];
      const result = extractWithMultiplePatterns(summaryText, patterns, rangeKey, fieldSources, textByPage);
      if (result != null) {
        logDebug({ type: "info", field: rangeKey, message: "Found in summary section" });
        return result;
      }
    }
  }
  
  // Fallback to full text
  return extractWithMultiplePatterns(fullText, patterns, rangeKey, fieldSources, textByPage);
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
 * Extract running threshold data (speed-focused for Mika)
 */
function extractRunningThreshold(
  fullText: string,
  textByPage: string[],
  labelPatterns: string[],
  fieldSources: Record<string, number>
): { hr: number | null; speed_kmh: number | null; power_w: number | null; lactate: number | null } | null {
  const result = { hr: null as number | null, speed_kmh: null as number | null, power_w: null as number | null, lactate: null as number | null };
  let found = false;
  
  for (const label of labelPatterns) {
    // Look for structured line with speed, HR, lactate
    const linePattern = new RegExp(`${label}[:\\s]*([^\\n]{10,150})`, "i");
    const lineMatch = fullText.match(linePattern);
    
    if (lineMatch) {
      const line = lineMatch[1];
      
      // Extract Speed (km/h) - primary for running
      const speedPatterns = [
        /(\d{1,2}(?:[,.]\d{1,2})?)\s*(?:km\/h|km)/i,
        /vitesse[:\s]*(\d{1,2}(?:[,.]\d)?)/i,
        /speed[:\s]*(\d{1,2}(?:[,.]\d)?)/i,
      ];
      for (const sp of speedPatterns) {
        const speedMatch = line.match(sp);
        if (speedMatch) {
          const speed = normalizeNumber(speedMatch[1]);
          if (speed && speed >= 5 && speed <= 25) {
            result.speed_kmh = speed;
            found = true;
            break;
          }
        }
      }
      
      // Extract HR
      const hrMatch = line.match(/(\d{2,3})\s*(?:bpm|FC)/i);
      if (hrMatch) {
        const hr = parseInt(hrMatch[1]);
        if (hr >= 80 && hr <= 210) {
          result.hr = hr;
          found = true;
        }
      }
      
      // Extract Power (for bike/tri tests)
      const powerMatch = line.match(/(\d{2,3})\s*(?:W|watts?)/i);
      if (powerMatch) {
        const power = parseInt(powerMatch[1]);
        if (power >= 50 && power <= 500) {
          result.power_w = power;
          found = true;
        }
      }
      
      // Extract Lactate
      const lactateMatch = line.match(/(\d{1,2}(?:[,.]\d{1,2})?)\s*(?:mmol|mM)/i);
      if (lactateMatch) {
        const lactate = normalizeNumber(lactateMatch[1]);
        if (lactate && lactate >= 0.5 && lactate <= 20) {
          result.lactate = lactate;
          found = true;
        }
      }
      
      // Extract % VO2max if available
      const vo2pctMatch = line.match(/(\d{2,3})\s*%\s*(?:VO2|vo2)/i);
      if (vo2pctMatch) {
        logDebug({ type: "info", field: `threshold_${label}`, message: `At ${vo2pctMatch[1]}% VO2max` });
      }
      
      if (found) {
        logDebug({ type: "match", field: `threshold_${label}`, message: `Found threshold data`, value: JSON.stringify(result) });
        break;
      }
    }
  }
  
  return found ? result : null;
}
