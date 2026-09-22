/**
 * FIT Session Analyzer
 * Orchestrateur principal pour l'analyse complète d'un fichier FIT
 */

import type {
  FitSession,
  FitAnalysisResult,
  DetectedTestType,
  TestTypeDetection,
} from "./types";
import { calculateBestEfforts, calculateNormalizedPower } from "./bestEfforts";
import { detectTestType, detectRunTestType } from "./testDetector";
import {
  estimateFtp,
  calculateTteObservation,
  calculateDriftAnalysis,
  evaluateProtocolQuality,
} from "./metricsCalculator";
import { calculateRunBestEfforts } from "./runningBestEfforts";
import {
  estimatePaceThreshold,
  estimateVma,
  calculateRunTteObservation,
  evaluateRunProtocolQuality,
} from "./runningMetricsCalculator";

/**
 * Une séance de course (même avec capteur de puissance course, type Stryd)
 * n'est PAS un test vélo : FTP, TTE-au-seuil et détection de type de test
 * sont tous calibrés pour de la puissance vélo (coefficients, laps, seuils
 * de watts). Sans ce garde-fou, un semi-marathon avec puissance course
 * (ex: 500-700W) était classé "FTP_20MIN" par detectTestType (qui ne
 * regarde que la forme du signal de puissance, jamais le sport) et
 * produisait une "FTP" de plusieurs centaines de watts, aberrante pour du
 * vélo — bug remonté par le coach après un import de semi-marathon.
 * L'Économie de Course (analyzeRunningEconomy, appelée séparément dans
 * FitImportDialog) reste le chemin d'analyse dédié à la course.
 */
export function isRunningSession(session: FitSession): boolean {
  return (session.sport ?? "").toLowerCase().includes("run");
}

/**
 * Analyse complète d'une session FIT
 *
 * `existingPaceThresholdSecPerKm` est l'équivalent course de `existingFtp` :
 * une allure seuil DÉJÀ validée (ex: snapshot.pace_threshold_sec_per_km),
 * jamais une allure recalculée dans cette même séance — nécessaire pour que
 * la TTE course (CAP D6) ne soit jamais mesurée contre un seuil "frais"
 * (même règle que le vélo, cf. commentaire plus bas).
 */
export function analyzeFitSession(
  session: FitSession,
  overrideTestType?: DetectedTestType,
  existingFtp?: number,
  existingPaceThresholdSecPerKm?: number
): FitAnalysisResult {
  const isRun = isRunningSession(session);

  // 1. Calculer les best efforts puissance (vélo, ou bonus puissance course
  // type Stryd) et vitesse/allure (course)
  const bestEfforts = calculateBestEfforts(session.records);
  const runBestEfforts = isRun ? calculateRunBestEfforts(session.records) : undefined;

  // 2. Calculer NP si non présent
  if (!session.normalizedPower) {
    session.normalizedPower = calculateNormalizedPower(session.records);
  }

  // 3. Détecter le type de test — puissance vélo, ou vitesse/allure course
  // (deux chemins de détection disjoints, jamais un signal de puissance
  // course interprété comme un test vélo — cf. isRunningSession ci-dessus)
  const detectedTestType: TestTypeDetection = isRun
    ? detectRunTestType(session, runBestEfforts ?? {}, existingPaceThresholdSecPerKm)
    : detectTestType(session, bestEfforts);
  const effectiveTestType = overrideTestType ?? detectedTestType.type;

  // Mettre à jour la détection si override
  const testType = overrideTestType
    ? { ...detectedTestType, type: overrideTestType, reasoning: `Type sélectionné manuellement: ${overrideTestType}` }
    : detectedTestType;

  // 4. Estimer FTP (vélo uniquement)
  const ftpEstimate = isRun ? undefined : estimateFtp(effectiveTestType, bestEfforts, session);

  // 5. Calculer MAP (P5min) — concept vélo (snapshot.map5min_w)
  const mapEstimate = isRun ? undefined : bestEfforts.p5min;

  // 5bis. Allure seuil (CAP D5) et VMA (CAP D3) — course uniquement
  const paceThresholdEstimate = isRun
    ? estimatePaceThreshold(effectiveTestType, runBestEfforts ?? {})
    : undefined;
  const vmaEstimate =
    isRun && effectiveTestType === "VMA_TEST" ? estimateVma(runBestEfforts ?? {}) : undefined;

  // 6. Calculer TTE observé — UNIQUEMENT au FTP DÉJÀ validé (existingFtp),
  // jamais à un FTP fraîchement estimé dans CETTE MÊME séance. Coach fix
  // (audit "FTP et TTE mélangés") : mesurer les deux dans le même effort est
  // méthodologiquement bancal — un pacing soutenable pour un FTP propre
  // contredit un pacing poussé à l'échec pour une vraie TTE. La semaine de
  // test sépare maintenant FTP (D5) et TTE (D7, testée au FTP de D5).
  const ftpForTte = isRun ? undefined : existingFtp;
  const tteObservation = ftpForTte
    ? calculateTteObservation(session, ftpForTte)
    : undefined;

  // 6bis. TTE course (CAP D6) — même règle, uniquement à l'allure seuil DÉJÀ
  // validée (existingPaceThresholdSecPerKm), jamais recalculée sur place.
  const runTteObservation =
    isRun && existingPaceThresholdSecPerKm
      ? calculateRunTteObservation(session, existingPaceThresholdSecPerKm)
      : undefined;

  // 7. Analyse de drift (Pa:HR vélo — la course a sa propre analyse dédiée
  // via analyzeRunningEconomy, appelée séparément dans FitImportDialog)
  const driftAnalysis =
    !isRun && (session.movingTimeSec >= 3600 || effectiveTestType === "Z2_DRIFT")
      ? calculateDriftAnalysis(session)
      : undefined;

  // 8. Évaluer la qualité du protocole (chemin dédié course : la puissance
  // n'est jamais un prérequis, contrairement au vélo)
  const protocolQuality = isRun
    ? evaluateRunProtocolQuality(session, effectiveTestType)
    : evaluateProtocolQuality(session, effectiveTestType);

  // 9. Compiler les métriques brutes
  const rawMetrics = {
    avgPower: session.avgPower,
    maxPower: session.maxPower,
    avgHr: session.avgHeartRate,
    maxHr: session.maxHeartRate,
    avgCadence: session.avgCadence,
    totalDuration: session.totalTimeSec,
    movingTime: session.movingTimeSec,
    normalizedPower: session.normalizedPower,
  };

  return {
    session,
    testType,
    bestEfforts,
    ftpEstimate,
    mapEstimate,
    tteObservation,
    driftAnalysis,
    runBestEfforts,
    paceThresholdEstimate,
    vmaEstimate,
    runTteObservation,
    protocolQuality,
    rawMetrics,
  };
}

