/**
 * Duration Parser Utility
 * Parses various duration formats from template text
 */

export interface DurationRange {
  min: number; // minutes
  max: number; // minutes
}

/**
 * Parse duration from text - handles various formats:
 * - "1h00–1h15", "1h05-1h15" → range
 * - "45'", "45min" → single value
 * - "2h30", "2h" → single value
 * - "Option 2h30" → extracts 2h30
 */
export function parseDurationFromText(text: string): { target: number; range?: DurationRange } | null {
  if (!text) return null;
  
  const cleaned = text.toLowerCase().trim();
  
  // Pattern: "1h00–1h15" or "1h05-1h15" (range)
  const rangeMatch = cleaned.match(/(\d+)h(\d{2})?[–\-—](\d+)h(\d{2})?/);
  if (rangeMatch) {
    const minHours = parseInt(rangeMatch[1]) || 0;
    const minMins = parseInt(rangeMatch[2]) || 0;
    const maxHours = parseInt(rangeMatch[3]) || 0;
    const maxMins = parseInt(rangeMatch[4]) || 0;
    
    const min = minHours * 60 + minMins;
    const max = maxHours * 60 + maxMins;
    const target = Math.round((min + max) / 2);
    
    return { target, range: { min, max } };
  }
  
  // Pattern: "45–60'" or "45-60'" or "45–60min" (minute range)
  const minRangeMatch = cleaned.match(/(\d+)[–\-—](\d+)(?:'|min)/);
  if (minRangeMatch) {
    const min = parseInt(minRangeMatch[1]) || 0;
    const max = parseInt(minRangeMatch[2]) || 0;
    const target = Math.round((min + max) / 2);
    return { target, range: { min, max } };
  }
  
  // Pattern: "2h30" or "2h" (single duration)
  const singleHMatch = cleaned.match(/(\d+)h(\d{2})?/);
  if (singleHMatch) {
    const hours = parseInt(singleHMatch[1]) || 0;
    const mins = parseInt(singleHMatch[2]) || 0;
    const target = hours * 60 + mins;
    return { target };
  }
  
  // Pattern: "45'" or "45min" or "45 min" (minutes only)
  const minOnlyMatch = cleaned.match(/(\d+)(?:'|min|\s*minutes?)/);
  if (minOnlyMatch) {
    const target = parseInt(minOnlyMatch[1]) || 0;
    return { target };
  }
  
  return null;
}

/**
 * Extract all duration mentions from text (including options)
 * Returns array of durations found
 */
export function extractAllDurations(text: string): number[] {
  if (!text) return [];
  
  const durations: number[] = [];
  const cleaned = text.toLowerCase();
  
  // Find all "Xh" or "XhYY" patterns
  const hPatterns = cleaned.matchAll(/(\d+)h(\d{2})?/g);
  for (const match of hPatterns) {
    const hours = parseInt(match[1]) || 0;
    const mins = parseInt(match[2]) || 0;
    durations.push(hours * 60 + mins);
  }
  
  // Find all "XX'" or "XXmin" patterns (but not if part of hXX)
  const minPatterns = cleaned.matchAll(/(?<!\d)(\d{2,3})(?:'|min)/g);
  for (const match of minPatterns) {
    durations.push(parseInt(match[1]) || 0);
  }
  
  return durations;
}

/**
 * Extract option durations specifically (e.g., "Option 2h30 / 4h30")
 */
export function extractOptionDurations(text: string): number[] {
  if (!text) return [];
  
  const optionDurations: number[] = [];
  const cleaned = text.toLowerCase();
  
  // Look for "option" keyword and extract durations after it
  const optionMatch = cleaned.match(/option[s]?\s*[:\s]*([\d\s\/h']+)/i);
  if (optionMatch) {
    const optionText = optionMatch[1];
    return extractAllDurations(optionText);
  }
  
  // Also check for patterns like "ou 2h30 / 4h30"
  const orMatch = cleaned.match(/ou\s+([\d\s\/h']+)/i);
  if (orMatch) {
    const orText = orMatch[1];
    return extractAllDurations(orText);
  }
  
  return optionDurations;
}

/**
 * Get the primary (first/main) duration from text
 */
export function getPrimaryDuration(text: string): number | null {
  const result = parseDurationFromText(text);
  return result?.target || null;
}

/**
 * Check if text contains long-run options that seem misplaced
 * Returns true if options seem too long for a short session
 */
export function detectMisplacedLongOptions(
  sessionDurationMin: number | null,
  detailsText: string
): { isMisplaced: boolean; optionDurations: number[]; threshold: number } {
  if (sessionDurationMin === null) {
    return { isMisplaced: false, optionDurations: [], threshold: 0 };
  }
  
  const optionDurations = extractOptionDurations(detailsText);
  if (optionDurations.length === 0) {
    return { isMisplaced: false, optionDurations: [], threshold: 0 };
  }
  
  const maxOption = Math.max(...optionDurations);
  
  // Threshold: max(duration * 1.5, duration + 45) for sessions <= 90 min
  const threshold = sessionDurationMin <= 90 
    ? Math.max(sessionDurationMin * 1.5, sessionDurationMin + 45)
    : sessionDurationMin * 1.5;
  
  const isMisplaced = maxOption > threshold && sessionDurationMin <= 90;
  
  return { isMisplaced, optionDurations, threshold };
}
