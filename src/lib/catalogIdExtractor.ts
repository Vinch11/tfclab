/**
 * Extract workout catalog IDs from AI-generated session text.
 *
 * Phase 1C-A — Priority order :
 *   1. `structuredCatalogId` argument (populated by jsonPlanToParsedPlan for JSON path).
 *   2. Regex on `title + details` (fallback for Markdown legacy path).
 *
 * Matches ALL TFCL™ catalog ID patterns.
 */

const CATALOG_ID_PATTERN = /\b(?:[A-D]_(?:LCW|BIKE|RUN|SWIM|TR|STR|BR|RECOVERY|10K|703|IM|MAR|SEMI|HEAT|TAPER|RECUP|RACE|MENTAL|HALF|PAP|ALTITUDE|RESP|PRE)[A-Za-z0-9_]+|(?:BRICK|ENR|V[0-9]|TPL|RS|BR|URBAN|EXPE|LCW|S2R)_[A-Za-z0-9_]+)/g;

export function extractCatalogId(
  title: string,
  details?: string,
  structuredCatalogId?: string | null,
): string | null {
  if (typeof structuredCatalogId === "string" && structuredCatalogId.trim().length > 0) {
    return structuredCatalogId.trim();
  }
  const text = `${title || ""} ${details || ""}`;
  CATALOG_ID_PATTERN.lastIndex = 0;
  const match = CATALOG_ID_PATTERN.exec(text);
  CATALOG_ID_PATTERN.lastIndex = 0;
  return match ? match[0] : null;
}
