/**
 * Running Economy Analyzer
 * Analyse automatique de l'économie de course depuis un fichier FIT de ~60 min
 * 
 * Métriques extraites:
 * - Allure moyenne et au seuil
 * - FC moyenne et % FCmax
 * - Dérive cardiaque (Pa:HR decoupling)
 * - Score économie de course
 */

import type { FitSession, FitRecord, DriftAnalysis } from "./types";

// =============================================
// TYPES SPÉCIFIQUES RUNNING ECONOMY
// =============================================

export interface RunningEconomyFitResult {
  // Données brutes extraites
  avgPaceSecPerKm: number;          // Allure moyenne (sec/km)
  avgHeartRate: number;              // FC moyenne (bpm)
  maxHeartRate: number;              // FC max observée (bpm)
  durationMin: number;               // Durée totale (min)
  totalDistanceKm: number;           // Distance totale (km)
  
  // Dérive cardiaque
  hrDriftPct: number;                // % de dérive Pa:HR
  hrDriftLevel: "excellent" | "good" | "moderate" | "high";
  driftAnalysis: RunningDriftAnalysis | null;
  
  // Économie calculée
  economyScore: number;              // Score 0-100
  economyLevel: "excellent" | "good" | "average" | "fragile" | "unknown";
  economyLabel: string;
  
  // Données pour le snapshot
  runPaceRefSecPerKm: number;        // Allure de référence
  runHrRefBpm: number;               // FC de référence
  runDurationMin: number;            // Durée de référence
  runHrDriftPct: number;             // % dérive
  
  // Confiance et qualité
  confidence: number;                // 0-100%
  qualityNotes: string[];
  warnings: string[];
  
  // Métadonnées
  isApplicable: boolean;             // Sport = running?
  sessionDate: string;
}

export interface RunningDriftAnalysis {
  // 1ère moitié
  pace1stHalf: number;               // sec/km
  hr1stHalf: number;                 // bpm
  ratio1stHalf: number;              // pace/HR
  
  // 2ème moitié
  pace2ndHalf: number;
  hr2ndHalf: number;
  ratio2ndHalf: number;
  
  // Calculs
  driftPercent: number;
  segmentDurationMin: number;
  isValid: boolean;
  invalidReason?: string;
}

// =============================================
// CONSTANTES
// =============================================

const DRIFT_THRESHOLDS = {
  excellent: 4,    // ≤4% = excellente stabilité
  good: 6,         // ≤6% = bonne
  moderate: 10,    // ≤10% = moyenne
  high: 15,        // >10% = élevée
};

const MIN_DURATION_MIN = 40;        // Minimum 40 min pour analyse valide
const IDEAL_DURATION_MIN = 60;      // Idéal ~60 min
const MAX_DURATION_MIN = 90;        // Au-delà, fatigue normale

const RUNNING_SPORTS = ["running", "trail_running", "track_running", "treadmill_running", "run"];

// =============================================
// FONCTION PRINCIPALE
// =============================================

/**
 * Analyse l'économie de course depuis une session FIT
 */
