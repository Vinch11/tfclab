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

// "(TOKEN sep TOKEN)" — séparateurs progression: / , → , -> , - , à
const SLASH_DUP_RX = new RegExp(
  `\\(\\s*(${VALUE_TOKEN})\\s*(?:\\/|→|->|-|à)\\s*(${VALUE_TOKEN})\\s*\\)`,
  "gi",
);

function normValue(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

export interface DedupResult {
  text: string;
  collapsed: number;   // occurrences collapsed (X (X))
  mismatched: number;  // occurrences X (Y) où X ≠ Y (non modifié, seulement loggé)
  slashCollapsed?: number; // (X / X) → (X)
  progressionFlattened?: number; // signal: (Xdiff sep Ydiff) préservé mais X!=Y — non modifié
  logs: string[];
}

/**
 * Collapse "TOKEN (TOKEN)" en "TOKEN" quand les deux valeurs sont équivalentes.
 * Collapse aussi "(TOKEN / TOKEN)" (séparateur /, →, ->, -, à) quand identiques.
 * Fonction pure. N'altère jamais le contenu quand les valeurs diffèrent.
 */
export function collapseDuplicateValueAnnotations(text: string): DedupResult {
  if (!text) return { text: text ?? "", collapsed: 0, mismatched: 0, slashCollapsed: 0, progressionFlattened: 0, logs: [] };
  let collapsed = 0;
  let mismatched = 0;
  let slashCollapsed = 0;
  let progressionFlattened = 0;
  const logs: string[] = [];
  let out = text.replace(DUP_RX, (match, a: string, b: string) => {
    if (normValue(a) === normValue(b)) {
      collapsed++;
      logs.push(`intensity_annotation_collapsed: "${match}" → "${a}"`);
      return a;
    }
    mismatched++;
    logs.push(`intensity_value_mismatch: "${a}" annoté "(${b})" — valeurs divergentes, non modifié`);
    return match;
  });
  const before = out;
  out = out.replace(SLASH_DUP_RX, (match, a: string, b: string) => {
    if (normValue(a) === normValue(b)) {
      slashCollapsed++;
      const replaced = `(${a})`;
      logs.push(`slash_dedup_collapsed: "${match}" → "${replaced}"`);
      return replaced;
    }
    // Bornes distinctes — progression légitime, laissée intacte mais loggée
    progressionFlattened++;
    logs.push(`progression_preserved: "${match}" (bornes distinctes ${a} / ${b})`);
    return match;
  });
  if (before !== out) {
    // no-op marker
  }
  return { text: out, collapsed, mismatched, slashCollapsed, progressionFlattened, logs };
}


// ═══ 2. RÉSOLUTION PLAGES DE DURÉE > 30 MIN ═════════════════════════════════

/**
 * Détecte "XhYY-AhBB", "XhYY-AhBB'", "X'-Y'", "Xh-Yh", "XXmin-YYmin",
 * "90-180 min", "60-120 min", "90-140'" (unité partagée à droite).
 * Renvoie [minA, minB] en minutes ou null.
 */
function parseDurationRange(m: string): [number, number] | null {
  // Normalise apostrophes typographiques et espaces
  const raw = m.replace(/[’′]/g, "'");
  const s = raw.replace(/\s+/g, "");
  // Chaque borne peut avoir sa propre unité, ou l'unité peut être partagée à droite:
  // ex: "90-180min", "60-120 min", "90-140'", "2h30-4h30", "1h-4h"
  const rx = /^(\d{1,3})(h\d{0,2}|min|')?-(\d{1,3})(h\d{0,2}|min|')?$/i;
  const mm = s.match(rx);
  if (!mm) return null;
  const [, n1, u1raw, n2, u2raw] = mm;
  // Si aucune borne n'a d'unité → skip (non identifiable comme durée)
  if (!u1raw && !u2raw) return null;
  // Unité partagée : si une borne n'a pas d'unité, hérite de l'autre (préfère la droite)
  const u1 = (u1raw || u2raw || "").toLowerCase();
  const u2 = (u2raw || u1raw || "").toLowerCase();
  const toMin = (n: string, u: string): number | null => {
    if (u.startsWith("h")) {
      const mins = u.length > 1 ? Number(u.slice(1)) : 0;
      return Number(n) * 60 + (isFinite(mins) ? mins : 0);
    }
    if (u === "min" || u === "'") return Number(n);
    return null;
  };
  const a = toMin(n1, u1);
  const b = toMin(n2, u2);
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

// Formes acceptées :
//  - "2h30-4h30", "1h-4h", "40'-50'", "40min-90min"
//  - "90-180 min", "60-120 min", "90-140'" (unité partagée, éventuellement à droite)
const RANGE_TEXT_RX = /(\d{1,3}(?:\s*(?:h\d{0,2}|min|['’′]))?)\s*[-–]\s*(\d{1,3}\s*(?:h\d{0,2}|min|['’′]))/g;



export interface DurationResolveResult {
  text: string;
  resolved: number;
  logs: string[];
}

// Import matrix pour résolution par sessionSizingMatrix (déterministe).
import {
  computeWeeklySessionQuota,
  inferWeekType,
  normalizeSizingObjective,
  type WeekType,
} from "./sessionSizingMatrix";

export interface MatrixResolveContext {
  objective?: string;
  ambitionEffective?: string;
  weeklyHours?: number;
  weekNumber?: number;
  totalWeeks?: number;
  weekType?: WeekType;
  sport?: string; // "bike"|"run"|"swim"|"brick"|"strength"|"recovery"
}

/**
 * Tente une résolution matrice pour une plage bike/run :
 * - Récupère slLongRideMin / slLongRunMin de sessionSizingMatrix
 * - Clamp à [rangeMin, rangeMax] de la fiche
 * - Retourne null si sport hors scope ou matrice indisponible
 */
function tryMatrixResolve(
  rangeMin: number,
  rangeMax: number,
  ctx?: MatrixResolveContext,
): { picked: number; source: string; clamped: boolean; matrixInputs: Record<string, unknown> } | null {
  if (!ctx) return null;
  const { objective, ambitionEffective, weeklyHours, weekNumber, totalWeeks, sport } = ctx;
  if (!objective || !ambitionEffective || typeof weeklyHours !== "number") return null;
  if (!sport) return null;
  const sportLc = sport.toLowerCase();
  if (sportLc !== "bike" && sportLc !== "run") return null;
  const objKey = normalizeSizingObjective(objective);
  if (!objKey) return null;
  const wt: WeekType =
    ctx.weekType ??
    (typeof weekNumber === "number" && typeof totalWeeks === "number"
      ? inferWeekType(weekNumber, totalWeeks)
      : "load");
  const q = computeWeeklySessionQuota(objective, ambitionEffective, weeklyHours, wt);
  if (!q) return null;
  const floor = sportLc === "bike" ? q.floors.slLongRideMin : q.floors.slLongRunMin;
  if (typeof floor !== "number") return null;
  const inputs = {
    objective,
    objKey,
    ambitionEffective,
    weeklyHours,
    weekType: wt,
    weekNumber,
    totalWeeks,
    sport: sportLc,
    matrixFloorMin: floor,
    cardRange: [rangeMin, rangeMax] as [number, number],
    downgraded: q.downgraded,
  };
  let picked = floor;
  let clamped = false;
  if (picked < rangeMin) { picked = rangeMin; clamped = true; }
  else if (picked > rangeMax) { picked = rangeMax; clamped = true; }
  picked = Math.round(picked / 5) * 5;
  return { picked, source: `matrix:${sportLc}${sportLc === "bike" ? "SLRide" : "SLRun"}`, clamped, matrixInputs: inputs };
}

/**
 * Résout toute plage de durée > 30 min d'amplitude en une valeur unique.
 * Priorité :
 *   1. `sessionSizingMatrix` (déterministe, sport-aware) via `MatrixResolveContext`
 *      → valeur clampée dans la plage de la fiche.
 *   2. Fallback heuristique par phase (base/build/peak/taper).
 * Log `duration_range_resolved` avec inputs matrice quand utilisée,
 * `duration_clamped_to_card_range` si clamp appliqué.
 */
export function resolveWideDurationRanges(
  text: string,
  opts: {
    phase?: string;
    dayIndex?: number;
    ambitionEffective?: string;
  } & MatrixResolveContext = {},
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

    // 1) Résolution matrice (prioritaire)
    const mx = tryMatrixResolve(a, b, opts);
    if (mx) {
      const resolvedStr = formatMinutes(mx.picked);
      logs.push(
        `freetext_duration_resolved: "${match}" (${a}-${b}min, Δ${amplitude}min) → "${resolvedStr}" via ${mx.source} inputs=${JSON.stringify(mx.matrixInputs)}`,
      );
      if (mx.clamped) {
        logs.push(
          `freetext_duration_clamped: matrix=${mx.matrixInputs.matrixFloorMin}min → "${resolvedStr}" (borne fiche [${a},${b}])`,
        );
      }
      resolved++;
      return resolvedStr;
    }

    // 2) Fallback heuristique par phase (matrice indisponible)
    const picked = Math.round((a + (b - a) * frac) / 5) * 5;
    const resolvedStr = formatMinutes(picked);
    logs.push(
      `freetext_duration_resolved: "${match}" (${a}-${b}min, Δ${amplitude}min) → "${resolvedStr}" via phase-fallback (phase=${opts.phase ?? "n/a"}, frac=${frac}, matrix_gap=${describeMatrixGap(opts)})`,
    );
    resolved++;
    return resolvedStr;
  });

  return { text: out, resolved, logs };
}

function describeMatrixGap(ctx: MatrixResolveContext): string {
  const missing: string[] = [];
  if (!ctx.objective) missing.push("objective");
  if (!ctx.ambitionEffective) missing.push("ambitionEffective");
  if (typeof ctx.weeklyHours !== "number") missing.push("weeklyHours");
  if (!ctx.sport) missing.push("sport");
  if (ctx.sport && !["bike", "run"].includes(ctx.sport.toLowerCase())) missing.push(`sport_out_of_scope:${ctx.sport}`);
  if (ctx.objective && !normalizeSizingObjective(ctx.objective)) missing.push(`objective_not_matrixed:${ctx.objective}`);
  return missing.length ? missing.join(",") : "no_sl_floor_for_sport";
}

// ═══ 3. APPLICATION SUR UNE SESSION ══════════════════════════════════════════

export interface SessionLike {
  title?: string;
  details?: string;
  phase?: string;
  dayIndex?: number;
  weekNumber?: number;
  sport?: string;
}

export interface SessionPostProcessStats {
  duplicatesCollapsed: number;
  duplicatesMismatched: number;
  durationRangesResolved: number;
  slashDedupCollapsed: number;
  progressionPreserved: number;
  logs: string[];
}

/**
 * Applique dédup + résolution de plages sur title+details d'une session.
 * Mute l'objet (in-place) — usage prévu dans postProcessParsedPlan.
 */
export function postProcessSessionText(
  session: SessionLike,
  ambitionEffective?: string,
  matrixCtx?: Omit<MatrixResolveContext, "sport" | "weekNumber">,
): SessionPostProcessStats {
  const stats: SessionPostProcessStats = {
    duplicatesCollapsed: 0,
    duplicatesMismatched: 0,
    durationRangesResolved: 0,
    slashDedupCollapsed: 0,
    progressionPreserved: 0,
    logs: [],
  };
  const ctx: MatrixResolveContext = {
    ...(matrixCtx ?? {}),
    ambitionEffective: matrixCtx?.ambitionEffective ?? ambitionEffective,
    weekNumber: session.weekNumber,
    sport: session.sport,
  };
  for (const key of ["title", "details"] as const) {
    const orig = session[key];
    if (typeof orig !== "string" || !orig) continue;
    const dedup = collapseDuplicateValueAnnotations(orig);
    const dur = resolveWideDurationRanges(dedup.text, {
      phase: session.phase,
      dayIndex: session.dayIndex,
      ...ctx,
    });
    if (dedup.text !== orig || dur.text !== dedup.text) {
      session[key] = dur.text;
    }
    stats.duplicatesCollapsed += dedup.collapsed;
    stats.duplicatesMismatched += dedup.mismatched;
    stats.durationRangesResolved += dur.resolved;
    stats.slashDedupCollapsed += dedup.slashCollapsed ?? 0;
    stats.progressionPreserved += dedup.progressionFlattened ?? 0;
    stats.logs.push(...dedup.logs, ...dur.logs);
  }
  // Filet non silencieux : signaler côté console si collapse slash appliqué
  if (stats.slashDedupCollapsed > 0) {
    // eslint-disable-next-line no-console
    console.warn(`[slash_dedup_collapsed] session="${session.title ?? ""}" count=${stats.slashDedupCollapsed}`);
  }
  return stats;
}


