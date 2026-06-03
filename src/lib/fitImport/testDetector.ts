/**
 * Test Type Detector
 * Détection automatique du type de test à partir d'une session FIT
 */

import type { FitSession, FitLap, BestEfforts, DetectedTestType, TestTypeDetection } from "./types";

interface DetectionCandidate {
  type: DetectedTestType;
  score: number;
  reason: string;
}

/**
 * TFCL Reference-Week slots: which of the 4 efforts of the Semaine Test
 * a detected FIT test type fills.
 *  - P30S  → Sprint 30s (snapshot.p30s_w)
 *  - P60S  → Sprint 60s (snapshot.p60s_w)
 *  - MAP5  → MAP 5 min  (snapshot.map5min_w)
 *  - FTP_TTE → FTP + TTE (snapshot.ftp + tte_observed_min)
 */
export type TFCLWeekSlot = "P30S" | "P60S" | "MAP5" | "FTP_TTE" | null;

const TFCL_SLOT_MAP: Partial<Record<DetectedTestType, TFCLWeekSlot>> = {
  SPRINT_30S: "P30S",
  SPRINT_60S: "P60S",
  MAP_5MIN: "MAP5",
  FTP_20MIN: "FTP_TTE",
  FTP_2x8MIN: "FTP_TTE",
  TTE_THRESHOLD: "FTP_TTE",
};

export function getTFCLWeekSlot(type: DetectedTestType): TFCLWeekSlot {
  return TFCL_SLOT_MAP[type] ?? null;
}

export function formatTFCLSlot(slot: TFCLWeekSlot): string {
  switch (slot) {
    case "P30S": return "Sprint 30s (D1)";
    case "P60S": return "Sprint 60s (D1)";
    case "MAP5": return "MAP 5 min (D3)";
    case "FTP_TTE": return "FTP + TTE (D5)";
    default: return "—";
  }
}

/**
 * Détecte le type de test à partir d'une session FIT
 */
export function detectTestType(
  session: FitSession,
  bestEfforts: BestEfforts
): TestTypeDetection {
  const candidates: DetectionCandidate[] = [];

  // Vérifier la présence de données de puissance
  const hasPower = session.records.some((r) => r.powerW !== undefined);
  if (!hasPower) {
    return {
      type: "UNKNOWN",
      confidence: 0,
      reasoning: "Aucune donnée de puissance disponible",
    };
  }

  const totalMinutes = session.movingTimeSec / 60;

  // Analyser les laps
  const lapAnalysis = analyzeLaps(session.laps);

  // === FTP 20 MIN ===
  if (bestEfforts.p20min) {
    const p20Candidate = detectFtp20Min(session, bestEfforts, lapAnalysis);
    if (p20Candidate) candidates.push(p20Candidate);
  }

  // === FTP 2x8 MIN ===
  if (lapAnalysis.has2x8Pattern) {
    candidates.push({
      type: "FTP_2x8MIN",
      score: 0.85,
      reason: "2 laps d'environ 8 minutes à haute intensité détectés",
    });
  }

  // === FTP RAMP ===
  const rampCandidate = detectRampTest(session);
  if (rampCandidate) candidates.push(rampCandidate);

  // === MAP 5 MIN ===
  if (bestEfforts.p5min && totalMinutes < 30) {
    const mapCandidate = detectMap5Min(session, bestEfforts);
    if (mapCandidate) candidates.push(mapCandidate);
  }

  // === SPRINTS ===
  const sprintCandidate = detectSprint(session, bestEfforts);
  if (sprintCandidate) candidates.push(sprintCandidate);

  // === Z2 DRIFT ===
  if (totalMinutes >= 60) {
    const z2Candidate = detectZ2Drift(session);
    if (z2Candidate) candidates.push(z2Candidate);
  }

  // === TTE THRESHOLD ===
  if (totalMinutes >= 30 && totalMinutes <= 90) {
    const tteCandidate = detectTteThreshold(session, bestEfforts);
    if (tteCandidate) candidates.push(tteCandidate);
  }

  // Sélectionner le meilleur candidat
  if (candidates.length === 0) {
    return {
      type: "UNKNOWN",
      confidence: 0.3,
      reasoning: "Aucun pattern de test reconnu dans cette séance",
    };
  }

  // Trier par score décroissant
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates[0];
  const alternatives = candidates
    .slice(1, 3)
    .filter((c) => c.score > 0.3)
    .map((c) => c.type);

  return {
    type: best.type,
    confidence: best.score,
    reasoning: best.reason,
    alternativeTypes: alternatives.length > 0 ? alternatives : undefined,
  };
}

interface LapAnalysis {
  has2x8Pattern: boolean;
  highIntensityLaps: FitLap[];
  avgLapDuration: number;
  progressiveIntensity: boolean;
}

/**
 * Analyse les laps pour détecter des patterns
 */
