// =============================================
// TYPES BIBLIOTHÈQUE DE SÉANCES ÉLITE
// =============================================

import { ObjectifType } from "./athlete";

// Types de session (anciennement dans planificateur.ts)
export type SessionType = "A" | "B" | "C" | "D" | "REST" | "Récup" | "SV1" | "LT1" | "TT" | "VO2" | "Sprint" | "Brique" | "Race-Sim";
export type TrainingSport = "swim" | "bike" | "run" | "strength" | "mixed" | "cyclisme" | "course" | "natation" | "brick" | "muscu";
export type TrainingMetric = "power" | "HR" | "pace" | "css" | "puissance" | "allure" | "cardiaque";

// Partie de structure d'une séance
export interface WorkoutStructurePart {
  part: string; // "Warm-up", "Main", "Cool-down"
  text: string;
  zones: string[];
}

// Variantes par objectif
export type WorkoutVariants = Partial<Record<"ironman" | "half" | "marathon" | "semi" | "10k" | "trail_short" | "trail_mountain" | "trail_ultra" | "trail_long", string>>;

// Niveau de nécessité
export type NecessityLevel = "Obligatoire" | "Recommandé" | "Optionnel";

// Cible D+ (dénivelé positif)
export type DPlusTarget = number | { min: number; max: number };

// Goals pour filtrage
export type WorkoutGoal = "ironman" | "half" | "marathon" | "semi" | "10k" | "trail_short" | "trail_mountain" | "trail_ultra" | "trail_long";

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
  // Goals compatibles (nouveau)
  goals?: WorkoutGoal[];
  // Tags pour filtrage avancé
  tags?: string[];
  // Notes additionnelles
  notes?: string;
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
