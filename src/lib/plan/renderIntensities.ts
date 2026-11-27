/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 2B v2 — RENDU DES INTENSITÉS (client, pure)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Le JSON du plan est 100% RELATIF (zones Z1..Z7, %FTP, %VMA, %CSS, CSS±Xs).
 * À l'affichage (AIPlanViewer / export PDF / envoi Nolio), on injecte entre
 * parenthèses la valeur ABSOLUE de l'athlète calculée depuis la targetTable :
 *   "3x12' Z4a"           → "3x12' Z4a (246-260W)"
 *   "Z2" (sport=run)      → "Z2 (5:33-6:15/km)"
 *   "CSS+5s" (nat)        → "CSS+5s (1:35/100m)"
 *   "88% FTP"             → "88% FTP (246W)"
 *   "82% VMA"             → "82% VMA (5:04/km)"
 * Idempotent : un texte déjà enrichi n'est pas ré-annoté (détection "(…W)"/
 * "(…/km)" / "(…/100m)" immédiat après le token).
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { TRAINING_ZONES_MIRROR, canonicalizeZoneLabel, z4Union, getZoneMirror, type ZoneId } from "@/lib/plan/trainingZonesMirror";
import type { TargetTable } from "@/lib/plan/targetTable";

export type SportKind = "bike" | "run" | "trail" | "brick" | "swim" | "strength" | "recovery" | "rest";

