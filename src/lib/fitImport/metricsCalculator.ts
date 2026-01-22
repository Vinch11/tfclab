/**
 * Metrics Calculator
 * Calcul des métriques FTP, TTE, drift, qualité protocole
 */

import type {
  FitSession,
  BestEfforts,
  DetectedTestType,
  FtpEstimate,
  TteObservation,
  DriftAnalysis,
  ProtocolQuality,
} from "./types";
import { calculatePowerCV } from "./bestEfforts";

// Coefficients FTP par méthode (configurable)
const FTP_COEFFICIENTS = {
  FTP_20MIN: 0.95,
  FTP_2x8MIN: 0.90, // ou 0.93 selon protocole
  FTP_RAMP: 0.75, // MAP × 0.75
  MAP_5MIN: 0.85, // Approximation
};

/**
 * Estime la FTP selon le type de test détecté
 */
export function estimateFtp(
  testType: DetectedTestType,
  bestEfforts: BestEfforts,
  session: FitSession
): FtpEstimate | undefined {
  switch (testType) {
    case "FTP_20MIN": {
      const p20min = bestEfforts.p20min;
      if (!p20min) return undefined;
      return {
        ftpWatts: Math.round(p20min * FTP_COEFFICIENTS.FTP_20MIN),
        method: "FTP 20 min (× 0.95)",
        basePower: p20min,
        coefficient: FTP_COEFFICIENTS.FTP_20MIN,
        confidence: 0.85,
        notes: "Méthode standard Coggan",
      };
    }

    case "FTP_2x8MIN": {
      const p8min = bestEfforts.p8min;
      if (!p8min) return undefined;
      // Prendre la moyenne des 2 meilleurs 8 min (approximation via p8min)
      return {
        ftpWatts: Math.round(p8min * FTP_COEFFICIENTS.FTP_2x8MIN),
        method: "FTP 2×8 min (× 0.90)",
        basePower: p8min,
        coefficient: FTP_COEFFICIENTS.FTP_2x8MIN,
        confidence: 0.8,
        notes: "Méthode Hunter Allen",
      };
    }

    case "FTP_RAMP": {
      // MAP = puissance max atteinte dans le ramp (dernier palier complet)
      const maxPower = session.maxPower;
      if (!maxPower) return undefined;
      
      // Estimer MAP comme moyenne des 60 dernières secondes avant échec
      const p60s = bestEfforts.p60s ?? maxPower;
      const map = Math.max(p60s, maxPower * 0.85);
      
      return {
        ftpWatts: Math.round(map * FTP_COEFFICIENTS.FTP_RAMP),
        method: "FTP Ramp (MAP × 0.75)",
        basePower: map,
        coefficient: FTP_COEFFICIENTS.FTP_RAMP,
        confidence: 0.75,
        notes: "MAP estimée à partir du test progressif",
      };
    }

    case "MAP_5MIN": {
      const p5min = bestEfforts.p5min;
      if (!p5min) return undefined;
      return {
        ftpWatts: Math.round(p5min * FTP_COEFFICIENTS.MAP_5MIN),
        method: "FTP depuis MAP (× 0.85)",
        basePower: p5min,
        coefficient: FTP_COEFFICIENTS.MAP_5MIN,
        confidence: 0.65,
        notes: "Estimation approximative depuis P5min",
      };
    }

    default:
      return undefined;
  }
}

/**
 * Calcule le TTE observé
 */
