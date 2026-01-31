/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ANALYSE POST-RACE TFCL™ — Module d'Analyse Après Course
 * 
 * Compare pacing prévu vs pacing réel pour:
 * - Détecter le limiteur
 * - Mettre à jour les indices TFCL
 * - Fournir un verdict coach actionnable
 * 
 * "La performance n'est pas un hasard, elle est la conséquence directe 
 * d'une décision tenue ou non."
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { SimulationScenarioType, PacingCurvePoint } from "./raceSimulationTFCL";
import type { ReadinessState } from "./raceReadinessRunning";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — POST-RACE DATA
// ═══════════════════════════════════════════════════════════════════════════════

export interface PostRaceDataPoint {
  distance_pct: number;
  pace_sec_km: number;
  heart_rate?: number;
  cadence?: number;
  power?: number;
  elevation?: number;
}

export interface PostRaceImport {
  athlete_id: string;
  race_date: string;
  race_distance: string;
  
  // Résultat
  finish_time_seconds: number;
  
  // Données de course (depuis FIT ou saisie manuelle)
  splits: PostRaceDataPoint[];
  
  // Flags détectés
  hr_drift_detected: boolean;
  hr_drift_pct: number | null;
  pace_drift_detected: boolean;
  pace_drift_pct: number | null;
  collapse_point_pct: number | null;  // Point d'effondrement si présent
  
  // Données physiologiques utilisées pour la simulation
  threshold_pace_sec_km: number;
  
  // Source
  source: "FIT_FILE" | "GARMIN_CONNECT" | "MANUAL_ENTRY" | "NOLIO";
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — ANALYSE RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

export type LimiterType = 
  | "GLYCOGEN_DEPLETION"      // Effondrement glycogénique
  | "GLYCOLYTIC_OVERLOAD"     // Surcharge glycolytique (VLamax trop stimulée)
  | "CENTRAL_FATIGUE"         // Fatigue centrale
  | "PACING_ERROR"            // Erreur de pacing (départ trop rapide)
  | "INADEQUATE_DURABILITY"   // Durabilité insuffisante
  | "MECHANICAL_ISSUE"        // Problème mécanique (crampes, etc.)
  | "THERMAL_STRESS"          // Stress thermique
  | "NONE_DETECTED";          // Pas de limiteur identifié

export interface DisciplineScore {
  score: number;              // 0-100
  label: string;
  details: {
    first_third_compliance: number;
    middle_third_compliance: number;
    last_third_compliance: number;
    zone_violations: number;
    early_red_entries: number;
  };
}

export interface PhysiologicalExecution {
  hr_control: number;          // 0-100
  pace_stability: number;      // 0-100
  glycogen_management: number; // 0-100 (estimé)
  fade_index: number;          // % de ralentissement derniers 25%
}

export interface RaceOutcome {
  discipline_score: DisciplineScore;
  physiological_execution: PhysiologicalExecution;
  limiting_factor_detected: LimiterType;
  limiting_factor_explanation: string;
  scenario_executed: SimulationScenarioType | "BEYOND_ENVELOPE";
  scenario_planned: SimulationScenarioType | null;
}

export interface TFCLIndicesUpdate {
  race_readiness_adjustment: number;     // -20 to +20
  vlamax_confidence_adjustment: number;  // -0.2 to +0.2
  durability_adjustment: number;         // -10 to +10 minutes
  pacing_discipline_score: number;       // 0-100 (nouveau score)
  
  rationale: string[];
}

export interface CoachVerdict {
  what_worked: string[];
  what_cost: string[];
  priority_lever: string;
  lever_rationale: string;
  
  // Lien Limiter → Levier → Décision
  decision_flow: {
    limiter: string;
    lever: string;
    decision: string;
  };
}

export interface PostRaceAnalysisResult {
  // Données de base
  race_date: string;
  race_distance: string;
  finish_time_formatted: string;
  
