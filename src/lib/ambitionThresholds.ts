/**
 * Ambition-Aware UI Thresholds
 * 
 * Évalue le statut (ok/warning/critical) d'une métrique
 * en fonction de l'objectif et du niveau d'ambition de l'athlète.
 * 
 * Remplace les seuils fixes universels (ex: FTP/kg >= 4.0 = "ok")
 * par des seuils contextualisés issus de physiologicalTargets.ts.
 */

import { AmbitionLevel, DEFAULT_AMBITION, getAmbitionDefinition } from "@/types/ambitionLevel";
import { getTargetsForAmbition, type ObjectiveTargets } from "@/lib/physiologicalTargets";

export type MetricStatus = "ok" | "warning" | "critical" | "neutral";

export interface MetricEvaluation {
  status: MetricStatus;
  target: string;       // Cible formatée pour affichage (ex: "≤ 0.40")
  targetValue: number;  // Valeur cible numérique
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
  const max = targets.vlamax.max;

  if (value === null) return { status: "neutral", target: `≤ ${optimal.toFixed(2)}`, targetValue: optimal };

  // Dans la plage optimale
  if (value <= optimal) return { status: "ok", target: `≤ ${optimal.toFixed(2)}`, targetValue: optimal };
  // Acceptable mais au-dessus de l'optimal
  if (value <= max) return { status: "warning", target: `≤ ${optimal.toFixed(2)}`, targetValue: optimal };
  // Au-dessus du maximum toléré
  return { status: "critical", target: `≤ ${optimal.toFixed(2)}`, targetValue: optimal };
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

  if (value === null || value === 0) return { status: "neutral", target: `≥ ${target} min`, targetValue: target };

  if (value >= target) return { status: "ok", target: `≥ ${target} min`, targetValue: target };
  if (value >= target * 0.8) return { status: "warning", target: `≥ ${target} min`, targetValue: target };
  return { status: "critical", target: `≥ ${target} min`, targetValue: target };
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

  if (value === null) return { status: "neutral", target: `≥ ${target.toFixed(1)} W/kg`, targetValue: target };

  if (value >= target) return { status: "ok", target: `≥ ${target.toFixed(1)} W/kg`, targetValue: target };
  if (value >= target * 0.85) return { status: "warning", target: `≥ ${target.toFixed(1)} W/kg`, targetValue: target };
  return { status: "critical", target: `≥ ${target.toFixed(1)} W/kg`, targetValue: target };
}

/**
 * Évalue le statut VO2max (seuils basés sur ambition + distance)
 * Pas de cible directe dans physiologicalTargets, on utilise une échelle dérivée
 */
export function evaluateVO2max(
  value: number | null,
  objectif: string,
  ambition: AmbitionLevel = DEFAULT_AMBITION
): MetricEvaluation {
  // VO2max targets scale with ambition
  const vo2Targets: Record<AmbitionLevel, number> = {
    finisher: 45,
    age_group: 52,
    competitor: 58,
    elite: 65,
  };
  
  // Long distance needs higher aerobic ceiling
  const isLong = ["IM", "Ironman", "Marathon", "Ultra", "TrailLong"].includes(objectif);
  const bonus = isLong ? 3 : 0;
  const target = vo2Targets[ambition] + bonus;

  if (value === null) return { status: "neutral", target: `≥ ${target} ml/kg/min`, targetValue: target };

  if (value >= target) return { status: "ok", target: `≥ ${target} ml/kg/min`, targetValue: target };
  if (value >= target * 0.85) return { status: "warning", target: `≥ ${target} ml/kg/min`, targetValue: target };
  return { status: "critical", target: `≥ ${target} ml/kg/min`, targetValue: target };
}

/**
 * Évalue le statut Potentiel Physiologique (toujours sur échelle 0-100)
 * Mais les seuils OK/Warning varient selon l'ambition
 */
export function evaluateReadiness(
  score: number | null,
  ambition: AmbitionLevel = DEFAULT_AMBITION
): MetricEvaluation {
  // Plus l'ambition est haute, plus le seuil "ok" est exigeant
  const potentielThresholds: Record<AmbitionLevel, { ok: number; warning: number }> = {
    finisher: { ok: 65, warning: 45 },
    age_group: { ok: 75, warning: 55 },
    competitor: { ok: 82, warning: 65 },
    elite: { ok: 88, warning: 72 },
  };
  
  const thresholds = potentielThresholds[ambition];

  if (score === null || score === 0) return { status: "neutral", target: `≥ ${thresholds.ok}%`, targetValue: thresholds.ok };

  if (score >= thresholds.ok) return { status: "ok", target: `≥ ${thresholds.ok}%`, targetValue: thresholds.ok };
  if (score >= thresholds.warning) return { status: "warning", target: `≥ ${thresholds.ok}%`, targetValue: thresholds.ok };
  return { status: "critical", target: `≥ ${thresholds.ok}%`, targetValue: thresholds.ok };
}
