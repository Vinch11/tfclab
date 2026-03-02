/**
 * Nolio Power/Pace Curve CSV Parser
 * Parses exported records from Nolio (power for cycling, pace for running)
 * 
 * CSV Format (Nolio export):
 * "Date","Durée","Valeur","Séance","Sport"
 * "26/01/26","5""","918 W","Sortie vélo","Vélo - Route"
 * "26/01/26","1'","350 W","FTP Test","Vélo - Home Trainer"
 * "26/01/26","1h","210 W","Sortie vélo","Vélo - Route"
 * 
 * IMPORTANT: Nolio uses standard CSV quoting where "" inside quotes = literal "
 * Duration 1"" inside quotes → parsed as 1" → 1 second
 */

export type NolioSport = "bike" | "run" | "swim" | "unknown";

export interface NolioRecord {
  date: string;           // ISO format YYYY-MM-DD
  durationSec: number;    // Duration in seconds
  durationLabel: string;  // Original label (e.g. "5"", "1'", "1h")
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
  /** Glycolytic profile: power decay from 1s to 30s */
  glycolyticProfile: GlycolyticProfile | null;
}

export interface NolioExtractedValues {
  // Bike — short power (glycolytic)
  pmax_1s?: number;       // Peak power 1s
  pmax_3s?: number;       // Peak power 3s
  pmax_5s?: number;       // Peak power 5s
  pmax_10s?: number;      // Peak power 10s
  pmax_15s?: number;      // Peak power 15s
  p30s_w?: number;        // Best 30s power
  p45s_w?: number;        // Best 45s power
  p60s_w?: number;        // Best 1min power
  // Bike — aerobic
  map5min_w?: number;     // MAP 5min
  ftp_estimated?: number; // From 20min * 0.95 or 30min value
  ftp_source?: string;    // "P20min×0.95" or "P30min"
  p45min_w?: number;      // Best 45min
  p60min_w?: number;      // Best 1h
  // Run
  vma?: number;           // From short efforts
  pace_threshold?: number;// sec/km from ~20-30min effort
  // Common
  tss_7d?: number;
  // Full curve for advanced analysis
  fullCurve?: { sec: number; watts: number }[];
}

/**
 * Glycolytic Profile — derived from short-duration records
 * Characterizes the athlete's anaerobic capacity
 */
export interface GlycolyticProfile {
  /** Peak 1s power (neuromuscular) */
  pmax_1s: number | null;
  /** Peak 5s power */
  pmax_5s: number | null;
  /** Peak 10s power */
  pmax_10s: number | null;
  /** P30s (glycolytic endurance) */
  p30s: number | null;
  /** Power decay rate 5s→30s (higher = more glycolytic) */
  decayRate5to30: number | null;
  /** Power decay rate 1s→5s (neuromuscular quality) */
  decayRate1to5: number | null;
  /** Glycolytic capacity index: P5s/FTP ratio */
  glycolyticIndex: number | null;
  /** Anaerobic Work Capacity estimate (kJ) from P5s→P5min decay */
  awcEstimate: number | null;
  /** Profile category */
  category: "sprinter" | "puncheur" | "rouleur" | "diesel" | "unknown";
  /** Interpretation text */
  interpretation: string;
  /** All short-power data points available */
  dataPoints: { sec: number; watts: number }[];
}

/**
 * Parse duration string from Nolio format to seconds
 * Examples: 1" → 1s, 5" → 5s, 1' → 60s, 5' → 300s, 1h → 3600s, 1h30 → 5400s
 */
function parseDuration(raw: string): { seconds: number; label: string } {
  const cleaned = raw.trim();
  const label = cleaned;
  
  // Seconds: 1", 5", 10" etc — match digit(s) + any quote-like char
  const secMatch = cleaned.match(/^(\d+)\s*[""\u201D\u2033]+\s*$/);
  if (secMatch) return { seconds: parseInt(secMatch[1]), label };
  
  // Also match bare number followed by quote variants
  const secMatch2 = cleaned.match(/^(\d+)\s*[′'']?\s*$/);
  // Only if it's clearly seconds (single or double prime)
  
  // Minutes: 1', 5', 12' etc
  const minMatch = cleaned.match(/^(\d+)\s*[''\u2032]+\s*$/);
  if (minMatch) return { seconds: parseInt(minMatch[1]) * 60, label };
  
  // Hours with minutes: 1h30, 2h15
  const hourMinMatch = cleaned.match(/^(\d+)\s*h\s*(\d+)$/i);
  if (hourMinMatch) return { seconds: parseInt(hourMinMatch[1]) * 3600 + parseInt(hourMinMatch[2]) * 60, label };
  
  // Hours only: 1h, 2h
  const hourMatch = cleaned.match(/^(\d+)\s*h$/i);
  if (hourMatch) return { seconds: parseInt(hourMatch[1]) * 3600, label };
  
  // Last resort: try to detect "number + any suffix that looks like seconds"
  const fallbackSec = cleaned.match(/^(\d+)\s*(?:s|sec|"|")\s*$/i);
  if (fallbackSec) return { seconds: parseInt(fallbackSec[1]), label };

  // Bare number — could be seconds if < 60, minutes otherwise (ambiguous)
  if (secMatch2 && !minMatch) {
    const n = parseInt(secMatch2[1]);
    if (n <= 45) return { seconds: n, label }; // Likely seconds for Nolio records
  }
  
  return { seconds: 0, label };
}

