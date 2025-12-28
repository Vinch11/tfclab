// =============================================
// TYPES PLANIFICATEUR PÉRIODISÉ
// Base → Build → Peak → Taper
// =============================================

import { ObjectifType, Athlete } from "./athlete";

// Types de séances A/B/C/D
export type SessionType = "A" | "B" | "C" | "D" | "REST";

// Sport d'entraînement
export type TrainingSport = "cyclisme" | "course" | "natation" | "brick" | "muscu";

// Métrique cible
export type TrainingMetric = "puissance" | "allure" | "cardiaque";

// Phase du macrocycle
export type PhaseName = "Base" | "Build" | "Peak" | "Taper";

// Template de séance
export interface SessionTemplate {
  sport: TrainingSport;
  name: string;
  metric: TrainingMetric;
  zoneKey: string;
  durationMin: [number, number]; // [min, max]
  notes: string;
}

// Cible D+ (dénivelé positif) pour trail
export type DPlusTarget = number | { min: number; max: number };

// Séance planifiée
export interface PlannedSession {
  dayIndex: number;
  dayName: string;
  type: SessionType;
  sport: TrainingSport | "-";
  name: string;
  zone: string;
  zoneTarget: string;
  durationMin: number;
  notes: string;
  phase: PhaseName;
  weekIndex: number;
  totalWeeks: number;
  // Cible D+ pour trail (optionnel)
  dPlusTargetM?: DPlusTarget;
}

// Distribution A/B/C/D
export interface SessionDistribution {
  A: number;
  B: number;
  C: number;
  D: number;
}

// Données d'une semaine
export interface PlanWeek {
  weekIndex: number;
  phase: PhaseName;
  start: string;
  end: string;
  distribution: SessionDistribution;
  sessions: PlannedSession[];
}

// Plan complet (macrocycle)
export interface MacroCycle {
  goal: ObjectifType;
  totalWeeks: number;
  startDate: string;
  createdAt: string;
  weeks: PlanWeek[];
}

// Configuration par objectif
export interface GoalPeriodizationConfig {
  defaultWeeks: number;
  taperWeeks: number;
  peakWeeks: number;
  buildWeeks: number;
  baseWeeks: number;
}

// Phase calculée
export interface PhaseConfig {
  name: PhaseName;
  weeks: number;
}

// Extension Athlete avec plan
export interface AthleteWithPlan extends Athlete {
  plan?: MacroCycle;
}
