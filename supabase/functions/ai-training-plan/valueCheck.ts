/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 2B v2 — VALIDATEUR RELATIF UNIQUEMENT (post-merge, edge)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Nouveau principe (remplace la logique de correction B9) :
 *   Le modèle ne doit PLUS écrire de valeur absolue (W, min/km, s/100m, bpm).
 *   Uniquement du RELATIF : zones (Z1..Z7 vélo + Z1..Z7 CAP), %FTP, %VMA,
 *   %CSS, CSS±Xs.
 *
 *   1) Token ABSOLU (W/…/km/…/100m/…bpm) :
 *      a) TRADUCTION relative si univoque :
 *         - N W → "P% FTP" (arrondi au %FTP, s'il existe une zone contenant N).
 *         - M:SS/km → "Zx" si dans exactement une zone run (VMA%).
 *         - M:SS/100m → "CSS±Xs" si contexte CSS (±20 chars), sinon zone swim.
 *         - N bpm → "Zx" si dans exactement une zone FC.
 *         Repair `value_relativized` (avant/après).
 *      b) Ambigu (aucune ou plusieurs zones plausibles) → `value_unresolved`
 *         critical. AUCUNE correction d'intensité (ni hausse ni baisse).
 *
 *   2) Token RELATIF (Zx, N%FTP, N%VMA, N%CSS, CSS±Xs) :
 *      - Canonicaliser la casse (Z4A/z4a → Z4a). Zone "Z4" nu = union Z4a+Z4b.
 *      - Bornes plausibilité (grille TFCL):
 *          %FTP ∈ [0,300]     %VMA ∈ [0,200]
 *          %CPRun ∈ [0,200]   %CSS ∈ [80,120]
 *      - Zone (canonicalisée) doit être connue (Z1..Z7 + Z4).
 *      - Hors bornes → `value_unresolved`.
 *
 *   B9 pass = 0 unresolved ET 0 token absolu résiduel.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { PlanChunk, PlanSession } from "./planSchema.ts";
import type { TargetTablePayload } from "./payloadSchema.ts";
import {
  TRAINING_ZONES_MIRROR,
  canonicalizeZoneLabel,
  z4Union,
  getZoneMirror,
  type ZoneId,
} from "../_shared/trainingZonesDefinition.ts";

export interface ValueRepair {
  code: "value_relativized" | "value_unresolved";
  severity: "warning" | "critical";
  weekNumber: number;
  day: string;
  sport: string;
  reason: string;
  before?: string;
  after?: string;
  token: string;
  chunkIndex: number;
}

export interface ValueCheckResult {
  chunks: PlanChunk[];
  repairs: ValueRepair[];
  traces: string[];
  totalTokens: number;
  conformantTokens: number;
  relativizedTokens: number;
  unresolvedTokens: number;
  residualAbsoluteTokens: number;
}

