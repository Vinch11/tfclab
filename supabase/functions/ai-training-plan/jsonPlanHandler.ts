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
  firstTrailCriticalMarker,
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
  /** PHASE 2A.1 (task C) — nom exact du marqueur regex qui a déclenché. */
  matchedMarker: string | null;
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

// ─── Classification d'intensité (raffinement guard Phase 1C-A) ──────────────
// Objectif : une séance "90min Z2 endurance" ne peut pas être substituée par
// un Special Block Canova VO2/lactate. On classifie session + candidat via
// zones + vocabulaire details, et on filtre par classe identique.
type IntensityClass = "endurance" | "tempo_threshold" | "vo2_intensity" | "recovery" | "race_sim" | "unknown";

function classifyIntensity(zones: string[] | undefined, text: string): IntensityClass {
  const t = (text || "").toLowerCase();
  const zonesU = (zones || []).map(z => (z || "").toUpperCase());
  if (/race[- ]?sim|simulation.*course|race.?pace|allure.?course|sp[eé]cifique.?course/.test(t)) return "race_sim";
  if (zonesU.some(z => /Z[567]/.test(z)) || /\bvo2\b|vma\b|30\/30|15\/15|40\/20|special block|canova/.test(t)) return "vo2_intensity";
  if (zonesU.some(z => /Z[34]/.test(z)) || /seuil|threshold|tempo|sweet.?spot|lactate|shuttle|ftp\b/.test(t)) return "tempo_threshold";
  if (/r[eé]cup|recovery|regen|regeneration/.test(t) || (zonesU.length > 0 && zonesU.every(z => /Z1\b/.test(z)))) return "recovery";
  if (zonesU.some(z => /Z2/.test(z)) || /endurance|z1.?z2|fondamental|foncier|\bsl\b|sortie longue|long run|long ride|EF\b|aerobic/.test(t)) return "endurance";
  return "unknown";
}

function rankCandidatesBySport(candidates: CatalogCandidate[], sport: NormalizedSport, durationMin: number) {
  const target = Number.isFinite(durationMin) && durationMin > 0 ? durationMin : 0;
  const sameSport = candidates.filter(c => c.sport === sport);
  const ranked = sameSport
    .map(c => ({ c, delta: Math.abs(c.durationMedian - target) }))
    .sort((a, b) => a.delta - b.delta || a.c.durationMedian - b.c.durationMedian);
  return { sameSport, ranked };
}

function findCatalogCandidateForSport(
  candidates: CatalogCandidate[],
  sport: NormalizedSport,
  durationMin: number,
  requiredClass?: IntensityClass,
): { candidate: CatalogCandidate | null; delta: number } {
  const { ranked } = rankCandidatesBySport(candidates, sport, durationMin);
  const tolerance = computeToleranceMin(durationMin);
  // Filtre intensité : on n'accepte que même classe. "unknown" = joker (compat).
  const viable = ranked.find(x => {
    if (x.delta > tolerance) return false;
    if (!requiredClass || requiredClass === "unknown") return true;
    const candClass = classifyIntensity(x.c.zones, `${x.c.title} ${x.c.structure}`);
    if (candClass === "unknown") return true;
    return candClass === requiredClass;
  });
  return viable ? { candidate: viable.c, delta: viable.delta } : { candidate: null, delta: -1 };
}