export function analyzeRunningEconomy(
  session: FitSession,
  fcMax?: number | null
): RunningEconomyFitResult {
  const warnings: string[] = [];
  const qualityNotes: string[] = [];
  
  // Vérifier si c'est une session de course
  const sport = session.sport?.toLowerCase() ?? "";
  const isRunning = RUNNING_SPORTS.some(s => sport.includes(s)) || sport === "";
  
  if (!isRunning && sport !== "") {
    return createEmptyResult(session, "Sport détecté: " + session.sport + " (non applicable)");
  }
  
  // Filtrer les records avec vitesse et FC
  const records = session.records.filter(r => 
    r.speed !== undefined && r.speed > 0.5 && // > 1.8 km/h minimum
    r.heartRate !== undefined && r.heartRate > 60
  );
  
  if (records.length < 100) {
    return createEmptyResult(session, "Données insuffisantes (moins de 100 points avec vitesse+FC)");
  }
  
  // Calculer durée effective
  const durationMin = session.movingTimeSec / 60;
  
  if (durationMin < MIN_DURATION_MIN) {
    warnings.push(`Durée courte (${Math.round(durationMin)} min) - idéal ≥${IDEAL_DURATION_MIN} min`);
  }
  
  if (durationMin > MAX_DURATION_MIN) {
    qualityNotes.push("Séance longue: dérive naturelle possible");
  }
  
  // Calculer les métriques de base
  const avgSpeed = average(records.map(r => r.speed!)); // m/s
  const avgPaceSecPerKm = avgSpeed > 0 ? 1000 / avgSpeed : 0;
  const avgHeartRate = Math.round(average(records.map(r => r.heartRate!)));
  const maxHeartRate = Math.max(...records.map(r => r.heartRate!));
  const totalDistanceKm = session.totalDistance / 1000;
  
  qualityNotes.push(`Allure moy: ${formatPace(avgPaceSecPerKm)}/km`);
  qualityNotes.push(`FC moy: ${avgHeartRate} bpm`);
  
  // Analyser la dérive cardiaque
  const driftAnalysis = calculateRunningDrift(records, durationMin);
  const hrDriftPct = driftAnalysis?.driftPercent ?? 0;
  const hrDriftLevel = getDriftLevel(hrDriftPct);
  
  if (driftAnalysis?.isValid) {
    qualityNotes.push(`Dérive Pa:HR: ${hrDriftPct.toFixed(1)}% (${hrDriftLevel})`);
  } else if (driftAnalysis?.invalidReason) {
    warnings.push(driftAnalysis.invalidReason);
  }
  
  // Calculer le score économie
  const { score: economyScore, level: economyLevel, label: economyLabel, confidence } = 
    calculateEconomyScore({
      avgPaceSecPerKm,
      avgHeartRate,
      durationMin,
      hrDriftPct,
      maxHeartRate,
      fcMax: fcMax ?? null,
      driftValid: driftAnalysis?.isValid ?? false,
    });
  
  return {
    avgPaceSecPerKm: Math.round(avgPaceSecPerKm),
    avgHeartRate,
    maxHeartRate,
    durationMin: Math.round(durationMin),
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    
    hrDriftPct: Math.round(hrDriftPct * 100) / 100,
    hrDriftLevel,
    driftAnalysis,
    
    economyScore,
    economyLevel,
    economyLabel,
    
    runPaceRefSecPerKm: Math.round(avgPaceSecPerKm),
    runHrRefBpm: avgHeartRate,
    runDurationMin: Math.round(durationMin),
    runHrDriftPct: Math.round(hrDriftPct * 100) / 100,
    
    confidence,
    qualityNotes,
    warnings,
    
    isApplicable: true,
    sessionDate: session.startTime.toISOString().split("T")[0],
  };
}

// =============================================
// CALCUL DE DÉRIVE CARDIAQUE COURSE
// =============================================

function calculateRunningDrift(
  records: FitRecord[],
  totalDurationMin: number
): RunningDriftAnalysis | null {
  if (records.length < 100) {
    return null;
  }
  
  if (totalDurationMin < 30) {
    return {
      pace1stHalf: 0,
      hr1stHalf: 0,
      ratio1stHalf: 0,
      pace2ndHalf: 0,
      hr2ndHalf: 0,
      ratio2ndHalf: 0,
      driftPercent: 0,
      segmentDurationMin: totalDurationMin,
      isValid: false,
      invalidReason: "Durée < 30 min: analyse de dérive non fiable",
    };
  }
  
  // Sélectionner segment stable (éviter échauffement/récupération)
  const startOffset = Math.floor(records.length * 0.1); // Skip 10% début
  const endOffset = Math.floor(records.length * 0.95);  // Skip 5% fin
  const segment = records.slice(startOffset, endOffset);
  
  if (segment.length < 60) {
    return null;
  }
  
  const midPoint = Math.floor(segment.length / 2);
  const firstHalf = segment.slice(0, midPoint);
  const secondHalf = segment.slice(midPoint);
  
  // Calculer moyennes 1ère moitié
  const speeds1 = firstHalf.filter(r => r.speed && r.speed > 0).map(r => r.speed!);
  const hrs1 = firstHalf.filter(r => r.heartRate).map(r => r.heartRate!);
  const avgSpeed1 = average(speeds1);
  const pace1stHalf = avgSpeed1 > 0 ? 1000 / avgSpeed1 : 0; // sec/km
  const hr1stHalf = average(hrs1);
  
  // Calculer moyennes 2ème moitié
  const speeds2 = secondHalf.filter(r => r.speed && r.speed > 0).map(r => r.speed!);
  const hrs2 = secondHalf.filter(r => r.heartRate).map(r => r.heartRate!);
  const avgSpeed2 = average(speeds2);
  const pace2ndHalf = avgSpeed2 > 0 ? 1000 / avgSpeed2 : 0;
  const hr2ndHalf = average(hrs2);
  
  if (hr1stHalf === 0 || hr2ndHalf === 0 || pace1stHalf === 0 || pace2ndHalf === 0) {
    return {
      pace1stHalf: 0,
      hr1stHalf: 0,
      ratio1stHalf: 0,
      pace2ndHalf: 0,
      hr2ndHalf: 0,
      ratio2ndHalf: 0,
      driftPercent: 0,
      segmentDurationMin: 0,
      isValid: false,
      invalidReason: "Données manquantes pour calcul de dérive",
    };
  }
  
  // Calcul du ratio Pace/HR (inversé car allure plus basse = meilleur)
  // On utilise plutôt HR/Speed pour que ratio plus bas = meilleur
  const ratio1stHalf = hr1stHalf / avgSpeed1; // bpm / (m/s)
  const ratio2ndHalf = hr2ndHalf / avgSpeed2;
  
  // Drift = augmentation du coût cardiaque relatif
  // (ratio2 - ratio1) / ratio1 × 100
  const driftPercent = ((ratio2ndHalf - ratio1stHalf) / ratio1stHalf) * 100;
  
  const segmentDurationMin = Math.round(
    (segment.length / records.length) * totalDurationMin * 10
  ) / 10;
  
  return {
    pace1stHalf: Math.round(pace1stHalf),
    hr1stHalf: Math.round(hr1stHalf),
    ratio1stHalf: Math.round(ratio1stHalf * 100) / 100,
    pace2ndHalf: Math.round(pace2ndHalf),
    hr2ndHalf: Math.round(hr2ndHalf),
    ratio2ndHalf: Math.round(ratio2ndHalf * 100) / 100,
    driftPercent: Math.round(driftPercent * 100) / 100,
    segmentDurationMin,
    isValid: true,
  };
}

