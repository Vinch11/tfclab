/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Mise à niveau des plans ANCIENS (générés avant les règles déterministes)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Deux correctifs appliqués à la volée, à l'ouverture d'un plan stocké :
 *
 *  1. AFFÛTAGE MINIMAL — les plans générés avant l'enforcement déterministe
 *     peuvent ne contenir qu'UNE semaine de taper (voire zéro). On reclasse les
 *     N dernières semaines en « Affûtage (Taper) » selon la distance
 *     (Mujika & Padilla 2003 ; Bosquet 2007 : 2–3 sem. pour les épreuves longues).
 *
 *  2. ANCRAGE CALENDAIRE — les plans sans `_planStartDate` mais avec `_raceDate`
 *     peuvent être ancrés rétroactivement : S(dernière) = semaine de la course,
 *     donc S1 = lundi(raceDate) − (totalSemaines − 1) semaines.
 *
 * Les deux passes sont IDEMPOTENTES : un plan déjà conforme n'est pas modifié.
 * Aucune écriture en base ici — la correction est appliquée à l'affichage et
 * persistée si le coach enregistre le plan.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { addWeeks, parseISO, startOfWeek } from "date-fns";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import { normalizeObjectiveKey } from "@/lib/normalizeObjectiveKey";
import { minTaperWeeksFor } from "@/lib/plan/planReconciler";

const TAPER_RX = /taper|aff[uû]t/i;
const TAPER_LABEL = "Affûtage (Taper)";

export interface LegacyTaperUpgradeReport {
  required: number;
  before: number;
  fixedWeeks: number[];
}

/**
 * Déduit l'objectif d'un plan ancien depuis son titre (ex. « Plan TFCL™ — IRONMAN
 * Kalmar — 19 semaines » → `IM`). Retourne `null` si aucun mot-clé reconnu.
 */
export function inferObjectiveFromPlan(plan: { title?: string | null } | null | undefined): string | null {
  const title = plan?.title;
  if (!title) return null;
  const key = normalizeObjectiveKey(title);
  // normalizeObjectiveKey renvoie l'entrée telle quelle si rien n'a matché.
  return key === title ? null : key;
}

/**
 * Reclasse en `taper` les dernières semaines d'un plan qui n'en compte pas assez.
 * Mute le plan reçu (appelé sur un clone dans la page).
 */
export function upgradeLegacyTaper(
  plan: ParsedPlan,
  objective: string | null | undefined,
): LegacyTaperUpgradeReport | null {
  // Les plans très anciens n'ont pas d'`_objective` stocké : on le déduit du titre.
  objective = objective || inferObjectiveFromPlan(plan);
  if (!objective) return null;
  const weeks = [...plan.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  if (weeks.length < 4) return null;

  const key = normalizeObjectiveKey(objective);
  const required = minTaperWeeksFor(key, weeks.length);
  const isTaper = (w: (typeof weeks)[number]) => TAPER_RX.test(`${w.phase} ${w.theme}`);
  const before = weeks.filter(isTaper).length;
  if (before >= required) return null;

  const fixedWeeks: number[] = [];
  // On ne reclasse QUE les semaines terminales — pas de trou au milieu du plan.
  for (const w of weeks.slice(Math.max(0, weeks.length - required))) {
    if (isTaper(w)) continue;
    w.phase = TAPER_LABEL;
    if (!TAPER_RX.test(w.theme)) w.theme = `${w.theme} — affûtage`;
    fixedWeeks.push(w.weekNumber);
  }
  if (fixedWeeks.length === 0) return null;
  return { required, before, fixedWeeks };
}

/**
 * Déduit la date de début d'un plan ancien non ancré au calendrier.
 * `fallbackRaceDate` (ISO) permet d'utiliser l'objectif A de l'athlète quand le
 * plan stocké ne contient aucune date de course.
 * Retourne `null` si aucune inférence fiable n'est possible.
 */
export function inferLegacyPlanStartDate(
  planJson: Record<string, unknown> | null | undefined,
  totalWeeks: number,
  fallbackRaceDate?: string | null,
): Date | null {
  if (!planJson || totalWeeks <= 0) return null;
  const explicit = planJson._planStartDate as string | undefined;
  if (explicit) {
    const d = parseISO(explicit);
    if (!isNaN(d.getTime())) return startOfWeek(d, { weekStartsOn: 1 });
  }
  const raceRaw = (planJson._raceDate as string | undefined) || fallbackRaceDate || undefined;
  if (!raceRaw) return null;
  const race = parseISO(raceRaw);
  if (isNaN(race.getTime())) return null;
  // La course tombe dans la DERNIÈRE semaine du plan.
  return addWeeks(startOfWeek(race, { weekStartsOn: 1 }), -(totalWeeks - 1));
}

/**
 * Détection NON MUTANTE du déficit d'affûtage, à appeler AVANT le post-traitement.
 *
 * ⚠ Nécessaire car `postProcessParsedPlan` (réconciliateur) reclasse déjà les
 * semaines terminales en taper : après lui, `upgradeLegacyTaper` ne voit plus
 * rien à corriger et le bandeau ne s'affichait jamais. On mesure donc l'état
 * BRUT du plan stocké et on renvoie les semaines qui seront reclassées.
 */
export function detectLegacyTaperGap(
  plan: ParsedPlan,
  objective: string | null | undefined,
): LegacyTaperUpgradeReport | null {
  objective = objective || inferObjectiveFromPlan(plan);
  if (!objective) return null;
  const weeks = [...plan.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  if (weeks.length < 4) return null;

  const key = normalizeObjectiveKey(objective);
  const required = minTaperWeeksFor(key, weeks.length);
  const isTaper = (w: (typeof weeks)[number]) => TAPER_RX.test(`${w.phase} ${w.theme}`);
  const before = weeks.filter(isTaper).length;
  if (before >= required) return null;

  const fixedWeeks = weeks
    .slice(Math.max(0, weeks.length - required))
    .filter((w) => !isTaper(w))
    .map((w) => w.weekNumber);
  if (fixedWeeks.length === 0) return null;
  return { required, before, fixedWeeks };
}
