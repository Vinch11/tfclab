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
  zonesContainingHalfOpen,
  nearestZoneForMetric,
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

// Tolérances "allure course reconnue" (règle 3)
const RACE_PACE_TOL_SEC = 3; // ±3s/km
const RACE_POWER_TOL_W = 3;  // ±3W

function paceStrToSec(m: string, s: string): number {
  return Number(m) * 60 + Number(s);
}
function secToPace(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec - m * 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Résout une valeur relative (%) vers une zone selon convention semi-ouverte
 * [min,max[. Si aucune zone ne matche (trou de grille), rattache à la zone la
 * plus proche et renvoie {zone, gap:distance}. Renvoie null si aucune zone
 * n'est définie pour cette métrique.
 */
function resolveZone(
  v: number,
  metric: "vma" | "ftp" | "cpRun" | "fcMax",
): { zone: ZoneId; gap: number } | null {
  const hits = zonesContainingHalfOpen(v, metric);
  if (hits.length === 1) return { zone: hits[0], gap: 0 };
  if (hits.length > 1) {
    // Ne devrait pas arriver avec semi-ouvert + grille TFCL. Prend la plus haute.
    return { zone: hits[hits.length - 1], gap: 0 };
  }
  const near = nearestZoneForMetric(v, metric);
  if (!near) return null;
  return { zone: near.zone, gap: near.distance };
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

  // ─── 1a) WATTS RANGE "200-220W" → "P1-P2% FTP" (avec fallback gap_mapped) ─
  if (isBike) {
    text = text.replace(WATTS_RANGE_RX, (match, a, b) => {
      tokens += 2;
      if (!t.ftpW) {
        unresolved += 2; residualAbsolute += 2;
        repairs.push({
          code: "value_unresolved", severity: "critical",
          reason: `${match} : FTP athlète absent, impossible de relativiser [absolu_ambigu]`,
          token: match,
        });
        return match;
      }
      const wa = Number(a), wb = Number(b);
      const pa = Math.round((wa / t.ftpW) * 100);
      const pb = Math.round((wb / t.ftpW) * 100);
      const ra = resolveZone(pa, "ftp"); const rb = resolveZone(pb, "ftp");
      if (!ra || !rb) {
        unresolved += 2; residualAbsolute += 2;
        repairs.push({
          code: "value_unresolved", severity: "critical",
          reason: `${match} → ${pa}-${pb}% FTP hors grille [pourcent_hors_grille]`,
          token: match,
        });
        return match;
      }
      relativized += 2;
      const after = `${pa}-${pb}% FTP`;
      const gapNote = (ra.gap > 0 || rb.gap > 0) ? ` [gap_mapped Δ=${Math.max(ra.gap, rb.gap)}pts]` : "";
      repairs.push({
        code: "value_relativized", severity: "warning",
        reason: `${match} traduit en ${after} (FTP=${t.ftpW}W)${gapNote}`,
        before: match, after, token: match,
      });
      return after;
    });
  }

  // ─── 1b) WATTS SINGLE "220W" → "@ puissance course" ou "P% FTP" ─────
  if (isBike) {
    text = text.replace(WATTS_RX, (match, wStr) => {
      tokens++;
      if (!t.ftpW) {
        unresolved++; residualAbsolute++;
        repairs.push({
          code: "value_unresolved", severity: "critical",
          reason: `${match} : FTP athlète absent, impossible de relativiser [absolu_ambigu]`,
          token: match,
        });
        return match;
      }
      const w = Number(wStr);
      // Règle 3 : priorité racePower
      if (t.racePowerW && Math.abs(w - t.racePowerW) <= RACE_POWER_TOL_W) {
        relativized++;
        const after = "@ puissance course";
        repairs.push({
          code: "value_relativized", severity: "warning",
          reason: `${match} traduit en ${after} (racePower=${t.racePowerW}W, tol ±${RACE_POWER_TOL_W}W)`,
          before: match, after, token: match,
        });
        return after;
      }
      const pct = Math.round((w / t.ftpW) * 100);
      const r = resolveZone(pct, "ftp");
      if (!r) {
        unresolved++; residualAbsolute++;
        repairs.push({
          code: "value_unresolved", severity: "critical",
          reason: `${match} → ${pct}% FTP hors grille [pourcent_hors_grille]`,
          token: match,
        });
        return match;
      }
      relativized++;
      const after = `${pct}% FTP`;
      const gapNote = r.gap > 0 ? ` [gap_mapped Δ=${r.gap}pts vers ${r.zone}]` : "";
      repairs.push({
        code: "value_relativized", severity: "warning",
        reason: `${match} traduit en ${after} (FTP=${t.ftpW}W)${gapNote}`,
        before: match, after, token: match,
      });
      return after;
    });
  }

  // ─── 1c) PACE /km → "@ allure course" ou Zone (semi-ouvert + gap_mapped) ─
  if (isRun) {
    text = text.replace(PACE_KM_RX, (match, mm, ss) => {
      tokens++;
      const sec = paceStrToSec(mm, ss);
      // Règle 3 : priorité racePace
      if (t.racePaceSecPerKm && Math.abs(sec - t.racePaceSecPerKm) <= RACE_PACE_TOL_SEC) {
        relativized++;
        const after = "@ allure course";
        repairs.push({
          code: "value_relativized", severity: "warning",
          reason: `${match} traduit en ${after} (racePace=${secToPace(t.racePaceSecPerKm)}/km, tol ±${RACE_PACE_TOL_SEC}s)`,
          before: match, after, token: match,
        });
        return after;
      }
      if (!t.vmaKmh) {
        unresolved++; residualAbsolute++;
        repairs.push({
          code: "value_unresolved", severity: "critical",
          reason: `${match} : VMA absente → impossible de relativiser [absolu_ambigu]`,
          token: match,
        });
        return match;
      }
      const kmh = 3600 / sec;
      const pct = Math.round((kmh / t.vmaKmh) * 100);
      const r = resolveZone(pct, "vma");
      if (!r) {
        unresolved++; residualAbsolute++;
        repairs.push({
          code: "value_unresolved", severity: "critical",
          reason: `${match} → ${pct}% VMA hors grille [pourcent_hors_grille]`,
          token: match,
        });
        return match;
      }
      relativized++;
      const gapNote = r.gap > 0 ? ` [gap_mapped Δ=${r.gap}pts]` : "";
      repairs.push({
        code: "value_relativized", severity: "warning",
        reason: `${match} traduit en ${r.zone} (${pct}% VMA)${gapNote}`,
        before: match, after: r.zone, token: match,
      });
      return r.zone;
    });
  }

  // ─── 1d) /100m → CSS±Xs (toujours si CSS dérivé disponible) ─────────
  if (isSwim) {
    text = text.replace(CSS_RX, (match, mm, ss) => {
      tokens++;
      const sec = paceStrToSec(mm, ss);
      if (!t.cssSecPer100m) {
        unresolved++; residualAbsolute++;
        repairs.push({
          code: "value_unresolved", severity: "critical",
          reason: `${match} : CSS athlète absent, impossible de relativiser [absolu_ambigu]`,
          token: match,
        });
        return match;
      }
      const delta = sec - t.cssSecPer100m;
      const after = delta === 0 ? "CSS" : `CSS${delta > 0 ? "+" : ""}${delta}s`;
      relativized++;
      repairs.push({
        code: "value_relativized", severity: "warning",
        reason: `${match} traduit en ${after} (CSS=${secToPace(t.cssSecPer100m)}/100m)`,
        before: match, after, token: match,
      });
      return after;
    });
  }

  // ─── 1e) FC bpm → Zone (semi-ouvert + gap_mapped) ───────────────────
  if (t.fcMax) {
    text = text.replace(BPM_RX, (match, bStr) => {
      tokens++;
      const b = Number(bStr);
      const pct = Math.round((b / t.fcMax!) * 100);
      const r = resolveZone(pct, "fcMax");
      if (!r) {
        unresolved++; residualAbsolute++;
        repairs.push({
          code: "value_unresolved", severity: "critical",
          reason: `${match} → ${pct}% FCmax hors grille [pourcent_hors_grille]`,
          token: match,
        });
        return match;
      }
      relativized++;
      const gapNote = r.gap > 0 ? ` [gap_mapped Δ=${r.gap}pts]` : "";
      repairs.push({
        code: "value_relativized", severity: "warning",
        reason: `${match} traduit en ${r.zone} (${pct}% FCmax)${gapNote}`,
        before: match, after: r.zone, token: match,
      });
      return r.zone;
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

        // ─── Filet non silencieux : dédup "(X (X))" + plage durée > 30 min ───
        // Dédup annotations identiques ex "74% FTP (74% FTP)"
        const DUP_RX = /(\d{1,3}\s*%\s*(?:FTP|VMA|CSS|FCmax|CP\s*Run|CPRun)|\d{2,4}\s*W|CSS\s*[+-]\s*\d{1,2}\s*s)\s*\(\s*(\1)\s*\)/gi;
        const beforeDedup = res.text;
        const afterDedup = beforeDedup.replace(DUP_RX, (_m, a) => {
          repairs.push({
            code: "value_relativized", severity: "warning",
            weekNumber: w.weekNumber, day: s.day, sport: s.sport, chunkIndex: ci,
            reason: `annotation identique dupliquée "${_m}" collapsée → "${a}"`,
            before: _m, after: a, token: _m,
          });
          return a;
        });

        // Plage durée > 30 min d'amplitude (Xh(mm)?-Yh(mm)?) → warning
        const RANGE_RX = /(\d{1,2})(?:h(\d{0,2})|min|')-(\d{1,2})(?:h(\d{0,2})|min|')/g;
        let rangeMatch: RegExpExecArray | null;
        while ((rangeMatch = RANGE_RX.exec(afterDedup)) !== null) {
          const raw = rangeMatch[0];
          const parts = raw.split("-");
          const toMin = (p: string): number | null => {
            const mh = p.match(/^(\d{1,2})h(\d{0,2})?$/i);
            if (mh) return Number(mh[1]) * 60 + (mh[2] ? Number(mh[2]) : 0);
            const mmin = p.match(/^(\d{1,3})(?:min|')$/i);
            if (mmin) return Number(mmin[1]);
            return null;
          };
          const a = toMin(parts[0]); const b = toMin(parts[1]);
          if (a == null || b == null || b - a <= 30) continue;
          repairs.push({
            code: "value_unresolved", severity: "warning",
            weekNumber: w.weekNumber, day: s.day, sport: s.sport, chunkIndex: ci,
            reason: `plage de durée trop large "${raw}" (Δ=${b - a}min>30) — à résoudre par sessionSizingMatrix [duration_range_ambiguous]`,
            token: raw,
          });
        }

        if (res.tokens === 0 && beforeDedup === afterDedup) return s;
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
        const finalText = afterDedup;
        if (finalText !== combined) {
          const [newTitle, ...rest] = finalText.split("\n");
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
