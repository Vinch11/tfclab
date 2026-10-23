import type { WorkoutPrerequisites } from "@/types/workoutLibrary";

/**
 * Prérequis de sécurité relus à partir du contenu réel du premier lot de
 * l'audit 2026-10. Cette table est volontairement nominative : elle ne tente
 * ni d'inférer la dangerosité depuis un titre, ni de migrer les fiches non
 * relues.
 *
 * Deux politiques seulement :
 * - blocage automatique absolu quand TFCLab ne possède pas les données
 *   nécessaires pour vérifier le protocole (hypoxie et exposition chaleur) ;
 * - profil fiable + revue coach nominative pour les tests maximaux, doubles
 *   journées, sprints, charges lourdes et protocoles très intensifs. Le coach
 *   atteste alors les prérequis spécifiques décrits dans la fiche ; son accord
 *   ne remplace jamais une preuve de profil demandée.
 */
export const AUDITED_WORKOUT_SAFETY_PREREQUISITES: Readonly<Record<string, WorkoutPrerequisites>> = {
  // Aucun champ athlète/environnement ne confirme la sécurité hypoxique,
  // cardiaque, thermique ou hydrique : jamais de sélection automatique.
  TPL_SWIM_HYPOXIE: { blockAutomaticSelection: true },
  A_HEAT_ACCLIM_RUN: { blockAutomaticSelection: true },
  C_HEAT_ACCLIM_BIKE_INDOOR: { blockAutomaticSelection: true },

  // Familiarisation lourde/explosive ou charge excentrique spécifique.
  D_PAP_PRE_RACE: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
  CONTRAST_RUN_FORCE_SPEED: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
  C_STR_RE_ECONOMY_BLAGROVE: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
  C_STR_CYCLIST_PEDAL_POWER: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
  C_STR_LOWER_PRO: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
  URBAN_EXCENTRIQUE_DESCENTE_SALLE: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },

  // Sprint maximal / all-out / test maximal.
  V2_RUN_SPRINT_PLAT: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
  B_BIKE_SPRINT_NEUROMUSCULAR: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
  V2_BIKE_SPRINT_NEUROMUSCULAR: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
  B_BIKE_CP_W_PRIME_TEST: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
  B_SWIM_SPRINT_25S: {
    minimumTrainingLevel: "trained",
    requireVerifiedProfile: true,
    requireExplicitCoachApproval: true,
  },

  // Doubles journées / blocs de charge nécessitant une validation du volume,
  // de la récupération et de l'historique propres au sport.
  KENYAN_RUN_DOUBLE_DAY: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
  EXPE_HORS_VILLE_BACK_TO_BACK: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
  KENYAN_WEEK_STRUCTURE_MARATHON: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },

  // Protocoles très intensifs ou lactate-guided du lot relu.
  BILLAT_RUN_LACTATE_TOLERANCE: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
  ENR_RUN_NORWEGIAN_4X8: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
  ENR_RUN_NORWEGIAN_5X6: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
  ENR_RUN_LACTATE_CLEARANCE: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
  B_RUN_LACTATE_SHUTTLE: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
  NORWEGIAN_RUN_LACTATE_TEST_PROTOCOL: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
  ENR_BIKE_LACTATE_SHUTTLE: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
  ENR_BIKE_NORWEGIAN_5X5: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
  SEILER_BIKE_4X4MIN: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
  V2_BIKE_TABATA: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
  V3_BIKE_VO2_TABATA: {
    minimumTrainingLevel: "trained",
    requireVerifiedProfile: true,
    requireExplicitCoachApproval: true,
  },
  BILLAT_SWIM_30_30: { requireVerifiedProfile: true, requireExplicitCoachApproval: true },
};

export function auditedSafetyPrerequisitesFor(
  workoutId: string | null | undefined,
): WorkoutPrerequisites | undefined {
  return workoutId
    ? AUDITED_WORKOUT_SAFETY_PREREQUISITES[String(workoutId).toUpperCase()]
    : undefined;
}
