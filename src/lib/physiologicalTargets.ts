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
 * Ambition levels:
 * - finisher: Complete the race (relaxed thresholds)
 * - age_group: Category performance, top 50% (moderate thresholds)
 * - competitor: Top 25%, podium potential (demanding thresholds)
 * - elite: Championship qualification / overall podium (elite thresholds)
 *
 * ============================================================================
 * SCIENTIFIC REFERENCES — TTE @ CP/MLSS (R6)
 * ============================================================================
 * - Karsten et al. 2014, J Sports Sci: TTE @ CP = 41 ± 17 min (cycling, N=14)
 * - Morgan et al. 2019, Eur J Appl Physiol: TTE @ CP = 48.3 ± 19.3 min (running)
 * - Black et al. 2017, J Appl Physiol: TTE @ CP = 45–60 min
 * - Burnley & Jones 2018, Eur J Sport Sci: TTE > 70 min rarely observed
 * - Joyner 1991, J Appl Physiol: elite marathon @ 94–100% MLSS for 120–130 min
 *   → implied TTE @ MLSS > 60 min (semi-elite/elite)
 * - Plafond physiologique consensus : ~70–80 min (Burnley 2018)
 *
 * Implications matrice :
 * - Ultra elite plafonné à 65 min (R1) — au-delà = hors plage observée
 * - Semi competitor/elite alignés Joyner (R2) : 50/55 min
 * - 5K/Sprint : TTE est SECONDAIRE (limiteur prime = VO2max). Les valeurs
 *   ci-dessous restent informatives mais ne doivent pas être priorisées (R3).
 * ============================================================================
 */



import { AmbitionLevel, DEFAULT_AMBITION } from "@/types/ambitionLevel";

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
  ftp_kg_min: number;        // Minimum FTP/kg (W/kg) — vélo/tri
  vma_min?: number;          // Minimum VMA (km/h) — running
  charge_optimale: number;   // Optimal weekly TSS
  nutrition_bike_gph: { min: number; max: number };  // g/h on bike
  nutrition_run_gph?: { min: number; max: number };  // g/h on run (IM/70.3)
}

// New 4-level ambition structure
export interface AmbitionTargets {
  finisher: ObjectiveTargets;
  age_group: ObjectiveTargets;
  competitor: ObjectiveTargets;
  elite: ObjectiveTargets;
}

// Legacy structure for backward compatibility
export interface LeveledTargets {
  performance: ObjectiveTargets;
  intermediaire: ObjectiveTargets;
}

// =============================================
// AMBITION-BASED TARGETS BY OBJECTIVE
// =============================================

