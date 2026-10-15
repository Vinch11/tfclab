/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPATIBILITÉ NIVEAU D'ENTRAÎNEMENT / PRÉREQUIS DE FICHE (Mission Axe C)
 *
 * Consigne coach : hard-ban DÉTERMINISTE, nominatif, scopé aux seules
 * incompatibilités démontrées par relecture du CONTENU RÉEL (texte `avoid`/
 * `when`, pas le nom de la méthode ou de son créateur) — cf.
 * MISSION_AXE_C_VALIDATION.md §1. Même principe que
 * `raceSimCompatibility.ts` : une fonction pure, partagée entre
 * `workoutCatalogBuilder.ts::scoreWorkout`/`SourceLibrary` (catalogue
 * injecté à Gemini) et `planReconciler.ts::findReplacement` (substitutions
 * post-génération), pour ne jamais maintenir deux listes divergentes.
 *
 * 8 fiches (sur les 10 initialement confirmées) reçoivent ce garde-fou — 2
 * en sont explicitement exclues (`BILLAT_RUN_30_30_PRO`, `BILLAT_RUN_3MIN_3MIN`)
 * car leur SEUL critère de niveau indépendant est un seuil de VMA
 * (respectivement "VMA > 16 km/h" et "VMA > 17 km/h recommandé" /
 * "VMA < 15 km/h"), jamais transmis à ce pipeline (`athlete.vma` existe
 * dans le modèle de données mais n'est lu ni par `buildWorkoutCatalog` ni
 * par `findReplacement`). Transformer un `trainingLevel` grossier
 * (untrained/light/trained/highly_trained) en preuve d'une VMA insuffisante
 * serait une estimation, pas une vérification — consigne coach explicite :
 * "ne transforme pas automatiquement un niveau général faible en preuve
 * d'une VMA insuffisante" / "si la VMA est le seul critère déterminant et
 * qu'elle n'est pas disponible, n'applique aucun hard-ban fondé sur une
 * estimation." Ces 2 fiches restent donc disponibles sans aucune exclusion
 * dans cette implémentation, à tous les niveaux.
 *
 * Pour les 8 fiches retenues, le hard-ban ne s'appuie QUE sur un critère
 * indépendant de VMA/VLamax, explicitement documenté et vérifiable avec le
 * signal déjà disponible (`trainingLevel`/`trainingLevelSource`) :
 *  - Seuil de semaines/mois d'entraînement régulier (ex. "Moins de 4
 *    semaines d'entraînement régulier") : CANOVA_RUN_INTRODUCTIVE_PHASE,
 *    CANOVA_RUN_FAST_CONTINUOUS_INTRO, BILLAT_RUN_30_30_INTRO,
 *    NORWEGIAN_WEEK_STRUCTURE_RUN, KENYAN_WEEK_STRUCTURE_MARATHON,
 *    COGGAN_BIKE_CP_OVER_UNDER (leur VLamax éventuel n'est jamais utilisé
 *    ici — seul le seuil de semaines l'est).
 *  - Qualificatif univoque "débutant(s)"/"expérimenté(s)"/"avancé(s)" dans
 *    `avoid`/`when` (jamais une déduction du nom) : COGGAN_BIKE_CP_DEPLETION,
 *    V3_BIKE_VO2_TABATA.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Signal de niveau tel que reçu par buildWorkoutCatalog/runReconciler. */
export interface BeginnerIntensitySignal {
  trainingLevel: string;
  trainingLevelSource: string;
}

/**
 * 8 fiches dont l'incompatibilité avec un niveau non confirmé ("untrained"/
 * "light") repose sur un critère indépendant de VMA/VLamax, explicitement
 * documenté dans leur contenu réel — cf. MISSION_AXE_C_VALIDATION.md §1.
 */
const LEVEL_PREREQUISITE_FICHE_IDS = new Set([
  "CANOVA_RUN_INTRODUCTIVE_PHASE",
  "CANOVA_RUN_FAST_CONTINUOUS_INTRO",
  "BILLAT_RUN_30_30_INTRO",
  "NORWEGIAN_WEEK_STRUCTURE_RUN",
  "KENYAN_WEEK_STRUCTURE_MARATHON",
  "COGGAN_BIKE_CP_OVER_UNDER",
  "COGGAN_BIKE_CP_DEPLETION",
  "V3_BIKE_VO2_TABATA",
]);

/**
 * Mêmes valeurs que `RELIABLE_LEVEL_SOURCES`/`BEGINNER_LEVELS` déjà en
 * production (`workoutCatalogBuilder.ts::beginner_intensity_filter`,
 * `planReconciler.ts::DEMANDING_ACCUMULATION_RELIABLE_SOURCES/_LEVELS`,
 * PR #376) — patron déjà validé par le coach, redéclaré ici en constantes
 * propres à ce module pour ne dépendre d'aucun autre axe (jamais un import
 * croisé qui romprait l'indépendance des 3 mécanismes).
 */
const RELIABLE_LEVEL_SOURCES = new Set(["manual", "auto-tss"]);
const BEGINNER_LEVELS = new Set(["untrained", "light"]);

/**
 * `true` seulement si TOUTES ces conditions sont réunies :
 *  - `ficheId` fait partie des 8 fiches à prérequis de niveau confirmé ;
 *  - un signal de niveau est fourni (jamais par défaut si absent) ;
 *  - sa source est fiable (`manual`/`auto-tss` — jamais `fallback-prudent`,
 *    jamais une source inconnue) ;
 *  - le niveau indique un profil non confirmé (`untrained`/`light`).
 * L'absence d'information n'est jamais traitée comme une preuve
 * d'incompatibilité — même principe que `ficheUnconfirmedContextReason`
 * et `isRaceSimIncompatibleWithObjective`.
 */
export function isLevelPrerequisiteIncompatible(
  ficheId: string | null | undefined,
  signal: BeginnerIntensitySignal | null | undefined,
): boolean {
  if (!signal) return false;
  if (!RELIABLE_LEVEL_SOURCES.has(signal.trainingLevelSource)) return false;
  if (!BEGINNER_LEVELS.has(signal.trainingLevel)) return false;
  const id = String(ficheId || "").toUpperCase();
  return LEVEL_PREREQUISITE_FICHE_IDS.has(id);
}
