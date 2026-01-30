/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL LIVE DECISION ENGINE™ — Moteur de décision temps réel
 * Two For Coaching Lab Method™
 * 
 * "Observe. Interpret. Decide."
 * 
 * PRINCIPES:
 * 1. Décision > Précision
 * 2. Physiologie > Allure instantanée
 * 3. Dérive > Valeur absolue
 * 4. Silence par défaut
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { PacingEnvelopeResult, RaceObjective } from "./pacingEnvelopeEngine";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type RacePhase = "early" | "mid" | "late";
export type ConformityStatus = "green" | "orange" | "red";
export type DecisionLevel = "control" | "watch" | "correct" | "critical";

export interface LiveDataPoint {
  timestamp: number;         // Seconds since start
  powerOrPace: number;       // Watts or sec/km
  heartRate: number | null;
  cadence: number | null;
  segmentIndex: number;
}

export interface LiveSessionInput {
  // Données temps réel
  dataPoints: LiveDataPoint[];
  currentTimeSec: number;
  totalExpectedDurationSec: number;
  
  // Contexte fixe
  envelope: PacingEnvelopeResult;
  raceObjective: RaceObjective;
  raceReadinessScore: number | null;
  vlamaxValue: number | null;
  tteMin: number | null;
  
  // Référence
  targetPowerOrPace: number;  // FTP or threshold pace
  targetHR: number | null;
}

export interface ConformitySegment {
  segmentIndex: number;
  startTime: number;
  endTime: number;
  averageIntensityPct: number;
  status: ConformityStatus;
}

export interface ConformityAnalysis {
  segments: ConformitySegment[];
  currentStatus: ConformityStatus;
  timeOutsideEnvelopePct: number;
  currentIntensityPct: number;
  trend: "stable" | "rising" | "falling";
}

export interface RiskFlag {
  id: string;
  icon: string;
  title: string;
  cause: string;
  estimatedImpactMin: number | null;
  severity: "warning" | "danger";
  active: boolean;
}

export interface RiskAnalysis {
  flags: RiskFlag[];
  activeCount: number;
  criticalCount: number;
  overallRisk: "low" | "moderate" | "high" | "critical";
}

export interface CoachDecision {
  level: DecisionLevel;
  label: string;
  icon: string;
  justification: string;
  recommendation: string;
  suggestedAction: "silence" | "reassure" | "instruct" | "wait";
  waitMinutes: number | null;
}

export interface SuggestedMessage {
  id: string;
  text: string;
  tone: "calm" | "firm" | "urgent";
}

export interface LiveDecisionResult {
  // Analyses
  conformity: ConformityAnalysis;
  risks: RiskAnalysis;
  decision: CoachDecision;
  
  // Actions
  suggestedMessages: SuggestedMessage[];
  
