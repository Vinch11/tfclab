/**
 * DOCX Template Loader
 * Converts DOCX files to structured ProgramTemplate using mammoth
 * Supports multiple sections/plans in a single document
 */
import mammoth from "mammoth";

export interface TemplateSession {
  day: string;
  sport: string;
  title: string;
  details: string;
}

export interface TemplateWeek {
  weekNumber: number;
  sessions: TemplateSession[];
  coachAdvice?: string; // Conseils du coach pour la semaine
}

export interface ProgramSection {
  sectionId: string;
  sectionTitle: string;
  weeks: TemplateWeek[];
}

export interface ProgramTemplate {
  id: string;
  name: string;
  target: "IM" | "703" | "Marathon" | "Semi";
  source: "docx";
  docxPath: string;
  weeks: TemplateWeek[];
  multiSections?: boolean;
}

const CACHE_VERSION = "v3"; // Incremented for coach advice support

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

// Patterns to detect section headers
const SECTION_PATTERNS = [
  /plan/i,
  /finisher/i,
  /elite/i,
  /kona/i,
  /objectif/i,
  /version/i,
  /niveau/i,
  /groupe/i,
  /performance/i,
  /loisir/i,
  /débutant/i,
  /intermédiaire/i,
  /avancé/i,
  /programme/i,
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
  if (!cleaned || cleaned.length < 3 || cleaned.length > 100) return false;
  return SECTION_PATTERNS.some((pattern) => pattern.test(cleaned));
}

function extractSectionTitle(element: Element): string | null {
  const tagName = element.tagName.toLowerCase();
  const text = element.textContent?.trim() || "";
  
  // H1, H2, H3 are always section headers if they have text
  if (["h1", "h2", "h3"].includes(tagName) && text.length > 0) {
    return text;
  }
  
  // Check for strong/bold paragraphs that match patterns
  if (tagName === "p") {
    const hasStrong = element.querySelector("strong, b") !== null;
    if ((hasStrong || text.length < 50) && isSectionHeader(text)) {
      return text;
    }
  }
  
  return null;
}

function parseTableToWeek(table: Element, weekNumber: number): TemplateWeek {
  const rows = table.querySelectorAll("tr");
  const sessions: TemplateSession[] = [];
  
  // Skip first row (header)
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].querySelectorAll("td");
    if (cells.length >= 4) {
      const day = cleanText(cells[0]?.textContent || "");
      const sport = normalizeSport(cells[1]?.textContent || "");
      const title = cleanText(cells[2]?.textContent || "");
      const details = cleanText(cells[3]?.textContent || "");
      
      if (day || sport || title) {
        sessions.push({ day, sport, title, details });
      }
    } else if (cells.length >= 2) {
      // Some rows may have merged cells
      const day = cleanText(cells[0]?.textContent || "");
      const rest = cleanText(cells[1]?.textContent || "");
      if (day) {
        sessions.push({ 
          day, 
          sport: normalizeSport(rest), 
          title: rest, 
          details: "" 
        });
      }
    }
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
 * Parse DOCX HTML and extract sections with their weeks
 */
