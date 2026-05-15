/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL Cycle Intelligence Engine™
 * Analyse l'évolution physiologique entre deux snapshots consécutifs
 * pour évaluer l'efficacité d'un bloc d'entraînement.
 * 
 * CONCEPT:
 * Chaque snapshot représente un cycle d'entraînement (4-6 semaines).
 * Le moteur compare les adaptations physiologiques entre deux cycles.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { computeFatMaxTFCL, type FatMaxTFCLInput, type FatMaxObjectif } from "./fatmaxTFCL";
import { resolveVlamaxForGoal } from "@/lib/vlamaxResolver";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type MetricEvolution = "positive" | "neutral" | "negative";

export type CycleVerdict = 
  | "very_effective"   // 70-100
  | "effective"        // 55-70
  | "neutral"          // 40-55
  | "ineffective";     // 0-40

export type LeverVerdict = "effective" | "partial" | "ineffective" | "unknown";

export type CoachRecommendation = "continue" | "adapt" | "change_lever";

export interface MetricAnalysis {
  id: string;
  label: string;
  unit: string;
  previousValue: number | null;
  currentValue: number | null;
  delta: number | null;
  deltaPct: number | null;
  threshold: number;           // Seuil d'amélioration significative (en %)
  evolution: MetricEvolution;
  available: boolean;          // Données disponibles pour les deux snapshots
  contributionScore: number;   // Contribution au score global (0-100)
  explanation: string;
}

export interface LimiterAnalysis {
  previousLimiter: string | null;
  previousLimiterLabel: string | null;
  limiterEvolution: MetricEvolution;
  limiterVerdict: LeverVerdict;
  explanation: string;
}

export interface CycleIntelligenceResult {
  // Score global
  adaptationScore: number;           // 0-100
  verdict: CycleVerdict;
  verdictLabel: string;
  verdictEmoji: string;
  
  // Analyse par métrique
  metrics: MetricAnalysis[];
  
  // Analyse du limiteur
  limiterAnalysis: LimiterAnalysis;
  
  // Recommandation
  recommendation: CoachRecommendation;
  recommendationLabel: string;
  recommendationDetail: string;
  
  // Métadonnées
  previousSnapshotDate: string;
  currentSnapshotDate: string;
  daysBetween: number;
  
  // Résumé textuel
  summary: string;
  staffNote: string;
}

export interface SnapshotData {
  id: string;
  date: string;
  vo2max: number | null;
  vlamax: number | null;
  ftp: number | null;
  weight_kg: number | null;
  tte_observed_min: number | null;
  tss_7d: number | null;
  run_hr_drift_pct: number | null;
  run_economy_score: number | null;
  pace_threshold_sec_per_km: number | null;
  vma: number | null;
  objectif?: string | null;
  fatigue_state?: string | null;
}

