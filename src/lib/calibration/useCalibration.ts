/**
 * Hook pour utiliser le Calibration Layer avec les données Cloud
 */

import { useMemo } from "react";
import {
  computeCalibration,
  CalibrationResult,
  AthleteModelData,
  TestData,
} from "./calibrationLayer";
import type { DbTest, DbSnapshot } from "@/hooks/useCloudData";
import { computeVLamaxEffectif } from "@/lib/vlamaxEffectif";
import { computeTTEEffectif } from "@/lib/tteEffectif";

interface UseCalibrationParams {
  athleteId: string;
  objectif: string;
  tests: DbTest[];
  snapshots: DbSnapshot[];
  activeSnapshotId?: string | null;
  fatigueIndex?: number;
}

/**
 * Convertit les tests Cloud en format TestData pour le calibration layer
 */
function mapCloudTestsToTestData(tests: DbTest[], athleteId: string): TestData[] {
  return tests
    .filter(t => t.athlete_id === athleteId)
    .map(t => {
      // Extraire la valeur selon le type de test
      let value: number | null = null;
      let protocolQuality: 1 | 2 | 3 | 4 | 5 = 3;
      let variance: number | undefined;
      
      const raw = t.raw as Record<string, any> | null;
      
      if (t.vlamax !== null) {
        value = t.vlamax;
      } else if (raw) {
        // Pour tests TTE, extraire tte_minutes
        if (raw.tte_minutes) {
          value = raw.tte_minutes;
        }
        // Pour tests VLamax, extraire la valeur normalisée
        if (raw.estimatedVlamax) {
          value = raw.estimatedVlamax;
        }
        if (raw.variance) {
          variance = raw.variance;
        }
      }
      
      // Déterminer la validité
      let validityStatus: "OK" | "WARNING" | "INVALID" = "OK";
      if (variance !== undefined) {
        if (variance > 10) validityStatus = "INVALID";
        else if (variance > 5) validityStatus = "WARNING";
      }
      
      // Qualité basée sur reliability si disponible
      if (t.reliability !== null) {
        if (t.reliability >= 0.85) protocolQuality = 5;
        else if (t.reliability >= 0.75) protocolQuality = 4;
        else if (t.reliability >= 0.60) protocolQuality = 3;
        else if (t.reliability >= 0.45) protocolQuality = 2;
        else protocolQuality = 1;
      }
      
      return {
        id: t.id,
        type: t.type,
        sport: t.sport || "bike",
        date: typeof t.date === "string" ? t.date : new Date(t.date).toISOString(),
        value,
        confidence: t.reliability ?? 0.70,
        protocolQuality,
        validityStatus,
        variance,
        rawData: raw as Record<string, number> | undefined,
      };
    });
}

/**
 * Hook principal pour obtenir les données calibrées
 */
export function useCalibration({
  athleteId,
  objectif,
  tests,
  snapshots,
  activeSnapshotId,
  fatigueIndex,
}: UseCalibrationParams): CalibrationResult | null {
  return useMemo(() => {
    if (!athleteId) return null;
    
    // Calculer VLamax modélisée
    const vlamaxEffectif = computeVLamaxEffectif({
      athleteId,
      objectif,
      activeSnapshotId,
      tests,
      snapshots,
    });
    
    // Calculer TTE modélisé
    const snapshot = snapshots.find(s => s.id === activeSnapshotId) 
      || snapshots.filter(s => s.athlete_id === athleteId)
          .sort((a, b) => b.date.localeCompare(a.date))[0];
    
    const tteEffectif = computeTTEEffectif({
      ftp: snapshot?.ftp ?? null,
      tss_7d: snapshot?.tss_7d ?? null,
      tte_mode: (snapshot?.tte_mode as "LOAD" | "OBSERVED" | null) ?? null,
      tte_observed_min: snapshot?.tte_observed_min ?? null,
      objectif,
    });
    
    // Préparer les données modèle
    const modelData: AthleteModelData = {
      vlamax_modelled: vlamaxEffectif.value,
      vlamax_modelled_confidence: vlamaxEffectif.confidence,
      vlamax_modelled_source: vlamaxEffectif.source === "snapshot" ? "LAB" : undefined,
      tte_modelled: tteEffectif.tte_min,
      tte_modelled_confidence: tteEffectif.confidence,
      objectif,
      fatigueIndex,
    };
    
    // Convertir les tests
    const testData = mapCloudTestsToTestData(tests, athleteId);
    
    // Calculer la calibration
    return computeCalibration(modelData, testData);
  }, [athleteId, objectif, tests, snapshots, activeSnapshotId, fatigueIndex]);
}

/**
 * Helper pour vérifier si une calibration a des tests
 */
export function hasCalibrationTests(calibration: CalibrationResult | null): boolean {
  if (!calibration) return false;
  return calibration.vlamax.tested !== null || calibration.tte.tested !== null;
}

/**
 * Helper pour obtenir le nombre de tests utilisés
 */
export function getCalibrationTestCount(calibration: CalibrationResult | null): number {
  if (!calibration) return 0;
  let count = 0;
  if (calibration.vlamax.tested !== null) count++;
  if (calibration.tte.tested !== null) count++;
  return count;
}
