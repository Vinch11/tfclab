/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL DECISION ENGINE™ — Types
 * 
 * PRINCIPE : "Voici ce qu'il faut faire"
 * Consomme AthleteDiagnostic, produit TrainingPrescription
 * 
 * Fusionne :
 * - Lorang Strategy Engine (leviers opérationnels)
 * - TFCL Decision Matrix (facteur limitant → levier)
 * - Workout Advisory (recommandations séances)
 * - Strategic Roadmap (phases de périodisation)
 * - Race Simulation (scénarios de course)
 * - Nutrition Unified (plan nutritionnel)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { AthleteDiagnostic } from "@/engines/diagnostic";
import type { LorangStrategyResult, LorangLeverActivation, LorangProhibitionRule } from "@/lib/v2/lorangStrategyEngine";
import type { TFCLDecisionResult, TFCLTrainingFocus } from "@/lib/v2/tfclDecisionMatrix";
import type { WorkoutAdvisory, AdvisoryEngineOutput, AdvisoryStatus } from "@/lib/workoutAdvisoryEngine";
import type { WorkoutRecommendation, RecommendationEngineOutput } from "@/lib/workoutRecommendationEngine";
import type { StrategicRoadmap, RoadmapPhase } from "@/lib/v2/strategicRoadmap";
import type { RaceSimulationResult } from "@/lib/v2/raceSimulation";
import type { NutritionUnifiedResult } from "@/lib/v2/nutritionUnified";

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface DecisionInput {
  /** Le diagnostic unifié (produit par le Diagnostic Engine) */
  diagnostic: AthleteDiagnostic;
  
  /** Contexte temporel */
  context: {
    daysToRace: number | null;
    isRaceWeek: boolean;
    currentPhase: "base" | "build" | "peak" | "taper" | "recovery";
  };
  
  /** Symptômes terrain (optionnel, enrichit la décision) */
  symptoms?: {
    earlyBurn: boolean;
    lateExplosion: boolean;
    heavyLegs: boolean;
    digestiveIssues: boolean;
    lowCeiling: boolean;
    hrDrift: boolean;
    noExplosivity: boolean;
  };
  
  /** Charge récente (optionnel) */
  load?: {
    tss7d: number | null;
    tss28d: number | null;
  };
  
  /** HRV hors plage 2 jours ? */
  hrvOutOfRange2Days?: boolean;
  
  /** Simulation de course (optionnel) */
  raceSimulationInput?: {
    raceType: string;
    heat: "low" | "moderate" | "high";
    terrain: "flat" | "hilly";
    plannedCarbsGH: number | null;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT — La prescription d'entraînement unifiée
// ═══════════════════════════════════════════════════════════════════════════════

export interface TrainingPrescription {
  // ─── 1. Stratégie (ex-Lorang + Decision Matrix) ───────────
  strategy: StrategyPrescription;
  
  // ─── 2. Séances recommandées (ex-Workout Advisory) ────────
  workoutGuidance: WorkoutGuidance;
  
  // ─── 3. Roadmap (phases de périodisation) ──────────────────
  roadmap: StrategicRoadmap | null;
  
  // ─── 4. Simulation course (si demandée) ───────────────────
  raceSimulation: RaceSimulationResult | null;
  
  // ─── 5. Nutrition (si applicable) ─────────────────────────
  nutrition: NutritionUnifiedResult | null;
  
  // ─── 6. Synthèse exécutive ────────────────────────────────
  executiveSummary: ExecutiveSummary;
  
  // ─── Métadonnées ──────────────────────────────────────────
  meta: {
    timestamp: string;
    version: string;
    diagnosticVersion: string;
    disclaimer: string;
  };
}

// ─── Sous-types ─────────────────────────────────────────────────────────────

export interface StrategyPrescription {
  /** Le facteur limitant → quoi travailler */
  primaryAction: string;
  whyThis: string;
  whyNotOthers: string;
  
  /** Leviers activés (max 3, du plus prioritaire au moins) */
  levers: LorangLeverActivation[];
  
  /** Interdictions (sprint ban, etc.) */
  prohibitions: LorangProhibitionRule[];
  hasSprintBan: boolean;
  
  /** Focus entraînement : DO / AVOID */
  trainingFocus: TFCLTrainingFocus;
  
  /** Suggestion de type de semaine */
  weekType: "force" | "endurance" | "vo2" | "recovery" | "mixed";
  weekLabel: string;
  
  /** Confiance */
  confidence: "high" | "moderate" | "low";
  isRobust: boolean;
  
  /** Détails complets (résultats sous-moteurs, pour le mode Staff) */
  _lorangResult: LorangStrategyResult | null;
  _matrixResult: TFCLDecisionResult | null;
  
  /** Inputs originaux (pour les sous-composants legacy) */
  _lorangInput: LorangStrategyInput | null;
  _matrixInput: TFCLDecisionInput | null;
}

export interface WorkoutGuidance {
  /** Séances recommandées / déconseillées */
  recommendations: WorkoutRecommendation[];
  advisories: WorkoutAdvisory[];
  
  /** Résumé rapide */
  recommendedCount: number;
  cautionCount: number;
  discouragedCount: number;
  contextSummary: string;
  
  /** Message de garde-fou */
  guardMessage: string | null;
}

export interface ExecutiveSummary {
  /** Headline en une phrase */
  headline: string;
  
  /** 3 points clés max */
  keyPoints: string[];
  
  /** Message athlète (simplifié) */
  athleteMessage: string;
  
  /** Message staff (complet) */
  staffMessage: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const DECISION_ENGINE_VERSION = "1.0.0";
export const DECISION_ENGINE_DISCLAIMER = 
  "Ces prescriptions sont des aides à la décision. " +
  "La décision coach prime toujours sur l'algorithme.";
