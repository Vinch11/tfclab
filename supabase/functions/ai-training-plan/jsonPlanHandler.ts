/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 1A — Handler JSON structuré (route feature-flaggée)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Point d'entrée du chemin JSON. Isolé du chemin Markdown historique afin de
 * pouvoir être activé progressivement via `planConfig._outputFormat === "json"`
 * (contrainte : ne rien casser en prod tant que la Phase 1B client n'est pas
 * livrée).
 *
 * Émet un stream SSE avec des events nommés :
 *   - `chunk-progress` : { chunkIndex, totalChunks, status: "generating"|"done"|"retry" }
 *   - `chunk-json`     : PlanChunk JSON complet validé par Zod
 *   - `warning`        : { code, message } — non bloquant (compliance LCW…)
 *   - `plan-complete`  : { totalChunks, totalWeeks }
 *   - `error`          : { chunkIndex?, code, message, details? }
 *
 * L'orchestration multi-chunk (découpage, catalogues par phase, régénération)
 * suit la même logique que le chemin Markdown mais SANS parsing texte.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  buildUserPrompt,
  buildTerrainHardBanBlock,
  buildCanonicalRaceCard,
  buildStructuredDiagnosticBlock,
} from "./promptHelpers.ts";
import { getSystemPromptJSON } from "./systemPromptJSON.ts";
import {
  generateChunkJSON,
  ChunkGenerationError,
} from "./generateChunkJSON.ts";
import {
  extractCatalogIdsFromDump,
  type BuildPlanChunkSchemaOptions,
  type PlanChunk,
} from "./planSchema.ts";
import { mergePlanChunks, MergePlanError } from "./mergePlanChunks.ts";

const PRIMARY_MODEL = "google/gemini-3-flash-preview";

interface HandlerInput {
  apiKey: string;
  athleteData: any;
  planConfig: any;
  regenerateWeek?: {
    weekNumber: number;
    phase?: string;
    theme?: string;
    totalWeeks: number;
  } | null;
  workoutCatalog?: string;
  phaseCatalogs?: Record<string, string>;
  chunkCatalogs?: string[];
  catalogDurationStats?: any;
  corsHeaders: Record<string, string>;
}

function sseEvent(event: string, data: unknown): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function resolvePhaseCatalog(
  phase: string,
  phaseCatalogs: Record<string, string> | undefined,
  workoutCatalog: string | undefined,
): string {
  if (phaseCatalogs && typeof phaseCatalogs === "object") {
    const phaseMap: Record<string, string> = {
      "fondation": "base", "base": "base", "adaptation": "base",
      "build": "build", "chantier": "build", "consolidation": "build", "développement": "build",
      "spécifique": "peak", "peak": "peak", "race-specific": "peak", "compétition": "peak",
      "affûtage": "taper", "taper": "taper", "pre-race": "taper",
    };
    const key = phaseMap[phase.toLowerCase()] || "build";
    const c = phaseCatalogs[key];
    if (typeof c === "string" && c.length > 0) return c;
    for (const k of ["build", "base", "peak", "taper"]) {
      if (phaseCatalogs[k]) return phaseCatalogs[k];
    }
  }
  return (workoutCatalog && typeof workoutCatalog === "string") ? workoutCatalog : "";
}

/** Heuristique de phase basée sur la position dans le plan (fallback si pas de phaseCatalog). */
function inferPhaseFromWeek(weekStart: number, totalWeeks: number): string {
  const pct = weekStart / Math.max(totalWeeks, 1);
  if (pct <= 0.30) return "base";
  if (pct <= 0.70) return "build";
  if (pct <= 0.92) return "peak";
  return "taper";
}

