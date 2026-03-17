/**
 * Readiness Types — Minimal stubs for pacing/simulation modules
 * (Race Readiness module removed, but these types are still needed by simulation)
 */

export type ReadinessState = "RED" | "ORANGE" | "GREEN";
export type LimitingFactor = "FATIGUE" | "PAIN" | "ENERGY" | "STRESS" | "LOAD" | "NONE";
export type PacingDiscipline = "STRICT" | "VERY_STRICT" | "NORMAL";

export interface ReadinessImplications {
  race_allowed: boolean;
  intensity_cap: number;
  pacing_discipline: PacingDiscipline;
  recommended_start_pace: string;
}

export interface SimulationModifiers {
  ftpMultiplier: number;
  vmaMultiplier: number;
  fatmaxShift: number;
  glycogenDepletionRate: number;
  driftAcceleration: number;
}

/** Default neutral modifiers (no readiness adjustment) */
export function getDefaultSimulationModifiers(): SimulationModifiers {
  return {
    ftpMultiplier: 1.0,
    vmaMultiplier: 1.0,
    fatmaxShift: 0,
    glycogenDepletionRate: 1.0,
    driftAcceleration: 1.0,
  };
}
