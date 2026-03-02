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
export type NolioAxisType = "duration" | "distance";

export interface NolioRecord {
  date: string;           // ISO format YYYY-MM-DD
  durationSec: number;    // Duration in seconds (0 if distance-based only)
  durationLabel: string;  // Original label (e.g. "5"", "1'", "1h")
  distanceM: number;      // Distance in meters (0 if duration-based only)
  distanceLabel: string;  // Original label (e.g. "400 m", "1 km")
  axisType: NolioAxisType; // Whether record is time-based or distance-based
  value: number;          // Power in W or pace in sec/km
  valueSpeed: number | null; // Speed in km/h (if available from combined format)
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
  /** Power/pace curve for charting (time-based) */
  curve: { durationSec: number; durationLabel: string; value: number }[];
  /** Distance-based curve for charting */
  distanceCurve: { distanceM: number; distanceLabel: string; value: number; unit: string }[];
  /** Glycolytic profile: power decay from 1s to 30s */
  glycolyticProfile: GlycolyticProfile | null;
  /** Types of data imported */
  axisTypes: NolioAxisType[];
  /** Data types found: "power", "pace", "speed" */
  dataTypes: string[];
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
  // Run — pace/speed
  vma?: number;           // VMA in km/h from best short effort speed
  pace_threshold?: number;// sec/km from ~20-30min effort
  pace_5k?: number;       // sec/km at 5km
  pace_10k?: number;      // sec/km at 10km
  speed_max_30s?: number; // km/h best 30s
  speed_max_1min?: number;// km/h best 1min
  speed_6min?: number;    // km/h at 6min (VMA proxy)
  // Run — power
  run_power_max?: number;     // Best 1s running power
  run_power_5s?: number;      // Best 5s running power
  run_power_30s?: number;     // Best 30s running power
  run_power_1min?: number;    // Best 1min running power
  run_power_5min?: number;    // Best 5min running power
  run_power_threshold?: number; // Running power at threshold (~20-30min)
  run_power_60min?: number;   // Best 60min running power
  // Run — distance-based records
  distanceCurve?: { distanceM: number; distanceLabel: string; paceSecKm: number; speedKmh: number }[];
  distancePowerCurve?: { distanceM: number; distanceLabel: string; watts: number }[];
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
 * Parse distance string from Nolio format to meters
 * Examples: "400 m" → 400, "1 km" → 1000, "1.5 km" → 1500, "3.2 km" → 3200
 */
function parseDistance(raw: string): { meters: number; label: string } {
  const cleaned = raw.trim();
  const label = cleaned;
  
  // Kilometers: "1 km", "1.5 km", "3.2 km"
  const kmMatch = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*km$/i);
  if (kmMatch) return { meters: parseFloat(kmMatch[1].replace(",", ".")) * 1000, label };
  
  // Meters: "400 m", "800 m"
  const mMatch = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*m$/i);
  if (mMatch) return { meters: parseFloat(mMatch[1].replace(",", ".")), label };
  
  return { meters: 0, label };
}

/**
 * Parse value string from Nolio format
 * Supports: "962 W", "4:30 min/km", "18.5 km/h", "3,09 min/km - 19,08 km/h" (combined)
 */
