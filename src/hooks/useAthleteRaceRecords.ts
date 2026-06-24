/**
 * useAthleteRaceRecords
 *
 * Récupère depuis `nolio_records` (sport_id=2, cat="par") les records de
 * performance course (400m, 1km, 5km, 10km) pour l'athlète actif et les
 * expose sous la forme `RaceRecordsInput` consommée par
 * `calibrateVLamaxFromRaceRecords` (moteur `vlamaxRunV2Enhanced`).
 *
 * Pass-through standard : injecter `raceRecords` dans `computeVLamaxEffectif`
 * pour améliorer la précision VLamax course (M3 — calibration croisée par
 * temps de référence).
 */

import { useEffect, useState } from "react";
import { fetchAthleteRaceRecords } from "@/lib/effectiveRefs";
import type { RaceRecordsInput } from "@/lib/v2/vlamaxRunV2Enhanced";

export function useAthleteRaceRecords(
  athleteId: string | null | undefined,
  vma: number | null,
  windowMonths: number | null = 12,
): RaceRecordsInput | null {
  const [records, setRecords] = useState<RaceRecordsInput | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!athleteId || !vma || vma <= 0) {
      setRecords(null);
      return;
    }
    fetchAthleteRaceRecords(athleteId, vma, windowMonths)
      .then((r) => {
        if (!cancelled) setRecords(r);
      })
      .catch(() => {
        if (!cancelled) setRecords(null);
      });
    return () => {
      cancelled = true;
    };
  }, [athleteId, vma, windowMonths]);

  return records;
}
