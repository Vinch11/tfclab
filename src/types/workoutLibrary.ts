// =============================================
// TYPES BIBLIOTHÈQUE DE SÉANCES ÉLITE
// =============================================

import { ObjectifType } from "./athlete";
import { SessionType, TrainingSport, TrainingMetric } from "./planificateur";

// Partie de structure d'une séance
export interface WorkoutStructurePart {
  part: string; // "Warm-up", "Main", "Cool-down"
  text: string;
  zones: string[];
}

// Variantes par objectif
export type WorkoutVariants = Partial<Record<"ironman" | "half" | "marathon" | "semi" | "trail_short" | "trail_mountain" | "trail_ultra", string>>;

// Niveau de nécessité
export type NecessityLevel = "Obligatoire" | "Recommandé" | "Optionnel";

// Cible D+ (dénivelé positif)
export type DPlusTarget = number | { min: number; max: number };

// Séance de la bibliothèque
export interface LibraryWorkout {
  id: string;
  cat: SessionType;
  sport: TrainingSport;
  objectif: string;
  necessite: NecessityLevel;
  when: string;
  avoid: string;
  durationMin: [number, number];
  metricKey: TrainingMetric;
  sportKey: string;
  structure: WorkoutStructurePart[];
  variants: WorkoutVariants;
  // Cible D+ pour trail (optionnel)
  dPlusTargetM?: DPlusTarget;
}

// Session planifiée étendue avec référence workout
export interface ExtendedPlannedSession {
  dayName: string;
  type: SessionType;
  sport: TrainingSport;
  name: string;
  workoutId: string;
  workoutTitle: string;
  durationMin: number;
  zone: string;
  zoneTarget: string;
  notes: string;
  dPlusTargetM?: DPlusTarget;
}