/**
 * Génère un résumé textuel de l'analyse
 */
export function generateAnalysisSummary(result: FitAnalysisResult): string {
  const lines: string[] = [];

  // Type de test
  const confLabel = result.testType.confidence >= 0.8 ? "élevée" : result.testType.confidence >= 0.6 ? "modérée" : "limitée";
  lines.push(`**Type de test:** ${formatTestType(result.testType.type)} (fiabilité ${confLabel})`);

  // Best efforts
  const efforts: string[] = [];
  if (result.bestEfforts.p5s) efforts.push(`P5s: ${result.bestEfforts.p5s}W`);
  if (result.bestEfforts.p30s) efforts.push(`P30s: ${result.bestEfforts.p30s}W`);
  if (result.bestEfforts.p60s) efforts.push(`P60s: ${result.bestEfforts.p60s}W`);
  if (result.bestEfforts.p5min) efforts.push(`P5min: ${result.bestEfforts.p5min}W`);
  if (result.bestEfforts.p20min) efforts.push(`P20min: ${result.bestEfforts.p20min}W`);
  if (efforts.length > 0) {
    lines.push(`**Best Efforts:** ${efforts.join(" • ")}`);
  }

  // FTP
  if (result.ftpEstimate) {
    lines.push(`**FTP estimée:** ${result.ftpEstimate.ftpWatts}W (${result.ftpEstimate.method})`);
  }

  // MAP
  if (result.mapEstimate) {
    lines.push(`**MAP (P5min):** ${result.mapEstimate}W`);
  }

  // TTE
  if (result.tteObservation) {
    lines.push(`**TTE observé:** ${result.tteObservation.tteMinutes} min`);
  }

  // Drift
  if (result.driftAnalysis?.isValid) {
    lines.push(`**Drift Pa:HR:** ${result.driftAnalysis.driftPercent.toFixed(1)}% (${result.driftAnalysis.driftLevel})`);
  }

  // Qualité
  lines.push(`**Qualité protocole:** ${result.protocolQuality.score}/5 — ${result.protocolQuality.justification}`);

  return lines.join("\n");
}

/**
 * Formate le type de test pour affichage
 */
export function formatTestType(type: DetectedTestType): string {
  const labels: Record<DetectedTestType, string> = {
    FTP_20MIN: "FTP 20 min",
    FTP_2x8MIN: "FTP 2×8 min",
    FTP_RAMP: "FTP Ramp",
    MAP_5MIN: "MAP 5 min",
    SPRINT_15S: "Sprint 15s",
    SPRINT_30S: "Sprint 30s",
    SPRINT_60S: "Sprint 60s",
    Z2_DRIFT: "Sortie Z2 (Drift)",
    TTE_THRESHOLD: "TTE au seuil",
    RUN_ECONOMY: "Économie Course",
    VMA_TEST: "Test VMA",
    THRESHOLD_RUN_30MIN: "Allure Seuil 30 min",
    UNKNOWN: "Non identifié",
  };
  return labels[type] ?? type;
}

/**
 * Calcule la confiance globale de l'analyse
 */
export function calculateOverallConfidence(result: FitAnalysisResult): number {
  let confidence = result.testType.confidence;

  // Ajuster selon qualité protocole
  if (result.protocolQuality.score >= 4) {
    confidence = Math.min(1, confidence + 0.1);
  } else if (result.protocolQuality.score <= 2) {
    confidence = Math.max(0.2, confidence - 0.2);
  }

  // Ajuster si pas de données clés (vélo : FTP : course : allure seuil/VMA/TTE)
  const isRun = result.runBestEfforts !== undefined;
  const hasKeyRunMetric =
    !!result.paceThresholdEstimate || !!result.vmaEstimate || !!result.runTteObservation;
  if (result.testType.type !== "UNKNOWN") {
    if (!isRun && !result.ftpEstimate) {
      confidence *= 0.8;
    } else if (isRun && !hasKeyRunMetric) {
      confidence *= 0.8;
    }
  }

  return Math.round(confidence * 100) / 100;
}
