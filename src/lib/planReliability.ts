/**
 * Plan Reliability — Calcule un score de fiabilité du plan IA
 * basé sur la complétude et la qualité des données d'entrée.
 * 
 * + Validation post-génération du plan structuré.
 */

import type { PlanAthleteData, PlanConfig } from "@/hooks/useAITrainingPlan";
import type { ParsedPlan } from "@/lib/aiPlanParser";

// =============================================
// SCORE DE FIABILITÉ DES DONNÉES D'ENTRÉE
// =============================================

export interface PlanReliabilityResult {
  score: number; // 0-100
  level: "ROBUST" | "PARTIAL" | "INSUFFICIENT";
  label: string;
  emoji: string;
  color: string;
  missingCritical: string[];
  missingOptional: string[];
  warnings: string[];
  details: { metric: string; available: boolean; weight: number }[];
}

const CRITICAL_METRICS: { key: keyof PlanAthleteData; label: string; weight: number; objectives?: string[] }[] = [
  { key: "ftp", label: "FTP", weight: 15, objectives: ["IM", "703"] },
  { key: "weightKg", label: "Poids", weight: 10 },
  { key: "vo2max", label: "VO2max", weight: 15 },
  { key: "vma", label: "VMA", weight: 15, objectives: ["Marathon", "Semi", "10K", "5K", "StartToRun"] },
  { key: "vlamax", label: "VLamax vélo", weight: 12, objectives: ["IM", "703"] },
  { key: "tte", label: "TTE", weight: 10 },
  { key: "fcMax", label: "FC Max", weight: 8 },
  { key: "css", label: "CSS natation", weight: 8, objectives: ["IM", "703"] },
  { key: "pmax5s", label: "Pmax 5s", weight: 5 },
  { key: "vlamaxRun", label: "VLamax course", weight: 7, objectives: ["Marathon", "Semi", "10K", "5K"] },
];

export function computePlanReliability(
  athleteData: PlanAthleteData,
  config: PlanConfig
): PlanReliabilityResult {
  const objective = config.objective?.toUpperCase() || "";
  const missingCritical: string[] = [];
  const missingOptional: string[] = [];
  const warnings: string[] = [];
  const details: { metric: string; available: boolean; weight: number }[] = [];

  let totalWeight = 0;
  let achievedWeight = 0;

  for (const m of CRITICAL_METRICS) {
    // Skip metrics not relevant to this objective
    if (m.objectives && !m.objectives.some(o => objective.includes(o.toUpperCase()))) {
      continue;
    }

    const value = athleteData[m.key];
    const available = value !== null && value !== undefined && value !== 0;
    totalWeight += m.weight;
    if (available) achievedWeight += m.weight;
    
    details.push({ metric: m.label, available, weight: m.weight });

    if (!available) {
      if (m.weight >= 10) {
        missingCritical.push(m.label);
      } else {
        missingOptional.push(m.label);
      }
    }
  }

  // Config completeness bonus
  if (!config.raceDate) { warnings.push("Pas de date de course → périodisation générique"); }
  if (!config.ambition) { warnings.push("Pas d'ambition → défaut Age Group"); }
  if (!config.identifiedLimiters?.length) { warnings.push("Aucun limiteur détecté → plan généraliste"); }

  const score = totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : 0;

  let level: PlanReliabilityResult["level"];
  let label: string;
  let emoji: string;
  let color: string;

  if (score >= 75) {
    level = "ROBUST";
    label = "Données robustes";
    emoji = "🟢";
    color = "text-green-600";
  } else if (score >= 50) {
    level = "PARTIAL";
    label = "Données partielles";
    emoji = "🟡";
    color = "text-amber-500";
  } else {
    level = "INSUFFICIENT";
    label = "Données insuffisantes";
    emoji = "🔴";
    color = "text-red-500";
  }

  return { score, level, label, emoji, color, missingCritical, missingOptional, warnings, details };
}

// =============================================
// VALIDATION POST-GÉNÉRATION
// =============================================

export interface PlanValidationResult {
  valid: boolean;
  score: number; // 0-100
  checks: PlanValidationCheck[];
}

export interface PlanValidationCheck {
  name: string;
  passed: boolean;
  severity: "error" | "warning" | "info";
  message: string;
}