export function calculateTteObservation(
  session: FitSession,
  ftpWatts: number,
  intensityThreshold: number = 0.95
): TteObservation | undefined {
  if (!ftpWatts || ftpWatts <= 0) return undefined;

  const targetPower = ftpWatts * intensityThreshold;
  const records = session.records.filter((r) => r.powerW !== undefined);

  if (records.length < 60) return undefined;

  // Chercher la plus longue séquence continue au-dessus du seuil
  let maxDuration = 0;
  let currentDuration = 0;
  let currentStart = 0;
  let bestStart = 0;
  let bestEnd = 0;
  let powerSum = 0;
  let powerCount = 0;

  const pauseThresholdMs = 5000; // 5 secondes de pause max

  for (let i = 0; i < records.length; i++) {
    const power = records[i].powerW!;
    const isAboveThreshold = power >= targetPower * 0.95; // Tolérance de 5%

    if (isAboveThreshold) {
      if (currentDuration === 0) {
        currentStart = i;
      }

      // Vérifier s'il n'y a pas eu de pause
      if (i > 0) {
        const timeDiff =
          records[i].timestamp.getTime() - records[i - 1].timestamp.getTime();
        if (timeDiff > pauseThresholdMs) {
          // Reset si pause
          currentDuration = 0;
          powerSum = 0;
          powerCount = 0;
          currentStart = i;
        }
      }

      const elapsed =
        (records[i].timestamp.getTime() -
          records[currentStart].timestamp.getTime()) /
        1000;
      currentDuration = elapsed;
      powerSum += power;
      powerCount++;

      if (currentDuration > maxDuration) {
        maxDuration = currentDuration;
        bestStart = currentStart;
        bestEnd = i;
      }
    } else {
      currentDuration = 0;
      powerSum = 0;
      powerCount = 0;
    }
  }

  if (maxDuration < 60) return undefined; // Au moins 1 minute

  // Calculer la puissance moyenne pendant le TTE
  let avgPower = 0;
  let count = 0;
  for (let i = bestStart; i <= bestEnd; i++) {
    avgPower += records[i].powerW!;
    count++;
  }
  avgPower = count > 0 ? avgPower / count : 0;

  // Confidence basée sur la durée et la stabilité
  const tteMinutes = maxDuration / 60;
  let confidence = 0.5;
  if (tteMinutes >= 30) confidence = 0.85;
  else if (tteMinutes >= 20) confidence = 0.75;
  else if (tteMinutes >= 10) confidence = 0.65;

  return {
    tteMinutes: Math.round(tteMinutes * 10) / 10,
    targetFtp: ftpWatts,
    intensityThreshold,
    continuousDurationSec: Math.round(maxDuration),
    avgPowerDuringTte: Math.round(avgPower),
    confidence,
    notes: `Durée continue ≥${Math.round(intensityThreshold * 100)}% FTP`,
  };
}

/**
 * Calcule l'analyse de drift/decoupling
 */
export function calculateDriftAnalysis(
  session: FitSession,
  segmentDurationMin: number = 60
): DriftAnalysis | undefined {
  const records = session.records.filter(
    (r) => r.powerW !== undefined && r.heartRate !== undefined
  );

  if (records.length < 100) {
    return undefined;
  }

  const totalDuration = session.movingTimeSec / 60;
  if (totalDuration < segmentDurationMin * 0.8) {
    return {
      driftPercent: 0,
      powerAvg1stHalf: 0,
      hrAvg1stHalf: 0,
      powerAvg2ndHalf: 0,
      hrAvg2ndHalf: 0,
      ratio1stHalf: 0,
      ratio2ndHalf: 0,
      driftLevel: "low",
      segmentDurationMin: totalDuration,
      isValid: false,
      invalidReason: "Durée insuffisante pour analyse de drift",
    };
  }

  // Sélectionner un segment stable (éviter échauffement/récupération)
  const startOffset = Math.floor(records.length * 0.1); // Skip 10% début
  const endOffset = Math.floor(records.length * 0.95); // Skip 5% fin
  const segment = records.slice(startOffset, endOffset);

  const midPoint = Math.floor(segment.length / 2);
  const firstHalf = segment.slice(0, midPoint);
  const secondHalf = segment.slice(midPoint);

  // Calculer moyennes
  const powerAvg1stHalf = average(firstHalf.map((r) => r.powerW!));
  const hrAvg1stHalf = average(firstHalf.map((r) => r.heartRate!));
  const powerAvg2ndHalf = average(secondHalf.map((r) => r.powerW!));
  const hrAvg2ndHalf = average(secondHalf.map((r) => r.heartRate!));

  if (hrAvg1stHalf === 0 || hrAvg2ndHalf === 0) {
    return {
      driftPercent: 0,
      powerAvg1stHalf,
      hrAvg1stHalf,
      powerAvg2ndHalf,
      hrAvg2ndHalf,
      ratio1stHalf: 0,
      ratio2ndHalf: 0,
      driftLevel: "low",
      segmentDurationMin: (segment.length / records.length) * totalDuration,
      isValid: false,
      invalidReason: "Données de fréquence cardiaque manquantes",
    };
  }

  // Ratio Puissance / FC
  const ratio1stHalf = powerAvg1stHalf / hrAvg1stHalf;
  const ratio2ndHalf = powerAvg2ndHalf / hrAvg2ndHalf;

  // Calcul du drift
  const driftPercent = ((ratio1stHalf - ratio2ndHalf) / ratio1stHalf) * 100;

  // Classification
  let driftLevel: "low" | "moderate" | "high" = "low";
  if (Math.abs(driftPercent) > 5) driftLevel = "high";
  else if (Math.abs(driftPercent) > 2.5) driftLevel = "moderate";

  return {
    driftPercent: Math.round(driftPercent * 100) / 100,
    powerAvg1stHalf: Math.round(powerAvg1stHalf),
    hrAvg1stHalf: Math.round(hrAvg1stHalf),
    powerAvg2ndHalf: Math.round(powerAvg2ndHalf),
    hrAvg2ndHalf: Math.round(hrAvg2ndHalf),
    ratio1stHalf: Math.round(ratio1stHalf * 100) / 100,
    ratio2ndHalf: Math.round(ratio2ndHalf * 100) / 100,
    driftLevel,
    segmentDurationMin: Math.round(
      ((segment.length / records.length) * totalDuration) * 10
    ) / 10,
    isValid: true,
  };
}

