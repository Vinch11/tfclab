import { normalizeRepairGoal } from "./repairSportingEquivalence.ts";

/** Existing objective classification; no inference from cycling power to running. */
export function isRunningOnlyPrescriptionGoal(objective: unknown): boolean {
  return [
    "5k",
    "10k",
    "semi",
    "marathon",
    "trail_short",
    "trail_mountain",
    "trail_long",
    "trail_ultra",
    "start_to_run",
  ].includes(normalizeRepairGoal(objective) ?? "");
}
