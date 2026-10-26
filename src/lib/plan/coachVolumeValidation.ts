import { parseSessionDurationMin } from "@/engines/plan/planValidator";
import type { ParsedSession } from "@/lib/aiPlanParser";
import type { ValidationIssue } from "@/engines/plan/planValidator";
import { isRaceDaySession } from "../../../supabase/functions/_shared/raceDayIdentity";
import type { FinalValidationPlanLike } from "./qa/checkB13";
import type { CoachVolumeBudget } from "@/engines/plan/sessionSizingMatrix";

/** Read-only check of prescribed durations, after model/repairs/edits. No resizing of catalogue cards. */
export function validateCoachVolumeBudgets(plan: Pick<FinalValidationPlanLike, "weeks">, quotas: Record<number, { weekType?: string; volumeBudget?: CoachVolumeBudget }> = {}): Array<ValidationIssue & { severity: "error" }> {
  const issues: Array<ValidationIssue & { severity: "error" }> = [];
  let previousLoad: { minutes: number; globalWeek: number } | undefined;
  for (const week of [...plan.weeks].sort((a, b) => a.weekNumber - b.weekNumber)) {
    const entry = quotas[week.weekNumber];
    const budget = entry?.volumeBudget;
    if (!entry || !budget || week.sessions.some(isRaceDaySession)) { previousLoad = undefined; continue; }
    const active = week.sessions.filter(s => !s.isRest && s.sport !== "rest");
    const durations = active.map(s => (parseSessionDurationMin(s as ParsedSession) ?? 0));
    const missing = durations.filter(n => !Number.isFinite(n) || n <= 0).length;
    if (missing) {
      issues.push({ rule: "coach_load_violation", severity: "error", week: week.weekNumber,
        message: `S${week.weekNumber}: plafond de charge non vérifiable (${missing} durée(s) absente(s))` });
      previousLoad = undefined; continue;
    }
    const total = durations.reduce((a, b) => a + b, 0);
    let ceiling = budget.maxMinutes;
    let reason = "plafond du niveau coach";
    if (previousLoad && budget.globalWeek > previousLoad.globalWeek) {
      const actualCeiling = previousLoad.minutes * (entry.weekType === "recovery" ? 0.7 : 1 + budget.weeklyIncreasePctMax);
      if (actualCeiling < ceiling) {
        ceiling = actualCeiling;
        reason = entry.weekType === "recovery" ? "assimilation : au plus 70% de la dernière semaine de charge" : "progression depuis la dernière semaine de charge prescrite";
      }
    }
    if (total > ceiling + 1e-6) issues.push({ rule: "coach_load_violation", severity: "error", week: week.weekNumber,
      message: `S${week.weekNumber}: ${total} min prescrites > ${Math.floor(ceiling)} min (${reason})`,
      detail: `Référence ${budget.referenceSource === "internal-matrix" ? "interne de planification, jamais une charge mesurée" : "déclarée par le coach"}. Corriger la prescription ; ne pas supprimer des séances ou modifier une fiche pour effacer cette alerte.` });
    if (entry.weekType === "load" && total > 0) previousLoad = { minutes: total, globalWeek: budget.globalWeek };
  }
  return issues;
}

/** Below a ceiling is not proof that the athlete can tolerate the first dose. */
export function validateCoachInitialLoad(plan: Pick<FinalValidationPlanLike, "weeks">,
  quotas: Record<number, { volumeBudget?: CoachVolumeBudget }> = {}): Array<ValidationIssue & { severity: "warning" }> {
  const first = plan.weeks.find(w => quotas[w.weekNumber]?.volumeBudget?.globalWeek === 1);
  if (!first || quotas[first.weekNumber]?.volumeBudget?.referenceSource !== "internal-matrix") return [];
  return [{ rule: "coach_initial_load_unverified", severity: "warning", week: first.weekNumber,
    message: `S${first.weekNumber}: charge initiale non attestée — validation du coach nécessaire avant utilisation.`,
    detail: "Heures hebdomadaires non renseignées : référence interne de planification uniquement. Être sous le plafond ne démontre pas la tolérance. Vérifier les durées réellement prescrites, la fréquence et la récupération par rapport à la pratique actuelle ; les limiteurs physiologiques ne prouvent pas la capacité de charge." }];
}

export function validateCoachLoadIssues(plan: Pick<FinalValidationPlanLike, "weeks">,
  quotas: Record<number, { weekType?: string; volumeBudget?: CoachVolumeBudget }> = {}) {
  return [...validateCoachVolumeBudgets(plan, quotas), ...validateCoachInitialLoad(plan, quotas)];
}
