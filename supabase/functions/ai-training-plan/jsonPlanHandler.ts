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
  TRAIL_DETAILS_CRITICAL_RX,
  type BuildPlanChunkSchemaOptions,
  type PlanChunk,
  type PlanSession,
} from "./planSchema.ts";
import { mergePlanChunks, MergePlanError } from "./mergePlanChunks.ts";

const PRIMARY_MODEL = "google/gemini-3-flash-preview";

type NormalizedSport = "swim" | "bike" | "run" | "brick" | "strength" | "recovery" | "rest" | "mixed" | "trail" | "unknown";

interface CatalogCandidate {
  id: string;
  sport: NormalizedSport;
  title: string;
  durationMin: [number, number];
  durationMedian: number;
  structure: string;
  zones: string[];
}

interface OffsportNearestCandidate {
  id: string;
  durationMedian: number;
  durationMin: [number, number];
  deltaMin: number;
}
interface OffsportTrailRepair {
  code: "substituted_offsport" | "offsport_unresolved";
  severity: "warning" | "critical";
  chunkIndex: number;
  weekNumber: number;
  day: string;
  sport: string;
  before: { title: string; details: string; durationMin: number };
  after?: { title: string; catalogId: string; durationMin: number; deltaMin: number };
  reason: string;
  sameSportCandidatesInChunk: number;
  totalCandidatesInChunk: number;
  nearestCandidates: OffsportNearestCandidate[];
  targetDurationMin: number;
}

function normalizeSport(raw: unknown): NormalizedSport {
  const s = String(raw ?? "").trim().toLowerCase();
  if (["run", "course", "cap", "course à pied", "course a pied"].includes(s)) return "run";
  if (["bike", "vélo", "velo", "cyclisme"].includes(s)) return "bike";
  if (["swim", "natation", "nat"].includes(s)) return "swim";
  if (["brick", "brique", "enchaînement", "enchainement"].includes(s)) return "brick";
  if (["strength", "renfo", "renforcement", "ppg", "force"].includes(s)) return "strength";
  if (["recovery", "récup", "recup", "récupération", "recuperation"].includes(s)) return "recovery";
  if (["rest", "repos", "off"].includes(s)) return "rest";
  if (s.includes("trail")) return "trail";
  if (s.includes("mix")) return "mixed";
  return "unknown";
}

function isTrailObjective(objective: string | null | undefined): boolean {
  const obj = String(objective ?? "").toLowerCase();
  return obj.includes("trail") || obj.includes("utmb") || obj.includes("ccc") || obj.includes("occ") ||
    (obj.includes("ultra") && !obj.includes("ironman"));
}

function sportFromHeader(line: string): NormalizedSport | null {
  const l = line.toLowerCase();
  if (!line.trim().startsWith("####")) return null;
  if (l.includes("course") || l.includes("pied") || l.includes("🏃")) return "run";
  if (l.includes("vélo") || l.includes("velo") || l.includes("cycl") || l.includes("🚴")) return "bike";
  if (l.includes("natation") || l.includes("swim") || l.includes("🏊")) return "swim";
  if (l.includes("brick") || l.includes("brique") || l.includes("🔁")) return "brick";
  if (l.includes("renfo") || l.includes("mobilité") || l.includes("mobilite") || l.includes("💪")) return "strength";
  if (l.includes("trail") || l.includes("⛰")) return "trail";
  if (l.includes("mixte") || l.includes("mixed")) return "mixed";
  return null;
}

function parseDurationRange(raw: string): [number, number] | null {
  const range = raw.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && a >= 0 && b >= a) return [a, b];
  }
  const single = raw.match(/\b(\d{1,3})\b/);
  if (single) {
    const n = Number(single[1]);
    if (Number.isFinite(n) && n >= 0) return [n, n];
  }
  return null;
}

function extractZones(structure: string): string[] {
  const zones = new Set<string>();
  for (const m of structure.matchAll(/\[([^\]]+)\]/g)) {
    for (const z of m[1].split(/[,;/]/).map(x => x.trim()).filter(Boolean)) zones.add(z);
  }
  return Array.from(zones);
}

