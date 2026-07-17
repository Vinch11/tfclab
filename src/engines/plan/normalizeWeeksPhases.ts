/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL PLAN ENGINE™ — Normalisation déterministe weekNumber + phase
 *
 * AUDIT Claude juillet 2026 :
 *   - Symptôme : "Phase Spécifique (S17)" dans un plan de 11 semaines,
 *     "S8/S9 qui reculent", blocs incohérents entre chunks.
 *   - Cause : chaque chunk génère sa propre numérotation/phase sans vue
 *     globale du calendrier.
 *   - Fix : après assemblage/parsing, on impose :
 *       1. Numérotation contigüe [1..totalWeeksExpected] (drop ghosts).
 *       2. Nettoyage des références "(SN)" > totalWeeks dans les labels phase.
 *       3. Ré-assignation de `phase` depuis `plan.phases` (recap S1-S6, S7-S12…).
 *       4. Fallback Lorang standard si aucun recap exploitable.
 *
 * Consommé par `postProcessParsedPlan` (single source of truth post-parsing).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ParsedPlan, ParsedWeek, PlanGenerationConfig } from "./types";

/** Forme minimale commune à ParsedPlan et MergedPlan pour la normalisation de phase. */
export interface PhaseNormalizable {
  weeks: Array<{
    weekNumber: number;
    phase: string;
    theme?: string;
    weekTheme?: string;
    sessions: Array<{ phase: string; weekTheme?: string }>;
  }>;
  phases?: Array<{ name?: string; weeks?: string; objective?: string; volume?: string }>;
  totalWeeks?: number;
}

interface PhaseRange {
  name: string;
  start: number;
  end: number;
}

/** Parse "S1-S6" / "S7 à S12" / "Semaines 3-8" → { start, end }. */
function parseWeekRange(raw: string): { start: number; end: number } | null {
  if (!raw) return null;
  const m = raw.match(/S?(\d+)\s*(?:-|–|—|to|à)\s*S?(\d+)/i);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1 || b < a) return null;
  return { start: a, end: b };
}

/** Fallback Lorang standard sur totalWeeks. */
function fallbackLorangPhases(totalWeeks: number): PhaseRange[] {
  const w = Math.max(1, totalWeeks);
  const foundationEnd = Math.max(1, Math.round(w * 0.25));
  const buildEnd = Math.max(foundationEnd + 1, Math.round(w * 0.60));
  const peakEnd = Math.max(buildEnd + 1, Math.round(w * 0.90));
  const ranges: PhaseRange[] = [
    { name: "Fondation",  start: 1, end: foundationEnd },
    { name: "Build",      start: foundationEnd + 1, end: buildEnd },
    { name: "Spécifique", start: buildEnd + 1, end: peakEnd },
  ];
  if (peakEnd < w) ranges.push({ name: "Affûtage", start: peakEnd + 1, end: w });
  return ranges;
}

/** Construit les plages de phases depuis `plan.phases` (recap) ou fallback. */
function buildPhaseRanges(plan: PhaseNormalizable, totalWeeks: number): PhaseRange[] {
  const parsed: PhaseRange[] = [];
  for (const p of plan.phases ?? []) {
    const r = parseWeekRange(p.weeks ?? "");
    if (r && r.start >= 1 && r.start <= totalWeeks && p.name) {
      parsed.push({ name: p.name, start: r.start, end: Math.min(r.end, totalWeeks) });
    }
  }
  parsed.sort((a, b) => a.start - b.start);
  if (parsed.length === 0) return fallbackLorangPhases(totalWeeks);
  if (parsed[0].start > 1) parsed.unshift({ name: parsed[0].name, start: 1, end: parsed[0].start - 1 });
  const last = parsed[parsed.length - 1];
  if (last.end < totalWeeks) parsed.push({ name: last.name, start: last.end + 1, end: totalWeeks });
  return parsed;
}

/** Retourne le nom de phase pour un weekNumber donné. */
function phaseForWeek(ranges: PhaseRange[], weekNumber: number, fallback: string): string {
  for (const r of ranges) {
    if (weekNumber >= r.start && weekNumber <= r.end) return r.name;
  }
  return fallback;
}

/** Nettoie "(S17)" / "S17" hors range dans un label libre. */
function stripOutOfRangeWeekRefs(label: string, totalWeeks: number): string {
  if (!label) return label;
  return label.replace(/\s*\(?\bS(\d+)\b\)?/g, (match, num) => {
    const n = parseInt(num, 10);
    return n > totalWeeks || n < 1 ? "" : match;
  }).replace(/\s+/g, " ").trim();
}

export interface NormalizeStats {
  droppedGhostWeeks: number[];
  phaseReassignedCount: number;
  labelCleanedCount: number;
}

/**
 * Normalise weeks + phases in-place. Retourne des stats pour le log.
 *
 *  - Drop weeks with weekNumber > totalWeeksExpected (ghosts type "S17" en plan 11 sem).
 *  - Ré-assigne `week.phase` et `session.phase` depuis les plages canoniques.
 *  - Strip les références "(SN)" hors range dans les thèmes/phases.
 */
export function normalizeWeeksAndPhases(
  plan: PhaseNormalizable,
  config: { weeksAvailable?: number },
): NormalizeStats {
  const stats: NormalizeStats = {
    droppedGhostWeeks: [],
    phaseReassignedCount: 0,
    labelCleanedCount: 0,
  };

  const totalWeeksExpected = typeof config.weeksAvailable === "number" && config.weeksAvailable > 0
    ? config.weeksAvailable
    : plan.weeks.length;

  // 1) Drop weeks whose number is beyond expected total (ghosts).
  const kept: PhaseNormalizable["weeks"] = [];
  for (const w of plan.weeks) {
    if (w.weekNumber < 1 || w.weekNumber > totalWeeksExpected) {
      stats.droppedGhostWeeks.push(w.weekNumber);
      continue;
    }
    kept.push(w);
  }
  plan.weeks = kept.sort((a, b) => a.weekNumber - b.weekNumber);
  plan.totalWeeks = plan.weeks.length;

  // 2) Build canonical phase ranges (from recap, else Lorang fallback).
  const ranges = buildPhaseRanges(plan, totalWeeksExpected);

  // 3) Ré-assigne phase + strip labels.
  for (const w of plan.weeks) {
    const canonical = phaseForWeek(ranges, w.weekNumber, w.phase || "");
    if (canonical && canonical !== w.phase) {
      w.phase = canonical;
      stats.phaseReassignedCount++;
    }
    const cleanedTheme = stripOutOfRangeWeekRefs(w.theme || "", totalWeeksExpected);
    if (cleanedTheme !== w.theme) {
      w.theme = cleanedTheme;
      stats.labelCleanedCount++;
    }
    for (const s of w.sessions) {
      if (canonical && s.phase !== canonical) s.phase = canonical;
      const cleanedWt = stripOutOfRangeWeekRefs(s.weekTheme || "", totalWeeksExpected);
      if (cleanedWt !== s.weekTheme) s.weekTheme = cleanedWt;
    }
  }

  // 4) Normalise aussi `plan.phases` (aligne sur ranges canoniques si présent).
  if (plan.phases && plan.phases.length > 0) {
    plan.phases = ranges.map(r => {
      const existing = plan.phases!.find(p => p.name === r.name);
      return {
        name: r.name,
        weeks: `S${r.start}-S${r.end}`,
        objective: existing?.objective,
        volume: existing?.volume,
      };
    });
  }

  return stats;
}
