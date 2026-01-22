/**
 * Best Efforts Calculator
 * Calcul des meilleurs efforts sur différentes durées (sliding window)
 */

import type { FitRecord, BestEfforts } from "./types";

// Durées en secondes pour chaque best effort
const EFFORT_DURATIONS = {
  p5s: 5,
  p15s: 15,
  p30s: 30,
  p60s: 60,
  p5min: 300,
  p8min: 480,
  p12min: 720,
  p20min: 1200,
  p40min: 2400,
  p60min: 3600,
} as const;

type EffortKey = keyof typeof EFFORT_DURATIONS;

interface EffortResult {
  power: number;
  heartRate?: number;
  startTime: Date;
  endTime: Date;
}

/**
 * Calcule tous les best efforts depuis les records FIT
 */
export function calculateBestEfforts(records: FitRecord[]): BestEfforts {
  if (records.length < 2) {
    return {};
  }

  // Filtrer les records avec puissance valide
  const powerRecords = records.filter(
    (r) => r.powerW !== undefined && r.powerW > 0
  );

  if (powerRecords.length < 5) {
    return {};
  }

  const bestEfforts: BestEfforts = {};
  const timestamps: Record<string, Date> = {};

  // Calculer la durée totale disponible
  const totalDurationSec =
    (powerRecords[powerRecords.length - 1].timestamp.getTime() -
      powerRecords[0].timestamp.getTime()) /
    1000;

  // Pour chaque durée, calculer le meilleur effort
  for (const [key, durationSec] of Object.entries(EFFORT_DURATIONS)) {
    // Ne pas calculer si la durée est plus longue que l'activité
    if (durationSec > totalDurationSec * 1.1) {
      continue;
    }

    const result = findBestEffortForDuration(powerRecords, durationSec);
    if (result) {
      const powerKey = key as EffortKey;
      const hrKey = key.replace("p", "hr") as keyof BestEfforts;

      bestEfforts[powerKey] = Math.round(result.power);
      if (result.heartRate) {
        (bestEfforts as Record<string, number | undefined>)[hrKey] = Math.round(result.heartRate);
      }
      timestamps[key] = result.startTime;
    }
  }

  bestEfforts.timestamps = timestamps;

  return bestEfforts;
}

/**
 * Trouve le meilleur effort pour une durée donnée (sliding window)
 */
function findBestEffortForDuration(
  records: FitRecord[],
  durationSec: number
): EffortResult | null {
  if (records.length < 2) return null;

  let bestPower = 0;
  let bestResult: EffortResult | null = null;

  // Approche sliding window
  let windowStart = 0;
  let windowPowerSum = 0;
  let windowHrSum = 0;
  let windowHrCount = 0;
  let windowCount = 0;

  for (let windowEnd = 0; windowEnd < records.length; windowEnd++) {
    const currentRecord = records[windowEnd];
    windowPowerSum += currentRecord.powerW ?? 0;
    windowCount++;
    if (currentRecord.heartRate) {
      windowHrSum += currentRecord.heartRate;
      windowHrCount++;
    }

    // Calculer la durée de la fenêtre actuelle
    const windowDuration =
      (currentRecord.timestamp.getTime() -
        records[windowStart].timestamp.getTime()) /
      1000;

    // Si la fenêtre est trop large, réduire depuis le début
    while (
      windowStart < windowEnd &&
      windowDuration > durationSec
    ) {
      const startRecord = records[windowStart];
      windowPowerSum -= startRecord.powerW ?? 0;
      windowCount--;
      if (startRecord.heartRate) {
        windowHrSum -= startRecord.heartRate;
        windowHrCount--;
      }
      windowStart++;
    }

    // Si on a une fenêtre valide de la bonne durée
    const actualDuration =
      windowStart < windowEnd
        ? (currentRecord.timestamp.getTime() -
            records[windowStart].timestamp.getTime()) /
          1000
        : 0;

    // Tolérance de 10% sur la durée
    if (
      actualDuration >= durationSec * 0.9 &&
      actualDuration <= durationSec * 1.1 &&
      windowCount > 0
    ) {
      const avgPower = windowPowerSum / windowCount;

      if (avgPower > bestPower) {
        bestPower = avgPower;
        bestResult = {
          power: avgPower,
          heartRate: windowHrCount > 0 ? windowHrSum / windowHrCount : undefined,
          startTime: records[windowStart].timestamp,
          endTime: currentRecord.timestamp,
        };
      }
    }
  }

  return bestResult;
}

/**
 * Calcule la puissance normalisée (NP) si non fournie
 */
export function calculateNormalizedPower(records: FitRecord[]): number | undefined {
  const powerRecords = records.filter(
    (r) => r.powerW !== undefined && r.powerW > 0
  );

  if (powerRecords.length < 30) return undefined;

  // Rolling average sur 30 secondes
  const rollingPowers: number[] = [];
  const windowSize = 30; // 30 seconds

  for (let i = windowSize - 1; i < powerRecords.length; i++) {
    let sum = 0;
    let count = 0;

    for (let j = i - windowSize + 1; j <= i; j++) {
      const timeDiff =
        (powerRecords[i].timestamp.getTime() -
          powerRecords[j].timestamp.getTime()) /
        1000;

      if (timeDiff <= windowSize) {
        sum += powerRecords[j].powerW ?? 0;
        count++;
      }
    }

    if (count > 0) {
      rollingPowers.push(sum / count);
    }
  }

  if (rollingPowers.length === 0) return undefined;

  // NP = racine quatrième de la moyenne des puissances ^4
  const fourthPowers = rollingPowers.map((p) => Math.pow(p, 4));
  const avgFourthPower =
    fourthPowers.reduce((a, b) => a + b, 0) / fourthPowers.length;

  return Math.round(Math.pow(avgFourthPower, 0.25));
}

/**
 * Analyse la variabilité de puissance (VI - Variability Index)
 */
export function calculateVariabilityIndex(
  normalizedPower: number | undefined,
  avgPower: number | undefined
): number | undefined {
  if (!normalizedPower || !avgPower || avgPower === 0) return undefined;
  return normalizedPower / avgPower;
}

/**
 * Calcule le coefficient de variation de la puissance
 */
export function calculatePowerCV(records: FitRecord[]): number | undefined {
  const powers = records
    .map((r) => r.powerW)
    .filter((p): p is number => p !== undefined && p > 0);

  if (powers.length < 10) return undefined;

  const mean = powers.reduce((a, b) => a + b, 0) / powers.length;
  if (mean === 0) return undefined;

  const variance =
    powers.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / powers.length;
  const stdDev = Math.sqrt(variance);

  return stdDev / mean;
}
