// =============================================
// EXCEL TEMPLATE PARSER
// Parses Excel/CSV files into structured training templates
// =============================================

import type { TemplateWeek, TemplateSession } from "./docxTemplateLoader";
import type { RunningTemplate, RunningTemplateSection, RunningWeek, RunningWeekMeta } from "@/types/runningTemplate";
import { autoTagWeek, convertToRunningSession, generateWeekSummary } from "./runningTemplateAutoTag";

/**
 * Expected Excel Column Format:
 * 
 * For Running templates:
 * | Semaine | Jour | Type | Titre | Détails | Durée | Zone | Séance Clé |
 * | 1 | Lundi | Footing | Endurance Z2 | 50' Z2 pure | 50 | Z2 | Non |
 * 
 * For Triathlon templates:
 * | Semaine | Jour | Discipline | Titre | Description | Durée | Zone | Notes |
 * | 1 | Lundi | Natation | Technique | 45' éduc + sprints | 45 | Z2 | Focus technique |
 */

export interface ExcelRow {
  semaine: number;
  jour: string;
  discipline?: string;
  sport?: string;
  type?: string;
  titre?: string;
  title?: string;
  details?: string;
  description?: string;
  duree?: number | string;
  duration?: number | string;
  zone?: string;
  notes?: string;
  seance_cle?: string;
  isKey?: boolean;
  phase?: string;
  theme?: string;
  coach_advice?: string;
}

export interface ParsedExcelTemplate {
  weeks: TemplateWeek[];
  metadata: {
    rowCount: number;
    weekCount: number;
    sessionCount: number;
    warnings: string[];
    isTriathlon: boolean;
  };
}

/**
 * Normalizes column headers from various formats
 */
function normalizeHeader(header: string): string {
  const lower = header.toLowerCase().trim();
  
  // Week variations
  if (lower.includes("semaine") || lower === "week" || lower === "sem") return "semaine";
  
  // Day variations
  if (lower.includes("jour") || lower === "day") return "jour";
  
  // Sport/Discipline variations
  if (lower.includes("discipline") || lower.includes("sport") || lower === "disc") return "discipline";
  
  // Type variations
  if (lower === "type" || lower.includes("type")) return "type";
  
  // Title variations
  if (lower.includes("titre") || lower === "title" || lower === "seance") return "titre";
  
  // Details/Description variations
  if (lower.includes("detail") || lower.includes("description") || lower === "desc") return "details";
  
  // Duration variations
  if (lower.includes("duree") || lower.includes("durée") || lower === "duration" || lower === "min" || lower === "temps") return "duree";
  
  // Zone variations
  if (lower.includes("zone") || lower === "z") return "zone";
  
  // Notes variations
  if (lower.includes("note") || lower.includes("remarque") || lower.includes("commentaire")) return "notes";
  
  // Key session variations
  if (lower.includes("cle") || lower.includes("clé") || lower === "key" || lower.includes("important")) return "seance_cle";
  
  // Phase variations
  if (lower.includes("phase") || lower.includes("bloc")) return "phase";
  
  // Theme variations
  if (lower.includes("theme") || lower.includes("thème") || lower.includes("objectif")) return "theme";
  
  // Coach advice
  if (lower.includes("coach") || lower.includes("conseil")) return "coach_advice";
  
  return lower;
}

/**
 * Parses duration from various formats
 */
