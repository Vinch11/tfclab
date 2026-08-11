/**
 * sessionContextDelta — Rendu hybride fiche/IA (option 1)
 * ────────────────────────────────────────────────────────
 * Quand une séance du plan IA est résolue vers une fiche bibliothèque,
 * le texte brut généré par l'IA duplique ~80 % de la fiche (et peut diverger
 * si la fiche a été corrigée depuis la génération du plan).
 *
 * Ce helper isole le *delta* : uniquement les lignes de l'IA qui apportent
 * une information absente de la fiche (durée réellement prescrite, intensité
 * chiffrée, note contextuelle, justification du placement).
 *
 * Le texte brut reste stocké tel quel (source pour Nolio / PDF) : on ne
 * modifie que l'affichage.
 */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\*\*/g, "")
    .replace(/[^a-z0-9%'./:+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return normalize(s).split(" ").filter((t) => t.length > 2);
}

/** Similarité de Jaccard sur les tokens significatifs. */
function similarity(a: string[], bSet: Set<string>): number {
  if (a.length === 0) return 0;
  let hits = 0;
  for (const t of a) if (bSet.has(t)) hits++;
  return hits / a.length;
}

export interface FicheLike {
  objectif?: string;
  when?: string;
  avoid?: string;
  notes?: string;
  structure?: { part: string; text: string; zones?: string[] }[];
  variants?: { goal: string; text: string }[];
}

/**
 * Retourne les lignes du texte IA qui ne sont pas déjà couvertes par la fiche.
 * @param details texte brut de la séance (déjà enrichi des valeurs absolues)
 * @param fiche fiche bibliothèque résolue
 */
export function extractContextLines(details: string, fiche: FicheLike | null): string[] {
  const raw = (details || "")
    .split(/\r?\n+/)
    .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim())
    .filter((l) => l.length > 0);

  if (!fiche) return raw;

  const ficheChunks: string[] = [
    fiche.objectif || "",
    fiche.when || "",
    fiche.avoid || "",
    fiche.notes || "",
    ...(fiche.structure || []).flatMap((s) => [s.text, (s.zones || []).join(" ")]),
    ...(fiche.variants || []).map((v) => v.text),
  ];
  const ficheTokens = new Set(ficheChunks.flatMap((c) => tokens(c)));

  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of raw) {
    const n = normalize(line);
    if (!n || n.length < 3) continue;
    if (seen.has(n)) continue;
    // Lignes trop courtes (titres de bloc "Warm-up", "Main") → bruit
    if (/^(warm.?up|echauffement|main|corps|cool.?down|retour au calme)\s*:?$/i.test(line.trim())) continue;
    const t = tokens(line);
    if (t.length >= 3 && similarity(t, ficheTokens) >= 0.8) continue;
    seen.add(n);
    out.push(line);
  }
  return out;
}
