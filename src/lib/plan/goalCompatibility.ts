/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMPATIBILITÉ OBJECTIF ↔ GOALS (source UNIQUE, catalogue ET réconciliateur)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Audit "B-5K-BEGINNER round 3" (JSON réel 2026-10-14, consigne coach) : un plan
 * "5 KM" a reçu CANOVA_RUN_INTRODUCTIVE_PHASE/CANOVA_RUN_PRERACE_PHASE/
 * A_SEMI_TEMPO_LONG/A_SEMI_PROGRESSIVE_FINISH/B_10K_RACE_PACE_BLOCKS/
 * V2_RUN_NEGATIVE_SPLIT_RACE_SIM/C_RUN_HILL_TECH_PRO/B_RUN_FARTLEK_60_PRO — IDs
 * dont le champ `goals` du catalogue (déjà existant) documente explicitement
 * `["marathon","semi","half","ironman"]` ou équivalent, SANS "5k" ni "10k".
 * Cause racine confirmée (workoutCatalogBuilder.ts::scoreWorkout, commentaire
 * d'origine : "Goal match — no penalty for unmatched to maximize diversity") :
 * un désaccord `goals` ne retire JAMAIS un candidat, seulement un bonus de
 * score non perçu — insuffisant face aux autres bonus (phase, necessite,
 * diversité) sur un catalogue de 130+ fiches. Un hard-ban cross-distance
 * existe déjà dans ce fichier, mais limité aux templates explicitement tagués
 * (`TPL_IM_*`, `template-marathon`, `marathon-pace`, `ironman`) — il ignore le
 * champ `goals` générique porté par la majorité des fiches citées ci-dessus.
 *
 * Correctif : exclusion DURE scopée aux objectifs COURTS (5k/10k/semi)
 * uniquement — jamais marathon/half/ironman/trail, qui gardent tout leur
 * accès existant (même philosophie que le hard-ban template déjà en place :
 * "un objectif marathon garde ses fiches marathon"). Une fiche SANS `goals`
 * (métadonnée absente) n'est JAMAIS exclue — reste accessible comme avant.
 *
 * Module séparé (pas dans workoutCatalogBuilder.ts) : `planReconciler.ts`
 * doit appliquer EXACTEMENT la même règle à `findReplacement` (consigne
 * coach), mais `workoutCatalogBuilder.ts` importe déjà `ficheMainZoneMax`/
 * `intensityFamily` DEPUIS `planReconciler.ts` — un import inverse créerait
 * un cycle. `normalizeGoal` vit donc ici, et `workoutCatalogBuilder.ts` le
 * ré-exporte à l'identique pour ne RIEN changer aux imports externes
 * existants (9 fichiers consomment `normalizeGoal` depuis son chemin actuel).
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { WorkoutGoal } from "@/types/workoutLibrary";

/** Map objective strings to WorkoutGoal values */
export function normalizeGoal(objective: string): WorkoutGoal[] {
  const lower = objective.toLowerCase();
  // Order matters: check specific patterns before generic ones
  if (lower.includes("70.3") || lower === "703") return ["half"];
  if (lower.includes("ironman") || lower === "im") return ["ironman"];
  // Trail variants (most specific first)
  if (lower.includes("trail") && (lower.includes("ultra") || lower.includes(">80") || lower.includes("utmb"))) return ["trail_ultra", "trail_long", "trail_mountain"];
  if (lower.includes("trail") && (lower.includes("mont") || lower.includes("mountain") || lower.includes("60") || lower.includes("80"))) return ["trail_mountain", "trail_long", "trail_short"];
  if (lower.includes("trail") && (lower.includes("court") || lower.includes("short") || lower.includes("<42") || lower.includes("30k") || lower.includes("50k") || lower.includes("20-50"))) return ["trail_short", "trail_mountain"];
  if (lower.includes("trail")) return ["trail_short", "trail_mountain", "trail_long"];
  // Running distances
  if (lower.includes("semi")) return ["semi", "10k"];
  if (lower.includes("marathon")) return ["marathon", "semi"];
  if (lower.includes("10k") || lower.includes("10km") || lower.includes("10 km")) return ["10k", "semi"];
  // 5K — tague désormais sa propre clé dédiée en plus de "10k" (repli structurel
  // le plus proche). Avant ce fix : `return ["10k"]` seul, donc AUCUNE fiche du
  // catalogue ne pouvait jamais documenter de variant/goal "5k" spécifique — un
  // plan 5K ne bénéficiait jamais du bonus "objectif documenté" et héritait
  // silencieusement d'un texte calibré 10K (allure, volumes) même quand une
  // fiche dédiée 5K existait (ex: EnrichedWorkoutsShortFormats).
  if (lower.includes("5k") || lower.includes("5km") || lower.includes("5 km")) return ["5k", "10k"];
  // Start to run / débutant → catalogue dédié UNIQUEMENT (plus de repli sur 10k :
  // les fiches 10k supposent un athlète capable de courir 30-45min en continu).
  if (lower.includes("start") || lower.includes("débutant") || lower.includes("beginner")) return ["start_to_run"];
  // Triathlon courts (Sprint/Olympique) — taguent désormais leur propre clé
  // dédiée ("sprint"/"olympic") EN PLUS de "half" (70.3, gardé comme repli
  // structurel pour conserver l'accès au pool existant). Avant ce fix :
  // `return ["half"]` seul — aucune fiche ne pouvait jamais documenter de
  // variant/goal "sprint" ou "olympic" spécifique (même limite que 5K
  // ci-dessus), alors que ces deux formats ont des calibrages de durée/
  // intensité propres (Sprint ~55min-1h20, Olympique ~2h-2h30) distincts du
  // 70.3. Même repli "half" que buildFewShotExamples (systemPrompt.ts, edge
  // function) pour la même raison structurelle — inchangé.
  if (lower.includes("sprint")) return ["sprint", "half"];
  if (lower.includes("olymp")) return ["olympic", "half"];
  // Triathlon generic
  if (lower.includes("triathlon") || lower.includes("tri")) return ["ironman", "half"];
  return [];
}

/**
 * Objectifs COURTS uniquement — portée volontairement restreinte (cf.
 * docstring de fichier). `goals[0]` est toujours le goal PRIMAIRE renvoyé par
 * `normalizeGoal` (ex. "5k" pour "5 KM", "marathon" pour "Marathon") ; les
 * goals suivants sont des replis structurels d'adjacence (ex. "10k" pour un
 * plan "5 KM"), jamais le signal déterminant ici.
 */
const SHORT_DISTANCE_PRIMARY_GOALS: ReadonlySet<WorkoutGoal> = new Set(["5k", "10k", "semi"]);

/**
 * True si `workoutGoals` (métadonnée `goals` d'une fiche catalogue) documente
 * EXCLUSIVEMENT des objectifs incompatibles avec `planGoals` (objectif réel du
 * plan en cours), et que cet objectif est COURT (5k/10k/semi).
 *
 * Ne s'applique JAMAIS :
 *  - si `workoutGoals` est absent/vide (fiche générique, non documentée —
 *    reste accessible comme avant, consigne coach explicite) ;
 *  - si l'objectif du plan n'est PAS 5k/10k/semi (marathon/half/ironman/trail
 *    gardent l'intégralité de leur accès actuel, aucune régression possible
 *    sur ces objectifs par construction).
 */
export function isGoalIncompatibleWithObjective(
  workoutGoals: readonly WorkoutGoal[] | undefined,
  planGoals: readonly WorkoutGoal[],
): boolean {
  if (!workoutGoals || workoutGoals.length === 0) return false;
  const primaryGoal = planGoals[0];
  if (!primaryGoal || !SHORT_DISTANCE_PRIMARY_GOALS.has(primaryGoal)) return false;
  return !workoutGoals.some((g) => planGoals.includes(g));
}
