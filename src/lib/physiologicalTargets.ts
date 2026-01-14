/**
 * =============================================
 * PHYSIOLOGICAL TARGETS - SINGLE SOURCE OF TRUTH
 * =============================================
 * 
 * This file is the ONLY source of truth for all physiological targets
 * used throughout the Two For Coaching Lab application.
 * 
 * All other files MUST import from here instead of defining their own constants.
 * 
 * Methodology:
 * - VLamax: min/max/optimal define the acceptable range for an objective
 * - TTE: minimum threshold in minutes for race readiness
 * - FTP/kg: minimum power-to-weight ratio for bike/tri objectives
 * - Charge: optimal weekly TSS for the objective
 * 
 * Level distinction:
 * - PERFORMANCE: Athletes aiming for competitive times
 * - INTERMEDIAIRE: Athletes aiming for completion or modest improvement
 */

// =============================================
// CORE TYPES
// =============================================

export interface VLamaxTargets {
  min: number;      // Lower bound (too low = lacks anaerobic capacity)
  max: number;      // Upper bound (too high = glycolytic dependency)
  optimal: number;  // Sweet spot for the objective
}

export interface ObjectiveTargets {
  vlamax: VLamaxTargets;
  tte_min: number;           // Minimum TTE in minutes
  ftp_kg_min: number;        // Minimum FTP/kg (W/kg)
  charge_optimale: number;   // Optimal weekly TSS
  nutrition_bike_gph: { min: number; max: number };  // g/h on bike
  nutrition_run_gph?: { min: number; max: number };  // g/h on run (IM/70.3)
}

export interface LeveledTargets {
  performance: ObjectiveTargets;
  intermediaire: ObjectiveTargets;
}

// =============================================
// UNIFIED TARGETS BY OBJECTIVE
// =============================================

