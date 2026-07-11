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
import { computeVLamaxEffectif, computeTTEEffectif } from "@/engines/diagnostic";

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
 * Gère tous les types de tests TFCL standardisés
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
      const testType = t.type.toLowerCase();
      
      // === TESTS VLAMAX ===
      if (t.vlamax !== null && t.vlamax !== undefined) {
        value = t.vlamax;
      } else if (raw?.estimatedVlamax !== undefined) {
        value = raw.estimatedVlamax;
      }
      
      // === TESTS TTE ===
      if (testType.includes("tte") || raw?.category === "TTE") {
        if (raw?.tte_minutes !== undefined) {
          value = raw.tte_minutes;
        } else if (raw?.tteObserved !== undefined) {
          value = raw.tteObserved;
        }
      }

      // === TESTS VMA ===
      if (testType.includes("vma") || raw?.category === "VMA") {
        if (raw?.vma !== undefined) {
          value = raw.vma;
        }
      }
      
      // === TESTS FATMAX ===
      if (testType.includes("fatmax") || raw?.category === "FATMAX") {
        if (raw?.fatmaxW !== undefined) {
          value = raw.fatmaxW;
        }
      }
      
      // === TESTS ÉCONOMIE ===
      if (testType.includes("economy") || raw?.category === "ECONOMY") {
        if (raw?.economyScore !== undefined) {
          value = raw.economyScore;
        }
      }
      
      // Extraire la variance pour la validation
      if (raw?.variance !== undefined) {
        variance = raw.variance;
      }
      
      // Déterminer la validité basée sur la variance
      let validityStatus: "OK" | "WARNING" | "INVALID" = "OK";
      if (variance !== undefined) {
        if (variance > 10) validityStatus = "INVALID";
        else if (variance > 5) validityStatus = "WARNING";
      }
      
      // Qualité basée sur reliability + confiance du raw si disponible
      if (t.reliability !== null) {
        if (t.reliability >= 0.85) protocolQuality = 5;
        else if (t.reliability >= 0.75) protocolQuality = 4;
        else if (t.reliability >= 0.60) protocolQuality = 3;
        else if (t.reliability >= 0.45) protocolQuality = 2;
        else protocolQuality = 1;
      } else if (raw?.confidence !== undefined) {
        const conf = raw.confidence as number;
        if (conf >= 0.85) protocolQuality = 5;
        else if (conf >= 0.75) protocolQuality = 4;
        else if (conf >= 0.60) protocolQuality = 3;
        else if (conf >= 0.45) protocolQuality = 2;
        else protocolQuality = 1;
      }
      
      // Extraire le confidence boost TFCL si disponible
      const tfclImpact = raw?.tfclImpact as Array<{ parameter: string; confidenceBoost: number }> | undefined;
      const confidenceBoost = tfclImpact?.reduce((acc, i) => acc + i.confidenceBoost, 0) ?? 0;
      
      return {
        id: t.id,
        type: t.type,
        sport: t.sport || "bike",
        date: typeof t.date === "string" ? t.date : new Date(t.date).toISOString(),
        value,
        confidence: Math.min(0.95, (t.reliability ?? 0.70) + confidenceBoost),
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
      tte_observed_min_run: (snapshot as any)?.tte_observed_min_run ?? null,
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
