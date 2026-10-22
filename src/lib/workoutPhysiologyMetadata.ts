import type {
  LibraryWorkout,
  WorkoutPhysiology,
  WorkoutPrerequisites,
} from "@/types/workoutLibrary";

export interface AuditedWorkoutMetadata {
  physiology: WorkoutPhysiology;
  prerequisites?: WorkoutPrerequisites;
}

const p = (
  primary: WorkoutPhysiology["primary"],
  rationale: string,
  secondary?: WorkoutPhysiology["secondary"],
): WorkoutPhysiology => ({ primary, secondary, rationale });

/**
 * Métadonnées relues manuellement à partir du contenu réel des fiches.
 *
 * Cette liste est volontairement limitée aux anomalies démontrées par l'audit
 * 2026-10. Une fiche non auditée conserve le classifieur historique en repli :
 * aucune migration automatique des 920 fiches à partir de leur texte.
 */
export const AUDITED_WORKOUT_METADATA: Readonly<Record<string, AuditedWorkoutMetadata>> = {
  B_BIKE_VO2_3MIN: {
    physiology: p("vo2max", "Répétitions de 3 min à puissance aérobie maximale."),
  },
  B_RUN_VO2_5X3_PRO: {
    physiology: p("vo2max", "Cinq répétitions longues courues au domaine VO₂max."),
  },
  BILLAT_RUN_VO2MAX_LONG_5MIN: {
    physiology: p("vo2max", "Intervalles longs à 100-105 % VMA avec récupération active."),
  },
  BILLAT_RUN_FARTLEK_VO2: {
    physiology: p("vo2max", "Fartlek construit autour de vVO₂max ; la récupération est secondaire."),
  },
  SEILER_BIKE_4X8MIN: {
    physiology: p("vo2max", "Quatre intervalles longs visant un stimulus central VO₂max."),
  },
  SEILER_BIKE_Z1_LONG: {
    physiology: p("moderate_lt1", "Sortie longue continue sous LT1."),
  },
  LYDIARD_RUN_AEROBIC_BASE_MEDIUM: {
    physiology: p("moderate_lt1", "Course continue de volume en domaine aérobie modéré."),
  },
  NORWEGIAN_RUN_THRESHOLD_HIGH_PM: {
    physiology: p("mlss", "Répétitions au seuil haut contrôlées par lactate/FC."),
  },
  NORWEGIAN_RUN_DOUBLE_THRESHOLD_DAY: {
    physiology: p(
      "mlss",
      "Deux blocs sous-seuil/seuil dans la même journée.",
      ["moderate_lt1"],
    ),
    prerequisites: {
      minimumTrainingLevel: "highly_trained",
      minimumWeeklyHours: 8,
      requireVerifiedProfile: true,
    },
  },
  C_STR_MAX_LOWER_HEAVY: {
    physiology: p("max_strength", "Quatre répétitions lourdes à 85-90 % 1RM."),
  },
  TPL_MAR_RENFO_LOURD: {
    physiology: p("strength_endurance", "Séries de 8-10 répétitions sans charge maximale documentée."),
  },
  D_RUN_RECOVERY_30_PRO: {
    physiology: p("recovery", "Footing court et facile prescrit après une charge."),
  },
  CANOVA_TRI_BRICK_SPECIFIC: {
    physiology: p(
      "mixed_specific",
      "Enchaînement vélo-course à allures spécifiques avec transition.",
      ["race_specific"],
    ),
  },
  ...Object.fromEntries(
    Array.from({ length: 10 }, (_, index) => [
      `D_RECOVERY_VAR_${index + 1}_PRO`,
      { physiology: p("recovery", "Variante explicitement conçue pour la récupération.") },
    ]),
  ),
};

export function auditedWorkoutMetadataFor(
  workoutId: string | null | undefined,
): AuditedWorkoutMetadata | undefined {
  return workoutId ? AUDITED_WORKOUT_METADATA[String(workoutId).toUpperCase()] : undefined;
}

export function enrichWorkoutPhysiology(workouts: LibraryWorkout[]): void {
  for (const workout of workouts) {
    const audited = auditedWorkoutMetadataFor(workout.id);
    if (!audited) continue;
    workout.physiology = audited.physiology;
    if (audited.prerequisites) workout.prerequisites = audited.prerequisites;
  }
}

