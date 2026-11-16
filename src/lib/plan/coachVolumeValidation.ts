import { parseSessionDurationMin } from "@/engines/plan/planValidator";
import type { ParsedSession } from "@/lib/aiPlanParser";
import type { ValidationIssue } from "@/engines/plan/planValidator";
import { isRaceDaySession } from "../../../supabase/functions/_shared/raceDayIdentity";
import type { FinalValidationPlanLike } from "./qa/checkB13";
import type { CoachVolumeBudget } from "@/engines/plan/sessionSizingMatrix";
import { normalizeRepairSport } from '../../../supabase/functions/_shared/repairSportingEquivalence';

/** Read-only check of prescribed durations, after model/repairs/edits. No resizing of catalogue cards. */
/** Overruns up to min(5 min, 1 % of the ceiling) stay visible as warnings but never refuse a plan. */
export const COACH_LOAD_TOLERANCE_MIN = 5;
export const COACH_LOAD_TOLERANCE_PCT = 0.01;

export function validateCoachVolumeBudgets(plan: Pick<FinalValidationPlanLike, "weeks">, quotas: Record<number, { weekType?: string; volumeBudget?: CoachVolumeBudget }> = {}): Array<ValidationIssue & { severity: "error" | "warning" }> {
  const issues: Array<ValidationIssue & { severity: "error" | "warning" }> = [];
  let previousLoad: { minutes: number; globalWeek: number } | undefined;
  for (const week of [...plan.weeks].sort((a, b) => a.weekNumber - b.weekNumber)) {
    const entry = quotas[week.weekNumber];
    const budget = entry?.volumeBudget;
    if (!entry || !budget || week.sessions.some(isRaceDaySession)) continue;
    const active = week.sessions.filter(s => !s.isRest && s.sport !== "rest" && normalizeRepairSport(s.sport) !== "strength");
    const durations = active.map(s => (parseSessionDurationMin(s as ParsedSession) ?? 0));
    const missing = durations.filter(n => !Number.isFinite(n) || n <= 0).length;
    if (missing) {
      issues.push({ rule: "coach_load_violation", severity: "error", week: week.weekNumber,
        message: `S${week.weekNumber}: plafond de charge non vérifiable (${missing} durée(s) absente(s))` });
      continue;
    }
    const total = durations.reduce((sum, duration) => sum + duration, 0);
    let ceiling = budget.maxMinutes;
    let reason = "plafond du niveau coach";
    if (previousLoad && budget.globalWeek > previousLoad.globalWeek && entry.weekType !== 'taper') {
      const actualCeiling = previousLoad.minutes * (entry.weekType === "recovery" ? 0.7 : 1 + budget.weeklyIncreasePctMax);
      if (actualCeiling < ceiling) {
        ceiling = actualCeiling;
        reason = entry.weekType === "recovery" ? "assimilation : au plus 70% de la dernière semaine de charge" : "progression depuis la dernière semaine de charge prescrite";
      }
    }
    if (total > ceiling + 1e-6) issues.push({ rule: "coach_load_violation", severity: total - ceiling <= Math.min(COACH_LOAD_TOLERANCE_MIN, ceiling * COACH_LOAD_TOLERANCE_PCT) ? "warning" : "error", week: week.weekNumber,
      message: `S${week.weekNumber}: ${total} min d'endurance prescrites > ${Math.floor(ceiling)} min (${reason}, hors renforcement)`,
      detail: `Référence ${budget.referenceSource === "coach" ? "déclarée par le coach" : "de planification Auto, jamais une charge mesurée"}. Corriger la prescription ; ne pas supprimer des séances ou modifier une fiche pour effacer cette alerte.` });
    // The nominal target cannot force a dose above the actual progression/recovery ceiling.
    // Keep that target visible, but validate only the attainable minimum.
    const minimum = budget.minMinutes == null ? undefined : Math.min(budget.minMinutes, Math.floor(ceiling));
    if (minimum != null && total + 1e-6 < minimum) issues.push({ rule: "coach_volume_under_min", severity: minimum - total <= Math.min(COACH_LOAD_TOLERANCE_MIN, minimum * COACH_LOAD_TOLERANCE_PCT) ? "warning" : "error", week: week.weekNumber,
      message: `S${week.weekNumber}: ${total} min d'endurance prescrites < minimum ${minimum} min (cible ${budget.targetMinutes ?? budget.minMinutes} min, hors renforcement)`,
      detail: minimum !== budget.minMinutes
        ? `Minimum nominal ${budget.minMinutes} min limité par ${reason} : la progression et la récupération priment sur la cible horaire. Ne pas augmenter la charge au-delà de ${Math.floor(ceiling)} min pour atteindre la cible.`
        : `Fourchette horaire ${budget.referenceSource === "coach" ? "déclarée par le coach" : "affichée au coach (Auto)"} non respectée : allonger les séances d'endurance dans les bornes de leur fiche, sans ajouter de séance ni compter le renforcement.` });
    if (entry.weekType === "load" && total > 0) previousLoad = { minutes: total, globalWeek: budget.globalWeek };
  }
  return issues;
}

