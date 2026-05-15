/**
 * VLAMAX RESOLVER — Source unique de vérité pour choisir
 * la VLamax adaptée à l'objectif de l'athlète.
 *
 * Règles:
 *  - Course (5k / 10k / semi / marathon) → snapshot.vlamax_run
 *  - Trail (court / long / ultra)        → snapshot.vlamax_run
 *  - Vélo / cyclisme                      → snapshot.vlamax  (vélo)
 *  - Triathlon (IM / 70.3)                → snapshot.vlamax  (vélo) = pivot
 *      (les scorings cap-spécifiques continuent d'utiliser vlamax_run
 *       en interne via leurs propres helpers — voir compassScoringCAP)
 *
 * Politique « Missing data » :
 *  - Si le sport résolu attend vlamax_run et qu'il est absent → value=null,
 *    reason="missing_vlamax_run". L'UI affichera "Données insuffisantes".
 *  - Pas de fallback silencieux vélo → run.
 */

import { resolveSportMain, type CanonicalSport } from "./sportMainDeduction";

export type VlamaxSource = "run" | "bike";

export interface VlamaxResolution {
  /** Valeur VLamax effective (mmol/L/s), ou null si donnée manquante */
  value: number | null;
  /** Champ source réellement utilisé */
  source: VlamaxSource;
  /** Sport canonique résolu */
  sport: CanonicalSport | null;
  /** Raison textuelle pour debug / UI */
  reason:
    | "ok"
    | "missing_vlamax_run"
    | "missing_vlamax_bike"
    | "no_sport_resolved"
    | "no_snapshot";
}

interface SnapshotLike {
  vlamax?: number | null;
  vlamax_run?: number | null;
  sport_main?: string | null;
}

interface AthleteLike {
  goal?: string | null;
  objectif?: string | null;
}

/**
 * Retourne la VLamax adaptée à l'objectif de l'athlète.
 * À utiliser PARTOUT où on consomme « la VLamax athlète » de manière générique.
 *
 * Ne pas utiliser quand on veut explicitement la VLamax vélo ou la VLamax run
 * (ex: cartes spécifiques, calibration bike, page Running Profile) — dans ces
 * cas lire directement snapshot.vlamax / snapshot.vlamax_run.
 */
export function resolveVlamaxForGoal(
  snapshot?: SnapshotLike | null,
  athlete?: AthleteLike | null
): VlamaxResolution {
  if (!snapshot) {
    return { value: null, source: "bike", sport: null, reason: "no_snapshot" };
  }

  const sport = resolveSportMain(snapshot, athlete);

  // run / trail → vlamax_run obligatoire
  if (sport === "run") {
    const v = snapshot.vlamax_run;
    if (v == null) {
      if (typeof console !== "undefined" && import.meta.env?.DEV) {
        console.warn(
          "[vlamax-resolver] sport=run mais vlamax_run manquant — retourne null (Données insuffisantes)"
        );
      }
      return { value: null, source: "run", sport, reason: "missing_vlamax_run" };
    }
    return { value: v, source: "run", sport, reason: "ok" };
  }

  // bike / tri / null → vlamax (vélo) en pivot
  const v = snapshot.vlamax;
  if (v == null) {
    return {
      value: null,
      source: "bike",
      sport,
      reason: sport ? "missing_vlamax_bike" : "no_sport_resolved",
    };
  }
  return { value: v, source: "bike", sport: sport ?? null, reason: "ok" };
}

/**
 * Helper court : retourne uniquement la valeur (ou null).
 * Préfère `resolveVlamaxForGoal` quand tu as besoin du contexte.
 */
export function getVlamaxForGoal(
  snapshot?: SnapshotLike | null,
  athlete?: AthleteLike | null
): number | null {
  return resolveVlamaxForGoal(snapshot, athlete).value;
}

/**
 * Mappe la source résolue vers le format attendu par les badges
 * (`getVlamaxStatusWithLabel`, `getVLamaxRange`) : "run" → "cap".
 */
export function resolveVlamaxBadgeKind(
  snapshot?: SnapshotLike | null,
  athlete?: AthleteLike | null
): "cap" | "bike" {
  return resolveVlamaxForGoal(snapshot, athlete).source === "run" ? "cap" : "bike";
}

/**
 * Label UI cohérent pour les cartes / exports.
 */
export function getVlamaxLabelForGoal(resolution: VlamaxResolution): string {
  return resolution.source === "run" ? "VLamax CAP" : "VLamax vélo";
}
