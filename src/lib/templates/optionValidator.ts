/**
 * Option Validator - Sport-Contextualized Duration Options
 * 
 * Implements Dan Lorang methodology guard rails for duration options.
 * Every option MUST be explicitly contextualized by sport.
 */

import { parseDurationFromText } from "./durationParser";

// ============= TYPES =============

export type OptionSport = "VÉLO" | "CAP" | "NATATION" | "BRICK" | "UNKNOWN";

export interface ParsedDurationOption {
  sport: OptionSport;
  durationMin: number;
  durationMax?: number;
  rawText: string;
  intensityHint?: string; // e.g., "Z2 stricte", "tempo"
}

export interface ValidatedOption {
  option: ParsedDurationOption;
  isValid: boolean;
  isAllowed: boolean;
  reason: string;
  pedagogicalText?: string;
  staffAnalysis?: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";
}

export interface SessionContext {
  sport: OptionSport;
  durationMin: number;
  sessionType?: string; // "LONG_RUN", "Z2", "TEMPO", etc.
  phase?: string; // "Préparation", "Spécifique", "Affûtage"
  sportMain?: string; // "triathlon", "marathon", etc.
  isLongSession?: boolean;
}

// ============= CONSTANTS =============

const CAP_MAX_OPTION_SHORT_SESSION = 120; // 2h max for short CAP sessions
const CAP_LONG_THRESHOLD = 150; // 2h30 = long CAP option
const VELO_LONG_THRESHOLD = 180; // 3h = long vélo option
const VELO_VERY_LONG_THRESHOLD = 240; // 4h = very long vélo option
const MAX_SAME_SPORT_MULTIPLIER = 2.0; // Option can't exceed 2x session duration for same sport

// ============= OPTION PARSING =============

/**
 * Detect sport from option text
 */
function detectOptionSport(text: string): OptionSport {
  const lower = text.toLowerCase();
  
  // Explicit sport mentions
  if (/vélo|bike|velo|ht|home.?trainer/i.test(lower)) return "VÉLO";
  if (/cap\b|course|run|c\.a\.p|marche/i.test(lower)) return "CAP";
  if (/natation|swim|piscine|eau libre/i.test(lower)) return "NATATION";
  if (/brick/i.test(lower)) return "BRICK";
  
  return "UNKNOWN";
}

/**
 * Extract intensity hints from option text
 */
function extractIntensityHint(text: string): string | undefined {
  const lower = text.toLowerCase();
  
  if (/z2|zone\s*2|endurance|stricte/i.test(lower)) return "Z2 stricte";
  if (/tempo|allure/i.test(lower)) return "tempo";
  if (/long/i.test(lower)) return "sortie longue";
  if (/récup/i.test(lower)) return "récupération";
  
  return undefined;
}

/**
 * Parse a single option text into a structured option
 */
export function parseOption(text: string): ParsedDurationOption | null {
  if (!text || text.trim().length < 3) return null;
  
  const sport = detectOptionSport(text);
  const intensityHint = extractIntensityHint(text);
  
  // Extract duration(s)
  const durationResult = parseDurationFromText(text);
  if (!durationResult) return null;
  
  return {
    sport,
    durationMin: durationResult.target,
    durationMax: durationResult.range?.max,
    rawText: text.trim(),
    intensityHint,
  };
}

/**
 * Parse all options from session details text
 * Returns only options that have explicit sport context
 */
export function parseOptionsFromText(detailsText: string): ParsedDurationOption[] {
  if (!detailsText) return [];
  
  const options: ParsedDurationOption[] = [];
  
  // Pattern: "Option SPORT : duration" or "Option SPORT duration"
  const explicitPattern = /option\s*(vélo|cap|c\.a\.p|natation|course|bike|swim|brick)\s*[:：]?\s*([^\.]+)/gi;
  let match;
  
  while ((match = explicitPattern.exec(detailsText)) !== null) {
    const sportText = match[1];
    const durationText = match[2];
    
    const sport = detectOptionSport(sportText);
    const durationResult = parseDurationFromText(durationText);
    
    if (sport !== "UNKNOWN" && durationResult) {
      options.push({
        sport,
        durationMin: durationResult.target,
        durationMax: durationResult.range?.max,
        rawText: match[0].trim(),
        intensityHint: extractIntensityHint(durationText),
      });
    }
  }
  
  // Also check for "ou" patterns with sport context
  const ouPattern = /ou\s+(vélo|cap|course|bike)\s*[:：]?\s*(\d+h\d*)/gi;
  while ((match = ouPattern.exec(detailsText)) !== null) {
    const sportText = match[1];
    const durationText = match[2];
    
    const sport = detectOptionSport(sportText);
    const durationResult = parseDurationFromText(durationText);
    
    if (sport !== "UNKNOWN" && durationResult) {
      options.push({
        sport,
        durationMin: durationResult.target,
        rawText: match[0].trim(),
        intensityHint: extractIntensityHint(durationText),
      });
    }
  }
  
  return options;
}

