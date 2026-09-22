/**
 * Running Metrics Calculator
 * Calcul allure seuil, VMA, TTE course, qualité protocole — miroir de
 * metricsCalculator.ts (vélo), mais sur vitesse/allure (jamais la puissance).
 */

import type {
  FitSession,
  RunBestEfforts,
  DetectedTestType,
  PaceThresholdEstimate,
  VmaEstimate,
  RunTteObservation,
  ProtocolQuality,
} from "./types";
import { speedToPaceSecPerKm, speedToKmh, paceSecPerKmToSpeed, calculateSpeedCV } from "./runningBestEfforts";

/**
 * Estime l'allure seuil selon le type de test détecté.
 * CAP D5 = effort maximal soutenable de 30 min DIRECT (pas de coefficient de
 * correction comme le FTP vélo — le protocole enregistre l'allure moyenne
 * des 30 min telle quelle, cf. capTestingWeek.ts D5 dataToRecord).
 */
export function estimatePaceThreshold(
  testType: DetectedTestType,
  runBestEfforts: RunBestEfforts
): PaceThresholdEstimate | undefined {
  if (testType !== "THRESHOLD_RUN_30MIN") return undefined;

  const speed30min = runBestEfforts.speed30min;
  if (!speed30min) return undefined;

  const paceSecPerKm = Math.round(speedToPaceSecPerKm(speed30min));

  return {
    paceSecPerKm,
    method: "Allure seuil 30 min (mesure directe)",
    basePaceSecPerKm: paceSecPerKm,
    confidence: 0.85,
    notes: "Effort maximal soutenable de 30 min — aucun coefficient de correction (protocole CAP D5)",
  };
}

/**
 * Estime la VMA depuis le meilleur effort ~6 min (fallback "6 min all-out"
 * documenté dans capTestingWeek.ts D3 Option B). Le protocole VAMEVAL
 * (Option A, incrémental) n'est pas auto-détectable de façon fiable sans
 * données de palier — l'estimation reste donc conservatrice (biais +3-5%
 * documenté dans le protocole lui-même, à corriger manuellement si besoin).
 */
export function estimateVma(runBestEfforts: RunBestEfforts): VmaEstimate | undefined {
  const speed6min = runBestEfforts.speed6min;
  if (!speed6min) return undefined;

  return {
    vmaKmh: Math.round(speedToKmh(speed6min) * 10) / 10,
    method: "VMA depuis meilleur effort 6 min (all-out)",
    confidence: 0.65,
    notes: "Méthode 6 min all-out — surestime la VMA de 3-5% vs VAMEVAL (cf. protocole CAP D3, à corriger si test VAMEVAL réalisé)",
  };
}

/**
 * Calcule la TTE course observée — UNIQUEMENT à une allure seuil DÉJÀ
 * validée (existingPaceThresholdSecPerKm), jamais une allure recalculée
 * dans cette même séance (coach fix "allure seuil et TTE mélangées" — même
 * règle que le vélo, cf. calculateTteObservation). Algorithme identique
 * (sentinel -1) à celui utilisé côté vélo, sur speed au lieu de powerW.
 */
export function calculateRunTteObservation(
  session: FitSession,
  targetPaceSecPerKm: number,
  intensityTolerance: number = 0.95
): RunTteObservation | undefined {
  if (!targetPaceSecPerKm || targetPaceSecPerKm <= 0) return undefined;

  const targetSpeed = paceSecPerKmToSpeed(targetPaceSecPerKm);
  // Tolérance sur la VITESSE : une vitesse ≥ 95% de la vitesse cible équivaut
  // à une allure ≤ ~105% de l'allure cible (plus rapide ou légèrement plus
  // lent que le seuil = toujours "tenu").
  const targetSpeedFloor = targetSpeed * intensityTolerance;

  const records = session.records.filter((r) => r.speed !== undefined && r.speed > 0.5);
  if (records.length < 60) return undefined;

  let maxDuration = 0;
  let currentStart = -1;
  let bestStart = 0;
  let bestEnd = 0;

  const pauseThresholdMs = 5000;

  for (let i = 0; i < records.length; i++) {
    const speed = records[i].speed!;
    const isAboveThreshold = speed >= targetSpeedFloor;

    if (isAboveThreshold) {
      if (currentStart === -1) {
        currentStart = i;
      } else if (i > 0) {
        const timeDiff = records[i].timestamp.getTime() - records[i - 1].timestamp.getTime();
        if (timeDiff > pauseThresholdMs) {
          currentStart = i;
        }
      }

      const elapsed =
        (records[i].timestamp.getTime() - records[currentStart].timestamp.getTime()) / 1000;

      if (elapsed > maxDuration) {
        maxDuration = elapsed;
        bestStart = currentStart;
        bestEnd = i;
      }
    } else {
      currentStart = -1;
    }
  }

  if (maxDuration < 60) return undefined;

  let speedSum = 0;
  let count = 0;
  for (let i = bestStart; i <= bestEnd; i++) {
    speedSum += records[i].speed!;
    count++;
  }
  const avgSpeedDuringTte = count > 0 ? speedSum / count : 0;

  const tteMinutes = maxDuration / 60;
  let confidence = 0.5;
  if (tteMinutes >= 30) confidence = 0.85;
  else if (tteMinutes >= 20) confidence = 0.75;
  else if (tteMinutes >= 10) confidence = 0.65;

  return {
    tteMinutes: Math.round(tteMinutes * 10) / 10,
    targetPaceSecPerKm,
    continuousDurationSec: Math.round(maxDuration),
    avgPaceSecPerKmDuringTte: Math.round(speedToPaceSecPerKm(avgSpeedDuringTte)),
    confidence,
    notes: `Durée continue à l'allure seuil (${Math.round(intensityTolerance * 100)}% tolérance)`,
  };
}