const AMBITION_TARGETS: Record<string, AmbitionTargets> = {
  // =============================================
  // IRONMAN FULL DISTANCE
  // =============================================
  IM: {
    finisher: {
      vlamax: { min: 0.35, max: 0.60, optimal: 0.48 },
      tte_min: 40,
      ftp_kg_min: 2.8,
      charge_optimale: 350,
      nutrition_bike_gph: { min: 60, max: 80 },
      nutrition_run_gph: { min: 40, max: 55 },
    },
    age_group: {
      vlamax: { min: 0.30, max: 0.50, optimal: 0.40 },
      tte_min: 50,
      ftp_kg_min: 3.5,
      charge_optimale: 450,
      nutrition_bike_gph: { min: 70, max: 90 },
      nutrition_run_gph: { min: 50, max: 65 },
    },
    competitor: {
      vlamax: { min: 0.28, max: 0.45, optimal: 0.36 },
      tte_min: 55,
      ftp_kg_min: 4.0,
      charge_optimale: 520,
      nutrition_bike_gph: { min: 85, max: 100 },
      nutrition_run_gph: { min: 55, max: 70 },
    },
    elite: {
      vlamax: { min: 0.25, max: 0.38, optimal: 0.30 },
      tte_min: 60,
      ftp_kg_min: 4.5,
      charge_optimale: 600,
      nutrition_bike_gph: { min: 95, max: 120 },
      nutrition_run_gph: { min: 65, max: 80 },
    },
  },

  // =============================================
  // 70.3 / HALF IRONMAN
  // =============================================
  "703": {
    finisher: {
      vlamax: { min: 0.40, max: 0.65, optimal: 0.52 },
      tte_min: 35,
      ftp_kg_min: 2.8,
      charge_optimale: 280,
      nutrition_bike_gph: { min: 50, max: 70 },
      nutrition_run_gph: { min: 30, max: 50 },
    },
    age_group: {
      vlamax: { min: 0.35, max: 0.55, optimal: 0.45 },
      tte_min: 45,
      ftp_kg_min: 3.6,
      charge_optimale: 380,
      nutrition_bike_gph: { min: 60, max: 80 },
      nutrition_run_gph: { min: 40, max: 60 },
    },
    competitor: {
      vlamax: { min: 0.30, max: 0.48, optimal: 0.38 },
      tte_min: 50,
      ftp_kg_min: 4.0,
      charge_optimale: 450,
      nutrition_bike_gph: { min: 75, max: 95 },
      nutrition_run_gph: { min: 50, max: 70 },
    },
    elite: {
      vlamax: { min: 0.26, max: 0.42, optimal: 0.33 },
      tte_min: 55,
      ftp_kg_min: 4.5,
      charge_optimale: 520,
      nutrition_bike_gph: { min: 90, max: 110 },
      nutrition_run_gph: { min: 60, max: 80 },
    },
  },

  // =============================================
  // MARATHON
  // =============================================
  Marathon: {
    finisher: {
      vlamax: { min: 0.45, max: 0.70, optimal: 0.55 },
      tte_min: 40,
      ftp_kg_min: 2.5,
      vma_min: 14.0,
      charge_optimale: 250,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 40, max: 60 },
    },
    age_group: {
      vlamax: { min: 0.35, max: 0.55, optimal: 0.45 },
      tte_min: 50,
      ftp_kg_min: 3.2,
      vma_min: 16.0,
      charge_optimale: 320,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 50, max: 80 },
    },
    competitor: {
      vlamax: { min: 0.30, max: 0.48, optimal: 0.38 },
      tte_min: 55,
      ftp_kg_min: 3.6,
      vma_min: 18.0,
      charge_optimale: 380,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 65, max: 90 },
    },
    elite: {
      vlamax: { min: 0.25, max: 0.40, optimal: 0.32 },
      tte_min: 60,
      ftp_kg_min: 4.0,
      vma_min: 20.0,
      charge_optimale: 450,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 80, max: 110 },
    },
  },

  // =============================================
  // SEMI-MARATHON
  // =============================================
  Semi: {
    finisher: {
      vlamax: { min: 0.55, max: 0.80, optimal: 0.65 },
      tte_min: 30,
      ftp_kg_min: 2.5,
      vma_min: 13.0,
      charge_optimale: 200,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 30, max: 50 },
    },
    age_group: {
      vlamax: { min: 0.45, max: 0.70, optimal: 0.55 },
      tte_min: 40,
      ftp_kg_min: 3.2,
      vma_min: 15.0,
      charge_optimale: 280,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 40, max: 70 },
    },
    competitor: {
      vlamax: { min: 0.38, max: 0.58, optimal: 0.48 },
      tte_min: 45,
      ftp_kg_min: 3.6,
      vma_min: 17.5,
      charge_optimale: 330,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 55, max: 85 },
    },
    elite: {
      vlamax: { min: 0.32, max: 0.50, optimal: 0.40 },
      tte_min: 50,
      ftp_kg_min: 4.0,
      vma_min: 20.0,
      charge_optimale: 400,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 70, max: 100 },
    },
  },

  // =============================================
  // TRAIL (40-80km)
  // =============================================
  Trail: {
    finisher: {
      vlamax: { min: 0.45, max: 0.65, optimal: 0.55 },
      tte_min: 40,
      ftp_kg_min: 2.8,
      vma_min: 14.0,
      charge_optimale: 300,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 50, max: 80 },
    },
    age_group: {
      vlamax: { min: 0.40, max: 0.60, optimal: 0.50 },
      tte_min: 50,
      ftp_kg_min: 3.5,
      vma_min: 16.0,
      charge_optimale: 380,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 60, max: 90 },
    },
    competitor: {
      vlamax: { min: 0.35, max: 0.52, optimal: 0.42 },
      tte_min: 55,
      ftp_kg_min: 3.8,
      vma_min: 18.0,
      charge_optimale: 450,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 75, max: 110 },
    },
    elite: {
      vlamax: { min: 0.28, max: 0.45, optimal: 0.35 },
      tte_min: 60,
      ftp_kg_min: 4.2,
      vma_min: 20.0,
      charge_optimale: 520,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 90, max: 130 },
    },
  },

  // =============================================
  // TRAIL LONG (80km+)
  // =============================================
  TrailLong: {
    finisher: {
      vlamax: { min: 0.40, max: 0.65, optimal: 0.52 },
      tte_min: 45,
      ftp_kg_min: 2.8,
      vma_min: 14.0,
      charge_optimale: 380,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 60, max: 90 },
    },
    age_group: {
      vlamax: { min: 0.35, max: 0.55, optimal: 0.45 },
      tte_min: 55,
      ftp_kg_min: 3.5,
      vma_min: 16.0,
      charge_optimale: 450,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 70, max: 100 },
    },
    competitor: {
      vlamax: { min: 0.30, max: 0.48, optimal: 0.38 },
      tte_min: 60,
      ftp_kg_min: 3.8,
      vma_min: 18.0,
      charge_optimale: 520,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 90, max: 130 },
    },
    elite: {
      vlamax: { min: 0.25, max: 0.40, optimal: 0.32 },
      tte_min: 65,
      ftp_kg_min: 4.2,
      vma_min: 20.5,
      charge_optimale: 600,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 110, max: 150 },
    },
  },

  // =============================================
  // TRAIL MOUNTAIN (40-80km avec D+ important / altitude)
  // Intermediaire entre Trail et TrailLong (charge ↑, intensité ↓ vs Trail plat)
  // =============================================
  TrailMountain: {
    finisher: {
      vlamax: { min: 0.42, max: 0.62, optimal: 0.52 },
      tte_min: 45,
      ftp_kg_min: 2.8,
      vma_min: 14.0,
      charge_optimale: 340,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 55, max: 85 },
    },
    age_group: {
      vlamax: { min: 0.38, max: 0.58, optimal: 0.48 },
      tte_min: 52,
      ftp_kg_min: 3.5,
      vma_min: 16.0,
      charge_optimale: 420,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 65, max: 95 },
    },
    competitor: {
      vlamax: { min: 0.32, max: 0.50, optimal: 0.40 },
      tte_min: 58,
      ftp_kg_min: 3.8,
      vma_min: 18.0,
      charge_optimale: 490,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 80, max: 120 },
    },
    elite: {
      vlamax: { min: 0.26, max: 0.42, optimal: 0.33 },
      tte_min: 62,
      ftp_kg_min: 4.2,
      vma_min: 20.0,
      charge_optimale: 560,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 100, max: 140 },
    },
  },

  // =============================================
  Ultra: {
    finisher: {
      vlamax: { min: 0.35, max: 0.58, optimal: 0.48 },
      tte_min: 50,
      ftp_kg_min: 2.8,
      vma_min: 13.5,
      charge_optimale: 420,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 70, max: 100 },
    },
    age_group: {
      vlamax: { min: 0.30, max: 0.50, optimal: 0.40 },
      tte_min: 60,
      ftp_kg_min: 3.3,
      vma_min: 15.5,
      charge_optimale: 500,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 80, max: 120 },
    },
    competitor: {
      vlamax: { min: 0.25, max: 0.42, optimal: 0.33 },
      tte_min: 65,
      ftp_kg_min: 3.6,
      vma_min: 17.5,
      charge_optimale: 560,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 100, max: 145 },
    },
    elite: {
      vlamax: { min: 0.20, max: 0.35, optimal: 0.28 },
      tte_min: 70,
      ftp_kg_min: 4.0,
      vma_min: 20.0,
      charge_optimale: 650,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 130, max: 180 },
    },
  },

  // =============================================
  // 10KM
  // =============================================
  "10km": {
    finisher: {
      vlamax: { min: 0.60, max: 0.85, optimal: 0.72 },
      tte_min: 25,
      ftp_kg_min: 2.8,
      vma_min: 13.0,
      charge_optimale: 180,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 20, max: 40 },
    },
    age_group: {
      vlamax: { min: 0.50, max: 0.75, optimal: 0.62 },
      tte_min: 35,
      ftp_kg_min: 3.5,
      vma_min: 16.0,
      charge_optimale: 250,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 30, max: 50 },
    },
    competitor: {
      vlamax: { min: 0.42, max: 0.65, optimal: 0.52 },
      tte_min: 40,
      ftp_kg_min: 3.8,
      vma_min: 18.5,
      charge_optimale: 300,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 40, max: 60 },
    },
    elite: {
      vlamax: { min: 0.35, max: 0.55, optimal: 0.45 },
      tte_min: 45,
      ftp_kg_min: 4.2,
      vma_min: 21.0,
      charge_optimale: 350,
      nutrition_bike_gph: { min: 0, max: 0 },
      nutrition_run_gph: { min: 50, max: 70 },
    },
  },

  // =============================================
  // 5K
  // =============================================
  "5K": {
    finisher: {
      vlamax: { min: 0.65, max: 0.90, optimal: 0.78 },
      tte_min: 20,
      ftp_kg_min: 2.8,
      vma_min: 13.0,
      charge_optimale: 150,
      nutrition_bike_gph: { min: 0, max: 0 },
    },
    age_group: {
      vlamax: { min: 0.55, max: 0.82, optimal: 0.68 },
      tte_min: 28,
      ftp_kg_min: 3.5,
      vma_min: 16.5,
      charge_optimale: 200,
      nutrition_bike_gph: { min: 0, max: 0 },
    },
    competitor: {
      vlamax: { min: 0.48, max: 0.72, optimal: 0.58 },
      tte_min: 32,
      ftp_kg_min: 3.8,
      vma_min: 19.0,
      charge_optimale: 260,
      nutrition_bike_gph: { min: 0, max: 0 },
    },
    elite: {
      vlamax: { min: 0.40, max: 0.62, optimal: 0.50 },
      tte_min: 38,
      ftp_kg_min: 4.2,
      vma_min: 22.0,
      charge_optimale: 320,
      nutrition_bike_gph: { min: 0, max: 0 },
    },
  },

  Sprint: {
    finisher: {
      vlamax: { min: 0.65, max: 0.95, optimal: 0.80 },
      tte_min: 20,
      ftp_kg_min: 3.2,
      charge_optimale: 180,
      nutrition_bike_gph: { min: 20, max: 40 },
    },
    age_group: {
      vlamax: { min: 0.60, max: 0.90, optimal: 0.75 },
      tte_min: 30,
      ftp_kg_min: 4.2,
      charge_optimale: 250,
      nutrition_bike_gph: { min: 30, max: 50 },
    },
    competitor: {
      vlamax: { min: 0.55, max: 0.82, optimal: 0.68 },
      tte_min: 35,
      ftp_kg_min: 4.7,
      charge_optimale: 300,
      nutrition_bike_gph: { min: 35, max: 55 },
    },
    elite: {
      vlamax: { min: 0.50, max: 0.75, optimal: 0.62 },
      tte_min: 40,
      ftp_kg_min: 5.2,
      charge_optimale: 350,
      nutrition_bike_gph: { min: 45, max: 65 },
    },
  },

  Olympic: {
    finisher: {
      vlamax: { min: 0.60, max: 0.85, optimal: 0.72 },
      tte_min: 25,
      ftp_kg_min: 3.2,
      charge_optimale: 220,
      nutrition_bike_gph: { min: 30, max: 50 },
    },
    age_group: {
      vlamax: { min: 0.55, max: 0.75, optimal: 0.65 },
      tte_min: 35,
      ftp_kg_min: 4.0,
      charge_optimale: 300,
      nutrition_bike_gph: { min: 40, max: 60 },
    },
    competitor: {
      vlamax: { min: 0.48, max: 0.68, optimal: 0.58 },
      tte_min: 40,
      ftp_kg_min: 4.5,
      charge_optimale: 350,
      nutrition_bike_gph: { min: 55, max: 75 },
    },
    elite: {
      vlamax: { min: 0.42, max: 0.60, optimal: 0.50 },
      tte_min: 45,
      ftp_kg_min: 5.0,
      charge_optimale: 400,
      nutrition_bike_gph: { min: 65, max: 85 },
    },
  },
};

