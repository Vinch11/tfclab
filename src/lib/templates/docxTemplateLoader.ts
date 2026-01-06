/**
 * DOCX Template Loader
 * Converts DOCX files to structured ProgramTemplate using mammoth
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
}

export interface ProgramTemplate {
  id: string;
  name: string;
  target: "IM" | "703" | "Marathon" | "Semi";
  source: "docx";
  docxPath: string;
  weeks: TemplateWeek[];
}

const CACHE_VERSION = "v1";

function getCacheKey(docxPath: string): string {
  return `template-cache-${docxPath}-${CACHE_VERSION}`;
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

function setToCache(docxPath: string, weeks: TemplateWeek[]): void {
  try {
    localStorage.setItem(getCacheKey(docxPath), JSON.stringify(weeks));
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

/**
 * Parse DOCX content and extract weeks/sessions
 */
async function parseDocxHtml(html: string): Promise<TemplateWeek[]> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  
  const weeks: TemplateWeek[] = [];
  const tables = doc.querySelectorAll("table");
  
  let weekNumber = 0;
  
  tables.forEach((table) => {
    const rows = table.querySelectorAll("tr");
    if (rows.length < 2) return; // Skip tables with only header
    
    weekNumber++;
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
    
    if (sessions.length > 0) {
      weeks.push({ weekNumber, sessions });
    }
  });
  
  return weeks;
}

/**
 * Load and parse a DOCX template from a given path
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
 * Clear template cache
 */
export function clearTemplateCache(docxPath?: string): void {
  if (docxPath) {
    localStorage.removeItem(getCacheKey(docxPath));
  } else {
    // Clear all template caches
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("template-cache-")) {
        localStorage.removeItem(key);
      }
    });
  }
}