function parseCatalogCandidatesFromDump(dump: string | null | undefined): CatalogCandidate[] {
  if (!dump) return [];
  const out: CatalogCandidate[] = [];
  let currentSport: NormalizedSport = "unknown";
  let hasDPlusColumn = false;
  for (const line of dump.split("\n")) {
    const headerSport = sportFromHeader(line);
    if (headerSport) { currentSport = headerSport; continue; }
    if (/^\|\s*ID\s*\|/i.test(line)) { hasDPlusColumn = /D\+\s*cible/i.test(line); continue; }
    if (!/^\|\s*[A-Z][A-Z0-9_]+\s*\|/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map(c => c.trim());
    const id = cells[0];
    if (!id || id === "ID") continue;
    const duration = parseDurationRange(cells[4] || "");
    if (!duration) continue;
    const structure = cells.slice(hasDPlusColumn ? 6 : 5).join(" | ").trim();
    out.push({
      id,
      sport: currentSport,
      title: cells[2] || id,
      durationMin: duration,
      durationMedian: Math.round((duration[0] + duration[1]) / 2),
      structure,
      zones: extractZones(structure),
    });
  }
  return out;
}

// Tolerance = max(±15min, ±20% target duration). Le +20% est indispensable
// pour les sorties longues 3-4h où ±15min est structurellement introuvable.
function computeToleranceMin(targetDur: number): number {
  return Math.max(15, Math.round((targetDur || 0) * 0.20));
}

function rankCandidatesBySport(candidates: CatalogCandidate[], sport: NormalizedSport, durationMin: number) {
  const target = Number.isFinite(durationMin) && durationMin > 0 ? durationMin : 0;
  const sameSport = candidates.filter(c => c.sport === sport);
  const ranked = sameSport
    .map(c => ({ c, delta: Math.abs(c.durationMedian - target) }))
    .sort((a, b) => a.delta - b.delta || a.c.durationMedian - b.c.durationMedian);
  return { sameSport, ranked };
}

function findCatalogCandidateForSport(candidates: CatalogCandidate[], sport: NormalizedSport, durationMin: number): { candidate: CatalogCandidate | null; delta: number } {
  const { ranked } = rankCandidatesBySport(candidates, sport, durationMin);
  const tolerance = computeToleranceMin(durationMin);
  const viable = ranked.find(x => x.delta <= tolerance);
  return viable ? { candidate: viable.c, delta: viable.delta } : { candidate: null, delta: -1 };
}

function applyOffsportTrailGuardToChunks(
  chunks: PlanChunk[],
  objective: string | null | undefined,
  catalogDumpsByChunk: Array<string | null | undefined>,
): { chunks: PlanChunk[]; repairs: OffsportTrailRepair[] } {
  if (isTrailObjective(objective)) return { chunks, repairs: [] };
  const repairs: OffsportTrailRepair[] = [];
  const candidatesByChunk = catalogDumpsByChunk.map(parseCatalogCandidatesFromDump);
  chunks.forEach((chunk, ci) => {
    const candidates = candidatesByChunk[ci] ?? [];
    for (const week of chunk.weeks ?? []) {
      for (const session of week.sessions ?? []) {
        if (session.custom !== true || session.sport === "rest") continue;
        if (!TRAIL_DETAILS_CRITICAL_RX.test(`${session.title ?? ""} ${session.details ?? ""}`)) continue;
        const targetDur = session.durationMin ?? 0;
        const { ranked, sameSport } = rankCandidatesBySport(candidates, session.sport, targetDur);
        const nearest3: OffsportNearestCandidate[] = ranked.slice(0, 3).map(x => ({
          id: x.c.id,
          durationMedian: x.c.durationMedian,
          durationMin: x.c.durationMin,
          deltaMin: x.delta,
        }));
        const before = {
          title: session.title ?? "",
          details: session.details ?? "",
          durationMin: targetDur,
        };
        const { candidate, delta } = findCatalogCandidate(candidates, session.sport, targetDur);
        if (!candidate) {
          const nearestStr = nearest3.length > 0
            ? nearest3.map(n => `${n.id}(median=${n.durationMedian}min,Δ=${n.deltaMin}min)`).join(", ")
            : "aucun";
          repairs.push({
            code: "offsport_unresolved",
            severity: "critical",
            chunkIndex: ci,
            weekNumber: week.weekNumber,
            day: session.day,
            sport: session.sport,
            before,
            reason: `no same-sport catalog candidate within ±15min (sport=${normalizeSport(session.sport)}, target=${targetDur}min, sameSportCandidates=${sameSport.length}/${candidates.length}, nearest=[${nearestStr}])`,
            sameSportCandidatesInChunk: sameSport.length,
            totalCandidatesInChunk: candidates.length,
            nearestCandidates: nearest3,
            targetDurationMin: targetDur,
          });
          continue;
        }
        const nextDuration = Math.max(candidate.durationMin[0], Math.min(candidate.durationMin[1], targetDur || candidate.durationMedian));
        const mutable = session as PlanSession;
        mutable.title = candidate.title;
        mutable.details = `${candidate.structure || candidate.title}. [ID: ${candidate.id}]`;
        mutable.catalogId = candidate.id;
        mutable.custom = false;
        mutable.durationMin = nextDuration;
        mutable.zones = candidate.zones;
        repairs.push({
          code: "substituted_offsport",
          severity: "warning",
          chunkIndex: ci,
          weekNumber: week.weekNumber,
          day: session.day,
          sport: session.sport,
          before,
          after: { title: mutable.title, catalogId: candidate.id, durationMin: nextDuration, deltaMin: delta },
          reason: `custom trail vocabulary → same-sport catalog substitution (sport=${normalizeSport(session.sport)}, target=${targetDur}min, Δ=${delta}min, sameSportCandidates=${sameSport.length}/${candidates.length})`,
          sameSportCandidatesInChunk: sameSport.length,
          totalCandidatesInChunk: candidates.length,
          nearestCandidates: nearest3,
          targetDurationMin: targetDur,
        });
      }
    }
  });
  return { chunks, repairs };
}

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
        const catalogDumpsByChunk: string[] = [];
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
          catalogDumpsByChunk[ci] = catalogDump;

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
          mergePlanChunks(collectedChunks, mergedTotal);

          const guard = applyOffsportTrailGuardToChunks(
            collectedChunks,
            planConfig?.objective ?? null,
            catalogDumpsByChunk,
          );
          for (const repair of guard.repairs) {
            const msg = repair.code === "substituted_offsport"
              ? `S${repair.weekNumber} ${repair.day}: custom trail marker substituted by ${repair.after?.catalogId}`
              : `S${repair.weekNumber} ${repair.day}: custom trail marker unresolved (no same-sport catalogue candidate ±15min)`;
            console.warn(`[B3 offsport guard] ${repair.code}: ${msg}`, repair);
            enqueue("warning", {
              code: repair.code,
              severity: repair.severity,
              message: msg,
              repair,
            });
          }

          const merged = mergePlanChunks(guard.chunks, mergedTotal);
          for (let ci = 0; ci < guard.chunks.length; ci++) {
            enqueue("chunk-json", { chunkIndex: ci, chunk: guard.chunks[ci] });
          }
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
