/**
 * Template Sanity Checker
 * Validates and sanitizes session details to fix parsing issues
 */

import { 
  parseDurationFromText, 
  extractOptionDurations, 
  detectMisplacedLongOptions 
} from "./durationParser";
import type { TemplateSession, TemplateWeek } from "./docxTemplateLoader";

export interface SanityWarning {
  type: "MISPLACED_OPTION" | "INVALID_DURATION" | "CELL_OVERFLOW" | "OPTION_REATTACHED";
  message: string;
  severity: "info" | "warning" | "error";
  originalText?: string;
  suggestedTarget?: string;
}

export interface SanitizedSession {
  session: TemplateSession;
  warnings: SanityWarning[];
  durationMin?: number;
  durationRange?: { min: number; max: number };
  removedOptions?: string[];
}

export interface SanitizedWeek {
  week: TemplateWeek;
  sessionResults: SanitizedSession[];
  reattachedOptions: { fromDay: string; toDay: string; optionText: string }[];
}

/**
 * Remove misplaced option lines from session details
 */
function removeOptionLines(details: string): { cleaned: string; removed: string[] } {
  const lines = details.split(/\n|(?:\s{2,})/);
  const cleaned: string[] = [];
  const removed: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Check if line contains option patterns like "Option 2h30" or "ou 4h30"
    if (/option[s]?\s*[:\s]*\d+h/i.test(trimmed) || /^ou\s+\d+h/i.test(trimmed)) {
      const durations = extractOptionDurations(trimmed);
      if (durations.some(d => d >= 120)) {
        removed.push(trimmed);
        continue;
      }
    }
    cleaned.push(trimmed);
  }
  
  return { 
    cleaned: cleaned.filter(l => l).join(" ").trim(), 
    removed 
  };
}

/**
 * Sanitize a single session's details
 */
export function sanitizeSessionDetails(
  session: TemplateSession,
  staffMode: boolean = false
): SanitizedSession {
  const warnings: SanityWarning[] = [];
  let processedSession = { ...session };
  let removedOptions: string[] = [];
  
  // Parse duration from title or details
  const durationSource = session.title || session.details || "";
  const parsedDuration = parseDurationFromText(durationSource);
  const durationMin = parsedDuration?.target;
  const durationRange = parsedDuration?.range;
  
  // Check for misplaced long options
  if (durationMin !== undefined && session.details) {
    const { isMisplaced, optionDurations, threshold } = detectMisplacedLongOptions(
      durationMin,
      session.details
    );
    
    if (isMisplaced) {
      // Remove the misplaced options from details
      const { cleaned, removed } = removeOptionLines(session.details);
      
      if (removed.length > 0) {
        processedSession.details = cleaned;
        removedOptions = removed;
        
        warnings.push({
          type: "MISPLACED_OPTION",
          message: `Option long run détectée et ignorée (parsing). Durée séance: ${durationMin}min, options: ${optionDurations.join("/")}min`,
          severity: "warning",
          originalText: removed.join("; "),
        });
        
        if (staffMode) {
          console.warn(
            `[TemplateSanity] Misplaced options in session "${session.day}": ` +
            `duration=${durationMin}min, options=${optionDurations.join("/")}, threshold=${threshold}`
          );
        }
      }
    }
  }
  
  // Check for suspicious cell overflow patterns
  if (session.details) {
    // Pattern: multiple complete session descriptions in one cell
    const multiSessionPattern = /(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s*:/gi;
    const matches = session.details.match(multiSessionPattern);
    if (matches && matches.length > 1) {
      warnings.push({
        type: "CELL_OVERFLOW",
        message: "Possible débordement de cellule détecté (plusieurs jours dans les détails)",
        severity: "error",
      });
    }
  }
  
  return {
    session: processedSession,
    warnings,
    durationMin,
    durationRange,
    removedOptions: removedOptions.length > 0 ? removedOptions : undefined,
  };
}

/**
 * Find the best long run session in a week to reattach options
 */
function findLongRunSession(sessions: TemplateSession[]): { index: number; session: TemplateSession } | null {
  let bestIndex = -1;
  let bestDuration = 0;
  
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const sport = (session.sport || session.discipline || "").toLowerCase();
    
    // Must be a run session
    if (!sport.includes("cap") && !sport.includes("run") && !sport.includes("course")) {
      continue;
    }
    
    const durationText = session.title || session.details || "";
    const parsed = parseDurationFromText(durationText);
    const duration = parsed?.target || 0;
    
    // Must be long enough (>= 90 min)
    if (duration >= 90 && duration > bestDuration) {
      bestDuration = duration;
      bestIndex = i;
    }
  }
  
  return bestIndex >= 0 ? { index: bestIndex, session: sessions[bestIndex] } : null;
}

