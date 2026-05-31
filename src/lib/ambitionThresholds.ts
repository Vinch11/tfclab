/**
 * Ambition-Aware UI Thresholds
 * 
 * Uses the SAME scoring functions as the Coaching Compass
 * to ensure consistency across all UI components.
 * 
 * ✅ V2: Age adjustment applied to FTP/kg, VMA, TTE, VO2max targets
 *    (aligned with Compass and Unified Limiter)
 */

import { AmbitionLevel, DEFAULT_AMBITION } from "@/types/ambitionLevel";
import { getTargetsForAmbition, getVLamaxRange } from "@/lib/physiologicalTargets";
import { scoreRelativeToTarget, scoreRelativeToTargetInverse } from "@/lib/coachingCompass";
import { getPerformanceAgeFactor, getTTEAgeFactor, getVo2maxTarget } from "@/lib/v2/unifiedLimiterDetection";

export type MetricStatus = "ok" | "warning" | "critical" | "neutral";

export interface MetricEvaluation {
  status: MetricStatus;
  target: string;       // Cible formatée pour affichage (ex: "≤ 0.40")
  targetValue: number;  // Valeur cible numérique
  score: number;        // Score 0-100 (same as Compass)
}

/** Derive status from a 0-100 score — same thresholds as Compass UI */
function statusFromScore(score: number): MetricStatus {
  if (score >= 75) return "ok";
  if (score >= 50) return "warning";
  return "critical";
}

/**
 * Évalue le statut VLamax par rapport aux cibles ambition
 * Note: VLamax n'est PAS ajusté par l'âge (profil métabolique cible identique)
 */
export function evaluateVLamax(
  value: number | null,
  objectif: string,
  ambition: AmbitionLevel = DEFAULT_AMBITION,
  _athleteAge?: number | null, // ignored — VLamax has no age adjustment
  sport?: string | null,
): MetricEvaluation {
  const targets = getVLamaxRange(objectif, ambition, sport ?? undefined);
  const optimal = targets.optimal;

  const targetLabel = `≤ ${optimal.toFixed(2)} (${targets.min.toFixed(2)}–${targets.max.toFixed(2)})`;

  if (value === null) return { status: "neutral", target: targetLabel, targetValue: optimal, score: 0 };

  const score = scoreRelativeToTargetInverse(value, optimal);
  return { status: statusFromScore(score), target: targetLabel, targetValue: optimal, score };
}

/**
 * Évalue le statut TTE par rapport aux cibles ambition
 * ✅ Ajusté par l'âge via getTTEAgeFactor (déclin modéré)
 */
export function evaluateTTE(
  value: number | null,
  objectif: string,
  ambition: AmbitionLevel = DEFAULT_AMBITION,
  athleteAge?: number | null,
): MetricEvaluation {
  const targets = getTargetsForAmbition(objectif, ambition);
  const tteAgeFactor = getTTEAgeFactor(athleteAge ?? null);
  const target = Math.round(targets.tte_min * tteAgeFactor);

  if (value === null || value === 0) return { status: "neutral", target: `≥ ${target} min`, targetValue: target, score: 0 };

  const score = scoreRelativeToTarget(value, target);
  return { status: statusFromScore(score), target: `≥ ${target} min`, targetValue: target, score };
}

/**
 * Évalue le statut FTP/kg par rapport aux cibles ambition
 * ✅ Ajusté par l'âge via getPerformanceAgeFactor (déclin ~5-7% / décennie)
 */
export function evaluateFtpKg(
  value: number | null,
  objectif: string,
  ambition: AmbitionLevel = DEFAULT_AMBITION,
  athleteAge?: number | null,
): MetricEvaluation {
  const targets = getTargetsForAmbition(objectif, ambition);
  const ageFactor = getPerformanceAgeFactor(athleteAge ?? null);
  const target = Math.round(targets.ftp_kg_min * ageFactor * 100) / 100;

  if (value === null) return { status: "neutral", target: `≥ ${target.toFixed(1)} W/kg`, targetValue: target, score: 0 };

  const score = scoreRelativeToTarget(value, target);
  return { status: statusFromScore(score), target: `≥ ${target.toFixed(1)} W/kg`, targetValue: target, score };
}

/**
 * Évalue le statut VO2max (seuils basés sur ambition + distance)
 * ✅ Ajusté par l'âge via getPerformanceAgeFactor
 */
export function evaluateVO2max(
  value: number | null,
  objectif: string,
  ambition: AmbitionLevel = DEFAULT_AMBITION,
  athleteAge?: number | null,
): MetricEvaluation {
  // Use the SAME per-objective, per-ambition, age-adjusted VO2max target
  // as the Unified Limiter Detection engine for full consistency
  const target = getVo2maxTarget(objectif, ambition, athleteAge ?? null);

  if (value === null) return { status: "neutral", target: `≥ ${target} ml/kg/min`, targetValue: target, score: 0 };

  const score = scoreRelativeToTarget(value, target);
  return { status: statusFromScore(score), target: `≥ ${target} ml/kg/min`, targetValue: target, score };
}

/**
 * Évalue le statut Potentiel Physiologique (toujours sur échelle 0-100)
 */
export function evaluateReadiness(
  potentielScore: number | null,
  ambition: AmbitionLevel = DEFAULT_AMBITION
): MetricEvaluation {
  // Seuils Potentiel Physiologique alignés sur les 5 paliers d'ambition
  // (Découverte → Confirmé → Compétiteur → Qualifiable → Elite top 3%)
  const potentielThresholds: Record<AmbitionLevel, { ok: number; warning: number }> = {
    finisher:    { ok: 60, warning: 40 },   // Découverte
    age_group:   { ok: 72, warning: 52 },   // Confirmé
    competitor:  { ok: 80, warning: 62 },   // Compétiteur
    elite:       { ok: 86, warning: 70 },   // Qualifiable
    world_class: { ok: 92, warning: 78 },   // Elite (top 3%)
  };
  
  const thresholds = potentielThresholds[ambition];

  if (potentielScore === null || potentielScore === 0) return { status: "neutral", target: `≥ ${thresholds.ok}%`, targetValue: thresholds.ok, score: 0 };

  // Use the score as-is since potentiel is already 0-100
  const score = scoreRelativeToTarget(potentielScore, thresholds.ok);
  return { 
    status: statusFromScore(score), 
    target: `≥ ${thresholds.ok}%`, 
    targetValue: thresholds.ok,
    score,
  };
}
