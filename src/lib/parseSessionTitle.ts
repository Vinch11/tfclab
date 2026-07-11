/**
 * parseSessionTitle — Sépare les préfixes `[TAG · TAG · ID]` d'un titre de séance IA
 * pour l'affichage. Le texte brut reste la source de vérité pour l'extraction
 * catalogue (`catalogIdExtractor`), la validation Lorang A/B/C/D et le parsing sport.
 *
 * Exemples :
 *   "[BIKE · A · A_BIKE_VO2_01] 5x4' VO2"
 *     → { tags: ["BIKE","A","A_BIKE_VO2_01"], catalogId: "A_BIKE_VO2_01",
 *         lorangCategory: "A", cleanTitle: "5x4' VO2" }
 *   "[URBAIN · TAPIS] SL 2h tapis"
 *     → { tags: ["URBAIN","TAPIS"], cleanTitle: "SL 2h tapis" }
 *   "🔑 Séance clé libre" (pas de crochets)
 *     → { tags: [], cleanTitle: "🔑 Séance clé libre" }
 */

import { extractCatalogId } from "./catalogIdExtractor";

const LEADING_BRACKETS = /^\s*(?:\[[^\]]+\]\s*)+/;
const BRACKET_TOKENS = /\[([^\]]+)\]/g;
const SEPARATORS = /\s*[·|•]\s*|\s{2,}/;
const LORANG_RE = /^[A-D]$/;

export interface ParsedSessionTitle {
  /** Titre lisible, sans les préfixes `[...]` */
  cleanTitle: string;
  /** Tokens extraits des crochets, dans l'ordre d'apparition */
  tags: string[];
  /** ID catalogue (A_BIKE_..., URBAN_..., BRICK_..., etc.) si détecté */
  catalogId: string | null;
  /** Catégorie Lorang A/B/C/D si présente comme token isolé */
  lorangCategory: "A" | "B" | "C" | "D" | null;
  /** Le titre brut (inchangé) — source de vérité pour le pipeline */
  raw: string;
}

export function parseSessionTitle(raw: string): ParsedSessionTitle {
  if (!raw) {
    return { cleanTitle: "", tags: [], catalogId: null, lorangCategory: null, raw: "" };
  }
  const leading = raw.match(LEADING_BRACKETS)?.[0] ?? "";
  const cleanTitle = raw.slice(leading.length).trim();

  const tags: string[] = [];
  let m: RegExpExecArray | null;
  BRACKET_TOKENS.lastIndex = 0;
  while ((m = BRACKET_TOKENS.exec(leading)) !== null) {
    for (const part of m[1].split(SEPARATORS)) {
      const t = part.trim();
      if (t) tags.push(t);
    }
  }

  const catalogId = extractCatalogId(raw);
  const lorang = tags.find((t) => LORANG_RE.test(t)) as
    | "A" | "B" | "C" | "D" | undefined;

  return {
    cleanTitle: cleanTitle || raw,
    tags,
    catalogId,
    lorangCategory: lorang ?? null,
    raw,
  };
}