/**
 * Parse value string from Nolio format
 * Examples: "962 W", "4:30 min/km", "18.5 km/h", "0 W"
 */
function parseValue(raw: string): { value: number; unit: "W" | "min/km" | "km/h" } {
  const cleaned = raw.trim();
  
  // Watts: "962 W"
  const wattMatch = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*W$/i);
  if (wattMatch) return { value: parseFloat(wattMatch[1].replace(",", ".")), unit: "W" };
  
  // Pace: "4:30 min/km" or "4:30/km"
  const paceMatch = cleaned.match(/^(\d+):(\d+)\s*(?:min\/km|\/km)$/i);
  if (paceMatch) {
    const totalSec = parseInt(paceMatch[1]) * 60 + parseInt(paceMatch[2]);
    return { value: totalSec, unit: "min/km" };
  }
  
  // Speed: "18.5 km/h"
  const speedMatch = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*km\/h$/i);
  if (speedMatch) return { value: parseFloat(speedMatch[1].replace(",", ".")), unit: "km/h" };
  
  // Fallback: try to parse as number (assume W for bike)
  const num = parseFloat(cleaned.replace(",", "."));
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
 * Parse a single CSV line handling RFC 4180 quoted fields
 * Properly handles escaped quotes: "" → "
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  
  while (i < line.length) {
    // Skip leading whitespace
    while (i < line.length && line[i] === ' ') i++;
    
    if (i >= line.length) {
      fields.push("");
      break;
    }
    
    if (line[i] === '"') {
      // Quoted field — collect until closing quote
      i++; // skip opening quote
      let field = "";
      while (i < line.length) {
        if (line[i] === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            // Escaped quote: "" → literal "
            field += '"';
            i += 2;
          } else {
            // End of quoted field
            i++; // skip closing quote
            break;
          }
        } else {
          field += line[i];
          i++;
        }
      }
      fields.push(field);
      // Skip delimiter after quoted field
      if (i < line.length && (line[i] === ',' || line[i] === ';')) i++;
    } else {
      // Unquoted field
      let field = "";
      while (i < line.length && line[i] !== ',' && line[i] !== ';') {
        field += line[i];
        i++;
      }
      fields.push(field.trim());
      if (i < line.length) i++; // skip delimiter
    }
  }
  
  return fields;
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
    
    // Parse CSV with quoted fields (RFC 4180 compliant)
    const fields = parseCSVLine(line);
    if (fields.length < 3) continue; // At minimum: date, duration, value
    
    const date = parseNolioDate(fields[0]);
    const { seconds, label } = parseDuration(fields[1]);
    const { value, unit } = parseValue(fields[2]);
    const sessionName = fields.length > 3 ? fields[3] : "";
    const sportRaw = fields.length > 4 ? fields[4] : "";
    const sport = sportRaw ? detectSport(sportRaw) : "bike"; // Default to bike if no sport column
    
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
  
  // Build glycolytic profile from short-duration records
  const glycolyticProfile = dominantSport === "bike" ? buildGlycolyticProfile(extracted, curve) : null;
  
  return { records, sport: dominantSport, extracted, latestDate, curve, glycolyticProfile };
}

/**
 * Extract snapshot-ready values from records — ALL durations
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
  
  // Get exact match first, fallback to tolerance
  const getExactOrBest = (targetSec: number): number | undefined => {
    let exact: number | undefined;
    for (const r of records) {
      if (r.durationSec === targetSec) {
        if (exact === undefined || r.value > exact) exact = r.value;
      }
    }
    return exact ?? getBestAt(targetSec);
  };
  
  if (sport === "bike") {
    // === GLYCOLYTIC / SHORT POWER ===
    vals.pmax_1s = getExactOrBest(1);
    vals.pmax_3s = getExactOrBest(3);
    vals.pmax_5s = getExactOrBest(5);
    vals.pmax_10s = getExactOrBest(10);
    vals.pmax_15s = getExactOrBest(15);
    vals.p30s_w = getExactOrBest(30);
    vals.p45s_w = getExactOrBest(45);
    vals.p60s_w = getExactOrBest(60);
    
    // === AEROBIC / THRESHOLD ===
    vals.map5min_w = getExactOrBest(300);
    
    // FTP: prefer 20min * 0.95, fallback to 30min
    const p20 = getExactOrBest(1200);
    const p30 = getExactOrBest(1800);
    const p45 = getExactOrBest(2700);
    const p60 = getExactOrBest(3600);
    
    if (p20) {
      vals.ftp_estimated = Math.round(p20 * 0.95);
      vals.ftp_source = `P20' (${p20}W) × 0.95`;
    } else if (p30) {
      vals.ftp_estimated = Math.round(p30);
      vals.ftp_source = `P30' direct (${p30}W)`;
    }
    
    vals.p45min_w = p45;
    vals.p60min_w = p60;
    
    // Build full curve for advanced analysis
    const fullCurve: { sec: number; watts: number }[] = [];
    for (const r of records) {
      if (r.sport === sport && r.unit === "W" && r.value > 0) {
        fullCurve.push({ sec: r.durationSec, watts: r.value });
      }
    }
    vals.fullCurve = fullCurve.sort((a, b) => a.sec - b.sec);
    
  } else if (sport === "run") {
    // Running records
    const pace20 = getExactOrBest(1200);
    const pace30 = getExactOrBest(1800);
    if (pace20) vals.pace_threshold = pace20;
    else if (pace30) vals.pace_threshold = pace30;
    
    // VMA estimation from 6-8min effort (if pace data)
    const pace6 = getExactOrBest(360);
    if (pace6 && records[0]?.unit === "km/h") {
      vals.vma = pace6;
    }
  }
  
  return vals;
}

/**
 * Build glycolytic profile from extracted short-power data
 */