/** Below a ceiling is not proof that the athlete can tolerate the first dose. */
export function validateCoachInitialLoad(plan: Pick<FinalValidationPlanLike, "weeks">,
  quotas: Record<number, { volumeBudget?: CoachVolumeBudget }> = {}): Array<ValidationIssue & { severity: "warning" }> {
  const first = plan.weeks.find(w => quotas[w.weekNumber]?.volumeBudget?.globalWeek === 1);
  if (!first || quotas[first.weekNumber]?.volumeBudget?.referenceSource === "coach") return [];
  return [{ rule: "coach_initial_load_unverified", severity: "warning", week: first.weekNumber,
    message: `S${first.weekNumber}: charge initiale non attestée — validation du coach nécessaire avant utilisation.`,
    detail: "Heures hebdomadaires non renseignées : fourchette de référence Auto, pas une charge mesurée ni une disponibilité déclarée. Vérifier les durées réellement prescrites, la fréquence et la récupération par rapport à la pratique actuelle ; les limiteurs physiologiques ne prouvent pas la capacité de charge." }];
}

export function validateCoachLoadIssues(plan: Pick<FinalValidationPlanLike, "weeks">,
  quotas: Record<number, { weekType?: string; volumeBudget?: CoachVolumeBudget }> = {}) {
  return [...validateCoachVolumeBudgets(plan, quotas), ...validateCoachInitialLoad(plan, quotas)];
}

/**
 * Brings weeks back under their coach load ceiling by shortening secondary
 * endurance sessions only (never key sessions, the longest session per sport,
 * race days or strength), at most 25 % each, in 5-min steps. Returns the list
 * of adjustments; weeks that cannot be fixed this way stay refused by validation.
 */
export function repairCoachLoadCeilings<P extends Pick<FinalValidationPlanLike, "weeks">>(plan: P,
  quotas: Record<number, { weekType?: string; volumeBudget?: CoachVolumeBudget }> = {}, onlyWeeks?: number[]): string[] {
  const notes: string[] = [];
  const unfixable = new Set<number>();
  for (let pass = 0; pass < plan.weeks.length * 3; pass++) {
    const issue = validateCoachVolumeBudgets(plan, quotas).find(i => i.rule === "coach_load_violation" && /> (\d+) min/.test(i.message) && !unfixable.has(i.week ?? -1) && (!onlyWeeks || onlyWeeks.includes(i.week ?? -1)));
    if (!issue) break;
    const week = plan.weeks.find(w => w.weekNumber === issue.week);
    const m = /: (\d+(?:\.\d+)?) min d'endurance prescrites > (\d+) min/.exec(issue.message);
    if (!week || !m) { unfixable.add(issue.week ?? -1); continue; }
    let excess = Number(m[1]) - Number(m[2]);
    const active = week.sessions.filter(s => !s.isRest && s.sport !== "rest" && normalizeRepairSport(s.sport) !== "strength") as ParsedSession[];
    const longest = new Map<string, ParsedSession>();
    for (const s of active) { const k = normalizeRepairSport(s.sport); const cur = longest.get(k); if (!cur || (s.durationMin ?? 0) > (cur.durationMin ?? 0)) longest.set(k, s); }
    const candidates = active.filter(s => typeof s.durationMin === "number" && s.durationMin > 30 && !s.isKeySession && ![...longest.values()].includes(s))
      .sort((a, b) => (b.durationMin ?? 0) - (a.durationMin ?? 0));
    let changed = false;
    for (const s of candidates) {
      if (excess <= 0) break;
      const before = s.durationMin as number;
      const maxCut = Math.floor((before * 0.25) / 5) * 5;
      const cut = Math.min(maxCut, Math.ceil(excess / 5) * 5);
      if (cut <= 0) continue;
      s.durationMin = before - cut;
      excess -= cut;
      changed = true;
      notes.push(`S${week.weekNumber} ${s.sport}: ${before} → ${s.durationMin} min (plafond de charge)`);
    }
    // A week that cannot be brought back stays refused by validation; keep repairing the others.
    if (!changed || excess > 0) unfixable.add(week.weekNumber);
  }
  return notes;
}