async function parseDocxHtmlToSections(html: string): Promise<ProgramSection[]> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  
  const sections: ProgramSection[] = [];
  let currentSection: ProgramSection | null = null;
  let weekCounter = 0;
  let sectionIndex = 0;
  
  // Get all body children to process in order
  const bodyChildren = doc.body.children;
  
  for (let i = 0; i < bodyChildren.length; i++) {
    const element = bodyChildren[i];
    const tagName = element.tagName.toLowerCase();
    const text = element.textContent?.trim() || "";
    
    // Check if this is a coach advice header
    if (isCoachAdviceHeader(text)) {
      // Extract advice and attach to the last week
      if (currentSection && currentSection.weeks.length > 0) {
        const { advice } = extractCoachAdvice(bodyChildren, i + 1);
        if (advice) {
          const lastWeek = currentSection.weeks[currentSection.weeks.length - 1];
          lastWeek.coachAdvice = advice;
        }
      }
      continue;
    }
    
    // Check if this is a section header
    const sectionTitle = extractSectionTitle(element);
    if (sectionTitle && !isCoachAdviceHeader(sectionTitle)) {
      // Save previous section if exists
      if (currentSection && currentSection.weeks.length > 0) {
        sections.push(currentSection);
      }
      
      // Start new section
      sectionIndex++;
      weekCounter = 0;
      currentSection = {
        sectionId: `section-${sectionIndex}`,
        sectionTitle: sectionTitle,
        weeks: [],
      };
      continue;
    }
    
    // Check if this is a table (week)
    if (tagName === "table") {
      weekCounter++;
      const week = parseTableToWeek(element, weekCounter);
      
      if (week.sessions.length > 0) {
        // If no section yet, create a default one
        if (!currentSection) {
          currentSection = {
            sectionId: "section-1",
            sectionTitle: "Plan principal",
            weeks: [],
          };
        }
        currentSection.weeks.push(week);
      }
    }
  }
  
  // Don't forget the last section
  if (currentSection && currentSection.weeks.length > 0) {
    sections.push(currentSection);
  }
  
  // If no sections were detected (no headers found), create one default section
  if (sections.length === 0) {
    // Fall back to old parsing method
    const tables = doc.querySelectorAll("table");
    const weeks: TemplateWeek[] = [];
    let wn = 0;
    
    tables.forEach((table) => {
      wn++;
      const week = parseTableToWeek(table, wn);
      if (week.sessions.length > 0) {
        weeks.push(week);
      }
    });
    
    if (weeks.length > 0) {
      sections.push({
        sectionId: "section-1",
        sectionTitle: "Plan principal",
        weeks,
      });
    }
  }
  
  // If multiple sections but titles are not clear, use fallback names
  if (sections.length > 1) {
    sections.forEach((section, idx) => {
      if (section.sectionTitle === "Plan principal" || !section.sectionTitle) {
        section.sectionTitle = `Plan ${String.fromCharCode(65 + idx)}`; // Plan A, Plan B, etc.
      }
    });
  }
  
  return sections;
}

/**
 * Parse DOCX content and extract weeks/sessions (legacy single-section mode)
 */
async function parseDocxHtml(html: string): Promise<TemplateWeek[]> {
  const sections = await parseDocxHtmlToSections(html);
  // Flatten all sections into one
  return sections.flatMap((s) => s.weeks);
}

/**
 * Load and parse a DOCX template from a given path (single-section mode)
 */
export async function loadProgramTemplateFromDocx(docxPath: string): Promise<TemplateWeek[]> {
  // Check cache first
  const cached = getFromCache(docxPath);
  if (cached && cached.length > 0) {
    console.log(`[TemplateLoader] Using cached template for ${docxPath}`);
    return cached;
  }
  
  console.log(`[TemplateLoader] Loading template from ${docxPath}`);
  
  // Fetch the DOCX file
  const response = await fetch(docxPath);
  if (!response.ok) {
    throw new Error(`Failed to fetch template: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  
  // Convert to HTML using mammoth
  const result = await mammoth.convertToHtml({ arrayBuffer });
  
  if (result.messages.length > 0) {
    console.log("[TemplateLoader] Mammoth messages:", result.messages);
  }
  
  // Parse the HTML to extract weeks
  const weeks = await parseDocxHtml(result.value);
  
  console.log(`[TemplateLoader] Parsed ${weeks.length} weeks`);
  
  // Cache the result
  if (weeks.length > 0) {
    setToCache(docxPath, weeks);
  }
  
  return weeks;
}

/**
 * Load and parse a DOCX template with multiple sections/plans
 */
export async function loadProgramSectionsFromDocx(docxPath: string): Promise<ProgramSection[]> {
  // Check cache first
  const cached = getSectionsFromCache(docxPath);
  if (cached && cached.length > 0) {
    console.log(`[TemplateLoader] Using cached sections for ${docxPath}`);
    return cached;
  }
  
  console.log(`[TemplateLoader] Loading sections from ${docxPath}`);
  
  // Fetch the DOCX file
  const response = await fetch(docxPath);
  if (!response.ok) {
    throw new Error(`Failed to fetch template: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  
  // Convert to HTML using mammoth
  const result = await mammoth.convertToHtml({ arrayBuffer });
  
  if (result.messages.length > 0) {
    console.log("[TemplateLoader] Mammoth messages:", result.messages);
  }
  
  // Parse the HTML to extract sections
  const sections = await parseDocxHtmlToSections(result.value);
  
  console.log(`[TemplateLoader] Parsed ${sections.length} sections with ${sections.reduce((acc, s) => acc + s.weeks.length, 0)} total weeks`);
  
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