// =============================================
// LEGACY UNIFIED_TARGETS FOR BACKWARD COMPAT
// Maps to age_group (intermediaire) and elite (performance)
// =============================================

const UNIFIED_TARGETS: Record<string, LeveledTargets> = Object.fromEntries(
  Object.entries(AMBITION_TARGETS).map(([key, val]) => [
    key,
    {
      intermediaire: val.age_group,
      performance: val.elite,
    },
  ])
);

// Aliases for common objective names
// ✅ FIX: Supporter tous les formats de 70.3 (703, 70.3, Half, etc.)
const OBJECTIVE_ALIASES: Record<string, string> = {
  "Ironman": "IM",
  "ironman": "IM",
  "im": "IM",
  "70.3": "703",   // Format avec point → clé interne
  "70,3": "703",   // Format avec virgule (français)
  "Half": "703",
  "half": "703",
  "HALF": "703",
  "marathon": "Marathon",
  "MARATHON": "Marathon",
  "semi": "Semi",
  "SEMI": "Semi",
  "Semi-Marathon": "Semi",
  "SemiMarathon": "Semi",
  "trail": "Trail",
  "TrailCourt": "Trail",
  "TrailShort": "Trail",
  "TrailMountain": "TrailMountain",
  "trailmountain": "TrailMountain",
  "traillong": "TrailLong",
  "TrailUltra": "Ultra",
  "trailultra": "Ultra",
  "ultra": "Ultra",
  "sprint": "Sprint",
  "olympic": "Olympic",
  "olympique": "Olympic",
  "Course": "Semi",
  "10km": "10km",
  "10K": "10km",
  "10k": "10km",
  "5K": "5K",
  "5k": "5K",
  "StartToRun": "5K",
  "starttorun": "5K",
};