function buildGlycolyticProfile(
  extracted: NolioExtractedValues, 
  curve: { durationSec: number; value: number }[]
): GlycolyticProfile {
  const p1 = extracted.pmax_1s ?? null;
  const p5 = extracted.pmax_5s ?? null;
  const p10 = extracted.pmax_10s ?? null;
  const p30 = extracted.p30s_w ?? null;
  const ftp = extracted.ftp_estimated ?? null;
  
  // Collect all short-power data points (≤ 60s)
  const dataPoints = curve
    .filter(p => p.durationSec <= 60 && p.value > 0)
    .map(p => ({ sec: p.durationSec, watts: p.value }));
  
  // Decay rate 5s → 30s: percentage of power lost per second
  let decayRate5to30: number | null = null;
  if (p5 && p30 && p5 > 0) {
    decayRate5to30 = ((p5 - p30) / p5) * 100; // % of P5s lost by 30s
  }
  
  // Decay rate 1s → 5s: neuromuscular quality
  let decayRate1to5: number | null = null;
  if (p1 && p5 && p1 > 0) {
    decayRate1to5 = ((p1 - p5) / p1) * 100;
  }
  
  // Glycolytic index: P5s / FTP
  let glycolyticIndex: number | null = null;
  if (p5 && ftp && ftp > 0) {
    glycolyticIndex = p5 / ftp;
  }
  
  // AWC estimate: integral of (power - FTP) for short durations
  let awcEstimate: number | null = null;
  if (ftp && dataPoints.length >= 3) {
    let awcKj = 0;
    for (let i = 0; i < dataPoints.length - 1; i++) {
      const dt = dataPoints[i + 1].sec - dataPoints[i].sec;
      const avgPower = (dataPoints[i].watts + dataPoints[i + 1].watts) / 2;
      if (avgPower > ftp) {
        awcKj += (avgPower - ftp) * dt / 1000; // Convert J to kJ
      }
    }
    if (awcKj > 0) awcEstimate = Math.round(awcKj * 10) / 10;
  }
  
  // Profile category
  let category: GlycolyticProfile["category"] = "unknown";
  let interpretation = "";
  
  if (glycolyticIndex !== null) {
    if (glycolyticIndex >= 4.0) {
      category = "sprinter";
      interpretation = "Profil très glycolytique (sprinter). Capacité anaérobie dominante. VLamax probablement élevée (> 0.60).";
    } else if (glycolyticIndex >= 3.2) {
      category = "puncheur";
      interpretation = "Profil puncheur. Bon compromis puissance/endurance. VLamax modérée à haute (0.45-0.60).";
    } else if (glycolyticIndex >= 2.4) {
      category = "rouleur";
      interpretation = "Profil rouleur. Bonne efficacité aérobie avec puissance correcte. VLamax modérée (0.35-0.50).";
    } else {
      category = "diesel";
      interpretation = "Profil diesel/aérobie dominant. Faible ratio anaérobie/aérobie. VLamax probablement basse (< 0.40).";
    }
  }
  
  if (decayRate5to30 !== null) {
    if (decayRate5to30 < 35) {
      interpretation += " Faible décroissance 5s→30s = bonne capacité glycolytique soutenue.";
    } else if (decayRate5to30 > 50) {
      interpretation += " Forte décroissance 5s→30s = capacité glycolytique limitée en endurance.";
    }
  }
  
  return {
    pmax_1s: p1,
    pmax_5s: p5,
    pmax_10s: p10,
    p30s: p30,
    decayRate5to30,
    decayRate1to5,
    glycolyticIndex,
    awcEstimate,
    category,
    interpretation: interpretation.trim(),
    dataPoints,
  };
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
