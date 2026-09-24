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
import { computeObjectiveCycleSegments, type ClassifiableRaceGoal } from "@/lib/plan/multiObjectiveClassification";

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

/** Fallback Lorang standard sur une plage [start, end] (bornes GLOBALES du plan). */
function fallbackLorangPhasesForRange(start: number, end: number, nameSuffix: string): PhaseRange[] {
  const w = Math.max(1, end - start + 1);
  const off = start - 1;
  const foundationEnd = Math.max(1, Math.round(w * 0.25));
  const buildEnd = Math.max(foundationEnd + 1, Math.round(w * 0.60));
  const peakEnd = Math.max(buildEnd + 1, Math.round(w * 0.90));
  const ranges: PhaseRange[] = [
    { name: `Fondation${nameSuffix}`,  start: off + 1, end: off + foundationEnd },
    { name: `Build${nameSuffix}`,      start: off + foundationEnd + 1, end: off + buildEnd },
    { name: `Spécifique${nameSuffix}`, start: off + buildEnd + 1, end: off + peakEnd },
  ];
  if (off + peakEnd < end) ranges.push({ name: `Affûtage${nameSuffix}`, start: off + peakEnd + 1, end });
  return ranges;
}

/** Fallback Lorang standard sur totalWeeks (plan mono-cycle). */
function fallbackLorangPhases(totalWeeks: number): PhaseRange[] {
  return fallbackLorangPhasesForRange(1, Math.max(1, totalWeeks), "");
}

/**
 * Fallback Lorang conscient des cycles d'objectifs (plan multi-objectifs) —
 * mirror client de `computeMultiObjectiveSegments` (promptHelpers.ts, côté
 * génération) appliqué au récap de phases AFFICHÉ, pas seulement au contenu
 * généré. Audit coach (plan Manu, 39 sem, Ironman + Marathon Valence) :
 * `generatePlanWindowed` vide `plan.phases` après assemblage (titre/récap de
 * la fenêtre 1 sinon figé sur le plan entier, cf. AITrainingPlanPage.tsx) —
 * sans ce fix, `fallbackLorangPhases` (UN SEUL cycle continu Fondation→
 * Affûtage sur la totalité du plan) redevenait alors la seule source pour la
 * frise de phases affichée (`AIPlanViewer.tsx`), masquant complètement les
 * deux cycles réels (ex: Marathon S1-S22 avec son propre taper, Ironman
 * S25-S39) derrière un unique arc générique peaking vers S35 — alors que
 * `computeMultiObjectiveSegments` gère déjà ce cas pour le contenu réellement
 * généré (buildStructuredDiagnosticBlock, promptHelpers.ts).
 */
function cycleAwareLorangPhases(
  totalWeeks: number,
  raceGoals: ClassifiableRaceGoal[] | undefined,
  planStartDate: string | undefined,
): PhaseRange[] {
  const segments = computeObjectiveCycleSegments(raceGoals, planStartDate, totalWeeks);
  if (!segments) return fallbackLorangPhases(totalWeeks);

  const ranges: PhaseRange[] = [];
  let cursor = 1;
  segments.forEach((seg, i) => {
    if (seg.startWeek > cursor) {
      ranges.push({ name: "Régénération post-pic", start: cursor, end: seg.startWeek - 1 });
    }
    const suffix = ` — Cycle ${i + 1}/${segments.length} (${seg.objective})`;
    ranges.push(...fallbackLorangPhasesForRange(seg.startWeek, seg.endWeek, suffix));
    cursor = seg.endWeek + 1;
  });
  if (cursor <= totalWeeks) {
    ranges.push(...fallbackLorangPhasesForRange(cursor, totalWeeks, ""));
  }
  return ranges;
}