function analyzeLaps(laps: FitLap[]): LapAnalysis {
  const highIntensityLaps = laps.filter((l) => {
    const duration = l.totalTimerTime;
    // Lap de 7-9 minutes avec puissance
    return duration >= 420 && duration <= 540 && l.avgPower && l.avgPower > 200;
  });

  const has2x8Pattern =
    highIntensityLaps.length >= 2 &&
    Math.abs(highIntensityLaps[0].totalTimerTime - highIntensityLaps[1].totalTimerTime) < 60;

  const avgLapDuration =
    laps.length > 0
      ? laps.reduce((sum, l) => sum + l.totalTimerTime, 0) / laps.length
      : 0;

  // Vérifier si l'intensité est progressive
  const progressiveIntensity = checkProgressiveIntensity(laps);

  return {
    has2x8Pattern,
    highIntensityLaps,
    avgLapDuration,
    progressiveIntensity,
  };
}

/**
 * Vérifie si les laps ont une intensité progressive (ramp)
 */
function checkProgressiveIntensity(laps: FitLap[]): boolean {
  if (laps.length < 5) return false;

  const powers = laps
    .filter((l) => l.avgPower !== undefined)
    .map((l) => l.avgPower!);

  if (powers.length < 5) return false;

  // Compter les augmentations
  let increases = 0;
  for (let i = 1; i < powers.length; i++) {
    if (powers[i] > powers[i - 1] * 1.02) {
      increases++;
    }
  }

  // 70% des transitions doivent être des augmentations
  return increases / (powers.length - 1) > 0.7;
}

/**
 * Détecte un test FTP 20 minutes
 */
function detectFtp20Min(
  session: FitSession,
  bestEfforts: BestEfforts,
  lapAnalysis: LapAnalysis
): DetectionCandidate | null {
  const p20min = bestEfforts.p20min;
  if (!p20min) return null;

  // Vérifier si on a un effort soutenu de ~20 min
  const totalMinutes = session.movingTimeSec / 60;

  // La séance doit être d'au moins 25 min (échauffement + test)
  if (totalMinutes < 25) return null;

  // Chercher un segment de 20 min avec puissance stable
  const steadySegment = findSteadySegment(session.records, 1200, p20min);

  if (steadySegment) {
    const cv = steadySegment.cv;
    const score = cv < 0.1 ? 0.9 : cv < 0.15 ? 0.75 : cv < 0.2 ? 0.6 : 0.4;

    return {
      type: "FTP_20MIN",
      score,
      reason: `Effort soutenu de 20 min détecté (${Math.round(p20min)}W, CV=${(cv * 100).toFixed(1)}%)`,
    };
  }

  return null;
}

/**
 * Détecte un test ramp/progressif
 */
function detectRampTest(session: FitSession): DetectionCandidate | null {
  // Chercher une progression continue sur 15-30 minutes
  const records = session.records.filter((r) => r.powerW !== undefined);
  if (records.length < 100) return null;

  // Diviser en segments de 1 minute
  const minuteAvgs: number[] = [];
  let minuteSum = 0;
  let minuteCount = 0;
  let lastMinute = 0;

  for (const record of records) {
    const minute = Math.floor(
      (record.timestamp.getTime() - records[0].timestamp.getTime()) / 60000
    );

    if (minute > lastMinute && minuteCount > 0) {
      minuteAvgs.push(minuteSum / minuteCount);
      minuteSum = record.powerW ?? 0;
      minuteCount = 1;
      lastMinute = minute;
    } else {
      minuteSum += record.powerW ?? 0;
      minuteCount++;
    }
  }

  if (minuteCount > 0) {
    minuteAvgs.push(minuteSum / minuteCount);
  }

  if (minuteAvgs.length < 10) return null;

  // Vérifier progression linéaire
  let progressiveCount = 0;
  const minIncrease = 5; // Au moins 5W d'augmentation par minute

  for (let i = 1; i < minuteAvgs.length; i++) {
    if (minuteAvgs[i] > minuteAvgs[i - 1] + minIncrease) {
      progressiveCount++;
    }
  }

  const progressionRatio = progressiveCount / (minuteAvgs.length - 1);

  if (progressionRatio > 0.6) {
    return {
      type: "FTP_RAMP",
      score: Math.min(0.9, 0.5 + progressionRatio * 0.5),
      reason: `Progression linéaire détectée (${Math.round(progressionRatio * 100)}% des minutes en augmentation)`,
    };
  }

  return null;
}

/**
 * Détecte un test MAP 5 minutes
 */
function detectMap5Min(
  session: FitSession,
  bestEfforts: BestEfforts
): DetectionCandidate | null {
  const p5min = bestEfforts.p5min;
  if (!p5min) return null;

  // Vérifier si le P5min est significativement plus haut que le P20min
  const p20min = bestEfforts.p20min;
  if (p20min && p5min / p20min > 1.1) {
    return {
      type: "MAP_5MIN",
      score: 0.75,
      reason: `Effort 5 min intense détecté (${Math.round(p5min)}W)`,
    };
  }

  // Séance courte avec effort intense
  const totalMinutes = session.movingTimeSec / 60;
  if (totalMinutes < 25 && p5min > 250) {
    return {
      type: "MAP_5MIN",
      score: 0.65,
      reason: `Séance courte avec effort 5 min (${Math.round(p5min)}W)`,
    };
  }

  return null;
}

