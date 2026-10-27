import type { TrainingSport } from "@/types/workoutLibrary";
import type { RaceGoal } from "@/hooks/useAITrainingPlan";
import { normalizeObjectiveKey } from "@/lib/normalizeObjectiveKey";
export const getCatalogSportFilter = (objective: string): TrainingSport[] | undefined => {
  const lower = objective.trim().toLowerCase();
  const isTriathlon = ["703", "IM", "Sprint", "Olympic"].includes(normalizeObjectiveKey(objective)) || lower.includes("70.3") || lower === "703" || lower.includes("ironman") || lower === "im" || lower.includes("triathlon");
  // Triathlon: restreindre AUX sports triathlon (jamais de trail dans un plan 70.3/IM).
  if (isTriathlon) return ["swim", "bike", "run", "brick", "strength", "cyclisme", "course", "natation", "renforcement", "mixed"];
  const isTrail = lower.includes("trail") || lower.includes("utmb") || lower.includes("ccc") || lower.includes("occ") || lower.includes("ultra");
  if (isTrail) return ["course", "run", "trail", "strength", "renforcement"];
  return ["course", "run", "strength", "renforcement"];
};

/**
 * Compute id-regex / tag exclusions based on objective + raceFormat.
 * - Triathlon plans jamais de contenu trail (tags + IDs Hedgehog/Urban/Trail).
 * - Format LCW (70.3 3 jours éclatés) : bannir séances signature IM 1-jour
 *   qui masquent le paradigme LCW (brique T2 immédiate, run-fatigued-next-day
 *   sans long-bike race-pace la veille).
 */
/**
 * Patterns d'IDs de séances trail (source de vérité unique).
 * Utilisés partout pour bannir le trail des plans non-trail.
 */
export const TRAIL_ID_PATTERNS: RegExp[] = [
  /^HEDGEHOG_/i,
  /_HEDGEHOG_/i,
  /^URBAN_/i,
  /^TRAIL_/i,
  /_TRAIL_/i,
  /^[A-D]_TR(?:50)?_/i,
  /^EXPE_HORS_VILLE_/i,
  /^V3_TRAIL_/i,
];

/**
 * IDs de fiches "méta" (source de vérité unique) : ces entrées du catalogue
 * décrivent la structure d'une SEMAINE ENTIÈRE (texte "LUNDI : ... MARDI :
 * ... MERCREDI : ...") mais partagent exactement le même schéma qu'une
 * fiche de séance normale (durationMin sur une plage de séance unique,
 * cat "C", sans champ `goals` → traitées comme "universelles" par
 * `scoreWorkout`, workoutCatalogBuilder.ts). Rien ne les empêchait donc
 * d'être sélectionnées et PLANIFIÉES comme la séance d'UN SEUL jour — bug
 * réel constaté (audit "génération de plan IA", plan Emanuela) :
 * "Structure semaine norvégienne course" planifiée un mercredi, avec le
 * texte "Cette séance représente le jeudi soir" affiché tel quel. Bannies
 * pour TOUT objectif : ce sont des fiches de référence/documentation pour
 * le LLM, jamais des séances planifiables sur un jour précis.
 */
export const META_WEEK_TEMPLATE_ID_PATTERNS: RegExp[] = [
  /^NORWEGIAN_WEEK_STRUCTURE_RUN$/i,
  /^KENYAN_WEEK_STRUCTURE_MARATHON$/i,
  /^SEILER_WEEK_POLARIZED_RUN$/i,
  /^SEILER_WEEK_POLARIZED_TRI$/i,
  /^NUTRITION_CARB_PERIODIZATION_WEEK$/i,
];

export const getCatalogExclusions = (
  objective: string,
  raceGoals?: RaceGoal[]
): { excludeIdPatterns: RegExp[]; excludeTags: string[] } => {
  const lower = objective.trim().toLowerCase();
  const isTriathlon = ["703", "IM", "Sprint", "Olympic"].includes(normalizeObjectiveKey(objective)) || lower.includes("70.3") || lower === "703" || lower.includes("ironman") || lower === "im" || lower.includes("triathlon");
  const isHalf = lower.includes("70.3") || lower === "703";
  const isLCW = Array.isArray(raceGoals) && raceGoals.some(g => g?.raceFormat === "lcw_3day");
  const isTrailGoal = lower.includes("trail") || lower.includes("utmb") || lower.includes("ccc") || lower.includes("occ") || (lower.includes("ultra") && !lower.includes("ironman"));
  // CAP route : tout objectif course sur route (semi/marathon/10K/5K/start-to-run)
  // qui n'est ni trail ni triathlon → doit AUSSI bannir le trail.
  const isRoadRunning =
    !isTriathlon &&
    !isTrailGoal &&
    (
      lower.includes("semi") ||
      lower.includes("marathon") ||
      lower.includes("10k") ||
      lower.includes("10 km") ||
      lower.includes("10km") ||
      lower.includes("5k") ||
      lower.includes("5 km") ||
      lower.includes("5km") ||
      lower.includes("start") ||
      lower.includes("débutant") ||
      lower.includes("beginner")
    );

  const excludeIdPatterns: RegExp[] = [...META_WEEK_TEMPLATE_ID_PATTERNS];
  const excludeTags: string[] = [];

  if (isTriathlon || isRoadRunning) {
    // Bannir tout contenu trail dans un plan triathlon OU CAP route.
    excludeTags.push("trail", "trail-urban");
    excludeIdPatterns.push(...TRAIL_ID_PATTERNS);
  }

  if (isLCW) {
    excludeIdPatterns.push(
      /^B_IM_BRICK_LONG_MARATHON_PACE$/i,
      /^B_IM_RUN_MARATHON_SPLIT/i,
      /^B_703_BRICK_RACE_PACE$/i,
    );
  }

  if (isHalf && !isLCW) {
    excludeIdPatterns.push(/^A_IM_RUN_LONG_DURABILITY/i, /^B_IM_RUN_MARATHON_SPLIT/i);
  }

  // Bug réel (audit "génération de plan IA", plan Emanuela, S34 — Bloc 7
  // Spécifique Ironman) : `B_703_BRICK_RACE_PACE` (goals:["half"], signature
  // 70.3 EXCLUSIVE — durée 3-4h, allure/puissance calibrées 70.3, jamais
  // Ironman) apparaissait dans un plan Ironman NON-LCW. Cause : le "goal
  // match" (workoutCatalogBuilder.ts, scoreWorkout) ne pénalise PAS un goal
  // non-matché ("no penalty for unmatched to maximize diversity"), donc
  // cette fiche restait un candidat valide (juste moins bien scoré) pour le
  // backfill structurel "≥1 séance brick" (isTriGoal) — et pouvait remonter
  // une fois les vraies fiches brick Ironman (BR_IM_V*_PRO) déjà consommées
  // dans les chunks précédents (exclusion diversité inter-chunks). Aucune
  // exclusion symétrique n'existait (seul le sens inverse, IM→half deux
  // lignes plus haut, était banni).
  if (isTriathlon && !isHalf && !isLCW) {
    excludeIdPatterns.push(/^B_703_BRICK_RACE_PACE$/i);
  }

  return { excludeIdPatterns, excludeTags };
};


