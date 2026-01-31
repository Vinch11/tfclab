/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RUNNING FOCUS MODE CONTEXT — TFCL Method
 * 
 * Contexte React qui propage l'état du Running Focus Mode à travers l'application.
 * Ce contexte est PRIORITAIRE sur toute autre logique (triathlon, vélo, cross-discipline).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { createContext, useContext, useMemo, ReactNode } from "react";
import { useAthletes } from "@/contexts/AthleteContext";
import {
  isRunningFocusModeActive,
  getRunningFocusModeState,
  getRunningTargets,
  type RunningFocusModeState,
  type RunningRaceType,
  type RunningTargets,
  type RunningLimiter,
  type RunningLever,
  RUNNING_LIMITER_INFO,
  RUNNING_LEVER_INFO,
  RUNNING_KEY_METRICS,
  RUNNING_TRAINING_ZONES,
} from "@/lib/runningFocusMode";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RunningFocusModeContextType {
  // État principal
  isRunningOnly: boolean;
  state: RunningFocusModeState;
  
  // Infos course
  raceType: RunningRaceType | null;
  raceLabel: string | null;
  distanceKm: number | null;
  
  // Cibles physiologiques
  targets: RunningTargets | null;
  
  // Utilitaires
  getLimiterInfo: (limiter: RunningLimiter) => typeof RUNNING_LIMITER_INFO[RunningLimiter];
  getLeverInfo: (lever: RunningLever) => typeof RUNNING_LEVER_INFO[RunningLever];
  keyMetrics: typeof RUNNING_KEY_METRICS;
  trainingZones: typeof RUNNING_TRAINING_ZONES;
  
  // Helpers de filtrage
  shouldHideCyclingContent: () => boolean;
  getMetricLabel: (originalLabel: string) => string;
}

const RunningFocusModeContext = createContext<RunningFocusModeContextType | undefined>(undefined);

// Labels lisibles
const RACE_LABELS: Record<RunningRaceType, string> = {
  "5K": "5 km",
  "10K": "10 km",
  "Semi": "Semi-Marathon",
  "Marathon": "Marathon",
  "Trail": "Trail",
  "TrailShort": "Trail Court",
  "TrailMountain": "Trail Montagne",
  "TrailUltra": "Ultra Trail",
};

// Remplacements de termes vélo → running
const METRIC_LABEL_REPLACEMENTS: Record<string, string> = {
  "FTP": "Allure Seuil",
  "FTP/kg": "% vVO2max",
  "PMA": "vVO2max",
  "MAP": "VMA",
  "Puissance": "Allure",
  "Watts": "min/km",
  "W/kg": "% vVO2max",
  "Power": "Pace",
  "Watt": "min/km",
  "Cadence": "Cadence foulée",
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

export function RunningFocusModeProvider({ children }: { children: ReactNode }) {
  const { currentAthlete } = useAthletes();
  
  const objectif = currentAthlete?.objectif;
  
  // État du Running Focus Mode
  const state = useMemo(() => {
    return getRunningFocusModeState(objectif);
  }, [objectif]);
  
  // Cibles physiologiques
  const targets = useMemo(() => {
    if (state.raceType) {
      return getRunningTargets(state.raceType);
    }
    return null;
  }, [state.raceType]);
  
  // Label de la course
  const raceLabel = useMemo(() => {
    if (state.raceType) {
      return RACE_LABELS[state.raceType] || state.raceType;
    }
    return null;
  }, [state.raceType]);
  
  // Helpers
  const getLimiterInfo = (limiter: RunningLimiter) => RUNNING_LIMITER_INFO[limiter];
  const getLeverInfo = (lever: RunningLever) => RUNNING_LEVER_INFO[lever];
  
  const shouldHideCyclingContent = () => state.isActive;
  
  const getMetricLabel = (originalLabel: string): string => {
    if (!state.isActive) return originalLabel;
    
    // Chercher un remplacement exact
    if (METRIC_LABEL_REPLACEMENTS[originalLabel]) {
      return METRIC_LABEL_REPLACEMENTS[originalLabel];
    }
    
    // Chercher un remplacement partiel
    for (const [cycling, running] of Object.entries(METRIC_LABEL_REPLACEMENTS)) {
      if (originalLabel.toLowerCase().includes(cycling.toLowerCase())) {
        return originalLabel.replace(new RegExp(cycling, "gi"), running);
      }
    }
    
    return originalLabel;
  };
  
  const value: RunningFocusModeContextType = {
    isRunningOnly: state.isActive,
    state,
    raceType: state.raceType,
    raceLabel,
    distanceKm: state.distanceKm,
    targets,
    getLimiterInfo,
    getLeverInfo,
    keyMetrics: RUNNING_KEY_METRICS,
    trainingZones: RUNNING_TRAINING_ZONES,
    shouldHideCyclingContent,
    getMetricLabel,
  };
  
  return (
    <RunningFocusModeContext.Provider value={value}>
      {children}
    </RunningFocusModeContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useRunningFocusMode() {
  const context = useContext(RunningFocusModeContext);
  if (!context) {
    throw new Error("useRunningFocusMode must be used within a RunningFocusModeProvider");
  }
  return context;
}

/**
 * Hook simplifié pour vérifier rapidement si on est en mode running
 */
export function useIsRunningOnly(): boolean {
  const { isRunningOnly } = useRunningFocusMode();
  return isRunningOnly;
}
