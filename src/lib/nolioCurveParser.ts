/**
 * Nolio Power/Pace Curve CSV Parser
 * Parses exported records from Nolio (power for cycling, pace for running)
 * 
 * CSV Format:
 * "Date","Durée","Valeur","Séance","Sport"
 * "26/01/26","5""","918 W","Sortie vélo","Vélo - Route"
 * "26/01/26","1'","350 W","FTP Test","Vélo - Home Trainer"
 * "26/01/26","1h","210 W","Sortie vélo","Vélo - Route"
 */

export type NolioSport = "bike" | "run" | "swim" | "unknown";

export interface NolioRecord {
  date: string;           // ISO format YYYY-MM-DD
  durationSec: number;    // Duration in seconds
  durationLabel: string;  // Original label (e.g. "5""", "1'", "1h")
  value: number;          // Power in W or pace in sec/km
  unit: "W" | "min/km" | "km/h";
  sessionName: string;
  sport: NolioSport;
  sportRaw: string;
}

export interface NolioCurveResult {
  records: NolioRecord[];
  sport: NolioSport;
  /** Extracted snapshot-ready values */
  extracted: NolioExtractedValues;
  /** Date of the most recent record */
  latestDate: string;
  /** Power/pace curve for charting */
  curve: { durationSec: number; durationLabel: string; value: number }[];
}

export interface NolioExtractedValues {
  // Bike
  pmax_5s?: number;
  p30s_w?: number;
  p60s_w?: number;
  map5min_w?: number;
  ftp_estimated?: number;   // From 20min * 0.95 or 30min value
  ftp_source?: string;      // "P20min×0.95" or "P30min"
  // Run
  vma?: number;             // From short efforts
  pace_threshold?: number;  // sec/km from ~20-30min effort
  // Common
  tss_7d?: number;
}

/**
 * Parse duration string from Nolio format to seconds
 * Examples: 1" → 1s, 5" → 5s, 1' → 60s, 5' → 300s, 1h → 3600s, 1h30 → 5400s
 */
function parseDuration(raw: string): { seconds: number; label: string } {
  const cleaned = raw.trim().replace(/"/g, '"').replace(/'/g, "'").replace(/"/g, '"').replace(/'/g, "'");
  const label = cleaned;
  
  // Seconds: 1", 5", 10" etc (using " or ")
  const secMatch = cleaned.match(/^(\d+)\s*[""]\s*$/);
  if (secMatch) return { seconds: parseInt(secMatch[1]), label };
  
  // Minutes: 1', 5', 12' etc
  const minMatch = cleaned.match(/^(\d+)\s*['']\s*$/);
  if (minMatch) return { seconds: parseInt(minMatch[1]) * 60, label };
  
  // Hours with minutes: 1h30, 2h15
  const hourMinMatch = cleaned.match(/^(\d+)\s*h\s*(\d+)$/i);
  if (hourMinMatch) return { seconds: parseInt(hourMinMatch[1]) * 3600 + parseInt(hourMinMatch[2]) * 60, label };
  
  // Hours only: 1h, 2h
  const hourMatch = cleaned.match(/^(\d+)\s*h$/i);
  if (hourMatch) return { seconds: parseInt(hourMatch[1]) * 3600, label };
  
  return { seconds: 0, label };
}

/**
 * Parse value string from Nolio format
 * Examples: "962 W", "4:30 min/km", "18.5 km/h", "0 W"
 */
function parseValue(raw: string): { value: number; unit: "W" | "min/km" | "km/h" } {
  const cleaned = raw.trim();
  
  // Watts: "962 W"
  const wattMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*W$/i);
  if (wattMatch) return { value: parseFloat(wattMatch[1]), unit: "W" };
  
  // Pace: "4:30 min/km" or "4:30/km"
  const paceMatch = cleaned.match(/^(\d+):(\d+)\s*(?:min\/km|\/km)$/i);
  if (paceMatch) {
    const totalSec = parseInt(paceMatch[1]) * 60 + parseInt(paceMatch[2]);
    return { value: totalSec, unit: "min/km" };
  }
  
  // Speed: "18.5 km/h"
  const speedMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*km\/h$/i);
  if (speedMatch) return { value: parseFloat(speedMatch[1]), unit: "km/h" };
  
  // Fallback: try to parse as number (assume W for bike)
  const num = parseFloat(cleaned);
  if (!isNaN(num)) return { value: num, unit: "W" };
  
  return { value: 0, unit: "W" };
}

/**
 * Detect sport from Nolio sport column
 */
function detectSport(raw: string): NolioSport {
  const lower = raw.toLowerCase();
  if (lower.includes("vélo") || lower.includes("velo") || lower.includes("bike") || lower.includes("trainer") || lower.includes("cyclisme")) return "bike";
  if (lower.includes("course") || lower.includes("run") || lower.includes("cap") || lower.includes("footing") || lower.includes("trail")) return "run";
  if (lower.includes("nat") || lower.includes("swim") || lower.includes("piscine")) return "swim";
  return "unknown";
}

/**
 * Parse Nolio date format DD/MM/YY to ISO YYYY-MM-DD
 */
