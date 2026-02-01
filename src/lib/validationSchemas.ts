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
  vma: numericOptional(8, 30),
  ftp: intOptional(50, 600),
  css: numericOptional(0.5, 3),
  vo2max: numericOptional(20, 100),
  vlamax: numericOptional(0.1, 1.5),
  weight_kg: numericOptional(30, 200),
  fat_pct: numericOptional(3, 50),
  pmax_5s: intOptional(200, 3000),
  metabolic_profile: z.string().max(100).nullable().optional(),
  metabolic_score: intOptional(0, 100),
  coach_notes: z.string().max(2000).nullable().optional(),
  tss_7d: intOptional(0, 2000),
  tte_mode: z.string().max(50).nullable().optional(),
  tte_observed_min: intOptional(1, 120),
  // Running Economy (CAP) fields
  run_pace_ref_sec_per_km: intOptional(120, 900), // 2:00 - 15:00/km
  run_hr_ref_bpm: intOptional(80, 220),
  run_duration_min: intOptional(10, 300),
  run_hr_drift_pct: numericOptional(0, 30),
  run_economy_score: intOptional(0, 100),
  run_economy_label: z.string().max(20).nullable().optional(),
});

export type ValidatedSnapshot = z.infer<typeof snapshotSchema>;

// ========== CHECKIN ==========
export const checkinSchema = z.object({
  athlete_id: z.string().uuid(),
  date_iso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide"),
  week_tag: z.string().max(20).nullable().optional(),
  sleep: z.number().int().min(1).max(10).nullable().optional(),
  fatigue: z.number().int().min(1).max(10).nullable().optional(),
  soreness: z.number().int().min(0).max(10).nullable().optional(), // 0 = "Aucune" courbature
  stress: z.number().int().min(1).max(10).nullable().optional(),
  motivation: z.number().int().min(1).max(10).nullable().optional(),
  rpe_key1: z.number().int().min(1).max(10).nullable().optional(),
  rpe_key2: z.number().int().min(1).max(10).nullable().optional(),
  pain_flag: z.boolean().nullable().optional(),
  readiness: z.number().int().min(0).max(100).nullable().optional(),
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
