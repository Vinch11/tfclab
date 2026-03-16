/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL PLAN ENGINE™ — Orchestrateur
 * 
 * Prépare le contexte décisionnel pour l'IA et orchestre la génération.
 * 
 * FLUX :
 * 1. Extraire le contexte décisionnel de la TrainingPrescription
 * 2. Construire le PlanConfig enrichi (limiters, levers, prohibitions)
 * 3. Déléguer la génération à useAITrainingPlan (edge function)
 * 4. Parser le résultat via aiPlanParser
 * 
 * NOTE : La génération IA elle-même reste dans l'edge function.
 * Le Plan Engine prépare les inputs et post-traite les outputs.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  PlanInput,
  PlanOutput,
  PlanInjectedContext,
} from "./types";
import { PLAN_ENGINE_VERSION, PLAN_ENGINE_DISCLAIMER } from "./types";
import type { TrainingPrescription } from "@/engines/decision";
import type { PlanConfig } from "@/hooks/useAITrainingPlan";
import { parseAIPlan } from "@/lib/aiPlanParser";

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTEUR DE CONTEXTE DÉCISIONNEL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extrait le contexte pertinent de la TrainingPrescription
 * pour l'injecter dans le prompt IA
 */
export function extractPlanContext(prescription: TrainingPrescription): PlanInjectedContext {
  const { strategy } = prescription;

  return {
    limiters: strategy._matrixResult
      ? [strategy._matrixResult.limitingFactorLabel]
      : [strategy.primaryAction],
    activeLevers: strategy.levers.map(l => l.label),
    prohibitions: strategy.prohibitions.map(p => p.label),
    trainingFocus: {
      do: strategy.trainingFocus.do,
      avoid: strategy.trainingFocus.avoid,
    },
    weekType: strategy.weekLabel,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTRUCTION DU CONFIG ENRICHI
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Construit un PlanConfig enrichi avec le contexte décisionnel
 * Compatible avec useAITrainingPlan
 */
export function buildEnrichedPlanConfig(input: PlanInput): PlanConfig {
  const context = extractPlanContext(input.prescription);
  const { config } = input;

  return {
    objective: config.objective,
    raceGoals: config.raceGoals,
    planStartDate: config.planStartDate,
    weeksAvailable: config.weeksAvailable,
    weeklyHours: config.weeklyHours,
    sessionsPerWeek: config.sessionsPerWeek,
    maxSessionsPerDay: config.maxSessionsPerDay,
    strengthSessionsPerWeek: config.strengthSessionsPerWeek,
    ambition: input.prescription.meta.diagnosticVersion, // Will be overridden
    constraints: config.constraints,
    
    // Injection décisionnelle
    identifiedLimiters: context.limiters,
    activeLevers: context.activeLevers,
    prohibitions: context.prohibitions,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST-TRAITEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse le markdown brut de l'IA et produit le PlanOutput final
 */
export function buildPlanOutput(
  rawMarkdown: string,
  input: PlanInput,
  chunksUsed: number
): PlanOutput {
  const plan = parseAIPlan(rawMarkdown);
  const context = extractPlanContext(input.prescription);

  return {
    plan,
    rawMarkdown,
    generation: {
      mode: input.config.mode,
      chunksUsed,
      totalWeeks: input.config.weeksAvailable,
      generatedAt: new Date().toISOString(),
    },
    injectedContext: context,
    meta: {
      version: PLAN_ENGINE_VERSION,
      disclaimer: PLAN_ENGINE_DISCLAIMER,
    },
  };
}
