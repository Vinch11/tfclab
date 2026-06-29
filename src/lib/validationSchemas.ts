// =============================================
// VALIDATION SCHEMAS - Zod schemas for data integrity
// =============================================

import { z } from "zod";

// Helper for nullable optional numbers with range - accepts string/number and converts
const numericOptional = (min: number, max: number) =>
  z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === "") return null;
      const num = typeof val === "string" ? parseFloat(val) : val;
      return Number.isFinite(num) ? num : null;
    },
    z.number().min(min).max(max).nullable().optional()
  );

// Helper for nullable optional integers - accepts string/number and converts
const intOptional = (min: number, max: number) =>
  z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === "") return null;
      const num = typeof val === "string" ? parseInt(val, 10) : Math.round(Number(val));
      return Number.isFinite(num) ? num : null;
    },
    z.number().int().min(min).max(max).nullable().optional()
  );

// ========== ATHLETE ==========
export const athleteSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(100, "Le nom est trop long"),
  goal: z.string().max(500, "L'objectif est trop long").nullable().optional(),
  vo2max: numericOptional(20, 100),
  sex: z.enum(["M", "F"]).nullable().optional(),
  refs: z.record(z.unknown()).nullable().optional(),
});

export type ValidatedAthlete = z.infer<typeof athleteSchema>;

// ========== SNAPSHOT ==========
export const snapshotSchema = z.object({
  athlete_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide"),
  source: z.string().max(50).default("manual"),
  cycle_tag: z.string().max(50).nullable().optional(),
  confidence: numericOptional(0, 1),
  fc_max: intOptional(100, 250),
  fc_repos: intOptional(30, 90),
  vma: numericOptional(8, 30),
  ftp: intOptional(50, 600),
  css: numericOptional(0.5, 3),
  vo2max: numericOptional(20, 100),
  vlamax: numericOptional(0.1, 1.5),
  vlamax_run: numericOptional(0.1, 1.5), // ✅ VLamax CAP
  weight_kg: numericOptional(30, 200),
  fat_pct: numericOptional(3, 50),
  pmax_5s: intOptional(200, 3000),
  metabolic_profile: z.string().max(100).nullable().optional(),
  metabolic_score: intOptional(0, 100),
  coach_notes: z.string().max(2000).nullable().optional(),
  tss_7d: intOptional(0, 2000),
  tte_mode: z.string().max(50).nullable().optional(),
  tte_observed_min: intOptional(1, 120),
  // ✅ VLamax Bike V2 Enhanced - Power indices
  p30s_w: intOptional(100, 3000),
  p60s_w: intOptional(100, 2500),
  map5min_w: intOptional(50, 800),
  protocol_quality: intOptional(1, 5),
  // Running Economy (CAP) fields
  run_pace_ref_sec_per_km: intOptional(120, 900),
  run_hr_ref_bpm: intOptional(80, 220),
  run_duration_min: intOptional(10, 300),
  run_hr_drift_pct: numericOptional(0, 30),
  run_economy_score: intOptional(0, 100),
  run_economy_label: z.string().max(20).nullable().optional(),
  // ✅ VLamax CAP estimation fields
  pace_threshold_sec_per_km: intOptional(120, 900),
  sprint_15s_distance: numericOptional(30, 200),
  running_power_max: intOptional(100, 2000),
  running_power_threshold: intOptional(50, 1000),
  running_power_1s: intOptional(100, 3000),
  running_power_5s: intOptional(100, 2500),
  running_power_30s: intOptional(50, 2000),
  running_power_60s: intOptional(50, 1500),
  running_power_5min: intOptional(50, 1200),
  // ✅ Snapshot metadata fields
  sport_main: z.string().max(50).nullable().optional(),
  objectif: z.string().max(50).nullable().optional(),
  fatigue_state: z.string().max(50).nullable().optional(),
  carb_tolerance_band: z.string().max(50).nullable().optional(),
  low_crr_justification: z.string().max(500).nullable().optional(),
  vlamax_source: z.string().max(50).nullable().optional(),
  vlamax_protocol: z.string().max(100).nullable().optional(),
  vlamax_is_reference: z.boolean().nullable().optional(),
  bike_cadence_rpm: intOptional(30, 200),
  bike_hr_drift_flag: z.boolean().nullable().optional(),
  gi_issues_flag: z.boolean().nullable().optional(),
  force_development_mode: z.boolean().nullable().optional(),
});

export type ValidatedSnapshot = z.infer<typeof snapshotSchema>;

// ========== CHECKIN ==========
export const checkinSchema = z.object({
  athlete_id: z.string().uuid(),
  date_iso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide"),
  week_tag: z.string().max(20).nullable().optional(),
  sleep: intOptional(1, 10),
  fatigue: intOptional(1, 10),
  soreness: intOptional(0, 10), // 0 = "Aucune" courbature
  stress: intOptional(1, 10),
  motivation: intOptional(1, 10),
  rpe_key1: intOptional(1, 10),
  rpe_key2: intOptional(1, 10),
  pain_flag: z.boolean().nullable().optional(),
  readiness: intOptional(0, 100),
  notes: z.string().max(2000).nullable().optional(),
});

export type ValidatedCheckin = z.infer<typeof checkinSchema>;

// ========== TEST ==========
export const testSchema = z.object({
  athlete_id: z.string().uuid(),
  type: z.string().min(1).max(50),
  name: z.string().min(1, "Le nom est requis").max(100),
  sport: z.string().max(50).nullable().optional(),
  reliability: numericOptional(0, 100),
  vlamax: numericOptional(0.1, 1.5),
  raw: z.record(z.unknown()).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

export type ValidatedTest = z.infer<typeof testSchema>;

// ========== VALIDATION HELPERS ==========

/**
 * Validate data against a schema, returning parsed data or null with error message
 */
export function validateOrNull<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): { data: T; error: null } | { data: null; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { data: result.data, error: null };
  }
  const errorMessage = result.error.errors.map(e => e.message).join(", ");
  return { data: null, error: errorMessage };
}

/**
 * Clean numeric input - returns number or null
 */
export function cleanNumeric(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isFinite(num) ? num : null;
}

/**
 * Clean integer input - returns integer or null
 */
export function cleanInteger(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "string" ? parseInt(value, 10) : Math.round(value);
  return isFinite(num) ? num : null;
}