function parseDuration(value: string | number | undefined): number {
  if (!value) return 60; // Default 60 min
  
  if (typeof value === "number") return value;
  
  const str = value.toString().trim();
  
  // "1h30" or "1h 30" format
  const hMatch = str.match(/(\d+)\s*h\s*(\d*)/i);
  if (hMatch) {
    const hours = parseInt(hMatch[1]) || 0;
    const mins = parseInt(hMatch[2]) || 0;
    return hours * 60 + mins;
  }
  
  // "90'" or "90 min" format
  const minMatch = str.match(/(\d+)\s*('|min|m)?/i);
  if (minMatch) {
    return parseInt(minMatch[1]) || 60;
  }
  
  return 60;
}

/**
 * Normalizes day name
 */
function normalizeDay(day: string): string {
  const lower = day.toLowerCase().trim();
  const dayMap: Record<string, string> = {
    "lun": "Lundi", "lundi": "Lundi", "monday": "Lundi", "mon": "Lundi",
    "mar": "Mardi", "mardi": "Mardi", "tuesday": "Mardi", "tue": "Mardi",
    "mer": "Mercredi", "mercredi": "Mercredi", "wednesday": "Mercredi", "wed": "Mercredi",
    "jeu": "Jeudi", "jeudi": "Jeudi", "thursday": "Jeudi", "thu": "Jeudi",
    "ven": "Vendredi", "vendredi": "Vendredi", "friday": "Vendredi", "fri": "Vendredi",
    "sam": "Samedi", "samedi": "Samedi", "saturday": "Samedi", "sat": "Samedi",
    "dim": "Dimanche", "dimanche": "Dimanche", "sunday": "Dimanche", "sun": "Dimanche",
  };
  
  return dayMap[lower] || day;
}

/**
 * Normalizes sport/discipline name
 */
function normalizeSport(sport: string): string {
  const lower = sport.toLowerCase().trim();
  
  if (lower.includes("natation") || lower.includes("swim") || lower === "nat") return "Natation";
  if (lower.includes("vélo") || lower.includes("velo") || lower.includes("bike") || lower.includes("cyclisme") || lower === "ht") return "Vélo";
  if (lower.includes("cap") || lower.includes("course") || lower.includes("run") || lower.includes("footing")) return "CAP";
  if (lower.includes("repos") || lower.includes("rest") || lower === "off") return "Repos";
  if (lower.includes("brick") || lower.includes("enchainement") || lower.includes("enchaînement")) return "Brick";
  if (lower.includes("gainage") || lower.includes("renfo") || lower.includes("muscu") || lower.includes("strength")) return "Renfo";
  
  return sport.trim() || "Autre";
}

/**
 * Checks if template is triathlon (has multiple disciplines)
 */
function isTriathlonTemplate(rows: ExcelRow[]): boolean {
  const disciplines = new Set<string>();
  
  rows.forEach(row => {
    const disc = row.discipline || row.sport || "";
    const normalized = normalizeSport(disc);
    if (normalized && normalized !== "Repos" && normalized !== "Autre") {
      disciplines.add(normalized);
    }
  });
  
  // Triathlon if has Natation + Vélo + CAP (or at least 2 of them)
  const hasSwim = disciplines.has("Natation");
  const hasBike = disciplines.has("Vélo");
  const hasRun = disciplines.has("CAP");
  
  return (hasSwim && hasBike) || (hasBike && hasRun) || (hasSwim && hasRun);
}

/**
 * Parses CSV content into rows
 */
export function parseCSV(content: string): ExcelRow[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  
  // Parse header row
  const headerLine = lines[0];
  const headers = headerLine.split(/[,;\t]/).map(h => normalizeHeader(h));
  
  const rows: ExcelRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(/[,;\t]/);
    const row: Record<string, string | number> = {};
    
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() || "";
    });
    
    // Skip empty rows
    if (!row.semaine && !row.jour) continue;
    
    rows.push({
      semaine: parseInt(row.semaine as string) || 1,
      jour: normalizeDay(row.jour as string || ""),
      discipline: row.discipline as string,
      sport: row.sport as string,
      type: row.type as string,
      titre: row.titre as string,
      title: row.title as string,
      details: row.details as string,
      description: row.description as string,
      duree: row.duree,
      duration: row.duration,
      zone: row.zone as string,
      notes: row.notes as string,
      seance_cle: row.seance_cle as string,
      phase: row.phase as string,
      theme: row.theme as string,
      coach_advice: row.coach_advice as string,
    });
  }
  
  return rows;
}

/**
 * Converts parsed rows to TemplateWeeks
 */
