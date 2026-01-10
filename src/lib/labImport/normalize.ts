// =============================================
// Number Normalization Utilities for Lab Import
// Handles French decimal format (comma) and unit extraction
// =============================================

/**
 * Normalizes a string number: replaces comma with dot, removes spaces and units
 */
export function normalizeNumber(str: string | null | undefined): number | null {
  if (!str) return null;
  
  // Remove common units and whitespace
  let cleaned = str
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/(W|watts?|bpm|mmol\/[lL]?|mmol|ml\/kg\/min|ml\/min\/kg|mL\/kg\/min|L\/min|l\/min|km\/h|%|mg\/dl|mg\/dL|rpm)/gi, "")
    .trim();
  
  // Handle potential ranges like "1h00-1h15" - take the first number
  if (cleaned.includes("-") && !cleaned.startsWith("-")) {
    cleaned = cleaned.split("-")[0];
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse percentage value (removes % and normalizes)
 */
export function parsePercent(str: string | null | undefined): number | null {
  if (!str) return null;
  const cleaned = str.replace(/%/g, "").replace(/,/g, ".").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse watt value (removes W and normalizes)
 */
export function parseWatt(str: string | null | undefined): number | null {
  if (!str) return null;
  const cleaned = str.replace(/W|watts?/gi, "").replace(/,/g, ".").replace(/\s+/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse BPM value (removes bpm and normalizes)
 */
export function parseBpm(str: string | null | undefined): number | null {
  if (!str) return null;
  const cleaned = str.replace(/bpm/gi, "").replace(/,/g, ".").replace(/\s+/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse mmol/L value (lactate)
 */
export function parseMmol(str: string | null | undefined): number | null {
  if (!str) return null;
  const cleaned = str.replace(/mmol(\/[lL])?/gi, "").replace(/,/g, ".").replace(/\s+/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse ml/kg/min value (VO2max relative)
 */
export function parseMlKgMin(str: string | null | undefined): number | null {
  if (!str) return null;
  const cleaned = str
    .replace(/ml\/kg\/min|ml\/min\/kg|mL\/kg\/min/gi, "")
    .replace(/,/g, ".")
    .replace(/\s+/g, "")
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse L/min value (VO2max absolute)
 */
export function parseLMin(str: string | null | undefined): number | null {
  if (!str) return null;
  const cleaned = str.replace(/[lL]\/min/gi, "").replace(/,/g, ".").replace(/\s+/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse blood pressure (e.g., "12/7" or "120/70")
 * Returns { sys, dia } or null
 */
export function parseBloodPressure(str: string | null | undefined): { sys: number; dia: number } | null {
  if (!str) return null;
  
  const match = str.match(/(\d{1,3})\s*[\/\-]\s*(\d{1,3})/);
  if (!match) return null;
  
  let sys = parseInt(match[1]);
  let dia = parseInt(match[2]);
  
  // Convert short format (12/7) to full (120/70)
  if (sys < 30) sys *= 10;
  if (dia < 15) dia *= 10;
  
  return { sys, dia };
}

// =============================================
// Value Range Validators (Garde-fous)
// =============================================

export interface ValidationRange {
  min: number;
  max: number;
}

export const VALUE_RANGES: Record<string, ValidationRange> = {
  vo2max_ml_kg_min: { min: 20, max: 90 },
  vo2max_l_min: { min: 1.5, max: 6.5 },
  hr_max: { min: 120, max: 220 },
  hr_rest: { min: 30, max: 80 },
  hrv: { min: 10, max: 150 },
  spo2: { min: 85, max: 100 },
  bp_sys: { min: 90, max: 200 },
  bp_dia: { min: 50, max: 120 },
  pma_w: { min: 100, max: 600 },
  pmax_w: { min: 200, max: 2000 },
  ftp_w: { min: 100, max: 500 },
  lactate_max: { min: 4, max: 25 },
  glycemia: { min: 40, max: 250 },
  weight_kg: { min: 35, max: 150 },
  height_cm: { min: 140, max: 220 },
  fat_pct: { min: 3, max: 40 },
  cadence_rpm: { min: 50, max: 120 },
  vma_kmh: { min: 10, max: 25 },
  // Table paliers ranges
  stage_watts: { min: 50, max: 500 },
  stage_bpm: { min: 60, max: 220 },
  stage_lactate: { min: 0.5, max: 25 },
  stage_cadence: { min: 40, max: 140 },
  stage_glycemia: { min: 40, max: 250 },
};

/**
 * Check if a value is within realistic range
 */
export function isInRange(value: number | null, rangeKey: string): boolean {
  if (value == null) return false;
  const range = VALUE_RANGES[rangeKey];
  if (!range) return true; // No range defined = accept
  return value >= range.min && value <= range.max;
}

/**
 * Get validation status for a value
 */
export function getValueStatus(
  value: number | null, 
  rangeKey: string
): "ok" | "verify" | "not_found" {
  if (value == null) return "not_found";
  return isInRange(value, rangeKey) ? "ok" : "verify";
}

// =============================================
// Debug Logging for Staff Mode
// =============================================

export interface DebugLog {
  type: "match" | "warning" | "info";
  field: string;
  message: string;
  pattern?: string;
  value?: string | number | null;
}

let debugLogs: DebugLog[] = [];
let debugMode = false;

export function setDebugMode(enabled: boolean) {
  debugMode = enabled;
  if (enabled) debugLogs = [];
}

export function isDebugMode(): boolean {
  return debugMode;
}

export function logDebug(log: DebugLog) {
  if (debugMode) {
    debugLogs.push(log);
  }
}

export function getDebugLogs(): DebugLog[] {
  return debugLogs;
}

export function clearDebugLogs() {
  debugLogs = [];
}
