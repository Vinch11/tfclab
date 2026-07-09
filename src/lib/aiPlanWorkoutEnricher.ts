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

/**
 * Sports incompatibles avec un objectif running pur (semi, marathon, 10K, 5K, trail).
 * Rejette tout template dont l'ID ou les tags contiennent ces marqueurs.
 */
const RUN_ONLY_OBJECTIVE_RX = /^(semi|semi.?marathon|marathon|10\s*k|10km|5\s*k|5km|trail|starttorun)/i;
const INCOMPATIBLE_TOKENS = ["BIKE", "SWIM", "BRICK", "AERO", "T1", "T2"];

function isRunOnlyObjective(obj?: string | null): boolean {
  if (!obj) return false;
  const s = obj.trim().toLowerCase();
  // Objectifs triathlon → pas de filtre (IM, 70.3, tri, etc.)
  if (/ironman|70\.?3|half.?iron|olymp|sprint\b|tri\b|triathlon/.test(s)) return false;
  return RUN_ONLY_OBJECTIVE_RX.test(s);
}

function isTemplateIncompatibleWithObjective(w: LibraryWorkout, objectifEffectif?: string | null): boolean {
  if (!isRunOnlyObjective(objectifEffectif)) return false;
  const id = (w.id || "").toUpperCase();
  const tags = (w.tags || []).map(t => (t || "").toUpperCase());
  return INCOMPATIBLE_TOKENS.some(tok => id.includes(tok) || tags.some(t => t.includes(tok)));
}

/** Trouve la fiche bibliothèque correspondant à une séance du plan IA. */
export function findLibraryWorkoutForSession(
  session: Pick<ParsedSession, "title" | "details">,
  objectifEffectif?: string | null,
): LibraryWorkout | null {
  const id = extractCatalogId(session.title || "", session.details || "");
  if (!id) return null;
  const w = byId.get(id.toUpperCase()) || null;
  if (!w) return null;
  if (isTemplateIncompatibleWithObjective(w, objectifEffectif)) {
    // eslint-disable-next-line no-console
    console.log(`🚫 template ${w.id} exclu (sport incompatible avec ${objectifEffectif})`);
    return null;
  }
  return w;
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
  session: Pick<ParsedSession, "title" | "details">,
  objectifEffectif?: string | null,
): EnrichedSessionFiche | null {
  const w = findLibraryWorkoutForSession(session, objectifEffectif);
  return w ? toFiche(w) : null;
}