export function rowsToTemplateWeeks(rows: ExcelRow[]): ParsedExcelTemplate {
  const weeks: TemplateWeek[] = [];
  const warnings: string[] = [];
  
  // Group rows by week
  const weekGroups = new Map<number, ExcelRow[]>();
  
  rows.forEach(row => {
    const weekNum = row.semaine || 1;
    if (!weekGroups.has(weekNum)) {
      weekGroups.set(weekNum, []);
    }
    weekGroups.get(weekNum)!.push(row);
  });
  
  // Convert each week group
  const sortedWeekNums = Array.from(weekGroups.keys()).sort((a, b) => a - b);
  
  sortedWeekNums.forEach(weekNum => {
    const weekRows = weekGroups.get(weekNum)!;
    const sessions: TemplateSession[] = [];
    
    let weekTheme = "";
    let weekPhase = "";
    let coachAdvice = "";
    
    weekRows.forEach(row => {
      // Capture week-level metadata from first row
      if (row.theme && !weekTheme) weekTheme = row.theme;
      if (row.phase && !weekPhase) weekPhase = row.phase;
      if (row.coach_advice && !coachAdvice) coachAdvice = row.coach_advice;
      
      const session: TemplateSession = {
        day: row.jour || "Lundi",
        sport: normalizeSport(row.discipline || row.sport || row.type || ""),
        title: row.titre || row.title || row.type || "",
        details: row.details || row.description || "",
        notes: row.notes || "",
        durationMin: parseDuration(row.duree || row.duration),
      };
      
      sessions.push(session);
    });
    
    if (sessions.length === 0) {
      warnings.push(`Semaine ${weekNum} n'a aucune séance valide`);
      return;
    }
    
    weeks.push({
      weekNumber: weekNum,
      theme: weekTheme || `Semaine ${weekNum}`,
      phase: weekPhase,
      sessions,
      coachAdvice: coachAdvice || undefined,
    });
  });
  
  // Validate
  if (weeks.length === 0) {
    warnings.push("Aucune semaine valide trouvée dans le fichier");
  }
  
  const isTriathlon = isTriathlonTemplate(rows);
  
  return {
    weeks,
    metadata: {
      rowCount: rows.length,
      weekCount: weeks.length,
      sessionCount: weeks.reduce((sum, w) => sum + w.sessions.length, 0),
      warnings,
      isTriathlon,
    },
  };
}

/**
 * Converts TemplateWeeks to RunningWeeks (for Running templates)
 */
export function convertToRunningTemplate(
  weeks: TemplateWeek[],
  templateId: string,
  templateName: string,
  goal: "marathon" | "semi"
): RunningTemplate {
  const sectionId = `${templateId}-imported`;
  
  const runningWeeks: RunningWeek[] = weeks.map(week => {
    const meta = autoTagWeek(week, weeks.length);
    const sessions = week.sessions.map(s => convertToRunningSession(s));
    
    return {
      template_id: templateId,
      section_id: sectionId,
      week_id: `${templateId}-${sectionId}-w${week.weekNumber}`,
      week_number: week.weekNumber,
      title: week.theme || `Semaine ${week.weekNumber}`,
      summary: generateWeekSummary(meta),
      sessions,
      meta,
      coachAdvice: week.coachAdvice,
    };
  });
  
  const section: RunningTemplateSection = {
    id: sectionId,
    name: templateName,
    ambition: "PERF",
    weeks: runningWeeks,
  };
  
  return {
    id: templateId,
    name: templateName,
    goal,
    weeks_count: weeks.length,
    description: `Template importé depuis Excel (${weeks.length} semaines)`,
    methodology: "TFCL",
    sections: [section],
  };
}

// =============================================
// UNIFIED WEEK TYPE FOR COMPARATOR
// =============================================