/**
 * Check if a generic option (no sport specified) exists in text
 * These should be flagged as invalid
 */
export function detectGenericOptions(detailsText: string): string[] {
  if (!detailsText) return [];
  
  const genericOptions: string[] = [];
  
  // Pattern: "Option XhYY" without sport
  const genericPattern = /option\s*[:：]?\s*(\d+h\d*(?:\s*[\/\-–]\s*\d+h\d*)?)/gi;
  let match;
  
  while ((match = genericPattern.exec(detailsText)) !== null) {
    const fullMatch = match[0];
    // Check if this match contains any sport keyword
    if (!/(vélo|cap|c\.a\.p|natation|course|bike|swim|brick)/i.test(fullMatch)) {
      genericOptions.push(fullMatch.trim());
    }
  }
  
  return genericOptions;
}

// ============= VALIDATION RULES =============

/**
 * Validate a CAP (running) option
 */
function validateCAPOption(
  option: ParsedDurationOption,
  context: SessionContext
): ValidatedOption {
  const duration = option.durationMin;
  const sessionDuration = context.durationMin;
  
  // Rule: If session ≤ 90min, no CAP option > 2h
  if (sessionDuration <= 90 && duration > CAP_MAX_OPTION_SHORT_SESSION) {
    return {
      option,
      isValid: true, // Syntactically valid
      isAllowed: false, // Not allowed by rules
      reason: `Option CAP ${duration}min interdite sur séance courte (${sessionDuration}min). Max autorisé: 2h.`,
      riskLevel: "BLOCKED",
      staffAnalysis: "Risque blessure majeur si volume CAP multiplié par >2x sur séance courte. Impact musculo-tendineux incompatible avec récupération.",
    };
  }
  
  // Rule: CAP option > 2h30 only for long runs in specific phases
  if (duration >= CAP_LONG_THRESHOLD) {
    const isLongRunSession = context.isLongSession || 
      /long|sortie\s*longue/i.test(context.sessionType || "");
    const isSpecificPhase = /spécifique|build|competition/i.test(context.phase || "");
    
    if (!isLongRunSession) {
      return {
        option,
        isValid: true,
        isAllowed: false,
        reason: `Option CAP longue (${duration}min) réservée aux séances "Sortie Longue".`,
        riskLevel: "BLOCKED",
        staffAnalysis: "Une option CAP >2h30 n'est cohérente que sur une séance déjà prévue comme sortie longue.",
      };
    }
    
    return {
      option,
      isValid: true,
      isAllowed: true,
      reason: "Option CAP longue autorisée (sortie longue)",
      riskLevel: "MEDIUM",
      pedagogicalText: "Option CAP longue réservée aux profils tolérants. Risque blessure accru si VLamax élevé ou TTE bas.",
      staffAnalysis: `Option CAP ${duration}min : cohérente uniquement si économie de course validée et dérive FC absente. Vérifier TTE ≥ 50min.`,
    };
  }
  
  // Rule: Same sport multiplier check
  if (context.sport === "CAP" && duration > sessionDuration * MAX_SAME_SPORT_MULTIPLIER) {
    return {
      option,
      isValid: true,
      isAllowed: false,
      reason: `Option CAP ${duration}min excède x2 la durée prévue (${sessionDuration}min).`,
      riskLevel: "BLOCKED",
      staffAnalysis: "Multiplication excessive du volume CAP = risque de surcharge mécanique.",
    };
  }
  
  // Valid option
  return {
    option,
    isValid: true,
    isAllowed: true,
    reason: "Option CAP valide",
    riskLevel: "LOW",
    pedagogicalText: duration > 90 
      ? "Option CAP modérée. Adapter selon état de fatigue."
      : undefined,
  };
}

/**
 * Validate a VÉLO (cycling) option
 */