/**
 * Détecte un test sprint
 */
function detectSprint(
  session: FitSession,
  bestEfforts: BestEfforts
): DetectionCandidate | null {
  const p5s = bestEfforts.p5s;
  const p15s = bestEfforts.p15s;
  const p30s = bestEfforts.p30s;
  const p60s = bestEfforts.p60s;

  // Séance courte avec pics de puissance
  const totalMinutes = session.movingTimeSec / 60;

  if (totalMinutes > 30) return null;

  // Chercher des pics significatifs
  if (p15s && p5s && p5s > 800) {
    const ratio = p5s / (session.avgPower ?? p15s);
    if (ratio > 3) {
      return {
        type: "SPRINT_15S",
        score: 0.8,
        reason: `Sprint court détecté (P5s=${Math.round(p5s)}W, P15s=${Math.round(p15s)}W)`,
      };
    }
  }

  if (p30s && p30s > 600) {
    return {
      type: "SPRINT_30S",
      score: 0.7,
      reason: `Sprint 30s détecté (${Math.round(p30s)}W)`,
    };
  }

  if (p60s && p60s > 500) {
    return {
      type: "SPRINT_60S",
      score: 0.65,
      reason: `Effort 60s intense détecté (${Math.round(p60s)}W)`,
    };
  }

  return null;
}

/**
 * Détecte une sortie Z2 avec potentiel analyse de drift
 */
function detectZ2Drift(session: FitSession): DetectionCandidate | null {
  const totalMinutes = session.movingTimeSec / 60;

  if (totalMinutes < 60) return null;

  // Vérifier que la puissance est relativement stable et modérée
  const records = session.records.filter((r) => r.powerW !== undefined);
  const powers = records.map((r) => r.powerW!);

  const avgPower = powers.reduce((a, b) => a + b, 0) / powers.length;
  const maxPower = Math.max(...powers);

  // Z2 = intensité modérée, pas de gros pics
  if (maxPower / avgPower < 1.5 && avgPower < 250) {
    return {
      type: "Z2_DRIFT",
      score: 0.7,
      reason: `Sortie endurance longue (${Math.round(totalMinutes)} min à ~${Math.round(avgPower)}W)`,
    };
  }

  return null;
}

/**
 * Détecte un test TTE au seuil
 */
function detectTteThreshold(
  session: FitSession,
  bestEfforts: BestEfforts
): DetectionCandidate | null {
  const p20min = bestEfforts.p20min;
  if (!p20min) return null;

  const totalMinutes = session.movingTimeSec / 60;

  // Chercher un segment long proche de FTP estimée
  const estimatedFtp = p20min * 0.95;
  const steadySegment = findSteadySegment(session.records, 1800, estimatedFtp, 0.15);

  if (steadySegment && steadySegment.durationSec > 1800) {
    return {
      type: "TTE_THRESHOLD",
      score: 0.75,
      reason: `Effort soutenu au seuil (${Math.round(steadySegment.durationSec / 60)} min à ~${Math.round(steadySegment.avgPower)}W)`,
    };
  }

  return null;
}

interface SteadySegment {
  avgPower: number;
  durationSec: number;
  cv: number;
  startIdx: number;
  endIdx: number;
}

/**
 * Trouve le segment le plus long avec puissance stable proche d'une cible
 */
function findSteadySegment(
  records: { timestamp: Date; powerW?: number }[],
  minDurationSec: number,
  targetPower: number,
  tolerance: number = 0.1
): SteadySegment | null {
  const powerRecords = records.filter((r) => r.powerW !== undefined);
  if (powerRecords.length < 10) return null;

  let bestSegment: SteadySegment | null = null;

  // Sliding window approach
  for (let start = 0; start < powerRecords.length - 10; start++) {
    const segmentPowers: number[] = [];
    let end = start;

    while (end < powerRecords.length) {
      const power = powerRecords[end].powerW!;
      segmentPowers.push(power);

      const avgPower = segmentPowers.reduce((a, b) => a + b, 0) / segmentPowers.length;
      const durationSec =
        (powerRecords[end].timestamp.getTime() -
          powerRecords[start].timestamp.getTime()) /
        1000;

      // Vérifier si dans la tolérance
      if (Math.abs(avgPower - targetPower) / targetPower <= tolerance) {
        if (durationSec >= minDurationSec) {
          // Calculer CV
          const variance =
            segmentPowers.reduce((sum, p) => sum + Math.pow(p - avgPower, 2), 0) /
            segmentPowers.length;
          const cv = Math.sqrt(variance) / avgPower;

          if (!bestSegment || durationSec > bestSegment.durationSec) {
            bestSegment = {
              avgPower,
              durationSec,
              cv,
              startIdx: start,
              endIdx: end,
            };
          }
        }
        end++;
      } else {
        break;
      }
    }
  }

  return bestSegment;
}
