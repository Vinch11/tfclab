/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL DIAGNOSTIC ENGINE™ — Orchestrateur
 * 
 * Point d'entrée unique : computeDiagnostic(input) → AthleteDiagnostic
 * 
 * Appelle les sous-modules existants dans l'ordre :
 * 1. Effectifs (VLamax, TTE, Fatigue)
 * 2. Limiteur Unifié (ex-Compas)
 * 3. Race Readiness
 * 4. Cibles Physiologiques
 * 5. Risque Blessure
 * 6. DRE (si données disponibles)
 * 7. Synthèse
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  DiagnosticInput,
  AthleteDiagnostic,
  DiagnosticSynthesis,
  DiagnosticAlert,
} from "./types";
import { DIAGNOSTIC_ENGINE_VERSION, DIAGNOSTIC_ENGINE_DISCLAIMER } from "./types";

// Sub-engines (unchanged — they remain the computation core)
import { computeVLamaxEffectif, type VLamaxEffectif } from "@/lib/vlamaxEffectif";
import { computeTTEEffectif, type TTEEffectif } from "@/lib/tteEffectif";
import { computeFatigueEffectif, type FatigueEffectif } from "@/lib/fatigueEffectif";
import { detectUnifiedLimiter, type UnifiedLimiterResult, LIMITER_INFO } from "@/lib/v2/unifiedLimiterDetection";
import { computeRaceReadinessV2, type RaceReadinessV2Result } from "@/lib/v2/raceReadinessV2";
import { getTargetsForAmbition, normalizeObjective, getVLamaxRange } from "@/lib/physiologicalTargets";
import { computeRunInjuryRisk, type RunInjuryRiskEnvelope } from "@/lib/runInjuryRisk";
import type { InjuryRiskEnvelope } from "@/lib/v2/injuryRiskUnified";

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATEUR PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function computeDiagnostic(input: DiagnosticInput): AthleteDiagnostic {
  // ── 1. Indices Effectifs ──────────────────────────────────────────────────
  const vlamax = computeVLamaxFromInput(input);
  const tte = computeTTEFromInput(input);
  const fatigue = computeFatigueFromInput(input, tte, vlamax);

  // ── 2. Limiteur Unifié ────────────────────────────────────────────────────
  const limiter = detectUnifiedLimiter({
    vo2max: input.vo2max,
    ftpKg: input.ftpKg,
    vlamax: vlamax.value,
    wprimeKj: input.wprimeKj,
    cpDataQuality: input.cpDataQuality,
    tte: tte.tte_min,
    fatmax: input.fatmax,
    economyScore: input.runEconomyScore,
    availabilityScore: fatigue.score < 30 ? 85 : fatigue.score < 55 ? 60 : fatigue.score < 75 ? 35 : 15,
    hasHealthAlerts: input.checkinData?.painFlag ?? false,
    objectif: input.objectif,
    ambition: input.ambition,
    age: input.age,
  });

  // ── 3. Race Readiness ─────────────────────────────────────────────────────
  const readiness = computeReadinessFromInput(input, limiter);

  // ── 4. Cibles Physiologiques ──────────────────────────────────────────────
  const normalized = normalizeObjective(input.objectif);
  const currentTargets = getTargetsForAmbition(normalized, input.ambition);
  const vlamaxRange = getVLamaxRange(input.objectif, input.ambition);

  // ── 5. Risque Blessure ────────────────────────────────────────────────────
  const runInjuryRisk = computeRunInjuryRiskFromInput(input, fatigue, tte, vlamax);

  // ── 6. DRE (placeholder — enrichi quand données disponibles) ──────────
  // TODO: Intégrer computeFullDRE quand dreInput est fourni
  const reliability = null;

  // ── 7. Synthèse ───────────────────────────────────────────────────────────
  const synthesis = computeSynthesis(limiter, readiness, fatigue, runInjuryRisk, input);

  // ── 8. Métadonnées ────────────────────────────────────────────────────────
  const confidenceGlobal = Math.min(
    vlamax.confidence,
    tte.confidence,
    fatigue.confidence,
    limiter.confidence
  );

  const dataCompleteness = computeDataCompleteness(input);

  return {
    athleteId: input.athleteId,
    objectif: input.objectif,
    ambition: input.ambition,
    sportFocus: input.sportFocus,
    effectifs: { vlamax, tte, fatigue },
    limiter,
    readiness,
    targets: {
      current: currentTargets,
      vlamaxRange,
      adjustedForAge: input.age !== null && input.age >= 40,
    },
    injuryRisk: {
      run: runInjuryRisk,
      bike: null, // TODO: Intégrer computeBikeInjuryRisk
    },
    reliability,
    synthesis,
    meta: {
      timestamp: new Date().toISOString(),
      version: DIAGNOSTIC_ENGINE_VERSION,
      confidenceGlobal,
      dataCompleteness,
      disclaimer: DIAGNOSTIC_ENGINE_DISCLAIMER,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOUS-FONCTIONS D'ADAPTATION (bridge ancien → nouveau)
// ═══════════════════════════════════════════════════════════════════════════════

function computeVLamaxFromInput(input: DiagnosticInput): VLamaxEffectif {
  return computeVLamaxEffectif({
    athleteId: input.athleteId,
    snapshot: {
      id: "diagnostic-snapshot",
      athlete_id: input.athleteId,
      date: new Date().toISOString().split("T")[0],
      vlamax: input.vlamax,
      ftp: input.ftp,
      pmax_5s: input.pmax5s,
      weight_kg: input.weightKg,
      sport_main: input.sportFocus === "run" ? "run" : "bike",
      p30s_w: input.p30sW,
      p60s_w: input.p60sW,
      map5min_w: input.map5minW,
      tte_observed_min: input.tteObservedMin,
      protocol_quality: input.protocolQuality,
      objectif: input.objectif,
      vo2max: input.vo2max,
      vma: input.vma,
      pace_threshold_sec_per_km: input.paceThresholdSecPerKm,
      running_power_threshold: input.runningPowerThreshold,
      running_power_1s: input.runningPower1s,
      running_power_5s: input.runningPower5s,
      running_power_30s: input.runningPower30s,
      running_power_60s: input.runningPower60s,
      running_power_5min: input.runningPower5min,
      sprint_15s_distance: input.sprint15sDistance,
      css: input.css,
      vlamax_source: input.vlamaxSource,
      vlamax_protocol: input.vlamaxProtocol,
      vlamax_is_reference: input.vlamaxIsReference,
    },
    tests: [],
    sport: input.sportFocus === "run" ? "run" : "bike",
  });
}

function computeTTEFromInput(input: DiagnosticInput): TTEEffectif {
  return computeTTEEffectif({
    ftp: input.ftp,
    tss_7d: input.tss7d,
    tte_mode: input.tteMode,
    tte_observed_min: input.tteObservedMin,
    objectif: input.objectif,
  });
}

function computeFatigueFromInput(
  input: DiagnosticInput,
  tte: TTEEffectif,
  vlamax: VLamaxEffectif
): FatigueEffectif {
  return computeFatigueEffectif({
    tss_7d: input.tss7d,
    fatigue_state: input.fatigueState,
    tte_effectif: tte,
    vlamax_effectif: vlamax,
    objectif: input.objectif,
  });
}

function computeReadinessFromInput(
  input: DiagnosticInput,
  limiter: UnifiedLimiterResult
): RaceReadinessV2Result {
  // Build compass scores from limiter gap analysis
  const compassScores = {
    aerobic: 50,
    tolerance: 50,
    metabolic: 50,
    robustness: 50,
  };

  // Map gap analysis to compass scores
  for (const gap of limiter.gapAnalysis) {
    const score = Math.max(0, Math.min(100, 100 + gap.gapPercent));
    if (gap.metric === "VO2max" || gap.metric === "FTP/kg") {
      compassScores.aerobic = Math.min(compassScores.aerobic === 50 ? score : compassScores.aerobic, score);
    } else if (gap.metric === "VLamax") {
      compassScores.metabolic = score;
    } else if (gap.metric === "TTE") {
      compassScores.tolerance = score;
    } else if (gap.metric === "Économie" || gap.metric === "W'") {
      compassScores.robustness = Math.min(compassScores.robustness === 50 ? score : compassScores.robustness, score);
    }
  }

  return computeRaceReadinessV2({
    compassScores,
    fatigueState: input.fatigueState || "ok",
    tss7d: input.tss7d || null,
    objectif: input.objectif,
    sportFocus: input.sportFocus,
    hasHealthAlerts: input.checkinData?.painFlag ?? false,
  });
}

function computeRunInjuryRiskFromInput(
  input: DiagnosticInput,
  fatigue: FatigueEffectif,
  tte: TTEEffectif,
  vlamax: VLamaxEffectif
): RunInjuryRiskEnvelope | null {
  if (input.sportFocus === "bike") return null;

  return computeRunInjuryRisk({
    fatigueEffectif: fatigue,
    vlamaxEffectif: vlamax,
    tteEffectif: tte,
    objectif: input.objectif,
    age: input.age,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNTHÈSE
// ═══════════════════════════════════════════════════════════════════════════════

function computeSynthesis(
  limiter: UnifiedLimiterResult,
  readiness: RaceReadinessV2Result,
  fatigue: FatigueEffectif,
  runInjuryRisk: RunInjuryRiskEnvelope | null,
  input: DiagnosticInput
): DiagnosticSynthesis {
  const alerts: DiagnosticAlert[] = [];

  // Alertes fatigue
  if (fatigue.score > 75) {
    alerts.push({
      severity: "critical",
      message: `Fatigue critique (${fatigue.score}%) — limiter l'intensité`,
      source: "fatigue",
    });
  } else if (fatigue.score > 55) {
    alerts.push({
      severity: "warning",
      message: `Fatigue élevée (${fatigue.score}%) — privilégier Z2/récupération`,
      source: "fatigue",
    });
  }

  // Alertes risque blessure
  if (runInjuryRisk && (runInjuryRisk.level === "ELEVE" || runInjuryRisk.level === "CRITIQUE")) {
    alerts.push({
      severity: runInjuryRisk.level === "CRITIQUE" ? "critical" : "warning",
      message: `Risque blessure CAP ${runInjuryRisk.levelLabel} (${runInjuryRisk.score}%)`,
      source: "injuryRisk",
    });
  }

  // Alertes readiness
  if (readiness.flags.dataIncomplete) {
    alerts.push({
      severity: "info",
      message: "Données incomplètes — diagnostic à interpréter avec prudence",
      source: "readiness",
    });
  }

  // Identifier les points forts
  const strengths: string[] = [];
  for (const gap of limiter.gapAnalysis) {
    if (gap.status === "optimal") {
      strengths.push(`${gap.metric} au niveau cible`);
    }
  }

  // Priorités L1/L2
  const sortedGaps = [...limiter.gapAnalysis]
    .filter(g => g.status === "limiting")
    .sort((a, b) => a.weightedImpact - b.weightedImpact);

  const L1 = {
    limiter: limiter.primaryLimiter,
    lever: limiter.primaryLever,
    label: limiter.limiterLabel,
  };

  const L2 = sortedGaps.length > 1
    ? {
        limiter: mapMetricToLimiter(sortedGaps[1].metric),
        lever: mapMetricToLever(sortedGaps[1].metric),
        label: sortedGaps[1].metric,
      }
    : null;

  // Score global
  const globalScore = readiness.readiness.score;
  const globalCategory = globalScore < 50 ? "critical" as const
    : globalScore < 65 ? "developing" as const
    : globalScore < 80 ? "solid" as const
    : "ready" as const;

  // Headline
  const headline = generateHeadline(limiter, readiness, fatigue);

  return {
    headline,
    priorities: { L1, L2 },
    globalScore,
    globalCategory,
    alerts: alerts.slice(0, 3),
    strengths,
  };
}

function generateHeadline(
  limiter: UnifiedLimiterResult,
  readiness: RaceReadinessV2Result,
  fatigue: FatigueEffectif
): string {
  if (fatigue.score > 75) {
    return `Fatigue critique — priorité récupération avant toute qualité`;
  }
  if (limiter.primaryLimiter === "none") {
    return `Profil équilibré — ${readiness.readiness.categoryLabel}`;
  }
  return `Limiteur principal : ${limiter.limiterLabel} — ${readiness.readiness.categoryLabel}`;
}

function mapMetricToLimiter(metric: string): "aerobic_engine" | "glycolytic" | "specific_endurance" | "neuromuscular" | "anaerobic_capacity" | "metabolic_efficiency" | "availability" | "none" {
  const map: Record<string, any> = {
    "VO2max": "aerobic_engine",
    "FTP/kg": "aerobic_engine",
    "VLamax": "glycolytic",
    "TTE": "specific_endurance",
    "Économie": "neuromuscular",
    "W'": "anaerobic_capacity",
    "FatMax": "metabolic_efficiency",
  };
  return map[metric] || "none";
}

function mapMetricToLever(metric: string): "increase_vo2max" | "decrease_vlamax" | "increase_tte" | "force_endurance" | "adjust_anaerobic" | "increase_fat_oxidation" | "recovery" | "maintain" {
  const map: Record<string, any> = {
    "VO2max": "increase_vo2max",
    "FTP/kg": "increase_vo2max",
    "VLamax": "decrease_vlamax",
    "TTE": "increase_tte",
    "Économie": "force_endurance",
    "W'": "adjust_anaerobic",
    "FatMax": "increase_fat_oxidation",
  };
  return map[metric] || "maintain";
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA COMPLETENESS
// ═══════════════════════════════════════════════════════════════════════════════

function computeDataCompleteness(input: DiagnosticInput): number {
  const fields = [
    input.vo2max,
    input.ftp,
    input.ftpKg,
    input.vlamax,
    input.tteObservedMin ?? input.tss7d,
    input.pmax5s,
    input.weightKg,
  ];

  if (input.sportFocus === "run" || input.sportFocus === "tri") {
    fields.push(input.vma, input.css, input.runEconomyScore);
  }
  if (input.sportFocus === "bike" || input.sportFocus === "tri") {
    fields.push(input.p30sW, input.p60sW, input.map5minW);
  }

  const present = fields.filter(f => f !== null && f !== undefined).length;
  return Math.round((present / fields.length) * 100) / 100;
}
