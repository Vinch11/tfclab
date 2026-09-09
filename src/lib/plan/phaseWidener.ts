/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE WIDENER — élargissement des `phase[]` trop étroits
 * ═══════════════════════════════════════════════════════════════════════════════
 * Certaines fiches d'endurance fondamentale / technique de base sont marquées
 * avec un phaseAllowed restrictif (ex: [base, build]) alors qu'elles sont
 * pertinentes largement (base + build + peak au minimum).
 *
 * Ce module opère APRÈS le chargement de la bibliothèque et élargit
 * programmatiquement `phase[]` pour les fiches dont l'intention est :
 *   - endurance_fondamentale
 *   - technique
 *
 * N'écrit jamais dans le champ libre `when` (cf. commentaire dans la boucle
 * ci-dessous pour le bug réel que cela causait).
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
  const changed: Array<{ id: string; oldPhases: PhaseTag[]; newPhases: PhaseTag[] }> = [];

  for (const w of library) {
    const family = intentFamilyOf(w);
    if (!TARGET_FAMILIES.has(family)) continue;

    const cur = new Set<PhaseTag>(w.phase ?? []);
    const missing = WIDE_PHASES.filter(p => !cur.has(p));
    if (missing.length === 0) continue;

    const oldPhases = [...(w.phase ?? [])];
    const newPhases: PhaseTag[] = ["base", "build", "peak", ...(cur.has("taper") ? ["taper" as PhaseTag] : [])];

    // Bug réel corrigé (audit "génération de plan IA", volet composition) :
    // cette fonction ajoutait aussi le mot "Peak" au champ libre `when` pour
    // "neutraliser" une restriction — mais `ficheAllowedPhases`
    // (phaseNormalization.ts) traite tout `when` contenant "peak" comme un
    // mot-clé FORT et EXCLUSIF : dès qu'il matche, il ignore complètement
    // `phase[]` et ne retient QUE les phases détectées dans `when`. Pour une
    // fiche dont le `when` d'origine ne contenait aucun mot-clé base/build
    // (ex. "Toute l'année"), ce texte injecté produisait `{peak}` seul —
    // l'INVERSE de l'élargissement voulu : 51 fiches d'endurance/technique
    // (tous sports) devenaient indisponibles hors phase Peak. Le seul
    // élargissement fiable est celui de `phase[]` ci-dessus ; ne plus toucher
    // `when` du tout.
    w.phase = newPhases;
    changed.push({ id: w.id, oldPhases, newPhases });
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