function fmtPace(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return "?";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec - m * 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function paceFromVma(vmaKmh: number, pct: number): number {
  const speed = (pct / 100) * vmaKmh;
  return speed > 0 ? Math.round(3600 / speed) : 0;
}

/**
 * Bornes absolues d'une zone héritée depuis la targetTable (source unique,
 * déjà recalée sur la physiologie de l'athlète quand elle est disponible).
 * Repli sur la grille standard %FTP/%VMA si la zone n'est pas dans la table.
 */
function bikeRangeFromTable(zone: ZoneId | "Z4", t: TargetTable, ftpW: number): [number, number] | null {
  if (zone === "Z4") {
    const a = t.bikeZonesW?.Z4a;
    const b = t.bikeZonesW?.Z4b;
    if (a && b) return [Math.min(a[0], b[0]), Math.max(a[1], b[1])];
    const u = z4Union("ftp");
    return u ? [Math.round(u.min * ftpW / 100), Math.round(u.max * ftpW / 100)] : null;
  }
  const fromTable = t.bikeZonesW?.[zone];
  if (fromTable) return fromTable;
  const z = getZoneMirror(zone);
  if (!z) return null;
  return [Math.round(z.ftp.min * ftpW / 100), Math.round(z.ftp.max * ftpW / 100)];
}

/** Bornes d'allure (sec/km) : [rapide, lent]. */
function runRangeFromTable(zone: ZoneId | "Z4", t: TargetTable, vmaKmh: number): [number, number] | null {
  if (zone === "Z4") {
    const a = t.runPacesSecPerKm?.Z4a;
    const b = t.runPacesSecPerKm?.Z4b;
    if (a && b) return [Math.min(a[0], b[0]), Math.max(a[1], b[1])];
    const u = z4Union("vma");
    return u ? [paceFromVma(vmaKmh, u.max), paceFromVma(vmaKmh, u.min)] : null;
  }
  const fromTable = t.runPacesSecPerKm?.[zone];
  if (fromTable) return fromTable;
  const z = getZoneMirror(zone);
  if (!z) return null;
  return [paceFromVma(vmaKmh, z.vma.max), paceFromVma(vmaKmh, z.vma.min)];
}

/** Zone 1 (vélo dès 0 W, course jusqu'à la marche) et zone 7 n'ont pas de borne utile : « < 127W », « plus lent que 7:11/km ». */
const OPEN_SLOW_PACE_SEC = 600;
function wattsText(lo: number, hi: number, zHigh: ZoneId | "Z4"): string {
  if (lo <= 0) return `< ${hi}W`;
  if (zHigh === "Z7") return `> ${lo}W`;
  return `${lo}-${hi}W`;
}
function paceText(fast: number, slow: number): string {
  return slow >= OPEN_SLOW_PACE_SEC ? `plus lent que ${fmtPace(fast)}/km` : `${fmtPace(fast)}-${fmtPace(slow)}/km`;
}

function bikeZoneWatts(zone: ZoneId | "Z4", t: TargetTable, ftpW: number): string | null {
  const r = bikeRangeFromTable(zone, t, ftpW);
  return r ? wattsText(r[0], r[1], zone) : null;
}

function runZonePace(zone: ZoneId | "Z4", t: TargetTable, vmaKmh: number): string | null {
  const r = runRangeFromTable(zone, t, vmaKmh);
  return r ? paceText(r[0], r[1]) : null;
}

function bikeZoneRangeWatts(zLow: ZoneId | "Z4", zHigh: ZoneId | "Z4", t: TargetTable, ftpW: number): string | null {
  const a = bikeRangeFromTable(zLow, t, ftpW);
  const b = bikeRangeFromTable(zHigh, t, ftpW);
  if (!a || !b) return null;
  return wattsText(Math.min(a[0], b[0]), Math.max(a[1], b[1]), zHigh);
}

function runZoneRangePace(zLow: ZoneId | "Z4", zHigh: ZoneId | "Z4", t: TargetTable, vmaKmh: number): string | null {
  const a = runRangeFromTable(zLow, t, vmaKmh);
  const b = runRangeFromTable(zHigh, t, vmaKmh);
  if (!a || !b) return null;
  return paceText(Math.min(a[0], b[0]), Math.max(a[1], b[1]));
}


const ZONE_CORE = "Z(?:1|2|3|4a|4b|4|5|6|7)";
// Range de zones ("Z2-Z3", "Z4a-Z4b", "Z1-Z2"). Annoté comme UN bloc pour éviter
// les rendus contradictoires du type "Z2 (5:33-6:15/km)-Z3 (…)".
const ZONE_RANGE_RX = new RegExp(`\\b(${ZONE_CORE})\\s*-\\s*(${ZONE_CORE})\\b`, "gi");
// Zone nue : ni précédée ni suivie d'un `-Z\d` (sinon c'est un range, géré ci-dessus).
const ZONE_RX = new RegExp(`(?<!${ZONE_CORE}\\s*-\\s*)\\b${ZONE_CORE}\\b(?!\\s*-\\s*Z[1-7])`, "gi");
const PCT_FTP_RX = /\b(\d{2,3})\s*%\s*FTP\b/gi;
const PCT_VMA_RX = /\b(\d{2,3})\s*%\s*VMA\b/gi;
// Plages de pourcentage ("65-75% VMA", "88-94% FTP") — annotées comme UN bloc
// pour éviter le rendu trompeur "65-75% VMA (4:51/km)" (borne haute seule).
const PCT_RANGE_FTP_RX = /\b(\d{2,3})\s*-\s*(\d{2,3})\s*%\s*FTP\b/gi;
const PCT_RANGE_VMA_RX = /\b(\d{2,3})\s*-\s*(\d{2,3})\s*%\s*VMA\b/gi;
const PCT_CSS_RX = /\b(\d{2,3})\s*%\s*CSS\b/gi;
const CSS_DELTA_RX = /\bCSS\s*([+-])\s*(\d{1,2})\s*s\b/gi;
// CSS nu : pas suivi de "+/- N" (déjà géré par CSS_DELTA_RX)
const CSS_BARE_RX = /(?<![A-Z%\d])CSS(?![A-Z\d+\-])/g;

/** Vrai si le token à `offset` est déjà suivi d'une annotation "(...)" pertinente. */
function alreadyAnnotated(text: string, endOffset: number, kind: "W" | "km" | "100m"): boolean {
  const rest = text.slice(endOffset, endOffset + 40);
  const m = rest.match(/^\s*\(([^)]+)\)/);
  if (!m) return false;
  const inner = m[1];
  if (kind === "W") return /\d\s*W/.test(inner);
  if (kind === "km") return /\/\s*km/.test(inner);
  if (kind === "100m") return /\/\s*100\s*m/.test(inner);
  return false;
}

