/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL DIAGNOSTIC ENGINE™ — Orchestrateur
 * 
 * Point d'entrée unique : computeDiagnostic(input) → AthleteDiagnostic
 * 
 * Appelle les sous-modules existants dans l'ordre :
 * 1. Effectifs (VLamax, TTE, Fatigue)
 * 2. Limiteur Unifié (ex-Compas)
 * 3. Potentiel Physiologique
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
import { detectUnifiedLimiter, LIMITER_INFO, type UnifiedLimiterResult } from "@/lib/v2/unifiedLimiterDetection";
import { computeDecisionTFCL, type PotentielV2Result } from "@/lib/v2/potentielTypes";
import { getTargetsForAmbition, normalizeObjective, getVLamaxRange } from "@/lib/physiologicalTargets";
import type { CompassScores, CompassAxisScore } from "@/lib/compassScoring";
import { computeRunInjuryRisk, type RunInjuryRiskEnvelope } from "@/lib/runInjuryRisk";
import { fatigueStateToScore } from "@/lib/fatigueStateMapping";
import {
  predictRunMLSSPctFromVLaCE,
  crossValidateRunMLSS,
  type RunMLSSPrediction,
  type RunMLSSCrossValidation,
} from "@/lib/v2/runMLSSPredictor";
import { estimateFromRaceChronos } from "./raceTimeEstimator";

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
    vma: input.vma,
    sportFocus: input.sportFocus,
    targetRaceDurationMin: input.targetRaceDurationMin ?? null,
  });

  // ── 3. Potentiel Physiologique ─────────────────────────────────────────────────────
  const readiness = computeReadinessFromInput(input, limiter);

  // ── 4. Cibles Physiologiques ──────────────────────────────────────────────
  const normalized = normalizeObjective(input.objectif);
  const vlamaxRange = getVLamaxRange(input.objectif, input.ambition, input.sportFocus);
  const currentTargets = {
    ...getTargetsForAmbition(normalized, input.ambition),
    vlamax: vlamaxRange,
  };

  // ── 5. Risque Blessure ────────────────────────────────────────────────────
  const runInjuryRisk = computeRunInjuryRiskFromInput(input, fatigue, tte, vlamax);

  // ── 6. DRE (placeholder — enrichi quand données disponibles) ──────────
  const reliability = null;

  // ── 6bis. Run MLSS (Modèle C — cross-validator silencieux + fallback) ──
  const runMLSS = computeRunMLSSFromInput(input);

  // ── 6ter. Race Chrono Estimate (RAW — Riegel/VDOT/ACSM/durabilité) ──
  // Calculé seulement si des chronos sont saisis. Sortie tagguée "race_chrono".
  const raceChronoEstimate = input.raceChronos
    ? estimateFromRaceChronos(input.raceChronos)
    : null;

  // ── 7. Synthèse ───────────────────────────────────────────────────────────
  const synthesis = computeSynthesis(limiter, readiness, fatigue, runInjuryRisk, input, runMLSS);

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
      bike: null, // NON IMPLÉMENTÉ — à connecter ultérieurement
    },
    reliability,
    runMLSS,
    raceChronoEstimate,
    synthesis,
    _rawInput: input,
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
  // ✅ COHÉRENCE GLOBALE : si un VLamax effectif a déjà été calculé en amont
  // (typiquement Index.tsx avec l'historique complet tests+snapshots), on le
  // réutilise tel quel pour garantir une valeur identique partout dans l'app.
  if (input.vlamaxEffectifPrecomputed) {
    return input.vlamaxEffectifPrecomputed;
  }
  // ✅ VLamax adaptée à l'objectif : pour un coureur pur, on doit passer
  // vlamax_run au moteur V2 ; sinon il interprète la VLamax vélo comme
  // VLamax CAP et produit un profil incohérent.
  const isRunFocus = input.sportFocus === "run";
  const snapshotObj = {
    id: "diagnostic-snapshot",
    athlete_id: input.athleteId,
    date: new Date().toISOString().split("T")[0],
    vlamax: input.vlamax,
    vlamax_run: input.vlamaxRun,
    ftp: input.ftp,
    pmax_5s: input.pmax5s,
    weight_kg: input.weightKg,
    sport_main: isRunFocus ? "run" : "bike",
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
  };

  return computeVLamaxEffectif({
    athleteId: input.athleteId,
    objectif: input.objectif,
    activeSnapshotId: "diagnostic-snapshot",
    tests: [],
    snapshots: [snapshotObj],
  });
}

function computeTTEFromInput(input: DiagnosticInput): TTEEffectif {
  return computeTTEEffectif({
    ftp: input.ftp,
    tss_7d: input.tss7d,
    tte_mode: input.tteMode,
    tte_observed_min: input.tteObservedMin,
    objectif: input.objectif,
    age: input.age, // F33: ajustement masters
  });
}

