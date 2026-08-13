/**
 * Hook — zones dérivées de la physiologie de l'athlète courant.
 * Retourne un set par sport (vélo / course), avec repli automatique sur la
 * grille standard quand les données sont insuffisantes.
 */
import { useMemo } from "react";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { getEffectiveRefs, getEffectiveSnapshot } from "@/lib/effectiveRefs";
import { deriveTrainingZones, type DerivedZoneSet } from "@/lib/zones/deriveTrainingZones";
import { resolveRunningEconomyFromSnapshot } from "@/lib/runningEconomySimple";
import { predictRunMLSSPctFromVLaCE } from "@/lib/v2/runMLSSPredictor";

export interface DerivedZonesBySport {
  bike: DerivedZoneSet;
  run: DerivedZoneSet;
}

export function useDerivedTrainingZones(): DerivedZonesBySport {
  const { currentAthlete } = useAthletes();
  const { athletes: dbAthletes, snapshots } = useCloudDataContext();

  return useMemo(() => {
    const dbAthlete = dbAthletes.find((a) => a.id === currentAthlete?.id) ?? null;
    const effective = getEffectiveRefs(dbAthlete, snapshots);
    const snap = getEffectiveSnapshot(dbAthlete, snapshots);

    const bike = deriveTrainingZones({
      sport: "bike",
      ftp: effective.ftp,
      fcMax: effective.fcMax,
      vlamax: snap?.vlamax ?? null,
      vo2max: effective.vo2max,
      weightKg: effective.weightKg,
    });

    const run = deriveTrainingZones({
      sport: "run",
      vma: effective.vma,
      paceThresholdSecPerKm: snap?.pace_threshold_sec_per_km ?? null,
      fcMax: effective.fcMax,
      vlamax: snap?.vlamax_run ?? snap?.vlamax ?? null,
      vo2max: effective.vo2max,
      weightKg: effective.weightKg,
    });

    return { bike, run };
  }, [currentAthlete?.id, dbAthletes, snapshots]);
}
