/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * INTENT FAMILY — classifieur d'intention réutilisable
 * ═══════════════════════════════════════════════════════════════════════════════
 * Source unique pour :
 *   - Coverage-first cap (buildWorkoutCatalog) : garantir un socle par
 *     (sport × famille) avant le remplissage top-scored.
 *   - Neighbor remap (planReconciler) : mapper un catalogId hors catalogue
 *     injecté vers un voisin de MÊME sport ET MÊME famille d'intention.
 *
 * Familles :
 *   endurance_fondamentale · seuil · vo2 · sprint · technique · force
 *   · recuperation · test · race_pace · brick · fatmax · other
 *
 * Règle : match par ORDRE (le premier match gagne — le plus spécifique en tête).
 * Match sur : id + cat + objectif + tags + zones structure + when.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LibraryWorkout } from "@/types/workoutLibrary";

export type IntentFamily =
  | "endurance_fondamentale"
  | "seuil"
  | "vo2"
  | "sprint"
  | "technique"
  | "force"
  | "recuperation"
  | "test"
  | "race_pace"
  | "brick"
  | "fatmax"
  | "other";

const FAMILY_PATTERNS: Array<{ family: IntentFamily; rx: RegExp }> = [
  // Ordre : le plus spécifique en tête (test, brick, race_pace avant seuil/vo2).
  { family: "test",                  rx: /\btest\b|assessment|\beval\b|_tt\b|time[-_\s]?trial|\bTT\b/i },
  { family: "brick",                 rx: /\bbrick\b|_BR_|^BR_|enchainement/i },
  { family: "race_pace",             rx: /race[-_\s]?pace|race[-_\s]?sim|allure\s*(marathon|semi|10k|ironman|half|course|specifique)|sp[eé]cifique\s*(marathon|semi|10k|70\.3|IM)|repetition\s*generale|dress[-_\s]?rehearsal/i },
  { family: "fatmax",                rx: /fatmax|fat[-_\s]?max|train[-_\s]?low|fasted|jeun/i },
  { family: "sprint",                rx: /\bsprint\b|neuromuscul|pmax|_PMAX_|strides?|acceleration/i },
  { family: "vo2",                   rx: /\bvo2\b|\bvma\b|30[-_\s]?30|15[-_\s]?15|hill[-_\s]?repeat|c[oô]tes\s*courtes|intervalles?\s*courts/i },
  { family: "seuil",                 rx: /\bseuil\b|threshold|sv2|sweet[-_\s]?spot|\btempo\b|norwegian|over[-_\s]?under|MLSS|CSS/i },
  { family: "force",                 rx: /\bforce\b|strength|renfo|nordic|isometric|pap_|swim[-_\s]?cord|\bppg\b|\bcore\b|gainage|hypertroph/i },
  { family: "technique",             rx: /technique|\bdrill\b|[eé]ducatif|gammes|proprio|mobilit|educatifs/i },
  { family: "recuperation",          rx: /\brecup\b|r[eé]cup|recovery|repos\s*actif|active[-_\s]?recovery/i },
  { family: "endurance_fondamentale",rx: /endurance\s*(?:fondament|foncier|longue|base|a[eé]robie)|sortie\s*longue|\bSL\b|long[-_\s]?(?:run|ride|swim)|volume\s*a[eé]robie|steady\s*long|z2[-_\s]?(?:long|volume|continu|easy)|nage\s*continue|continuous/i },
];

/** Cache pour éviter la re-classification à chaque appel. */
const CACHE = new WeakMap<LibraryWorkout, IntentFamily>();

/** Renvoie la famille d'intention d'une fiche (déterministe, avec cache). */
export function intentFamilyOf(w: LibraryWorkout): IntentFamily {
  const cached = CACHE.get(w);
  if (cached) return cached;

  const structureText = (w.structure || [])
    .map(p => `${p.part} ${p.text} ${(p.zones || []).join(" ")}`)
    .join(" ");
  const tagsText = (w.tags || []).join(" ");
  const text = `${w.id} ${w.cat} ${w.objectif} ${tagsText} ${structureText} ${w.when || ""}`;

  for (const { family, rx } of FAMILY_PATTERNS) {
    if (rx.test(text)) {
      CACHE.set(w, family);
      return family;
    }
  }

  // Fallback : si zones dominées par Z1/Z2 → endurance fondamentale.
  const zMax = (() => {
    let mx = 0;
    for (const p of (w.structure || [])) {
      if (!/main/i.test(p.part || "")) continue;
      for (const z of (p.zones || [])) {
        const m = String(z).match(/z\s*([1-7])/i);
        if (m) mx = Math.max(mx, Number(m[1]));
      }
    }
    return mx;
  })();
  const family: IntentFamily = zMax > 0 && zMax <= 2 ? "endurance_fondamentale" : "other";
  CACHE.set(w, family);
  return family;
}

/** Renvoie true si les deux fiches partagent la même famille d'intention. */
export function sameIntentFamily(a: LibraryWorkout, b: LibraryWorkout): boolean {
  return intentFamilyOf(a) === intentFamilyOf(b);
}