/**
 * Sanitize an entire week, with option reattachment
 */
export function sanitizeWeek(
  week: TemplateWeek,
  staffMode: boolean = false
): SanitizedWeek {
  const sessionResults: SanitizedSession[] = [];
  const reattachedOptions: { fromDay: string; toDay: string; optionText: string }[] = [];
  const processedSessions: TemplateSession[] = [];
  
  // First pass: sanitize all sessions
  for (const session of week.sessions) {
    const result = sanitizeSessionDetails(session, staffMode);
    sessionResults.push(result);
    processedSessions.push(result.session);
  }
  
  // Second pass: try to reattach removed options to long run
  const removedOptionsWithSource: { fromIndex: number; fromDay: string; options: string[] }[] = [];
  
  sessionResults.forEach((result, idx) => {
    if (result.removedOptions && result.removedOptions.length > 0) {
      removedOptionsWithSource.push({
        fromIndex: idx,
        fromDay: result.session.day,
        options: result.removedOptions,
      });
    }
  });
  
  if (removedOptionsWithSource.length > 0) {
    const longRun = findLongRunSession(processedSessions);
    
    if (longRun) {
      // Reattach options to long run session
      for (const removed of removedOptionsWithSource) {
        if (removed.fromIndex !== longRun.index) {
          const optionText = removed.options.join(" | ");
          
          // Append to long run details
          processedSessions[longRun.index] = {
            ...processedSessions[longRun.index],
            details: processedSessions[longRun.index].details 
              ? `${processedSessions[longRun.index].details}\n[Récupéré: ${optionText}]`
              : `[Récupéré: ${optionText}]`,
          };
          
          reattachedOptions.push({
            fromDay: removed.fromDay,
            toDay: longRun.session.day,
            optionText,
          });
          
          // Update the warning to indicate reattachment
          const result = sessionResults[removed.fromIndex];
          const warning = result.warnings.find(w => w.type === "MISPLACED_OPTION");
          if (warning) {
            result.warnings.push({
              type: "OPTION_REATTACHED",
              message: `Option rattachée à la sortie longue (${longRun.session.day})`,
              severity: "info",
              suggestedTarget: longRun.session.day,
            });
          }
          
          if (staffMode) {
            console.log(
              `[TemplateSanity] Reattached options from "${removed.fromDay}" to long run "${longRun.session.day}"`
            );
          }
        }
      }
      
      // Update session results with modified long run
      sessionResults[longRun.index] = {
        ...sessionResults[longRun.index],
        session: processedSessions[longRun.index],
      };
    }
  }
  
  return {
    week: { ...week, sessions: processedSessions },
    sessionResults,
    reattachedOptions,
  };
}

/**
 * Sanitize all weeks in a template
 */
export function sanitizeTemplate(
  weeks: TemplateWeek[],
  staffMode: boolean = false
): { weeks: TemplateWeek[]; allWarnings: SanityWarning[]; stats: { fixed: number; reattached: number } } {
  const sanitizedWeeks: TemplateWeek[] = [];
  const allWarnings: SanityWarning[] = [];
  let fixed = 0;
  let reattached = 0;
  
  for (const week of weeks) {
    const result = sanitizeWeek(week, staffMode);
    sanitizedWeeks.push(result.week);
    
    for (const sr of result.sessionResults) {
      if (sr.warnings.length > 0) {
        allWarnings.push(...sr.warnings);
        fixed += sr.warnings.filter(w => w.type === "MISPLACED_OPTION").length;
      }
    }
    
    reattached += result.reattachedOptions.length;
  }
  
  if (staffMode && (fixed > 0 || reattached > 0)) {
    console.log(`[TemplateSanity] Template sanitized: ${fixed} options fixed, ${reattached} reattached`);
  }
  
  return { weeks: sanitizedWeeks, allWarnings, stats: { fixed, reattached } };
}