// =============================================
// ACCESSOR FUNCTIONS
// =============================================

/**
 * Normalize objective string to canonical form
 */
export function normalizeObjective(objectif: string): string {
  if (AMBITION_TARGETS[objectif]) return objectif;
  const alias = OBJECTIVE_ALIASES[objectif] || OBJECTIVE_ALIASES[objectif.toLowerCase()];
  return alias || "703"; // Default to 703 if unknown
}

/**
 * Multiplicateurs `world_class` (Elite top 3% AG) appliqués post-lookup
 * sur la base du palier `elite` (= "Qualifiable" UI).
 * Sources : grilles qualif Mondial 70.3 (Kraichgau) + percentile 3% AG marathon.
 */
function applyWorldClassMultipliers(base: ObjectiveTargets): ObjectiveTargets {
  return {
    vlamax: {
      min: +(base.vlamax.min * 0.95).toFixed(2),
      max: +(base.vlamax.max * 0.95).toFixed(2),
      optimal: +(base.vlamax.optimal * 0.92).toFixed(2),
    },
    tte_min: Math.round(base.tte_min * 1.10),
    ftp_kg_min: Math.round(base.ftp_kg_min * 1.08 * 10) / 10,
    vma_min: base.vma_min !== undefined ? Math.round(base.vma_min * 1.04 * 10) / 10 : undefined,
    charge_optimale: Math.round(base.charge_optimale * 1.08),
    nutrition_bike_gph: {
      min: Math.round(base.nutrition_bike_gph.min * 1.05),
      max: Math.round(base.nutrition_bike_gph.max * 1.05),
    },
    nutrition_run_gph: base.nutrition_run_gph ? {
      min: Math.round(base.nutrition_run_gph.min * 1.05),
      max: Math.round(base.nutrition_run_gph.max * 1.05),
    } : undefined,
  };
}