  // Comparaison pacing
  pacing_comparison: {
    planned_curve: PacingCurvePoint[];
    actual_curve: PacingCurvePoint[];
    deviation_points: Array<{
      distance_pct: number;
      planned_intensity: number;
      actual_intensity: number;
      deviation: number;
      zone_planned: "GREEN" | "ORANGE" | "RED";
      zone_actual: "GREEN" | "ORANGE" | "RED";
    }>;
  };
  
  // Outcome
  outcome: RaceOutcome;
  
  // Mises à jour indices
  indices_update: TFCLIndicesUpdate;
  
  // Verdict coach
  coach_verdict: CoachVerdict;
  
  // Métadonnées
  analysis_confidence: number;
  
  // Textes officiels
  tfcl_statement: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const LIMITER_DEFINITIONS: Record<LimiterType, {
  label: string;
  emoji: string;
  explanation: string;
  lever_recommendation: string;
}> = {
  GLYCOGEN_DEPLETION: {
    label: "Effondrement Glycogénique",
    emoji: "🔋",
    explanation: "Réserves de glycogène épuisées prématurément — allure non soutenable sur la durée.",
    lever_recommendation: "Travail endurance longue + stratégie nutritionnelle",
  },
  GLYCOLYTIC_OVERLOAD: {
    label: "Surcharge Glycolytique",
    emoji: "⚡",
    explanation: "VLamax trop sollicitée en début de course — accumulation de lactate excessive.",
    lever_recommendation: "Réduction VLamax (Z2 longue) + discipline pacing premier tiers",
  },
  CENTRAL_FATIGUE: {
    label: "Fatigue Centrale",
    emoji: "🧠",
    explanation: "Système nerveux central saturé — perte de coordination et d'efficacité.",
    lever_recommendation: "Travail durabilité + gestion stress pré-course",
  },
  PACING_ERROR: {
    label: "Erreur de Pacing",
    emoji: "📉",
    explanation: "Départ trop rapide — coût métabolique irréversible avant la mi-course.",
    lever_recommendation: "Travail mental + briefing strict + simulation",
  },
  INADEQUATE_DURABILITY: {
    label: "Durabilité Insuffisante",
    emoji: "⏱️",
    explanation: "Incapacité à maintenir l'allure sur la durée malgré un pacing correct.",
    lever_recommendation: "Augmenter volume Z2 + sorties longues progressives",
  },
  MECHANICAL_ISSUE: {
    label: "Problème Mécanique",
    emoji: "🦵",
    explanation: "Crampes ou blessure musculaire — souvent lié à un déficit électrolytique ou préparation.",
    lever_recommendation: "Stratégie nutrition/hydratation + travail force spécifique",
  },
  THERMAL_STRESS: {
    label: "Stress Thermique",
    emoji: "🌡️",
    explanation: "Surchauffe corporelle — adaptation thermique insuffisante pour les conditions.",
    lever_recommendation: "Acclimatation chaleur + stratégie cooling",
  },
  NONE_DETECTED: {
    label: "Aucun Limiteur",
    emoji: "✅",
    explanation: "Exécution conforme au plan — performance optimale atteinte.",
    lever_recommendation: "Maintenir le programme actuel + légère progression",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) {
    return `${h}h${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function paceToIntensity(pace: number, threshold: number): number {
  // Intensité = (threshold / pace) * 100
  return (threshold / pace) * 100;
}

function getZoneFromIntensity(intensity: number, greenMax: number, orangeMax: number): "GREEN" | "ORANGE" | "RED" {
  if (intensity <= greenMax) return "GREEN";
  if (intensity <= orangeMax) return "ORANGE";
  return "RED";
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE — ANALYSE POST-RACE
// ═══════════════════════════════════════════════════════════════════════════════

export function analyzePostRace(
  postRaceData: PostRaceImport,
  plannedScenario: SimulationScenarioType | null,
  plannedCurve: PacingCurvePoint[],
  greenMax: number = 92,
  orangeMax: number = 95
): PostRaceAnalysisResult {
  const { splits, threshold_pace_sec_km, race_date, race_distance, finish_time_seconds } = postRaceData;

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Convertir les splits réels en courbe d'intensité
  // ─────────────────────────────────────────────────────────────────────────────
  const actualCurve: PacingCurvePoint[] = splits.map(split => {
    const intensity = paceToIntensity(split.pace_sec_km, threshold_pace_sec_km);
    return {
      distance_pct: split.distance_pct,
      intensity_pct: Math.round(intensity * 10) / 10,
      pace_sec_km: split.pace_sec_km,
      zone: getZoneFromIntensity(intensity, greenMax, orangeMax),
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Calculer les déviations
  // ─────────────────────────────────────────────────────────────────────────────
  const deviationPoints = actualCurve.map(actual => {
    const planned = plannedCurve.find(p => p.distance_pct === actual.distance_pct);
    const plannedIntensity = planned?.intensity_pct ?? actual.intensity_pct;
    const plannedZone = planned?.zone ?? "GREEN";
    
    return {
      distance_pct: actual.distance_pct,
      planned_intensity: plannedIntensity,
      actual_intensity: actual.intensity_pct,
      deviation: actual.intensity_pct - plannedIntensity,
      zone_planned: plannedZone,
      zone_actual: actual.zone,
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Calculer le score de discipline
  // ─────────────────────────────────────────────────────────────────────────────
  const firstThirdPoints = deviationPoints.filter(d => d.distance_pct <= 33);
  const middleThirdPoints = deviationPoints.filter(d => d.distance_pct > 33 && d.distance_pct <= 66);
  const lastThirdPoints = deviationPoints.filter(d => d.distance_pct > 66);
  
  const firstThirdCompliance = 100 - Math.min(100, firstThirdPoints.reduce((sum, p) => 
    sum + Math.max(0, p.deviation) * 3, 0));
  const middleThirdCompliance = 100 - Math.min(100, middleThirdPoints.reduce((sum, p) => 
    sum + Math.abs(p.deviation) * 2, 0));
  const lastThirdCompliance = 100 - Math.min(100, lastThirdPoints.reduce((sum, p) => 
    sum + Math.max(0, -p.deviation) * 1.5, 0));
  
  const zoneViolations = deviationPoints.filter(d => 
    d.zone_actual !== d.zone_planned && d.zone_actual === "RED").length;
  const earlyRedEntries = deviationPoints.filter(d => 
    d.distance_pct <= 50 && d.zone_actual === "RED").length;
  
  const disciplineScore: DisciplineScore = {
    score: clamp(Math.round(
      firstThirdCompliance * 0.4 + 
      middleThirdCompliance * 0.35 + 
      lastThirdCompliance * 0.25 - 
      zoneViolations * 5 - 
      earlyRedEntries * 10
    ), 0, 100),
    label: firstThirdCompliance >= 85 ? "Discipliné" : 
           firstThirdCompliance >= 60 ? "Partiellement discipliné" : "Indiscipliné",
    details: {
      first_third_compliance: Math.round(firstThirdCompliance),
      middle_third_compliance: Math.round(middleThirdCompliance),
      last_third_compliance: Math.round(lastThirdCompliance),
      zone_violations: zoneViolations,
      early_red_entries: earlyRedEntries,
    },
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Analyser l'exécution physiologique
  // ─────────────────────────────────────────────────────────────────────────────
  const hrControl = postRaceData.hr_drift_detected 
    ? clamp(100 - (postRaceData.hr_drift_pct ?? 0) * 3, 0, 100)
    : 85; // Par défaut si pas de données
    
  const paceStability = postRaceData.pace_drift_detected
    ? clamp(100 - (postRaceData.pace_drift_pct ?? 0) * 2, 0, 100)
    : 80;
  
  // Fade index = ralentissement dans les derniers 25%
  const last25Pct = actualCurve.filter(p => p.distance_pct >= 75);
  const first75Pct = actualCurve.filter(p => p.distance_pct < 75);
  const avgLast = last25Pct.reduce((s, p) => s + (p.pace_sec_km ?? 0), 0) / (last25Pct.length || 1);
  const avgFirst = first75Pct.reduce((s, p) => s + (p.pace_sec_km ?? 0), 0) / (first75Pct.length || 1);
  const fadeIndex = avgFirst > 0 ? Math.round(((avgLast - avgFirst) / avgFirst) * 100) : 0;
  
  const glycogenManagement = postRaceData.collapse_point_pct !== null
    ? clamp(postRaceData.collapse_point_pct, 0, 100)
    : clamp(100 - fadeIndex * 2, 40, 100);

  const physiologicalExecution: PhysiologicalExecution = {
    hr_control: Math.round(hrControl),
    pace_stability: Math.round(paceStability),
    glycogen_management: Math.round(glycogenManagement),
    fade_index: fadeIndex,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: Détecter le limiteur
  // ─────────────────────────────────────────────────────────────────────────────
  let limiter: LimiterType = "NONE_DETECTED";
  
  // Règles de détection (ordre de priorité)
  if (earlyRedEntries >= 2 && fadeIndex > 15) {
    limiter = "PACING_ERROR";
  } else if (postRaceData.collapse_point_pct !== null && postRaceData.collapse_point_pct < 85) {
    limiter = "GLYCOGEN_DEPLETION";
  } else if (fadeIndex > 20 && disciplineScore.score >= 70) {
    limiter = "INADEQUATE_DURABILITY";
  } else if (postRaceData.hr_drift_pct !== null && postRaceData.hr_drift_pct > 15) {
    limiter = "CENTRAL_FATIGUE";
  } else if (earlyRedEntries >= 1) {
    limiter = "GLYCOLYTIC_OVERLOAD";
  }

  const limiterDef = LIMITER_DEFINITIONS[limiter];

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 6: Identifier le scénario exécuté
  // ─────────────────────────────────────────────────────────────────────────────
  const avgFirstThirdIntensity = firstThirdPoints.reduce((s, p) => s + p.actual_intensity, 0) / (firstThirdPoints.length || 1);
  const avgIntensity = deviationPoints.reduce((s, p) => s + p.actual_intensity, 0) / (deviationPoints.length || 1);
  
  let scenarioExecuted: SimulationScenarioType | "BEYOND_ENVELOPE" = "ROBUST";
  if (avgFirstThirdIntensity > orangeMax) {
    scenarioExecuted = "BEYOND_ENVELOPE";
  } else if (avgFirstThirdIntensity > greenMax + 2) {
    scenarioExecuted = "AGGRESSIVE";
  } else if (avgIntensity > greenMax) {
    scenarioExecuted = "AMBITIOUS";
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 7: Calculer les ajustements d'indices
  // ─────────────────────────────────────────────────────────────────────────────
  const rationale: string[] = [];
  let readinessAdjustment = 0;
  let vlamaxConfidenceAdjustment = 0;
  let durabilityAdjustment = 0;
  
  if (disciplineScore.score >= 85 && limiter === "NONE_DETECTED") {
    readinessAdjustment = 10;
    rationale.push("Exécution conforme → Race Readiness futur +10");
  } else if (limiter === "PACING_ERROR") {
    readinessAdjustment = -10;
    rationale.push("Erreur de pacing détectée → Race Readiness futur -10 (discipline à travailler)");
  }
  
  if (limiter === "GLYCOLYTIC_OVERLOAD") {
    vlamaxConfidenceAdjustment = -0.1;
    rationale.push("Surcharge glycolytique → Confiance VLamax -10% (profil peut être sous-estimé)");
  } else if (fadeIndex < 5 && disciplineScore.score >= 80) {
    vlamaxConfidenceAdjustment = 0.1;
    rationale.push("Fade minimal + discipline → Confiance VLamax +10% (profil cohérent)");
  }
  
  if (limiter === "INADEQUATE_DURABILITY") {
    durabilityAdjustment = -5;
    rationale.push("Durabilité insuffisante confirmée → TTE estimé -5min");
  } else if (fadeIndex < 3 && disciplineScore.score >= 85) {
    durabilityAdjustment = 3;
    rationale.push("Excellente tenue d'allure → TTE estimé +3min");
  }

  const indicesUpdate: TFCLIndicesUpdate = {
    race_readiness_adjustment: readinessAdjustment,
    vlamax_confidence_adjustment: vlamaxConfidenceAdjustment,
    durability_adjustment: durabilityAdjustment,
    pacing_discipline_score: disciplineScore.score,
    rationale,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 8: Générer le verdict coach
  // ─────────────────────────────────────────────────────────────────────────────
  const whatWorked: string[] = [];
  const whatCost: string[] = [];
  
  if (disciplineScore.details.first_third_compliance >= 85) {
    whatWorked.push("Discipline premier tiers excellente");
  }
  if (physiologicalExecution.hr_control >= 80) {
    whatWorked.push("Bonne gestion cardiaque");
  }
  if (fadeIndex < 10) {
    whatWorked.push("Fade minimal sur la fin");
  }
  
  if (earlyRedEntries > 0) {
    whatCost.push(`${earlyRedEntries} entrée(s) en zone rouge avant mi-course`);
  }
  if (fadeIndex > 15) {
    whatCost.push(`Ralentissement important (${fadeIndex}%) sur le dernier quart`);
  }
  if (postRaceData.hr_drift_pct && postRaceData.hr_drift_pct > 12) {
    whatCost.push(`Dérive cardiaque excessive (${postRaceData.hr_drift_pct}%)`);
  }

  const coachVerdict: CoachVerdict = {
    what_worked: whatWorked.length > 0 ? whatWorked : ["Participation finalisée"],
    what_cost: whatCost.length > 0 ? whatCost : ["Aucun coût majeur identifié"],
    priority_lever: limiterDef.lever_recommendation.split(" + ")[0],
    lever_rationale: limiterDef.lever_recommendation,
    decision_flow: {
      limiter: limiterDef.label,
      lever: limiterDef.lever_recommendation.split(" + ")[0],
      decision: limiter === "NONE_DETECTED" 
        ? "Maintenir le cap, progression douce"
        : `Priorité: ${limiterDef.lever_recommendation.split(" + ")[0]}`,
    },
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RÉSULTAT FINAL
  // ─────────────────────────────────────────────────────────────────────────────
  return {
    race_date,
    race_distance,
    finish_time_formatted: formatTime(finish_time_seconds),
    pacing_comparison: {
      planned_curve: plannedCurve,
      actual_curve: actualCurve,
      deviation_points: deviationPoints,
    },
    outcome: {
      discipline_score: disciplineScore,
      physiological_execution: physiologicalExecution,
      limiting_factor_detected: limiter,
      limiting_factor_explanation: limiterDef.explanation,
      scenario_executed: scenarioExecuted,
      scenario_planned: plannedScenario,
    },
    indices_update: indicesUpdate,
    coach_verdict: coachVerdict,
    analysis_confidence: clamp(
      0.5 + (splits.length >= 10 ? 0.2 : 0) + (postRaceData.hr_drift_pct !== null ? 0.15 : 0),
      0.4, 0.95
    ),
    tfcl_statement: `"La performance n'est pas un hasard, elle est la conséquence directe d'une décision tenue ou non." — TFCL Method™`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT — LIMITER HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function getLimiterInfo(limiter: LimiterType) {
  return LIMITER_DEFINITIONS[limiter];
}

export function getAllLimiters() {
  return Object.entries(LIMITER_DEFINITIONS).map(([key, value]) => ({
    type: key as LimiterType,
    ...value,
  }));
}
