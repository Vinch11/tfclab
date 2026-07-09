/**
 * Chantier 3 — Override volumeCible pour semaines de taper/affûtage.
 *
 * Le champ `week.volumeTarget` produit par l'IA hérite souvent du volume du bloc parent
 * (ex: "12h-14h") même pour les semaines d'affûtage où la charge réelle est ~40-60% inférieure.
 * On applique un facteur taper au volume de base pour recalculer un affichage cohérent.
 *
 *  - S-2 avant course (Volume Cut / Affûtage général) : ×0.60
 *  - S-1 semaine de course (hors J-J1)                 : ×0.35
 */

import type { ParsedPlan, ParsedWeek } from "@/lib/aiPlanParser";

const TAPER_RX = /taper|aff[uû]t|volume\s*cut/i;
const RACE_WEEK_RX = /course|race\s*week|jour\s*j|semaine\s*de\s*course/i;

export function isTaperWeek(week: ParsedWeek): "race" | "taper" | null {
  const combined = `${week.theme} ${week.phase} ${week.coachNotes || ""}`;
  if (RACE_WEEK_RX.test(combined)) return "race";
  if (TAPER_RX.test(combined)) return "taper";
  return null;
}

function formatHours(h: number): string {
  const rounded = Math.round(h * 2) / 2;
  return `${rounded}h`;
}

/**
 * Applique l'override de volume aux semaines taper/course.
 * `baseVolumeCibleH` = volumeCible hebdo standard du plan (heures) issu de deriveRaceTargets.
 * Mute directement plan.weeks[i].volumeTarget.
 */
export function applyTaperVolumeOverride(
  plan: ParsedPlan,
  baseVolumeCibleH: number | null,
  opts: { raceWeekNumber?: number | null } = {},
): void {
  const raceWeek = opts.raceWeekNumber && opts.raceWeekNumber > 0 ? opts.raceWeekNumber : null;

  const detect = (week: ParsedWeek): "race" | "taper" | null => {
    if (raceWeek) {
      // Index-based prioritaire quand raceDate connu : évite les faux positifs
      // provoqués par des noms de bloc/phase contenant "course" (ex: "Spécificité Course").
      if (week.weekNumber === raceWeek) return "race";
      if (week.weekNumber === raceWeek - 1) return "taper";
      return null;
    }
    return isTaperWeek(week);
  };

  // Log d'entrée systématique pour toutes les semaines (diagnostic pipeline).
  for (const week of plan.weeks) {
    // eslint-disable-next-line no-console
    console.log("📦 taperOverride ENTRY", {
      semaine: week.weekNumber,
      titre: week.theme,
      phase: week.phase,
      baseVolumeCibleH,
      detectedKind: detect(week),
      raceWeek,
    });
  }

  if (!baseVolumeCibleH || baseVolumeCibleH <= 0) {
    // eslint-disable-next-line no-console
    console.warn("📦 taperOverride SKIP : baseVolumeCibleH null/0 (weeklyHours manquant côté athlète). Aucune substitution appliquée.");
    return;
  }

  for (const week of plan.weeks) {
    const kind = detect(week);
    if (!kind) continue;
    const factor = kind === "race" ? 0.35 : 0.6;
    const target = baseVolumeCibleH * factor;
    const overridden = `${formatHours(target * 0.85)}-${formatHours(target * 1.15)} (taper ×${factor})`;
    // eslint-disable-next-line no-console
    console.log("📦 volumeCible APPLIED", {
      semaine: week.weekNumber,
      type: kind,
      volumeBloc: baseVolumeCibleH,
      facteur: factor,
      volumeFinal: Number(target.toFixed(2)),
    });
    week.volumeTarget = overridden;
  }
}
