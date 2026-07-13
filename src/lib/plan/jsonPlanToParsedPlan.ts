/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 1B — Identity mapping MergedPlan → ParsedPlan (source unique côté client)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Le schéma serveur (planSchema.ts) miroite ParsedPlan. Ce module transforme
 * un `MergedPlan` (chunks JSON validés + fusionnés) en `ParsedPlan` consommable
 * SANS modification par AIPlanViewer, planPatcher, plan_versions.
 *
 * Volume hebdo (contrainte N°4) — recalculé ici depuis `Σ durationMin` par
 * semaine. Aucune valeur ne provient du LLM. Formaté "Nh MMmin" pour la carte.
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
    // #catalogId — préfixé au titre pour préserver les regex catalog historiques
    // (aiPlanWorkoutEnricher, planValidator.validateCatalogRatio, etc.) tant que
    // la Phase 1C n'a pas rebranché ces consommateurs sur `catalogId` structuré.
    title: s.catalogId ? `${s.catalogId} — ${s.title}` : s.title,
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
    strategicRecap: merged.strategicRecap,
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
