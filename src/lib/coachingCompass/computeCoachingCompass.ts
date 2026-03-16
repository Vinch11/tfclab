/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL COACHING COMPASS™ — Couche de Synthèse
 * 
 * PRINCIPE FONDAMENTAL :
 * Le Coaching Compass ne calcule RIEN. Il consomme les résultats des moteurs
 * existants et les organise en flux décisionnel :
 * 
 * PROFIL → LIMITEUR → LEVIER → DÉCISION
 * 
 * Sources consommées :
 * - VLamax Effectif (Diagnostic Engine)
 * - TTE Effectif (Diagnostic Engine)
 * - Fatigue Effectif (Diagnostic Engine)
 * - Unified Limiter Detection (Diagnostic Engine)
 * - Lorang Strategy Engine (Decision Engine)
 * - Race Readiness V2 (Decision Engine)
 * - Lactate Thresholds TFCL
 * - Compass Scoring (4 axes)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  TFCLCoachingCompassResult,
  TFCLPhysiologicalProfile,
  TFCLLimiter,
  TFCLLeverage,
  TFCLCoachingDecision,
  TFCLReadinessState,
  CoachingCompassInput,
  PhysioMetric,
  LimiterType,
  LeverType,
  RadarAxis,
} from "./types";

export const COACHING_COMPASS_VERSION = "1.0.0";