// TODO Phase 2 — Terrain-aware relaxation
// Lorsque le profil athlète déclarera `terrainAvailability` (accès D+/massif/etc.),
// ce guard devra consommer le profil pour relâcher les règles vocabulaire D+ vélo
// (et éventuellement run/brick) pour ces athlètes : ne pas substituer une séance
// custom "4h vélo en massif" si l'athlète a un terrain vallonné confirmé.
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
        const scanText = `${session.title ?? ""} ${session.details ?? ""}`;
        const matchedMarker = firstTrailCriticalMarker(scanText);
        if (!matchedMarker) continue;
        const targetDur = session.durationMin ?? 0;
        const sessionSport = normalizeSport(session.sport);
        const tolerance = computeToleranceMin(targetDur);
        const requiredClass = classifyIntensity(
          session.zones,
          `${session.title ?? ""} ${session.details ?? ""}`,
        );

        // Substitution primaire same-sport + same intensity class
        let result = findCatalogCandidateForSport(candidates, sessionSport, targetDur, requiredClass);
        let attemptedSport = sessionSport;
        let brickFallback = false;

        // Brick → fallback bike si aucun candidat brick (même classe)
        if (!result.candidate && sessionSport === "brick") {
          result = findCatalogCandidateForSport(candidates, "bike", targetDur, requiredClass);
          if (result.candidate) {
            attemptedSport = "bike";
            brickFallback = true;
          }
        }

        const { ranked, sameSport } = rankCandidatesBySport(candidates, attemptedSport, targetDur);
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

        if (!result.candidate) {
          const nearestStr = nearest3.length > 0
            ? nearest3.map(n => {
                const cls = classifyIntensity(
                  candidates.find(c => c.id === n.id)?.zones,
                  `${candidates.find(c => c.id === n.id)?.title ?? ""} ${candidates.find(c => c.id === n.id)?.structure ?? ""}`,
                );
                return `${n.id}(median=${n.durationMedian}min,Δ=${n.deltaMin}min,class=${cls})`;
              }).join(", ")
            : "aucun";
          repairs.push({
            code: "offsport_unresolved",
            severity: "critical",
            chunkIndex: ci,
            weekNumber: week.weekNumber,
            day: session.day,
            sport: session.sport,
            before,
            reason: `no catalog candidate within ±${tolerance}min AND same intensity class="${requiredClass}" (sport=${sessionSport}, target=${targetDur}min, sameSportCandidates=${sameSport.length}/${candidates.length}, nearest=[${nearestStr}], matchedMarker=${matchedMarker})`,
            matchedMarker,
            sameSportCandidatesInChunk: sameSport.length,
            totalCandidatesInChunk: candidates.length,
            nearestCandidates: nearest3,
            targetDurationMin: targetDur,
          });
          continue;
        }

        const candidate = result.candidate;
        const delta = result.delta;
        const nextDuration = Math.max(candidate.durationMin[0], Math.min(candidate.durationMin[1], targetDur || candidate.durationMedian));
        const mutable = session as PlanSession;
        mutable.title = candidate.title;
        mutable.details = `${candidate.structure || candidate.title}. [ID: ${candidate.id}]`;
        mutable.catalogId = candidate.id;
        mutable.custom = false;
        if (brickFallback) {
          (mutable as any).sport = "bike";
        }
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
          reason: `custom trail vocabulary → ${brickFallback ? "brick→bike fallback" : "same-sport"} catalog substitution (sport=${sessionSport}${brickFallback ? "→bike" : ""}, target=${targetDur}min, tolerance=±${tolerance}min, Δ=${delta}min, sameSportCandidates=${sameSport.length}/${candidates.length}, matchedMarker=${matchedMarker})`,
          matchedMarker,
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

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2A.2 — Enforcement SL déterministe (post-guard, pré-merge final)
// Si une semaine load/recovery n'a AUCUNE séance du sport concerné ≥ plancher
// SL, on prend la séance la plus longue de ce sport dans la semaine et on la
// SUBSTITUE par une séance catalogue même sport, classe endurance, durée
// ≥ plancher. Aucun candidat → on ne fait rien (le critical quota_floor_violation
// reste). JAMAIS d'allongement artificiel d'une séance existante.
// ─────────────────────────────────────────────────────────────────────────────
interface SLUpgradeRepair {
  code: "sl_upgraded" | "sl_upgrade_unresolved";
  severity: "warning" | "critical";
  chunkIndex: number;
  weekNumber: number;
  weekType: string;
  sport: "bike" | "run";
  floorMin: number;
  before: { day: string; title: string; durationMin: number; catalogId: string | null };
  after?: { day: string; title: string; catalogId: string; durationMin: number };
  reason: string;
}

interface SLWeekFloor {
  weekType: "load" | "recovery" | "taper" | "race";
  longRideWeekly?: boolean;
  longRunWeekly?: boolean;
  slLongRideMin?: number;
  slLongRunMin?: number;
}

