/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 2C — POST-TRAITEMENT TEXTE DES SÉANCES (déterministe)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Deux filets non silencieux appliqués à `title` et `details` de chaque session :
 *
 * 1. **Dédup des annotations de valeur** :
 *    Collapse "X% FTP (X% FTP)", "252W (252W)", "60 g/h (60 g/h)", "CSS+5s
 *    (CSS+5s)" → "X% FTP". Comparaison tolérante (espaces, casse). Si le paren
 *    contient une valeur DIFFÉRENTE, on garde tel quel (pas de choix arbitraire)
 *    mais on log `intensity_value_mismatch` pour investigation.
 *
 * 2. **Résolution des plages de durée > 30 min d'amplitude** :
 *    Un Main "2h30-4h30" n'est pas une prescription. On résout en durée unique
 *    d'après (phase, jour). Log `duration_range_resolved`. Les plages ≤ 30 min
 *    (ex "40-50'") passent inchangées — elles sont légitimes.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══ 1. DÉDUP ANNOTATIONS ════════════════════════════════════════════════════

/**
 * Regex de VALEURS que l'on considère "annotables entre parens".
 * Doit matcher un token de valeur (pas juste un mot).
 * Groupes nommés indisponibles cross-navigateur : on capture le token entier.
 */
const VALUE_TOKEN = String.raw`(?:\d{1,3}\s*%\s*(?:FTP|VMA|CSS|FCmax|CP\s*Run|CPRun)|\d{2,4}\s*W|\d{1,3}\s*g\s*\/?\s*h|CSS\s*[+-]\s*\d{1,2}\s*s|\d{1,2}[:'](?:\d{2})\s*\/\s*(?:km|100\s*m))`;

const DUP_RX = new RegExp(
  `(${VALUE_TOKEN})\\s*\\(\\s*(${VALUE_TOKEN})\\s*\\)`,
  "gi",
);