/**
 * Get full targets for an objective at a given ambition level (NEW API)
 *
 * Mapping ambition → bloc de données :
 *   finisher/age_group/competitor/elite → lecture directe
 *   world_class (Elite top 3%) → bloc `elite` + multiplicateurs +stricts
 */
export function getTargetsForAmbition(
  objectif: string,
  ambition: AmbitionLevel = DEFAULT_AMBITION
): ObjectiveTargets {
  const normalized = normalizeObjective(objectif);
  const targets = AMBITION_TARGETS[normalized];
  if (!targets) return AMBITION_TARGETS["703"].age_group;

  if (ambition === "world_class") {
    return applyWorldClassMultipliers(targets.elite);
  }
  return targets[ambition as keyof AmbitionTargets] || targets.age_group;
}

/**
 * Get full targets for an objective at a given level (LEGACY API - kept for compat)
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
 * Sport-aware VLamax offset.
 * CAP/Run mobilise moins de masse musculaire que le vélo → VLamax mesurée ~+0.05–0.10 mmol/L/s
 * pour la même capacité glycolytique. On élargit la fenêtre cible vers le haut quand sport === "cap"/"run".
 * Plafond physiologique réaliste CAP amateur = 0.80 mmol/L/s.
 */
const VLAMAX_REALISTIC_MAX_CAP = 0.80;
function applySportOffset(range: VLamaxTargets, sport?: string): VLamaxTargets {
  if (!sport) return range;
  const s = sport.toLowerCase();
  if (s === "cap" || s === "run" || s === "running") {
    return {
      min: +(range.min + 0.05).toFixed(2),
      max: +Math.min(range.max + 0.07, VLAMAX_REALISTIC_MAX_CAP).toFixed(2),
      optimal: +(range.optimal + 0.06).toFixed(2),
    };
  }
  return range;
}

