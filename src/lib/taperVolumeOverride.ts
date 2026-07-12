/**
 * Weekly volume targets — periodized (Lorang) per-week target range.
 *
 * Historique : cette fonction ne posait un `volumeTarget` que pour les semaines
 * taper/race. Résultat (audit Claude 07/2026) : sur les autres semaines,
 * `week.volumeTarget` retombait sur la valeur calculée en aval (= volume RÉEL
 * des séances), et l'UI affichait « Volume cible : Xh » alors qu'il s'agissait
 * du volume mesuré. Voir `aiPlanParser.ts` (retiré: `computedVolumeStr` du
 * champ `volumeTarget`) et `AIPlanViewer` (Cible ≠ Réel désormais lisible).
 *
 * Règles de périodisation (base = `baseVolumeCibleH`) :
 *   - Fondation           ×0.85–1.00
 *   - Build               ×1.00–1.15
 *   - Spécifique / Peak   ×1.05–1.20
 *   - Semaine de décharge (thème/coach: "décharge"/"recovery"/"récup")   ×0.65
 *   - Affûtage (S-2 / phase Affûtage)                                    ×0.60
 *   - Semaine de course (S-1 vs raceDate)                                ×0.35
 *
 * `week.volumeTarget` reçoit un libellé lisible (« 8h30–10h · Build »).
 */

import type { ParsedPlan, ParsedWeek } from "@/lib/aiPlanParser";

const TAPER_RX = /taper|aff[uû]t|volume\s*cut/i;
const RACE_WEEK_RX = /course|race\s*week|jour\s*j|semaine\s*de\s*course/i;
const RECOVERY_RX = /d[eé]charge|recovery|r[eé]cup(?:[eé]ration)?|deload/i;

export function isTaperWeek(week: ParsedWeek): "race" | "taper" | null {
  const combined = `${week.theme} ${week.phase} ${week.coachNotes || ""}`;
  if (RACE_WEEK_RX.test(combined)) return "race";
  if (TAPER_RX.test(combined)) return "taper";
  return null;
}

function formatHours(h: number): string {
  if (h <= 0) return "0h";
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  if (mm === 0) return `${hh}h`;
  // arrondi visuel au quart d'heure
  const rounded = Math.round(mm / 15) * 15;
  if (rounded === 0) return `${hh}h`;
  if (rounded === 60) return `${hh + 1}h`;
  return `${hh}h${String(rounded).padStart(2, "0")}`;
}

type WeekKind = "race" | "taper" | "recovery" | "peak" | "build" | "foundation" | "generic";

function detectPhaseKind(phase: string): "peak" | "build" | "foundation" | "generic" {
  const p = phase.toLowerCase();
  if (/sp[eé]cifique|peak|comp[eé]tition/.test(p)) return "peak";
  if (/build|d[eé]veloppement|construction|intensification/.test(p)) return "build";
  if (/fond|base|foundation/.test(p)) return "foundation";
  return "generic";
}

const KIND_FACTORS: Record<WeekKind, number> = {
  race: 0.35,
  taper: 0.60,
  recovery: 0.65,
  peak: 1.125,
  build: 1.075,
  foundation: 0.925,
  generic: 1.00,
};

const KIND_LABELS: Record<WeekKind, string> = {
  race: "semaine de course",
  taper: "affûtage",
  recovery: "décharge",
  peak: "Spécifique",
  build: "Build",
  foundation: "Fondation",
  generic: "",
};

/**
 * Applique un `volumeTarget` PÉRIODISÉ sur toutes les semaines du plan.
 * `baseVolumeCibleH` = volume hebdo standard (issu de deriveRaceTargets).
 */
export function applyTaperVolumeOverride(
  plan: ParsedPlan,
  baseVolumeCibleH: number | null,
  opts: { raceWeekNumber?: number | null } = {},
): void {
  const raceWeek = opts.raceWeekNumber && opts.raceWeekNumber > 0 ? opts.raceWeekNumber : null;

  if (!baseVolumeCibleH || baseVolumeCibleH <= 0) {
    // eslint-disable-next-line no-console
    console.warn("📦 weeklyTargets SKIP : baseVolumeCibleH null/0 (weeklyHours manquant côté athlète).");
    return;
  }

  const detect = (week: ParsedWeek): WeekKind => {
    if (raceWeek) {
      if (week.weekNumber === raceWeek) return "race";
      if (week.weekNumber === raceWeek - 1) return "taper";
    } else {
      const t = isTaperWeek(week);
      if (t) return t;
    }
    const combined = `${week.theme} ${week.coachNotes || ""}`;
    if (RECOVERY_RX.test(combined)) return "recovery";
    return detectPhaseKind(week.phase || "");
  };

  for (const week of plan.weeks) {
    const kind = detect(week);
    const factor = KIND_FACTORS[kind];
    const target = baseVolumeCibleH * factor;
    const lo = formatHours(target * 0.90);
    const hi = formatHours(target * 1.10);
    const label = KIND_LABELS[kind];
    const suffix = label ? ` · ${label}` : "";
    week.volumeTarget = `${lo}–${hi}${suffix}`;
    // eslint-disable-next-line no-console
    console.log("📦 weeklyTarget", {
      semaine: week.weekNumber,
      kind,
      factor,
      target: Number(target.toFixed(2)),
      base: baseVolumeCibleH,
    });
  }
}
