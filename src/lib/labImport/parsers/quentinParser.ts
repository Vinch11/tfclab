// =============================================
// Parser for Quentin / SOC Brussels reports
// =============================================

import { LabExtract, createEmptyLabExtract } from "../types";
import { 
  extractNumber, 
  extractDate, 
  findValueNearLabel,
  normalizeText,
  vmaToSecsPerKm
} from "./parserUtils";

/**
 * Check if text matches Quentin/SOC report format
 */
export function isQuentinReport(textByPage: string[]): boolean {
  const fullText = textByPage.join(" ").toLowerCase();
  
  const markers = [
    "tacx", "neo", "lactate plus", "lactate", 
    "seuil lactique", "hrv", "spo2", "palier",
    "soc", "brussels", "quentin"
  ];
  
  let matchCount = 0;
  for (const marker of markers) {
    if (fullText.includes(marker)) {
      matchCount++;
    }
  }
  
  // Need at least 3 markers to identify as Quentin report
  return matchCount >= 3;
}

/**
 * Parse Quentin / SOC Brussels report
 */
export function parseQuentinReport(textByPage: string[]): LabExtract {
  const extract = createEmptyLabExtract();
  extract.meta.reportType = "quentin";
  extract.raw.textPages = textByPage;
  extract.raw.usedOcr = false;
  
  const fullText = textByPage.join("\n");
  const normalizedText = normalizeText(fullText);
  
  // Extract date
  extract.meta.reportDate = extractDate(fullText);
  
  // Extract athlete name (usually near "Nom" or "Athlète")
  const nameMatch = fullText.match(/(?:Nom|Athlète|Nom de l'athlète)[:\s]*([A-Za-zÀ-ÿ\s]+?)(?:\n|Date|Âge|Sexe)/i);
  if (nameMatch) {
    extract.meta.athleteName = nameMatch[1].trim();
  }
  
  // --- ANTHROPO ---
  extract.anthropo.weight_kg = findValueNearLabel(fullText, /Poids[:\s]*/i) ||
    extractNumber(fullText, /(\d{2,3}(?:[,.]\d)?)\s*kg/i);
  
  extract.anthropo.height_cm = findValueNearLabel(fullText, /Taille[:\s]*/i) ||
    extractNumber(fullText, /(\d{3})\s*cm/i);
  
  extract.anthropo.fat_pct = findValueNearLabel(fullText, /(?:masse grasse|MG|Fat)[:\s]*/i) ||
    extractNumber(fullText, /(\d{1,2}(?:[,.]\d)?)\s*%\s*(?:MG|masse grasse|fat)/i);
  
  // --- CARDIO ---
  extract.cardio.hr_rest = findValueNearLabel(fullText, /(?:FC repos|HR repos|FCR)[:\s]*/i);
  
  extract.cardio.hr_max = findValueNearLabel(fullText, /(?:FC max|FCmax|HR max|HRmax)[:\s]*/i) ||
    extractNumber(fullText, /(?:FC|HR)\s*max[:\s]*(\d{2,3})/i);
  
  extract.cardio.hrv = findValueNearLabel(fullText, /HRV[:\s]*/i);
  
  extract.cardio.spo2 = findValueNearLabel(fullText, /SpO2[:\s]*/i) ||
    extractNumber(fullText, /SpO2[:\s]*(\d{2,3})\s*%/i);
  
  // Blood pressure
  const bpMatch = fullText.match(/(?:TA|BP|Tension)[:\s]*(\d{2,3})\s*[\/\-]\s*(\d{2,3})/i);
  if (bpMatch) {
    extract.cardio.bp_sys = parseInt(bpMatch[1]);
    extract.cardio.bp_dia = parseInt(bpMatch[2]);
  }
  
  // --- PERFORMANCE ---
  // Detect sport type
  if (/vélo|bike|cyclisme|ergomètre|tacx|neo/i.test(fullText)) {
    extract.performance.sport = "bike";
  } else if (/course|running|tapis|vma/i.test(fullText)) {
    extract.performance.sport = "run";
  } else if (/triathlon|tri|ironman/i.test(fullText)) {
    extract.performance.sport = "tri";
  }
  
  // VO2max
  extract.performance.vo2max_ml_kg_min = findValueNearLabel(fullText, /VO2\s*max[:\s]*/i) ||
    extractNumber(fullText, /VO2\s*max[:\s]*(\d{2}(?:[,.]\d)?)\s*(?:ml|mL)/i);
  
  extract.performance.vo2max_l_min = extractNumber(fullText, /VO2\s*max[:\s]*(\d(?:[,.]\d{1,2})?)\s*[Ll]\/min/i);
  
  // VMA
  extract.performance.vma_kmh = findValueNearLabel(fullText, /VMA[:\s]*/i) ||
    extractNumber(fullText, /VMA[:\s]*(\d{1,2}(?:[,.]\d)?)\s*km/i);
  
  if (extract.performance.vma_kmh) {
    extract.performance.vma_pace_sec_km = vmaToSecsPerKm(extract.performance.vma_kmh);
  }
  
  // Power metrics (bike)
  extract.performance.pmax_w = findValueNearLabel(fullText, /(?:Pmax|Puissance max)[:\s]*/i) ||
    extractNumber(fullText, /(?:Pmax|P\s*max)[:\s]*(\d{3,4})\s*[Ww]/i);
  
  extract.performance.pma_w = findValueNearLabel(fullText, /PMA[:\s]*/i) ||
    extractNumber(fullText, /PMA[:\s]*(\d{3})\s*[Ww]/i);
  
  extract.performance.ftp_w = findValueNearLabel(fullText, /FTP[:\s]*/i) ||
    extractNumber(fullText, /FTP[:\s]*(\d{3})\s*[Ww]/i);
  
  // --- THRESHOLDS ---
  // LT1 / Seuil Lactique 1
  const lt1Match = fullText.match(/(?:SL1|LT1|Seuil\s*1|Seuil\s*Lactique\s*1)[:\s]*(?:.*?)?(\d{2,3})\s*(?:bpm|FC)/i);
  if (lt1Match) {
    extract.thresholds.lt1 = {
      hr: parseInt(lt1Match[1]),
      speed_kmh: null,
      power_w: null,
      lactate: null,
    };
  }
  
  // LT2 / Seuil Lactique 2
  const lt2Match = fullText.match(/(?:SL2|LT2|Seuil\s*2|Seuil\s*Lactique\s*2)[:\s]*(?:.*?)?(\d{2,3})\s*(?:bpm|FC)/i);
  if (lt2Match) {
    extract.thresholds.lt2 = {
      hr: parseInt(lt2Match[1]),
      speed_kmh: null,
      power_w: null,
      lactate: null,
    };
  }
  
  // OBLA (4 mmol)
  const oblaMatch = fullText.match(/(?:OBLA|4\s*mmol)[:\s]*(?:.*?)?(\d{2,3})\s*(?:bpm|FC)/i);
  if (oblaMatch) {
    extract.thresholds.obla = {
      hr: parseInt(oblaMatch[1]),
      speed_kmh: null,
      power_w: null,
      lactate: 4.0,
    };
  }
  
  // --- VLamax (if explicitly mentioned) ---
  const vlamaxMatch = fullText.match(/VLamax[:\s]*(\d(?:[,.]\d{1,2})?)/i);
  if (vlamaxMatch) {
    extract.vlamax.value = parseFloat(vlamaxMatch[1].replace(",", "."));
    extract.vlamax.source = "lab";
  }
  
  // --- LACTATE ---
  extract.lactate.lactate_max = findValueNearLabel(fullText, /(?:Lactate\s*max|La\s*max)[:\s]*/i) ||
    extractNumber(fullText, /(?:Lactate|La)\s*max[:\s]*(\d{1,2}(?:[,.]\d)?)\s*mmol/i);
  
  // --- GLYCEMIA ---
  const glycemiaMin = extractNumber(fullText, /glyc[ée]mie\s*min[:\s]*(\d{1,3}(?:[,.]\d)?)/i);
  const glycemiaMax = extractNumber(fullText, /glyc[ée]mie\s*max[:\s]*(\d{1,3}(?:[,.]\d)?)/i);
  if (glycemiaMin || glycemiaMax) {
    extract.glycemia.min = glycemiaMin;
    extract.glycemia.max = glycemiaMax;
  }
  
  // --- NOTES ---
  extract.notes.push("Rapport type Quentin / SOC Brussels");
  if (extract.meta.reportDate) {
    extract.notes.push(`Date du test: ${extract.meta.reportDate}`);
  }
  
  // Calculate confidence based on extracted fields
  let fieldsFound = 0;
  let totalFields = 10;
  
  if (extract.anthropo.weight_kg) fieldsFound++;
  if (extract.cardio.hr_max) fieldsFound++;
  if (extract.performance.vo2max_ml_kg_min) fieldsFound++;
  if (extract.performance.vma_kmh || extract.performance.ftp_w) fieldsFound++;
  if (extract.thresholds.lt1 || extract.thresholds.lt2) fieldsFound++;
  if (extract.meta.reportDate) fieldsFound++;
  if (extract.performance.pmax_w || extract.performance.pma_w) fieldsFound++;
  if (extract.lactate.lactate_max) fieldsFound++;
  if (extract.cardio.hrv || extract.cardio.spo2) fieldsFound++;
  if (extract.anthropo.fat_pct) fieldsFound++;
  
  extract.meta.sourceConfidence = fieldsFound / totalFields;
  extract.meta.discipline = extract.performance.sport !== "unknown" ? extract.performance.sport : null;
  
  return extract;
}