  // Métadonnées
  racePhase: RacePhase;
  elapsedPct: number;
  generatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const SUGGESTED_MESSAGES: SuggestedMessage[] = [
  { id: "stay_plan", text: "Reste dans ton plan.", tone: "calm" },
  { id: "stabilize", text: "Stabilise maintenant.", tone: "firm" },
  { id: "no_respond", text: "Ne réponds pas.", tone: "firm" },
  { id: "race_long", text: "La course est longue.", tone: "calm" },
  { id: "trust", text: "Fais confiance au process.", tone: "calm" },
  { id: "patience", text: "Patience. Tu les reverras.", tone: "calm" },
  { id: "slow_now", text: "Ralentis maintenant.", tone: "urgent" },
];

const DECISION_CONFIGS: Record<DecisionLevel, Omit<CoachDecision, "justification">> = {
  control: {
    level: "control",
    label: "Tout est sous contrôle",
    icon: "🟢",
    recommendation: "Aucune intervention nécessaire. Continuer à observer.",
    suggestedAction: "silence",
    waitMinutes: null,
  },
  watch: {
    level: "watch",
    label: "Surveillance active recommandée",
    icon: "🟡",
    recommendation: "Surveiller les prochaines minutes. Préparer un message si la tendance se confirme.",
    suggestedAction: "wait",
    waitMinutes: 5,
  },
  correct: {
    level: "correct",
    label: "Correction douce possible",
    icon: "🟠",
    recommendation: "Un message court peut aider à stabiliser. Ton calme, pas alarmiste.",
    suggestedAction: "instruct",
    waitMinutes: null,
  },
  critical: {
    level: "critical",
    label: "Dérive critique – intervention nécessaire",
    icon: "🔴",
    recommendation: "Message ferme recommandé. L'athlète doit comprendre l'urgence sans paniquer.",
    suggestedAction: "instruct",
    waitMinutes: null,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

export function computeLiveDecision(input: LiveSessionInput): LiveDecisionResult {
  const {
    dataPoints,
    currentTimeSec,
    totalExpectedDurationSec,
    envelope,
    raceReadinessScore,
    vlamaxValue,
    tteMin,
    targetPowerOrPace,
  } = input;

  // Phase de course
  const elapsedPct = (currentTimeSec / totalExpectedDurationSec) * 100;
  const racePhase = getRacePhase(elapsedPct);

  // 1. Analyse de conformité
  const conformity = analyzeConformity(dataPoints, envelope, targetPowerOrPace, currentTimeSec);

  // 2. Analyse des risques
  const risks = analyzeRisks(
    conformity,
    dataPoints,
    envelope,
    racePhase,
    vlamaxValue,
    tteMin,
    raceReadinessScore,
    currentTimeSec,
    targetPowerOrPace
  );

  // 3. Décision coach
  const decision = computeDecision(conformity, risks, racePhase, envelope);

  // 4. Messages suggérés
  const suggestedMessages = selectSuggestedMessages(decision, risks);

  return {
    conformity,
    risks,
    decision,
    suggestedMessages,
    racePhase,
    elapsedPct,
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYSE DE CONFORMITÉ
// ═══════════════════════════════════════════════════════════════════════════════

function analyzeConformity(
  dataPoints: LiveDataPoint[],
  envelope: PacingEnvelopeResult,
  targetPowerOrPace: number,
  currentTimeSec: number
): ConformityAnalysis {
  if (dataPoints.length === 0) {
    return {
      segments: [],
      currentStatus: "green",
      timeOutsideEnvelopePct: 0,
      currentIntensityPct: 0,
      trend: "stable",
    };
  }

  const { boundary } = envelope;
  const segmentDuration = 300; // 5 min segments
  const segments: ConformitySegment[] = [];
  
  // Group by segments
  const segmentMap = new Map<number, LiveDataPoint[]>();
  dataPoints.forEach(dp => {
    const segIdx = Math.floor(dp.timestamp / segmentDuration);
    if (!segmentMap.has(segIdx)) segmentMap.set(segIdx, []);
    segmentMap.get(segIdx)!.push(dp);
  });

  let timeOutside = 0;
  let totalTime = 0;

  segmentMap.forEach((points, segIdx) => {
    const avgPower = points.reduce((sum, p) => sum + p.powerOrPace, 0) / points.length;
    const intensityPct = (avgPower / targetPowerOrPace) * 100;
    
    let status: ConformityStatus = "green";
    if (intensityPct > boundary.toleratedPct) {
      status = "red";
      timeOutside += points.length * (segmentDuration / points.length);
    } else if (intensityPct > boundary.highPct || intensityPct < boundary.lowPct - 5) {
      status = "orange";
    }
    
    totalTime += points.length * (segmentDuration / points.length);

    segments.push({
      segmentIndex: segIdx,
      startTime: segIdx * segmentDuration,
      endTime: (segIdx + 1) * segmentDuration,
      averageIntensityPct: Math.round(intensityPct),
      status,
    });
  });

  // Current status (last 2 min)
  const recentPoints = dataPoints.filter(dp => dp.timestamp > currentTimeSec - 120);
  const currentAvg = recentPoints.length > 0
    ? recentPoints.reduce((sum, p) => sum + p.powerOrPace, 0) / recentPoints.length
    : 0;
  const currentIntensityPct = targetPowerOrPace > 0 ? (currentAvg / targetPowerOrPace) * 100 : 0;

  let currentStatus: ConformityStatus = "green";
  if (currentIntensityPct > boundary.toleratedPct) {
    currentStatus = "red";
  } else if (currentIntensityPct > boundary.highPct) {
    currentStatus = "orange";
  }

  // Trend (compare last 5 min to previous 5 min)
  const last5min = dataPoints.filter(dp => dp.timestamp > currentTimeSec - 300);
  const prev5min = dataPoints.filter(dp => dp.timestamp > currentTimeSec - 600 && dp.timestamp <= currentTimeSec - 300);
  
  let trend: "stable" | "rising" | "falling" = "stable";
  if (last5min.length > 0 && prev5min.length > 0) {
    const lastAvg = last5min.reduce((s, p) => s + p.powerOrPace, 0) / last5min.length;
    const prevAvg = prev5min.reduce((s, p) => s + p.powerOrPace, 0) / prev5min.length;
    const diff = ((lastAvg - prevAvg) / prevAvg) * 100;
    if (diff > 3) trend = "rising";
    else if (diff < -3) trend = "falling";
  }

  return {
    segments,
    currentStatus,
    timeOutsideEnvelopePct: totalTime > 0 ? Math.round((timeOutside / totalTime) * 100) : 0,
    currentIntensityPct: Math.round(currentIntensityPct),
    trend,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYSE DES RISQUES
// ═══════════════════════════════════════════════════════════════════════════════

function analyzeRisks(
  conformity: ConformityAnalysis,
  dataPoints: LiveDataPoint[],
  envelope: PacingEnvelopeResult,
  racePhase: RacePhase,
  vlamaxValue: number | null,
  tteMin: number | null,
  raceReadinessScore: number | null,
  currentTimeSec: number,
  targetPowerOrPace: number
): RiskAnalysis {
  const flags: RiskFlag[] = [];

  // 1. Dérive cardio anormale
  const hrDrift = computeHRDrift(dataPoints, currentTimeSec);
  if (hrDrift != null && hrDrift > 8) {
    flags.push({
      id: "hr_drift",
      icon: "❤️",
      title: "Dérive cardio anormale",
      cause: `FC augmente de ${hrDrift.toFixed(1)}% sans hausse d'intensité.`,
      estimatedImpactMin: Math.round(30 - hrDrift),
      severity: hrDrift > 12 ? "danger" : "warning",
      active: true,
    });
  }

  // 2. Intensité trop élevée trop tôt
  if (racePhase === "early" && conformity.currentIntensityPct > envelope.boundary.highPct + 5) {
    flags.push({
      id: "early_intensity",
      icon: "⚡",
      title: "Intensité trop élevée trop tôt",
      cause: `${conformity.currentIntensityPct}% vs cible ${envelope.boundary.centerPct}% dans le premier tiers.`,
      estimatedImpactMin: 20,
      severity: conformity.currentIntensityPct > envelope.boundary.toleratedPct ? "danger" : "warning",
      active: true,
    });
  }

  // 3. TTE consommé trop rapidement
  if (tteMin != null && conformity.timeOutsideEnvelopePct > 15) {
    const tteConsumedPct = Math.min(100, conformity.timeOutsideEnvelopePct * 2);
    if (tteConsumedPct > 30) {
      flags.push({
        id: "tte_consumed",
        icon: "⏱️",
        title: "TTE consommé trop rapidement",
        cause: `Temps hors enveloppe: ${conformity.timeOutsideEnvelopePct}%. Réserve entamée.`,
        estimatedImpactMin: Math.round(tteMin * (1 - tteConsumedPct / 100)),
        severity: tteConsumedPct > 50 ? "danger" : "warning",
        active: true,
      });
    }
  }

  // 4. Profil VLamax incompatible
  if (vlamaxValue != null && vlamaxValue < 0.35) {
    if (conformity.currentStatus === "red" || conformity.timeOutsideEnvelopePct > 10) {
      flags.push({
        id: "vlamax_incompatible",
        icon: "🧬",
        title: "Profil VLamax incompatible avec l'intensité",
        cause: `VLamax basse (${vlamaxValue.toFixed(2)}) = tolérance minimale aux pics. Actuellement en zone rouge.`,
        estimatedImpactMin: 15,
        severity: "danger",
        active: true,
      });
    }
  }

  // 5. Fatigue précoce vs Race Readiness
  if (raceReadinessScore != null && raceReadinessScore < 70) {
    if (conformity.trend === "falling" || conformity.currentStatus !== "green") {
      flags.push({
        id: "readiness_mismatch",
        icon: "📉",
        title: "Fatigue précoce vs Race Readiness",
        cause: `Readiness ${raceReadinessScore}% — marge réduite. Signes de fatigue détectés.`,
        estimatedImpactMin: 25,
        severity: raceReadinessScore < 60 ? "danger" : "warning",
        active: true,
      });
    }
  }

  const activeFlags = flags.filter(f => f.active);
  const criticalCount = activeFlags.filter(f => f.severity === "danger").length;

  let overallRisk: RiskAnalysis["overallRisk"] = "low";
  if (criticalCount >= 2) overallRisk = "critical";
  else if (criticalCount === 1) overallRisk = "high";
  else if (activeFlags.length >= 2) overallRisk = "moderate";
  else if (activeFlags.length === 1) overallRisk = "moderate";

  return {
    flags: activeFlags,
    activeCount: activeFlags.length,
    criticalCount,
    overallRisk,
  };
}

function computeHRDrift(dataPoints: LiveDataPoint[], currentTimeSec: number): number | null {
  const first10min = dataPoints.filter(dp => dp.timestamp < 600 && dp.heartRate != null);
  const last10min = dataPoints.filter(dp => dp.timestamp > currentTimeSec - 600 && dp.heartRate != null);
  
  if (first10min.length < 5 || last10min.length < 5) return null;
  
  const firstAvgHR = first10min.reduce((s, p) => s + (p.heartRate ?? 0), 0) / first10min.length;
  const lastAvgHR = last10min.reduce((s, p) => s + (p.heartRate ?? 0), 0) / last10min.length;
  
  if (firstAvgHR === 0) return null;
  return ((lastAvgHR - firstAvgHR) / firstAvgHR) * 100;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DÉCISION COACH
// ═══════════════════════════════════════════════════════════════════════════════

function computeDecision(
  conformity: ConformityAnalysis,
  risks: RiskAnalysis,
  racePhase: RacePhase,
  envelope: PacingEnvelopeResult
): CoachDecision {
  let level: DecisionLevel = "control";
  let justification = "Conformité au plan optimale. Aucun signal d'alerte.";

  // Logic de décision croisée
  if (risks.overallRisk === "critical" || conformity.currentStatus === "red") {
    level = "critical";
    justification = `${risks.criticalCount} risque(s) critique(s) détecté(s). Intensité actuelle: ${conformity.currentIntensityPct}% (zone rouge).`;
  } else if (risks.overallRisk === "high" || (conformity.currentStatus === "orange" && racePhase === "early")) {
    level = "correct";
    justification = `Zone orange en phase précoce. ${risks.activeCount} signal(s) de vigilance.`;
  } else if (risks.overallRisk === "moderate" || conformity.timeOutsideEnvelopePct > 10) {
    level = "watch";
    justification = `Temps hors enveloppe: ${conformity.timeOutsideEnvelopePct}%. Tendance: ${conformity.trend}. À surveiller.`;
  } else if (conformity.currentStatus === "orange") {
    level = "watch";
    justification = `Zone limite atteinte. Pas d'alerte critique mais vigilance recommandée.`;
  }

  // Prise en compte profil sensible
  if (envelope.pacingProfile.type === "sensitive" && level === "watch") {
    level = "correct";
    justification += " Profil pacing-sensible: marge de tolérance réduite.";
  }

  return {
    ...DECISION_CONFIGS[level],
    justification,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGES SUGGÉRÉS
// ═══════════════════════════════════════════════════════════════════════════════

function selectSuggestedMessages(
  decision: CoachDecision,
  risks: RiskAnalysis
): SuggestedMessage[] {
  const messages: SuggestedMessage[] = [];

  if (decision.level === "control") {
    // Pas de message nécessaire
    return [];
  }

  if (decision.level === "critical") {
    messages.push(SUGGESTED_MESSAGES.find(m => m.id === "slow_now")!);
    messages.push(SUGGESTED_MESSAGES.find(m => m.id === "stabilize")!);
  } else if (decision.level === "correct") {
    messages.push(SUGGESTED_MESSAGES.find(m => m.id === "stabilize")!);
    messages.push(SUGGESTED_MESSAGES.find(m => m.id === "stay_plan")!);
    if (risks.flags.some(f => f.id === "early_intensity")) {
      messages.push(SUGGESTED_MESSAGES.find(m => m.id === "patience")!);
    }
  } else {
    messages.push(SUGGESTED_MESSAGES.find(m => m.id === "stay_plan")!);
    messages.push(SUGGESTED_MESSAGES.find(m => m.id === "trust")!);
  }

  // Toujours proposer "Ne réponds pas" si risque d'emballement
  if (risks.flags.some(f => f.id === "early_intensity")) {
    messages.push(SUGGESTED_MESSAGES.find(m => m.id === "no_respond")!);
  }

  return messages.filter(Boolean).slice(0, 4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getRacePhase(elapsedPct: number): RacePhase {
  if (elapsedPct < 33) return "early";
  if (elapsedPct < 66) return "mid";
  return "late";
}

export function getPhaseLabel(phase: RacePhase): string {
  switch (phase) {
    case "early": return "1er tiers";
    case "mid": return "2ème tiers";
    case "late": return "3ème tiers";
  }
}

export function getDecisionColor(level: DecisionLevel): string {
  switch (level) {
    case "control": return "text-green-600 dark:text-green-400";
    case "watch": return "text-yellow-600 dark:text-yellow-400";
    case "correct": return "text-orange-600 dark:text-orange-400";
    case "critical": return "text-red-600 dark:text-red-400";
  }
}

export function getDecisionBg(level: DecisionLevel): string {
  switch (level) {
    case "control": return "bg-green-100 dark:bg-green-900/30";
    case "watch": return "bg-yellow-100 dark:bg-yellow-900/30";
    case "correct": return "bg-orange-100 dark:bg-orange-900/30";
    case "critical": return "bg-red-100 dark:bg-red-900/30";
  }
}
