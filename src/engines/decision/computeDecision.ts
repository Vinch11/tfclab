/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL DECISION ENGINE™ — Orchestrateur
 * 
 * Point d'entrée unique : computeDecision(input) → TrainingPrescription
 * 
 * Appelle les sous-modules dans l'ordre :
 * 1. Strategy (Lorang + Decision Matrix)
 * 2. Workout Guidance (Advisory + Recommendations)
 * 3. Roadmap (Strategic Roadmap)
 * 4. Simulation (si demandée)
 * 5. Nutrition (si applicable)
 * 6. Executive Summary (synthèse)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  DecisionInput,
  TrainingPrescription,
  StrategyPrescription,
  WorkoutGuidance,
  ExecutiveSummary,
} from "./types";
import { DECISION_ENGINE_VERSION, DECISION_ENGINE_DISCLAIMER } from "./types";
import type { AthleteDiagnostic } from "@/engines/diagnostic";

// Sub-engines (unchanged — they remain the computation core)
import { computeLorangStrategy, type LorangStrategyResult, type LorangStrategyInput } from "@/lib/v2/lorangStrategyEngine";
import { computeTFCLDecisionMatrix, type TFCLDecisionResult, type TFCLDecisionInput, type DataWithSource } from "@/lib/v2/tfclDecisionMatrix";
import { computeWorkoutRecommendations, type RecommendationContext } from "@/lib/workoutRecommendationEngine";
import { generateWorkoutAdvisories, type AdvisoryContext } from "@/lib/workoutAdvisoryEngine";
import { computeStrategicRoadmap, type StrategicRoadmap } from "@/lib/v2/strategicRoadmap";
import { getVo2maxTarget } from "@/lib/v2/unifiedLimiterDetection";

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATEUR PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function computeDecision(input: DecisionInput): TrainingPrescription {
  const { diagnostic, context, symptoms, load } = input;

  // ── 1. Strategy ───────────────────────────────────────────────────────────
  const strategy = computeStrategyFromDiagnostic(diagnostic, input);

  // ── 2. Workout Guidance ───────────────────────────────────────────────────
  const workoutGuidance = computeWorkoutGuidanceFromDiagnostic(diagnostic);

  // ── 3. Roadmap ────────────────────────────────────────────────────────────
  const roadmap = generateRoadmapFromDiagnostic(diagnostic);

  // ── 4. Simulation (placeholder — activé si raceSimulationInput fourni) ──
  const raceSimulation = null; // NON IMPLÉMENTÉ — à connecter ultérieurement

  // ── 5. Nutrition (placeholder — activé selon le contexte) ─────────────
  const nutrition = null; // NON IMPLÉMENTÉ — à connecter ultérieurement

  // ── 6. Executive Summary ──────────────────────────────────────────────────
  const executiveSummary = buildExecutiveSummary(diagnostic, strategy, workoutGuidance);

  return {
    strategy,
    workoutGuidance,
    roadmap,
    raceSimulation,
    nutrition,
    executiveSummary,
    meta: {
      timestamp: new Date().toISOString(),
      version: DECISION_ENGINE_VERSION,
      diagnosticVersion: diagnostic.meta.version,
      disclaimer: DECISION_ENGINE_DISCLAIMER,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGY (Lorang + Decision Matrix → StrategyPrescription)
// ═══════════════════════════════════════════════════════════════════════════════

function computeStrategyFromDiagnostic(
  diag: AthleteDiagnostic,
  input: DecisionInput
): StrategyPrescription {
  const raw = diag._rawInput;
  
  // Bridge diagnostic → LorangStrategyInput (uses raw data for full fidelity)
  const lorangInput: LorangStrategyInput = {
    physiology: {
      vo2max: raw.vo2max,
      vo2maxTarget: getVo2maxTarget(diag.objectif, diag.ambition, raw.age),
      ftpKg: raw.ftpKg,
      ftpKgTarget: diag.targets.current.ftp_kg_min,
      vlamax: diag.effectifs.vlamax.value,
      vlamaxTarget: diag.targets.vlamaxRange.optimal,
      tte: diag.effectifs.tte.tte_min,
      tteTarget: diag.targets.current.tte_min,
      fatmax: raw.fatmax,
      fatmaxTarget: diag.limiter.gapAnalysis?.find(g => g.metric === "FatMax")?.target ?? 60,
      economy: raw.runEconomyScore,
    },
    athlete: {
      age: raw.age,
      discipline: mapObjectifToLorangDiscipline(diag.objectif),
      ambition: diag.ambition as "finisher" | "age_group" | "competitor" | "elite",
      hasGIIssues: raw.giIssuesFlag,
    },
    availability: {
      score: diag.readiness.availability.score,
      level: mapAvailabilityScoreToLevel(diag.readiness.availability.score),
      hasAlerts: diag.synthesis.alerts.some(a => a.severity === "critical"),
      hrvOutOfRange2Days: input.hrvOutOfRange2Days ?? false,
    },
    symptoms: input.symptoms,
    context: {
      daysToRace: input.context.daysToRace,
      isRaceWeek: input.context.isRaceWeek,
      currentPhase: input.context.currentPhase,
    },
    load: input.load,
    // ✅ Passer le résultat du moteur unifié de limiteurs pour cohérence
    unifiedLimiterResult: diag.limiter ? {
      primaryLimiter: diag.limiter.primaryLimiter,
      gapAnalysis: diag.limiter.gapAnalysis ?? [],
      aerobicWeaknessDetail: diag.limiter.aerobicWeaknessDetail,
    } : undefined,
  };

  let lorangResult: LorangStrategyResult | null = null;
  try {
    lorangResult = computeLorangStrategy(lorangInput);
  } catch {
    // Fallback si le moteur Lorang échoue
  }

  // Bridge diagnostic → TFCLDecisionMatrix (uses raw data for full fidelity)
  let matrixResult: TFCLDecisionResult | null = null;
  const matrixInput: TFCLDecisionInput = {
    vo2max: wrapDataSource(raw.vo2max),
    vlamax: wrapDataSource(diag.effectifs.vlamax.value),
    tte: wrapDataSource(diag.effectifs.tte.tte_min),
    ftpKg: wrapDataSource(raw.ftpKg),
    fatMaxPctVO2: wrapDataSource(raw.fatmax),
    fatOxidationMax: wrapDataSource(null),
    crossoverPctVO2: wrapDataSource(null),
    freshnessScore: wrapDataSource(100 - diag.effectifs.fatigue.score),
    tss7d: wrapDataSource(input.load?.tss7d ?? null),
    tss28d: wrapDataSource(input.load?.tss28d ?? null),
    subjectiveFatigue: wrapDataSource(null),
    confidenceScore: diag.meta.confidenceGlobal * 100,
    discipline: diag.sportFocus === "run" ? "cap" : diag.sportFocus === "tri" ? "tri" : "velo",
    objective: diag.objectif as any,
    ambition: diag.ambition,
    age: raw.age,
  };
  try {
    matrixResult = computeTFCLDecisionMatrix(matrixInput);
  } catch {
    // Fallback
  }

  // Merge results into unified StrategyPrescription
  return {
    primaryAction: lorangResult?.summary.mainAction ?? matrixResult?.diagnosisShort ?? diag.synthesis.headline,
    whyThis: lorangResult?.summary.whyThis ?? matrixResult?.diagnosisFull ?? "",
    whyNotOthers: lorangResult?.summary.whyNotOthers ?? "",
    levers: lorangResult?.activatedLevers ?? [],
    prohibitions: lorangResult?.prohibitions ?? [],
    hasSprintBan: lorangResult?.hasSprintBan ?? false,
    trainingFocus: matrixResult?.focus ?? { do: [], avoid: [], blockDuration: "4-6 semaines" },
    weekType: lorangResult?.templateSuggestion.weekType ?? "mixed",
    weekLabel: lorangResult?.templateSuggestion.weekLabel ?? "Semaine standard",
    confidence: lorangResult?.confidence ?? "moderate",
    isRobust: matrixResult?.isRobust ?? false,
    _lorangResult: lorangResult,
    _matrixResult: matrixResult,
    _lorangInput: lorangInput,
    _matrixInput: matrixInput,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKOUT GUIDANCE
// ═══════════════════════════════════════════════════════════════════════════════

function computeWorkoutGuidanceFromDiagnostic(diag: AthleteDiagnostic): WorkoutGuidance {
  // Bridge to WorkoutRecommendationEngine
  const recContext: RecommendationContext = {
    vlamaxEffectif: diag.effectifs.vlamax,
    tteEffectif: diag.effectifs.tte,
    fatigueEffectif: diag.effectifs.fatigue,
    runInjuryRisk: diag.injuryRisk.run ?? {
      score: 0,
      level: "FAIBLE" as const,
      levelLabel: "Faible",
      levelColor: "success" as const,
      confidence: 0.5,
      drivers: [],
      why: "",
      guardrails: [],
      coachOptions: [],
      inputsUsed: { fatiguePct: null, vlamaxValue: null, tteValue: null, loadValue: null, age: null, objectif: diag.objectif },
      disclaimer: "",
    },
    objectif: diag.objectif,
    sportFocus: diag.sportFocus,
  };

  let recOutput;
  try {
    recOutput = computeWorkoutRecommendations(recContext);
  } catch {
    recOutput = { recommendations: [], activeRules: [], diagnosticSummary: "", confidenceGlobal: 0, disclaimer: "" };
  }

  // Bridge to WorkoutAdvisoryEngine
  const advisoryContext: AdvisoryContext = {
    fatigueIndex: diag.effectifs.fatigue.score,
    vlamaxEffectif: diag.effectifs.vlamax,
    tteEffectif: diag.effectifs.tte,
    objectif: diag.objectif,
    sport: diag.sportFocus,
  };

  let advisoryOutput;
  try {
    advisoryOutput = generateWorkoutAdvisories([], advisoryContext);
  } catch {
    advisoryOutput = { advisories: [], summary: { recommended_count: 0, caution_count: 0, discouraged_count: 0 }, context_summary: "" };
  }

  return {
    recommendations: recOutput.recommendations,
    advisories: advisoryOutput.advisories,
    recommendedCount: recOutput.recommendations.filter(r => r.recommendation_type === "RECOMMENDED").length,
    cautionCount: advisoryOutput.summary.caution_count,
    discouragedCount: recOutput.recommendations.filter(r => r.recommendation_type === "DISCOURAGED").length,
    contextSummary: recOutput.diagnosticSummary || advisoryOutput.context_summary,
    guardMessage: advisoryOutput.guard_message ?? null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROADMAP
// ═══════════════════════════════════════════════════════════════════════════════

function generateRoadmapFromDiagnostic(diag: AthleteDiagnostic): StrategicRoadmap | null {
  try {
    return computeStrategicRoadmap({
      objectif: diag.objectif,
      limiterResult: diag.limiter,
    });
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTIVE SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

function buildExecutiveSummary(
  diag: AthleteDiagnostic,
  strategy: StrategyPrescription,
  workoutGuidance: WorkoutGuidance
): ExecutiveSummary {
  const keyPoints: string[] = [];

  // Point 1: Limiteur
  if (diag.limiter.primaryLimiter !== "none") {
    keyPoints.push(`Limiteur : ${diag.limiter.limiterLabel}`);
  } else {
    keyPoints.push("Profil équilibré — pas de limiteur majeur");
  }

  // Point 2: Action prioritaire
  if (strategy.primaryAction) {
    keyPoints.push(`Priorité : ${strategy.primaryAction}`);
  }

  // Point 3: Alerte si nécessaire
  const criticalAlert = diag.synthesis.alerts.find(a => a.severity === "critical");
  if (criticalAlert) {
    keyPoints.push(`⚠️ ${criticalAlert.message}`);
  } else if (workoutGuidance.discouragedCount > 0) {
    keyPoints.push(`${workoutGuidance.discouragedCount} séance(s) déconseillée(s) selon le profil actuel`);
  }

  return {
    headline: diag.synthesis.headline,
    keyPoints: keyPoints.slice(0, 3),
    athleteMessage: strategy._lorangResult?.athleteMessage 
      ?? `Focus actuel : ${strategy.weekLabel}. ${keyPoints[0] ?? ""}`,
    staffMessage: `${diag.synthesis.headline}. ` +
      `Confiance: ${strategy.confidence}. ` +
      `${workoutGuidance.recommendedCount} séances recommandées, ${workoutGuidance.discouragedCount} déconseillées.`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function wrapDataSource<T>(value: T): DataWithSource<T> {
  return { value, source: "calcul" };
}

function mapObjectifToLorangDiscipline(objectif: string): "IM" | "703" | "marathon" | "semi" | "10k" | "cycling" | "trail" {
  const map: Record<string, "IM" | "703" | "marathon" | "semi" | "10k" | "cycling" | "trail"> = {
    IM: "IM",
    Ironman: "IM",
    "703": "703",
    "70.3": "703",
    Half: "703",
    Marathon: "marathon",
    Semi: "semi",
    "10km": "10k",
    "10k": "10k",
    Cycling: "cycling",
    Granfondo: "cycling",
    Trail: "trail",
    Ultra: "trail",
  };
  return map[objectif] || "703";
}

function mapAvailabilityScoreToLevel(score: number): "high" | "moderate" | "low" | "critical" {
  if (score >= 75) return "high";
  if (score >= 50) return "moderate";
  if (score >= 25) return "low";
  return "critical";
}
