/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 2B — PAYLOAD SCHEMA (contrat client/edge mirroré)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Valide la forme des payloads envoyés à l'edge `ai-training-plan` :
 *   - `_weeklyQuotas` (Phase 2A)
 *   - `_weeklyQuotasPromptByChunk` (Phase 2A)
 *   - `_targetTable` (Phase 2B)
 * Échec → erreur explicite [PAYLOAD_INVALID] côté edge.
 *
 * ⚠️ MIRROR EXACT dans supabase/functions/ai-training-plan/payloadSchema.ts.
 * Un test d'égalité (payloadSchemaMirror.test.ts) verrouille la sync.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { z } from "zod";

const zRange = z.tuple([z.number(), z.number()]);

export const zTargetTable = z.object({
  ftpW: z.number().nullable(),
  bikeZonesW: z.record(zRange),
  sstW: zRange.nullable(),
  racePowerW: z.number().nullable(),
  racePowerRange: zRange.nullable(),
  vmaKmh: z.number().nullable(),
  runPacesSecPerKm: z.record(zRange),
  racePaceSecPerKm: z.number().nullable(),
  racePaceRange: zRange.nullable(),
  cssSecPer100m: z.number().nullable(),
  cssRange: zRange.nullable(),
  swimZonesSecPer100m: z.record(zRange),
  fcMax: z.number().nullable(),
  fcZonesBpm: z.record(zRange),
  meta: z.object({
    objective: z.string().nullable(),
    ambition: z.string().nullable(),
    sport: z.string(),
    generatedAt: z.number(),
  }),
});

export const zWeeklyQuotaEntry = z.object({
  quota: z.any(),
  floors: z.any().optional(),
  weekType: z.string().optional(),
  downgraded: z.boolean().optional(),
  downgradeReason: z.string().optional().nullable(),
  layout: z.any().optional(),
}).passthrough();

export const zPlanConfigPayload = z.object({
  _weeklyQuotas: z.record(zWeeklyQuotaEntry).optional().nullable(),
  _weeklyQuotasPromptByChunk: z.array(z.string()).optional().nullable(),
  _targetTable: zTargetTable.optional().nullable(),
}).passthrough();

export const zEdgePayload = z.object({
  athleteData: z.any(),
  planConfig: zPlanConfigPayload,
  phaseCatalogs: z.any().optional(),
  chunkCatalogs: z.any().optional(),
  chunkSize: z.number().optional(),
  catalogDurationStats: z.any().optional(),
  regenerateWeek: z.any().optional(),
  workoutCatalog: z.any().optional(),
}).passthrough();

export type EdgePayload = z.infer<typeof zEdgePayload>;
export type TargetTablePayload = z.infer<typeof zTargetTable>;