function validateVeloOption(
  option: ParsedDurationOption,
  context: SessionContext
): ValidatedOption {
  const duration = option.durationMin;
  const sessionDuration = context.durationMin;
  
  // Rule: Vélo > 4h = warning
  if (duration >= VELO_VERY_LONG_THRESHOLD) {
    const isEndurance = /z2|endurance|long/i.test(option.intensityHint || "");
    const isIMPhase = /im|ironman|70\.3|spécifique/i.test(context.phase || "");
    
    return {
      option,
      isValid: true,
      isAllowed: true,
      reason: `Option vélo très longue (${Math.floor(duration/60)}h${duration%60 || ""})`,
      riskLevel: "MEDIUM",
      pedagogicalText: "Option de volume vélo applicable uniquement si disponibilité exceptionnelle et fatigue maîtrisée.",
      staffAnalysis: isEndurance && isIMPhase
        ? "Option vélo longue cohérente avec phase IM/70.3. S'assurer de nutrition adéquate (80-100g/h)."
        : "Option vélo longue hors contexte IM : vérifier pertinence et récupération.",
    };
  }
  
  // Rule: Vélo > 3h only for endurance sessions in IM phases
  if (duration >= VELO_LONG_THRESHOLD) {
    const isEndurance = /z2|endurance|long/i.test(option.intensityHint || "") ||
      /z2|endurance|long/i.test(context.sessionType || "");
    
    if (!isEndurance) {
      return {
        option,
        isValid: true,
        isAllowed: true, // Allow but warn
        reason: `Option vélo longue (${Math.floor(duration/60)}h)`,
        riskLevel: "MEDIUM",
        pedagogicalText: "Option vélo longue sur séance non-endurance : adapter l'intensité.",
        staffAnalysis: "Vélo >3h sur séance qualitative : risque de fatigue excessive si intensité maintenue.",
      };
    }
    
    return {
      option,
      isValid: true,
      isAllowed: true,
      reason: "Option vélo endurance longue",
      riskLevel: "LOW",
      pedagogicalText: "Option vélo Z2 longue. Respecter l'intensité basse.",
    };
  }
  
  // Rule: Same sport multiplier (more lenient for vélo)
  if (context.sport === "VÉLO" && duration > sessionDuration * 3) {
    return {
      option,
      isValid: true,
      isAllowed: true, // Allow but flag
      reason: `Option vélo ${duration}min significativement plus longue que prévu.`,
      riskLevel: "MEDIUM",
      pedagogicalText: "Option de volume important. Planifier nutrition et récupération.",
    };
  }
  
  return {
    option,
    isValid: true,
    isAllowed: true,
    reason: "Option vélo valide",
    riskLevel: "LOW",
  };
}

/**
 * Validate any parsed option
 */
export function validateOption(
  option: ParsedDurationOption,
  context: SessionContext
): ValidatedOption {
  // Unknown sport = invalid
  if (option.sport === "UNKNOWN") {
    return {
      option,
      isValid: false,
      isAllowed: false,
      reason: "Option sans sport explicite (INTERDIT). Préciser: VÉLO, CAP ou NATATION.",
      riskLevel: "BLOCKED",
      staffAnalysis: "Toute option de durée DOIT préciser le sport concerné pour éviter les incohérences.",
    };
  }
  
  switch (option.sport) {
    case "CAP":
      return validateCAPOption(option, context);
    case "VÉLO":
      return validateVeloOption(option, context);
    case "NATATION":
      // Natation is generally safe for long options
      return {
        option,
        isValid: true,
        isAllowed: true,
        reason: "Option natation valide",
        riskLevel: "LOW",
        pedagogicalText: option.durationMin > 90 
          ? "Option natation longue. Privilégier technique sur volume."
          : undefined,
      };
    case "BRICK":
      return {
        option,
        isValid: true,
        isAllowed: true,
        reason: "Option brick",
        riskLevel: option.durationMin > 180 ? "MEDIUM" : "LOW",
        pedagogicalText: option.durationMin > 180
          ? "Brick long : attention à la transition et récupération CAP."
          : undefined,
      };
    default:
      return {
        option,
        isValid: false,
        isAllowed: false,
        reason: "Sport non reconnu",
        riskLevel: "BLOCKED",
      };
  }
}

// ============= SESSION PROCESSING =============

