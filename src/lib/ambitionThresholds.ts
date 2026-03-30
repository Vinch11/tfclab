/**
 * Ambition-Aware UI Thresholds
 * 
 * Uses the SAME scoring functions as the Coaching Compass
 * to ensure consistency across all UI components.
 */

import { AmbitionLevel, DEFAULT_AMBITION } from "@/types/ambitionLevel";
import { getTargetsForAmbition } from "@/lib/physiologicalTargets";
import { scoreRelativeToTarget, scoreRelativeToTargetInverse } from "@/lib/coachingCompass";

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
 */
export function evaluateVLamax(
  value: number | null,
  objectif: string,
  ambition: AmbitionLevel = DEFAULT_AMBITION
): MetricEvaluation {
  const targets = getTargetsForAmbition(objectif, ambition);
  const optimal = targets.vlamax.optimal;

  if (value === null) return { status: "neutral", target: `≤ ${optimal.toFixed(2)}`, targetValue: optimal, score: 0 };

  const score = scoreRelativeToTargetInverse(value, optimal);
  return { status: statusFromScore(score), target: `≤ ${optimal.toFixed(2)}`, targetValue: optimal, score };
}

/**
 * Évalue le statut TTE par rapport aux cibles ambition
 */
export function evaluateTTE(
  value: number | null,
  objectif: string,
  ambition: AmbitionLevel = DEFAULT_AMBITION
): MetricEvaluation {
  const targets = getTargetsForAmbition(objectif, ambition);
  const target = targets.tte_min;

  if (value === null || value === 0) return { status: "neutral", target: `≥ ${target} min`, targetValue: target, score: 0 };

  const score = scoreRelativeToTarget(value, target);
  return { status: statusFromScore(score), target: `≥ ${target} min`, targetValue: target, score };
}

/**
 * Évalue le statut FTP/kg par rapport aux cibles ambition
 */
export function evaluateFtpKg(
  value: number | null,
  objectif: string,
  ambition: AmbitionLevel = DEFAULT_AMBITION
): MetricEvaluation {
  const targets = getTargetsForAmbition(objectif, ambition);
  const target = targets.ftp_kg_min;

  if (value === null) return { status: "neutral", target: `≥ ${target.toFixed(1)} W/kg`, targetValue: target, score: 0 };

  const score = scoreRelativeToTarget(value, target);
  return { status: statusFromScore(score), target: `≥ ${target.toFixed(1)} W/kg`, targetValue: target, score };
}

/**
 * Évalue le statut VO2max (seuils basés sur ambition + distance)
 */
export function evaluateVO2max(
  value: number | null,
  objectif: string,
  ambition: AmbitionLevel = DEFAULT_AMBITION
): MetricEvaluation {
  const vo2Targets: Record<AmbitionLevel, number> = {
    finisher: 45,
    age_group: 52,
    competitor: 58,
    elite: 65,
  };
  
  const isLong = ["IM", "Ironman", "Marathon", "Ultra", "TrailLong"].includes(objectif);
  const bonus = isLong ? 3 : 0;
  const target = vo2Targets[ambition] + bonus;

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
  const potentielThresholds: Record<AmbitionLevel, { ok: number; warning: number }> = {
    finisher: { ok: 65, warning: 45 },
    age_group: { ok: 75, warning: 55 },
    competitor: { ok: 82, warning: 65 },
    elite: { ok: 88, warning: 72 },
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
