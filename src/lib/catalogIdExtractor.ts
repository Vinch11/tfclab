/**
 * Extract workout catalog IDs from AI-generated session text.
 *
 * Phase 1C-A — Priority order :
 *   1. `structuredCatalogId` argument (populated by jsonPlanToParsedPlan for JSON path).
 *   2. Regex on `title + details` (fallback for Markdown legacy path).
 *
 * Matches ALL TFCL™ catalog ID patterns.
 */

const CATALOG_ID_PATTERN = /\b(?:[A-D]_(?:LCW|BIKE|RUN|SWIM|TR|STR|BR|RECOVERY|10K|703|IM|MAR|SEMI|HEAT|TAPER|RECUP|RACE|MENTAL|HALF|PAP|ALTITUDE|RESP|PRE|FOAM|ACTIVATION|DELOAD|MOBILITY|YOGA|VISUALIZATION|COLD)[A-Za-z0-9_]+|(?:BRICK|ENR|V[0-9]|TPL|RS|BR|URBAN|EXPE|LCW|S2R|HEAT|FATMAX|FM|TAPER|OWS|ECONOMY|AERO|RMT|CONTRAST|NUTRITION|RECOVERY|REST|TRAIL|BFR|BILLAT|NORWEGIAN|CANOVA|SEILER|COGGAN|SKIBA|LYDIARD|KENYAN)_[A-Za-z0-9_]+)/g;

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

/**
 * Variante multi-ID : une séance brick/pyramide peut mentionner plusieurs
 * fiches dans son texte (ex. "BRICK_703_BIKE_RUN — B_BIKE_SST_3x20 +
 * B_RUN_TEMPO_LONG"). Consommée par planValidator.ts::validateCatalogRatio
 * pour ne pas sous-compter la diversité catalogue réelle d'une telle séance
 * (fix E3 — remplace la copie locale incomplète de CATALOG_ID_PATTERN par
 * cette même regex à jour, sans perdre le comptage multi-ID par séance).
 */
export function extractAllCatalogIds(
  title: string,
  details?: string,
  structuredCatalogId?: string | null,
): string[] {
  if (typeof structuredCatalogId === "string" && structuredCatalogId.trim().length > 0) {
    return [structuredCatalogId.trim()];
  }
  const text = `${title || ""} ${details || ""}`;
  CATALOG_ID_PATTERN.lastIndex = 0;
  const ids: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = CATALOG_ID_PATTERN.exec(text)) !== null) {
    ids.push(match[0]);
  }
  CATALOG_ID_PATTERN.lastIndex = 0;
  return ids;
}
