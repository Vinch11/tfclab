/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL LIBRARY DURATION INDEX
 *
 * Correctif #1 audit Claude 07/2026 : `computeWeeklyVolume` sous-estimait le
 * volume car il parsait uniquement le texte des séances (ratant `B_LCW_*`,
 * `[Custom]`, et toute séance dont le titre n'expose pas de durée explicite).
 *
 * Ce module construit un index `id → durationMinutes` à partir de TOUTES les
 * bibliothèques enrichies, en prenant la MOYENNE des bornes `durationMin` pour
 * fournir une durée fiable même quand l'IA n'inclut pas la durée dans le titre.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LibraryWorkout } from "@/types/workoutLibrary";
import { EnrichedWorkouts } from "./enrichedWorkouts";
import { EnrichedWorkoutsV2 } from "./enrichedWorkoutsV2";
import { EnrichedWorkoutsV3 } from "./enrichedWorkoutsV3";
import { EnrichedWorkoutsV4 } from "./enrichedWorkoutsV4";
import { EnrichedWorkoutsV5 } from "./enrichedWorkoutsV5";
import { EnrichedWorkoutsV6 } from "./enrichedWorkoutsV6";
import { EnrichedWorkoutsLCW } from "./enrichedWorkoutsLCW";
import { EnrichedWorkoutsSwim } from "./enrichedWorkoutsSwim";
import { EnrichedWorkoutsSwimV2 } from "./enrichedWorkoutsSwimV2";
import { EnrichedWorkoutsTrail } from "./enrichedWorkoutsTrail";
import { EnrichedWorkoutsRecovery } from "./enrichedWorkoutsRecovery";
import { EnrichedWorkoutsFatMax } from "./enrichedWorkoutsFatMax";
import { EnrichedWorkoutsHedgehog } from "./enrichedWorkoutsHedgehog";
import { EnrichedWorkoutsStrengthV2 } from "./enrichedWorkoutsStrengthV2";
import { EnrichedWorkoutsIMRunDurability } from "./enrichedWorkoutsIMRunDurability";
import { EnrichedWorkouts703PodiumDurability } from "./enrichedWorkouts703PodiumDurability";

const ALL_LIBRARIES: LibraryWorkout[][] = [
  EnrichedWorkouts,
  EnrichedWorkoutsV2,
  EnrichedWorkoutsV3,
  EnrichedWorkoutsV4,
  EnrichedWorkoutsV5,
  EnrichedWorkoutsV6,
  EnrichedWorkoutsLCW,
  EnrichedWorkoutsSwim,
  EnrichedWorkoutsSwimV2,
  EnrichedWorkoutsTrail,
  EnrichedWorkoutsRecovery,
  EnrichedWorkoutsFatMax,
  EnrichedWorkoutsHedgehog,
  EnrichedWorkoutsStrengthV2,
  EnrichedWorkoutsIMRunDurability,
  EnrichedWorkouts703PodiumDurability,
];

/** id → durée moyenne en minutes (moyenne de durationMin[min,max]). */
const DURATION_INDEX: Map<string, number> = (() => {
  const map = new Map<string, number>();
  for (const lib of ALL_LIBRARIES) {
    for (const w of lib) {
      if (!w?.id) continue;
      const d = (w as { durationMin?: [number, number] }).durationMin;
      if (Array.isArray(d) && d.length === 2) {
        const avg = Math.round((d[0] + d[1]) / 2);
        if (avg > 0) map.set(w.id, avg);
      }
    }
  }
  return map;
})();

/**
 * Renvoie la durée moyenne (min) d'une séance de la bibliothèque, ou null si
 * l'ID n'est pas connu.
 */
export function getLibraryDurationMin(catalogId: string | null | undefined): number | null {
  if (!catalogId) return null;
  return DURATION_INDEX.get(catalogId) ?? null;
}

/** Debug helper. */
export function getLibraryDurationIndexSize(): number {
  return DURATION_INDEX.size;
}