const UNIFIED_TARGETS: Record<string, LeveledTargets> = {
  // =============================================
  // IRONMAN FULL DISTANCE
  // =============================================
  IM: {
    performance: {
      vlamax: { min: 0.25, max: 0.40, optimal: 0.32 },
      tte_min: 55,
      ftp_kg_min: 4.2,
      charge_optimale: 550,
      nutrition_bike_gph: { min: 90, max: 110 },
      nutrition_run_gph: { min: 60, max: 75 },
    },
    intermediaire: {
      vlamax: { min: 0.30, max: 0.50, optimal: 0.40 },
      tte_min: 50,
      ftp_kg_min: 3.8,
      charge_optimale: 450,
      nutrition_bike_gph: { min: 70, max: 90 },
      nutrition_run_gph: { min: 50, max: 65 },
    },
  },

  // =============================================
  // 70.3 / HALF IRONMAN
  // =============================================
  "703": {
    performance: {
      vlamax: { min: 0.28, max: 0.45, optimal: 0.36 },
      tte_min: 50,
      ftp_kg_min: 4.2,
      charge_optimale: 450,
      nutrition_bike_gph: { min: 80, max: 100 },
      nutrition_run_gph: { min: 50, max: 75 },
    },
    intermediaire: {
      vlamax: { min: 0.35, max: 0.55, optimal: 0.45 },
      tte_min: 45,
      ftp_kg_min: 3.6,
      charge_optimale: 380,
      nutrition_bike_gph: { min: 60, max: 80 },
      nutrition_run_gph: { min: 40, max: 60 },
    },
  },

  // =============================================
  // MARATHON
  // =============================================
  Marathon: {
    performance: {
      vlamax: { min: 0.25, max: 0.45, optimal: 0.35 },
      tte_min: 55,
      ftp_kg_min: 3.8,
      charge_optimale: 400,
      nutrition_bike_gph: { min: 0, max: 0 }, // N/A for running
      nutrition_run_gph: { min: 70, max: 100 },
    },
    intermediaire: {
      vlamax: { min: 0.35, max: 0.55, optimal: 0.45 },
      tte_min: 50,
      ftp_kg_min: 3.2,
      charge_optimale: 320,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 50, max: 80 },
    },
  },

  // =============================================
  // SEMI-MARATHON
  // =============================================
  Semi: {
    performance: {
      vlamax: { min: 0.35, max: 0.55, optimal: 0.45 },
      tte_min: 45,
      ftp_kg_min: 3.8,
      charge_optimale: 350,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 60, max: 90 },
    },
    intermediaire: {
      vlamax: { min: 0.45, max: 0.70, optimal: 0.55 },
      tte_min: 40,
      ftp_kg_min: 3.2,
      charge_optimale: 280,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 40, max: 70 },
    },
  },

  // =============================================
  // TRAIL
  // =============================================
  Trail: {
    performance: {
      vlamax: { min: 0.30, max: 0.50, optimal: 0.40 },
      tte_min: 55,
      ftp_kg_min: 4.0,
      charge_optimale: 450,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 80, max: 120 },
    },
    intermediaire: {
      vlamax: { min: 0.40, max: 0.60, optimal: 0.50 },
      tte_min: 50,
      ftp_kg_min: 3.5,
      charge_optimale: 380,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 60, max: 90 },
    },
  },

  TrailLong: {
    performance: {
      vlamax: { min: 0.25, max: 0.42, optimal: 0.32 },
      tte_min: 60,
      ftp_kg_min: 4.0,
      charge_optimale: 550,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 100, max: 140 },
    },
    intermediaire: {
      vlamax: { min: 0.35, max: 0.55, optimal: 0.45 },
      tte_min: 55,
      ftp_kg_min: 3.5,
      charge_optimale: 450,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 70, max: 100 },
    },
  },

  Ultra: {
    performance: {
      vlamax: { min: 0.22, max: 0.38, optimal: 0.30 },
      tte_min: 65,
      ftp_kg_min: 3.8,
      charge_optimale: 600,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 120, max: 160 },
    },
    intermediaire: {
      vlamax: { min: 0.30, max: 0.50, optimal: 0.40 },
      tte_min: 60,
      ftp_kg_min: 3.3,
      charge_optimale: 500,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 80, max: 120 },
    },
  },

  // =============================================
  // SHORT DISTANCE TRIATHLON
  // =============================================
  Sprint: {
    performance: {
      vlamax: { min: 0.50, max: 0.80, optimal: 0.65 },
      tte_min: 35,
      ftp_kg_min: 5.0,
      charge_optimale: 300,
      nutrition_bike_gph: { min: 40, max: 60 },
    },
    intermediaire: {
      vlamax: { min: 0.60, max: 0.90, optimal: 0.75 },
      tte_min: 30,
      ftp_kg_min: 4.2,
      charge_optimale: 250,
      nutrition_bike_gph: { min: 30, max: 50 },
    },
  },

  Olympic: {
    performance: {
      vlamax: { min: 0.45, max: 0.65, optimal: 0.55 },
      tte_min: 40,
      ftp_kg_min: 4.8,
      charge_optimale: 350,
      nutrition_bike_gph: { min: 60, max: 80 },
    },
    intermediaire: {
      vlamax: { min: 0.55, max: 0.75, optimal: 0.65 },
      tte_min: 35,
      ftp_kg_min: 4.0,
      charge_optimale: 300,
      nutrition_bike_gph: { min: 40, max: 60 },
    },
  },
};

// Aliases for common objective names
const OBJECTIVE_ALIASES: Record<string, string> = {
  "Ironman": "IM",
  "ironman": "IM",
  "im": "IM",
  "70.3": "703",
  "Half": "703",
  "half": "703",
  "marathon": "Marathon",
  "semi": "Semi",
  "Semi-Marathon": "Semi",
  "trail": "Trail",
  "TrailCourt": "Trail",
  "traillong": "TrailLong",
  "ultra": "Ultra",
  "sprint": "Sprint",
  "olympic": "Olympic",
  "olympique": "Olympic",
  "Course": "Semi", // Default running to Semi
};

// =============================================
// ACCESSOR FUNCTIONS
// =============================================

/**
 * Normalize objective string to canonical form
 */
export function normalizeObjective(objectif: string): string {
  if (UNIFIED_TARGETS[objectif]) return objectif;
  const alias = OBJECTIVE_ALIASES[objectif] || OBJECTIVE_ALIASES[objectif.toLowerCase()];
  return alias || "703"; // Default to 703 if unknown
}

/**
 * Get full targets for an objective at a given level
 */
export function getTargetsForObjective(
  objectif: string, 
  level: "performance" | "intermediaire" = "intermediaire"
): ObjectiveTargets {
  const normalized = normalizeObjective(objectif);
  const targets = UNIFIED_TARGETS[normalized];
  return targets?.[level] || UNIFIED_TARGETS["703"].intermediaire;
}

