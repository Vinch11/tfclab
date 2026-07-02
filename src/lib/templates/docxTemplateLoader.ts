/**
 * DOCX Template Loader
 * Converts DOCX files to structured ProgramTemplate using mammoth
 * Supports multiple sections/plans in a single document
 * 
 * v6: Improved cell extraction + sanity checks for misplaced options
 */
// mammoth is dynamically imported at call sites to keep it out of the initial bundle
import { parseDurationFromText } from "./durationParser";
import { sanitizeTemplate, type SanityWarning } from "./templateSanity";

export interface TemplateSession {
  day: string;
  sport?: string;
  discipline?: string;
  type?: string;
  title?: string;
  details?: string;
  description?: string;
  notes?: string;
  // v6: Added duration fields
  durationMin?: number;
  durationRange?: { min: number; max: number };
  // v6: Sanity warnings for staff mode
  _warnings?: SanityWarning[];
}

export interface TemplateWeek {
  weekNumber: number;
  theme?: string;
  phase?: string;
  sessions: TemplateSession[];
  coachAdvice?: string; // Conseils du coach pour la semaine
}

export interface ProgramSection {
  sectionId: string;
  sectionTitle: string;
  weeks: TemplateWeek[];
  briefing?: string; // Briefing général avant les semaines
}

export interface ProgramTemplate {
  id: string;
  name: string;
  target: "IM" | "703" | "Marathon" | "Semi";
  source: "docx" | "static";
  docxPath: string;
  weeks: TemplateWeek[];
  multiSections?: boolean;
}

const CACHE_VERSION = "v6"; // Improved cell extraction + sanity checks

function getCacheKey(docxPath: string): string {
  return `template-cache-${docxPath}-${CACHE_VERSION}`;
}

function getSectionsCacheKey(docxPath: string): string {
  return `template-sections-cache-${docxPath}-${CACHE_VERSION}`;
}

