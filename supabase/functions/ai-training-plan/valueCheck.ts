/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 2B v2 — VALIDATEUR DE VALEURS PAR TOKEN (post-merge, edge)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Nouvelle logique par TOKEN (pas par zone-de-séance) :
 *   1) CONFORMITÉ PAR APPARTENANCE GLOBALE — un token est conforme s'il tombe
 *      dans N'IMPORTE QUELLE plage de la targetTable du bon sport (Z1..Z7,
 *      SST, racePower/racePace, avec tolérances). On tagge la zone reconnue.
 *   2) CSS — la plage CSS ne s'applique QUE si le contexte immédiat (±20 chars)
 *      contient "CSS". Sinon on valide contre l'ensemble des plages natation.
 *   3) HORS DE TOUTES LES PLAGES → correction seulement si :
 *        a) un %FTP adjacent permet le recalcul exact, OU
 *        b) le recadrage va vers le BAS (nw ≤ v) : safe.
 *      ASYMÉTRIE DE SÉCURITÉ : jamais de correction à la HAUSSE. Une hausse
 *      nécessaire ⇒ value_unresolved critical (revue coach).
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { PlanChunk, PlanSession } from "./planSchema.ts";
import type { TargetTablePayload } from "./payloadSchema.ts";

export interface ValueRepair {
  code: "value_corrected" | "value_unresolved";
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
  correctedTokens: number;
  unresolvedTokens: number;
}