/**
 * Get VLamax range for an objective (uses ambition level + optional sport offset)
 */
export function getVLamaxRange(objectif: string, ambition?: AmbitionLevel, sport?: string): VLamaxTargets {
  const targets = getTargetsForAmbition(objectif, ambition || DEFAULT_AMBITION);
  return applySportOffset(targets.vlamax, sport);
}

/**
 * Get VLamax threshold (max value) for triggering "too high" alerts
 */
export function getVLamaxThreshold(objectif: string, ambition?: AmbitionLevel, sport?: string): number {
  return getVLamaxRange(objectif, ambition, sport).max;
}

/**
 * Get VLamax optimal value for an objective
 */
export function getVLamaxOptimal(objectif: string, ambition?: AmbitionLevel, sport?: string): number {
  return getVLamaxRange(objectif, ambition, sport).optimal;
}

/**
 * Get TTE target for an objective (NEW API with ambition)
 */
export function getTTETargetByAmbition(objectif: string, ambition: AmbitionLevel = DEFAULT_AMBITION): number {
  return getTargetsForAmbition(objectif, ambition).tte_min;
}

/**
 * Get TTE target for an objective (LEGACY API)
 */
export function getTTETarget(objectif: string, level: "performance" | "intermediaire" = "intermediaire"): number {
  return getTargetsForObjective(objectif, level).tte_min;
}

/**
 * Get FTP/kg target for an objective (NEW API with ambition)
 */
export function getFtpKgTargetByAmbition(objectif: string, ambition: AmbitionLevel = DEFAULT_AMBITION): number {
  return getTargetsForAmbition(objectif, ambition).ftp_kg_min;
}

/**
 * Get FTP/kg target for an objective (LEGACY API)
 */
export function getFtpKgTarget(objectif: string, level: "performance" | "intermediaire" = "intermediaire"): number {
  return getTargetsForObjective(objectif, level).ftp_kg_min;
}

/**
 * Get VMA target for a running objective (NEW API with ambition)
 * Returns null for non-running objectives
 */
export function getVmaTargetByAmbition(objectif: string, ambition: AmbitionLevel = DEFAULT_AMBITION): number | null {
  return getTargetsForAmbition(objectif, ambition).vma_min ?? null;
}

/**
 * Get optimal charge (weekly TSS) for an objective
 */
export function getChargeOptimale(objectif: string, ambition?: AmbitionLevel): number {
  if (ambition) {
    return getTargetsForAmbition(objectif, ambition).charge_optimale;
  }
  return getTargetsForObjective(objectif, "intermediaire").charge_optimale;
}

