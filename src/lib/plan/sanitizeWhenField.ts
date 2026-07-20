/**
 * sanitizeWhenField
 * ─────────────────
 * Le champ `when` des fiches catalogue provient souvent d'un plan source
 * (marathon 18 sem, IM 24 sem…) et cite des semaines absolues (« S5-S6 »,
 * « S9-S18 », « S17 »). Injecté tel quel dans un plan de 9 semaines, il
 * devient incohérent : l'athlète voit « Quand : S17 » dans un plan qui
 * s'arrête à S9.
 *
 * Cette fonction :
 *  1. Supprime les mentions de semaines absolues (SXX ou SXX-SYY) qui
 *     sortent du plan courant.
 *  2. Nettoie les résidus de ponctuation.
 *  3. Retourne `null` si le texte devient vide (le caller masque alors la ligne).
 *
 * Aucune logique métier n'est modifiée — pur affichage.
 */
export function sanitizeWhenField(
  raw: string | undefined | null,
  planTotalWeeks: number
): string | null {
  if (!raw) return null;
  let out = String(raw);

  // Remplace les fourchettes "SXX-SYY" hors plan par "phase adéquate"
  out = out.replace(/S(\d{1,2})\s*[-–—]\s*S(\d{1,2})/gi, (m, a, b) => {
    const start = parseInt(a, 10);
    const end = parseInt(b, 10);
    if (start > planTotalWeeks || end > planTotalWeeks) return "phase adéquate";
    return m;
  });

  // Supprime les mentions simples "SXX" hors plan
  out = out.replace(/\bS(\d{1,2})\b/gi, (m, a) => {
    const n = parseInt(a, 10);
    if (n > planTotalWeeks) return "";
    return m;
  });

  // Nettoyage résiduel (virgules doubles, espaces multiples, parenthèses vides)
  out = out
    .replace(/\(\s*\)/g, "")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,.;–—-]+|[\s,.;–—-]+$/g, "")
    .trim();

  return out.length > 0 ? out : null;
}