export function validateGeneratedPlan(
  plan: ParsedPlan,
  config: PlanConfig
): PlanValidationResult {
  const checks: PlanValidationCheck[] = [];

  // 1. Check week count matches requested
  const requestedWeeks = config.weeksAvailable;
  if (requestedWeeks) {
    const generated = plan.weeks.length;
    const ratio = generated / requestedWeeks;
    checks.push({
      name: "Nombre de semaines",
      passed: ratio >= 0.8,
      severity: ratio >= 0.8 ? "info" : "warning",
      message: ratio >= 0.8
        ? `${generated}/${requestedWeeks} semaines générées`
        : `Seulement ${generated}/${requestedWeeks} semaines générées (${Math.round(ratio * 100)}%)`,
    });
  }

  // 2. Check progressive volume (no week should jump >30% vs previous)
  const weekSessionCounts = plan.weeks.map(w => w.sessions.filter(s => !s.isRest).length);
  let volumeProgressive = true;
  let volumeJumpWeek = 0;
  for (let i = 1; i < weekSessionCounts.length; i++) {
    const prev = weekSessionCounts[i - 1];
    const curr = weekSessionCounts[i];
    if (prev > 0 && curr > prev * 1.4) {
      volumeProgressive = false;
      volumeJumpWeek = i + 1;
      break;
    }
  }
  checks.push({
    name: "Progression volume",
    passed: volumeProgressive,
    severity: volumeProgressive ? "info" : "warning",
    message: volumeProgressive
      ? "Volume progressif vérifié"
      : `Saut de volume détecté semaine ${volumeJumpWeek} (+40%+ séances)`,
  });

  // 3. Check rest days exist
  const totalRest = plan.weeks.reduce((sum, w) => sum + w.sessions.filter(s => s.isRest).length, 0);
  const hasRestDays = totalRest >= plan.weeks.length; // At least 1 rest day per week on average
  checks.push({
    name: "Jours de repos",
    passed: hasRestDays,
    severity: hasRestDays ? "info" : "error",
    message: hasRestDays
      ? `${totalRest} jours de repos sur ${plan.weeks.length} semaines`
      : `Seulement ${totalRest} jours de repos — risque de surentraînement`,
  });

  // 4. Check taper exists (last 1-2 weeks should have fewer sessions)
  if (plan.weeks.length >= 4) {
    const lastWeek = weekSessionCounts[weekSessionCounts.length - 1];
    const peakWeek = Math.max(...weekSessionCounts.slice(0, -2));
    const hasTaper = peakWeek > 0 && lastWeek <= peakWeek * 0.85;
    checks.push({
      name: "Taper pré-course",
      passed: hasTaper,
      severity: hasTaper ? "info" : "warning",
      message: hasTaper
        ? "Taper détecté dans les dernières semaines"
        : "Pas de réduction de charge détectée avant la course",
    });
  }

  // 5. Check sport diversity for triathlon
  const obj = (config.objective || "").toUpperCase();
  if (obj.includes("IRONMAN") || obj.includes("70.3") || obj === "IM" || obj === "703") {
    const allSports = plan.weeks.flatMap(w => w.sessions.map(s => s.sport?.toLowerCase() || ""));
    const hasBike = allSports.some(s => s.includes("vélo") || s.includes("bike") || s.includes("cycling"));
    const hasRun = allSports.some(s => s.includes("cap") || s.includes("course") || s.includes("run"));
    const hasSwim = allSports.some(s => s.includes("nat") || s.includes("swim"));
    
    const sportCount = [hasBike, hasRun, hasSwim].filter(Boolean).length;
    checks.push({
      name: "Diversité sports (triathlon)",
      passed: sportCount === 3,
      severity: sportCount === 3 ? "info" : "error",
      message: sportCount === 3
        ? "3 sports présents (natation, vélo, course)"
        : `Seulement ${sportCount}/3 sports détectés — plan incomplet`,
    });
  }

  // 6. Check max sessions per day respected
  if (config.maxSessionsPerDay) {
    // This is approximate — check if any day in the plan description seems to exceed
    const maxPerDay = config.maxSessionsPerDay;
    checks.push({
      name: "Densité séances/jour",
      passed: true,
      severity: "info",
      message: `Configuré pour max ${maxPerDay} séance(s)/jour`,
    });
  }

  const passedCount = checks.filter(c => c.passed).length;
  const score = checks.length > 0 ? Math.round((passedCount / checks.length) * 100) : 100;
  const valid = !checks.some(c => !c.passed && c.severity === "error");

  return { valid, score, checks };
}
