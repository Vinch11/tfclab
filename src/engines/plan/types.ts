/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL PLAN ENGINE™ — Types
 * 
 * PRINCIPE : "Voici comment le planifier"
 * Consomme TrainingPrescription, produit des plans d'entraînement
 * 
 * Fusionne :
 * - useAITrainingPlan (appel edge function)
 * - aiPlanParser (parsing Markdown → sessions)
 * - iaRecommandations (recommandations tactiques)
 * - Templates system (custom_templates)
 * - Périodisation (Issurin/Lorang)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { TrainingPrescription } from "@/engines/decision";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";
import type { PlanAthleteData, PlanConfig, RaceGoal, ChunkProgress } from "@/hooks/useAITrainingPlan";

// Re-export sub-types
export type { ParsedPlan, ParsedWeek, ParsedSession, PlanAthleteData, PlanConfig, RaceGoal, ChunkProgress };

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface PlanInput {
  /** La prescription unifiée (produite par le Decision Engine) */
  prescription: TrainingPrescription;
  
  /** Données athlète pour le prompt IA */
  athleteData: PlanAthleteData;
  
  /** Configuration du plan */
  config: PlanGenerationConfig;
}

export interface PlanGenerationConfig {
  /** Objectif principal */
  objective: string;
  
  /** Objectifs multiples (A/B/C) */
  raceGoals?: RaceGoal[];
  
  /** Date de début du plan */
  planStartDate?: string;
  
  /** Nombre de semaines disponibles */
  weeksAvailable: number;
  
  /** Contraintes horaires */
  weeklyHours?: number;
  sessionsPerWeek?: number;
  maxSessionsPerDay?: number;
  strengthSessionsPerWeek?: number;
  
  /** Contraintes textuelles du coach */
  constraints?: string;
  
  /** Niveau d'ambition (Elite, Competitor, Age Group, Finisher) */
  ambition?: string;
  
  /** Mode de génération */
  mode: "ai" | "template";
  
  /** Template ID si mode template */
  templateId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface PlanOutput {
  /** Plan parsé (semaines + sessions) */
  plan: ParsedPlan;
  
  /** Markdown brut de l'IA */
  rawMarkdown: string;
  
  /** Métadonnées de génération */
  generation: {
    mode: "ai" | "template";
    chunksUsed: number;
    totalWeeks: number;
    generatedAt: string;
  };
  
  /** Contexte décisionnel injecté (pour traçabilité) */
  injectedContext: PlanInjectedContext;
  
  /** Métadonnées */
  meta: {
    version: string;
    disclaimer: string;
  };
}

export interface PlanInjectedContext {
  /** Limiteurs identifiés (du Diagnostic → Decision) */
  limiters: string[];
  
  /** Leviers activés (du Decision Engine) */
  activeLevers: string[];
  
  /** Interdictions (sprint ban, etc.) */
  prohibitions: string[];
  
  /** Focus entraînement (DO / AVOID) */
  trainingFocus: {
    do: string[];
    avoid: string[];
  };
  
  /** Type de semaine recommandé */
  weekType: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const PLAN_ENGINE_VERSION = "1.0.0";
export const PLAN_ENGINE_DISCLAIMER = 
  "Ce plan est généré par IA et constitue une base de travail. " +
  "Le coach valide et ajuste chaque semaine selon la réponse de l'athlète.";