function applySLFloorEnforcement(
  chunks: PlanChunk[],
  weeklyQuotas: Record<number, SLWeekFloor> | undefined | null,
  catalogDumpsByChunk: Array<string | null | undefined>,
): { chunks: PlanChunk[]; repairs: SLUpgradeRepair[] } {
  const repairs: SLUpgradeRepair[] = [];
  if (!weeklyQuotas || typeof weeklyQuotas !== "object") return { chunks, repairs };
  const candidatesByChunk = catalogDumpsByChunk.map(parseCatalogCandidatesFromDump);

  chunks.forEach((chunk, ci) => {
    const candidates = candidatesByChunk[ci] ?? [];
    for (const week of chunk.weeks ?? []) {
      const entry = weeklyQuotas[week.weekNumber];
      if (!entry) continue;
      if (entry.weekType === "taper" || entry.weekType === "race") continue;

      const specs: Array<{ sport: "bike" | "run"; required: boolean; floor: number }> = [
        { sport: "bike", required: !!entry.longRideWeekly, floor: entry.slLongRideMin ?? 0 },
        { sport: "run",  required: !!entry.longRunWeekly,  floor: entry.slLongRunMin  ?? 0 },
      ];

      for (const spec of specs) {
        if (!spec.required || spec.floor <= 0) continue;
        const sameSport = (week.sessions ?? []).filter(s => s.sport === spec.sport);
        const alreadyMeetsFloor = sameSport.some(s => (s.durationMin ?? 0) >= spec.floor);
        if (alreadyMeetsFloor) continue;
        if (sameSport.length === 0) continue; // pas de séance à upgrader → critical restera

        // Séance la plus longue = candidate à substituer
        const target = sameSport.reduce((a, b) => (a.durationMin ?? 0) >= (b.durationMin ?? 0) ? a : b);

        // Cherche dans le catalogue une séance endurance/SL même sport ≥ plancher
        const endurance = candidates
          .filter(c => c.sport === spec.sport)
          .map(c => ({ c, cls: classifyIntensity(c.zones, `${c.title} ${c.structure}`) }))
          .filter(x => x.cls === "endurance" || x.cls === "recovery")
          .filter(x => x.c.durationMin[1] >= spec.floor || x.c.durationMedian >= spec.floor)
          .sort((a, b) => a.c.durationMedian - b.c.durationMedian);

        // Prend la première ≥ plancher (durée médiane la plus proche du plancher).
        const picked = endurance.find(x => x.c.durationMedian >= spec.floor) ?? endurance[0];

        if (!picked) {
          repairs.push({
            code: "sl_upgrade_unresolved",
            severity: "critical",
            chunkIndex: ci, weekNumber: week.weekNumber, weekType: entry.weekType,
            sport: spec.sport, floorMin: spec.floor,
            before: {
              day: target.day, title: target.title ?? "",
              durationMin: target.durationMin ?? 0,
              catalogId: (target as any).catalogId ?? null,
            },
            reason: `no endurance/SL ${spec.sport} catalog candidate ≥ ${spec.floor}min (candidates=${candidates.filter(c => c.sport === spec.sport).length})`,
          });
          continue;
        }

        const cand = picked.c;
        const newDur = Math.max(
          spec.floor,
          Math.min(cand.durationMin[1], Math.max(cand.durationMin[0], target.durationMin ?? cand.durationMedian)),
        );
        const before = {
          day: target.day, title: target.title ?? "",
          durationMin: target.durationMin ?? 0,
          catalogId: (target as any).catalogId ?? null,
        };
        const mut = target as PlanSession;
        mut.title = cand.title;
        mut.details = `${cand.structure || cand.title}. [ID: ${cand.id}]`;
        (mut as any).catalogId = cand.id;
        (mut as any).custom = false;
        mut.durationMin = newDur;
        mut.zones = cand.zones;
        (mut as any).isKeySession = true;

        repairs.push({
          code: "sl_upgraded",
          severity: "warning",
          chunkIndex: ci, weekNumber: week.weekNumber, weekType: entry.weekType,
          sport: spec.sport, floorMin: spec.floor,
          before,
          after: { day: mut.day, title: mut.title, catalogId: cand.id, durationMin: newDur },
          reason: `SL ${spec.sport} floor ${spec.floor}min not met (longest ${before.durationMin}min) → substituted by ${cand.id} (${newDur}min)`,
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

          // PHASE 2A — bloc quotas hebdo pré-calculé côté client
          const quotasBlockByChunk = Array.isArray(planConfig?._weeklyQuotasPromptByChunk)
            ? planConfig._weeklyQuotasPromptByChunk
            : [];
          const quotasBlock = typeof quotasBlockByChunk[ci] === "string" && quotasBlockByChunk[ci].length > 0
            ? quotasBlockByChunk[ci]
            : null;

          const userPrompt = [
            terrainHardBan || null,
            baseUserPrompt,
            quotasBlock ? `\n${quotasBlock}\n` : null,
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
              ? `S${repair.weekNumber} ${repair.day}: custom trail marker "${repair.matchedMarker}" substituted by ${repair.after?.catalogId}`
              : `S${repair.weekNumber} ${repair.day}: custom trail marker "${repair.matchedMarker}" unresolved (no same-sport catalogue candidate ±15min)`;
            console.warn(`[B3 offsport guard] ${repair.code}: ${msg}`, repair);
            enqueue("warning", {
              code: repair.code,
              severity: repair.severity,
              message: msg,
              repair,
            });
          }

          // PHASE 2A.2 — Enforcement SL déterministe (post-guard, avant merge final)
          const slEnforce = applySLFloorEnforcement(
            guard.chunks,
            planConfig?._weeklyQuotas ?? null,
            catalogDumpsByChunk,
          );
          for (const repair of slEnforce.repairs) {
            const msg = repair.code === "sl_upgraded"
              ? `S${repair.weekNumber} ${repair.sport} SL floor ${repair.floorMin}min not met (max ${repair.before.durationMin}min) → ${repair.after?.catalogId} (${repair.after?.durationMin}min)`
              : `S${repair.weekNumber} ${repair.sport} SL floor ${repair.floorMin}min unresolved (no endurance catalog candidate)`;
            console.warn(`[SL floor enforce] ${repair.code}: ${msg}`, repair);
            enqueue("warning", {
              code: repair.code,
              severity: repair.severity,
              message: msg,
              repair,
            });
          }

          const merged = mergePlanChunks(slEnforce.chunks, mergedTotal);
          for (let ci = 0; ci < slEnforce.chunks.length; ci++) {
            enqueue("chunk-json", { chunkIndex: ci, chunk: slEnforce.chunks[ci] });
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