export function handleJSONPlanRequest(input: HandlerInput): Response {
  const {
    apiKey, athleteData, planConfig, regenerateWeek,
    workoutCatalog, phaseCatalogs, chunkCatalogs, catalogDurationStats,
    corsHeaders,
  } = input;

  const systemPrompt = getSystemPromptJSON({
    sex: athleteData?.sex ?? planConfig?._athleteSex ?? null,
    age: athleteData?.age ?? null,
    objective: planConfig?.objective ?? null,
    expressFinisher: planConfig?._expressFinisher === true,
  });

  const totalWeeks = planConfig?.weeksAvailable || 12;
  const terrainHardBan = buildTerrainHardBanBlock(planConfig);
  const canonicalRaceCard = buildCanonicalRaceCard(athleteData, planConfig);
  const structuredDiagnostic = buildStructuredDiagnosticBlock(planConfig, totalWeeks);
  const baseUserPrompt = buildUserPrompt(athleteData, planConfig, catalogDurationStats);

  // Chunking : même heuristique que le chemin Markdown
  const obj = (planConfig?.objective || "").toUpperCase();
  const isTriVerbose = /IRON|IM\b|703|70\.3|TRIATHLON|TRI\b/i.test(obj);
  const isTrailVerbose = /TRAIL\s*(ULTRA|MOUNTAIN|MONT|UTMB|CCC|OCC|LONG)/i.test(obj)
    || (/TRAIL/i.test(obj) && totalWeeks >= 12);
  const CHUNK_SIZE = isTriVerbose ? 5 : isTrailVerbose ? 6 : 4;
  const chunkThreshold = isTriVerbose ? 6 : isTrailVerbose ? 8 : 6;
  const needsChunking = !regenerateWeek && totalWeeks > chunkThreshold;

  // Découpage
  interface ChunkSpec { start: number; end: number; }
  const chunks: ChunkSpec[] = [];
  if (regenerateWeek) {
    chunks.push({ start: regenerateWeek.weekNumber, end: regenerateWeek.weekNumber });
  } else if (needsChunking) {
    for (let s = 1; s <= totalWeeks; s += CHUNK_SIZE) {
      chunks.push({ start: s, end: Math.min(s + CHUNK_SIZE - 1, totalWeeks) });
    }
  } else {
    chunks.push({ start: 1, end: totalWeeks });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (event: string, data: unknown) => controller.enqueue(sseEvent(event, data));

      try {
        const collectedChunks: PlanChunk[] = [];
        const totalChunks = chunks.length;

        for (let ci = 0; ci < chunks.length; ci++) {
          const chunk = chunks[ci];
          const isFirst = ci === 0 && !regenerateWeek;
          const expectedWeekCount = chunk.end - chunk.start + 1;

          enqueue("chunk-progress", {
            chunkIndex: ci, totalChunks,
            status: "generating",
            weekRange: [chunk.start, chunk.end],
          });

          // Catalogue de ce chunk : priorité chunk-spécifique > phase-active
          const chunkSpecificCatalog = Array.isArray(chunkCatalogs)
            && typeof chunkCatalogs[ci] === "string"
            && chunkCatalogs[ci].length > 0
              ? chunkCatalogs[ci]
              : null;
          const activePhase = regenerateWeek?.phase
            ?? inferPhaseFromWeek(chunk.start, totalWeeks);
          const catalogDump = chunkSpecificCatalog
            ?? resolvePhaseCatalog(activePhase, phaseCatalogs, workoutCatalog);

          const allowedIds = extractCatalogIdsFromDump(catalogDump);
          if (allowedIds.length === 0) {
            console.warn(`[jsonPlanHandler] chunk=${ci} catalogue vide, custom-only autorisé.`);
          }

          // Construction du user prompt spécifique au chunk
          const weeksList = Array.from(
            { length: expectedWeekCount }, (_, i) => chunk.start + i,
          );
          const chunkHeader = regenerateWeek
            ? `Régénère UNIQUEMENT la semaine ${regenerateWeek.weekNumber} (phase ${regenerateWeek.phase ?? "?"}, thème "${regenerateWeek.theme ?? ""}") du plan de ${regenerateWeek.totalWeeks} semaines.`
            : isFirst
              ? `Génère les semaines ${chunk.start}-${chunk.end} sur ${totalWeeks} total. Inclus \`title\`, \`diagnostic\`, \`strategicRecap\` et \`phases\` couvrant l'INTÉGRALITÉ du plan de ${totalWeeks} semaines.`
              : `Génère UNIQUEMENT les semaines ${chunk.start}-${chunk.end} sur ${totalWeeks} total. Omets \`title\`/\`diagnostic\`/\`strategicRecap\`/\`phases\` (déjà produits au chunk 1).`;

          const userPrompt = [
            terrainHardBan || null,
            baseUserPrompt,
            catalogDump ? `\n${catalogDump}\n` : null,
            canonicalRaceCard,
            `\n📋 DIAGNOSTIC STRUCTURÉ (référence cohérence) :\n${structuredDiagnostic}`,
            `\n🎯 CIBLE CHUNK : ${chunkHeader}`,
            `\n📅 weekNumber attendus (obligatoire, sans trou ni doublon) : [${weeksList.join(", ")}]`,
            `\n🚨 PHASE ACTIVE ESTIMÉE : "${activePhase}"`,
          ].filter(Boolean).join("\n");

          const schemaOptions: BuildPlanChunkSchemaOptions = {
            expectedWeekCount,
            isFirstChunk: isFirst,
          };

          try {
            const { chunk: planChunk, usedRetry, finishReason } = await generateChunkJSON({
              apiKey,
              model: PRIMARY_MODEL,
              systemPrompt,
              userPrompt,
              allowedCatalogIds: allowedIds,
              chunkIndex: ci,
              schemaOptions,
              weekRange: { start: chunk.start, end: chunk.end },
              maxTokens: 65536,
            });
            collectedChunks.push(planChunk);

            if (usedRetry) {
              enqueue("chunk-progress", {
                chunkIndex: ci, totalChunks, status: "retry-succeeded",
              });
            }

            enqueue("chunk-json", { chunkIndex: ci, chunk: planChunk });
            enqueue("chunk-progress", {
              chunkIndex: ci, totalChunks, status: "done",
              finishReason,
            });
          } catch (e) {
            if (e instanceof ChunkGenerationError) {
              enqueue("error", {
                chunkIndex: ci,
                code: e.code,
                message: e.message,
                details: e.details,
              });
              controller.close();
              return;
            }
            throw e;
          }
        }

        // Merge déterministe côté serveur : validation continuité + dérivations
        const mergedTotal = regenerateWeek ? 1 : totalWeeks;
        try {
          const merged = mergePlanChunks(collectedChunks, mergedTotal);
          enqueue("plan-complete", {
            totalChunks,
            totalWeeks: merged.totalWeeks,
            weeksProduced: merged.weeks.length,
          });
        } catch (e) {
          if (e instanceof MergePlanError) {
            enqueue("error", {
              code: e.code,
              message: e.message,
            });
          } else {
            throw e;
          }
        }

        controller.close();
      } catch (e) {
        console.error("[jsonPlanHandler] fatal:", e);
        try {
          controller.enqueue(sseEvent("error", {
            code: "FATAL",
            message: e instanceof Error ? e.message : "Unknown error",
          }));
        } catch { /* ignore */ }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Plan-Output-Format": "json",
    },
  });
}
