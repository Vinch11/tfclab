/**
 * useRunDurabilityProxy
 *
 * Charge les chronos longs course (≥ 3 km) de l'athlète actif et en dérive un
 * proxy de durabilité (TTE au seuil) via la loi de puissance de Riegel.
 * Retourne `null` tant qu'il n'y a pas assez de données (pas de valeur par défaut).
 */

import { useEffect, useState } from "react";
import {
  computeRunDurabilityProxy,
  fetchRunLongRecords,
  resolveThresholdSpeedMps,
  type RunDurabilityProxy,
} from "@/lib/durability/runDurabilityFromRecords";

export function useRunDurabilityProxy(
  athleteId: string | null | undefined,
  paceThresholdSecPerKm: number | null | undefined,
  vmaKmh: number | null | undefined,
  windowMonths: number | null = 18,
): RunDurabilityProxy | null {
  const [proxy, setProxy] = useState<RunDurabilityProxy | null>(null);

  useEffect(() => {
    let cancelled = false;
    const thresholdSpeed = resolveThresholdSpeedMps(paceThresholdSecPerKm, vmaKmh);
    if (!athleteId || !thresholdSpeed) {
      setProxy(null);
      return;
    }
    fetchRunLongRecords(athleteId, windowMonths)
      .then((records) => {
        if (!cancelled) setProxy(computeRunDurabilityProxy(records, thresholdSpeed));
      })
      .catch(() => {
        if (!cancelled) setProxy(null);
      });
    return () => {
      cancelled = true;
    };
  }, [athleteId, paceThresholdSecPerKm, vmaKmh, windowMonths]);

  return proxy;
}
