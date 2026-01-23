/**
 * FIT Session Analyzer
 * Orchestrateur principal pour l'analyse complète d'un fichier FIT
 */

import type {
  FitSession,
  FitAnalysisResult,
  DetectedTestType,
} from "./types";
import { calculateBestEfforts, calculateNormalizedPower } from "./bestEfforts";
import { detectTestType } from "./testDetector";
import {
  estimateFtp,
  calculateTteObservation,
  calculateDriftAnalysis,
  evaluateProtocolQuality,
} from "./metricsCalculator";

/**
 * Analyse complète d'une session FIT
 */
export function analyzeFitSession(
  session: FitSession,
  overrideTestType?: DetectedTestType,
  existingFtp?: number
): FitAnalysisResult {
  // 1. Calculer les best efforts
  const bestEfforts = calculateBestEfforts(session.records);

  // 2. Calculer NP si non présent
  if (!session.normalizedPower) {
    session.normalizedPower = calculateNormalizedPower(session.records);
  }

  // 3. Détecter le type de test
  const detectedTestType = detectTestType(session, bestEfforts);
  const effectiveTestType = overrideTestType ?? detectedTestType.type;

  // Mettre à jour la détection si override
  const testType = overrideTestType
    ? { ...detectedTestType, type: overrideTestType, reasoning: `Type sélectionné manuellement: ${overrideTestType}` }
    : detectedTestType;

  // 4. Estimer FTP
  const ftpEstimate = estimateFtp(effectiveTestType, bestEfforts, session);

  // 5. Calculer MAP (P5min)
  const mapEstimate = bestEfforts.p5min;

  // 6. Calculer TTE observé
  const ftpForTte = ftpEstimate?.ftpWatts ?? existingFtp;
  const tteObservation = ftpForTte
    ? calculateTteObservation(session, ftpForTte)
    : undefined;

  // 7. Analyse de drift (si sortie longue ou Z2)
  const driftAnalysis =
    session.movingTimeSec >= 3600 || effectiveTestType === "Z2_DRIFT"
      ? calculateDriftAnalysis(session)
      : undefined;

  // 8. Évaluer la qualité du protocole
  const protocolQuality = evaluateProtocolQuality(session, effectiveTestType);

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
  lines.push(`**Type de test:** ${formatTestType(result.testType.type)} (confiance: ${Math.round(result.testType.confidence * 100)}%)`);

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

  // Ajuster si pas de données clés
  if (!result.ftpEstimate && result.testType.type !== "UNKNOWN") {
    confidence *= 0.8;
  }

  return Math.round(confidence * 100) / 100;
}
