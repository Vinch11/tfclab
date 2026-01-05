// Logique du Planner - Reverse Periodization

import { differenceInDays, differenceInWeeks, addDays, format } from 'date-fns';
import { PhaseType, PHASE_CONFIGS, WorkoutLibraryItem, TrainingPlanDay } from '@/types/planner';

/**
 * Calcule la phase actuelle basée sur le nombre de semaines avant la course
 */
export function calculateCurrentPhase(raceDate: Date, currentDate: Date = new Date()): PhaseType {
  const daysUntilRace = differenceInDays(raceDate, currentDate);
  const weeksUntilRace = Math.ceil(daysUntilRace / 7);

  if (daysUntilRace < 0) {
    return 'RACE'; // Course passée
  }

  if (daysUntilRace === 0) {
    return 'RACE';
  }

  if (weeksUntilRace <= 2) {
    return 'PHASE4'; // Affûtage
  }

  if (weeksUntilRace <= 5) {
    return 'PHASE3'; // Spécifique
  }

  if (weeksUntilRace <= 11) {
    return 'PHASE2'; // Force
  }

  if (weeksUntilRace <= 16) {
    return 'PHASE1'; // VO2max
  }

  return 'BASE'; // Pré-saison
}

/**
 * Calcule le nombre de jours jusqu'à la course
 */
export function getDaysUntilRace(raceDate: Date, currentDate: Date = new Date()): number {
  return differenceInDays(raceDate, currentDate);
}

/**
 * Retourne la configuration de phase pour un jour donné
 */
export function getPhaseForDate(raceDate: Date, date: Date): PhaseType {
  return calculateCurrentPhase(raceDate, date);
}

/**
 * Génère un plan d'entraînement automatique
 */
export function generateTrainingPlan(
  startDate: Date,
  raceDate: Date,
  workouts: WorkoutLibraryItem[],
  athleteId: string,
  coachId: string
): Omit<TrainingPlanDay, 'id' | 'created_at' | 'updated_at' | 'workout'>[] {
  const plan: Omit<TrainingPlanDay, 'id' | 'created_at' | 'updated_at' | 'workout'>[] = [];
  const totalDays = differenceInDays(raceDate, startDate);

  if (totalDays <= 0) {
    return [];
  }

  for (let i = 0; i <= totalDays; i++) {
    const currentDate = addDays(startDate, i);
    const phase = getPhaseForDate(raceDate, currentDate);
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday

    // Sélectionner une séance appropriée pour la phase et le jour
    const workout = selectWorkoutForDay(workouts, phase, dayOfWeek, i);

    plan.push({
      athlete_id: athleteId,
      coach_id: coachId,
      date: format(currentDate, 'yyyy-MM-dd'),
      workout_id: workout?.id || null,
      custom_workout_title: workout ? null : (dayOfWeek === 0 ? 'Repos' : null),
      custom_workout_description: null,
      phase,
      status: 'PLANNED',
      adjusted: false,
      adjusted_reason: null,
      notes: null,
    });
  }

  return plan;
}

/**
 * Sélectionne une séance appropriée pour un jour donné
 */
function selectWorkoutForDay(
  workouts: WorkoutLibraryItem[],
  phase: PhaseType,
  dayOfWeek: number,
  dayIndex: number
): WorkoutLibraryItem | null {
  // Repos le dimanche ou tous les 7 jours
  if (dayOfWeek === 0) {
    const recoveryWorkout = workouts.find(
      w => w.phase_tag === phase && w.type === 'RECOVERY' && w.duration_min === 0
    );
    return recoveryWorkout || null;
  }

  // Filtrer les séances par phase
  const phaseWorkouts = workouts.filter(w => w.phase_tag === phase || w.phase_tag === 'BASE');
  
  if (phaseWorkouts.length === 0) {
    return null;
  }

  // Pattern hebdomadaire selon la phase
  const weekDay = dayOfWeek; // 1=Lundi, 2=Mardi, etc.
  
  switch (phase) {
    case 'PHASE1': // VO2max: 2 VO2 + 2 endurance + 2 easy + 1 off
      if (weekDay === 2 || weekDay === 5) {
        return findWorkoutByType(phaseWorkouts, 'VO2') || findWorkoutByType(phaseWorkouts, 'SPEED');
      }
      if (weekDay === 3 || weekDay === 6) {
        return findWorkoutByType(phaseWorkouts, 'ENDURANCE');
      }
      return findWorkoutByType(phaseWorkouts, 'RECOVERY') || findWorkoutByType(phaseWorkouts, 'ENDURANCE');

    case 'PHASE2': // Force: 2 FORCE + 2 endurance + 1 threshold + 1 easy + 1 off
      if (weekDay === 2 || weekDay === 5) {
        return findWorkoutByType(phaseWorkouts, 'FORCE');
      }
      if (weekDay === 4) {
        return findWorkoutByType(phaseWorkouts, 'TEMPO') || findWorkoutByType(phaseWorkouts, 'SPEED');
      }
      if (weekDay === 3 || weekDay === 6) {
        return findWorkoutByType(phaseWorkouts, 'ENDURANCE');
      }
      return findWorkoutByType(phaseWorkouts, 'RECOVERY') || findWorkoutByType(phaseWorkouts, 'ENDURANCE');

    case 'PHASE3': // Spécifique: 2 SPECIFIC + 2 endurance + 1 tempo + 1 easy + 1 off
      if (weekDay === 2 || weekDay === 6) {
        return findWorkoutByType(phaseWorkouts, 'SPECIFIC');
      }
      if (weekDay === 4) {
        return findWorkoutByType(phaseWorkouts, 'TEMPO');
      }
      if (weekDay === 3 || weekDay === 5) {
        return findWorkoutByType(phaseWorkouts, 'ENDURANCE');
      }
      return findWorkoutByType(phaseWorkouts, 'RECOVERY');

    case 'PHASE4': // Taper: beaucoup de récup
      if (weekDay === 2 || weekDay === 5) {
        return findWorkoutByType(phaseWorkouts, 'RECOVERY');
      }
      if (weekDay === 4) {
        return findWorkoutByType(phaseWorkouts, 'RECOVERY');
      }
      return findWorkoutByType(phaseWorkouts, 'RECOVERY');

    default: // BASE
      if (weekDay === 3 || weekDay === 6) {
        return findWorkoutByType(phaseWorkouts, 'ENDURANCE');
      }
      return findWorkoutByType(phaseWorkouts, 'RECOVERY') || findWorkoutByType(phaseWorkouts, 'ENDURANCE');
  }
}

function findWorkoutByType(workouts: WorkoutLibraryItem[], type: string): WorkoutLibraryItem | null {
  const matching = workouts.filter(w => w.type === type);
  if (matching.length === 0) return null;
  // Rotation aléatoire pour varier les séances
  return matching[Math.floor(Math.random() * matching.length)];
}

/**
 * Séance de remplacement Life-First pour stress élevé
 */
export const LIFE_FIRST_REPLACEMENT_WORKOUT = {
  title: 'Endurance Z2 – Récupération active',
  description: 'Niveau de stress élevé détecté. Principe Life-First : on ne construit pas la performance sur un corps stressé. Séance adaptée à 45 minutes en zone 2 facile.',
  duration_min: 45,
  type: 'RECOVERY' as const,
  intensity_tag: 'Z2' as const,
};

/**
 * Vérifie si une séance doit être remplacée selon le score de stress
 */
export function shouldReplaceWorkout(stressScore: number): boolean {
  return stressScore > 7;
}