function parseValue(raw: string): { value: number; unit: "W" | "min/km" | "km/h"; speed: number | null } {
  const cleaned = raw.trim();
  
  // Combined format: "3,09 min/km - 19,08 km/h"
  const combinedMatch = cleaned.match(/^(\d+)[,.](\d+)\s*min\/km\s*-\s*(\d+(?:[.,]\d+)?)\s*km\/h$/i);
  if (combinedMatch) {
    const paceMin = parseInt(combinedMatch[1]);
    const paceSec = parseInt(combinedMatch[2]);
    const totalPaceSec = paceMin * 60 + paceSec;
    const speedKmh = parseFloat(combinedMatch[3].replace(",", "."));
    return { value: totalPaceSec, unit: "min/km", speed: speedKmh };
  }
  
  // Watts: "962 W"
  const wattMatch = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*W$/i);
  if (wattMatch) return { value: parseFloat(wattMatch[1].replace(",", ".")), unit: "W", speed: null };
  
  // Pace: "4:30 min/km" or "4:30/km"
  const paceMatch = cleaned.match(/^(\d+):(\d+)\s*(?:min\/km|\/km)$/i);
  if (paceMatch) {
    const totalSec = parseInt(paceMatch[1]) * 60 + parseInt(paceMatch[2]);
    return { value: totalSec, unit: "min/km", speed: null };
  }
  
  // Pace with comma: "3,09 min/km" (without speed)
  const paceCommaMatch = cleaned.match(/^(\d+)[,.](\d+)\s*min\/km$/i);
  if (paceCommaMatch) {
    const totalSec = parseInt(paceCommaMatch[1]) * 60 + parseInt(paceCommaMatch[2]);
    return { value: totalSec, unit: "min/km", speed: null };
  }
  
  // Speed: "18.5 km/h"
  const speedMatch = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*km\/h$/i);
  if (speedMatch) return { value: parseFloat(speedMatch[1].replace(",", ".")), unit: "km/h", speed: parseFloat(speedMatch[1].replace(",", ".")) };
  
  // Fallback: try to parse as number (assume W for bike)
  const num = parseFloat(cleaned.replace(",", "."));
  if (!isNaN(num)) return { value: num, unit: "W", speed: null };
  
  return { value: 0, unit: "W", speed: null };
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
 * Supports both "Durée" (duration) and "Distance" columns
 */