function parseNolioDate(raw: string): string {
  const match = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (!match) return new Date().toISOString().slice(0, 10);
  const day = match[1];
  const month = match[2];
  let year = match[3];
  if (year.length === 2) year = `20${year}`;
  return `${year}-${month}-${day}`;
}

/**
 * Parse CSV content from Nolio export
 */
export function parseNolioCurveCSV(content: string): NolioCurveResult {
  const lines = content.trim().split("\n");
  const records: NolioRecord[] = [];
  
  // Detect if first line is header
  const firstLine = lines[0]?.toLowerCase() || "";
  const startIndex = firstLine.includes("date") || firstLine.includes("durée") || firstLine.includes("duree") ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV with quoted fields
    const fields = parseCSVLine(line);
    if (fields.length < 5) continue;
    
    const date = parseNolioDate(fields[0]);
    const { seconds, label } = parseDuration(fields[1]);
    const { value, unit } = parseValue(fields[2]);
    const sessionName = fields[3];
    const sportRaw = fields[4];
    const sport = detectSport(sportRaw);
    
    if (seconds <= 0 || value <= 0) continue;
    
    records.push({
      date,
      durationSec: seconds,
      durationLabel: label,
      value,
      unit,
      sessionName,
      sport,
      sportRaw,
    });
  }
  
  // Sort by duration
  records.sort((a, b) => a.durationSec - b.durationSec);
  
  // Determine dominant sport
  const sportCounts = records.reduce((acc, r) => {
    acc[r.sport] = (acc[r.sport] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const dominantSport = (Object.entries(sportCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown") as NolioSport;
  
  // Extract best values at key durations
  const extracted = extractSnapshotValues(records, dominantSport);
  
  // Latest date
  const latestDate = records.reduce((latest, r) => r.date > latest ? r.date : latest, records[0]?.date || new Date().toISOString().slice(0, 10));
  
  // Build curve (best value per duration, keep only sport-relevant records)
  const curveMap = new Map<number, { durationSec: number; durationLabel: string; value: number }>();
  for (const r of records) {
    if (r.sport !== dominantSport) continue;
    const existing = curveMap.get(r.durationSec);
    if (!existing || r.value > existing.value) {
      curveMap.set(r.durationSec, { durationSec: r.durationSec, durationLabel: r.durationLabel, value: r.value });
    }
  }
  const curve = Array.from(curveMap.values()).sort((a, b) => a.durationSec - b.durationSec);
  
  return { records, sport: dominantSport, extracted, latestDate, curve };
}

/**
 * Extract snapshot-ready values from records
 */
function extractSnapshotValues(records: NolioRecord[], sport: NolioSport): NolioExtractedValues {
  const vals: NolioExtractedValues = {};
  
  // Helper: get best value at or near a target duration
  const getBestAt = (targetSec: number, tolerancePct: number = 0.15): number | undefined => {
    const minSec = targetSec * (1 - tolerancePct);
    const maxSec = targetSec * (1 + tolerancePct);
    let best: number | undefined;
    for (const r of records) {
      if (r.durationSec >= minSec && r.durationSec <= maxSec) {
        if (best === undefined || r.value > best) best = r.value;
      }
    }
    return best;
  };
  
  // Get exact match
  const getExact = (targetSec: number): number | undefined => {
    let best: number | undefined;
    for (const r of records) {
      if (r.durationSec === targetSec) {
        if (best === undefined || r.value > best) best = r.value;
      }
    }
    return best;
  };
  
  if (sport === "bike") {
    // Pmax 5s
    vals.pmax_5s = getExact(5) || getBestAt(5);
    // P30s
    vals.p30s_w = getExact(30) || getBestAt(30);
    // P60s (1 min)
    vals.p60s_w = getExact(60) || getBestAt(60);
    // MAP 5min
    vals.map5min_w = getExact(300) || getBestAt(300);
    // FTP: prefer 20min * 0.95, fallback to 30min
    const p20 = getExact(1200) || getBestAt(1200);
    const p30 = getExact(1800) || getBestAt(1800);
    if (p20) {
      vals.ftp_estimated = Math.round(p20 * 0.95);
      vals.ftp_source = `P20min (${p20}W) × 0.95`;
    } else if (p30) {
      vals.ftp_estimated = Math.round(p30);
      vals.ftp_source = `P30min direct (${p30}W)`;
    }
  } else if (sport === "run") {
    // VMA from short efforts (typically pace at ~6min effort → speed)
    // For running, we'd need pace data conversion
    // Pace threshold from 20-30min
    const pace20 = getExact(1200) || getBestAt(1200);
    const pace30 = getExact(1800) || getBestAt(1800);
    if (pace20) vals.pace_threshold = pace20; // sec/km
    else if (pace30) vals.pace_threshold = pace30;
  }
  
  return vals;
}

/**
 * Parse a single CSV line handling quoted fields with commas
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === ',' || char === ';') && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  
  return fields;
}

/**
 * Format duration in seconds to human-readable label
 */
export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}"`;
  if (sec < 3600) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}'${s}"` : `${m}'`;
  }
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}