// =============================================
// CALCUL DU SCORE ÉCONOMIE
// =============================================

interface EconomyScoreInput {
  avgPaceSecPerKm: number;
  avgHeartRate: number;
  durationMin: number;
  hrDriftPct: number;
  maxHeartRate: number;
  fcMax: number | null;
  driftValid: boolean;
}

interface EconomyScoreResult {
  score: number;
  level: "excellent" | "good" | "average" | "fragile" | "unknown";
  label: string;
  confidence: number;
}

function calculateEconomyScore(input: EconomyScoreInput): EconomyScoreResult {
  const { avgPaceSecPerKm, avgHeartRate, durationMin, hrDriftPct, maxHeartRate, fcMax, driftValid } = input;
  
  let score = 0;
  let confidence = 50;
  const details: string[] = [];
  
  // a) Durée: bonus selon la longueur de la séance
  if (durationMin >= 60) {
    score += 15;
    confidence += 15;
    details.push("Durée ≥60min: +15");
  } else if (durationMin >= 45) {
    score += 10;
    confidence += 10;
    details.push("Durée 45-59min: +10");
  } else if (durationMin >= 30) {
    score += 5;
    confidence += 5;
    details.push("Durée 30-44min: +5");
  }
  
  // b) Dérive cardiaque (facteur principal)
  if (driftValid) {
    if (hrDriftPct <= 4) {
      score += 35;
      confidence += 20;
      details.push(`Dérive ≤4%: +35 (excellente stabilité)`);
    } else if (hrDriftPct <= 6) {
      score += 25;
      confidence += 15;
      details.push(`Dérive 4-6%: +25 (bonne)`);
    } else if (hrDriftPct <= 10) {
      score += 15;
      confidence += 10;
      details.push(`Dérive 6-10%: +15 (moyenne)`);
    } else {
      score += 5;
      details.push(`Dérive >10%: +5 (élevée)`);
    }
  } else {
    score += 10;
    details.push("Dérive non calculée: +10 (neutre)");
  }
  
  // c) Coût cardio relatif (si FCmax disponible)
  if (fcMax && fcMax > 0) {
    const hrRatio = avgHeartRate / fcMax;
    if (hrRatio <= 0.75) {
      score += 30;
      confidence += 10;
      details.push(`FC/FCmax ≤75%: +30 (très économe)`);
    } else if (hrRatio <= 0.80) {
      score += 20;
      confidence += 5;
      details.push(`FC/FCmax 75-80%: +20 (économe)`);
    } else if (hrRatio <= 0.85) {
      score += 10;
      details.push(`FC/FCmax 80-85%: +10 (correct)`);
    } else {
      score += 5;
      details.push(`FC/FCmax >85%: +5 (coût élevé)`);
    }
  } else {
    // Utiliser maxHeartRate observée comme proxy
    const hrRatio = avgHeartRate / maxHeartRate;
    if (hrRatio <= 0.85) {
      score += 20;
      details.push("FC moy/FC max obs: +20");
    } else {
      score += 10;
      details.push("FC moy proche de FC max: +10");
    }
    confidence -= 10;
  }
  
  // d) Cohérence allure/FC (bonus si allure rapide avec faible coût)
  if (avgPaceSecPerKm < 300 && (fcMax ? avgHeartRate / fcMax <= 0.80 : true)) {
    // Plus rapide que 5:00/km avec faible coût = excellent
    score += 15;
    details.push("Allure <5:00/km + faible coût: +15");
  } else if (avgPaceSecPerKm < 330) {
    score += 10;
    details.push("Allure <5:30/km: +10");
  } else {
    score += 5;
    details.push("Allure standard: +5");
  }
  
  // Clamp score et confidence
  score = Math.min(100, Math.max(0, score));
  confidence = Math.min(100, Math.max(20, confidence));
  
  // Déterminer le niveau
  let level: "excellent" | "good" | "average" | "fragile" | "unknown";
  let label: string;
  
  if (score >= 80) {
    level = "excellent";
    label = "🟢 Excellente";
  } else if (score >= 60) {
    level = "good";
    label = "🟢 Bonne";
  } else if (score >= 40) {
    level = "average";
    label = "🟡 Moyenne";
  } else if (score >= 20) {
    level = "fragile";
    label = "🟠 Fragile";
  } else {
    level = "unknown";
    label = "⚪ Indéterminée";
  }
  
  return { score, level, label, confidence };
}

