/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * W'bal LIBRARY RECALC — Recalcul des temps de repos sur les LibraryWorkout
 *
 * À partir d'une séance de la bibliothèque possédant un `wbalProfile`
 * (intensité, durée, reps, repos par défaut) et du CP/W' de l'athlète,
 * cette utilité recalcule automatiquement le temps de repos optimal
 * pour chaque bloc d'intervalle via le modèle Skiba 2012.
 *
 * Usage typique : appelé au chargement d'une séance dans la bibliothèque
 * pour afficher le repos individualisé à l'athlète.
 *
 * Si l'athlète manque de données CP/W' (P30s, P60s, MAP), la séance est
 * retournée inchangée (no-op silencieux).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  analyzeCriticalPower,
  effectiveWprime,
  prescribeIntervalRecovery,
} from "@/lib/v2/criticalPowerModel";
import type {
  LibraryWorkout,
  WbalIntervalBlock,
  WbalProfile,
  WbalRecoveryStrategy,
} from "@/types/workoutLibrary";

export interface WbalAthleteRefs {
  pmax5s?: number | null;
  p30s?: number | null;
  p60s?: number | null;
  map5min?: number | null;
  ftp?: number | null;
  weightKg?: number | null;
}

export interface RecalcedBlock extends WbalIntervalBlock {
  /** Repos recalculé via W'bal (sec). Si pas de CP/W', vaut defaultRestSec. */
  recalcRestSec: number;
  /** Indique si le bloc a été effectivement recalculé */
  wasRecalculated: boolean;
  /** Puissance d'intervalle absolue résolue (W) — si applicable */
  absoluteIntervalW?: number;
  /** Nombre max de reps réalisables avant épuisement W' */
  maxReps?: number;
}

export interface RecalcedWorkout {
  workout: LibraryWorkout;
  blocks: RecalcedBlock[];
  cpUsed?: number;
  wprimeUsedJ?: number;
  recalculatedAny: boolean;
}

// Puissance de récupération par défaut selon stratégie (cohérent avec Edge function)
function recoveryPowerForStrategy(
  strategy: WbalRecoveryStrategy | undefined,
  cp: number
): number {
  switch (strategy) {
    case "active-tempo":
      // Aligné avec resolveRecoveryPower (criticalPowerModel.ts)
      return Math.round(cp * 0.50);
    case "active-light":
      // Aligné avec resolveRecoveryPower (criticalPowerModel.ts)
      return Math.round(cp * 0.30);
    case "passive":
    default:
      return 0;
  }
}

/** Résout l'intensité d'intervalle en watts selon le référentiel du bloc */
function resolveIntervalWatts(
  block: WbalIntervalBlock,
  cp: number,
  ftp: number,
  map: number | null
): number | null {
  const v = block.intensity;
  switch (block.intensityRef) {
    case "FTP":
      return Math.round((ftp * v) / 100);
    case "CP":
      return Math.round((cp * v) / 100);
    case "MAP":
      return map ? Math.round((map * v) / 100) : null;
    case "absolute":
      return Math.round(v);
    case "VMA":
    case "CSS":
      // Hors périmètre CP/W' (course/natation) — pas de recalcul vélo
      return null;
    default:
      return null;
  }
}

/**
 * Recalcule les temps de repos d'un workout possédant un wbalProfile.
 * Retourne les blocs enrichis (avec recalcRestSec) sans muter l'original.
 */
export function recalcWorkoutRest(
  workout: LibraryWorkout,
  athleteRefs: WbalAthleteRefs
): RecalcedWorkout {
  const profile = workout.wbalProfile;

  // Pas de profil ou auto-recalc explicitement désactivé → no-op
  if (!profile || profile.autoRecalcRest === false) {
    return {
      workout,
      blocks: (profile?.blocks ?? []).map((b) => ({
        ...b,
        recalcRestSec: b.defaultRestSec,
        wasRecalculated: false,
      })),
      recalculatedAny: false,
    };
  }

  const cpResult = analyzeCriticalPower({
    pmax_5s: athleteRefs.pmax5s ?? null,
    p30s_w: athleteRefs.p30s ?? null,
    p60s_w: athleteRefs.p60s ?? null,
    map5min_w: athleteRefs.map5min ?? null,
    ftp: athleteRefs.ftp ?? null,
    weight_kg: athleteRefs.weightKg ?? null,
  });

  // Pas assez de données pour CP/W' → on conserve les valeurs par défaut
  if (!cpResult) {
    return {
      workout,
      blocks: profile.blocks.map((b) => ({
        ...b,
        recalcRestSec: b.defaultRestSec,
        wasRecalculated: false,
      })),
      recalculatedAny: false,
    };
  }

  const cp = cpResult.effectiveCP;
  const wprime = effectiveWprime(cpResult.wprime);
  const ftp = athleteRefs.ftp ?? cp;
  const map = athleteRefs.map5min ?? null;

  let recalculatedAny = false;

  const blocks: RecalcedBlock[] = profile.blocks.map((block) => {
    const intervalW = resolveIntervalWatts(block, cp, ftp, map);

    // Référentiel non-vélo ou résolution impossible → on conserve
    if (intervalW == null) {
      return { ...block, recalcRestSec: block.defaultRestSec, wasRecalculated: false };
    }

    // Sub-CP : W'bal n'apporte rien → on conserve
    if (intervalW <= cp) {
      return {
        ...block,
        recalcRestSec: block.defaultRestSec,
        wasRecalculated: false,
        absoluteIntervalW: intervalW,
      };
    }

    const recPower = recoveryPowerForStrategy(block.recoveryStrategy, cp);
    const prescription = prescribeIntervalRecovery(
      cp,
      wprime,
      intervalW,
      block.durationSec,
      recPower
    );

    recalculatedAny = true;
    return {
      ...block,
      recalcRestSec: prescription.optimalRecoverySec,
      wasRecalculated: true,
      absoluteIntervalW: intervalW,
      maxReps: prescription.maxReps,
    };
  });

  return {
    workout,
    blocks,
    cpUsed: cp,
    wprimeUsedJ: wprime,
    recalculatedAny,
  };
}

/**
 * Recalcule un lot de séances. Utile pour pré-calculer toute la bibliothèque
 * affichée à l'écran avec les références d'un athlète sélectionné.
 */
export function recalcWorkoutsRest(
  workouts: LibraryWorkout[],
  athleteRefs: WbalAthleteRefs
): RecalcedWorkout[] {
  return workouts.map((w) => recalcWorkoutRest(w, athleteRefs));
}

/**
 * Helper pour formater un repos (sec) en chaîne lisible.
 */
export function formatRest(sec: number): string {
  if (sec >= 120) {
    const min = Math.round(sec / 60);
    return `${min}min`;
  }
  if (sec >= 60) {
    const min = Math.floor(sec / 60);
    const rem = sec % 60;
    return rem === 0 ? `${min}min` : `${min}min${rem.toString().padStart(2, "0")}`;
  }
  return `${sec}s`;
}

export type { WbalProfile, WbalIntervalBlock, WbalRecoveryStrategy };