const COACHING_COMPASS_DISCLAIMER = 
  "Le Coaching Compass est un outil d'aide à la décision. " +
  "La décision coach prime toujours sur l'algorithme.";

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATEUR PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function computeCoachingCompass(input: CoachingCompassInput): TFCLCoachingCompassResult {
  // 1. Assembler le profil physiologique (lecture seule)
  const profile = buildPhysiologicalProfile(input);

  // 2. Identifier le limiteur (depuis le Strategy Engine ou Unified Limiter)
  const limiter = buildLimiter(input);

  // 3. Identifier le levier (depuis le Strategy Engine)
  const leverage = buildLeverage(input, limiter);

  // 4. Produire la décision (depuis le Strategy Engine)
  const decision = buildDecision(input, limiter, leverage);

  // 5. Assembler Race Readiness
  const readiness = buildReadinessState(input);

  // 6. Construire les axes radar
  const radarAxes = buildRadarAxes(input, profile);

  // 7. Fatigue warning
  const fatigueWarning = buildFatigueWarning(input);

  return {
    profile,
    limiter,
    leverage,
    decision,
    readiness,
    radarAxes,
    fatigueWarning,
    meta: {
      version: COACHING_COMPASS_VERSION,
      timestamp: new Date().toISOString(),
      disclaimer: COACHING_COMPASS_DISCLAIMER,
      dataCompleteness: profile.dataCompleteness,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFIL PHYSIOLOGIQUE — Lecture des données existantes
// ═══════════════════════════════════════════════════════════════════════════════

function buildPhysiologicalProfile(input: CoachingCompassInput): TFCLPhysiologicalProfile {
  const date = input.snapshotDate;
  
  const ftpKg = (input.ftp && input.poids && input.poids > 0) 
    ? Math.round((input.ftp / input.poids) * 100) / 100 
    : null;

  const metrics: TFCLPhysiologicalProfile = {
    vo2max: makeMetric(input.vo2max, 0.85, "snapshot", date, "ml/kg/min"),
    vlamax: makeMetric(
      input.vlamaxEffectif.value, 
      input.vlamaxEffectif.confidence, 
      input.vlamaxEffectif.source, 
      date, "mmol/L/s"
    ),
    fatmax: makeMetric(input.fatmax, input.fatmax ? 0.7 : 0, input.fatmax ? "estimation" : "unknown", date, "W"),
    lt1: makeMetric(
      input.lactateThresholds?.lt1?.watts ?? null,
      input.lactateThresholds?.lt1?.confidence ?? 0,
      input.lactateThresholds?.lt1 ? "estimation" : "unknown",
      date, "W"
    ),
    lt2: makeMetric(
      input.lactateThresholds?.lt2?.watts ?? null,
      input.lactateThresholds?.lt2?.confidence ?? 0,
      input.lactateThresholds?.lt2 ? "estimation" : "unknown",
      date, "W"
    ),
    ftp: makeMetric(input.ftp, input.ftp ? 0.9 : 0, input.ftp ? "snapshot" : "unknown", date, "W"),
    ftpKg: makeMetric(ftpKg, ftpKg ? 0.9 : 0, ftpKg ? "snapshot" : "unknown", date, "W/kg"),
    tte: makeMetric(
      input.tteEffectif.tte_min,
      input.tteEffectif.confidence,
      input.tteEffectif.source,
      date, "min"
    ),
    runningEconomy: makeMetric(
      input.runEconomyScore, 
      input.runEconomyScore ? 0.7 : 0, 
      input.runEconomyScore ? "estimation" : "unknown", 
      date, "index"
    ),
    durability: makeMetric(
      input.hrDriftPct != null ? Math.max(0, 100 - input.hrDriftPct * 5) : null,
      input.hrDriftPct != null ? 0.65 : 0,
      input.hrDriftPct != null ? "snapshot" : "unknown",
      date, "score"
    ),
    wPrime: makeMetric(
      input.wprimeKj, 
      input.wprimeKj ? 0.7 : 0, 
      input.wprimeKj ? "estimation" : "unknown", 
      date, "kJ"
    ),
    dataCompleteness: 0,
  };

  // Calcul complétude
  const allMetrics = [
    metrics.vo2max, metrics.vlamax, metrics.ftp, metrics.tte,
    metrics.fatmax, metrics.lt1, metrics.lt2, metrics.runningEconomy,
    metrics.durability, metrics.wPrime,
  ];
  const available = allMetrics.filter(m => m.value !== null && m.source !== "unknown").length;
  metrics.dataCompleteness = Math.round((available / allMetrics.length) * 100);

  return metrics;
}

function makeMetric(
  value: number | null, 
  confidence: number, 
  source: string, 
  lastUpdated: string | null, 
  unit: string
): PhysioMetric {
  return { value, confidence, source, lastUpdated, unit };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIMITEUR — Depuis Strategy Engine / Unified Limiter
// ═══════════════════════════════════════════════════════════════════════════════

const LIMITER_MAP: Record<string, { type: LimiterType; icon: string }> = {
  motor: { type: "aerobic_power", icon: "🫁" },
  aerobic_power: { type: "aerobic_power", icon: "🫁" },
  "Moteur Aérobie": { type: "aerobic_power", icon: "🫁" },
  glycolytic: { type: "glycolytic", icon: "⚡" },
  "VLamax": { type: "glycolytic", icon: "⚡" },
  metabolic: { type: "metabolic_endurance", icon: "🔥" },
  "Endurance Métabolique": { type: "metabolic_endurance", icon: "🔥" },
  "TTE": { type: "durability", icon: "💪" },
  durability: { type: "durability", icon: "💪" },
  "Durabilité": { type: "durability", icon: "💪" },
  neuromuscular: { type: "neuromuscular", icon: "🦵" },
  "Neuromusculaire": { type: "neuromuscular", icon: "🦵" },
  "Économie": { type: "neuromuscular", icon: "🦶" },
  "W' (kJ)": { type: "neuromuscular", icon: "💥" },
  "Robustesse": { type: "durability", icon: "🛡️" },
  "FTP/kg": { type: "aerobic_power", icon: "🫁" },
  "VO2max": { type: "aerobic_power", icon: "🫁" },
};

function buildLimiter(input: CoachingCompassInput): TFCLLimiter {
  // Priorité 1 : Strategy Engine (Lorang)
  if (input.strategyResult) {
    const sr = input.strategyResult;
    const mapped = LIMITER_MAP[sr.primaryLimiter] ?? { type: "unknown" as LimiterType, icon: "❓" };
    
    return {
      type: mapped.type,
      impactScore: input.limiterResult?.gapAnalysis?.[0]?.weightedImpact ?? 0.5,
      label: sr.limiterLabel,
      description: sr.limiterExplanation,
      icon: mapped.icon,
      metricsUsed: input.limiterResult?.gapAnalysis
        ?.filter(g => g.weightedImpact > 0)
        ?.map(g => g.metric) ?? [],
      confidence: sr.confidence as "high" | "moderate" | "low",
    };
  }

  // Priorité 2 : Unified Limiter
  if (input.limiterResult?.primaryLimiter) {
    const lr = input.limiterResult;
    const mapped = LIMITER_MAP[lr.primaryLimiter!] ?? { type: "unknown" as LimiterType, icon: "❓" };
    const topGap = lr.gapAnalysis?.[0];

    return {
      type: mapped.type,
      impactScore: topGap?.weightedImpact ?? 0.3,
      label: lr.primaryLimiter!,
      description: `Limiteur principal identifié : ${lr.primaryLimiter}`,
      icon: mapped.icon,
      metricsUsed: lr.gapAnalysis?.filter(g => g.weightedImpact > 0).map(g => g.metric) ?? [],
      confidence: lr.confidence >= 70 ? "high" : lr.confidence >= 50 ? "moderate" : "low",
    };
  }

  // Fallback
  return {
    type: "unknown",
    impactScore: 0,
    label: "Données insuffisantes",
    description: "Renseignez un snapshot complet pour identifier le facteur limitant.",
    icon: "❓",
    metricsUsed: [],
    confidence: "low",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVIER — Table de correspondance Limiteur → Levier
// ═══════════════════════════════════════════════════════════════════════════════

const LIMITER_TO_LEVER: Record<LimiterType, {
  type: LeverType;
  label: string;
  icon: string;
  description: string;
  expectedAdaptations: string[];
  workoutExamples: string[];
}> = {
  aerobic_power: {
    type: "vo2_intervals",
    label: "Intervalles VO₂max",
    icon: "🫁",
    description: "Développer le moteur aérobie via des intervalles à haute intensité.",
    expectedAdaptations: ["VO₂max ↑", "FTP/kg ↑", "MAP ↑"],
    workoutExamples: ["5×4min Z5 r3min", "3×8min Z4-Z5 r4min", "6×3min Z5 r3min"],
  },
  glycolytic: {
    type: "metabolic_endurance",
    label: "Endurance Métabolique",
    icon: "🔥",
    description: "Abaisser la VLamax par du volume Z2 et du tempo, optimiser l'oxydation des lipides.",
    expectedAdaptations: ["VLamax ↓", "FatMax ↑", "Durabilité ↑"],
    workoutExamples: ["Z2 long 2-4h", "2×20min tempo Z3", "Sweet Spot 3×15min"],
  },
  metabolic_endurance: {
    type: "long_endurance",
    label: "Endurance Longue Durée",
    icon: "⏱️",
    description: "Augmenter la capacité à maintenir l'effort sur de longues durées.",
    expectedAdaptations: ["TTE ↑", "FatMax ↑", "Résilience ↑"],
    workoutExamples: ["Z2 sortie longue progressive", "Z2 + bloc Z3 final", "Brick run post-vélo"],
  },
  durability: {
    type: "long_endurance",
    label: "Renforcement Durabilité",
    icon: "💪",
    description: "Améliorer la résistance à la fatigue via du volume structuré et des sorties longues.",
    expectedAdaptations: ["TTE ↑", "HR drift ↓", "Tenue d'allure ↑"],
    workoutExamples: ["Z2 long > 3h", "Tempo final 30min sur sortie longue", "Run off the bike"],
  },
  neuromuscular: {
    type: "sprint_force",
    label: "Sprint & Force",
    icon: "🦵",
    description: "Développer la puissance neuromusculaire et l'économie de mouvement.",
    expectedAdaptations: ["W' ↑", "Économie ↑", "Explosivité ↑"],
    workoutExamples: ["8×15s sprints r2min", "Force gym (squat, deadlift)", "Côtes courtes technique"],
  },
  unknown: {
    type: "mixed",
    label: "Approche Équilibrée",
    icon: "⚖️",
    description: "Données insuffisantes pour cibler un levier. Approche polyvalente recommandée.",
    expectedAdaptations: ["Maintien général", "Consolidation des bases"],
    workoutExamples: ["Z2 + technique", "Intervalles modérés Z4", "Récupération active"],
  },
};

function buildLeverage(input: CoachingCompassInput, limiter: TFCLLimiter): TFCLLeverage {
  // Priorité 1 : Strategy Engine levers
  if (input.strategyResult?.activatedLevers?.length) {
    const topLever = input.strategyResult.activatedLevers[0];
    const baseLever = LIMITER_TO_LEVER[limiter.type] ?? LIMITER_TO_LEVER.unknown;

    return {
      type: baseLever.type,
      label: topLever.label,
      icon: baseLever.icon,
      description: topLever.reason,
      expectedAdaptations: baseLever.expectedAdaptations,
      workoutExamples: topLever.prescription.length > 0 ? topLever.prescription : baseLever.workoutExamples,
      priority: topLever.priority as 1 | 2 | 3,
    };
  }

  // Fallback : correspondance directe
  const baseLever = LIMITER_TO_LEVER[limiter.type] ?? LIMITER_TO_LEVER.unknown;
  return {
    ...baseLever,
    priority: 1,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DÉCISION D'ENTRAÎNEMENT — Depuis Strategy Engine
// ═══════════════════════════════════════════════════════════════════════════════

const BLOCK_DURATION: Record<LimiterType, number> = {
  aerobic_power: 4,
  glycolytic: 6,
  metabolic_endurance: 6,
  durability: 4,
  neuromuscular: 3,
  unknown: 4,
};

const BLOCK_NAMES: Record<LimiterType, string> = {
  aerobic_power: "VO₂max Development Block",
  glycolytic: "Metabolic Endurance Block",
  metabolic_endurance: "Long Endurance Block",
  durability: "Durability Building Block",
  neuromuscular: "Neuromuscular Power Block",
  unknown: "General Fitness Block",
};

function buildDecision(
  input: CoachingCompassInput, 
  limiter: TFCLLimiter, 
  leverage: TFCLLeverage
): TFCLCoachingDecision {
  const sr = input.strategyResult;

  // Prohibitions
  const prohibitions = sr?.prohibitions?.map(p => p.label) ?? [];
  if (sr?.hasSprintBan) {
    if (!prohibitions.includes("Sprint Ban")) {
      prohibitions.push("Sprint Ban");
    }
  }

  return {
    recommendedBlock: sr?.templateSuggestion?.weekLabel ?? BLOCK_NAMES[limiter.type] ?? "General Block",
    durationWeeks: BLOCK_DURATION[limiter.type] ?? 4,
    primaryWorkouts: leverage.workoutExamples,
    physiologicalTargets: leverage.expectedAdaptations,
    prohibitions,
    athleteMessage: sr?.athleteMessage ?? leverage.description,
    coachRationale: sr?.summary
      ? `${sr.summary.mainAction}. ${sr.summary.whyThis}`
      : `Limiteur identifié : ${limiter.label}. Levier prioritaire : ${leverage.label}.`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// READINESS STATE — Depuis Race Readiness V2
// ═══════════════════════════════════════════════════════════════════════════════

function buildReadinessState(input: CoachingCompassInput): TFCLReadinessState {
  if (input.raceReadiness) {
    const rr = input.raceReadiness;
    return {
      potential: rr.potential,
      availability: rr.availability,
      governingFactor: rr.governingFactor === "availability" ? "availability" : "potential",
      readinessScore: rr.score,
      readinessLabel: rr.label,
      readinessColor: rr.color as "success" | "warning" | "destructive",
    };
  }

  return {
    potential: 0,
    availability: 0,
    governingFactor: "potential",
    readinessScore: 0,
    readinessLabel: "Données insuffisantes",
    readinessColor: "destructive",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AXES RADAR — Synthèse visuelle
// ═══════════════════════════════════════════════════════════════════════════════

function buildRadarAxes(input: CoachingCompassInput, profile: TFCLPhysiologicalProfile): RadarAxis[] {
  // Normaliser chaque métrique en score 0-100 pour le radar
  return [
    {
      key: "vo2max",
      label: "VO₂max",
      shortLabel: "VO₂",
      score: normalizeScore(profile.vo2max.value, 30, 70),
      icon: "🫁",
      color: "hsl(var(--primary))",
    },
    {
      key: "vlamax",
      label: "Profil Glycolytique",
      shortLabel: "VLamax",
      // VLamax inversé : plus bas = meilleur pour endurance
      score: profile.vlamax.value !== null 
        ? Math.max(0, Math.min(100, Math.round(100 - (profile.vlamax.value - 0.20) * 125)))
        : 0,
      icon: "⚡",
      color: "hsl(45, 90%, 50%)",
    },
    {
      key: "fatmax",
      label: "FatMax",
      shortLabel: "FatMax",
      score: normalizeScore(profile.fatmax.value, 100, 350),
      icon: "🔥",
      color: "hsl(25, 85%, 50%)",
    },
    {
      key: "durability",
      label: "Durabilité",
      shortLabel: "Durabilité",
      score: profile.durability.value !== null ? Math.round(profile.durability.value) : 0,
      icon: "💪",
      color: "hsl(280, 60%, 55%)",
    },
    {
      key: "economy",
      label: "Économie",
      shortLabel: "Éco.",
      score: profile.runningEconomy.value !== null ? Math.round(profile.runningEconomy.value) : 0,
      icon: "🦶",
      color: "hsl(160, 60%, 45%)",
    },
  ];
}

function normalizeScore(value: number | null, min: number, max: number): number {
  if (value === null) return 0;
  return Math.max(0, Math.min(100, Math.round(((value - min) / (max - min)) * 100)));
}

// ═══════════════════════════════════════════════════════════════════════════════
// FATIGUE WARNING — Depuis Diagnostic Engine
// ═══════════════════════════════════════════════════════════════════════════════

function buildFatigueWarning(input: CoachingCompassInput): TFCLCoachingCompassResult["fatigueWarning"] {
  // Depuis le limiter result
  if (input.limiterResult?.fatigueWarning) {
    return {
      level: input.limiterResult.fatigueWarning.level as "none" | "moderate" | "high" | "critical",
      message: input.limiterResult.fatigueWarning.message,
    };
  }

  // Depuis la fatigue effectif
  if (input.fatigueEffectif && input.fatigueEffectif.score >= 50) {
    const score = input.fatigueEffectif.score;
    let level: "moderate" | "high" | "critical" = "moderate";
    if (score >= 80) level = "critical";
    else if (score >= 65) level = "high";

    return {
      level,
      message: `Fatigue élevée (${score}%) — adapter la charge d'entraînement`,
    };
  }

  return null;
}
