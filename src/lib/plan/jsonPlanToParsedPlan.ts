/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 1B — Identity mapping MergedPlan → ParsedPlan (source unique côté client)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * TODO(Phase-1C) — HACK title-prefix `${catalogId} — ${title}`
 * ─────────────────────────────────────────────────────────────
 * Pour éviter de refactorer immédiatement les consommateurs regex historiques,
 * on préfixe le catalogId dans `title`. À supprimer en Phase 1C UNE FOIS ces
 * 3 consommateurs rebranchés sur `ParsedSession.catalogId` structuré :
 *   1) src/lib/catalogIdExtractor.ts       — CATALOG_ID_PATTERN.exec(title)
 *   2) src/lib/aiPlanWorkoutEnricher.ts    — regex ID sur title+details
 *   3) src/engines/plan/planValidator.ts   — validateCatalogRatio (L707)
 * Étapes Phase 1C :
 *   a) Ajouter `catalogId?: string|null` à ParsedSession (aiPlanParser.ts)
 *   b) Peupler `catalogId` ici au lieu de préfixer `title`
 *   c) Rebrancher les 3 consommateurs sur le champ structuré (fallback regex
 *      conservé pour le chemin Markdown tant que celui-ci coexiste)
 *   d) Supprimer le préfixe title dans ce fichier
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";
import type { MergedPlan, MergedWeek, MergedSession } from "./mergePlanChunks";

function formatVolumeMin(totalMin: number): string {
  const rounded = Math.round(totalMin / 5) * 5;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (h <= 0) return `${m}min`;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

function toParsedSession(s: MergedSession): ParsedSession {
  return {
    weekNumber: s.weekNumber,
    weekTheme: s.weekTheme,
    phase: s.phase,
    dayName: s.dayName,
    dayIndex: s.dayIndex,
    sport: s.sport,
    // Phase 1C-A : catalogId exposé en champ structuré (plus de préfixe title).
    title: s.title,
    catalogId: s.catalogId ?? null,
    details: s.details,
    isRest: s.isRest,
  };
}

function toParsedWeek(w: MergedWeek): ParsedWeek {
  const sessions = w.sessions.map(toParsedSession);
  const computedVolumeMin = w.sessions.reduce((sum, s) => sum + (s.durationMin || 0), 0);
  return {
    weekNumber: w.weekNumber,
    theme: w.theme || `Semaine ${w.weekNumber}`,
    phase: w.phase,
    phaseObjective: w.phaseObjective,
    volumeTarget: undefined, // contrainte N°4 : plus de volume LLM
    computedVolumeMin: computedVolumeMin > 0 ? computedVolumeMin : undefined,
    computedVolumeStr: computedVolumeMin > 0 ? formatVolumeMin(computedVolumeMin) : undefined,
    coachNotes: w.coachNotes,
    sessions,
  };
}

export function jsonPlanToParsedPlan(merged: MergedPlan): ParsedPlan {
  return {
    title: merged.title,
    diagnostic: merged.diagnostic,
    strategicRecap: merged.strategicRecap as ParsedPlan["strategicRecap"],
    phases: merged.phases.map(p => ({
      name: p.name,
      weeks: p.weeks,
      objective: p.objective,
      // volume déclaré supprimé (contrainte N°4)
    })),
    weeks: merged.weeks.map(toParsedWeek),
    totalWeeks: merged.totalWeeks,
  };
}

/**
 * Volume hebdo par sport recalculé depuis les sessions (source unique).
 * Exposé pour AIPlanVolumeChart et vérifications E2E.
 */
export function computeWeeklyVolumeBySport(merged: MergedPlan): Array<{
  weekNumber: number;
  totalMin: number;
  bySport: Record<string, number>;
}> {
  return merged.weeks.map(w => {
    const bySport: Record<string, number> = {};
    let totalMin = 0;
    for (const s of w.sessions) {
      const dur = s.durationMin || 0;
      totalMin += dur;
      bySport[s.sport] = (bySport[s.sport] ?? 0) + dur;
    }
    return { weekNumber: w.weekNumber, totalMin, bySport };
  });
}
