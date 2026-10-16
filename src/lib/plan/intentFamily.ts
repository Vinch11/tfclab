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
  // Ordre : le plus spécifique en tête (test, race_pace avant seuil/vo2).
  // "brick" est volontairement en AVANT-DERNIÈRE position (juste avant le
  // fallback endurance_fondamentale) : la quasi-totalité des fiches de sport
  // "brick" contiennent littéralement "brick"/"BR_" dans leur id, donc placer
  // ce motif en tête (comme avant ce fix) les fait TOUTES matcher "brick" en
  // premier, avant même d'avoir la chance d'être classées par leur intention
  // réelle (race-pace, seuil, technique...). Résultat mesuré : les 32 fiches
  // brick de la bibliothèque tombaient dans UN SEUL groupe (sport×famille),
  // limitant le socle de couverture à 4 places pour TOUTE la diversité brick
  // (repos actif, race-pace, transition, race-sim...), quel que soit le
  // nombre réel d'intentions différentes présentes. En dernière priorité,
  // "brick" ne capture plus que les fiches génériques sans signal de zone/
  // intention plus spécifique (repris comme fallback légitime).
  { family: "test",                  rx: /\btest\b|assessment|\beval\b|_tt\b|time[-_\s]?trial|\bTT\b/i },
  { family: "race_pace",             rx: /race[-_\s]?pace|race[-_\s]?sim|allure\s*(marathon|semi|10k|ironman|half|course|specifique)|sp[eé]cifique\s*(marathon|semi|10k|70\.3|IM)|repetition\s*generale|dress[-_\s]?rehearsal/i },
  { family: "fatmax",                rx: /fatmax|fat[-_\s]?max|train[-_\s]?low|fasted|jeun/i },
  { family: "sprint",                rx: /\bsprint\b|neuromuscul|pmax|_PMAX_|strides?|acceleration/i },
  { family: "vo2",                   rx: /\bvo2(?:max)?\b|\bvma\b|30[-_\s]?30|15[-_\s]?15|hill[-_\s]?repeat|c[oô]tes\s*courtes|intervalles?\s*courts/i },
  { family: "seuil",                 rx: /\bseuil\b|threshold|sv2|sweet[-_\s]?spot|\btempo\b|norwegian|over[-_\s]?under|MLSS|CSS/i },
  { family: "force",                 rx: /\bforce\b|strength|renfo|nordic|isometric|pap_|swim[-_\s]?cord|\bppg\b|\bcore\b|gainage|hypertroph/i },
  { family: "technique",             rx: /technique|\bdrill\b|[eé]ducatif|gammes|proprio|mobilit|educatifs/i },
  { family: "recuperation",          rx: /\brecup\b|r[eé]cup|recovery|repos\s*actif|active[-_\s]?recovery/i },
  { family: "brick",                 rx: /\bbrick\b|_BR_|^BR_|enchainement/i },
  { family: "endurance_fondamentale",rx: /endurance\s*(?:fondament|foncier|longue|base|a[eé]robie)|sortie\s*longue|\bSL\b|long[-_\s]?(?:run|ride|swim)|volume\s*a[eé]robie|steady\s*long|z2[-_\s]?(?:long|volume|continu|easy)|nage\s*continue|continuous/i },
];

/** Cache pour éviter la re-classification à chaque appel. */
const CACHE = new WeakMap<LibraryWorkout, IntentFamily>();

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
const EASY_ONLY_FAMILIES = new Set<IntentFamily>(["technique", "endurance_fondamentale"]);

export interface IntentEvidenceClassification {
  family: IntentFamily;
  source: "pattern" | "zone_fallback" | "unclassified";
}

/**
 * Classifie une preuve textuelle déjà matérialisée (séance finale, métadonnée
 * de réparation, etc.) avec les mêmes règles que le catalogue. Le résultat
 * distingue un motif explicite du simple fallback de zone : les contrôles de
 * traçabilité peuvent ainsi refuser de présenter une déduction faible comme
 * une intention vérifiée.
 */
export function classifyIntentEvidence(text: string, mainZoneMax = 0): IntentEvidenceClassification {
  for (const { family, rx } of FAMILY_PATTERNS) {
    if (EASY_ONLY_FAMILIES.has(family) && mainZoneMax >= 4) continue;
    if (rx.test(text)) return { family, source: "pattern" };
  }
  if (mainZoneMax > 0 && mainZoneMax <= 2) {
    return { family: "endurance_fondamentale", source: "zone_fallback" };
  }
  return { family: "other", source: "unclassified" };
}

/** Renvoie la famille d'intention d'une fiche (déterministe, avec cache). */
export function intentFamilyOf(w: LibraryWorkout): IntentFamily {
  const cached = CACHE.get(w);
  if (cached) return cached;

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

  const structureText = (w.structure || [])
    .map(p => `${p.part} ${p.text} ${(p.zones || []).join(" ")}`)
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
