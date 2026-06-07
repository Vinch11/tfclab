/**
 * AI Plan Workout Enricher
 * ─────────────────────────
 * Hydrate les séances générées par l'IA avec leur fiche complète issue
 * de la bibliothèque (`WorkoutLibrary`), sans charger le prompt IA.
 *
 * Source unique de vérité : `enrichedWorkouts*` via `WorkoutLibrary`.
 * Utilisé par AIPlanViewer (UI) et aiPlanPDFExport (PDF) → cohérence garantie.
 */

import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { ParsedSession } from "@/lib/aiPlanParser";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import { extractCatalogId } from "@/lib/catalogIdExtractor";

const byId: Map<string, LibraryWorkout> = (() => {
  const m = new Map<string, LibraryWorkout>();
  for (const w of WorkoutLibrary) m.set(w.id.toUpperCase(), w);
  return m;
})();

/** Trouve la fiche bibliothèque correspondant à une séance du plan IA. */
export function findLibraryWorkoutForSession(
  session: Pick<ParsedSession, "title" | "details">
): LibraryWorkout | null {
  const id = extractCatalogId(session.title || "", session.details || "");
  if (!id) return null;
  return byId.get(id.toUpperCase()) || null;
}

export interface EnrichedSessionFiche {
  id: string;
  cat: string;
  sport: string;
  objectif: string;
  necessite: string;
  when: string;
  avoid: string;
  durationMin: [number, number];
  structure: { part: string; text: string; zones: string[] }[];
  variants: { goal: string; text: string }[];
  tags: string[];
  notes?: string;
  phase: string[];
  dPlusTargetM?: number | { min: number; max: number };
  wbalSummary?: string;
}

export function toFiche(w: LibraryWorkout): EnrichedSessionFiche {
  const variants = w.variants
    ? Object.entries(w.variants)
        .filter(([, v]) => !!v)
        .map(([goal, text]) => ({ goal, text: String(text) }))
    : [];

  let wbalSummary: string | undefined;
  if (w.wbalProfile?.blocks?.length) {
    wbalSummary = w.wbalProfile.blocks
      .map((b) => {
        const dur =
          b.durationSec >= 60
            ? `${Math.round(b.durationSec / 60)}min`
            : `${b.durationSec}s`;
        const rest =
          b.defaultRestSec >= 60
            ? `${Math.round(b.defaultRestSec / 60)}min`
            : `${b.defaultRestSec}s`;
        return `${b.reps}×${dur} @ ${b.intensity}% ${b.intensityRef} (récup ${rest}${
          b.recoveryStrategy ? ` ${b.recoveryStrategy}` : ""
        })${b.label ? ` — ${b.label}` : ""}`;
      })
      .join(" → ");
  }

  return {
    id: w.id,
    cat: w.cat,
    sport: w.sport,
    objectif: w.objectif,
    necessite: w.necessite,
    when: w.when,
    avoid: w.avoid,
    durationMin: w.durationMin,
    structure: w.structure,
    variants,
    tags: w.tags || [],
    notes: w.notes,
    phase: w.phase || [],
    dPlusTargetM: w.dPlusTargetM,
    wbalSummary,
  };
}

export function getFicheForSession(
  session: Pick<ParsedSession, "title" | "details">
): EnrichedSessionFiche | null {
  const w = findLibraryWorkoutForSession(session);
  return w ? toFiche(w) : null;
}