function normValue(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

export interface DedupResult {
  text: string;
  collapsed: number;   // occurrences collapsed (X (X))
  mismatched: number;  // occurrences X (Y) où X ≠ Y (non modifié, seulement loggé)
  logs: string[];
}

/**
 * Collapse "TOKEN (TOKEN)" en "TOKEN" quand les deux valeurs sont équivalentes.
 * Fonction pure. N'altère jamais le contenu quand les valeurs diffèrent.
 */
export function collapseDuplicateValueAnnotations(text: string): DedupResult {
  if (!text) return { text: text ?? "", collapsed: 0, mismatched: 0, logs: [] };
  let collapsed = 0;
  let mismatched = 0;
  const logs: string[] = [];
  const out = text.replace(DUP_RX, (match, a: string, b: string) => {
    if (normValue(a) === normValue(b)) {
      collapsed++;
      logs.push(`intensity_annotation_collapsed: "${match}" → "${a}"`);
      return a;
    }
    mismatched++;
    logs.push(`intensity_value_mismatch: "${a}" annoté "(${b})" — valeurs divergentes, non modifié`);
    return match;
  });
  return { text: out, collapsed, mismatched, logs };
}

// ═══ 2. RÉSOLUTION PLAGES DE DURÉE > 30 MIN ═════════════════════════════════

/**
 * Détecte "XhYY-AhBB", "XhYY-AhBB'", "X'-Y'", "Xh-Yh", "XXmin-YYmin", etc.
 * Renvoie [minA, minB] en minutes ou null.
 */
function parseDurationRange(m: string): [number, number] | null {
  // Normalise apostrophes typographiques et espaces
  const s = m.replace(/[’′]/g, "'").replace(/\s+/g, "");
  // Pattern accepté : (Nh(mm)? | Nmin | N')-(Nh(mm)? | Nmin | N')
  const rx = /^(\d{1,2})(?:h(\d{0,2})|min|')-(\d{1,2})(?:h(\d{0,2})|min|')$/i;
  const mm = s.match(rx);
  if (!mm) return null;
  const [, h1, m1, h2, m2] = mm;
  // Reconstruit lecture : le suffixe capturé est ambigu (h vs min vs ') donc on
  // reprend depuis la chaîne pour identifier le suffixe de chaque borne.
  const parts = s.split("-");
  if (parts.length !== 2) return null;
  const toMin = (p: string): number | null => {
    const mh = p.match(/^(\d{1,2})h(\d{0,2})?$/i);
    if (mh) return Number(mh[1]) * 60 + (mh[2] ? Number(mh[2]) : 0);
    const mmin = p.match(/^(\d{1,3})(?:min|')$/i);
    if (mmin) return Number(mmin[1]);
    return null;
  };
  const a = toMin(parts[0]);
  const b = toMin(parts[1]);
  if (a == null || b == null || a >= b) return null;
  return [a, b];
}

function formatMinutes(n: number): string {
  if (n < 60) return `${n}'`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** Fraction de la plage à retenir selon phase. Base/récup→bas, build→milieu, peak→haut, taper→bas. */
function pickFraction(phase?: string): number {
  const p = (phase ?? "").toLowerCase();
  if (/(recovery|récup|recup|taper|décharge|decharge)/.test(p)) return 0.35;
  if (/(peak|pic|affûtage|affutage)/.test(p)) return 0.75;
  if (/(build|développement|developpement|specific|spécifique|specifique)/.test(p)) return 0.55;
  return 0.45; // base / défaut
}

const RANGE_TEXT_RX = /(\d{1,2}(?:h\d{0,2}|min|['’′]))\s*[-–]\s*(\d{1,2}(?:h\d{0,2}|min|['’′]))/g;

export interface DurationResolveResult {
  text: string;
  resolved: number;
  logs: string[];
}

/**
 * Résout toute plage de durée > 30 min d'amplitude en une valeur unique dérivée
 * de la phase. Log `duration_range_resolved`. Les plages ≤ 30 min sont laissées
 * intactes (une variabilité fine reste une prescription légitime).
 */
export function resolveWideDurationRanges(
  text: string,
  opts: { phase?: string; dayIndex?: number; ambitionEffective?: string },
): DurationResolveResult {
  if (!text) return { text: text ?? "", resolved: 0, logs: [] };
  let resolved = 0;
  const logs: string[] = [];
  const frac = pickFraction(opts.phase);
  const out = text.replace(RANGE_TEXT_RX, (match) => {
    const range = parseDurationRange(match);
    if (!range) return match;
    const [a, b] = range;
    const amplitude = b - a;
    if (amplitude <= 30) return match; // plage étroite acceptable
    const picked = Math.round((a + (b - a) * frac) / 5) * 5;
    const resolvedStr = formatMinutes(picked);
    logs.push(
      `duration_range_resolved: "${match}" (${a}-${b}min, Δ${amplitude}min) → "${resolvedStr}" (phase=${opts.phase ?? "n/a"}, frac=${frac})`,
    );
    resolved++;
    return resolvedStr;
  });
  return { text: out, resolved, logs };
}

// ═══ 3. APPLICATION SUR UNE SESSION ══════════════════════════════════════════

export interface SessionLike {
  title?: string;
  details?: string;
  phase?: string;
  dayIndex?: number;
}

export interface SessionPostProcessStats {
  duplicatesCollapsed: number;
  duplicatesMismatched: number;
  durationRangesResolved: number;
  logs: string[];
}

/**
 * Applique dédup + résolution de plages sur title+details d'une session.
 * Mute l'objet (in-place) — usage prévu dans postProcessParsedPlan.
 */
export function postProcessSessionText(
  session: SessionLike,
  ambitionEffective?: string,
): SessionPostProcessStats {
  const stats: SessionPostProcessStats = {
    duplicatesCollapsed: 0,
    duplicatesMismatched: 0,
    durationRangesResolved: 0,
    logs: [],
  };
  for (const key of ["title", "details"] as const) {
    const orig = session[key];
    if (typeof orig !== "string" || !orig) continue;
    const dedup = collapseDuplicateValueAnnotations(orig);
    const dur = resolveWideDurationRanges(dedup.text, {
      phase: session.phase,
      dayIndex: session.dayIndex,
      ambitionEffective,
    });
    if (dedup.text !== orig || dur.text !== dedup.text) {
      session[key] = dur.text;
    }
    stats.duplicatesCollapsed += dedup.collapsed;
    stats.duplicatesMismatched += dedup.mismatched;
    stats.durationRangesResolved += dur.resolved;
    stats.logs.push(...dedup.logs, ...dur.logs);
  }
  return stats;
}