export interface ProcessedSessionOptions {
  validOptions: ValidatedOption[];
  blockedOptions: ValidatedOption[];
  genericOptions: string[]; // Options without sport (to be hidden)
  hasIssues: boolean;
  staffWarnings: string[];
  hasLongCAPOption: boolean; // For CAP injury risk display
  maxCAPOptionDuration: number; // For CAP injury risk calculation
}

/**
 * Process all options in a session's details text
 */
export function processSessionOptions(
  detailsText: string,
  context: SessionContext
): ProcessedSessionOptions {
  const validOptions: ValidatedOption[] = [];
  const blockedOptions: ValidatedOption[] = [];
  const staffWarnings: string[] = [];
  
  // Parse explicit options
  const parsedOptions = parseOptionsFromText(detailsText);
  
  // Track CAP options for injury risk
  let hasLongCAPOption = false;
  let maxCAPOptionDuration = 0;
  
  for (const option of parsedOptions) {
    const validated = validateOption(option, context);
    
    // Track CAP options
    if (option.sport === "CAP") {
      if (option.durationMin > maxCAPOptionDuration) {
        maxCAPOptionDuration = option.durationMin;
      }
      if (option.durationMin >= 90) {
        hasLongCAPOption = true;
      }
    }
    
    if (validated.isAllowed) {
      validOptions.push(validated);
    } else {
      blockedOptions.push(validated);
      staffWarnings.push(validated.reason);
    }
  }
  
  // Detect and flag generic options (no sport)
  const genericOptions = detectGenericOptions(detailsText);
  if (genericOptions.length > 0) {
    staffWarnings.push(`Options sans sport détectées (masquées): ${genericOptions.join(", ")}`);
  }
  
  return {
    validOptions,
    blockedOptions,
    genericOptions,
    hasIssues: blockedOptions.length > 0 || genericOptions.length > 0,
    staffWarnings,
    hasLongCAPOption,
    maxCAPOptionDuration,
  };
}

/**
 * Clean session details by removing invalid/generic options
 * Returns cleaned text for display
 */
export function cleanSessionDetails(
  detailsText: string,
  context: SessionContext
): { cleanedDetails: string; removedCount: number; warnings: string[] } {
  if (!detailsText) {
    return { cleanedDetails: "", removedCount: 0, warnings: [] };
  }
  
  const processed = processSessionOptions(detailsText, context);
  let cleanedDetails = detailsText;
  let removedCount = 0;
  const warnings: string[] = [];
  
  // Remove blocked options
  for (const blocked of processed.blockedOptions) {
    const escapedText = blocked.option.rawText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escapedText, 'gi');
    if (pattern.test(cleanedDetails)) {
      cleanedDetails = cleanedDetails.replace(pattern, '').trim();
      removedCount++;
      warnings.push(blocked.reason);
    }
  }
  
  // Remove generic options
  for (const generic of processed.genericOptions) {
    const escapedText = generic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escapedText, 'gi');
    if (pattern.test(cleanedDetails)) {
      cleanedDetails = cleanedDetails.replace(pattern, '').trim();
      removedCount++;
      warnings.push(`Option générique masquée: "${generic}"`);
    }
  }
  
  // Clean up multiple spaces/newlines
  cleanedDetails = cleanedDetails
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
  
  return { cleanedDetails, removedCount, warnings };
}

// ============= FORMATTING =============

/**
 * Format a validated option for display
 */
export function formatOptionForDisplay(validated: ValidatedOption): string {
  const { option, riskLevel, pedagogicalText } = validated;
  
  const sportLabel = option.sport === "CAP" ? "Course à pied" : option.sport;
  const durationStr = option.durationMax 
    ? `${Math.floor(option.durationMin/60)}h${option.durationMin%60 || "00"}–${Math.floor(option.durationMax/60)}h${option.durationMax%60 || "00"}`
    : `${Math.floor(option.durationMin/60)}h${option.durationMin%60 ? String(option.durationMin%60).padStart(2, '0') : ""}`;
  
  let display = `Option ${option.sport} : ${durationStr}`;
  if (option.intensityHint) {
    display += ` (${option.intensityHint})`;
  }
  
  return display;
}

/**
 * Get risk badge color
 */
export function getOptionRiskColor(riskLevel: ValidatedOption["riskLevel"]): string {
  switch (riskLevel) {
    case "LOW": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "MEDIUM": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case "HIGH": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "BLOCKED": return "bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-200";
    default: return "bg-muted text-muted-foreground";
  }
}
