// mammoth is dynamically imported inside loadAcademyHtml to keep it out of the initial bundle

const CACHE_KEY = "academy-docx-cache-v1";
const DOCX_PATH = "/academy/THEORIE_PLANIFICATION.docx";

interface CacheEntry {
  html: string;
  timestamp: number;
}

function getFromCache(): string | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const entry: CacheEntry = JSON.parse(cached);
      // Cache valid for 24 hours
      if (Date.now() - entry.timestamp < 24 * 60 * 60 * 1000) {
        return entry.html;
      }
    }
  } catch (e) {
    console.warn("Failed to read academy cache:", e);
  }
  return null;
}

function setToCache(html: string): void {
  try {
    const entry: CacheEntry = {
      html,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch (e) {
    console.warn("Failed to write academy cache:", e);
  }
}

export async function loadAcademyHtml(): Promise<string> {
  // Try cache first
  const cached = getFromCache();
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(DOCX_PATH);
    if (!response.ok) {
      throw new Error(`Failed to fetch DOCX: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const { default: mammoth } = await import("mammoth");
    const result = await mammoth.convertToHtml({ arrayBuffer });
    
    const html = result.value;
    setToCache(html);
    
    return html;
  } catch (error) {
    console.error("Failed to load academy DOCX:", error);
    throw error;
  }
}

export function clearAcademyCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (e) {
    console.warn("Failed to clear academy cache:", e);
  }
}