/**
 * Évalue la qualité du protocole
 */
export function evaluateProtocolQuality(
  session: FitSession,
  testType: DetectedTestType
): ProtocolQuality {
  const records = session.records;
  
  // Capteurs présents
  const hasPower = records.some((r) => r.powerW !== undefined);
  const hasHr = records.some((r) => r.heartRate !== undefined);
  const hasCadence = records.some((r) => r.cadence !== undefined);

  // Calculer la stabilité de puissance (CV)
  const cv = calculatePowerCV(records) ?? 1;
  const powerStability = cv;

  // Vérifier les pauses
  let pauseCount = 0;
  for (let i = 1; i < records.length; i++) {
    const delta =
      records[i].timestamp.getTime() - records[i - 1].timestamp.getTime();
    if (delta > 10000) pauseCount++; // Pause > 10s
  }
  const noPauses = pauseCount === 0;

  // Pacing cohérent (pas de gros écarts)
  const powers = records
    .filter((r) => r.powerW !== undefined)
    .map((r) => r.powerW!);
  const avgPower = average(powers);
  const maxPower = Math.max(...powers);
  const pacingCoherent = maxPower / avgPower < 2;

  // HR response cohérente
  const hrs = records
    .filter((r) => r.heartRate !== undefined)
    .map((r) => r.heartRate!);
  const avgHr = average(hrs);
  const maxHr = Math.max(...hrs);
  const hrResponseCoherent = hrs.length > 0 ? maxHr / avgHr < 1.5 : true;

  // Calcul du score (1-5)
  let score = 3;

  if (hasPower) score += 0.5;
  if (hasHr) score += 0.3;
  if (hasCadence) score += 0.2;

  if (cv < 0.1) score += 0.5;
  else if (cv < 0.2) score += 0.25;
  else if (cv > 0.3) score -= 0.5;

  if (noPauses) score += 0.3;
  else score -= 0.3;

  if (pacingCoherent) score += 0.2;
  else score -= 0.3;

  if (hrResponseCoherent) score += 0.1;

  // Bonus/malus selon type de test
  if (testType === "FTP_20MIN" && cv < 0.12) score += 0.3;
  if (testType === "FTP_RAMP" && !noPauses) score -= 0.5;
  if (testType === "UNKNOWN") score -= 0.5;

  // Clamp entre 1 et 5
  score = Math.max(1, Math.min(5, Math.round(score * 10) / 10));

  // Justification textuelle
  const justifications: string[] = [];
  if (hasPower) justifications.push("Capteur puissance ✓");
  else justifications.push("Pas de puissance ✗");
  if (hasHr) justifications.push("FC ✓");
  if (cv < 0.15) justifications.push(`Puissance stable (CV=${(cv * 100).toFixed(1)}%)`);
  else justifications.push(`Puissance variable (CV=${(cv * 100).toFixed(1)}%)`);
  if (!noPauses) justifications.push(`${pauseCount} pause(s)`);
  if (!pacingCoherent) justifications.push("Pacing irrégulier");

  return {
    score: Math.round(score),
    factors: {
      powerStability,
      noPauses,
      pacingCoherent,
      hrResponseCoherent,
      sensorsPresent: {
        power: hasPower,
        heartRate: hasHr,
        cadence: hasCadence,
      },
    },
    justification: justifications.join(" • "),
  };
}

/**
 * Calcule la moyenne d'un tableau de nombres
 */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