function replaceWithAnnotation(
  text: string,
  regex: RegExp,
  build: (match: RegExpExecArray) => { annotation: string | null; kind: "W" | "km" | "100m" } | null,
): string {
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  regex.lastIndex = 0;
  while ((m = regex.exec(text)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    out += text.slice(last, end);
    const built = build(m);
    if (built && built.annotation && !alreadyAnnotated(text, end, built.kind)) {
      out += ` (${built.annotation})`;
    }
    last = end;
  }
  out += text.slice(last);
  return out;
}

/**
 * Enrichit un texte de séance avec les valeurs absolues athlète.
 * - `sport` détermine la métrique par défaut pour les zones nues (Z1..Z7) :
 *   bike → watts, run/trail/brick → pace, swim → CSS-relatif.
 * - `%FTP`/`%VMA`/`%CSS` sont toujours annotés (indépendant du sport).
 * Fonction pure (aucun effet de bord). Texte sans intensité renvoyé inchangé.
 */
export function enrichWithAbsoluteValues(
  text: string,
  targetTable: TargetTable | null | undefined,
  sport: SportKind,
): string {
  if (!text || !targetTable) return text;
  // Les références de fiche « [ID: …] » ne sont jamais annotées (ex. « B_SWIM_CSS_8x200 »).
  if (/\[ID:[^\]]*\]/.test(text)) {
    return text.split(/(\[ID:[^\]]*\])/).map(part => /^\[ID:/.test(part) ? part : enrichWithAbsoluteValues(part, targetTable, sport)).join("");
  }
  // Enchaînement : la partie vélo (avant T2 / « Run » / « Course ») se lit en watts, la suite en allure.
  if (sport === "brick") {
    const cut = text.search(/\bT2\b|\bRun\s*[:\d]|\bCourse\s+(?:à\s+pied\s+)?\d|\bCAP\s*[:\d]/i);
    if (cut > 0) return enrichWithAbsoluteValues(text.slice(0, cut), targetTable, "bike") + enrichWithAbsoluteValues(text.slice(cut), targetTable, "run");
  }
  let out = text;

  const isBike = sport === "bike";
  const isRun = sport === "run" || sport === "trail" || sport === "brick";
  const isSwim = sport === "swim";

  // Fiches écrites avec l'ancien vocabulaire à 6 zones (« Z4a (95-100% FTP) ») :
  // le pourcentage prescrit fait foi, l'étiquette est recalée sur la grille de
  // l'athlète (mêmes zones que ses séances et sa montre) — jamais l'inverse.
  out = harmonizeZoneLabels(out, targetTable, sport);
  // Allure de course triathlon : la puissance de l'athlète (raceBikePower,
  // même source que la simulation et les rapports) remplace le % générique.
  if (isBike || sport === "brick") out = applyRacePower(out, targetTable);

  // Ranges de zones ("Z2-Z3", "Z1-Z2", "Z4a-Z4b") — annotés en priorité comme
  // UN bloc pour éviter les rendus contradictoires "Z2 (5:33-6:15/km)-Z3 (…)".
  out = replaceWithAnnotation(out, ZONE_RANGE_RX, (m) => {
    if (pctFollows(out, m)) return null;
    const cLow = canonicalizeZoneLabel(m[1]);
    const cHigh = canonicalizeZoneLabel(m[2]);
    if (!cLow || !cHigh) return null;
    if (isBike && targetTable.ftpW) {
      return { annotation: bikeZoneRangeWatts(cLow, cHigh, targetTable, targetTable.ftpW), kind: "W" };
    }
    if (isRun && targetTable.vmaKmh) {
      return { annotation: runZoneRangePace(cLow, cHigh, targetTable, targetTable.vmaKmh), kind: "km" };
    }
    return null;
  });

  // Zones nues (Z1..Z7 / Z4) — exclut celles absorbées par un range ci-dessus.
  out = replaceWithAnnotation(out, ZONE_RX, (m) => {
    if (pctFollows(out, m)) return null;
    const canon = canonicalizeZoneLabel(m[0]);
    if (!canon) return null;
    if (isBike && targetTable.ftpW) {
      return { annotation: bikeZoneWatts(canon, targetTable, targetTable.ftpW), kind: "W" };
    }
    if (isRun && targetTable.vmaKmh) {
      return { annotation: runZonePace(canon, targetTable, targetTable.vmaKmh), kind: "km" };
    }
    // swim / autres : pas de zone Z1..Z7 canonique → skip
    return null;
  });

  // Plages "%FTP" / "%VMA" (avant les tokens simples)
  if (targetTable.ftpW) {
    out = replaceWithAnnotation(out, PCT_RANGE_FTP_RX, (m) => {
      const lo = Number(m[1]);
      const hi = Number(m[2]);
      if (!isFinite(lo) || !isFinite(hi)) return null;
      const a = Math.round((Math.min(lo, hi) / 100) * targetTable.ftpW!);
      const b = Math.round((Math.max(lo, hi) / 100) * targetTable.ftpW!);
      return { annotation: `${a}-${b}W`, kind: "W" };
    });
  }
  if (targetTable.vmaKmh) {
    out = replaceWithAnnotation(out, PCT_RANGE_VMA_RX, (m) => {
      const lo = Number(m[1]);
      const hi = Number(m[2]);
      if (!isFinite(lo) || !isFinite(hi)) return null;
      const slow = paceFromVma(targetTable.vmaKmh!, Math.min(lo, hi));
      const fast = paceFromVma(targetTable.vmaKmh!, Math.max(lo, hi));
      return { annotation: `${fmtPace(fast)}-${fmtPace(slow)}/km`, kind: "km" };
    });
  }

  // %FTP
  if (targetTable.ftpW) {
    out = replaceWithAnnotation(out, PCT_FTP_RX, (m) => {
      const pct = Number(m[1]);
      if (!isFinite(pct)) return null;
      const w = Math.round((pct / 100) * targetTable.ftpW!);
      return { annotation: `${w}W`, kind: "W" };
    });
  }

  // %VMA
  if (targetTable.vmaKmh) {
    out = replaceWithAnnotation(out, PCT_VMA_RX, (m) => {
      const pct = Number(m[1]);
      if (!isFinite(pct)) return null;
      const p = paceFromVma(targetTable.vmaKmh!, pct);
      return { annotation: `${fmtPace(p)}/km`, kind: "km" };
    });
  }

  // %CSS
  if (targetTable.cssSecPer100m) {
    out = replaceWithAnnotation(out, PCT_CSS_RX, (m) => {
      const pct = Number(m[1]);
      if (!isFinite(pct) || pct === 0) return null;
      const sec = Math.round(targetTable.cssSecPer100m! * 100 / pct);
      return { annotation: `${fmtPace(sec)}/100m`, kind: "100m" };
    });
  }

  // CSS±Xs
  if (targetTable.cssSecPer100m) {
    out = replaceWithAnnotation(out, CSS_DELTA_RX, (m) => {
      const sign = m[1] === "-" ? -1 : 1;
      const delta = Number(m[2]);
      const sec = targetTable.cssSecPer100m! + sign * delta;
      return { annotation: `${fmtPace(sec)}/100m`, kind: "100m" };
    });

    // CSS nu (uniquement swim ou contexte swim) — annoter avec la valeur pure
    if (isSwim) {
      out = replaceWithAnnotation(out, CSS_BARE_RX, () => {
        return { annotation: `${fmtPace(targetTable.cssSecPer100m!)}/100m`, kind: "100m" };
      });
    }
  }

  // Filet défensif : collapse "X% FTP (X% FTP)" ou "252W (252W)" si un enricher
  // en amont a déjà injecté une annotation identique. Comparaison tolérante
  // (espaces/casse). Ne modifie pas quand les valeurs diffèrent.
  const DUP_RX_RENDER = /(\d{1,3}\s*%\s*(?:FTP|VMA|CSS|FCmax|CP\s*Run|CPRun)|\d{2,4}\s*W|CSS\s*[+-]\s*\d{1,2}\s*s|\d{1,2}[:'](?:\d{2})\s*\/\s*(?:km|100\s*m))\s*\(\s*(\1)\s*\)/gi;
  out = out.replace(DUP_RX_RENDER, "$1");

  // Filet slash-dédup : "(X / X)" ou "(X → X)" / "(X - X)" / "(X à X)" → "(X)"
  const VAL = String.raw`\d{1,3}\s*%\s*(?:FTP|VMA|CSS|FCmax|CP\s*Run|CPRun)|\d{2,4}\s*W|CSS\s*[+-]\s*\d{1,2}\s*s|\d{1,2}[:'](?:\d{2})\s*\/\s*(?:km|100\s*m)`;
  const SLASH_DUP_RENDER = new RegExp(`\\(\\s*(${VAL})\\s*(?:\\/|→|->|-|à)\\s*(${VAL})\\s*\\)`, "gi");
  out = out.replace(SLASH_DUP_RENDER, (match, a: string, b: string) => {
    const na = a.replace(/\s+/g, "").toLowerCase();
    const nb = b.replace(/\s+/g, "").toLowerCase();
    if (na === nb) {
      // eslint-disable-next-line no-console
      console.warn(`[slash_dedup_collapsed] "${match}" → "(${a})"`);
      return `(${a})`;
    }
    return match;
  });

  // Tag d'intention en tête de titre "[Z2 · endurance 65-75% VMA]" : une SEULE
  // valeur absolue autorisée dans le tag (la première), sinon rendu contradictoire
  // du type "[Z2 (5:12-6:04/km) · endurance 65-75% VMA (4:51/km)]".
  out = collapseTagAnnotations(out);

  return out;
}

/** Ne garde qu'une annotation "(…)" dans le tag `[...]` en tête de titre. */
function collapseTagAnnotations(text: string): string {
  const m = text.match(/^\s*\[([^\]]*)\]/);
  if (!m) return text;
  const inner = m[1];
  const ANN = /\s*\((?:[^()]*(?:\/km|\/100\s*m|W))\)/g;
  const hits = inner.match(ANN);
  if (!hits || hits.length < 2) return text;
  let seen = false;
  const cleaned = inner.replace(ANN, (a) => {
    if (!seen) { seen = true; return a; }
    return "";
  });
  return text.replace(m[0], m[0].replace(inner, cleaned));
}

// ── Cohérence zone ↔ pourcentage et puissance de course (27/11/2026) ──
/** Un % FTP / % VMA suit la zone dans la même proposition : c'est lui qui sera annoté. */
function pctFollows(text: string, m: RegExpExecArray): boolean {
  const after = text.slice(m.index + m[0].length, m.index + m[0].length + 32);
  const clause = after.split(/[;|.\n]|\s\/\s|\s\+\s/)[0];
  return /\d{2,3}\s*(?:-\s*\d{2,3}\s*)?%\s*(?:de\s+la\s+)?(?:FTP|VMA)/i.test(clause);
}

const GRID_ZONES: ZoneId[] = ["Z1", "Z2", "Z3", "Z4a", "Z4b", "Z5", "Z6", "Z7"];
/** Zone de la grille de l'athlète contenant la valeur (watts ou s/km). */
function gridZoneOf(ranges: Partial<Record<ZoneId, [number, number]>> | undefined, value: number): ZoneId | null {
  if (!ranges) return null;
  let best: { z: ZoneId; d: number } | null = null;
  for (const z of GRID_ZONES) {
    const r = ranges[z];
    if (!r) continue;
    const lo = Math.min(r[0], r[1]), hi = Math.max(r[0], r[1]);
    const d = value < lo ? lo - value : value > hi ? value - hi : 0;
    if (!best || d < best.d) best = { z, d };
  }
  return best?.z ?? null;
}
/** Bornes (watts ou s/km) couvertes par une étiquette de zone, Z4 = Z4a + Z4b. */
function labelBounds(ranges: Partial<Record<ZoneId, [number, number]>> | undefined, a: string, b: string): [number, number] | null {
  const ids = [a, b].flatMap(z => { const c = canonicalizeZoneLabel(z); return c === "Z4" ? ["Z4a", "Z4b"] as ZoneId[] : c ? [c as ZoneId] : []; });
  const rs = ids.map(z => ranges?.[z]).filter((r): r is [number, number] => !!r);
  if (!rs.length) return null;
  const all = rs.flat();
  return [Math.min(...all), Math.max(...all)];
}
const ZONE_ORDER = (z: string) => GRID_ZONES.indexOf(z as ZoneId);

/**
 * « Z4a (95-100% FTP) » → « Z5 (95-100% FTP) » quand la grille de l'athlète place ce pourcentage
 * ailleurs. Tolérance de 4 % (FTP) ou 4 s/km : une borne qui touche la zone voisine ne déclenche rien.
 */
function harmonizeZoneLabels(text: string, t: TargetTable, sport: SportKind): string {
  const bike = sport === "bike" || sport === "brick";
  const run = sport === "run" || sport === "trail";
  const LABEL_THEN_PCT = new RegExp(`\\b((${ZONE_CORE})(?:\\s*-\\s*(${ZONE_CORE}))?)\\b([^;|.\\n%]{0,28}?)((\\d{2,3})(?:\\s*-\\s*(\\d{2,3}))?\\s*%\\s*(?:de\\s+la\\s+)?(FTP|VMA)\\b)`, "gi");
  return text.replace(LABEL_THEN_PCT, (whole, labelPart: string, z1: string, z2: string | undefined, gap: string, pctPart: string, p1: string, p2: string | undefined, ref: string) => {
    const isFtp = ref.toUpperCase() === "FTP";
    if (/\s\/\s|\s\+\s/.test(gap)) return whole;
    const lo = Math.min(Number(p1), Number(p2 ?? p1)), hi = Math.max(Number(p1), Number(p2 ?? p1));
    let ranges: Partial<Record<ZoneId, [number, number]>> | undefined, vLo = 0, vHi = 0, tol = 0;
    if (isFtp && !run && t.ftpW) {
      ranges = t.bikeZonesW as Partial<Record<ZoneId, [number, number]>>;
      vLo = lo / 100 * t.ftpW; vHi = hi / 100 * t.ftpW; tol = 0.04 * t.ftpW;
    } else if (!isFtp && !bike && t.vmaKmh) {
      ranges = t.runPacesSecPerKm as Partial<Record<ZoneId, [number, number]>>;
      vLo = paceFromVma(t.vmaKmh, hi); vHi = paceFromVma(t.vmaKmh, lo); tol = 4;
    }
    if (!ranges) return whole;
    // Étiquette compatible avec le pourcentage (à la tolérance près) : inchangée.
    const declared = labelBounds(ranges, z1, z2 ?? z1);
    if (declared && vLo >= declared[0] - tol && vHi <= declared[1] + tol) return whole;
    const za = gridZoneOf(ranges, vLo), zb = gridZoneOf(ranges, vHi);
    if (!za || !zb) return whole;
    const expected = [za, zb].sort((x, y) => ZONE_ORDER(x) - ZONE_ORDER(y));
    const label = expected[0] === expected[1] ? expected[0] : `${expected[0]}-${expected[1]}`;
    return label === labelPart ? whole : `${label}${gap}${pctPart}`;
  });
}

/** Vocabulaire d'une consigne « allure / puissance de course » (triathlon). */
const RACE_PACE_PHRASE = /(?:allure|puissance|intensit[ée])\s+(?:de\s+)?(?:course|race)(?:\s+(?:ironman|im|70\.?3|half))?|race[\s-]?pace|(?:puissance|allure|watts?)\s+(?:ironman|im|70\.?3)|\bim\s+power\b|\brace\s+(?:ironman|im|70\.?3)/i;

/**
 * « allure race Ironman (65-68% FTP) » → « allure race Ironman (116-121W · ta puissance de course) ».
 * Le pourcentage générique de la fiche est remplacé par la puissance de course de l'athlète.
 */
function applyRacePower(text: string, t: TargetTable): string {
  const race = t.racePowerRange;
  if (!race || !t.raceBike) return text;
  const RX = /(\d{2,3})\s*(?:-\s*(\d{2,3}))?\s*%\s*FTP\b/gi;
  return text.replace(RX, (whole, _a, _b, offset: number) => {
    const before = text.slice(Math.max(0, offset - 45), offset);
    const clause = before.split(/[;|.\n]/).pop() ?? "";
    if (!RACE_PACE_PHRASE.test(clause)) return whole;
    return `${race[0]}-${race[1]}W · ta puissance de course`;
  });
}