function computeFatigueFromInput(
  input: DiagnosticInput,
  tte: TTEEffectif,
  vlamax: VLamaxEffectif
): FatigueEffectif {
  const fatiguePercue = fatigueStateToScore(input.fatigueState);

  return computeFatigueEffectif({
    tss7d: input.tss7d,
    fatiguePercue,
    tteEffectif: tte,
    vlamaxEffectif: vlamax,
    age: input.age,
    objectif: input.objectif,
  });
}

function buildAxisScore(score: number, label: string, explanation: string): CompassAxisScore {
  return {
    score,
    rawScore: score,
    label,
    explanation,
    formula: "derived from gap analysis",
    inputs: {},
    confidence: 0.7,
    source: "diagnostic_engine",
  };
}

function computeReadinessFromInput(
  input: DiagnosticInput,
  limiter: UnifiedLimiterResult
): PotentielV2Result {
  // Build compass scores from limiter gap analysis
  let aerobicScore = 50;
  let toleranceScore = 50;
  let metabolicScore = 50;
  let robustnessScore = 50;

  for (const gap of limiter.gapAnalysis) {
    const score = Math.max(0, Math.min(100, 100 + gap.gapPercent));
    if (gap.metric === "VO2max" || gap.metric === "FTP/kg") {
      aerobicScore = Math.min(aerobicScore === 50 ? score : aerobicScore, score);
    } else if (gap.metric === "VLamax") {
      metabolicScore = score;
    } else if (gap.metric === "TTE") {
      toleranceScore = score;
    } else if (gap.metric === "Économie" || gap.metric === "W'") {
      robustnessScore = Math.min(robustnessScore === 50 ? score : robustnessScore, score);
    }
  }

  const globalScore = Math.round(
    aerobicScore * 0.20 + toleranceScore * 0.30 + metabolicScore * 0.25 + robustnessScore * 0.25
  );

  const compassScores: CompassScores = {
    capaciteAerobie: buildAxisScore(aerobicScore, "Capacité Aérobie", "Score dérivé du gap analysis"),
    toleranceEffort: buildAxisScore(toleranceScore, "Tolérance à l'Effort", "Score dérivé du gap analysis"),
    profilMetabolique: buildAxisScore(metabolicScore, "Profil Métabolique", "Score dérivé du gap analysis"),
    robustesse: buildAxisScore(robustnessScore, "Robustesse", "Score dérivé du gap analysis"),
    globalScore,
    globalLabel: globalScore >= 80 ? "Profil Optimal" : globalScore >= 65 ? "Bon Équilibre" : globalScore >= 50 ? "En Progression" : "À Développer",
    globalColor: globalScore >= 65 ? "success" : globalScore >= 50 ? "warning" : "destructive",
    dataCompleteness: Math.round(computeDataCompleteness(input) * 100),
    mainLimitation: limiter.limiterLabel !== "Profil équilibré" ? limiter.limiterLabel : null,
    mainStrength: null,
    isFatigueModulated: false,
  };

  return computeDecisionTFCL({
    compass: compassScores,
    guardrails: {
      healthAlert: input.checkinData?.painFlag,
      dataCompleteness: computeDataCompleteness(input),
    },
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
    tss7d: input.tss7d,
    age: input.age,
    objectif: input.objectif,
  });
}

