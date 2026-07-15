/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE WIDENER — élargissement des `phase[]` trop étroits
 * ═══════════════════════════════════════════════════════════════════════════════
 * Certaines fiches d'endurance fondamentale / technique de base sont marquées
 * avec un phaseAllowed restrictif (ex: [base, build]) alors qu'elles sont
 * pertinentes largement (base + build + peak au minimum).
 *
 * Ce module opère APRÈS le chargement de la bibliothèque et élargit
 * programmatiquement `phase[]` (et `when` si un mot-clé de phase fort le
 * restreint) pour les fiches dont l'intention est :
 *   - endurance_fondamentale
 *   - technique
 *
 * Chaque modification est journalisée : `[phase_widened] id=... ancien=[...] nouveau=[...]`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LibraryWorkout, PhaseTag } from "@/types/workoutLibrary";
import { intentFamilyOf } from "./intentFamily";

const TARGET_FAMILIES = new Set(["endurance_fondamentale", "technique"]);
const WIDE_PHASES: PhaseTag[] = ["base", "build", "peak"];

/** Élargit programmatiquement les phase[] trop étroits pour les intentions endurance/technique. */
export function widenEndurancePhases(library: LibraryWorkout[]): void {
  const changed: Array<{ id: string; oldPhases: PhaseTag[]; newPhases: PhaseTag[]; oldWhen?: string; newWhen?: string }> = [];

  for (const w of library) {
    const family = intentFamilyOf(w);
    if (!TARGET_FAMILIES.has(family)) continue;

    const cur = new Set<PhaseTag>(w.phase ?? []);
    const missing = WIDE_PHASES.filter(p => !cur.has(p));
    if (missing.length === 0) continue;

    const oldPhases = [...(w.phase ?? [])];
    const newPhases: PhaseTag[] = ["base", "build", "peak", ...(cur.has("taper") ? ["taper" as PhaseTag] : [])];

    // Neutraliser un `when` restrictif : ficheAllowedPhases lit d'abord les
    // mots-clés forts du champ `when`. Si le when ne contient QUE base/build,
    // on l'enrichit pour couvrir peak (sans réécrire tout le sens).
    let newWhen: string | undefined;
    const oldWhen = w.when;
    if (oldWhen) {
      const hasPeak = /\bpeak\b|sp[eé]cifique/i.test(oldWhen);
      if (!hasPeak) {
        newWhen = `${oldWhen} · Peak (pertinent — pilier endurance/technique)`;
      }
    }

    w.phase = newPhases;
    if (newWhen) w.when = newWhen;
    changed.push({ id: w.id, oldPhases, newPhases, oldWhen, newWhen });
  }

  if (changed.length > 0) {
    // eslint-disable-next-line no-console
    console.groupCollapsed(`🔧 [phase_widened] ${changed.length} fiche(s) élargies (endurance/technique)`);
    for (const c of changed) {
      // eslint-disable-next-line no-console
      console.log(`[phase_widened] id=${c.id} ancien=[${c.oldPhases.join(",")}] nouveau=[${c.newPhases.join(",")}]`);
    }
    // eslint-disable-next-line no-console
    console.groupEnd();
  }
}