function getFromCache(docxPath: string): TemplateWeek[] | null {
  try {
    const cached = localStorage.getItem(getCacheKey(docxPath));
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

function getSectionsFromCache(docxPath: string): ProgramSection[] | null {
  try {
    const cached = localStorage.getItem(getSectionsCacheKey(docxPath));
    if (cached) {
      const parsed = JSON.parse(cached);
      return parsed.sections || null;
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

function setToCache(docxPath: string, weeks: TemplateWeek[]): void {
  try {
    localStorage.setItem(getCacheKey(docxPath), JSON.stringify(weeks));
  } catch {
    // Ignore cache errors (quota exceeded, etc.)
  }
}

function setSectionsToCache(docxPath: string, sections: ProgramSection[]): void {
  try {
    localStorage.setItem(getSectionsCacheKey(docxPath), JSON.stringify({
      sections,
      parsedAt: new Date().toISOString(),
    }));
  } catch {
    // Ignore cache errors (quota exceeded, etc.)
  }
}

function normalizeSport(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower.includes("natation") || lower.includes("swim")) return "Natation";
  if (lower.includes("vélo") || lower.includes("velo") || lower.includes("bike") || lower.includes("home trainer")) return "Vélo";
  if (lower.includes("c.a.p") || lower.includes("cap") || lower.includes("course") || lower.includes("run")) return "CAP";
  if (lower.includes("repos")) return "Repos";
  if (lower.includes("vélo + cap") || lower.includes("brick")) return "Brick";
  return raw.trim() || "Autre";
}

function cleanText(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#x26;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// Patterns to detect MAJOR section headers (distinct training plans only)
// We want to be strict here to avoid false positives
const SECTION_PATTERNS = [
  /^plan\s+(a|b|finisher|elite|performance|loisir)/i,
  /^(finisher|elite|performance)\s*$/i,
  /^version\s+(a|b|1|2)/i,
  /^niveau\s+(débutant|intermédiaire|avancé)/i,
  /^groupe\s+[a-z0-9]/i,
];

// Patterns to detect coach advice sections
const COACH_ADVICE_PATTERNS = [
  /consignes?\s+(du\s+)?coach/i,
  /conseils?\s+(du\s+)?coach/i,
  /coach.*advice/i,
  /notes?\s+(du\s+)?coach/i,
  /recommandations?\s+(du\s+)?coach/i,
];

function isCoachAdviceHeader(text: string): boolean {
  const cleaned = text.trim();
  if (!cleaned || cleaned.length < 5) return false;
  return COACH_ADVICE_PATTERNS.some((pattern) => pattern.test(cleaned));
}

function isSectionHeader(text: string): boolean {
  const cleaned = text.trim();
  if (!cleaned || cleaned.length < 3 || cleaned.length > 60) return false;
  // Must match a strict section pattern
  return SECTION_PATTERNS.some((pattern) => pattern.test(cleaned));
}

function extractSectionTitle(element: Element): string | null {
  const tagName = element.tagName.toLowerCase();
  const text = element.textContent?.trim() || "";
  
  // Only accept headers that match strict section patterns
  if (["h1", "h2", "h3"].includes(tagName) && isSectionHeader(text)) {
    return text;
  }
  
  // Check for strong/bold paragraphs that match strict patterns
  if (tagName === "p" && isSectionHeader(text)) {
    return text;
  }
  
  return null;
}

/**
 * Extract clean text from a cell, respecting <p> and <br> tags
 * This prevents text from different paragraphs being concatenated incorrectly
 */
function extractCellText(cell: Element): string {
  const parts: string[] = [];
  
  // Get all paragraphs in the cell
  const paragraphs = cell.querySelectorAll("p");
  if (paragraphs.length > 0) {
    paragraphs.forEach((p) => {
      const text = p.textContent?.trim();
      if (text) {
        parts.push(cleanText(text));
      }
    });
    return parts.join("\n").trim();
  }
  
  // Fallback: handle br tags
  const html = cell.innerHTML;
  if (html.includes("<br")) {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .split("\n")
      .map((line) => cleanText(line))
      .filter((line) => line)
      .join("\n")
      .trim();
  }
  
  // Simple text content
  return cleanText(cell.textContent || "");
}

/**
 * Parse a table row into a session, extracting ONLY from that row's cells
 */
function parseTableRowToSession(row: Element): TemplateSession | null {
  const cells = row.querySelectorAll("td");
  
  // Validate: we need at least 2 columns
  if (cells.length < 2) {
    return null;
  }
  
  // Extract each cell independently
  const cellTexts = Array.from(cells).map((cell) => extractCellText(cell));
  
  // Standard format: Day | Sport | Title | Details
  if (cells.length >= 4) {
    const day = cellTexts[0] || "";
    const sportRaw = cellTexts[1] || "";
    const title = cellTexts[2] || "";
    const details = cellTexts[3] || "";
    
    // Skip empty rows
    if (!day && !sportRaw && !title) {
      return null;
    }
    
    const sport = normalizeSport(sportRaw);
    
    // Parse duration from title or details
    const durationText = title || details;
    const parsedDuration = parseDurationFromText(durationText);
    
    return {
      day,
      sport,
      title,
      details,
      durationMin: parsedDuration?.target,
      durationRange: parsedDuration?.range,
    };
  }
  
  // 3-column format: Day | Sport | Combined
  if (cells.length === 3) {
    const day = cellTexts[0] || "";
    const sportRaw = cellTexts[1] || "";
    const combined = cellTexts[2] || "";
    
    if (!day && !sportRaw) {
      return null;
    }
    
    const sport = normalizeSport(sportRaw);
    const parsedDuration = parseDurationFromText(combined);
    
    return {
      day,
      sport,
      title: combined,
      details: "",
      durationMin: parsedDuration?.target,
      durationRange: parsedDuration?.range,
    };
  }
  
  // 2-column format: Day | Rest
  const day = cellTexts[0] || "";
  const rest = cellTexts[1] || "";
  
  if (!day) {
    return null;
  }
  
  return {
    day,
    sport: normalizeSport(rest),
    title: rest,
    details: "",
  };
}

function parseTableToWeek(table: Element, weekNumber: number, staffMode: boolean = false): TemplateWeek {
  const rows = table.querySelectorAll("tr");
  const sessions: TemplateSession[] = [];
  let skippedRows = 0;
  
  // Skip first row (header)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const session = parseTableRowToSession(row);
    
    if (session) {
      // Staff mode: check for suspicious options
      if (staffMode && session.durationMin && session.durationMin < 120 && session.details) {
        const detailsLower = session.details.toLowerCase();
        if (detailsLower.includes("option 2h") || detailsLower.includes("option 3h") || detailsLower.includes("option 4h")) {
          console.warn(
            `[TemplateLoader] Suspicious option in S${weekNumber} ${session.day}: ` +
            `session duration=${session.durationMin}min but details contain long options`
          );
        }
      }
      
      sessions.push(session);
    } else {
      skippedRows++;
    }
  }
  
  if (staffMode && skippedRows > 0) {
    // console.log(`[TemplateLoader] Week ${weekNumber}: skipped ${skippedRows} invalid rows`);
  }
  
  return { weekNumber, sessions, coachAdvice: undefined };
}

/**
 * Extract coach advice text from elements following a coach advice header
 */
function extractCoachAdvice(elements: HTMLCollection, startIndex: number): { advice: string; endIndex: number } {
  const adviceParts: string[] = [];
  let i = startIndex;
  
  while (i < elements.length) {
    const element = elements[i];
    const tagName = element.tagName.toLowerCase();
    const text = element.textContent?.trim() || "";
    
    // Stop if we hit another header, table, or week marker
    if (["h1", "h2", "h3"].includes(tagName)) break;
    if (tagName === "table") break;
    if (/semaine\s*\d+/i.test(text)) break;
    if (isSectionHeader(text)) break;
    
    // Collect paragraph content
    if (tagName === "p" && text) {
      // Skip if it's the coach advice header itself
      if (!isCoachAdviceHeader(text)) {
        adviceParts.push(cleanText(text));
      }
    }
    
    // Also collect list items
    if (tagName === "ul" || tagName === "ol") {
      const items = element.querySelectorAll("li");
      items.forEach((li) => {
        const itemText = cleanText(li.textContent || "");
        if (itemText) {
          adviceParts.push(`• ${itemText}`);
        }
      });
    }
    
    i++;
  }
  
  return { 
    advice: adviceParts.join("\n").trim(), 
    endIndex: i 
  };
}

/**
 * Extract briefing content (text before first table/week)
 */
function extractBriefing(elements: HTMLCollection): string {
  const briefingParts: string[] = [];
  
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const tagName = element.tagName.toLowerCase();
    const text = element.textContent?.trim() || "";
    
    // Stop when we hit the first table (start of weeks)
    if (tagName === "table") break;
    
    // Skip empty elements
    if (!text) continue;
    
    // Skip week markers
    if (/semaine\s*\d+/i.test(text)) break;
    
    // Collect headers
    if (["h1", "h2", "h3"].includes(tagName) && text) {
      briefingParts.push(`**${cleanText(text)}**`);
    }
    
    // Collect paragraphs
    if (tagName === "p" && text) {
      briefingParts.push(cleanText(text));
    }
    
    // Collect list items
    if (tagName === "ul" || tagName === "ol") {
      const items = element.querySelectorAll("li");
      items.forEach((li) => {
        const itemText = cleanText(li.textContent || "");
        if (itemText) {
          briefingParts.push(`• ${itemText}`);
        }
      });
    }
  }
  
  return briefingParts.join("\n\n").trim();
}

/**
 * Parse DOCX HTML and extract sections with their weeks
 * @param staffMode - If true, logs detailed parsing info and validates options
 */
async function parseDocxHtmlToSections(html: string, staffMode: boolean = false): Promise<ProgramSection[]> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  
  // Extract global briefing first
  const bodyChildren = doc.body.children;
  const globalBriefing = extractBriefing(bodyChildren);
  
  // First pass: count all tables to get global week numbering
  const tables = doc.querySelectorAll("table");
  const weeks: TemplateWeek[] = [];
  
  if (staffMode) {
    // console.log(`[TemplateLoader] Found ${tables.length} tables to parse`);
  }
  
  tables.forEach((table, idx) => {
    const weekNumber = idx + 1; // Global week numbering 1, 2, 3, ... 24
    const week = parseTableToWeek(table, weekNumber, staffMode);
    if (week.sessions.length > 0) {
      weeks.push(week);
    }
  });
  
  // Second pass: look for coach advice after each table
  for (let i = 0; i < bodyChildren.length; i++) {
    const element = bodyChildren[i];
    const text = element.textContent?.trim() || "";
    
    if (isCoachAdviceHeader(text)) {
      // Find the most recent week (table before this advice)
      // Count tables before this element
      let tableCountBefore = 0;
      for (let j = 0; j < i; j++) {
        if (bodyChildren[j].tagName.toLowerCase() === "table") {
          tableCountBefore++;
        }
      }
      
      // Attach advice to that week
      if (tableCountBefore > 0 && tableCountBefore <= weeks.length) {
        const { advice } = extractCoachAdvice(bodyChildren, i + 1);
        if (advice) {
          weeks[tableCountBefore - 1].coachAdvice = advice;
        }
      }
    }
  }
  
  // Now check if there are real section splits
  // For now, treat all templates as single-section with continuous week numbering
  const sections: ProgramSection[] = [];
  
  if (weeks.length > 0) {
    // Apply sanity checks to fix misplaced options
    const { weeks: sanitizedWeeks, allWarnings, stats } = sanitizeTemplate(weeks, staffMode);
    
    if (staffMode && allWarnings.length > 0) {
      // console.log(`[TemplateLoader] Sanity check: ${stats.blocked} blocked, ${stats.generic} generic removed`);
      allWarnings.forEach((w) => {
        // console.log(`  - [${w.severity.toUpperCase()}] ${w.type}: ${w.message}`);
      });
    }
    
    sections.push({
      sectionId: "section-1",
      sectionTitle: "Plan principal",
      weeks: sanitizedWeeks,
      briefing: globalBriefing,
    });
  }
  
  return sections;
}

/**
 * Parse DOCX content and extract weeks/sessions (legacy single-section mode)
 */
async function parseDocxHtml(html: string, staffMode: boolean = false): Promise<TemplateWeek[]> {
  const sections = await parseDocxHtmlToSections(html, staffMode);
  // Flatten all sections into one
  return sections.flatMap((s) => s.weeks);
}

/**
 * Parse a DOCX file from an ArrayBuffer directly (for uploaded files)
 * @param staffMode - If true, enables detailed logging and sanity checks
 */
export async function parseDocxFromArrayBuffer(arrayBuffer: ArrayBuffer, staffMode: boolean = false): Promise<ProgramSection[]> {
  // Convert to HTML using mammoth
  const result = await mammoth.convertToHtml({ arrayBuffer });

  if (result.messages.length > 0) {
    // console.log("[TemplateLoader] Mammoth messages:", result.messages);
  }

  // Parse the HTML to extract sections with sanity checks
  const sections = await parseDocxHtmlToSections(result.value, staffMode);

  // console.log(`[TemplateLoader] Parsed uploaded file: ${sections.length} sections with ${sections.reduce((acc, s) => acc + s.weeks.length, 0)} total weeks`);

  return sections;
}

/**
 * Load and parse a DOCX template from a given path (single-section mode)
 * @param staffMode - If true, enables detailed logging and sanity checks
 */
export async function loadProgramTemplateFromDocx(docxPath: string, staffMode: boolean = false): Promise<TemplateWeek[]> {
  // Check cache first
  const cached = getFromCache(docxPath);
  if (cached && cached.length > 0) {
    // console.log(`[TemplateLoader] Using cached template for ${docxPath}`);
    return cached;
  }
  
  // console.log(`[TemplateLoader] Loading template from ${docxPath}`);
  
  // Fetch the DOCX file
  const response = await fetch(docxPath);
  if (!response.ok) {
    throw new Error(`Failed to fetch template: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  
  // Convert to HTML using mammoth
  const result = await mammoth.convertToHtml({ arrayBuffer });
  
  if (result.messages.length > 0) {
    // console.log("[TemplateLoader] Mammoth messages:", result.messages);
  }
  
  // Parse the HTML to extract weeks with sanity checks
  const weeks = await parseDocxHtml(result.value, staffMode);
  
  // console.log(`[TemplateLoader] Parsed ${weeks.length} weeks`);
  
  // Cache the result
  if (weeks.length > 0) {
    setToCache(docxPath, weeks);
  }
  
  return weeks;
}

/**
 * Load and parse a DOCX template with multiple sections/plans
 * @param staffMode - If true, enables detailed logging and sanity checks
 */
export async function loadProgramSectionsFromDocx(docxPath: string, staffMode: boolean = false): Promise<ProgramSection[]> {
  // Check cache first
  const cached = getSectionsFromCache(docxPath);
  if (cached && cached.length > 0) {
    // console.log(`[TemplateLoader] Using cached sections for ${docxPath}`);
    return cached;
  }
  
  // console.log(`[TemplateLoader] Loading sections from ${docxPath}`);
  
  // Fetch the DOCX file
  const response = await fetch(docxPath);
  if (!response.ok) {
    throw new Error(`Failed to fetch template: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  
  // Convert to HTML using mammoth
  const result = await mammoth.convertToHtml({ arrayBuffer });
  
  if (result.messages.length > 0) {
    // console.log("[TemplateLoader] Mammoth messages:", result.messages);
  }
  
  // Parse the HTML to extract sections with sanity checks
  const sections = await parseDocxHtmlToSections(result.value, staffMode);
  
  // console.log(`[TemplateLoader] Parsed ${sections.length} sections with ${sections.reduce((acc, s) => acc + s.weeks.length, 0)} total weeks`);
  
  // Cache the result
  if (sections.length > 0) {
    setSectionsToCache(docxPath, sections);
  }
  
  return sections;
}

/**
 * Clear template cache
 */
export function clearTemplateCache(docxPath?: string): void {
  if (docxPath) {
    localStorage.removeItem(getCacheKey(docxPath));
    localStorage.removeItem(getSectionsCacheKey(docxPath));
  } else {
    // Clear all template caches
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("template-cache-") || key.startsWith("template-sections-cache-")) {
        localStorage.removeItem(key);
      }
    });
  }
}
