/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 1B — Client mirror of `supabase/functions/ai-training-plan/planSchema.ts`
 * ═══════════════════════════════════════════════════════════════════════════════
 * Kept in strict sync : enum values, field names, and constraints reproduce the
 * server schema so that a chunk validated server-side re-validates identically
 * client-side. The client does not need the enum-runtime `catalogId` closure
 * (server already validated it), so we accept `string | null` here.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { z } from "zod";

export const zDay = z.enum([
  "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
]);
export type DayLower = z.infer<typeof zDay>;

export const DAY_INDEX: Record<DayLower, number> = {
  lundi: 0, mardi: 1, mercredi: 2, jeudi: 3,
  vendredi: 4, samedi: 5, dimanche: 6,
};
export const DAY_CAPITALIZED: Record<DayLower, string> = {
  lundi: "Lundi", mardi: "Mardi", mercredi: "Mercredi", jeudi: "Jeudi",
  vendredi: "Vendredi", samedi: "Samedi", dimanche: "Dimanche",
};

export const zSport = z.enum([
  "swim", "bike", "run", "brick", "strength", "recovery", "rest",
]);

export const zPhase = z.enum(["base", "build", "peak", "taper"]);

const zStrategicLimiter = z.object({
  rank: z.number().int().positive(),
  name: z.string().min(1),
  status: z.string(),
  block: z.string(),
  weeks: z.string(),
  keySessions: z.string(),
});
const zStrategicRecap = z.object({
  limiters: z.array(zStrategicLimiter),
  synergies: z.array(z.string()),
});
const zPhaseSummary = z.object({
  name: z.string().min(1),
  weeks: z.string(),
  objective: z.string().optional(),
});

const zSessionBase = {
  day: zDay,
  title: z.string().min(1),
  details: z.string().default(""),
  isKeySession: z.boolean().default(false),
  durationMin: z.number().int().nonnegative(),
  zones: z.array(z.string()).default([]),
};

const zSessionRest = z.object({
  ...zSessionBase,
  sport: z.literal("rest"),
  custom: z.literal(true),
  catalogId: z.null(),
  durationMin: z.literal(0),
});
const zSessionCustom = z.object({
  ...zSessionBase,
  sport: z.enum(["swim", "bike", "run", "brick", "strength", "recovery"]),
  custom: z.literal(true),
  catalogId: z.null(),
});
const zSessionRef = z.object({
  ...zSessionBase,
  sport: z.enum(["swim", "bike", "run", "brick", "strength", "recovery"]),
  custom: z.literal(false),
  catalogId: z.string().min(1),
});

export const zSession = z.union([zSessionRest, zSessionRef, zSessionCustom]);

export const zWeek = z.object({
  weekNumber: z.number().int().positive(),
  phase: zPhase,
  theme: z.string().default(""),
  phaseObjective: z.string().optional(),
  weeklyNotes: z.string().optional(),
  sessions: z.array(zSession).min(1),
});

export const zPlanChunk = z.object({
  title: z.string().optional(),
  diagnostic: z.string().optional(),
  strategicRecap: zStrategicRecap.optional(),
  phases: z.array(zPhaseSummary).optional(),
  weeks: z.array(zWeek).min(1),
});

export type PlanChunk = z.infer<typeof zPlanChunk>;
export type PlanWeek = z.infer<typeof zWeek>;
export type PlanSession = z.infer<typeof zSession>;
export type StrategicRecapJSON = z.infer<typeof zStrategicRecap>;
export type PhaseSummaryJSON = z.infer<typeof zPhaseSummary>;
