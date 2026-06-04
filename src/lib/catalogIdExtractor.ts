/**
 * Extract workout catalog IDs from AI-generated session text.
 * Matches ALL TFCL™ catalog ID patterns including:
 *   A/B/C/D_BIKE|RUN|SWIM|TR|STR|BR|RECOVERY_*
 *   A/B/C/D_10K|703|IM|MAR|SEMI|HEAT|TAPER|RECUP|RACE|MENTAL|HALF|PAP|ALTITUDE|RESP|PRE_*
 *   BRICK_*, ENR_*, V2_*, V3_*, TPL_*, RS_*
 *   BR_HALF_*, BR_IM_*, BR_TAPER_*
 * Returns the first matched ID or null.
 */

const CATALOG_ID_PATTERN = /\b(?:[A-D]_(?:BIKE|RUN|SWIM|TR|STR|BR|RECOVERY|10K|703|IM|MAR|SEMI|HEAT|TAPER|RECUP|RACE|MENTAL|HALF|PAP|ALTITUDE|RESP|PRE)[A-Za-z0-9_]+|(?:BRICK|ENR|V[0-9]|TPL|RS|BR|URBAN|EXPE)_[A-Za-z0-9_]+)/g;

export function extractCatalogId(title: string, details?: string): string | null {
  const text = `${title || ""} ${details || ""}`;
  CATALOG_ID_PATTERN.lastIndex = 0;
  const match = CATALOG_ID_PATTERN.exec(text);
  CATALOG_ID_PATTERN.lastIndex = 0;
  return match ? match[0] : null;
}
