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

/** Watts range pour une zone donnée (Z1..Z7) — utilise mirror + FTP athlète. */
function bikeZoneWatts(zone: ZoneId | "Z4", ftpW: number): string | null {
  if (zone === "Z4") {
    const u = z4Union("ftp");
    if (!u) return null;
    return `${Math.round(u.min * ftpW / 100)}-${Math.round(u.max * ftpW / 100)}W`;
  }
  const z = getZoneMirror(zone);
  if (!z) return null;
  return `${Math.round(z.ftp.min * ftpW / 100)}-${Math.round(z.ftp.max * ftpW / 100)}W`;
}

function runZonePace(zone: ZoneId | "Z4", vmaKmh: number): string | null {
  if (zone === "Z4") {
    const u = z4Union("vma");
    if (!u) return null;
    return `${fmtPace(paceFromVma(vmaKmh, u.max))}-${fmtPace(paceFromVma(vmaKmh, u.min))}/km`;
  }
  const z = getZoneMirror(zone);
  if (!z) return null;
  return `${fmtPace(paceFromVma(vmaKmh, z.vma.max))}-${fmtPace(paceFromVma(vmaKmh, z.vma.min))}/km`;
}

const ZONE_RX = /\bZ(?:1|2|3|4a|4b|4|5|6|7)\b/gi;
const PCT_FTP_RX = /\b(\d{2,3})\s*%\s*FTP\b/gi;
const PCT_VMA_RX = /\b(\d{2,3})\s*%\s*VMA\b/gi;
const PCT_CSS_RX = /\b(\d{2,3})\s*%\s*CSS\b/gi;
const CSS_DELTA_RX = /\bCSS\s*([+-])\s*(\d{1,2})\s*s\b/gi;
const CSS_BARE_RX = /(?<![A-Z%\d])CSS(?![A-Z\d])/g;

/** Vrai si le token à `offset` est déjà suivi d'une annotation "(...)" pertinente. */
function alreadyAnnotated(text: string, endOffset: number, kind: "W" | "km" | "100m"): boolean {
  // On accepte espaces optionnels avant "("
  const rest = text.slice(endOffset, endOffset + 40);
  const m = rest.match(/^\s*\(([^)]+)\)/);
  if (!m) return false;
  const inner = m[1];
  if (kind === "W") return /\bW\b/.test(inner);
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
  let out = text;

  const isBike = sport === "bike";
  const isRun = sport === "run" || sport === "trail" || sport === "brick";
  const isSwim = sport === "swim";

  // Zones nues (Z1..Z7 / Z4)
  out = replaceWithAnnotation(out, ZONE_RX, (m) => {
    const canon = canonicalizeZoneLabel(m[0]);
    if (!canon) return null;
    if (isBike && targetTable.ftpW) {
      return { annotation: bikeZoneWatts(canon, targetTable.ftpW), kind: "W" };
    }
    if (isRun && targetTable.vmaKmh) {
      return { annotation: runZonePace(canon, targetTable.vmaKmh), kind: "km" };
    }
    // swim / autres : pas de zone Z1..Z7 canonique → skip
    return null;
  });

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

  return out;
}