export interface CycleIntelligenceInput {
  previousSnapshot: SnapshotData;
  currentSnapshot: SnapshotData;
  previousLimiterId?: string | null;
  previousLimiterLabel?: string | null;
  objectif: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEUILS D'ÉVOLUTION SIGNIFICATIVE
// ═══════════════════════════════════════════════════════════════════════════════

interface MetricConfig {
  id: string;
  label: string;
  unit: string;
  thresholdPct: number;        // Seuil d'amélioration significative (%)
  weight: number;              // Poids dans le score global
  higherIsBetter: boolean;     // true = augmentation = amélioration
  extract: (snap: SnapshotData) => number | null;
}

const METRIC_CONFIGS: MetricConfig[] = [
  {
    id: "vo2max",
    label: "VO₂max",
    unit: "mL/kg/min",
    thresholdPct: 2,
    weight: 20,
    higherIsBetter: true,
    extract: (s) => s.vo2max,
  },
  {
    id: "vlamax",
    label: "VLamax",
    unit: "mmol/L/s",
    thresholdPct: 5,   // ~0.02 sur une valeur de 0.4 ≈ 5%
    weight: 20,
    higherIsBetter: false, // Pour endurance, VLamax basse = mieux
    extract: (s) => s.vlamax,
  },
  {
    id: "ftp_kg",
    label: "FTP/kg",
    unit: "W/kg",
    thresholdPct: 3,
    weight: 15,
    higherIsBetter: true,
    extract: (s) => (s.ftp && s.weight_kg && s.weight_kg > 0) ? s.ftp / s.weight_kg : null,
  },
  {
    id: "tte",
    label: "TTE",
    unit: "min",
    thresholdPct: 10,
    weight: 15,
    higherIsBetter: true,
    extract: (s) => s.tte_observed_min,
  },
  {
    id: "durability",
    label: "Durabilité",
    unit: "% drift",
    thresholdPct: 5,
    weight: 10,
    higherIsBetter: false, // Moins de drift = mieux
    extract: (s) => s.run_hr_drift_pct,
  },
  {
    id: "economy",
    label: "Économie de Course",
    unit: "score",
    thresholdPct: 3,
    weight: 10,
    higherIsBetter: true,
    extract: (s) => s.run_economy_score,
  },
  {
    id: "fatmax",
    label: "FatMax",
    unit: "% FTP",
    thresholdPct: 5,
    weight: 10,
    higherIsBetter: true,
    extract: (s) => {
      if (!s.vlamax) return null;
      const input: FatMaxTFCLInput = {
        vlamaxEffectif: s.vlamax,
        vlamaxConfidence: 0.7,
        vo2maxEffectif: s.vo2max,
        tteEffectif: s.tte_observed_min,
        tteConfidence: 0.7,
        fatigueIndex: null,
        objectif: (s.objectif || "IM") as FatMaxObjectif,
        ftp: s.ftp,
      };
      const result = computeFatMaxTFCL(input);
      return result?.centerPctFTP ?? null;
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MOTEUR PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function analyzeMetric(config: MetricConfig, prev: SnapshotData, curr: SnapshotData): MetricAnalysis {
  const prevVal = config.extract(prev);
  const currVal = config.extract(curr);
  const available = prevVal !== null && currVal !== null && Number.isFinite(prevVal) && Number.isFinite(currVal);

  if (!available || prevVal === null || currVal === null) {
    return {
      id: config.id,
      label: config.label,
      unit: config.unit,
      previousValue: prevVal,
      currentValue: currVal,
      delta: null,
      deltaPct: null,
      threshold: config.thresholdPct,
      evolution: "neutral",
      available: false,
      contributionScore: 50, // Neutral contribution when unavailable
      explanation: "Données insuffisantes pour comparer",
    };
  }

  const delta = currVal - prevVal;
  const deltaPct = prevVal !== 0 ? (delta / Math.abs(prevVal)) * 100 : 0;

  // Determine evolution based on direction preference
  let evolution: MetricEvolution;
  const effectiveDeltaPct = config.higherIsBetter ? deltaPct : -deltaPct;

  if (effectiveDeltaPct >= config.thresholdPct) {
    evolution = "positive";
  } else if (effectiveDeltaPct <= -config.thresholdPct) {
    evolution = "negative";
  } else {
    evolution = "neutral";
  }

  // Score contribution: 0-100
  // Positive = 70-100, Neutral = 40-60, Negative = 0-30
  let contributionScore: number;
  if (evolution === "positive") {
    contributionScore = clamp(70 + (effectiveDeltaPct / config.thresholdPct) * 15, 70, 100);
  } else if (evolution === "negative") {
    contributionScore = clamp(30 + (effectiveDeltaPct / config.thresholdPct) * 15, 0, 30);
  } else {
    contributionScore = clamp(50 + (effectiveDeltaPct / config.thresholdPct) * 10, 35, 65);
  }

  const directionLabel = config.higherIsBetter ? "augmentation" : "réduction";
  const explanation = evolution === "positive"
    ? `${directionLabel} significative (${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}%)`
    : evolution === "negative"
      ? `Évolution défavorable (${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}%)`
      : `Stable (${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}%)`;

  return {
    id: config.id,
    label: config.label,
    unit: config.unit,
    previousValue: prevVal,
    currentValue: currVal,
    delta,
    deltaPct,
    threshold: config.thresholdPct,
    evolution,
    available: true,
    contributionScore,
    explanation,
  };
}

function computeAdaptationScore(metrics: MetricAnalysis[]): number {
  const availableMetrics = metrics.filter(m => m.available);
  if (availableMetrics.length === 0) return 50; // Default neutral

  const configs = METRIC_CONFIGS.filter(c => availableMetrics.some(m => m.id === c.id));
  const totalWeight = configs.reduce((sum, c) => sum + c.weight, 0);

  if (totalWeight === 0) return 50;

  let weightedScore = 0;
  for (const metric of availableMetrics) {
    const config = configs.find(c => c.id === metric.id);
    if (!config) continue;
    const normalizedWeight = config.weight / totalWeight;
    weightedScore += metric.contributionScore * normalizedWeight;
  }

  return Math.round(clamp(weightedScore, 0, 100));
}

function getVerdict(score: number): { verdict: CycleVerdict; label: string; emoji: string } {
  if (score >= 70) return { verdict: "very_effective", label: "Bloc très efficace", emoji: "🟢" };
  if (score >= 55) return { verdict: "effective", label: "Bloc efficace", emoji: "🔵" };
  if (score >= 40) return { verdict: "neutral", label: "Bloc neutre", emoji: "🟡" };
  return { verdict: "ineffective", label: "Bloc inefficace", emoji: "🔴" };
}

function analyzeLimiter(
  metrics: MetricAnalysis[],
  previousLimiterId: string | null | undefined,
  previousLimiterLabel: string | null | undefined,
): LimiterAnalysis {
  if (!previousLimiterId) {
    return {
      previousLimiter: null,
      previousLimiterLabel: null,
      limiterEvolution: "neutral",
      limiterVerdict: "unknown",
      explanation: "Aucun limiteur identifié dans le cycle précédent",
    };
  }

  // Map limiter IDs to metric IDs
  const limiterToMetric: Record<string, string[]> = {
    aerobic_engine: ["vo2max", "ftp_kg"],
    glycolytic: ["vlamax"],
    specific_endurance: ["tte"],
    metabolic_efficiency: ["fatmax"],
    neuromuscular: ["economy"],
    anaerobic_capacity: ["vlamax"],
  };

  const relevantMetricIds = limiterToMetric[previousLimiterId] || [];
  const relevantMetrics = metrics.filter(m => relevantMetricIds.includes(m.id) && m.available);

  if (relevantMetrics.length === 0) {
    return {
      previousLimiter: previousLimiterId,
      previousLimiterLabel: previousLimiterLabel ?? previousLimiterId,
      limiterEvolution: "neutral",
      limiterVerdict: "unknown",
      explanation: `Données insuffisantes pour évaluer la progression du limiteur "${previousLimiterLabel || previousLimiterId}"`,
    };
  }

  const positiveCount = relevantMetrics.filter(m => m.evolution === "positive").length;
  const negativeCount = relevantMetrics.filter(m => m.evolution === "negative").length;

  let limiterEvolution: MetricEvolution;
  let limiterVerdict: LeverVerdict;
  let explanation: string;

  if (positiveCount > 0 && negativeCount === 0) {
    limiterEvolution = "positive";
    limiterVerdict = "effective";
    explanation = `Le limiteur "${previousLimiterLabel}" a progressé. Le levier choisi a fonctionné.`;
  } else if (positiveCount > 0 && negativeCount > 0) {
    limiterEvolution = "neutral";
    limiterVerdict = "partial";
    explanation = `Progression partielle sur le limiteur "${previousLimiterLabel}". Résultats mitigés.`;
  } else if (negativeCount > 0) {
    limiterEvolution = "negative";
    limiterVerdict = "ineffective";
    explanation = `Le limiteur "${previousLimiterLabel}" n'a pas progressé. Le levier doit être réévalué.`;
  } else {
    limiterEvolution = "neutral";
    limiterVerdict = "partial";
    explanation = `Le limiteur "${previousLimiterLabel}" est stable. Adaptation insuffisante.`;
  }

  return {
    previousLimiter: previousLimiterId,
    previousLimiterLabel: previousLimiterLabel ?? previousLimiterId,
    limiterEvolution,
    limiterVerdict,
    explanation,
  };
}

function generateRecommendation(
  score: number,
  limiterAnalysis: LimiterAnalysis,
  metrics: MetricAnalysis[],
): { recommendation: CoachRecommendation; label: string; detail: string } {
  const positiveMetrics = metrics.filter(m => m.available && m.evolution === "positive");
  const negativeMetrics = metrics.filter(m => m.available && m.evolution === "negative");

  if (score >= 70 && limiterAnalysis.limiterVerdict !== "ineffective") {
    return {
      recommendation: "continue",
      label: "Continuer la stratégie actuelle",
      detail: `Le bloc a produit des adaptations significatives${positiveMetrics.length > 0 ? ` (${positiveMetrics.map(m => m.label).join(", ")})` : ""}. Maintenir l'orientation d'entraînement.`,
    };
  }

  if (score < 40 || limiterAnalysis.limiterVerdict === "ineffective") {
    const negativeNames = negativeMetrics.map(m => m.label).join(", ");
    return {
      recommendation: "change_lever",
      label: "Changer de levier",
      detail: limiterAnalysis.limiterVerdict === "ineffective"
        ? `${limiterAnalysis.explanation} Envisager une approche différente pour cibler ce limiteur.`
        : `Le bloc n'a pas produit les adaptations attendues${negativeNames ? ` (régression: ${negativeNames})` : ""}. Réévaluer la stratégie d'entraînement.`,
    };
  }

  return {
    recommendation: "adapt",
    label: "Adapter la stratégie",
    detail: `Le bloc a produit des résultats partiels. Ajuster les paramètres d'entraînement pour maximiser les adaptations du prochain cycle.`,
  };
}

function generateSummary(metrics: MetricAnalysis[], verdict: string): string {
  const available = metrics.filter(m => m.available);
  const positive = available.filter(m => m.evolution === "positive");
  const negative = available.filter(m => m.evolution === "negative");

  const parts: string[] = [];
  
  if (positive.length > 0) {
    parts.push(`amélioré ${positive.map(m => m.label.toLowerCase()).join(" et ")}`);
  }
  if (negative.length > 0) {
    parts.push(`${negative.map(m => m.label.toLowerCase()).join(" et ")} ${negative.length > 1 ? "ont régressé" : "a régressé"}`);
  }

  if (parts.length === 0) {
    return "Le dernier bloc d'entraînement n'a pas produit de changement significatif sur les métriques mesurées.";
  }

  let summary = `Le dernier bloc d'entraînement a ${parts.join(", mais ")}.`;
  return summary;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PUBLIQUE PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

export function computeCycleIntelligence(input: CycleIntelligenceInput): CycleIntelligenceResult {
  const { previousSnapshot, currentSnapshot, previousLimiterId, previousLimiterLabel, objectif } = input;

  // Analyze each metric
  const metrics = METRIC_CONFIGS.map(config => analyzeMetric(config, previousSnapshot, currentSnapshot));

  // Compute global score
  const adaptationScore = computeAdaptationScore(metrics);

  // Verdict
  const { verdict, label: verdictLabel, emoji: verdictEmoji } = getVerdict(adaptationScore);

  // Limiter analysis
  const limiterAnalysis = analyzeLimiter(metrics, previousLimiterId, previousLimiterLabel);

  // Recommendation
  const { recommendation, label: recommendationLabel, detail: recommendationDetail } = generateRecommendation(
    adaptationScore,
    limiterAnalysis,
    metrics,
  );

  // Days between
  const daysBetween = Math.round(
    (new Date(currentSnapshot.date).getTime() - new Date(previousSnapshot.date).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Summary
  const summary = generateSummary(metrics, verdictLabel);

  // Staff note
  const availableMetrics = metrics.filter(m => m.available);
  const staffNote = [
    `Cycle Intelligence: ${adaptationScore}/100 (${verdictLabel}).`,
    `Durée du bloc: ${daysBetween} jours.`,
    `Métriques analysées: ${availableMetrics.length}/${metrics.length}.`,
    limiterAnalysis.previousLimiter
      ? `Limiteur précédent: ${limiterAnalysis.previousLimiterLabel} → ${limiterAnalysis.limiterVerdict}.`
      : "",
    `Recommandation: ${recommendationLabel}.`,
  ].filter(Boolean).join(" ");

  return {
    adaptationScore,
    verdict,
    verdictLabel,
    verdictEmoji,
    metrics,
    limiterAnalysis,
    recommendation,
    recommendationLabel,
    recommendationDetail,
    previousSnapshotDate: previousSnapshot.date,
    currentSnapshotDate: currentSnapshot.date,
    daysBetween,
    summary,
    staffNote,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Prépare les données de snapshot pour le Cycle Intelligence Engine
 */
export function snapshotToEngineData(snapshot: Record<string, unknown>): SnapshotData {
  // Résolution VLamax sport-aware : pour un athlète CAP/Trail, le champ
  // `snapshot.vlamax` représente la VLamax vélo et n'est PAS représentatif
  // de la glycolyse en course. On utilise le resolver unifié.
  const vlamaxResolved = resolveVlamaxForGoal(
    {
      vlamax: snapshot.vlamax as number | null,
      vlamax_run: snapshot.vlamax_run as number | null,
      sport_main: snapshot.sport_main as string | null,
    },
    { goal: snapshot.objectif as string | null, objectif: snapshot.objectif as string | null }
  );
  return {
    id: (snapshot.id as string) || "",
    date: (snapshot.date as string) || "",
    vo2max: (snapshot.vo2max as number) ?? null,
    vlamax: vlamaxResolved.value,
    ftp: (snapshot.ftp as number) ?? null,
    weight_kg: (snapshot.weight_kg as number) ?? null,
    tte_observed_min: (snapshot.tte_observed_min as number) ?? null,
    tss_7d: (snapshot.tss_7d as number) ?? null,
    run_hr_drift_pct: (snapshot.run_hr_drift_pct as number) ?? null,
    run_economy_score: (snapshot.run_economy_score as number) ?? null,
    pace_threshold_sec_per_km: (snapshot.pace_threshold_sec_per_km as number) ?? null,
    vma: (snapshot.vma as number) ?? null,
    objectif: (snapshot.objectif as string) ?? null,
    fatigue_state: (snapshot.fatigue_state as string) ?? null,
  };
}

/**
 * Vérifie si une analyse Cycle Intelligence est possible
 * (nécessite au moins 2 snapshots)
 */
export function canComputeCycleIntelligence(snapshots: SnapshotData[]): boolean {
  return snapshots.length >= 2;
}

/**
 * Retourne le score color class pour l'UI
 */
export function getAdaptationScoreColor(score: number): string {
  if (score >= 70) return "text-emerald-600";
  if (score >= 55) return "text-blue-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
}

export function getAdaptationScoreBgColor(score: number): string {
  if (score >= 70) return "bg-emerald-500/10 border-emerald-500/30";
  if (score >= 55) return "bg-blue-500/10 border-blue-500/30";
  if (score >= 40) return "bg-amber-500/10 border-amber-500/30";
  return "bg-red-500/10 border-red-500/30";
}
