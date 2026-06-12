/**
 * Template Sanity Checker V2
 * Validates and sanitizes session details with sport-contextualized options
 */

import { parseDurationFromText } from "./durationParser";
import { 
  processSessionOptions, 
  cleanSessionDetails,
  type SessionContext,
  type ValidatedOption,
  type OptionSport,
} from "./optionValidator";
import type { TemplateSession, TemplateWeek } from "./docxTemplateLoader";

export interface SanityWarning {
  type: "MISPLACED_OPTION" | "GENERIC_OPTION" | "BLOCKED_OPTION" | "INVALID_DURATION" | "CELL_OVERFLOW" | "OPTION_REATTACHED";
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
  validOptions?: ValidatedOption[];
  blockedOptions?: ValidatedOption[];
  genericOptionsRemoved?: string[];
}

export interface SanitizedWeek {
  week: TemplateWeek;
  sessionResults: SanitizedSession[];
  reattachedOptions: { fromDay: string; toDay: string; optionText: string }[];
}

/**
 * Detect session sport from session data
 */
function detectSessionSport(session: TemplateSession): OptionSport {
  const sportText = (session.sport || session.discipline || "").toLowerCase();
  
  if (sportText.includes("vélo") || sportText.includes("bike") || sportText.includes("velo")) return "VÉLO";
  if (sportText.includes("cap") || sportText.includes("course") || sportText.includes("run") || sportText.includes("c.a.p")) return "CAP";
  if (sportText.includes("natation") || sportText.includes("swim") || sportText.includes("piscine")) return "NATATION";
  if (sportText.includes("brick") || sportText.includes("vélo + cap")) return "BRICK";
  
  return "UNKNOWN";
}

/**
 * Detect if session is a "long" session type
 */
function isLongSessionType(session: TemplateSession): boolean {
  const text = ((session.title || "") + " " + (session.details || "")).toLowerCase();
  return /sortie\s*longue|long\s*run|ultra|endurance\s*longue/i.test(text);
}

/**
 * Build session context for option validation
 */
function buildSessionContext(session: TemplateSession, weekPhase?: string): SessionContext {
  const sport = detectSessionSport(session);
  const durationText = session.title || session.details || "";
  const parsedDuration = parseDurationFromText(durationText);
  
  return {
    sport,
    durationMin: session.durationMin || parsedDuration?.target || 60,
    sessionType: session.type || session.title,
    phase: weekPhase,
    isLongSession: isLongSessionType(session),
  };
}

/**
 * Sanitize a single session with sport-contextualized option validation
 */
export function sanitizeSessionDetails(
  session: TemplateSession,
  weekPhase?: string,
  staffMode: boolean = false
): SanitizedSession {
  const warnings: SanityWarning[] = [];
  let processedSession = { ...session };
  
  // Parse duration from title or details
  const durationSource = session.title || session.details || "";
  const parsedDuration = parseDurationFromText(durationSource);
  const durationMin = session.durationMin || parsedDuration?.target;
  const durationRange = session.durationRange || parsedDuration?.range;
  
  // Build context for option validation
  const context = buildSessionContext(session, weekPhase);
  
  // Process options with sport-contextualized validation
  let validOptions: ValidatedOption[] = [];
  let blockedOptions: ValidatedOption[] = [];
  let genericOptionsRemoved: string[] = [];
  
  if (session.details) {
    const processed = processSessionOptions(session.details, context);
    validOptions = processed.validOptions;
    blockedOptions = processed.blockedOptions;
    genericOptionsRemoved = processed.genericOptions;
    
    // Add warnings for blocked options
    for (const blocked of blockedOptions) {
      warnings.push({
        type: "BLOCKED_OPTION",
        message: blocked.reason,
        severity: "warning",
        originalText: blocked.option.rawText,
      });
    }
    
    // Add warnings for generic options
    for (const generic of genericOptionsRemoved) {
      warnings.push({
        type: "GENERIC_OPTION",
        message: `Option sans sport explicite masquée: "${generic}"`,
        severity: "error",
        originalText: generic,
      });
    }
    
    // Clean the details text
    const { cleanedDetails, removedCount } = cleanSessionDetails(session.details, context);
    
    if (removedCount > 0) {
      processedSession.details = cleanedDetails;
      
      if (staffMode) {
        // console.log(
        //   `[TemplateSanity] Session "${session.day}" (${context.sport}): ` +
        //   `${removedCount} option(s) removed, ${validOptions.length} valid`
        // );
      }
    }
  }
  
  // Check for suspicious cell overflow patterns
  if (session.details) {
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
    validOptions: validOptions.length > 0 ? validOptions : undefined,
    blockedOptions: blockedOptions.length > 0 ? blockedOptions : undefined,
    genericOptionsRemoved: genericOptionsRemoved.length > 0 ? genericOptionsRemoved : undefined,
  };
}

/**
 * Find the best long run session in a week
 */
function findLongRunSession(sessions: TemplateSession[]): { index: number; session: TemplateSession } | null {
  let bestIndex = -1;
  let bestDuration = 0;
  
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const sport = detectSessionSport(session);
    
    // Must be a run session
    if (sport !== "CAP") continue;
    
    const durationText = session.title || session.details || "";
    const parsed = parseDurationFromText(durationText);
    const duration = session.durationMin || parsed?.target || 0;
    
    // Must be long enough (>= 90 min) or marked as long
    if ((duration >= 90 || isLongSessionType(session)) && duration > bestDuration) {
      bestDuration = duration;
      bestIndex = i;
    }
  }
  
  return bestIndex >= 0 ? { index: bestIndex, session: sessions[bestIndex] } : null;
}

/**
 * Sanitize an entire week
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
    const result = sanitizeSessionDetails(session, week.phase, staffMode);
    sessionResults.push(result);
    processedSessions.push(result.session);
  }
  
  // Update week with processed sessions
  const sanitizedWeek: TemplateWeek = {
    ...week,
    sessions: processedSessions,
  };
  
  if (staffMode) {
    const totalWarnings = sessionResults.reduce((acc, sr) => acc + sr.warnings.length, 0);
    if (totalWarnings > 0) {
      // console.log(`[TemplateSanity] Week ${week.weekNumber}: ${totalWarnings} warning(s)`);
    }
  }
  
  return {
    week: sanitizedWeek,
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
): { 
  weeks: TemplateWeek[]; 
  allWarnings: SanityWarning[]; 
  stats: { 
    fixed: number; 
    blocked: number; 
    generic: number; 
  } 
} {
  const sanitizedWeeks: TemplateWeek[] = [];
  const allWarnings: SanityWarning[] = [];
  let fixed = 0;
  let blocked = 0;
  let generic = 0;
  
  for (const week of weeks) {
    const result = sanitizeWeek(week, staffMode);
    sanitizedWeeks.push(result.week);
    
    for (const sr of result.sessionResults) {
      if (sr.warnings.length > 0) {
        allWarnings.push(...sr.warnings);
        fixed += sr.warnings.filter(w => w.type === "MISPLACED_OPTION").length;
        blocked += sr.warnings.filter(w => w.type === "BLOCKED_OPTION").length;
        generic += sr.warnings.filter(w => w.type === "GENERIC_OPTION").length;
      }
    }
  }
  
  if (staffMode && allWarnings.length > 0) {
    // console.log(`[TemplateSanity] Template sanitized: ${blocked} blocked, ${generic} generic removed`);
  }
  
  return { 
    weeks: sanitizedWeeks, 
    allWarnings, 
    stats: { fixed, blocked, generic } 
  };
}