/**
 * Get VLamax range for an objective (uses intermediaire for broader range)
 */
export function getVLamaxRange(objectif: string): VLamaxTargets {
  const normalized = normalizeObjective(objectif);
  const targets = UNIFIED_TARGETS[normalized];
  // Use the broader intermediaire range for general thresholds
  return targets?.intermediaire.vlamax || { min: 0.35, max: 0.55, optimal: 0.45 };
}

/**
 * Get VLamax threshold (max value) for triggering "too high" alerts
 */
export function getVLamaxThreshold(objectif: string): number {
  return getVLamaxRange(objectif).max;
}

/**
 * Get VLamax optimal value for an objective
 */
export function getVLamaxOptimal(objectif: string): number {
  return getVLamaxRange(objectif).optimal;
}

/**
 * Get TTE target for an objective
 */
export function getTTETarget(objectif: string, level: "performance" | "intermediaire" = "intermediaire"): number {
  return getTargetsForObjective(objectif, level).tte_min;
}

/**
 * Get FTP/kg target for an objective
 */
export function getFtpKgTarget(objectif: string, level: "performance" | "intermediaire" = "intermediaire"): number {
  return getTargetsForObjective(objectif, level).ftp_kg_min;
}

/**
 * Get optimal charge (weekly TSS) for an objective
 */
export function getChargeOptimale(objectif: string, level: "performance" | "intermediaire" = "intermediaire"): number {
  return getTargetsForObjective(objectif, level).charge_optimale;
}

/**
 * Get nutrition targets (g/h) for an objective
 */
export function getNutritionTargets(
  objectif: string, 
  sport: "bike" | "run" = "bike",
  level: "performance" | "intermediaire" = "intermediaire"
): { min: number; max: number } {
  const targets = getTargetsForObjective(objectif, level);
  if (sport === "run" && targets.nutrition_run_gph) {
    return targets.nutrition_run_gph;
  }
  return targets.nutrition_bike_gph;
}

// =============================================
// BACKWARD COMPATIBILITY EXPORTS
// =============================================

/**
 * Legacy CiblesVLamax format for backward compatibility
 * Maps to intermediaire level targets
 */
export const CiblesVLamax: Record<string, VLamaxTargets> = {
  IM: UNIFIED_TARGETS.IM.intermediaire.vlamax,
  "703": UNIFIED_TARGETS["703"].intermediaire.vlamax,
  Marathon: UNIFIED_TARGETS.Marathon.intermediaire.vlamax,
  Semi: UNIFIED_TARGETS.Semi.intermediaire.vlamax,
};

/**
 * Check if VLamax is within acceptable range for objective
 */
export function isVlamaxInRange(vlamax: number | null, objectif: string): boolean {
  if (vlamax === null) return true; // No data = no alert
  const range = getVLamaxRange(objectif);
  return vlamax >= range.min && vlamax <= range.max;
}

/**
 * Get VLamax status for an objective
 */
export function getVlamaxStatus(vlamax: number | null, objectif: string): "low" | "optimal" | "high" | "unknown" {
  if (vlamax === null) return "unknown";
  const range = getVLamaxRange(objectif);
  
  if (vlamax < range.min) return "low";
  if (vlamax > range.max) return "high";
  
  // Check if close to optimal
  const optimalDelta = Math.abs(vlamax - range.optimal);
  const rangeMid = (range.max - range.min) / 4;
  
  return optimalDelta <= rangeMid ? "optimal" : "optimal"; // Still in range = optimal
}

/**
 * Check if TTE meets objective requirements
 */
export function isTTEAdequate(tte: number | null, objectif: string, level: "performance" | "intermediaire" = "intermediaire"): boolean {
  if (tte === null) return true;
  return tte >= getTTETarget(objectif, level);
}

/**
 * Check if FTP/kg meets objective requirements
 */
export function isFtpKgAdequate(ftpKg: number | null, objectif: string, level: "performance" | "intermediaire" = "intermediaire"): boolean {
  if (ftpKg === null) return true;
  return ftpKg >= getFtpKgTarget(objectif, level);
}

// =============================================
// EXPORT ALL TARGETS FOR DEBUGGING
// =============================================

export { UNIFIED_TARGETS };
