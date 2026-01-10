// =============================================
// Parser for Mika / Cosmed Quark reports
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
 * Check if text matches Mika/Cosmed report format
 */
export function isMikaReport(textByPage: string[]): boolean {
  const fullText = textByPage.join(" ").toLowerCase();
  
  const markers = [
    "cosmed", "quark", "obla", "économie de course",
    "running economy", "vma absolue", "résumé résultats",
    "mika", "analyse métabolique"
  ];
  
  let matchCount = 0;
  for (const marker of markers) {
    if (fullText.includes(marker)) {
      matchCount++;
    }
  }
  
  // Need at least 2 markers to identify as Mika report
  return matchCount >= 2;
}

/**
 * Parse Mika / Cosmed Quark report
 */
export function parseMikaReport(textByPage: string[]): LabExtract {
  const extract = createEmptyLabExtract();
  extract.meta.reportType = "mika";
  extract.raw.textPages = textByPage;
  extract.raw.usedOcr = false;
  
  const fullText = textByPage.join("\n");
  const normalizedText = normalizeText(fullText);
  
  // Extract date
  extract.meta.reportDate = extractDate(fullText);
  
  // Extract athlete name
  const nameMatch = fullText.match(/(?:Nom|Patient|Sujet|Athlète)[:\s]*([A-Za-zÀ-ÿ\s]+?)(?:\n|Date|Âge|Sexe|Né)/i);
  if (nameMatch) {
    extract.meta.athleteName = nameMatch[1].trim();
  }
  
  // --- ANTHROPO ---
  extract.anthropo.weight_kg = findValueNearLabel(fullText, /(?:Poids|Weight)[:\s]*/i) ||
    extractNumber(fullText, /(\d{2,3}(?:[,.]\d)?)\s*kg/i);
  
  extract.anthropo.height_cm = findValueNearLabel(fullText, /(?:Taille|Height)[:\s]*/i) ||
    extractNumber(fullText, /(\d{3})\s*cm/i) ||
    extractNumber(fullText, /[12][,.]\d{2}\s*m/i); // Height in meters
  
  // Convert meters to cm if needed
  if (extract.anthropo.height_cm && extract.anthropo.height_cm < 3) {
    extract.anthropo.height_cm = Math.round(extract.anthropo.height_cm * 100);
  }
  
  extract.anthropo.fat_pct = findValueNearLabel(fullText, /(?:masse grasse|body fat|MG|%\s*fat)[:\s]*/i) ||
    extractNumber(fullText, /(\d{1,2}(?:[,.]\d)?)\s*%\s*(?:MG|fat|masse)/i);
  
  extract.anthropo.bmi = findValueNearLabel(fullText, /(?:BMI|IMC)[:\s]*/i);
  
  // --- CARDIO ---
  extract.cardio.hr_max = findValueNearLabel(fullText, /(?:FC\s*max|FCmax|HR\s*max|HRmax)[:\s]*/i) ||
    extractNumber(fullText, /(?:FC|HR)\s*(?:max|maximale)[:\s]*(\d{2,3})/i);
  
  extract.cardio.hr_rest = findValueNearLabel(fullText, /(?:FC\s*repos|FCR|HR\s*rest)[:\s]*/i);
  
  // --- PERFORMANCE ---
  // Mika reports are typically running-focused
  extract.performance.sport = "run";
  
  // VO2max - multiple formats
  extract.performance.vo2max_ml_kg_min = 
    findValueNearLabel(fullText, /VO2\s*max[:\s]*/i) ||
    extractNumber(fullText, /VO2\s*(?:max|peak)[:\s]*(\d{2}(?:[,.]\d)?)\s*(?:ml|mL)/i) ||
    extractNumber(fullText, /(\d{2}(?:[,.]\d)?)\s*ml[\/\.]kg[\/\.]min/i);
  
  extract.performance.vo2max_l_min = 
    extractNumber(fullText, /VO2\s*(?:max|peak)[:\s]*(\d(?:[,.]\d{1,2})?)\s*[Ll]\/min/i);
  
  // VMA
  extract.performance.vma_kmh = 
    findValueNearLabel(fullText, /VMA(?:\s*absolue)?[:\s]*/i) ||
    extractNumber(fullText, /VMA(?:\s*absolue)?[:\s]*(\d{1,2}(?:[,.]\d)?)\s*km/i) ||
    extractNumber(fullText, /Vitesse\s*maximale[:\s]*(\d{1,2}(?:[,.]\d)?)\s*km/i);
  
  if (extract.performance.vma_kmh) {
    extract.performance.vma_pace_sec_km = vmaToSecsPerKm(extract.performance.vma_kmh);
  }
  
  // --- THRESHOLDS ---
  // Seuil 1 / LT1
  const sl1VitMatch = fullText.match(/(?:Seuil\s*1|SL1|LT1|VT1)[:\s]*(?:.*?)?(\d{1,2}(?:[,.]\d)?)\s*km/i);
  const sl1HrMatch = fullText.match(/(?:Seuil\s*1|SL1|LT1|VT1)[:\s]*(?:.*?)?(\d{2,3})\s*(?:bpm|FC)/i);
  if (sl1VitMatch || sl1HrMatch) {
    extract.thresholds.lt1 = {
      hr: sl1HrMatch ? parseInt(sl1HrMatch[1]) : null,
      speed_kmh: sl1VitMatch ? parseFloat(sl1VitMatch[1].replace(",", ".")) : null,
      power_w: null,
      lactate: null,
    };
  }
  
  // OBLA (4 mmol threshold - key for Mika reports)
  const oblaVitMatch = fullText.match(/OBLA[:\s]*(?:.*?)?(\d{1,2}(?:[,.]\d)?)\s*km/i);
  const oblaHrMatch = fullText.match(/OBLA[:\s]*(?:.*?)?(\d{2,3})\s*(?:bpm|FC)/i);
  const oblaLacMatch = fullText.match(/OBLA[:\s]*(?:.*?)?(\d(?:[,.]\d)?)\s*mmol/i);
  if (oblaVitMatch || oblaHrMatch) {
    extract.thresholds.obla = {
      hr: oblaHrMatch ? parseInt(oblaHrMatch[1]) : null,
      speed_kmh: oblaVitMatch ? parseFloat(oblaVitMatch[1].replace(",", ".")) : null,
      power_w: null,
      lactate: oblaLacMatch ? parseFloat(oblaLacMatch[1].replace(",", ".")) : 4.0,
    };
  }
  
  // LT2 / Seuil 2
  const sl2VitMatch = fullText.match(/(?:Seuil\s*2|SL2|LT2|VT2)[:\s]*(?:.*?)?(\d{1,2}(?:[,.]\d)?)\s*km/i);
  const sl2HrMatch = fullText.match(/(?:Seuil\s*2|SL2|LT2|VT2)[:\s]*(?:.*?)?(\d{2,3})\s*(?:bpm|FC)/i);
  if (sl2VitMatch || sl2HrMatch) {
    extract.thresholds.lt2 = {
      hr: sl2HrMatch ? parseInt(sl2HrMatch[1]) : null,
      speed_kmh: sl2VitMatch ? parseFloat(sl2VitMatch[1].replace(",", ".")) : null,
      power_w: null,
      lactate: null,
    };
  }
  
  // --- RUNNING ECONOMY ---
  const economyMatch = fullText.match(/[eé]conomie\s*(?:de\s*)?course[:\s]*(\d{2,3}(?:[,.]\d)?)/i) ||
    fullText.match(/running\s*economy[:\s]*(\d{2,3}(?:[,.]\d)?)/i) ||
    fullText.match(/(\d{2,3}(?:[,.]\d)?)\s*ml[\/\.]kg[\/\.]km/i);
  
  if (economyMatch) {
    extract.economy.running_cost_ml_kg_km = parseFloat(economyMatch[1].replace(",", "."));
  }
  
  // --- VLamax (if explicitly mentioned) ---
  const vlamaxMatch = fullText.match(/VLamax[:\s]*(\d(?:[,.]\d{1,2})?)/i);
  if (vlamaxMatch) {
    extract.vlamax.value = parseFloat(vlamaxMatch[1].replace(",", "."));
    extract.vlamax.source = "lab";
  }
  
  // --- LACTATE ---
  extract.lactate.lactate_max = 
    findValueNearLabel(fullText, /(?:Lactate\s*max|La\s*max|Lactatémie\s*max)[:\s]*/i) ||
    extractNumber(fullText, /(?:Lactate|La(?:ctat[ée]mie)?)\s*max[:\s]*(\d{1,2}(?:[,.]\d)?)/i);
  
  // --- NOTES ---
  extract.notes.push("Rapport type Mika / Cosmed Quark");
  if (extract.economy.running_cost_ml_kg_km) {
    extract.notes.push(`Économie de course: ${extract.economy.running_cost_ml_kg_km} ml/kg/km`);
  }
  if (extract.meta.reportDate) {
    extract.notes.push(`Date du test: ${extract.meta.reportDate}`);
  }
  
  // Calculate confidence
  let fieldsFound = 0;
  let totalFields = 10;
  
  if (extract.anthropo.weight_kg) fieldsFound++;
  if (extract.anthropo.height_cm) fieldsFound++;
  if (extract.cardio.hr_max) fieldsFound++;
  if (extract.performance.vo2max_ml_kg_min) fieldsFound++;
  if (extract.performance.vma_kmh) fieldsFound++;
  if (extract.thresholds.lt1 || extract.thresholds.obla) fieldsFound++;
  if (extract.meta.reportDate) fieldsFound++;
  if (extract.economy.running_cost_ml_kg_km) fieldsFound++;
  if (extract.lactate.lactate_max) fieldsFound++;
  if (extract.anthropo.fat_pct) fieldsFound++;
  
  extract.meta.sourceConfidence = fieldsFound / totalFields;
  extract.meta.discipline = "run";
  
  return extract;
}