/**
 * Nom sentinelle pour un bloc final dont le récap `plan.phases` ne couvre pas
 * les dernières semaines (typiquement : un chunk de génération a échoué/été
 * tronqué et le fallback a rempli les semaines sans mettre à jour le récap).
 * Audit coach (plan Manu 40 sem) : avant ce fix, `buildPhaseRanges` réutilisait
 * silencieusement le nom ET le contenu (`objective`/`volume`) du DERNIER bloc
 * réel pour couvrir ces semaines — produisant un bloc dupliqué à l'identique
 * (ex. "Bloc 8 · Durabilité IM" sur S29-S32 ET S33-S40) qui masquait la perte
 * de contenu au lieu de la signaler.
 */
export const INCOMPLETE_PHASE_LABEL = "⚠️ Phase non générée (récap incomplet)";

/** Construit les plages de phases depuis `plan.phases` (recap) ou fallback. */
function buildPhaseRanges(
  plan: PhaseNormalizable,
  totalWeeks: number,
  raceGoals: ClassifiableRaceGoal[] | undefined,
  planStartDate: string | undefined,
): PhaseRange[] {
  const parsed: PhaseRange[] = [];
  for (const p of plan.phases ?? []) {
    const r = parseWeekRange(p.weeks ?? "");
    if (r && r.start >= 1 && r.start <= totalWeeks && p.name) {
      parsed.push({ name: p.name, start: r.start, end: Math.min(r.end, totalWeeks) });
    }
  }
  parsed.sort((a, b) => a.start - b.start);
  if (parsed.length === 0) return cycleAwareLorangPhases(totalWeeks, raceGoals, planStartDate);
  if (parsed[0].start > 1) parsed.unshift({ name: parsed[0].name, start: 1, end: parsed[0].start - 1 });
  const last = parsed[parsed.length - 1];
  if (last.end < totalWeeks) {
    parsed.push({ name: INCOMPLETE_PHASE_LABEL, start: last.end + 1, end: totalWeeks });
  }
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
  /**
   * Semaines couvertes par un bloc `INCOMPLETE_PHASE_LABEL` — le récap
   * `plan.phases` ne les couvrait pas et aucun contenu de bloc réel ne leur a
   * été attribué (cf. commentaire `INCOMPLETE_PHASE_LABEL`). Non-vide = signal
   * à faire remonter au coach, ces semaines méritent une vérification/régénération.
   */
  incompletePhaseWeeks: number[];
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
  config: { weeksAvailable?: number; raceGoals?: ClassifiableRaceGoal[]; planStartDate?: string },
): NormalizeStats {
  const stats: NormalizeStats = {
    droppedGhostWeeks: [],
    phaseReassignedCount: 0,
    labelCleanedCount: 0,
    incompletePhaseWeeks: [],
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
  const ranges = buildPhaseRanges(plan, totalWeeksExpected, config.raceGoals, config.planStartDate);
  for (const r of ranges) {
    if (r.name === INCOMPLETE_PHASE_LABEL) {
      for (let wn = r.start; wn <= r.end; wn++) stats.incompletePhaseWeeks.push(wn);
    }
  }

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

  // 4) Reconstruit TOUJOURS `plan.phases` depuis les plages canoniques —
  // recap original aligné si présent, sinon fallback Lorang (mono ou
  // multi-cycle, cf. `ranges` ci-dessus). Audit coach (plan Manu) : avant ce
  // fix, quand `plan.phases` démarrait vide (`generatePlanWindowed` le vide
  // après assemblage — cf. AITrainingPlanPage.tsx), ce bloc était sauté
  // (condition `plan.phases.length > 0` fausse) et `plan.phases` restait
  // vide en sortie malgré le calcul de `ranges` juste au-dessus — la frise de
  // phases affichée (AIPlanViewer.tsx) retombait alors sur son propre
  // fallback de reconstruction par regroupement de semaines identiques,
  // perdant l'info de cycle multi-objectifs portée par `ranges`.
  const existingPhases = plan.phases ?? [];
  plan.phases = ranges.map(r => {
    const existing = existingPhases.find(p => p.name === r.name);
    return {
      name: r.name,
      weeks: `S${r.start}-S${r.end}`,
      objective: existing?.objective,
      volume: existing?.volume,
    };
  });

  return stats;
}