/**
 * Get nutrition targets (g/h) for an objective
 */
export function getNutritionTargets(
  objectif: string, 
  sport: "bike" | "run" = "bike",
  ambition?: AmbitionLevel
): { min: number; max: number } {
  const targets = ambition 
    ? getTargetsForAmbition(objectif, ambition)
    : getTargetsForObjective(objectif, "intermediaire");
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
 * Maps to age_group (intermediaire) level targets
 */
export const CiblesVLamax: Record<string, VLamaxTargets> = {
  IM: AMBITION_TARGETS.IM.age_group.vlamax,
  "703": AMBITION_TARGETS["703"].age_group.vlamax,
  Marathon: AMBITION_TARGETS.Marathon.age_group.vlamax,
  Semi: AMBITION_TARGETS.Semi.age_group.vlamax,
};

/**
 * Check if VLamax is within acceptable range for objective
 */
export function isVlamaxInRange(vlamax: number | null, objectif: string, ambition?: AmbitionLevel, sport?: string): boolean {
  if (vlamax === null) return true; // No data = no alert
  const range = getVLamaxRange(objectif, ambition, sport);
  return vlamax >= range.min && vlamax <= range.max;
}

/**
 * Get VLamax status for an objective
 * Returns granular status based on distance from optimal target
 */
export function getVlamaxStatus(vlamax: number | null, objectif: string, ambition?: AmbitionLevel, sport?: string): "low" | "optimal" | "acceptable" | "high" | "unknown" {
  if (vlamax === null) return "unknown";
  const range = getVLamaxRange(objectif, ambition, sport);
  
  if (vlamax < range.min) return "low";
  if (vlamax > range.max) return "high";
  
  // Check distance from optimal
  const optimalDelta = Math.abs(vlamax - range.optimal);
  const tolerance = (range.max - range.min) * 0.25; // ±25% of range width
  
  return optimalDelta <= tolerance ? "optimal" : "acceptable";
}

/**
 * Unified VLamax status with label — single source of truth for UI
 * Replaces all local getVLamaxStatus functions in Dashboard/Staff pages
 */
export function getVlamaxStatusWithLabel(
  vlamax: number | null, 
  objectif: string, 
  ambition?: AmbitionLevel,
  sport?: string
): { status: "ok" | "warning" | "critical"; label: string; deviation: number | null } {
  if (vlamax === null) return { status: "critical", label: "Non disponible", deviation: null };
  
  const range = getVLamaxRange(objectif, ambition, sport);
  const deviation = range.optimal > 0 
    ? Math.round(((vlamax - range.optimal) / range.optimal) * 100) 
    : 0;
  
  const rawStatus = getVlamaxStatus(vlamax, objectif, ambition, sport);
  
  switch (rawStatus) {
    case "low":
      return { status: "ok", label: "Très bas", deviation };
    case "optimal":
      return { status: "ok", label: "Optimal", deviation };
    case "acceptable":
      return { status: "warning", label: "Acceptable", deviation };
    case "high":
      return { status: "critical", label: "Limitant", deviation };
    default:
      return { status: "critical", label: "Non disponible", deviation: null };
  }
}

/**
 * Check if TTE meets objective requirements
 */
export function isTTEAdequate(tte: number | null, objectif: string, ambition?: AmbitionLevel): boolean {
  if (tte === null) return true;
  const target = ambition ? getTTETargetByAmbition(objectif, ambition) : getTTETarget(objectif);
  return tte >= target;
}

/**
 * Check if FTP/kg meets objective requirements
 */
export function isFtpKgAdequate(ftpKg: number | null, objectif: string, ambition?: AmbitionLevel): boolean {
  if (ftpKg === null) return true;
  const target = ambition ? getFtpKgTargetByAmbition(objectif, ambition) : getFtpKgTarget(objectif);
  return ftpKg >= target;
}

// =============================================
// EXPORT ALL TARGETS FOR DEBUGGING
// =============================================

export { UNIFIED_TARGETS, AMBITION_TARGETS };