/**
 * Évalue la qualité du protocole course — miroir de evaluateProtocolQuality
 * (vélo), sur la vitesse/allure. La puissance course (Stryd) reste un bonus
 * si présente, jamais un prérequis (contrairement au vélo).
 */
export function evaluateRunProtocolQuality(
  session: FitSession,
  testType: DetectedTestType
): ProtocolQuality {
  const records = session.records;

  const hasSpeed = records.some((r) => r.speed !== undefined && r.speed > 0.5);
  const hasHr = records.some((r) => r.heartRate !== undefined);
  const hasPower = records.some((r) => r.powerW !== undefined);

  const cv = calculateSpeedCV(records) ?? 1;

  let pauseCount = 0;
  for (let i = 1; i < records.length; i++) {
    const delta = records[i].timestamp.getTime() - records[i - 1].timestamp.getTime();
    if (delta > 10000) pauseCount++;
  }
  const noPauses = pauseCount === 0;

  const speeds = records
    .filter((r) => r.speed !== undefined && r.speed > 0.5)
    .map((r) => r.speed!);
  const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
  const pacingCoherent = avgSpeed > 0 ? maxSpeed / avgSpeed < 2 : false;

  const hrs = records.filter((r) => r.heartRate !== undefined).map((r) => r.heartRate!);
  const avgHr = hrs.length > 0 ? hrs.reduce((a, b) => a + b, 0) / hrs.length : 0;
  const maxHr = hrs.length > 0 ? Math.max(...hrs) : 0;
  const hrResponseCoherent = hrs.length > 0 && avgHr > 0 ? maxHr / avgHr < 1.5 : true;

  let score = 3;

  if (hasSpeed) score += 0.5;
  if (hasHr) score += 0.3;
  if (hasPower) score += 0.2; // bonus puissance course (Stryd), jamais requis

  if (cv < 0.06) score += 0.5;
  else if (cv < 0.12) score += 0.25;
  else if (cv > 0.25) score -= 0.5;

  if (noPauses) score += 0.3;
  else score -= 0.3;

  if (pacingCoherent) score += 0.2;
  else score -= 0.3;

  if (hrResponseCoherent) score += 0.1;

  if (testType === "THRESHOLD_RUN_30MIN" && cv < 0.08) score += 0.3;
  if (testType === "UNKNOWN") score -= 0.5;

  score = Math.max(1, Math.min(5, Math.round(score * 10) / 10));

  const justifications: string[] = [];
  if (hasSpeed) justifications.push("GPS/vitesse ✓");
  else justifications.push("Pas de vitesse ✗");
  if (hasHr) justifications.push("FC ✓");
  if (hasPower) justifications.push("Puissance course ✓ (bonus)");
  if (cv < 0.12) justifications.push(`Allure stable (CV=${(cv * 100).toFixed(1)}%)`);
  else justifications.push(`Allure variable (CV=${(cv * 100).toFixed(1)}%)`);
  if (!noPauses) justifications.push(`${pauseCount} pause(s)`);
  if (!pacingCoherent) justifications.push("Pacing irrégulier");

  return {
    score: Math.round(score),
    factors: {
      powerStability: cv,
      noPauses,
      pacingCoherent,
      hrResponseCoherent,
      sensorsPresent: {
        power: hasPower,
        heartRate: hasHr,
        cadence: records.some((r) => r.cadence !== undefined),
      },
    },
    justification: justifications.join(" • "),
  };
}