export interface UnifiedWeek {
  id: string;
  weekNumber: number;
  title: string;
  templateId: string;
  templateName: string;
  templateType: "running" | "triathlon";
  goal: string; // "marathon" | "semi" | "ironman" | "703"
  sessions: {
    day: string;
    sport: string;
    title: string;
    details: string;
    durationMin: number;
    isKey?: boolean;
  }[];
  meta: {
    phase: string;
    focus: string;
    loadLevel: number;
    intensityDensity: number;
    injuryRisk: string;
  };
  coachAdvice?: string;
}

/**
 * Converts running weeks to unified format
 */
export function runningWeekToUnified(
  week: RunningWeek,
  templateName: string,
  goal: string
): UnifiedWeek {
  return {
    id: week.week_id,
    weekNumber: week.week_number,
    title: week.title,
    templateId: week.template_id,
    templateName,
    templateType: "running",
    goal,
    sessions: week.sessions.map(s => ({
      day: s.day,
      sport: "CAP",
      title: s.title,
      details: s.details || "",
      durationMin: s.duration_min,
      isKey: s.isKey,
    })),
    meta: {
      phase: week.meta.phase,
      focus: week.meta.focus,
      loadLevel: week.meta.load_level,
      intensityDensity: week.meta.intensity_density,
      injuryRisk: week.meta.injury_risk_tag,
    },
    coachAdvice: week.coachAdvice,
  };
}

/**
 * Converts triathlon template weeks to unified format
 */
export function triathlonWeekToUnified(
  week: TemplateWeek,
  templateId: string,
  templateName: string,
  goal: string
): UnifiedWeek {
  // Estimate load based on session count and durations
  const totalDuration = week.sessions.reduce((sum, s) => sum + (s.durationMin || 60), 0);
  const loadLevel = Math.min(5, Math.ceil(totalDuration / 300));
  
  // Estimate intensity based on session titles
  let intensityScore = 0;
  week.sessions.forEach(s => {
    const text = ((s.title || "") + " " + (s.details || "")).toLowerCase();
    if (text.includes("z5") || text.includes("z6") || text.includes("sprint") || text.includes("pma") || text.includes("vma")) {
      intensityScore += 3;
    } else if (text.includes("z4") || text.includes("seuil") || text.includes("threshold")) {
      intensityScore += 2;
    } else if (text.includes("z3") || text.includes("tempo")) {
      intensityScore += 1;
    }
  });
  const intensityDensity = Math.min(5, Math.ceil(intensityScore / 2));
  
  // Determine phase based on week number and template length
  let phase = "BASE";
  const totalWeeks = 24; // Assume standard triathlon plan
  const progress = week.weekNumber / totalWeeks;
  if (progress > 0.8) phase = "TAPER";
  else if (progress > 0.5) phase = "SPECIFIC";
  else if (progress > 0.25) phase = "BUILD";
  
  // Determine focus
  let focus = "ENDURANCE";
  week.sessions.forEach(s => {
    const text = ((s.title || "") + " " + (s.details || "")).toLowerCase();
    if (text.includes("tte") || text.includes("durabilité")) focus = "TTE";
    else if (text.includes("vo2") || text.includes("pma") || text.includes("vma")) focus = "VO2";
    else if (text.includes("économie") || text.includes("technique")) focus = "ECONOMY";
    else if (text.includes("vitesse") || text.includes("sprint")) focus = "SPEED";
  });
  
  return {
    id: `${templateId}-w${week.weekNumber}`,
    weekNumber: week.weekNumber,
    title: week.theme || `Semaine ${week.weekNumber}`,
    templateId,
    templateName,
    templateType: "triathlon",
    goal,
    sessions: week.sessions.map(s => ({
      day: s.day,
      sport: s.sport || s.discipline || "Autre",
      title: s.title || "",
      details: s.details || s.description || "",
      durationMin: s.durationMin || 60,
      isKey: false,
    })),
    meta: {
      phase,
      focus,
      loadLevel,
      intensityDensity,
      injuryRisk: loadLevel >= 4 && intensityDensity >= 4 ? "HIGH" : loadLevel >= 3 ? "MED" : "LOW",
    },
    coachAdvice: week.coachAdvice,
  };
}
