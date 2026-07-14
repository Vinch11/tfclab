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
 * - SWIM / BRICK / AERO / T1 / T2 → exclusion totale.
 * - BIKE → autorisé UNIQUEMENT en cross-training Z1-Z2 (récup active, durabilité).
 *   La qualité vélo (Z3+, seuil, VO2, lactate shuttle) est exclue.
 */
const RUN_ONLY_OBJECTIVE_RX = /^(semi|semi.?marathon|marathon|10\s*k|10km|5\s*k|5km|trail|starttorun)/i;
const HARD_INCOMPATIBLE_TOKENS = ["SWIM", "BRICK", "AERO", "T1", "T2"];
const BIKE_QUALITY_TAG_RX = /(LACTATE|THRESHOLD|SWEETSPOT|SWEET.?SPOT|VO2|TEMPO|SEUIL|SHUTTLE|FTP|RACE)/;

function isRunOnlyObjective(obj?: string | null): boolean {
  if (!obj) return false;
  const s = obj.trim().toLowerCase();
  if (/ironman|70\.?3|half.?iron|olymp|sprint\b|tri\b|triathlon/.test(s)) return false;
  return RUN_ONLY_OBJECTIVE_RX.test(s);
}

/** Un template BIKE est "qualité" (interdit) si Main contient Z3+ ou tag qualité. */
function isBikeQualityTemplate(w: LibraryWorkout): boolean {
  const id = (w.id || "").toUpperCase();
  const tags = (w.tags || []).map(t => (t || "").toUpperCase());
  if (BIKE_QUALITY_TAG_RX.test(id)) return true;
  if (tags.some(t => BIKE_QUALITY_TAG_RX.test(t))) return true;
  const mainParts = (w.structure || []).filter(p => /main/i.test(p.part || ""));
  for (const p of mainParts) {
    const zones = (p.zones || []).map(z => (z || "").toUpperCase());
    if (zones.some(z => /Z[3-7]/.test(z))) return true;
  }
  return false;
}

function isTemplateIncompatibleWithObjective(
  w: LibraryWorkout,
  objectifEffectif?: string | null,
): { rejected: boolean; reason?: string } {
  if (!isRunOnlyObjective(objectifEffectif)) return { rejected: false };
  const id = (w.id || "").toUpperCase();
  const tags = (w.tags || []).map(t => (t || "").toUpperCase());
  const isBike = id.includes("BIKE") || w.sport === "bike" || w.sport === "cyclisme";

  if (HARD_INCOMPATIBLE_TOKENS.some(tok => id.includes(tok) || tags.some(t => t.includes(tok)))) {
    return { rejected: true, reason: `sport incompatible avec ${objectifEffectif}` };
  }
  if (isBike) {
    if (isBikeQualityTemplate(w)) {
      return { rejected: true, reason: "qualité vélo interdite en plan running" };
    }
    // eslint-disable-next-line no-console
    console.log(`✅ template ${w.id} autorisé (cross-training Z1-Z2)`);
    return { rejected: false };
  }
  return { rejected: false };
}

/** Trouve la fiche bibliothèque correspondant à une séance du plan IA. */
export function findLibraryWorkoutForSession(
  session: Pick<ParsedSession, "title" | "details"> & { catalogId?: string | null },
  objectifEffectif?: string | null,
): LibraryWorkout | null {
  const id = extractCatalogId(session.title || "", session.details || "", session.catalogId ?? null);
  if (!id) return null;
  const w = byId.get(id.toUpperCase()) || null;
  if (!w) return null;
  const check = isTemplateIncompatibleWithObjective(w, objectifEffectif);
  if (check.rejected) {
    // eslint-disable-next-line no-console
    console.log(`🚫 template ${w.id} exclu (${check.reason})`);
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
  session: Pick<ParsedSession, "title" | "details"> & { catalogId?: string | null },
  objectifEffectif?: string | null,
): EnrichedSessionFiche | null {
  const w = findLibraryWorkoutForSession(session, objectifEffectif);
  return w ? toFiche(w) : null;
}

/**
 * Garde-fou aval : en objectif running pur, si une séance vélo générée
 * contient une intensité Z3+ (ou watts au-dessus du seuil), on dégrade
 * verbalement en Z2 dans le texte affiché et on logge l'événement.
 * Ne modifie pas la structure sous-jacente de la bibliothèque.
 */
export function maybeDowngradeBikeSession<T extends { sport?: string; title?: string; details?: string }>(
  session: T,
  objectifEffectif?: string | null,
): T {
  if (!isRunOnlyObjective(objectifEffectif)) return session;
  const sport = (session.sport || "").toLowerCase();
  const title = session.title || "";
  const details = session.details || "";
  const isBike = /bike|v[ée]lo|cycl/.test(sport) || /BIKE|VÉLO|VELO/i.test(title);
  if (!isBike) return session;
  const hasHighZone = /Z[3-7]\b/i.test(details) || /Z[3-7]\b/i.test(title);
  if (!hasHighZone) return session;
  // eslint-disable-next-line no-console
  console.log(`⚠️ séance vélo dégradée en Z2 (${title || "sans titre"})`);
  const patched = details.replace(/Z[3-7][a-b]?/gi, "Z2") +
    "\n\n> ⚠️ Cross-training vélo dégradé en Z2 (plan running pur — qualité vélo interdite).";
  return { ...session, details: patched };
}