export function parseNolioCurveCSV(content: string): NolioCurveResult {
  const lines = content.trim().split("\n");
  const records: NolioRecord[] = [];
  
  // Detect header and column type
  const firstLine = lines[0]?.toLowerCase() || "";
  const hasHeader = firstLine.includes("date") || firstLine.includes("durée") || firstLine.includes("duree") || firstLine.includes("distance");
  const startIndex = hasHeader ? 1 : 0;
  
  // Detect if axis is distance or duration from header
  const isDistanceAxis = firstLine.includes("distance") && !firstLine.includes("durée") && !firstLine.includes("duree");
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const fields = parseCSVLine(line);
    if (fields.length < 3) continue;
    
    const date = parseNolioDate(fields[0]);
    const { value, unit, speed } = parseValue(fields[2]);
    const sessionName = fields.length > 3 ? fields[3] : "";
    const sportRaw = fields.length > 4 ? fields[4] : "";
    const sport = sportRaw ? detectSport(sportRaw) : "bike";
    
    let durationSec = 0;
    let durationLabel = "";
    let distanceM = 0;
    let distanceLabel = "";
    let axisType: NolioAxisType = "duration";
    
    if (isDistanceAxis) {
      const dist = parseDistance(fields[1]);
      distanceM = dist.meters;
      distanceLabel = dist.label;
      axisType = "distance";
      if (distanceM <= 0 || value <= 0) continue;
    } else {
      const dur = parseDuration(fields[1]);
      durationSec = dur.seconds;
      durationLabel = dur.label;
      axisType = "duration";
      if (durationSec <= 0 || value <= 0) continue;
    }
    
    records.push({
      date,
      durationSec,
      durationLabel,
      distanceM,
      distanceLabel,
      axisType,
      value,
      valueSpeed: speed,
      unit,
      sessionName,
      sport,
      sportRaw,
    });
  }
  
  // Sort appropriately
  const durationRecords = records.filter(r => r.axisType === "duration");
  const distanceRecords = records.filter(r => r.axisType === "distance");
  durationRecords.sort((a, b) => a.durationSec - b.durationSec);
  distanceRecords.sort((a, b) => a.distanceM - b.distanceM);
  const allRecords = [...durationRecords, ...distanceRecords];
  
  // Determine dominant sport
  const sportCounts = allRecords.reduce((acc, r) => {
    acc[r.sport] = (acc[r.sport] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const dominantSport = (Object.entries(sportCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown") as NolioSport;
  
  // Extract best values at key durations/distances
  const extracted = extractSnapshotValues(allRecords, dominantSport);
  
  // Latest date
  const latestDate = allRecords.reduce((latest, r) => r.date > latest ? r.date : latest, allRecords[0]?.date || new Date().toISOString().slice(0, 10));
  
  // Build time-based curve (best value per duration)
  const curveMap = new Map<number, { durationSec: number; durationLabel: string; value: number }>();
  for (const r of durationRecords) {
    if (r.sport !== dominantSport) continue;
    const existing = curveMap.get(r.durationSec);
    if (!existing || r.value > existing.value) {
      curveMap.set(r.durationSec, { durationSec: r.durationSec, durationLabel: r.durationLabel, value: r.value });
    }
  }
  const curve = Array.from(curveMap.values()).sort((a, b) => a.durationSec - b.durationSec);
  
  // Build distance-based curve
  const distCurveMap = new Map<number, { distanceM: number; distanceLabel: string; value: number; unit: string }>();
  for (const r of distanceRecords) {
    if (r.sport !== dominantSport) continue;
    const existing = distCurveMap.get(r.distanceM);
    if (!existing || r.value > existing.value) {
      distCurveMap.set(r.distanceM, { distanceM: r.distanceM, distanceLabel: r.distanceLabel, value: r.value, unit: r.unit });
    }
  }
  const distanceCurve = Array.from(distCurveMap.values()).sort((a, b) => a.distanceM - b.distanceM);
  
  // Build glycolytic profile from short-duration records (bike or run power)
  const glycolyticProfile = (dominantSport === "bike" || (dominantSport === "run" && durationRecords.some(r => r.unit === "W")))
    ? buildGlycolyticProfile(extracted, curve)
    : null;
  
  // Axis types and data types found
  const axisTypes = [...new Set(allRecords.map(r => r.axisType))];
  const dataTypes: string[] = [];
  if (allRecords.some(r => r.unit === "W")) dataTypes.push("power");
  if (allRecords.some(r => r.unit === "min/km")) dataTypes.push("pace");
  if (allRecords.some(r => r.unit === "km/h" || r.valueSpeed != null)) dataTypes.push("speed");
  
  return { records: allRecords, sport: dominantSport, extracted, latestDate, curve, distanceCurve, glycolyticProfile, axisTypes, dataTypes };
}

/**
 * Merge multiple NolioCurveResult into one combined result
 */
export function mergeNolioCurveResults(results: NolioCurveResult[]): NolioCurveResult {
  if (results.length === 0) return { records: [], sport: "unknown", extracted: {}, latestDate: new Date().toISOString().slice(0, 10), curve: [], distanceCurve: [], glycolyticProfile: null, axisTypes: [], dataTypes: [] };
  if (results.length === 1) return results[0];
  
  const allRecords = results.flatMap(r => r.records);
  // Re-parse as combined content is complex — rebuild from all records
  const sportCounts = allRecords.reduce((acc, r) => {
    acc[r.sport] = (acc[r.sport] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const dominantSport = (Object.entries(sportCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown") as NolioSport;
  
  const durationRecords = allRecords.filter(r => r.axisType === "duration");
  const distanceRecords = allRecords.filter(r => r.axisType === "distance");
  
  const extracted = extractSnapshotValues(allRecords, dominantSport);
  const latestDate = allRecords.reduce((latest, r) => r.date > latest ? r.date : latest, allRecords[0]?.date || new Date().toISOString().slice(0, 10));
  
  // Build time-based curve (best per duration, prefer power for run if available)
  const curveMap = new Map<number, { durationSec: number; durationLabel: string; value: number }>();
  for (const r of durationRecords) {
    if (r.sport !== dominantSport) continue;
    const existing = curveMap.get(r.durationSec);
    if (!existing || r.value > existing.value) {
      curveMap.set(r.durationSec, { durationSec: r.durationSec, durationLabel: r.durationLabel, value: r.value });
    }
  }
  const curve = Array.from(curveMap.values()).sort((a, b) => a.durationSec - b.durationSec);
  
  const distCurveMap = new Map<number, { distanceM: number; distanceLabel: string; value: number; unit: string }>();
  for (const r of distanceRecords) {
    if (r.sport !== dominantSport) continue;
    const existing = distCurveMap.get(r.distanceM);
    if (!existing || r.value > existing.value) {
      distCurveMap.set(r.distanceM, { distanceM: r.distanceM, distanceLabel: r.distanceLabel, value: r.value, unit: r.unit });
    }
  }
  const distanceCurve = Array.from(distCurveMap.values()).sort((a, b) => a.distanceM - b.distanceM);
  
  const glycolyticProfile = (dominantSport === "bike" || (dominantSport === "run" && durationRecords.some(r => r.unit === "W")))
    ? buildGlycolyticProfile(extracted, curve)
    : null;
  
  const axisTypes = [...new Set(allRecords.map(r => r.axisType))] as NolioAxisType[];
  const dataTypes: string[] = [];
  if (allRecords.some(r => r.unit === "W")) dataTypes.push("power");
  if (allRecords.some(r => r.unit === "min/km")) dataTypes.push("pace");
  if (allRecords.some(r => r.unit === "km/h" || r.valueSpeed != null)) dataTypes.push("speed");
  
  return { records: allRecords, sport: dominantSport, extracted, latestDate, curve, distanceCurve, glycolyticProfile, axisTypes, dataTypes };
}

/**
 * Extract snapshot-ready values from records — ALL durations
 */
function extractSnapshotValues(records: NolioRecord[], sport: NolioSport): NolioExtractedValues {
  const vals: NolioExtractedValues = {};
  
  const durationRecs = records.filter(r => r.axisType === "duration");
  const distanceRecs = records.filter(r => r.axisType === "distance");
  
  // Helper: get best value at or near a target duration, optionally filtering by unit
  const getBestDurationAt = (targetSec: number, unitFilter?: "W" | "min/km" | "km/h", tolerancePct: number = 0.15): number | undefined => {
    const minSec = targetSec * (1 - tolerancePct);
    const maxSec = targetSec * (1 + tolerancePct);
    let best: number | undefined;
    for (const r of durationRecs) {
      if (unitFilter && r.unit !== unitFilter) continue;
      if (r.durationSec >= minSec && r.durationSec <= maxSec) {
        if (best === undefined || r.value > best) best = r.value;
      }
    }
    return best;
  };
  
  const getExactOrBestDuration = (targetSec: number, unitFilter?: "W" | "min/km" | "km/h"): number | undefined => {
    let exact: number | undefined;
    for (const r of durationRecs) {
      if (unitFilter && r.unit !== unitFilter) continue;
      if (r.durationSec === targetSec) {
        if (exact === undefined || r.value > exact) exact = r.value;
      }
    }
    return exact ?? getBestDurationAt(targetSec, unitFilter);
  };
  
  // Helper: get best value at a target distance
  const getBestDistanceAt = (targetM: number, unitFilter?: "W" | "min/km" | "km/h", tolerancePct: number = 0.10): number | undefined => {
    const minM = targetM * (1 - tolerancePct);
    const maxM = targetM * (1 + tolerancePct);
    let best: number | undefined;
    for (const r of distanceRecs) {
      if (unitFilter && r.unit !== unitFilter) continue;
      if (r.distanceM >= minM && r.distanceM <= maxM) {
        if (best === undefined || (unitFilter === "W" ? r.value > best : r.value < best)) best = r.value;
      }
    }
    return best;
  };
  
  // Helper: get speed at a target duration (from valueSpeed or unit)
  const getSpeedAt = (targetSec: number, tolerancePct: number = 0.15): number | undefined => {
    const minSec = targetSec * (1 - tolerancePct);
    const maxSec = targetSec * (1 + tolerancePct);
    let best: number | undefined;
    for (const r of durationRecs) {
      if (r.durationSec >= minSec && r.durationSec <= maxSec) {
        const spd = r.valueSpeed ?? (r.unit === "km/h" ? r.value : null);
        if (spd && (best === undefined || spd > best)) best = spd;
      }
    }
    return best;
  };
  
  if (sport === "bike") {
    // === GLYCOLYTIC / SHORT POWER ===
    vals.pmax_1s = getExactOrBestDuration(1);
    vals.pmax_3s = getExactOrBestDuration(3);
    vals.pmax_5s = getExactOrBestDuration(5);
    vals.pmax_10s = getExactOrBestDuration(10);
    vals.pmax_15s = getExactOrBestDuration(15);
    vals.p30s_w = getExactOrBestDuration(30);
    vals.p45s_w = getExactOrBestDuration(45);
    vals.p60s_w = getExactOrBestDuration(60);
    
    vals.map5min_w = getExactOrBestDuration(300);
    const p20 = getExactOrBestDuration(1200);
    const p30 = getExactOrBestDuration(1800);
    const p45 = getExactOrBestDuration(2700);
    const p60 = getExactOrBestDuration(3600);
    
    if (p20) {
      vals.ftp_estimated = Math.round(p20 * 0.95);
      vals.ftp_source = `P20' (${p20}W) × 0.95`;
    } else if (p30) {
      vals.ftp_estimated = Math.round(p30);
      vals.ftp_source = `P30' direct (${p30}W)`;
    }
    vals.p45min_w = p45;
    vals.p60min_w = p60;
    
    const fullCurve: { sec: number; watts: number }[] = [];
    for (const r of durationRecs) {
      if (r.sport === sport && r.unit === "W" && r.value > 0) {
        fullCurve.push({ sec: r.durationSec, watts: r.value });
      }
    }
    vals.fullCurve = fullCurve.sort((a, b) => a.sec - b.sec);
    
  } else if (sport === "run") {
    // === RUNNING POWER (duration-based) ===
    vals.run_power_max = getExactOrBestDuration(1, "W");
    vals.run_power_5s = getExactOrBestDuration(5, "W");
    vals.run_power_30s = getExactOrBestDuration(30, "W");
    vals.run_power_1min = getExactOrBestDuration(60, "W");
    vals.run_power_5min = getExactOrBestDuration(300, "W");
    const runP20 = getExactOrBestDuration(1200, "W");
    const runP30 = getExactOrBestDuration(1800, "W");
    vals.run_power_threshold = runP20 ?? runP30;
    vals.run_power_60min = getExactOrBestDuration(3600, "W");
    
    // === RUNNING PACE (duration-based, min/km — lower is better) ===
    // For pace, we want the lowest (fastest) value
    const getPaceDurationAt = (targetSec: number): number | undefined => {
      const minSec = targetSec * 0.85;
      const maxSec = targetSec * 1.15;
      let best: number | undefined;
      for (const r of durationRecs) {
        if (r.unit !== "min/km") continue;
        if (r.durationSec >= minSec && r.durationSec <= maxSec) {
          if (best === undefined || r.value < best) best = r.value;
        }
      }
      return best;
    };
    
    const pace20 = getPaceDurationAt(1200);
    const pace30 = getPaceDurationAt(1800);
    vals.pace_threshold = pace20 ?? pace30;
    
    // Speed data
    vals.speed_max_30s = getSpeedAt(30);
    vals.speed_max_1min = getSpeedAt(60);
    vals.speed_6min = getSpeedAt(360);
    
    // VMA: best speed at ~5-8min effort
    const vma6 = getSpeedAt(360);
    const vma5 = getSpeedAt(300);
    vals.vma = vma6 ?? vma5;
    
    // === DISTANCE-BASED CURVES ===
    // Pace by distance
    const paceDist: { distanceM: number; distanceLabel: string; paceSecKm: number; speedKmh: number }[] = [];
    for (const r of distanceRecs) {
      if (r.unit === "min/km" || r.valueSpeed != null) {
        const paceSecKm = r.unit === "min/km" ? r.value : 0;
        const speedKmh = r.valueSpeed ?? (r.unit === "km/h" ? r.value : (paceSecKm > 0 ? 3600 / paceSecKm : 0));
        paceDist.push({ distanceM: r.distanceM, distanceLabel: r.distanceLabel, paceSecKm, speedKmh });
      }
    }
    if (paceDist.length > 0) vals.distanceCurve = paceDist;
    
    // Power by distance
    const powerDist: { distanceM: number; distanceLabel: string; watts: number }[] = [];
    for (const r of distanceRecs) {
      if (r.unit === "W" && r.value > 0) {
        powerDist.push({ distanceM: r.distanceM, distanceLabel: r.distanceLabel, watts: r.value });
      }
    }
    if (powerDist.length > 0) vals.distancePowerCurve = powerDist;
    
    // Distance-based pace records
    vals.pace_5k = getBestDistanceAt(5000, "min/km");
    vals.pace_10k = getBestDistanceAt(10000, "min/km");
    
    // Build full running power curve
    const fullCurve: { sec: number; watts: number }[] = [];
    for (const r of durationRecs) {
      if (r.unit === "W" && r.value > 0) {
        fullCurve.push({ sec: r.durationSec, watts: r.value });
      }
    }
    if (fullCurve.length > 0) vals.fullCurve = fullCurve.sort((a, b) => a.sec - b.sec);
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
