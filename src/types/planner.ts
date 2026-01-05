// Types pour le module Planner - Reverse Periodization (Life-First)

export type RaceType = 'ironman' | '70.3' | 'marathon' | 'semi' | 'olympic' | '10k' | 'autre';
export type PhaseType = 'PHASE1' | 'PHASE2' | 'PHASE3' | 'PHASE4' | 'BASE' | 'RACE' | 'OFF';
export type WorkoutType = 'VO2' | 'FORCE' | 'SPECIFIC' | 'RECOVERY' | 'ENDURANCE' | 'SPEED' | 'TEMPO';
export type IntensityTag = 'Z1' | 'Z2' | 'TEMPO' | 'THRESHOLD' | 'VO2' | 'SPEED';
export type SportType = 'bike' | 'run' | 'swim' | 'general';
export type PlanStatus = 'PLANNED' | 'DONE' | 'SKIPPED';

export interface WorkoutLibraryItem {
  id: string;
  sport: SportType;
  type: WorkoutType;
  title: string;
  description: string | null;
  duration_min: number;
  phase_tag: PhaseType;
  intensity_tag: IntensityTag | null;
  created_at: string;
}

export interface AthleteRaceGoal {
  id: string;
  athlete_id: string;
  coach_id: string;
  race_date: string;
  race_type: RaceType;
  race_name: string | null;
  plan_start_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingPlanDay {
  id: string;
  athlete_id: string;
  coach_id: string;
  date: string;
  workout_id: string | null;
  custom_workout_title: string | null;
  custom_workout_description: string | null;
  phase: PhaseType | null;
  status: PlanStatus;
  adjusted: boolean;
  adjusted_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  workout?: WorkoutLibraryItem;
}

export interface DailyCheckin {
  id: string;
  athlete_id: string;
  coach_id: string;
  date: string;
  stress_score: number;
  sleep_quality: number | null;
  energy_level: number | null;
  notes: string | null;
  created_at: string;
}

// Phase configuration
export interface PhaseConfig {
  name: string;
  shortName: string;
  focus: string;
  color: string;
  bgColor: string;
  borderColor: string;
  weeksFromRace: { start: number; end: number };
}

export const PHASE_CONFIGS: Record<PhaseType, PhaseConfig> = {
  PHASE1: {
    name: 'Développement VO2max',
    shortName: 'VO2max',
    focus: 'Intensité haute, volume faible',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/50',
    weeksFromRace: { start: 16, end: 12 },
  },
  PHASE2: {
    name: 'Force & VLamax',
    shortName: 'Force',
    focus: 'Force endurance + baisse VLamax',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/50',
    weeksFromRace: { start: 11, end: 6 },
  },
  PHASE3: {
    name: 'Spécifique',
    shortName: 'Spécifique',
    focus: 'Allure course + volume élevé',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/50',
    weeksFromRace: { start: 5, end: 2 },
  },
  PHASE4: {
    name: 'Affûtage',
    shortName: 'Taper',
    focus: 'Fraîcheur, volume bas',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/50',
    weeksFromRace: { start: 2, end: 0 },
  },
  BASE: {
    name: 'Pré-saison',
    shortName: 'Base',
    focus: 'Construction aérobie',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-500/50',
    weeksFromRace: { start: 99, end: 17 },
  },
  RACE: {
    name: 'Jour de course',
    shortName: 'Race',
    focus: 'Performance maximale',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
    weeksFromRace: { start: 0, end: 0 },
  },
  OFF: {
    name: 'Repos',
    shortName: 'OFF',
    focus: 'Récupération',
    color: 'text-gray-500',
    bgColor: 'bg-gray-800/50',
    borderColor: 'border-gray-700/50',
    weeksFromRace: { start: 0, end: 0 },
  },
};

export const RACE_TYPE_LABELS: Record<RaceType, string> = {
  ironman: 'Ironman',
  '70.3': 'Ironman 70.3',
  marathon: 'Marathon',
  semi: 'Semi-Marathon',
  olympic: 'Triathlon Olympique',
  '10k': '10 km',
  autre: 'Autre',
};