// =============================================
// HELPERS
// =============================================

function getDriftLevel(driftPct: number): "excellent" | "good" | "moderate" | "high" {
  if (Math.abs(driftPct) <= DRIFT_THRESHOLDS.excellent) return "excellent";
  if (Math.abs(driftPct) <= DRIFT_THRESHOLDS.good) return "good";
  if (Math.abs(driftPct) <= DRIFT_THRESHOLDS.moderate) return "moderate";
  return "high";
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function formatPace(secPerKm: number): string {
  if (!secPerKm || secPerKm <= 0) return "—";
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function createEmptyResult(session: FitSession, reason: string): RunningEconomyFitResult {
  return {
    avgPaceSecPerKm: 0,
    avgHeartRate: 0,
    maxHeartRate: 0,
    durationMin: Math.round(session.movingTimeSec / 60),
    totalDistanceKm: session.totalDistance / 1000,
    hrDriftPct: 0,
    hrDriftLevel: "moderate",
    driftAnalysis: null,
    economyScore: 0,
    economyLevel: "unknown",
    economyLabel: "⚪ Non applicable",
    runPaceRefSecPerKm: 0,
    runHrRefBpm: 0,
    runDurationMin: 0,
    runHrDriftPct: 0,
    confidence: 0,
    qualityNotes: [],
    warnings: [reason],
    isApplicable: false,
    sessionDate: session.startTime.toISOString().split("T")[0],
  };
}

/**
 * Vérifie si une session FIT est éligible pour l'analyse d'économie de course
 */
export function isEligibleForRunningEconomy(session: FitSession): { eligible: boolean; reason: string } {
  const sport = session.sport?.toLowerCase() ?? "";
  const isRunning = RUNNING_SPORTS.some(s => sport.includes(s)) || sport === "";
  
  if (!isRunning && sport !== "") {
    return { eligible: false, reason: `Sport: ${session.sport} (vélo/natation non supporté)` };
  }
  
  const durationMin = session.movingTimeSec / 60;
  if (durationMin < 30) {
    return { eligible: false, reason: `Durée trop courte: ${Math.round(durationMin)} min (min 30 min)` };
  }
  
  const hasSpeed = session.records.some(r => r.speed && r.speed > 0);
  const hasHr = session.records.some(r => r.heartRate && r.heartRate > 0);
  
  if (!hasSpeed) {
    return { eligible: false, reason: "Pas de données de vitesse/allure" };
  }
  
  if (!hasHr) {
    return { eligible: false, reason: "Pas de données de fréquence cardiaque" };
  }
  
  return { eligible: true, reason: `Course ~${Math.round(durationMin)} min avec FC` };
}
