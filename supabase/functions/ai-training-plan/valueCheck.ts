/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 2B — VALIDATEUR DE VALEURS (post-merge, edge)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Extrait tous les tokens numériques du plan (title + details) :
 *   - watts : "220W", "@200-220W", "200-220 W"
 *   - %FTP  : "90% FTP"
 *   - pace  : "3:45/km", "3'45/km"
 *   - CSS   : "1:30/100m", "1'30 / 100 m"
 *   - FC    : "155 bpm"
 * Vérifie chaque token contre `targetTable` en fonction de la zone déclarée
 * de la séance (`session.zones`).
 * Corrections déterministes :
 *   - %FTP présent + watts incohérents → recalcule watts depuis %FTP × FTP
 *   - Valeur hors plage mais zone déclarée univoque → recadre sur borne
 *   - Ambigu → critical "value_unresolved"
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
const PCT_FTP_RX = /(\d{2,3})\s*%\s*FTP/gi;
const PACE_KM_RX = /(\d)[:'](\d{2})\s*\/?\s*km/gi;
const CSS_RX = /(\d)[:'](\d{2})\s*\/\s*100\s*m/gi;
const BPM_RX = /(\d{2,3})\s*bpm/gi;

type Range = [number, number];

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

function normalizeZone(z: string): string {
  const u = z.trim().toUpperCase().replace(/\s+/g, "");
  if (/^Z[1-7]/.test(u)) return u.slice(0, u.length >= 3 && (u[2] === "A" || u[2] === "B") ? 3 : 2)
    .replace("A", "a").replace("B", "b");
  return u;
}

/** Récupère la plage watts pour une séance selon ses zones déclarées. */
function bikeRangeForZones(zones: string[], t: TargetTablePayload): Range | null {
  const ranges: Range[] = [];
  for (const zRaw of zones) {
    const z = normalizeZone(zRaw);
    const r = t.bikeZonesW[z] as Range | undefined;
    if (r) ranges.push(r);
  }
  if (ranges.length === 0) return null;
  return [Math.min(...ranges.map(r => r[0])), Math.max(...ranges.map(r => r[1]))];
}

function runRangeForZones(zones: string[], t: TargetTablePayload): Range | null {
  const ranges: Range[] = [];
  for (const zRaw of zones) {
    const z = normalizeZone(zRaw);
    const r = t.runPacesSecPerKm[z] as Range | undefined;
    if (r) ranges.push(r);
  }
  if (ranges.length === 0) return null;
  // paces: min = plus rapide (petit), max = plus lent (grand)
  return [Math.min(...ranges.map(r => r[0])), Math.max(...ranges.map(r => r[1]))];
}

function fcRangeForZones(zones: string[], t: TargetTablePayload): Range | null {
  const ranges: Range[] = [];
  for (const zRaw of zones) {
    const z = normalizeZone(zRaw);
    const r = t.fcZonesBpm[z] as Range | undefined;
    if (r) ranges.push(r);
  }
  if (ranges.length === 0) return null;
  return [Math.min(...ranges.map(r => r[0])), Math.max(...ranges.map(r => r[1]))];
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

  const zones = Array.isArray(session.zones) ? session.zones : [];
  const sport = session.sport;
  const isBike = sport === "bike" || sport === "brick";
  const isRun = sport === "run" || sport === "brick" || sport === "trail";
  const isSwim = sport === "swim";

  // ─── %FTP : autoritatif si présent avec watts adjacents ────────────
  // Passe 1 : recalcul des paires %FTP + watts en priorité
  if (isBike && t.ftpW) {
    const pctFtpPairRx = /(\d{2,3})\s*%\s*FTP[^\d]{0,20}(\d{2,4})\s*W|(\d{2,4})\s*W[^\d]{0,20}(\d{2,3})\s*%\s*FTP/gi;
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

  // ─── Watts range "200-220W" ──────────────────────────────────────
  if (isBike) {
    const range = bikeRangeForZones(zones, t);
    text = text.replace(WATTS_RANGE_RX, (match, aStr, bStr) => {
      tokens += 2;
      const a = Number(aStr), b = Number(bStr);
      if (!range) {
        // Aucune zone déclarée → ambigu (spec Phase 2B) → critical unresolved
        unresolved += 2;
        repairs.push({
          code: "value_unresolved", severity: "critical",
          reason: `range ${a}-${b}W sans zone déclarée (ambigu)`,
          token: match,
        });
        return match;
      }
      const okA = inRange(a, range, 0.03, 3);
      const okB = inRange(b, range, 0.03, 3);
      if (okA && okB) { conformant += 2; return match; }
      const newA = nearestBorder(a, range);
      const newB = nearestBorder(b, range);
      corrected += 2;
      repairs.push({
        code: "value_corrected", severity: "warning",
        reason: `range ${a}-${b}W hors zone ${zones.join(",")} [${range[0]}-${range[1]}W] → recadré`,
        before: `${a}-${b}W`, after: `${newA}-${newB}W`, token: match,
      });
      return `${newA}-${newB}W`;
    });
  }

  // ─── Watts single "220W" ─────────────────────────────────────────
  if (isBike) {
    const range = bikeRangeForZones(zones, t);
    text = text.replace(WATTS_SINGLE_RX, (match, wStr) => {
      const w = Number(wStr);
      tokens++;
      if (!range) {
        unresolved++;
        repairs.push({
          code: "value_unresolved", severity: "critical",
          reason: `${w}W sans zone déclarée (ambigu)`,
          token: match,
        });
        return match;
      }
      if (inRange(w, range, 0.03, 3)) { conformant++; return match; }
      const nw = nearestBorder(w, range);
      corrected++;
      repairs.push({
        code: "value_corrected", severity: "warning",
        reason: `${w}W hors zone ${zones.join(",")} [${range[0]}-${range[1]}W] → ${nw}W`,
        before: `${w}W`, after: `${nw}W`, token: match,
      });
      return `${nw}W`;
    });
  }

  // ─── Pace /km ─────────────────────────────────────────────────────
  if (isRun) {
    const range = runRangeForZones(zones, t);
    text = text.replace(PACE_KM_RX, (match, m, s) => {
      const sec = Number(m) * 60 + Number(s);
      tokens++;
      if (!range) {
        const all = Object.values(t.runPacesSecPerKm) as Range[];
        if (all.length === 0) { unresolved++; return match; }
        const global: Range = [Math.min(...all.map(r => r[0])), Math.max(...all.map(r => r[1]))];
        if (inRange(sec, global, 0, 10)) { conformant++; return match; }
        unresolved++;
        repairs.push({
          code: "value_unresolved", severity: "critical",
          reason: `pace ${match} hors plage course globale, sans zone`,
          token: match,
        });
        return match;
      }
      if (inRange(sec, range, 0, 5)) { conformant++; return match; }
      const ns = nearestBorder(sec, range);
      corrected++;
      repairs.push({
        code: "value_corrected", severity: "warning",
        reason: `${match} hors zone ${zones.join(",")} [${secToPace(range[0])}-${secToPace(range[1])}/km] → ${secToPace(ns)}/km`,
        before: match, after: `${secToPace(ns)}/km`, token: match,
      });
      return `${secToPace(ns)}/km`;
    });
  }

  // ─── CSS /100m ────────────────────────────────────────────────────
  if (isSwim && t.cssSecPer100m && t.cssRange) {
    text = text.replace(CSS_RX, (match, m, s) => {
      const sec = Number(m) * 60 + Number(s);
      tokens++;
      if (inRange(sec, t.cssRange!, 0, 3)) { conformant++; return match; }
      const ns = nearestBorder(sec, t.cssRange!);
      corrected++;
      repairs.push({
        code: "value_corrected", severity: "warning",
        reason: `CSS ${match} hors [${secToPace(t.cssRange![0])}-${secToPace(t.cssRange![1])}/100m] → ${secToPace(ns)}/100m`,
        before: match, after: `${secToPace(ns)}/100m`, token: match,
      });
      return `${secToPace(ns)}/100m`;
    });
  }

  // ─── FC bpm ───────────────────────────────────────────────────────
  const fcRange = fcRangeForZones(zones, t);
  text = text.replace(BPM_RX, (match, bStr) => {
    const b = Number(bStr);
    tokens++;
    if (!fcRange || !t.fcMax) {
      // pas d'ancre → si <= FCmax global on tolère
      if (t.fcMax && b <= t.fcMax + 5) { conformant++; return match; }
      unresolved++;
      return match;
    }
    if (inRange(b, fcRange, 0.02, 3)) { conformant++; return match; }
    const nb = nearestBorder(b, fcRange);
    corrected++;
    repairs.push({
      code: "value_corrected", severity: "warning",
      reason: `${b}bpm hors zone ${zones.join(",")} [${fcRange[0]}-${fcRange[1]}bpm] → ${nb}bpm`,
      before: `${b}bpm`, after: `${nb}bpm`, token: match,
    });
    return `${nb}bpm`;
  });

  // Standalone %FTP not paired to watts → informational (skip token count)
  text.replace(PCT_FTP_RX, () => ""); // no-op

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
