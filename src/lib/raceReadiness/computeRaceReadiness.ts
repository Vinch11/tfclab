/**
 * Race Readiness — Bilan pré-objectif TFCL
 * Calcule un % de readiness à partir des axes du Coaching Compass
 * (déjà alignés sur les cibles d'ambition via scoreRelativeToTarget).
 *
 * Pas d'invention de chiffre : si compass = null → readiness = null.
 */

import type { TFCLCoachingCompassResult, RadarAxis } from "@/lib/coachingCompass/types";

export interface AxisAlignment {
  key: string;
  label: string;
  score: number;          // 0-100 (issu du compass)
  value: number | null;
  target: number | null;
  unit: string;
  status: "strong" | "ok" | "below" | "gap";
}

export interface RaceReadinessResult {
  scorePct: number;             // 0-100
  level: "low" | "moderate" | "good" | "excellent";
  levelLabel: string;
  axes: AxisAlignment[];
  governingAxis: AxisAlignment | null; // axe le plus faible
  strengths: AxisAlignment[];          // score >= 80
  gaps: AxisAlignment[];               // score < 60
  limiter: { label: string; description: string } | null;
}

function statusFromScore(score: number): AxisAlignment["status"] {
  if (score >= 85) return "strong";
  if (score >= 70) return "ok";
  if (score >= 55) return "below";
  return "gap";
}

function axisToAlignment(a: RadarAxis): AxisAlignment {
  return {
    key: a.key,
    label: a.label,
    score: Math.round(a.score),
    value: a.value,
    target: a.target,
    unit: a.unit,
    status: statusFromScore(a.score),
  };
}

export function computeRaceReadiness(compass: TFCLCoachingCompassResult | null): RaceReadinessResult | null {
  if (!compass) return null;

  // Axes principaux (4 piliers : aerobic, vlamax, fatmax/durability, durabilité)
  const primaryAxes = compass.radarAxes.map(axisToAlignment);

  if (primaryAxes.length === 0) return null;

  // Moyenne pondérée — tous les axes ont poids égal sauf si gap critique → pénalité.
  const sum = primaryAxes.reduce((acc, a) => acc + a.score, 0);
  const avg = sum / primaryAxes.length;

  // Pénalité si l'axe le plus faible est très bas (gap > 40 vs moyenne)
  const min = Math.min(...primaryAxes.map(a => a.score));
  const penalty = avg - min > 30 ? (avg - min - 30) * 0.4 : 0;

  const scorePct = Math.max(0, Math.min(100, Math.round(avg - penalty)));

  const level: RaceReadinessResult["level"] =
    scorePct >= 85 ? "excellent" :
    scorePct >= 70 ? "good" :
    scorePct >= 55 ? "moderate" : "low";

  const levelLabel =
    level === "excellent" ? "Excellent — prêt à performer" :
    level === "good" ? "Bonne forme — alignement solide" :
    level === "moderate" ? "Forme correcte — quelques marges" :
    "Préparation incomplète — voir points de vigilance";

  const governingAxis = primaryAxes.reduce((min, a) => (a.score < min.score ? a : min), primaryAxes[0]);
  const strengths = primaryAxes.filter(a => a.score >= 80);
  const gaps = primaryAxes.filter(a => a.score < 60);

  const limiter = compass.limiter && compass.limiter.type !== "unknown"
    ? { label: compass.limiter.label, description: compass.limiter.description }
    : null;

  return {
    scorePct,
    level,
    levelLabel,
    axes: primaryAxes,
    governingAxis,
    strengths,
    gaps,
    limiter,
  };
}
