/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * WORKOUT DURATION RESOLVER — durée canonique déterministe par phase
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Problème résolu : de nombreuses fiches exposent une plage large
 * (ex. `durationMin: [120, 230]` → « 2h-3h50 »). Injectée telle quelle dans le
 * prompt, cette plage oblige l'IA — puis les post-processeurs texte — à
 * « deviner » une durée, ce qui produit des incohérences de volume hebdomadaire
 * et de TSS.
 *
 * Principe : la durée n'est PAS une propriété de la séance, c'est une propriété
 * de la PRESCRIPTION. Une même sortie longue race-pace vaut 2h en base et 3h50
 * en peak. On résout donc la durée de manière déterministe :
 *
 *   1. `durationByPhase` explicite sur la fiche (source prioritaire, éditoriale)
 *   2. sinon interpolation dans `durationMin` selon un poids de phase fixe
 *
 * Aucune duplication de fiche n'est nécessaire : une fiche = une intention.
 */

import type { LibraryWorkout, PhaseTag } from "@/types/workoutLibrary";

/** Position dans la plage [min, max] selon la phase (0 = min, 1 = max). */
export const PHASE_DURATION_WEIGHT: Record<PhaseTag, number> = {
  base: 0.25,
  build: 0.55,
  peak: 0.85,
  taper: 0.1,
};

/** Au-delà de ce delta (minutes), une plage est considérée « large » et doit être résolue. */
export const WIDE_RANGE_THRESHOLD_MIN = 60;

/** Arrondi au pas de 5 minutes (10 pour les séances ≥ 2h, plus lisible). */
function roundDuration(min: number): number {
  const step = min >= 120 ? 10 : 5;
  return Math.round(min / step) * step;
}

export function isWideDurationRange(w: Pick<LibraryWorkout, "durationMin">): boolean {
  const [lo, hi] = w.durationMin || [0, 0];
  return hi - lo > WIDE_RANGE_THRESHOLD_MIN;
}

/**
 * Durée canonique (minutes) d'une fiche pour une phase donnée.
 * Déterministe : même fiche + même phase ⇒ même valeur.
 */
export function resolveCanonicalDuration(
  w: Pick<LibraryWorkout, "durationMin" | "durationByPhase">,
  phase: PhaseTag = "build"
): number {
  const [lo, hi] = w.durationMin || [0, 0];
  const explicit = w.durationByPhase?.[phase];
  if (typeof explicit === "number" && Number.isFinite(explicit) && explicit > 0) {
    return Math.min(Math.max(explicit, lo), hi || explicit);
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= 0) return 0;
  if (hi <= lo) return roundDuration(lo);
  const weight = PHASE_DURATION_WEIGHT[phase] ?? PHASE_DURATION_WEIGHT.build;
  const raw = lo + (hi - lo) * weight;
  return Math.min(hi, Math.max(lo, roundDuration(raw)));
}

/** Phase dominante d'une fenêtre de chunk (celle qui pilote la prescription). */
export function dominantPhase(phases: PhaseTag[] | undefined): PhaseTag {
  if (!phases || phases.length === 0) return "build";
  const order: PhaseTag[] = ["taper", "peak", "build", "base"];
  for (const p of order) if (phases.includes(p)) return p;
  return phases[phases.length - 1];
}

/** Libellé compact pour le prompt : durée cible + plage d'origine si large. */
export function formatDurationForPrompt(
  w: Pick<LibraryWorkout, "durationMin" | "durationByPhase">,
  phase: PhaseTag = "build"
): string {
  const [lo, hi] = w.durationMin || [0, 0];
  const canonical = resolveCanonicalDuration(w, phase);
  if (!canonical) return `${lo}-${hi}`;
  if (hi - lo <= WIDE_RANGE_THRESHOLD_MIN) return `${canonical} (${lo}-${hi})`;
  return `${canonical}`;
}