// ═══ REGEX ═══════════════════════════════════════════════════════════════════
const WATTS_RX = /(?<![\d.-])(\d{2,4})\s*W\b/gi;
const WATTS_RANGE_RX = /(?<![\d.-])(\d{2,4})\s*[-–]\s*(\d{2,4})\s*W\b/gi;
const PACE_KM_RX = /(\d)[:'](\d{2})\s*\/?\s*km\b/gi;
const CSS_RX = /(\d)[:'](\d{2})\s*\/\s*100\s*m/gi;
const BPM_RX = /(\d{2,3})\s*bpm\b/gi;

const PCT_FTP_RX = /\b(\d{1,3})\s*%\s*FTP\b/gi;
const PCT_VMA_RX = /\b(\d{1,3})\s*%\s*VMA\b/gi;
const PCT_CPRUN_RX = /\b(\d{1,3})\s*%\s*CP\s*Run\b/gi;
const PCT_CSS_RX = /\b(\d{1,3})\s*%\s*CSS\b/gi;
const ZONE_RX = /\bZ(?:1|2|3|4a|4b|4|5|6|7)\b/gi;

function paceStrToSec(m: string, s: string): number {
  return Number(m) * 60 + Number(s);
}
function secToPace(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec - m * 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Trouve TOUTES les zones du mirror dont l'intervalle contient v (métrique). */
function zonesContaining(v: number, metric: "vma" | "ftp" | "cpRun" | "fcMax"): ZoneId[] {
  const out: ZoneId[] = [];
  for (const z of TRAINING_ZONES_MIRROR) {
    const r = z[metric];
    if (!r) continue;
    if (v >= r.min && v <= r.max) out.push(z.id);
  }
  return out;
}

/** Retourne l'unique zone contenant v pour métrique, sinon null (ambigu ou aucun). */
function uniqueZoneFor(v: number, metric: "vma" | "ftp" | "cpRun" | "fcMax"): ZoneId | null {
  const hits = zonesContaining(v, metric);
  if (hits.length === 1) return hits[0];
  return null;
}

interface CheckedText {
  text: string;
  tokens: number;
  conformant: number;
  relativized: number;
  unresolved: number;
  residualAbsolute: number;
  repairs: Omit<ValueRepair, "chunkIndex" | "weekNumber" | "day" | "sport">[];
}

function checkSessionText(
  original: string,
  session: PlanSession,
  t: TargetTablePayload,
): CheckedText {
  let text = original;
  let tokens = 0, conformant = 0, relativized = 0, unresolved = 0, residualAbsolute = 0;
  const repairs: CheckedText["repairs"] = [];

  const sport = session.sport;
  const isBike = sport === "bike" || sport === "brick";
  const isRun = sport === "run" || sport === "brick" || sport === "trail";
  const isSwim = sport === "swim";

  // ─── 1a) WATTS RANGE "200-220W" → "P1-P2% FTP" ──────────────────────
  if (isBike) {
    text = text.replace(WATTS_RANGE_RX, (match, a, b) => {
      tokens += 2;
      if (!t.ftpW) {
        unresolved += 2; residualAbsolute += 2;
        repairs.push({
          code: "value_unresolved", severity: "critical",
          reason: `${match} : FTP athlète absent, impossible de relativiser`,
          token: match,
        });
        return match;
      }
      const wa = Number(a), wb = Number(b);
      const pa = Math.round((wa / t.ftpW) * 100);
      const pb = Math.round((wb / t.ftpW) * 100);
      // Doit tomber dans une zone connue (au moins une) pour chaque borne
      const za = zonesContaining(pa, "ftp"), zb = zonesContaining(pb, "ftp");
      if (za.length === 0 || zb.length === 0) {
        unresolved += 2; residualAbsolute += 2;
        repairs.push({
          code: "value_unresolved", severity: "critical",
          reason: `${match} → ${pa}-${pb}% FTP hors grille (aucune zone) → revue coach`,
          token: match,
        });
        return match;
      }
      relativized += 2;
      const after = `${pa}-${pb}% FTP`;
      repairs.push({
        code: "value_relativized", severity: "warning",
        reason: `${match} traduit en ${after} (FTP=${t.ftpW}W)`,
        before: match, after, token: match,
      });
      return after;
    });
  }

  // ─── 1b) WATTS SINGLE "220W" → "P% FTP" ─────────────────────────────
  if (isBike) {
    text = text.replace(WATTS_RX, (match, wStr) => {
      tokens++;
      if (!t.ftpW) {
        unresolved++; residualAbsolute++;
        repairs.push({
          code: "value_unresolved", severity: "critical",
          reason: `${match} : FTP athlète absent, impossible de relativiser`,
          token: match,
        });
        return match;
      }
      const w = Number(wStr);
      const pct = Math.round((w / t.ftpW) * 100);
      const hits = zonesContaining(pct, "ftp");
      if (hits.length === 0) {
        unresolved++; residualAbsolute++;
        repairs.push({
          code: "value_unresolved", severity: "critical",
          reason: `${match} → ${pct}% FTP hors grille (aucune zone) → revue coach`,
          token: match,
        });
        return match;
      }
      relativized++;
      const after = `${pct}% FTP`;
      repairs.push({
        code: "value_relativized", severity: "warning",
        reason: `${match} traduit en ${after} (FTP=${t.ftpW}W)`,
        before: match, after, token: match,
      });
      return after;
    });
  }

  // ─── 1c) PACE /km → Zone (si univoque) ───────────────────────────────
  if (isRun) {
    text = text.replace(PACE_KM_RX, (match, mm, ss) => {
      tokens++;
      if (!t.vmaKmh) {
        unresolved++; residualAbsolute++;
        repairs.push({
          code: "value_unresolved", severity: "critical",
          reason: `${match} : VMA absente → impossible de relativiser`,
          token: match,
        });
        return match;
      }
      const sec = paceStrToSec(mm, ss);
      const kmh = 3600 / sec;
      const pct = Math.round((kmh / t.vmaKmh) * 100);
      const z = uniqueZoneFor(pct, "vma");
      if (!z) {
        unresolved++; residualAbsolute++;
        repairs.push({
          code: "value_unresolved", severity: "critical",
          reason: `${match} → ${pct}% VMA ambigu (0 ou >1 zone) → revue coach`,
          token: match,
        });
        return match;
      }
      relativized++;
      repairs.push({
        code: "value_relativized", severity: "warning",
        reason: `${match} traduit en ${z} (${pct}% VMA)`,
        before: match, after: z, token: match,
      });
      return z;
    });
  }

  // ─── 1d) /100m → CSS±Xs (si contexte CSS) sinon zone swim (VMA fallback impossible) ──
  if (isSwim) {
    text = text.replace(CSS_RX, (match, mm, ss, offset: number) => {
      tokens++;
      const sec = paceStrToSec(mm, ss);
      const from = Math.max(0, offset - 20);
      const to = Math.min(text.length, offset + match.length + 20);
      const ctx = text.slice(from, to).toUpperCase();
      const cssCtx = ctx.includes("CSS");
      if (t.cssSecPer100m && cssCtx) {
        const delta = sec - t.cssSecPer100m;
        const after = delta === 0 ? "CSS" : `CSS${delta > 0 ? "+" : ""}${delta}s`;
        relativized++;
        repairs.push({
          code: "value_relativized", severity: "warning",
          reason: `${match} traduit en ${after} (CSS=${secToPace(t.cssSecPer100m)}/100m)`,
          before: match, after, token: match,
        });
        return after;
      }
      // pas de contexte CSS explicite : plus difficile à réattribuer sans zones swim canoniques
      unresolved++; residualAbsolute++;
      repairs.push({
        code: "value_unresolved", severity: "critical",
        reason: `${match} : absolu /100m sans contexte CSS → revue coach`,
        token: match,
      });
      return match;
    });
  }

  // ─── 1e) FC bpm → Zone (si univoque) ────────────────────────────────
  if (t.fcMax) {
    text = text.replace(BPM_RX, (match, bStr) => {
      tokens++;
      const b = Number(bStr);
      const pct = Math.round((b / t.fcMax!) * 100);
      const z = uniqueZoneFor(pct, "fcMax");
      if (!z) {
        unresolved++; residualAbsolute++;
        repairs.push({
          code: "value_unresolved", severity: "critical",
          reason: `${match} → ${pct}% FCmax ambigu → revue coach`,
          token: match,
        });
        return match;
      }
      relativized++;
      repairs.push({
        code: "value_relativized", severity: "warning",
        reason: `${match} traduit en ${z} (${pct}% FCmax)`,
        before: match, after: z, token: match,
      });
      return z;
    });
  }

  // ─── 2) TOKENS RELATIFS : plausibilité ──────────────────────────────
  // Canonicalise les zones (Z4A → Z4a) en place et vérifie appartenance
  text = text.replace(ZONE_RX, (m) => {
    tokens++;
    const canon = canonicalizeZoneLabel(m);
    if (!canon) {
      unresolved++;
      repairs.push({
        code: "value_unresolved", severity: "critical",
        reason: `Zone "${m}" inconnue`,
        token: m,
      });
      return m;
    }
    conformant++;
    return canon; // corrige la casse
  });

  const checkPct = (rx: RegExp, label: string, lo: number, hi: number) => {
    text = text.replace(rx, (match, pStr) => {
      tokens++;
      const p = Number(pStr);
      if (p < lo || p > hi) {
        unresolved++;
        repairs.push({
          code: "value_unresolved", severity: "critical",
          reason: `${match} hors bornes plausibilité ${label} [${lo},${hi}]`,
          token: match,
        });
        return match;
      }
      conformant++;
      return match;
    });
  };
  checkPct(PCT_FTP_RX, "%FTP", 0, 300);
  checkPct(PCT_VMA_RX, "%VMA", 0, 200);
  checkPct(PCT_CPRUN_RX, "%CPRun", 0, 200);
  checkPct(PCT_CSS_RX, "%CSS", 80, 120);

  return { text, tokens, conformant, relativized, unresolved, residualAbsolute, repairs };
}

export function applyValueCheck(
  chunks: PlanChunk[],
  targetTable: TargetTablePayload | null | undefined,
): ValueCheckResult {
  const repairs: ValueRepair[] = [];
  const traces: string[] = [];
  let totalTokens = 0, conformantTokens = 0, relativizedTokens = 0, unresolvedTokens = 0, residualAbsoluteTokens = 0;

  if (!targetTable) {
    traces.push("[VALUE_CHECK] SKIP — targetTable absent du payload");
    return { chunks, repairs, traces, totalTokens: 0, conformantTokens: 0, relativizedTokens: 0, unresolvedTokens: 0, residualAbsoluteTokens: 0 };
  }

  const outChunks = chunks.map((ck, ci) => {
    const weeks = ck.weeks.map((w) => {
      const sessions = w.sessions.map((s) => {
        const combined = `${s.title ?? ""}\n${s.details ?? ""}`;
        const hasContent = /\S/.test(combined);
        if (!hasContent) return s;
        const res = checkSessionText(combined, s, targetTable);
        if (res.tokens === 0) return s;
        totalTokens += res.tokens;
        conformantTokens += res.conformant;
        relativizedTokens += res.relativized;
        unresolvedTokens += res.unresolved;
        residualAbsoluteTokens += res.residualAbsolute;
        for (const r of res.repairs) {
          repairs.push({
            ...r,
            chunkIndex: ci,
            weekNumber: w.weekNumber,
            day: s.day,
            sport: s.sport,
          });
        }
        traces.push(
          `[VALUE_CHECK] S${w.weekNumber} ${s.day} ${s.sport}: tokens=${res.tokens} ok=${res.conformant} relat=${res.relativized} unres=${res.unresolved} residualAbs=${res.residualAbsolute}`,
        );
        if (res.text !== combined) {
          const [newTitle, ...rest] = res.text.split("\n");
          return { ...s, title: newTitle, details: rest.join("\n") };
        }
        return s;
      });
      return { ...w, sessions };
    });
    return { ...ck, weeks };
  });

  traces.push(
    `[VALUE_CHECK] TOTAL tokens=${totalTokens} conforme=${conformantTokens} relat=${relativizedTokens} unresolved=${unresolvedTokens} residualAbs=${residualAbsoluteTokens}`,
  );
  return {
    chunks: outChunks,
    repairs, traces,
    totalTokens, conformantTokens, relativizedTokens, unresolvedTokens, residualAbsoluteTokens,
  };
}
