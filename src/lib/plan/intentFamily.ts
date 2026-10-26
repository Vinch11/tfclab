import { classifyIntentEvidence } from "../../../supabase/functions/_shared/intentEvidence";
export { classifyIntentEvidence, type IntentEvidenceClassification } from "../../../supabase/functions/_shared/intentEvidence";
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

import type { LibraryWorkout, PhysiologicalIntent } from "@/types/workoutLibrary";

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

/** Cache pour éviter la re-classification à chaque appel. */
const CACHE = new WeakMap<LibraryWorkout, IntentFamily>();

const STRUCTURED_INTENT_FAMILY: Readonly<Record<PhysiologicalIntent, IntentFamily>> = {
  moderate_lt1: "endurance_fondamentale",
  recovery: "recuperation",
  mlss: "seuil",
  vo2max: "vo2",
  neuromuscular: "sprint",
  max_strength: "force",
  strength_endurance: "force",
  technique_economy: "technique",
  mobility_prevention: "technique",
  mixed_specific: "brick",
  race_specific: "race_pace",
  fatmax: "fatmax",
  test: "test",
};

/** Zone max du bloc "Main" structuré d'une fiche (0 si aucune zone détectée). */
function mainZoneMaxOf(w: LibraryWorkout): number {
  let mx = 0;
  for (const p of (w.structure || [])) {
    if (!/main/i.test(p.part || "")) continue;
    for (const z of (p.zones || [])) {
      const m = String(z).match(/z\s*([1-7])/i);
      if (m) mx = Math.max(mx, Number(m[1]));
    }
  }
  return mx;
}

/**
 * Familles dont `phaseWidener.ts` se sert pour élargir l'éligibilité de
 * phase d'une fiche jusqu'à "base" — toutes deux impliquent, par
 * définition, un contenu facile/modéré. Un bloc "Main" réellement dur
 * (Z4+) ne doit jamais y tomber, quel que soit le texte de warm-up/
 * cool-down.
 */
/** Renvoie la famille d'intention d'une fiche (déterministe, avec cache). */
export function intentFamilyOf(w: LibraryWorkout): IntentFamily {
  const cached = CACHE.get(w);
  if (cached) return cached;

  // Les métadonnées relues décrivent le contenu réel et priment toujours sur
  // les mots secondaires présents dans les récupérations, références ou notes.
  if (w.physiology?.primary) {
    const structured = STRUCTURED_INTENT_FAMILY[w.physiology.primary];
    CACHE.set(w, structured);
    return structured;
  }

  // Non-cardio titles describe the exercise purpose; "tempo 3-1-1" in a
  // strength protocol is repetition timing, not a metabolic threshold.
  if (["strength", "renforcement"].includes(String(w.sport).toLowerCase())) {
    const header = classifyIntentEvidence(w.objectif ?? "").family;
    if (["force", "technique", "recuperation"].includes(header)) {
      CACHE.set(w, header); return header;
    }
  }

  // Audit réel (B-5K-BEGINNER, 15/10) : `B_RUN_FARTLEK_60_PRO` — Main
  // 10×(1' Z4a / 2' Z2), un vrai travail d'intervalles — était classée
  // "technique" sur la seule foi du mot "mobilité" présent dans son
  // retour au calme, avant même que son contenu réel ne soit examiné.
  // `phaseWidener.ts` élargissait alors sa phase jusqu'à "base", la
  // rendant disponible dès la semaine 1 pour un débutant. Le contenu réel
  // du bloc Main (zone max) prime donc sur le texte de warm-up/cool-down
  // pour ces deux familles seulement — les autres familles (seuil, vo2,
  // sprint, etc.) restent inchangées, un Main dur y étant déjà attendu.
  const mainZoneMax = mainZoneMaxOf(w);
  const headerIntent = classifyIntentEvidence(w.objectif ?? "", mainZoneMax);
  if (mainZoneMax > 0 && mainZoneMax <= 2 && headerIntent.family === "recuperation") {
    CACHE.set(w, "recuperation"); return "recuperation";
  }

  const structureText = (w.structure || [])
    .map(p => `${p.part} ${p.text} ${(p.zones || []).join(" ")}`
      .replace(/\btest\s*:\s*capable de (?:chanter|parler)[^.!?]*/gi, "contrôle conversationnel")
      .replace(/\btest de (?:conversation|parole)|\btalk[- ]test\b/gi, "contrôle conversationnel"))
    .join(" ");
  const tagsText = (w.tags || []).join(" ");
  const text = `${w.id} ${w.cat} ${w.objectif} ${tagsText} ${structureText} ${w.when || ""}`;

  const family = classifyIntentEvidence(text, mainZoneMax).family;
  CACHE.set(w, family);
  return family;
}

/** Renvoie true si les deux fiches partagent la même famille d'intention. */
export function sameIntentFamily(a: LibraryWorkout, b: LibraryWorkout): boolean {
  return intentFamilyOf(a) === intentFamilyOf(b);
}