// ─── Run MLSS (Modèle C) ────────────────────────────────────────────────
function computeRunMLSSFromInput(
  input: DiagnosticInput
): AthleteDiagnostic["runMLSS"] {
  if (input.sportFocus === "bike") return null;

  // 1. Observed MLSS_pct from pace_threshold + VMA
  //    speed_threshold_kmh = 3600 / pace_sec_per_km
  //    MLSS_pct ≈ (speed_threshold / VMA) × 100  (proxy %vVO2max ≈ %VO2max au seuil)
  let observedPct: number | null = null;
  if (
    input.paceThresholdSecPerKm != null &&
    input.paceThresholdSecPerKm > 0 &&
    input.vma != null &&
    input.vma > 0
  ) {
    const speedKmh = 3600 / input.paceThresholdSecPerKm;
    const ratio = (speedKmh / input.vma) * 100;
    if (ratio >= 50 && ratio <= 100) {
      observedPct = Number(ratio.toFixed(1));
    }
  }

  // 2. Predicted MLSS_pct via Modèle C (VLamax run + CE)
  const prediction = predictRunMLSSPctFromVLaCE(
    input.vlamaxRun,
    input.runEconomyScore
  );

  // 3. Cross-validation
  const crossValidation =
    observedPct !== null && prediction
      ? crossValidateRunMLSS(observedPct, input.vlamaxRun, input.runEconomyScore)
      : null;

  // 4. Effective value (observed wins, predicted as fallback)
  let effectivePct: number | null = null;
  let effectiveSource: "observed" | "predicted" | "none" = "none";
  if (observedPct !== null) {
    effectivePct = observedPct;
    effectiveSource = "observed";
  } else if (prediction) {
    effectivePct = prediction.mlssPct;
    effectiveSource = "predicted";
  }

  if (observedPct === null && prediction === null) return null;

  return {
    observedPct,
    prediction,
    crossValidation,
    effectivePct,
    effectiveSource,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNTHÈSE
// ═══════════════════════════════════════════════════════════════════════════════

function computeSynthesis(
  limiter: UnifiedLimiterResult,
  readiness: PotentielV2Result,
  fatigue: FatigueEffectif,
  runInjuryRisk: RunInjuryRiskEnvelope | null,
  input: DiagnosticInput,
  runMLSS: AthleteDiagnostic["runMLSS"]
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

  // Alerte cross-validation MLSS run (Modèle C) — silencieuse sauf si critique
  if (runMLSS?.crossValidation && runMLSS.crossValidation.severity === "critical") {
    alerts.push({
      severity: "warning",
      message: `Incohérence VLamax/CE/seuil run (Δ${runMLSS.crossValidation.deltaPct > 0 ? "+" : ""}${runMLSS.crossValidation.deltaPct}%) — recalibrer`,
      source: "runMLSS",
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

  // Points forts
  const strengths: string[] = [];
  for (const gap of limiter.gapAnalysis) {
    if (gap.status === "optimal") {
      strengths.push(`${gap.metric} au niveau cible`);
    }
  }

  // Priorités L1/L2 — source unique : moteur unifié (hybride dominant + 0.4×autres)
  // R1+R2 : on ne re-dérive plus L2 localement via gapAnalysis[1] (impact brut),
  // ce qui désynchronisait la synthèse TFCL du `secondaryLever` envoyé au prompt IA
  // et utilisait un mapping métrique→catégorie local divergent (FatMax, W' incohérents).
  const L1 = {
    limiter: limiter.primaryLimiter,
    lever: limiter.primaryLever,
    label: limiter.limiterLabel,
  };

  const L2 = limiter.secondaryLimiter !== "none" && limiter.secondaryLimiter !== limiter.primaryLimiter
    ? {
        limiter: limiter.secondaryLimiter,
        lever: limiter.secondaryLever,
        label: limiter.secondaryLimiterLabel ?? LIMITER_INFO[limiter.secondaryLimiter].label,
      }
    : null;

  // Score global
  const globalScore = readiness.readiness.score;
  const globalCategory = globalScore < 50 ? "critical" as const
    : globalScore < 65 ? "developing" as const
    : globalScore < 80 ? "solid" as const
    : "ready" as const;

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
  readiness: PotentielV2Result,
  fatigue: FatigueEffectif
): string {
  if (fatigue.score > 75) {
    return `Fatigue critique — priorité récupération avant toute qualité`;
  }
  if (limiter.primaryLimiter === "none") {
    return `Profil équilibré — ${readiness.readiness.categoryLabel}`;
  }
  // Use limiter-specific severity instead of global readiness to avoid contradictions
  const worstGap = Math.min(...limiter.gapAnalysis.filter(g => g.status === "limiting").map(g => g.gap));
  const severityLabel = worstGap < -15 ? "Axe prioritaire"
    : worstGap < -5 ? "À développer"
    : "Axe de progression";
  return `Limiteur principal : ${limiter.limiterLabel} — ${severityLabel}`;
}

// R1 : `mapMetricToLimiter`/`mapMetricToLever` locaux supprimés.
// La synthèse L1/L2 utilise désormais uniquement `limiter.primary*`/`limiter.secondary*`
// produits par `detectUnifiedLimiter` (source unique partagée avec planConfigBuilder).


// ═══════════════════════════════════════════════════════════════════════════════
// DATA COMPLETENESS
// ═══════════════════════════════════════════════════════════════════════════════

function computeDataCompleteness(input: DiagnosticInput): number {
  // ✅ VLamax adaptée à l'objectif : pour un runner pur, c'est vlamax_run
  // qui compte dans la complétude (pas la VLamax vélo).
  const goalVlamax = input.sportFocus === "run" ? input.vlamaxRun : input.vlamax;

  const fields: (number | null | undefined)[] = [
    input.vo2max,
    input.ftp,
    input.ftpKg,
    goalVlamax,
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
  // En triathlon on attend AUSSI vlamax_run (scoring CAP-spécifique)
  if (input.sportFocus === "tri") {
    fields.push(input.vlamaxRun);
  }

  const present = fields.filter(f => f !== null && f !== undefined).length;
  return Math.round((present / fields.length) * 100) / 100;
}
