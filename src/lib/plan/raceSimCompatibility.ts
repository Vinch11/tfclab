/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPATIBILITÉ OBJECTIF / SIMULATION DE COURSE (Mission 2D, palier 1)
 *
 * Consigne coach : hard-ban DÉTERMINISTE, nominatif, scopé aux seules
 * incompatibilités démontrées par simulation sur le catalogue réel (cf.
 * MISSION2D_VALIDATION_FINALE.md, §1-2) — jamais une règle générale sur
 * `goals`/texte libre, jamais une pénalité de score (palier 2, non autorisé
 * à ce stade). Partagé entre `workoutCatalogBuilder.ts::scoreWorkout`
 * (catalogue injecté à Gemini) et `planReconciler.ts::findReplacement`
 * (substitutions post-génération) pour ne jamais maintenir deux listes
 * divergentes — exactement le même principe que `ficheUnconfirmedContextReason`
 * (PR #377/#378) pour l'axe B.
 *
 * Les 5 fiches ci-dessous simulent une distance de compétition ENTIÈRE
 * (pas une référence d'allure isolée, pas un intervalle) : `goals`/`variants`
 * strictement réduits à une seule distance, confirmés fiche par fiche
 * (texte de structure, pas seulement tag/ID) — cf. rapport §1.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Exclues pour un objectif 5K : simulent 10K/semi/marathon, aucune n'est 5K. */
const RACE_SIM_EXCLUDED_FOR_5K = new Set([
  "V3_RUN_10K_RACE_SIM",
  "ENR_RACE_SIM_MARATHON",
  "V3_RACESIM_MARATHON",
  "ENR_RACE_SIM_SEMI",
  "V3_RACESIM_SEMI",
]);

/**
 * Exclues pour un objectif 10K : simulent semi/marathon — jamais
 * `V3_RUN_10K_RACE_SIM`, native pour cet objectif (goals=["10k"]).
 */
const RACE_SIM_EXCLUDED_FOR_10K = new Set([
  "ENR_RACE_SIM_MARATHON",
  "V3_RACESIM_MARATHON",
  "ENR_RACE_SIM_SEMI",
  "V3_RACESIM_SEMI",
]);

/**
 * `primaryDistance` doit être la distance la PLUS SPÉCIFIQUE de l'objectif
 * courant (ex. `normalizeGoal(objective)[0]` dans workoutCatalogBuilder.ts,
 * ou `objectiveKey` dans planReconciler.ts) — jamais un tableau `WorkoutGoal[]`
 * testé avec `.includes()`. `normalizeGoal`/`normalizeObjectiveKey` ajoutent
 * des repères structurels de secours (ex. objectif "marathon" →
 * goals=["marathon","semi"]) qui contamineraient un `.includes("semi")` et
 * exclurait à tort une fiche semi-RACE_SIM pour un objectif marathon — cas
 * qui ne relève que d'une pénalité (palier 2), jamais d'une exclusion
 * (cf. rapport §2-3). Accepte indifféremment la casse `WorkoutGoal`
 * ("5k"/"10k") ou `normalizeObjectiveKey` ("5K"/"10K").
 */
export function isRaceSimIncompatibleWithObjective(
  ficheId: string | null | undefined,
  primaryDistance: string | null | undefined,
): boolean {
  const id = String(ficheId || "").toUpperCase();
  const distance = String(primaryDistance || "").toLowerCase();
  if (distance === "5k") return RACE_SIM_EXCLUDED_FOR_5K.has(id);
  if (distance === "10k") return RACE_SIM_EXCLUDED_FOR_10K.has(id);
  return false;
}
