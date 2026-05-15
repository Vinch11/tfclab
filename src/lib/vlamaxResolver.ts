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
import { estimateVLamaxCap } from "./v2/vlamaxCapEstimator";

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
  // Fields used by the unified CAP estimator (canonical source for vlamax_run)
  vma?: number | null;
  pace_threshold_sec_per_km?: number | null;
  tte_observed_min?: number | null;
  sprint_15s_distance?: number | null;
  running_power_max?: number | null;
  running_power_threshold?: number | null;
  vlamax_source?: string | null;
  vlamax_protocol?: string | null;
  vo2max?: number | null;
}

function isLabMeasuredVlamaxRun(s: SnapshotLike): boolean {
  const haystack = `${s.vlamax_source || ""} ${s.vlamax_protocol || ""}`.toLowerCase();
  return /(labo|lactat|prise de sang|blood lactate|lab measurement)/.test(haystack);
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

  // run / trail → estimateur CAP unifié = source PRIMAIRE (mémoire `cap-vlamax-unified-source`).
  // La valeur brute snapshot.vlamax_run (souvent un test sprint terrain non normalisé)
  // n'est utilisée que :
  //   - si elle provient d'une mesure labo (lactate post-sprint)
  //   - ou en dernier fallback si l'estimateur renvoie `insufficient`.
  if (sport === "run") {
    const rawRun = snapshot.vlamax_run ?? null;
    const isLab = rawRun != null && isLabMeasuredVlamaxRun(snapshot);

    const capEst = estimateVLamaxCap({
      vma: snapshot.vma ?? null,
      paceThresholdSecPerKm: snapshot.pace_threshold_sec_per_km ?? null,
      tteMin: snapshot.tte_observed_min ?? null,
      sprint15sDistance: snapshot.sprint_15s_distance ?? null,
      runningPowerMax: snapshot.running_power_max ?? null,
      runningPowerThreshold: snapshot.running_power_threshold ?? null,
      vlamaxRunMeasured: isLab ? rawRun : null,
      vo2max: snapshot.vo2max ?? null,
    });

    if (capEst.method !== "insufficient" && capEst.value > 0) {
      return { value: capEst.value, source: "run", sport, reason: "ok" };
    }

    if (rawRun != null && rawRun > 0) {
      return { value: rawRun, source: "run", sport, reason: "ok" };
    }

    if (typeof console !== "undefined" && import.meta.env?.DEV) {
      console.warn(
        "[vlamax-resolver] sport=run — estimateur CAP insuffisant et vlamax_run manquant (Données insuffisantes)"
      );
    }
    return { value: null, source: "run", sport, reason: "missing_vlamax_run" };
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
