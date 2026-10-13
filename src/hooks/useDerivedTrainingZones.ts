/**
 * Hook — zones dérivées de la physiologie de l'athlète courant.
 * Retourne un set par sport (vélo / course), avec repli automatique sur la
 * grille standard quand les données sont insuffisantes.
 */
import { useMemo } from "react";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { getEffectiveRefs, getEffectiveSnapshot } from "@/lib/effectiveRefs";
import { deriveTrainingZones, estimateRunThresholdPaceSecPerKm, type DerivedZoneSet } from "@/lib/zones/deriveTrainingZones";
import { resolveRunningEconomyFromSnapshot } from "@/lib/runningEconomySimple";
import { predictRunMLSSPctFromVLaCE } from "@/lib/v2/runMLSSPredictor";

export interface DerivedZonesBySport {
  bike: DerivedZoneSet;
  run: DerivedZoneSet;
}

/**
 * Résout la VLamax à utiliser pour les calculs RUN (estimation MLSS course +
 * ancre FatMax course).
 *
 * Audit scientifique P0 — F10 (AUDIT_SCIENTIFIQUE_P0.md) corrigé : plus de
 * repli silencieux sur la VLamax vélo. `vlamaxResolver.ts` documente
 * explicitement "Pas de fallback silencieux vélo → run" — ce helper
 * respecte maintenant la même politique. Quand `vlamax_run` est absent,
 * `deriveTrainingZones({ sport: "run", vlamax: null, ... })` applique déjà
 * son propre repli générique (fatMaxPct=85, cf. `deriveRunPct`) : aucune
 * zone fausse n'est produite, seulement une zone moins précise — ce qui est
 * honnête, contrairement à une zone "précise" mais calculée sur la mauvaise
 * discipline.
 */
export function resolveRunVlamaxInput(snap: { vlamax_run?: number | null; vlamax?: number | null } | null | undefined): number | null {
  return snap?.vlamax_run ?? null;
}

export function useDerivedTrainingZones(): DerivedZonesBySport {
  const { currentAthlete } = useAthletes();
  const { athletes: dbAthletes, snapshots } = useCloudDataContext();

  return useMemo(() => {
    const dbAthlete = dbAthletes.find((a) => a.id === currentAthlete?.id) ?? null;
    const effective = getEffectiveRefs(dbAthlete, snapshots);
    const snap = getEffectiveSnapshot(dbAthlete, snapshots);
    const raceObjective = (snap as any)?.objectif ?? (dbAthlete as any)?.goal ?? currentAthlete?.goal ?? null;

    const bike = deriveTrainingZones({
      sport: "bike",
      ftp: effective.ftp,
      fcMax: effective.fcMax,
      fcRest: (snap as any)?.fc_repos ?? null,
      vlamax: snap?.vlamax ?? null,
      vo2max: effective.vo2max,
      weightKg: effective.weightKg,
      raceObjective,
    });

    // Allure seuil : mesurée si dispo, sinon estimée (MLSS prédit × VMA, repli 0.90 × VMA).
    const vlamaxRun = resolveRunVlamaxInput(snap);
    const measuredPace = snap?.pace_threshold_sec_per_km ?? null;
    let paceThreshold = measuredPace;
    let paceEstimated = false;
    if (!paceThreshold && effective.vma && effective.vma > 0) {
      const ce = resolveRunningEconomyFromSnapshot(snap as any)?.mlKgKm ?? null;
      const mlss = predictRunMLSSPctFromVLaCE(vlamaxRun, ce);
      paceThreshold = estimateRunThresholdPaceSecPerKm(effective.vma, mlss?.mlssPct ?? null);
      paceEstimated = paceThreshold != null;
    }

    const run = deriveTrainingZones({
      sport: "run",
      vma: effective.vma,
      paceThresholdSecPerKm: paceThreshold,
      paceThresholdEstimated: paceEstimated,
      fcMax: effective.fcMax,
      fcRest: (snap as any)?.fc_repos ?? null,
      vlamax: resolveRunVlamaxInput(snap),
      vo2max: effective.vo2max,
      weightKg: effective.weightKg,
      raceObjective,
    });

    return { bike, run };
  }, [currentAthlete?.id, dbAthletes, snapshots]);
}
