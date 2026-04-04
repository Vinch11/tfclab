/**
 * Extract workout catalog IDs from AI-generated session text.
 * Matches TFCL™ catalog ID patterns like A_RUN_Z2_EASY, B_BIKE_VO2_BILLAT, etc.
 * Returns the first matched ID or null.
 */

const CATALOG_ID_PATTERN = /\b[A-Z]{1,3}_(?:BIKE|RUN|SWIM|TR|STR|BR|RECOVERY)[A-Z0-9_]+/g;

export function extractCatalogId(title: string, details?: string): string | null {
  const text = `${title || ""} ${details || ""}`;
  CATALOG_ID_PATTERN.lastIndex = 0;
  const match = CATALOG_ID_PATTERN.exec(text);
  CATALOG_ID_PATTERN.lastIndex = 0;
  return match ? match[0] : null;
}