const WATTS_RANGE_RX = /@?\s*(\d{2,4})\s*[-–]\s*(\d{2,4})\s*W\b/gi;
const WATTS_SINGLE_RX = /(?<![-–\d])(\d{2,4})\s*W\b/gi;
const PACE_KM_RX = /(\d)[:'](\d{2})\s*\/?\s*km/gi;
const CSS_RX = /(\d)[:'](\d{2})\s*\/\s*100\s*m/gi;
const BPM_RX = /(\d{2,3})\s*bpm/gi;

type Range = [number, number];
interface LabeledRange { label: string; range: Range; }

function inRange(v: number, r: Range, tolPct: number, tolAbs: number): boolean {
  const lo = r[0] - Math.max(r[0] * tolPct, tolAbs);
  const hi = r[1] + Math.max(r[1] * tolPct, tolAbs);
  return v >= lo && v <= hi;
}

function nearestBorder(v: number, r: Range): number {
  if (v < r[0]) return r[0];
  if (v > r[1]) return r[1];
  return v;
}

function paceStrToSec(mmss: string): number | null {
  const m = mmss.match(/^(\d+)[:'](\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function secToPace(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Toutes les plages watts vélo pertinentes (zones + SST + racePower). */
function allBikeRanges(t: TargetTablePayload): LabeledRange[] {
  const out: LabeledRange[] = [];
  for (const [z, r] of Object.entries(t.bikeZonesW)) out.push({ label: z, range: r as Range });
  if (t.sstW) out.push({ label: "SST", range: t.sstW });
  if (t.racePowerRange) out.push({ label: "racePower", range: t.racePowerRange });
  return out;
}

function allRunRanges(t: TargetTablePayload): LabeledRange[] {
  const out: LabeledRange[] = [];
  for (const [z, r] of Object.entries(t.runPacesSecPerKm)) out.push({ label: z, range: r as Range });
  if (t.racePaceRange) out.push({ label: "racePace", range: t.racePaceRange });
  return out;
}

function allSwimRanges(t: TargetTablePayload): LabeledRange[] {
  const out: LabeledRange[] = [];
  for (const [z, r] of Object.entries(t.swimZonesSecPer100m)) out.push({ label: z, range: r as Range });
  if (t.cssRange) out.push({ label: "CSS", range: t.cssRange });
  return out;
}

/** Cherche la 1re plage qui accepte v (avec tolérance). */
function findMatch(v: number, ranges: LabeledRange[], tolPct: number, tolAbs: number): LabeledRange | null {
  for (const lr of ranges) if (inRange(v, lr.range, tolPct, tolAbs)) return lr;
  return null;
}

/** Plage la plus proche (distance au bord) pour recadrage. */
function nearestRange(v: number, ranges: LabeledRange[]): LabeledRange | null {
  let best: LabeledRange | null = null;
  let bestD = Infinity;
  for (const lr of ranges) {
    const d = v < lr.range[0] ? lr.range[0] - v : v > lr.range[1] ? v - lr.range[1] : 0;
    if (d < bestD) { bestD = d; best = lr; }
  }
  return best;
}

interface CheckedText {
  text: string;
  tokens: number;
  conformant: number;
  corrected: number;
  unresolved: number;
  repairs: Omit<ValueRepair, "chunkIndex" | "weekNumber" | "day" | "sport">[];
}

function checkSessionText(
  original: string,
  session: PlanSession,
  t: TargetTablePayload,
): CheckedText {
  let text = original;
  let tokens = 0, conformant = 0, corrected = 0, unresolved = 0;
  const repairs: CheckedText["repairs"] = [];

  const sport = session.sport;
  const isBike = sport === "bike" || sport === "brick";
  const isRun = sport === "run" || sport === "brick" || sport === "trail";
  const isSwim = sport === "swim";

  const bikeRanges = allBikeRanges(t);
  const runRanges = allRunRanges(t);
  const swimRanges = allSwimRanges(t);

  // ─── %FTP + watts adjacents : autoritatif (règle existante) ─────────
  if (isBike && t.ftpW) {
    const pctFtpPairRx =
      /(\d{2,3})\s*%\s*FTP[^\d]{0,20}(\d{2,4})\s*W|(\d{2,4})\s*W[^\d]{0,20}(\d{2,3})\s*%\s*FTP/gi;
    text = text.replace(pctFtpPairRx, (match, p1, p2, p3, p4) => {
      const pct = Number(p1 ?? p4);
      const w = Number(p2 ?? p3);
      const expectedW = Math.round((pct / 100) * t.ftpW!);
      if (Math.abs(w - expectedW) > Math.max(0.03 * expectedW, 5)) {
        tokens++; corrected++;
        repairs.push({
          code: "value_corrected", severity: "warning",
          reason: `%FTP=${pct}% × FTP=${t.ftpW}W → ${expectedW}W (observé ${w}W incohérent)`,
          before: `${w}W`, after: `${expectedW}W`, token: match,
        });
        return match.replace(`${w}W`, `${expectedW}W`);
      }
      tokens++; conformant++;
      return match;
    });
  }

  // ─── Watts range "200-220W" ─────────────────────────────────────────
  if (isBike && bikeRanges.length > 0) {
    text = text.replace(WATTS_RANGE_RX, (match, aStr, bStr) => {
      const a = Number(aStr), b = Number(bStr);
      tokens += 2;
      const mA = findMatch(a, bikeRanges, 0.03, 3);
      const mB = findMatch(b, bikeRanges, 0.03, 3);
      if (mA && mB) { conformant += 2; return match; }

      // Bornes non conformes globalement → recadrer chaque borne (DOWN only)
      const fix = (v: number, m: LabeledRange | null): { nv: number; ok: boolean; label: string } => {
        if (m) return { nv: v, ok: true, label: m.label };
        const nr = nearestRange(v, bikeRanges);
        if (!nr) return { nv: v, ok: false, label: "" };
        const nv = nearestBorder(v, nr.range);
        return { nv, ok: nv <= v, label: nr.label }; // DOWN only
      };
      const fa = fix(a, mA), fb = fix(b, mB);
      if (fa.ok && fb.ok) {
        corrected += (mA ? 0 : 1) + (mB ? 0 : 1);
        conformant += (mA ? 1 : 0) + (mB ? 1 : 0);
        if (!mA || !mB) {
          repairs.push({
            code: "value_corrected", severity: "warning",
            reason: `range ${a}-${b}W recadré vers plage la plus proche (baisse safe)`,
            before: `${a}-${b}W`, after: `${fa.nv}-${fb.nv}W`, token: match,
          });
        }
        return `${fa.nv}-${fb.nv}W`;
      }
      unresolved += (fa.ok ? 0 : 1) + (fb.ok ? 0 : 1);
      conformant += (fa.ok ? 1 : 0) + (fb.ok ? 1 : 0);
      repairs.push({
        code: "value_unresolved", severity: "critical",
        reason: `range ${a}-${b}W hors plages vélo, correction à la hausse interdite (revue coach)`,
        token: match,
      });
      return match;
    });
  }

  // ─── Watts single "220W" ────────────────────────────────────────────
  if (isBike && bikeRanges.length > 0) {
    text = text.replace(WATTS_SINGLE_RX, (match, wStr) => {
      const w = Number(wStr);
      tokens++;
      const m = findMatch(w, bikeRanges, 0.03, 3);
      if (m) { conformant++; return match; }

      const nr = nearestRange(w, bikeRanges);
      if (!nr) { unresolved++; return match; }
      const nw = nearestBorder(w, nr.range);
      if (nw <= w) {
        // DOWN correction — safe
        corrected++;
        repairs.push({
          code: "value_corrected", severity: "warning",
          reason: `${w}W hors plages vélo → recadré ${nw}W (${nr.label}, baisse safe)`,
          before: `${w}W`, after: `${nw}W`, token: match,
        });
        return `${nw}W`;
      }
      // UP correction — INTERDIT
      unresolved++;
      repairs.push({
        code: "value_unresolved", severity: "critical",
        reason: `${w}W en-dessous des plages vélo, correction à la hausse interdite → revue coach`,
        token: match,
      });
      return match;
    });
  }

  // ─── Pace /km ───────────────────────────────────────────────────────
  if (isRun && runRanges.length > 0) {
    text = text.replace(PACE_KM_RX, (match, m, s) => {
      const sec = Number(m) * 60 + Number(s);
      tokens++;
      const mm = findMatch(sec, runRanges, 0, 5);
      if (mm) { conformant++; return match; }
      const nr = nearestRange(sec, runRanges);
      if (!nr) { unresolved++; return match; }
      const ns = nearestBorder(sec, nr.range);
      // Pace : "hausse" = plus rapide = ns < sec. C'est plus dur → interdit.
      if (ns >= sec) {
        corrected++;
        repairs.push({
          code: "value_corrected", severity: "warning",
          reason: `${match} hors plages course → recadré ${secToPace(ns)}/km (${nr.label}, plus lent = safe)`,
          before: match, after: `${secToPace(ns)}/km`, token: match,
        });
        return `${secToPace(ns)}/km`;
      }
      unresolved++;
      repairs.push({
        code: "value_unresolved", severity: "critical",
        reason: `${match} plus lent que toutes plages, accélérer serait plus dur → revue coach`,
        token: match,
      });
      return match;
    });
  }

  // ─── CSS /100m (contexte-dépendant) ─────────────────────────────────
  if (isSwim && swimRanges.length > 0) {
    // On collecte les positions des matches d'abord (String.replace + regex globale)
    text = text.replace(CSS_RX, (match, m, s, offset: number) => {
      const sec = Number(m) * 60 + Number(s);
      tokens++;
      const from = Math.max(0, offset - 20);
      const to = Math.min(text.length, offset + match.length + 20);
      const ctx = text.slice(from, to).toUpperCase();
      const cssOnly = ctx.includes("CSS");

      const pool: LabeledRange[] = cssOnly && t.cssRange
        ? [{ label: "CSS", range: t.cssRange }]
        : swimRanges;

      const mm = findMatch(sec, pool, 0, 3);
      if (mm) { conformant++; return match; }
      const nr = nearestRange(sec, pool);
      if (!nr) { unresolved++; return match; }
      const ns = nearestBorder(sec, nr.range);
      if (ns >= sec) {
        corrected++;
        repairs.push({
          code: "value_corrected", severity: "warning",
          reason: `${match} recadré ${secToPace(ns)}/100m (${nr.label}, plus lent = safe)`,
          before: match, after: `${secToPace(ns)}/100m`, token: match,
        });
        return `${secToPace(ns)}/100m`;
      }
      unresolved++;
      repairs.push({
        code: "value_unresolved", severity: "critical",
        reason: `${match} plus lent que ${cssOnly ? "CSS" : "plages nat."}, accélérer interdit → revue coach`,
        token: match,
      });
      return match;
    });
  }

  // ─── FC bpm ─────────────────────────────────────────────────────────
  if (t.fcMax) {
    const fcRanges: LabeledRange[] = Object.entries(t.fcZonesBpm)
      .map(([z, r]) => ({ label: z, range: r as Range }));
    text = text.replace(BPM_RX, (match, bStr) => {
      const b = Number(bStr);
      tokens++;
      if (b <= t.fcMax! + 5) {
        const inZones = fcRanges.length ? findMatch(b, fcRanges, 0.02, 3) : null;
        if (inZones || fcRanges.length === 0) { conformant++; return match; }
        const nr = nearestRange(b, fcRanges);
        if (!nr) { conformant++; return match; }
        const nb = nearestBorder(b, nr.range);
        if (nb <= b) {
          corrected++;
          repairs.push({
            code: "value_corrected", severity: "warning",
            reason: `${b}bpm hors plages FC → recadré ${nb}bpm (${nr.label}, baisse safe)`,
            before: `${b}bpm`, after: `${nb}bpm`, token: match,
          });
          return `${nb}bpm`;
        }
        unresolved++;
        repairs.push({
          code: "value_unresolved", severity: "critical",
          reason: `${b}bpm sous les plages, hausse interdite → revue coach`,
          token: match,
        });
        return match;
      }
      // > FCmax+5 : impossible, mais on ne "muscle" pas la prescription → unresolved
      unresolved++;
      repairs.push({
        code: "value_unresolved", severity: "critical",
        reason: `${b}bpm > FCmax (${t.fcMax}) → revue coach`,
        token: match,
      });
      return match;
    });
  }

  return { text, tokens, conformant, corrected, unresolved, repairs };
}

export function applyValueCheck(
  chunks: PlanChunk[],
  targetTable: TargetTablePayload | null | undefined,
): ValueCheckResult {
  const repairs: ValueRepair[] = [];
  const traces: string[] = [];
  let totalTokens = 0, conformantTokens = 0, correctedTokens = 0, unresolvedTokens = 0;

  if (!targetTable) {
    traces.push("[VALUE_CHECK] SKIP — targetTable absent du payload");
    return { chunks, repairs, traces, totalTokens: 0, conformantTokens: 0, correctedTokens: 0, unresolvedTokens: 0 };
  }

  const outChunks = chunks.map((ck, ci) => {
    const weeks = ck.weeks.map(w => {
      const sessions = w.sessions.map(s => {
        const combined = `${s.title ?? ""}\n${s.details ?? ""}`;
        const hasNumbers = /\d/.test(combined);
        if (!hasNumbers) return s;
        const res = checkSessionText(combined, s, targetTable);
        if (res.tokens === 0) return s;
        totalTokens += res.tokens;
        conformantTokens += res.conformant;
        correctedTokens += res.corrected;
        unresolvedTokens += res.unresolved;
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
          `[VALUE_CHECK] S${w.weekNumber} ${s.day} ${s.sport}: tokens=${res.tokens} ok=${res.conformant} corr=${res.corrected} unres=${res.unresolved}`,
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
    `[VALUE_CHECK] TOTAL tokens=${totalTokens} conforme=${conformantTokens} corr=${correctedTokens} unresolved=${unresolvedTokens}`,
  );
  return {
    chunks: outChunks,
    repairs, traces,
    totalTokens, conformantTokens, correctedTokens, unresolvedTokens,
  };
}
