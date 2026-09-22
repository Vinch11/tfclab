/**
 * Running Best Efforts Calculator
 * Calcul des meilleures allures (vitesse, m/s en interne) sur différentes
 * durées — miroir de bestEfforts.ts, mais sur `speed` plutôt que `powerW`.
 * Convention (cf. runningEconomyAnalyzer.ts) : vitesse moyenne en m/s,
 * convertie en pace (sec/km = 1000/vitesse) ou en km/h (vitesse × 3.6)
 * selon le champ de destination.
 */

import type { FitRecord, RunBestEfforts } from "./types";

const RUN_EFFORT_DURATIONS = {
  speed15s: 15,
  speed30s: 30,
  speed60s: 60,
  speed5min: 300,
  speed6min: 360,
  speed8min: 480,
  speed12min: 720,
  speed20min: 1200,
  speed30min: 1800,
} as const;

type RunEffortKey = keyof typeof RUN_EFFORT_DURATIONS;

interface RunEffortResult {
  speed: number; // m/s
  heartRate?: number;
  startTime: Date;
  endTime: Date;
}

/**
 * Calcule toutes les meilleures allures depuis les records FIT
 */
export function calculateRunBestEfforts(records: FitRecord[]): RunBestEfforts {
  if (records.length < 2) {
    return {};
  }

  const speedRecords = records.filter(
    (r) => r.speed !== undefined && r.speed > 0.5 // > 1.8 km/h — exclut arrêts/marche
  );

  if (speedRecords.length < 5) {
    return {};
  }

  const runBestEfforts: RunBestEfforts = {};
  const timestamps: Record<string, Date> = {};

  const totalDurationSec =
    (speedRecords[speedRecords.length - 1].timestamp.getTime() -
      speedRecords[0].timestamp.getTime()) /
    1000;

  for (const [key, durationSec] of Object.entries(RUN_EFFORT_DURATIONS)) {
    if (durationSec > totalDurationSec * 1.1) {
      continue;
    }

    const result = findBestSpeedForDuration(speedRecords, durationSec);
    if (result) {
      const speedKey = key as RunEffortKey;
      const hrKey = key.replace("speed", "hr") as keyof RunBestEfforts;

      runBestEfforts[speedKey] = Math.round(result.speed * 1000) / 1000;
      if (result.heartRate) {
        (runBestEfforts as Record<string, number | undefined>)[hrKey] = Math.round(result.heartRate);
      }
      timestamps[key] = result.startTime;
    }
  }

  runBestEfforts.timestamps = timestamps;

  return runBestEfforts;
}

/**
 * Trouve la meilleure allure (vitesse) pour une durée donnée (sliding window)
 */
function findBestSpeedForDuration(
  records: FitRecord[],
  durationSec: number
): RunEffortResult | null {
  if (records.length < 2) return null;

  let bestSpeed = 0;
  let bestResult: RunEffortResult | null = null;

  let windowStart = 0;
  let windowSpeedSum = 0;
  let windowHrSum = 0;
  let windowHrCount = 0;
  let windowCount = 0;

  for (let windowEnd = 0; windowEnd < records.length; windowEnd++) {
    const currentRecord = records[windowEnd];
    windowSpeedSum += currentRecord.speed ?? 0;
    windowCount++;
    if (currentRecord.heartRate) {
      windowHrSum += currentRecord.heartRate;
      windowHrCount++;
    }

    const windowDuration =
      (currentRecord.timestamp.getTime() -
        records[windowStart].timestamp.getTime()) /
      1000;

    while (windowStart < windowEnd && windowDuration > durationSec) {
      const startRecord = records[windowStart];
      windowSpeedSum -= startRecord.speed ?? 0;
      windowCount--;
      if (startRecord.heartRate) {
        windowHrSum -= startRecord.heartRate;
        windowHrCount--;
      }
      windowStart++;
    }

    const actualDuration =
      windowStart < windowEnd
        ? (currentRecord.timestamp.getTime() -
            records[windowStart].timestamp.getTime()) /
          1000
        : 0;

    if (
      actualDuration >= durationSec * 0.9 &&
      actualDuration <= durationSec * 1.1 &&
      windowCount > 0
    ) {
      const avgSpeed = windowSpeedSum / windowCount;

      if (avgSpeed > bestSpeed) {
        bestSpeed = avgSpeed;
        bestResult = {
          speed: avgSpeed,
          heartRate: windowHrCount > 0 ? windowHrSum / windowHrCount : undefined,
          startTime: records[windowStart].timestamp,
          endTime: currentRecord.timestamp,
        };
      }
    }
  }

  return bestResult;
}

/** Convertit une vitesse (m/s) en allure (sec/km) */
export function speedToPaceSecPerKm(speedMs: number): number {
  return speedMs > 0 ? 1000 / speedMs : 0;
}

/** Convertit une allure (sec/km) en vitesse (m/s) */
export function paceSecPerKmToSpeed(paceSecPerKm: number): number {
  return paceSecPerKm > 0 ? 1000 / paceSecPerKm : 0;
}

/** Convertit une vitesse (m/s) en km/h */
export function speedToKmh(speedMs: number): number {
  return speedMs * 3.6;
}

/**
 * Calcule le coefficient de variation de la vitesse (mirroir calculatePowerCV)
 */
export function calculateSpeedCV(records: FitRecord[]): number | undefined {
  const speeds = records
    .map((r) => r.speed)
    .filter((s): s is number => s !== undefined && s > 0.5);

  if (speeds.length < 10) return undefined;

  const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  if (mean === 0) return undefined;

  const variance =
    speeds.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / speeds.length;
  const stdDev = Math.sqrt(variance);

  return stdDev / mean;
}
