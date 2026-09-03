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
import { extractLimiterKeywords, normalizeObjKey } from "./sportRatioMatrix.ts";
import { buildAthleteConstraintsBlock } from "./constraintsBlock.ts";
import {
  generateChunkJSON,
  ChunkGenerationError,
  __trailDebug,
} from "./generateChunkJSON.ts";
import {
  extractCatalogIdsFromDump,
  TRAIL_DETAILS_CRITICAL_RX,
  firstTrailCriticalMarker,
  type BuildPlanChunkSchemaOptions,
  type PlanChunk,
  type PlanSession,
} from "./planSchema.ts";
import { isTrailCatalogId } from "./trailMarkers.ts";
import { mergePlanChunks, MergePlanError } from "./mergePlanChunks.ts";
import { applyValueCheck } from "./valueCheck.ts";
import { detectLcwFromConfig, buildLcwSignatureReminder, computeLcwChunkSize } from "./lcwSignatureReminder.ts";

const PRIMARY_MODEL = "google/gemini-3.7-flash";

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
        if (session.sport === "rest") continue;
        const sess = session as Record<string, unknown>;
        const scanText = `${session.title ?? ""} ${session.details ?? ""}`;
        // Déclencheurs trail (union) :
        //  1. flag posé par la coercion (tâche 4)
        //  2. catalogId trail survivant (défense en profondeur, source unique)
        //  3. contenu trail dans une séance custom (comportement historique)
        const flaggedTrail = sess.__offsportTrail === true;
        const survivingTrailId =
          typeof session.catalogId === "string" && isTrailCatalogId(session.catalogId);
        const contentMarker =
          session.custom === true ? firstTrailCriticalMarker(scanText) : null;
        const matchedMarker =
          flaggedTrail ? "__offsportTrail_flag"
          : survivingTrailId ? session.catalogId as string
          : contentMarker;
        // On retire le flag transitoire quoi qu'il arrive (ne doit pas fuiter).
        if ("__offsportTrail" in sess) delete sess.__offsportTrail;
        if (!matchedMarker) continue;
        // Force custom pour la substitution (un catalogId trail survivant devient custom).
        if (survivingTrailId) {
          session.custom = true;
          session.catalogId = null;
        }
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
  weekType?: "load" | "recovery" | "taper" | "race" | string;
  longRideWeekly?: boolean;
  longRunWeekly?: boolean;
  slLongRideMin?: number;
  slLongRunMin?: number;
  // Client transporte les planchers sous .floors ; on tolère les deux formes.
  floors?: {
    longRideWeekly?: boolean;
    longRunWeekly?: boolean;
    slLongRideMin?: number;
    slLongRunMin?: number;
  };
}

/**
 * Normalise l'entrée quota client (soit top-level, soit sous .floors) en un
 * objet plat consommable par l'enforcement. Retourne null si vide.
 */
function resolveSLFloor(entry: SLWeekFloor | undefined | null): {
  weekType: string;
  longRideWeekly: boolean;
  longRunWeekly: boolean;
  slLongRideMin: number;
  slLongRunMin: number;
} | null {
  if (!entry) return null;
  const f = entry.floors ?? {};
  return {
    weekType: String(entry.weekType ?? "load"),
    longRideWeekly: !!(entry.longRideWeekly ?? f.longRideWeekly),
    longRunWeekly: !!(entry.longRunWeekly ?? f.longRunWeekly),
    slLongRideMin: Number(entry.slLongRideMin ?? f.slLongRideMin ?? 0),
    slLongRunMin: Number(entry.slLongRunMin ?? f.slLongRunMin ?? 0),
  };
}

function applySLFloorEnforcement(
  chunks: PlanChunk[],
  weeklyQuotas: Record<number, SLWeekFloor> | undefined | null,
  catalogDumpsByChunk: Array<string | null | undefined>,
): { chunks: PlanChunk[]; repairs: SLUpgradeRepair[]; traces: string[] } {
  const repairs: SLUpgradeRepair[] = [];
  const traces: string[] = [];
  if (!weeklyQuotas || typeof weeklyQuotas !== "object") {
    traces.push(`[SL_FLOOR] skipped_reason=no_weekly_quotas_payload`);
    return { chunks, repairs, traces };
  }
  const candidatesByChunk = catalogDumpsByChunk.map(parseCatalogCandidatesFromDump);

  chunks.forEach((chunk, ci) => {
    const candidates = candidatesByChunk[ci] ?? [];
    for (const week of chunk.weeks ?? []) {
      // Lookup PAR weekNumber (pas par index — chunk 2 commence à W6).
      const rawEntry = weeklyQuotas[week.weekNumber];
      const entry = resolveSLFloor(rawEntry);
      if (!entry) {
        traces.push(`[SL_FLOOR] S${week.weekNumber} action=skipped_reason=no_quota_entry`);
        continue;
      }
      if (entry.weekType === "taper" || entry.weekType === "race") {
        traces.push(`[SL_FLOOR] S${week.weekNumber} (${entry.weekType}) action=skipped_reason=weekType_${entry.weekType}`);
        continue;
      }

      const specs: Array<{ sport: "bike" | "run"; required: boolean; floor: number }> = [
        { sport: "bike", required: entry.longRideWeekly, floor: entry.slLongRideMin },
        { sport: "run",  required: entry.longRunWeekly,  floor: entry.slLongRunMin  },
      ];

      for (const spec of specs) {
        if (!spec.required || spec.floor <= 0) {
          traces.push(`[SL_FLOOR] S${week.weekNumber} (${entry.weekType}) sport=${spec.sport} floor=${spec.floor}min required=${spec.required} action=skipped_reason=floor_disabled`);
          continue;
        }
        const sameSport = (week.sessions ?? []).filter(s => s.sport === spec.sport);
        const longest = sameSport.reduce((m, s) => Math.max(m, s.durationMin ?? 0), 0);
        // PHASE 2A.4 — un brick ≥ floor+20 satisfait le floor SL vélo.
        if (spec.sport === "bike") {
          const brickThreshold = spec.floor + 20;
          const longestBrick = (week.sessions ?? [])
            .filter(s => s.sport === "brick")
            .reduce((m, s) => Math.max(m, s.durationMin ?? 0), 0);
          if (longestBrick >= brickThreshold) {
            traces.push(`[SL_FLOOR] S${week.weekNumber} (${entry.weekType}) sport=bike floor=${spec.floor}min brick=${longestBrick}min≥${brickThreshold} action=none_brick_satisfies_SL`);
            continue;
          }
        }
        const alreadyMeetsFloor = longest >= spec.floor;
        if (alreadyMeetsFloor) {
          traces.push(`[SL_FLOOR] S${week.weekNumber} (${entry.weekType}) sport=${spec.sport} floor=${spec.floor}min longest=${longest}min action=none_conforme`);
          continue;
        }
        if (sameSport.length === 0) {
          traces.push(`[SL_FLOOR] S${week.weekNumber} (${entry.weekType}) sport=${spec.sport} floor=${spec.floor}min longest=0min action=skipped_reason=no_same_sport_session`);
          continue;
        }

        const target = sameSport.reduce((a, b) => (a.durationMin ?? 0) >= (b.durationMin ?? 0) ? a : b);

        const endurance = candidates
          .filter(c => c.sport === spec.sport)
          .map(c => ({ c, cls: classifyIntensity(c.zones, `${c.title} ${c.structure}`) }))
          .filter(x => x.cls === "endurance" || x.cls === "recovery")
          .filter(x => x.c.durationMin[1] >= spec.floor || x.c.durationMedian >= spec.floor)
          .sort((a, b) => a.c.durationMedian - b.c.durationMedian);

        const picked = endurance.find(x => x.c.durationMedian >= spec.floor) ?? endurance[0];

        if (!picked) {
          traces.push(`[SL_FLOOR] S${week.weekNumber} (${entry.weekType}) sport=${spec.sport} floor=${spec.floor}min longest=${longest}min action=unresolved (no catalog cand)`);
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

        traces.push(`[SL_FLOOR] S${week.weekNumber} (${entry.weekType}) sport=${spec.sport} floor=${spec.floor}min longest=${longest}min action=upgraded → ${cand.id} (${newDur}min)`);
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
  return { chunks, repairs, traces };
}


// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2A.3 — Réconciliateur post-merge (rebalance + insert)
// ─────────────────────────────────────────────────────────────────────────────
type ReconcilerRepairCode = "day_rebalanced" | "session_inserted" | "insert_unresolved" | "rest_floor_breached"
  | "duplicate_catalog_id_replaced" | "duplicate_catalog_id_unresolved";
interface ReconcilerRepair {
  code: ReconcilerRepairCode;
  severity: "warning" | "critical";
  chunkIndex: number;
  weekNumber: number;
  sport?: string;
  fromDay?: string;
  toDay?: string;
  session?: { title: string; catalogId: string | null; durationMin: number };
  reason: string;
}

const DAY_ORDER_FR = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"] as const;
type DayLower = typeof DAY_ORDER_FR[number];
function canonDay(d: string): DayLower | null {
  const l = String(d ?? "").trim().toLocaleLowerCase("fr-FR")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const idx = DAY_ORDER_FR.indexOf(l as DayLower);
  return idx >= 0 ? (l as DayLower) : null;
}

interface WeeklyQuotaEntry {
  quota: {
    swim: { min: number; max: number };
    bike: { min: number; max: number };
    run: { min: number; max: number };
    brick: { min: number; max: number };
    strength: { min: number; max: number };
    totalSessions: { min: number; max: number };
    maxSessionsPerDay: number;
    minFullRestDays: number;
  };
  floors: {
    slLongRideMin?: number;
    slLongRunMin?: number;
    longRideWeekly?: boolean;
    longRunWeekly?: boolean;
  };
  weekType: "load" | "recovery" | "taper" | "race" | string;
  layout?: {
    days: Array<{ dayName: string; isRest: boolean; slots: Array<{ sport: string; isLongSession?: boolean }> }>;
  };
}

/** Priorité de déplacement (bas = déplace en premier). null = INTOUCHABLE. */
function movePriority(
  s: PlanSession,
  floors: WeeklyQuotaEntry["floors"] | undefined,
): number | null {
  if ((s as any).isKeySession === true) return null;
  if (s.sport === "brick" || s.sport === "rest") return null;
  const dur = (s.durationMin ?? 0);
  if (s.sport === "bike" && floors?.slLongRideMin && dur >= floors.slLongRideMin) return null;
  if (s.sport === "run"  && floors?.slLongRunMin  && dur >= floors.slLongRunMin ) return null;
  if (s.sport === "strength") return 1;
  if (s.sport === "recovery") return 2;
  if ((s.sport === "run" || s.sport === "bike") && dur > 0 && dur < 60) return 3;
  return null; // long sessions ou key non tagué : ne pas déplacer
}

/** Cherche jour cible pour un sport donné selon le layout, sinon jour libre le plus proche. */
/** Nombre de jours (0-7) sans aucune séance dans la semaine courante. */
function countEmptyDays(week: PlanChunk["weeks"][number]): number {
  const countsByDay = new Map<DayLower, number>();
  for (const d of DAY_ORDER_FR) countsByDay.set(d, 0);
  for (const s of week.sessions ?? []) {
    const c = canonDay(s.day);
    if (c) countsByDay.set(c, (countsByDay.get(c) ?? 0) + 1);
  }
  return Array.from(countsByDay.values()).filter(n => n === 0).length;
}

function findTargetDay(
  sport: string,
  fromDay: DayLower,
  week: PlanChunk["weeks"][number],
  entry: WeeklyQuotaEntry,
): DayLower | null {
  const maxPerDay = entry.quota.maxSessionsPerDay;
  const minRestDays = entry.quota.minFullRestDays ?? 0;
  const countsByDay = new Map<DayLower, number>();
  for (const d of DAY_ORDER_FR) countsByDay.set(d, 0);
  for (const s of week.sessions ?? []) {
    const c = canonDay(s.day);
    if (c) countsByDay.set(c, (countsByDay.get(c) ?? 0) + 1);
  }
  const emptyDaysCount = Array.from(countsByDay.values()).filter(n => n === 0).length;
  const restDays = new Set<DayLower>();
  const layoutSportDays = new Set<DayLower>();
  for (const d of entry.layout?.days ?? []) {
    const c = canonDay(d.dayName);
    if (!c) continue;
    if (d.isRest) restDays.add(c);
    if ((d.slots ?? []).some(sl => sl.sport === sport)) layoutSportDays.add(c);
  }
  // Jour "de facto" repos (0 séance ce jour, même non explicitement flagué isRest par
  // le layout) — évite de le consommer si ça ferait passer le nombre de jours de repos
  // complets sous le plancher `minFullRestDays` de la semaine. Ce champ était déclaré
  // dans WeeklyQuotaEntry mais jamais lu par le réconciliateur avant ce correctif (audit
  // qualité plans IA) : rebalance/insertion pouvaient consommer n'importe quel jour vide
  // sans limite, y compris le dernier jour de repos protégé de la semaine.
  const wouldBreachRestFloor = (d: DayLower): boolean =>
    (countsByDay.get(d) ?? 0) === 0 && emptyDaysCount <= minRestDays;

  // 1) jour prévu par le layout pour ce sport, avec capacité restante, sans entamer le
  // plancher de repos
  for (const d of layoutSportDays) {
    if (d === fromDay) continue;
    if (restDays.has(d)) continue;
    if (wouldBreachRestFloor(d)) continue;
    if ((countsByDay.get(d) ?? 0) < maxPerDay) return d;
  }
  // 2) jour libre le plus proche (par distance jour de semaine), même contrainte
  const fromIdx = DAY_ORDER_FR.indexOf(fromDay);
  const candidates: Array<{ d: DayLower; dist: number }> = [];
  for (const d of DAY_ORDER_FR) {
    if (d === fromDay || restDays.has(d)) continue;
    if ((countsByDay.get(d) ?? 0) >= maxPerDay) continue;
    if (wouldBreachRestFloor(d)) continue;
    candidates.push({ d, dist: Math.abs(DAY_ORDER_FR.indexOf(d) - fromIdx) });
  }
  candidates.sort((a, b) => a.dist - b.dist);
  if (candidates.length > 0) return candidates[0].d;

  // 3) repli SANS la contrainte de plancher : mieux vaut une semaine dense que perdre
  // la séance. Le caller détecte la brèche a posteriori (countEmptyDays) et la trace.
  const fallback: Array<{ d: DayLower; dist: number }> = [];
  for (const d of DAY_ORDER_FR) {
    if (d === fromDay || restDays.has(d)) continue;
    if ((countsByDay.get(d) ?? 0) >= maxPerDay) continue;
    fallback.push({ d, dist: Math.abs(DAY_ORDER_FR.indexOf(d) - fromIdx) });
  }
  fallback.sort((a, b) => a.dist - b.dist);
  return fallback[0]?.d ?? null;
}

function findInsertDay(
  sport: string,
  week: PlanChunk["weeks"][number],
  entry: WeeklyQuotaEntry,
): DayLower | null {
  return findTargetDay(sport, "lundi", week, entry);
}

export function applyReconciler(
  chunks: PlanChunk[],
  weeklyQuotas: Record<number, any> | null | undefined,
  catalogDumpsByChunk: Array<string | null | undefined>,
  identifiedLimiters?: string[] | null,
): { chunks: PlanChunk[]; repairs: ReconcilerRepair[]; traces: string[] } {
  const repairs: ReconcilerRepair[] = [];
  const traces: string[] = [];
  if (!weeklyQuotas || typeof weeklyQuotas !== "object") {
    traces.push("[RECONCILER] skipped_reason=no_weekly_quotas");
    return { chunks, repairs, traces };
  }
  const candidatesByChunk = catalogDumpsByChunk.map(parseCatalogCandidatesFromDump);
  // Mots-clés du limiteur prioritaire (L1) — utilisés pour préférer, à l'insertion
  // d'une séance manquante, une fiche du catalogue qui cible réellement ce limiteur
  // plutôt qu'une séance générique la plus proche en durée (audit qualité plans IA :
  // l'insertion ne regardait auparavant que le sport et la durée, jamais le limiteur).
  const primaryLimiterKeywords = identifiedLimiters && identifiedLimiters.length > 0
    ? extractLimiterKeywords(identifiedLimiters[0])
    : [];

  chunks.forEach((chunk, ci) => {
    const candidates = candidatesByChunk[ci] ?? [];
    for (const week of chunk.weeks ?? []) {
      const raw = weeklyQuotas[week.weekNumber];
      if (!raw) { traces.push(`[RECONCILER] S${week.weekNumber} action=skipped_reason=no_quota`); continue; }
      const entry: WeeklyQuotaEntry = raw;
      if (entry.weekType === "race") {
        traces.push(`[RECONCILER] S${week.weekNumber} action=skipped_reason=race_week`);
        continue;
      }
      const maxPerDay = entry.quota?.maxSessionsPerDay ?? 2;

      // ────────── (a) REBALANCE ──────────
      const countsByDay = new Map<DayLower, PlanSession[]>();
      for (const d of DAY_ORDER_FR) countsByDay.set(d, []);
      for (const s of week.sessions ?? []) {
        const c = canonDay(s.day);
        if (c) countsByDay.get(c)!.push(s);
      }
      for (const [day, sess] of countsByDay) {
        while (sess.length > maxPerDay) {
          const movable = sess
            .map(s => ({ s, p: movePriority(s, entry.floors) }))
            .filter(x => x.p !== null)
            .sort((a, b) => (a.p as number) - (b.p as number));
          if (movable.length === 0) {
            traces.push(`[RECONCILER] S${week.weekNumber} ${day} count=${sess.length}>max=${maxPerDay} action=unresolved_no_movable`);
            break;
          }
          const victim = movable[0].s;
          const targetDay = findTargetDay(victim.sport, day, week, entry);
          if (!targetDay) {
            traces.push(`[RECONCILER] S${week.weekNumber} ${day} sport=${victim.sport} action=unresolved_no_target_day`);
            break;
          }
          (victim as any).day = targetDay;
          const idx = sess.indexOf(victim);
          if (idx >= 0) sess.splice(idx, 1);
          countsByDay.get(targetDay)!.push(victim);
          traces.push(`[RECONCILER] S${week.weekNumber} rebalance sport=${victim.sport} ${day}→${targetDay} (count ${sess.length + 1}→${sess.length}, dest=${countsByDay.get(targetDay)!.length}/${maxPerDay})`);
          repairs.push({
            code: "day_rebalanced",
            severity: "warning",
            chunkIndex: ci,
            weekNumber: week.weekNumber,
            sport: victim.sport,
            fromDay: day,
            toDay: targetDay,
            session: { title: victim.title ?? "", catalogId: (victim as any).catalogId ?? null, durationMin: victim.durationMin ?? 0 },
            reason: `day ${day} had ${sess.length + 1}>max=${maxPerDay} sessions; moved lowest-priority ${victim.sport} session to ${targetDay}`,
          });
        }
      }

      // ────────── (b) INSERT si min ≥1 et 0 séance du sport ──────────
      if (entry.weekType !== "taper") {
        const sportsToCheck: Array<"swim" | "bike" | "run" | "strength"> = ["swim", "bike", "run", "strength"];
        for (const sport of sportsToCheck) {
          const q = (entry.quota as any)[sport];
          if (!q || q.min < 1) continue;
          const present = (week.sessions ?? []).filter(s => s.sport === sport).length;
          if (present > 0) continue;
          const floorMin =
            sport === "bike" && entry.floors?.longRideWeekly && entry.floors.slLongRideMin ? entry.floors.slLongRideMin :
            sport === "run"  && entry.floors?.longRunWeekly  && entry.floors.slLongRunMin  ? entry.floors.slLongRunMin  :
            0;
          const targetDur = floorMin > 0 ? floorMin : (sport === "strength" ? 45 : 60);
          // Recherche catalogue : même sport, endurance/recovery, durée >= targetDur
          const matchesLimiter = (c: { title: string; structure: string }): boolean => {
            if (primaryLimiterKeywords.length === 0) return false;
            const text = `${c.title} ${c.structure}`.toLowerCase();
            return primaryLimiterKeywords.some(kw => text.includes(kw.toLowerCase()));
          };
          const pool = candidates
            .filter(c => c.sport === sport)
            .map(c => ({ c, cls: classifyIntensity(c.zones, `${c.title} ${c.structure}`) }))
            .filter(x => x.cls === "endurance" || x.cls === "recovery" || (sport === "strength" && x.cls === "unknown"))
            .filter(x => floorMin === 0 ? true : (x.c.durationMin[1] >= floorMin || x.c.durationMedian >= floorMin))
            // Priorité au limiteur L1 (mots-clés extraits de son libellé) avant la
            // proximité de durée — auparavant seule la durée comptait, l'insertion ne
            // ciblait jamais le limiteur prioritaire de la semaine (audit qualité plans IA).
            .sort((a, b) => {
              const limA = matchesLimiter(a.c) ? 0 : 1;
              const limB = matchesLimiter(b.c) ? 0 : 1;
              if (limA !== limB) return limA - limB;
              return Math.abs(a.c.durationMedian - targetDur) - Math.abs(b.c.durationMedian - targetDur);
            });
          const picked = pool[0]?.c ?? null;
          const pickedMatchesLimiter = picked ? matchesLimiter(picked) : false;
          if (!picked) {
            traces.push(`[RECONCILER] S${week.weekNumber} insert sport=${sport} action=unresolved_no_candidate (min=${q.min} present=0 floor=${floorMin})`);
            repairs.push({
              code: "insert_unresolved",
              severity: "critical",
              chunkIndex: ci,
              weekNumber: week.weekNumber,
              sport,
              reason: `quota min=${q.min} for ${sport} but week has 0 sessions and no catalog candidate (endurance/recovery ≥${floorMin || "any"}min)`,
            });
            continue;
          }
          const dayTarget = findInsertDay(sport, week, entry);
          if (!dayTarget) {
            traces.push(`[RECONCILER] S${week.weekNumber} insert sport=${sport} action=unresolved_no_day`);
            repairs.push({
              code: "insert_unresolved",
              severity: "critical",
              chunkIndex: ci,
              weekNumber: week.weekNumber,
              sport,
              reason: `no free-capacity day for ${sport} insertion (maxPerDay=${maxPerDay})`,
            });
            continue;
          }
          const dur = Math.max(
            floorMin,
            Math.min(picked.durationMin[1], Math.max(picked.durationMin[0], targetDur)),
          );
          const newSess: any = {
            day: dayTarget,
            title: picked.title,
            details: `${picked.structure || picked.title}. [ID: ${picked.id}]`,
            isKeySession: floorMin > 0,
            durationMin: dur,
            zones: picked.zones,
            sport,
            custom: false,
            catalogId: picked.id,
          };
          (week.sessions as any[]).push(newSess);
          traces.push(`[RECONCILER] S${week.weekNumber} insert sport=${sport} day=${dayTarget} → ${picked.id} (${dur}min) limiterMatch=${pickedMatchesLimiter}`);
          repairs.push({
            code: "session_inserted",
            severity: "warning",
            chunkIndex: ci,
            weekNumber: week.weekNumber,
            sport,
            toDay: dayTarget,
            session: { title: picked.title, catalogId: picked.id, durationMin: dur },
            reason: `quota min=${q.min} for ${sport}, week had 0 sessions → inserted ${picked.id} on ${dayTarget}`
              + (primaryLimiterKeywords.length > 0
                ? (pickedMatchesLimiter ? " (cible le limiteur L1)" : " (aucune fiche candidate ne cible le limiteur L1)")
                : ""),
          });
        }
      }

      // ────────── (c) DÉDOUBLONNAGE catalogId réutilisé dans LA MÊME semaine ──────────
      // Audit qualité plans IA (test réel, 2 régénérations indépendantes du plan
      // "Vince") : le LLM réutilise parfois verbatim le même catalogId 2× dans la
      // même semaine (ex : V3_BIKE_FORCE_SFR jeudi ET vendredi — alors que sa PROPRE
      // fiche dit "1x/semaine max" — ou une même séance de récupération/gut-training
      // répétée 2-3 jours de suite). Conséquence observée : des semaines entières où
      // un sport ne reçoit plus AUCUNE variété, parfois plus aucune séance qualité
      // du tout (toutes les occurrences restantes de ce sport = la même récup
      // copiée-collée). Rien ne détectait ni ne corrigeait cela avant ce correctif :
      // le réconciliateur ne vérifiait que les min/max par sport et par jour, jamais
      // la répétition d'un même ID au sein d'une semaine. Tourne APRÈS (b) : une
      // séance insérée par (b) peut elle-même dupliquer un ID déjà présent.
      const idOccurrencesThisWeek = new Map<string, PlanSession[]>();
      for (const s of week.sessions ?? []) {
        const id = (s as any).catalogId as string | null;
        if (!id || (s as any).custom === true || s.sport === "rest") continue;
        if (!idOccurrencesThisWeek.has(id)) idOccurrencesThisWeek.set(id, []);
        idOccurrencesThisWeek.get(id)!.push(s);
      }
      const usedIdsThisWeek = new Set(idOccurrencesThisWeek.keys());
      for (const [dupId, occurrences] of idOccurrencesThisWeek) {
        if (occurrences.length < 2) continue;
        // Garde la 1re occurrence intacte (probablement la mieux placée / la plus
        // intentionnelle), remplace les suivantes par une alternative du catalogue
        // du même sport et de la même classe d'intensité, non déjà utilisée cette semaine.
        for (let i = 1; i < occurrences.length; i++) {
          const victim = occurrences[i];
          const sport = victim.sport;
          const victimClass = classifyIntensity(victim.zones, `${victim.title} ${victim.details ?? ""}`);
          const alt = candidates
            .filter(c => c.sport === sport && !usedIdsThisWeek.has(c.id))
            .map(c => ({ c, cls: classifyIntensity(c.zones, `${c.title} ${c.structure}`) }))
            .filter(x => x.cls === victimClass || x.cls === "unknown" || victimClass === "unknown")
            .sort((a, b) => Math.abs(a.c.durationMedian - (victim.durationMin ?? 0)) - Math.abs(b.c.durationMedian - (victim.durationMin ?? 0)))[0]?.c
            ?? null;
          if (alt) {
            const beforeTitle = victim.title ?? "";
            (victim as any).catalogId = alt.id;
            (victim as any).title = alt.title;
            (victim as any).details = `${alt.structure || alt.title}. [ID: ${alt.id}]`;
            (victim as any).zones = alt.zones;
            usedIdsThisWeek.add(alt.id);
            traces.push(`[RECONCILER] S${week.weekNumber} dedupe sport=${sport} ${dupId}(x${occurrences.length}) → occurrence #${i + 1} remplacée par ${alt.id}`);
            repairs.push({
              code: "duplicate_catalog_id_replaced",
              severity: "warning",
              chunkIndex: ci,
              weekNumber: week.weekNumber,
              sport,
              session: { title: alt.title, catalogId: alt.id, durationMin: victim.durationMin ?? 0 },
              reason: `catalogId ${dupId} utilisé ${occurrences.length}× dans S${week.weekNumber} — occurrence "${beforeTitle}" remplacée par ${alt.id}`,
            });
          } else {
            traces.push(`[RECONCILER] S${week.weekNumber} dedupe sport=${sport} ${dupId}(x${occurrences.length}) → action=unresolved_no_alternative`);
            repairs.push({
              code: "duplicate_catalog_id_unresolved",
              severity: "warning",
              chunkIndex: ci,
              weekNumber: week.weekNumber,
              sport,
              session: { title: victim.title ?? "", catalogId: dupId, durationMin: victim.durationMin ?? 0 },
              reason: `catalogId ${dupId} utilisé ${occurrences.length}× dans S${week.weekNumber}, aucune alternative catalogue disponible (sport=${sport}, classe=${victimClass})`,
            });
          }
        }
      }

      // ────────── (d) VÉRIFICATION plancher de jours de repos complets ──────────
      // findTargetDay essaie de respecter minFullRestDays, mais peut devoir l'enfreindre
      // en dernier recours (case 3, repli). On le détecte ici a posteriori et on le
      // trace explicitement — avant ce correctif, minFullRestDays n'était lu nulle part
      // dans le réconciliateur (champ mort), rebalance/insertion pouvaient consommer
      // n'importe quel jour de repos sans que rien ne le signale (audit qualité plans IA).
      const minRestDays = entry.quota?.minFullRestDays ?? 0;
      if (minRestDays > 0) {
        const finalEmptyDays = countEmptyDays(week);
        if (finalEmptyDays < minRestDays) {
          traces.push(`[RECONCILER] S${week.weekNumber} action=rest_floor_breached empty=${finalEmptyDays}<min=${minRestDays}`);
          repairs.push({
            code: "rest_floor_breached",
            severity: "warning",
            chunkIndex: ci,
            weekNumber: week.weekNumber,
            reason: `${finalEmptyDays} jour(s) de repos complet(s) restant(s) après réconciliation, sous le plancher minFullRestDays=${minRestDays}`,
          });
        }
      }
    }
  });

  return { chunks, repairs, traces };
}

// ─────────────────────────────────────────────────────────────────────────────
// LCW SIGNATURE ENFORCEMENT — filet déterministe (post-reconciler)
// ─────────────────────────────────────────────────────────────────────────────
// Bug réel confirmé sur un plan LCW 7 semaines réellement livré ("Vince") :
// AUCUNE occurrence de B_LCW_BIKE_LONG_RACE_SAT / B_LCW_RUN_OFF_LEGS_SUN sur
// l'ensemble du plan, malgré : la checklist statique de sortie LCW
// (promptHelpers.ts), ET le rappel dynamique numérique par chunk
// (lcwSignatureReminder.ts, "X/Y placé(s) jusqu'ici"). Les deux mécanismes
// existants sont uniquement DEMANDÉS au LLM dans le prompt — rien en aval ne
// les fait respecter. Comme pour la déduplication de catalogId (PR précédent)
// et l'enforcement SL, on ajoute ici un filet 100% déterministe : après le
// réconciliateur, on COMPTE les occurrences réelles sur le plan complet
// (toutes les semaines de tous les chunks fusionnés) et, si le quota
// checklist n'est pas atteint, on FORCE une substitution sur une séance déjà
// existante du bon sport dans une semaine Build/Peak éligible.
//
// `B_LCW_BACK_TO_BACK_PEAK` (simulation Ven+Sam+Dim, durée 360-480min) n'est
// PAS forcé ici : c'est un événement composite sur 3 jours consécutifs, pas
// représentable par un remplacement de séance unique sans risquer de casser
// la structure du planning (jour unique, durée bornée) — reste un rappel
// prompt (lcwSignatureReminder.ts) + un signalement validateur, pas un
// enforcement dur.
interface LcwSignatureRepair {
  code: "lcw_signature_enforced" | "lcw_signature_unresolved";
  severity: "warning" | "critical";
  weekNumber: number;
  catalogId: string;
  reason: string;
}

const LCW_HARD_ENFORCED_TARGETS: Array<{ id: string; sport: "bike" | "run"; day: DayLower; min: number }> = [
  { id: "B_LCW_BIKE_LONG_RACE_SAT", sport: "bike", day: "samedi", min: 3 },
  { id: "B_LCW_RUN_OFF_LEGS_SUN", sport: "run", day: "dimanche", min: 3 },
];

/**
 * Contenu de repli — bug réel (audit PDF, plans "Vince" successifs) : quand
 * la fiche n'est PAS présente dans le dump catalogue du chunk courant (elle
 * a pu être exclue par la rotation inter-chunk), l'ancienne version de ce
 * correctif forçait le `catalogId` mais laissait `title`/`details`
 * inchangés — le validateur passait au vert (il lit `catalogId` en
 * priorité), mais le plan livré à l'athlète ne montrait jamais le vrai
 * contenu de la séance signature (ni tag `[ID: ...]` visible, ni fiche
 * "FICHE COMPLÈTE BIBLIOTHÈQUE", puisque ce rendu réextrait l'ID depuis le
 * texte). On vérifiait la checklist sans jamais livrer la séance réelle.
 * Contenu ci-dessous = résumé fidèle de enrichedWorkoutsLCW.ts (source de
 * vérité de ces 2 fiches), utilisé UNIQUEMENT si le dump ne les contient pas.
 */
const LCW_HARD_ENFORCED_FALLBACK_CONTENT: Record<string, {
  title: string; details: string; durationMin: number; zones: string[];
}> = {
  B_LCW_BIKE_LONG_RACE_SAT: {
    title: "Long ride race-pace samedi (LCW)",
    details: "Warm-up 20' Z1→Z2 progressif + 3x2min @90% FTP r=2min. Main : 2h-2h30 continu à IF 0.82-0.85 (85-88% FTP autorisé — PAS de course immédiate derrière, spécificité LCW vs brick 70.3 classique). Position aéro tenue ≥80% du temps. Nutrition race 80-100g CHO/h + 500-750mL/h. Cool-down 10' Z1 + spin-out. [ID: B_LCW_BIKE_LONG_RACE_SAT]",
    durationMin: 165,
    zones: ["Z3", "Z4"],
  },
  B_LCW_RUN_OFF_LEGS_SUN: {
    title: "Long run jambes fatiguées dimanche (LCW)",
    details: "Warm-up 15' Z1→Z2 très progressif (jambes lourdes normales) + 4 lignes droites relance. Main : 45-90min à allure race cible 70.3 sur jambes fatiguées du vélo de la veille — angle mort absolu des plans 70.3 continus, JAMAIS sans B_LCW_BIKE_LONG_RACE_SAT la veille. Cadence stable 178-184spm. Nutrition 60-80g CHO/h. Cool-down 10-15' Z1 + mobilité mollets/quadriceps. [ID: B_LCW_RUN_OFF_LEGS_SUN]",
    durationMin: 75,
    zones: ["Z3", "Z4"],
  },
};

export function applyLcwSignatureEnforcement(
  chunks: PlanChunk[],
  catalogDumpsByChunk: Array<string | null | undefined>,
  planConfig: unknown,
): { chunks: PlanChunk[]; repairs: LcwSignatureRepair[]; traces: string[] } {
  const repairs: LcwSignatureRepair[] = [];
  const traces: string[] = [];
  if (!detectLcwFromConfig(planConfig)) {
    traces.push("[LCW_SIGNATURE] skipped_reason=not_lcw_format");
    return { chunks, repairs, traces };
  }

  const allWeeks: Array<{ ci: number; week: PlanChunk["weeks"][number] }> = [];
  chunks.forEach((chunk, ci) => {
    for (const week of chunk.weeks ?? []) allWeeks.push({ ci, week });
  });
  const candidatesByChunk = catalogDumpsByChunk.map(parseCatalogCandidatesFromDump);

  for (const target of LCW_HARD_ENFORCED_TARGETS) {
    const hasId = (week: PlanChunk["weeks"][number]) =>
      (week.sessions ?? []).some(s => String((s as any).catalogId ?? "").toUpperCase() === target.id);
    let have = allWeeks.filter(({ week }) => hasId(week)).length;
    if (have >= target.min) {
      traces.push(`[LCW_SIGNATURE] ${target.id} have=${have}/${target.min} action=skipped_reason=quota_met`);
      continue;
    }

    // Semaines Build/Peak sans déjà cette signature, dans l'ordre chronologique.
    const eligible = allWeeks
      .filter(({ week }) => {
        const phase = String((week as any).phase ?? "").toLowerCase();
        return (phase === "build" || phase === "peak") && !hasId(week);
      })
      .sort((a, b) => a.week.weekNumber - b.week.weekNumber);

    for (const { ci, week } of eligible) {
      if (have >= target.min) break;
      // Substitution la moins disruptive : une séance DÉJÀ du bon sport,
      // idéalement déjà le bon jour — jamais d'insertion d'un jour
      // supplémentaire (respecte le quota séances/jour déjà réconcilié).
      const sameDaySameSport = (week.sessions ?? []).find(
        s => canonDay(s.day) === target.day && normalizeSport(s.sport) === target.sport,
      );
      const anySameSport = (week.sessions ?? []).find(s => normalizeSport(s.sport) === target.sport);
      const slot = sameDaySameSport ?? anySameSport;
      if (!slot) {
        traces.push(`[LCW_SIGNATURE] S${week.weekNumber} ${target.id} action=unresolved_no_slot`);
        repairs.push({
          code: "lcw_signature_unresolved",
          severity: "critical",
          weekNumber: week.weekNumber,
          catalogId: target.id,
          reason: `aucune séance ${target.sport} disponible en S${week.weekNumber} (phase Build/Peak) pour substitution`,
        });
        continue;
      }

      const fiche = (candidatesByChunk[ci] ?? []).find(c => c.id.toUpperCase() === target.id);
      const mutable = slot as any;
      const beforeId = mutable.catalogId ?? null;
      const beforeDay = mutable.day;
      if (fiche) {
        mutable.title = fiche.title;
        mutable.details = `${fiche.structure || fiche.title}. [ID: ${fiche.id}]`;
        mutable.catalogId = fiche.id;
        mutable.custom = false;
        mutable.durationMin = Math.round(fiche.durationMedian) || mutable.durationMin;
        mutable.zones = fiche.zones;
        if (!sameDaySameSport) mutable.day = target.day;
      } else {
        // Fiche absente du dump de CE chunk (rotation catalogue) — on utilise
        // le contenu de repli connu (voir LCW_HARD_ENFORCED_FALLBACK_CONTENT)
        // plutôt que de forcer un catalogId "muet" : garantit que la séance
        // livrée à l'athlète correspond réellement à sa signature LCW, pas
        // seulement que le validateur la voit.
        const fallback = LCW_HARD_ENFORCED_FALLBACK_CONTENT[target.id];
        mutable.catalogId = target.id;
        mutable.custom = false;
        if (fallback) {
          mutable.title = fallback.title;
          mutable.details = fallback.details;
          mutable.durationMin = fallback.durationMin;
          mutable.zones = fallback.zones;
        }
        if (!sameDaySameSport) mutable.day = target.day;
      }
      have++;
      traces.push(
        `[LCW_SIGNATURE] S${week.weekNumber} enforced ${target.id} (was day=${beforeDay} catalogId=${beforeId ?? "null"}, fiche_in_dump=${!!fiche})`,
      );
      repairs.push({
        code: "lcw_signature_enforced",
        severity: "warning",
        weekNumber: week.weekNumber,
        catalogId: target.id,
        reason: `checklist LCW bloquante non respectée par la génération (have=${have - 1}/${target.min} avant ce correctif) — séance day=${beforeDay} catalogId=${beforeId ?? "null"} substituée`,
      });
    }

    if (have < target.min) {
      traces.push(`[LCW_SIGNATURE] ${target.id} still missing ${target.min - have} after enforcement pass`);
    }
  }

  return { chunks, repairs, traces };
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANCHER SÉANCES/JOUR ELITE+ — filet déterministe (post-reconciler)
// ─────────────────────────────────────────────────────────────────────────────
// Bug réel confirmé sur PLUSIEURS plans "Vince" réels successifs (70.3,
// ambition élevée) : systemPrompt.ts / promptHelpers.ts ("DOUBLES & TRIPLES
// SÉANCES — OBLIGATOIRE") demandent 2-3 séances/jour pour World Class/Elite/
// Competitor sur IM/70.3 (sauf 1 jour de repos/semaine) — mais rien en aval
// ne le fait respecter, exactement le même schéma que le bug signatures LCW
// (PR précédent) : planValidator.ts::validateDailySessionFloor le DÉTECTE
// après coup ("ERREUR GRAVE") mais ne corrige jamais rien. Sur chaque plan
// réel audité, plusieurs lundis/jours se retrouvent avec une unique séance
// de renfo (30-50min) alors que l'ambition exige un vrai double.
interface DailyFloorRepair {
  code: "daily_floor_enforced" | "daily_floor_unresolved";
  severity: "warning" | "critical";
  weekNumber: number;
  day: DayLower;
  reason: string;
}

const DAILY_FLOOR_ELIGIBLE_AMBITIONS = new Set(["world_class", "elite", "competitor"]);
const DAILY_FLOOR_SPORT_PRIORITY: Array<"run" | "bike" | "swim" | "strength"> = ["run", "bike", "swim", "strength"];

/** Même exemption que planValidator.ts::validateDailySessionFloor : un brick
 *  ou une séance signature LCW combine déjà 2-3 disciplines en une ligne. */
function isMultiDisciplineSingleSession(s: { sport?: string; title?: string; details?: string; catalogId?: string | null }): boolean {
  const catalogId = String(s.catalogId ?? "").toUpperCase();
  const text = `${s.title ?? ""} ${s.details ?? ""}`;
  return s.sport === "brick" || /\bbrick\b/i.test(text) || catalogId.includes("BRICK") || catalogId.startsWith("B_LCW_");
}

export function applyDailySessionFloorEnforcement(
  chunks: PlanChunk[],
  weeklyQuotas: Record<number, WeeklyQuotaEntry> | null | undefined,
  catalogDumpsByChunk: Array<string | null | undefined>,
  objective: string | null | undefined,
  ambition: string | null | undefined,
): { chunks: PlanChunk[]; repairs: DailyFloorRepair[]; traces: string[] } {
  const repairs: DailyFloorRepair[] = [];
  const traces: string[] = [];

  const objKey = normalizeObjKey(String(objective ?? ""));
  const isTriIMor703 = objKey === "IM" || objKey === "703";
  const amb = String(ambition ?? "").toLowerCase();
  if (!isTriIMor703 || !DAILY_FLOOR_ELIGIBLE_AMBITIONS.has(amb)) {
    traces.push(`[DAILY_FLOOR] skipped_reason=not_eligible (objective=${objKey}, ambition=${amb || "none"})`);
    return { chunks, repairs, traces };
  }
  if (!weeklyQuotas || typeof weeklyQuotas !== "object") {
    traces.push("[DAILY_FLOOR] skipped_reason=no_weekly_quotas");
    return { chunks, repairs, traces };
  }
  const candidatesByChunk = catalogDumpsByChunk.map(parseCatalogCandidatesFromDump);

  chunks.forEach((chunk, ci) => {
    const candidates = candidatesByChunk[ci] ?? [];
    for (const week of chunk.weeks ?? []) {
      const entry = weeklyQuotas[week.weekNumber];
      if (!entry) { traces.push(`[DAILY_FLOOR] S${week.weekNumber} action=skipped_reason=no_quota`); continue; }
      if (entry.weekType === "recovery" || entry.weekType === "taper" || entry.weekType === "race") {
        traces.push(`[DAILY_FLOOR] S${week.weekNumber} action=skipped_reason=weekType_${entry.weekType}`);
        continue;
      }
      const maxPerDay = entry.quota?.maxSessionsPerDay ?? 2;

      const byDay = new Map<DayLower, PlanSession[]>();
      for (const d of DAY_ORDER_FR) byDay.set(d, []);
      for (const s of week.sessions ?? []) {
        const c = canonDay(s.day);
        if (c) byDay.get(c)!.push(s);
      }

      for (const [day, sessions] of byDay) {
        const active = sessions.filter(s => s.sport !== "rest");
        if (active.length === 0) continue; // jour repos complet — autorisé (1x/sem)
        if (active.length !== 1) continue;
        const only = active[0];
        if (isMultiDisciplineSingleSession(only)) continue;
        if (maxPerDay < 2) continue; // quota du plan ne permet pas de doubler ce jour

        // Sport complémentaire : le premier de la liste de priorité qui n'est
        // pas déjà présent ce jour-là ET que le quota hebdo autorise (max > 0).
        const onlySport = normalizeSport(only.sport);
        const complementSport = DAILY_FLOOR_SPORT_PRIORITY.find(sp => {
          if (sp === onlySport) return false;
          const q = (entry.quota as any)[sp];
          return q && q.max > 0;
        });
        if (!complementSport) {
          traces.push(`[DAILY_FLOOR] S${week.weekNumber} ${day} action=unresolved_no_complement_sport (only=${onlySport})`);
          repairs.push({
            code: "daily_floor_unresolved", severity: "critical", weekNumber: week.weekNumber, day,
            reason: `1 seule séance (${only.title}) mais aucun sport complémentaire autorisé par le quota hebdo pour doubler ce jour`,
          });
          continue;
        }
        const targetDur = complementSport === "strength" ? 40 : 45;
        const pool = candidates
          .filter(c => c.sport === complementSport)
          .map(c => ({ c, cls: classifyIntensity(c.zones, `${c.title} ${c.structure}`) }))
          .filter(x => x.cls === "endurance" || x.cls === "recovery" || (complementSport === "strength" && x.cls === "unknown"))
          .sort((a, b) => Math.abs(a.c.durationMedian - targetDur) - Math.abs(b.c.durationMedian - targetDur));
        const picked = pool[0]?.c ?? null;
        if (!picked) {
          traces.push(`[DAILY_FLOOR] S${week.weekNumber} ${day} action=unresolved_no_candidate (complement=${complementSport})`);
          repairs.push({
            code: "daily_floor_unresolved", severity: "critical", weekNumber: week.weekNumber, day,
            reason: `1 seule séance (${only.title}) — aucune fiche catalogue ${complementSport} disponible pour compléter ce jour`,
          });
          continue;
        }
        const dur = Math.max(picked.durationMin[0], Math.min(picked.durationMin[1], targetDur));
        const newSess: any = {
          day, title: picked.title,
          details: `${picked.structure || picked.title}. [ID: ${picked.id}]`,
          isKeySession: false, durationMin: dur, zones: picked.zones,
          sport: complementSport, custom: false, catalogId: picked.id,
        };
        (week.sessions as any[]).push(newSess);
        traces.push(`[DAILY_FLOOR] S${week.weekNumber} ${day} enforced +${complementSport}=${picked.id} (was 1×${onlySport} only)`);
        repairs.push({
          code: "daily_floor_enforced", severity: "warning", weekNumber: week.weekNumber, day,
          reason: `1 seule séance ("${only.title}") non conforme à l'ambition ${amb} (IM/70.3 : 2-3 séances/jour) — ${picked.id} ajouté`,
        });
      }
    }
  });

  return { chunks, repairs, traces };
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
export function inferPhaseFromWeek(weekStart: number, totalWeeks: number): string {
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
    s2rStrength: planConfig?._s2rStrength ?? null,
  });

  const totalWeeks = planConfig?.weeksAvailable || 12;
  const terrainHardBan = buildTerrainHardBanBlock(planConfig);
  const athleteConstraintsBlock = buildAthleteConstraintsBlock(planConfig?.constraints);
  const canonicalRaceCard = buildCanonicalRaceCard(athleteData, planConfig);
  const structuredDiagnostic = buildStructuredDiagnosticBlock(planConfig, totalWeeks);
  const baseUserPrompt = buildUserPrompt(athleteData, planConfig, catalogDurationStats);

  // ─── Rappel dynamique signatures LCW — voir lcwSignatureReminder.ts.
  // ⚠️ Uniquement pour une génération complète multi-chunk fraîche —
  // PAS en régénération semaine seule (regenerateWeek, déjà couvert par son
  // propre rappel client PR #86) ni en régénération de fenêtre
  // (windowRegenPhase, idem) : consumedIdCounts ne verrait alors que les
  // chunks de CETTE requête, pas le reste du plan déjà existant.
  const isFullFreshLCWGeneration = !regenerateWeek
    && typeof planConfig?.windowRegenPhase !== "string"
    && detectLcwFromConfig(planConfig);

  // Chunking : même heuristique que le chemin Markdown
  const obj = (planConfig?.objective || "").toUpperCase();
  const isTriVerbose = /IRON|IM\b|703|70\.3|TRIATHLON|TRI\b/i.test(obj);
  const isTrailVerbose = /TRAIL\s*(ULTRA|MOUNTAIN|MONT|UTMB|CCC|OCC|LONG)/i.test(obj)
    || (/TRAIL/i.test(obj) && totalWeeks >= 12);
  // LCW : chunk plus petit QUE SI NÉCESSAIRE (voir computeLcwChunkSize).
  // Bug réel (audit "plan Vince", 7 semaines) : CHUNK_SIZE=5 standard plaçait
  // TOUTES les semaines Build+Peak dans un SEUL chunk sans aucun checkpoint
  // intermédiaire — le rappel dynamique (PR précédente) ne pouvait alors se
  // déclencher qu'AVANT ce chunk unique ("il reste du temps", pas urgent) ou
  // sur le chunk suivant, qui ne couvre plus que l'affûtage/la course (trop
  // tard). Sur un plan LONG, Build+Peak dépasse déjà la taille d'un chunk
  // standard et se répartit naturellement — rétrécir systématiquement
  // multiplierait les appels LLM sans bénéfice, d'où le calcul conditionnel.
  const standardChunkSize = isTriVerbose ? 5 : isTrailVerbose ? 6 : 4;
  const CHUNK_SIZE = isFullFreshLCWGeneration
    ? computeLcwChunkSize(totalWeeks, standardChunkSize, inferPhaseFromWeek)
    : standardChunkSize;
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

      // Keep-alive : sans octet pendant un appel LLM long (>30-60s), Safari/iOS et
      // certains proxies coupent la connexion → "TypeError: Load failed" côté client.
      // On émet un commentaire SSE (ignoré par le parseur) toutes les 10s.
      const heartbeatEncoder = new TextEncoder();
      let heartbeatStopped = false;
      const heartbeat = setInterval(() => {
        if (heartbeatStopped) return;
        try { controller.enqueue(heartbeatEncoder.encode(": hb\n\n")); } catch { heartbeatStopped = true; }
      }, 10_000);
      const stopHeartbeat = () => { heartbeatStopped = true; clearInterval(heartbeat); };

      try {

        const collectedChunks: PlanChunk[] = [];
        const catalogDumpsByChunk: string[] = [];
        // P2 diversité — mémoire des catalogId déjà consommés par les chunks
        // précédents. Injectée dans le prompt du chunk suivant avec une règle
        // de non-réemploi explicite (interdit ≥2 usages, à éviter à 1 usage).
        const consumedIdCounts = new Map<string, number>();
        const totalChunks = chunks.length;
        console.log(`[trail_probe_path] jsonPlanHandler main loop reached, totalChunks=${totalChunks}, regenerateWeek=${regenerateWeek ? "yes" : "no"}`);


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
          // Régénération de fenêtre : `windowRegenPhase` porte la vraie phase
          // globale pré-calculée côté client (planWindowRegen.ts), car en
          // génération non-chunkée `chunk.start` vaut toujours 1 → sans cet
          // override, inferPhaseFromWeek(1, totalWeeks) retombe TOUJOURS sur
          // "base", quelle que soit la position réelle de la fenêtre dans le plan.
          const activePhase = regenerateWeek?.phase
            ?? (typeof planConfig?.windowRegenPhase === "string" && planConfig.windowRegenPhase
              ? planConfig.windowRegenPhase
              : null)
            ?? inferPhaseFromWeek(chunk.start, totalWeeks);
          const catalogDump = chunkSpecificCatalog
            ?? resolvePhaseCatalog(activePhase, phaseCatalogs, workoutCatalog);
          catalogDumpsByChunk[ci] = catalogDump;

          const allowedIds = extractCatalogIdsFromDump(catalogDump);
          // ─── SONDE DIAGNOSTIC TRAIL (à retirer après analyse) ───
          {
            const trailInAllowed = allowedIds.filter((id) => isTrailCatalogId(id));
            __trailDebug.push(
              `[allowedIds] chunk=${ci} total=${allowedIds.length} ` +
              `trail=${trailInAllowed.length > 0 ? trailInAllowed.join(",") : "NONE"}`,
            );
          }
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

          // ─── P3 diversité : mémoire INTER-PLANS (historique athlète) ─────
          // Fiches déjà servies à cet athlète dans ses derniers plans, pondérées
          // par récence côté client. On ne bannit pas : on demande d'y recourir
          // en dernier ressort pour éviter que chaque plan clone le précédent.
          let historyBlock: string | null = null;
          {
            const raw = planConfig?._historyUsedIdCounts;
            if (raw && typeof raw === "object") {
              const allowedSet = new Set(allowedIds);
              const seen = Object.entries(raw as Record<string, number>)
                .filter(([id, w]) => allowedSet.has(id) && Number(w) > 0)
                .sort((a, b) => Number(b[1]) - Number(a[1]))
                .map(([id]) => id);
              if (seen.length > 0) {
                const CAP = 60;
                historyBlock = [
                  `\n🗂 HISTORIQUE ATHLÈTE — fiches déjà utilisées dans ses PLANS PRÉCÉDENTS`,
                  `À ÉVITER en priorité (déjà vécues récemment) : ${seen.slice(0, CAP).join(", ")}${seen.length > CAP ? `, … (+${seen.length - CAP})` : ""}`,
                  `Règle : ne réutilise une de ces fiches que si aucune autre fiche du catalogue ne couvre la même intention (sport × famille). La progression et la couverture priment toujours sur la nouveauté.`,
                ].join("\n");
              }
            }
          }

          // ─── P2 diversité : bloc "fiches déjà consommées" ────────────────
          // On ne liste que les IDs pertinents (présents dans le catalogue de
          // CE chunk) pour ne pas gonfler le prompt inutilement.
          let diversityBlock: string | null = null;
          {
            const allowedSet = new Set(allowedIds);
            const banned: string[] = [];
            const avoid: string[] = [];
            for (const [id, count] of consumedIdCounts) {
              if (!allowedSet.has(id)) continue;
              if (count >= 2) banned.push(id);
              else avoid.push(id);
            }
            if (banned.length > 0 || avoid.length > 0) {
              const CAP = 60;
              const lines = [
                `\n♻️ DIVERSITÉ CATALOGUE — fiches déjà utilisées dans les blocs précédents`,
                banned.length > 0
                  ? `⛔ INTERDIT de réutiliser (déjà ≥2 fois) : ${banned.slice(0, CAP).join(", ")}${banned.length > CAP ? `, … (+${banned.length - CAP})` : ""}`
                  : null,
                avoid.length > 0
                  ? `⚠️ À ÉVITER (déjà 1 fois) — n'y revenir que si AUCUNE autre fiche du catalogue ne couvre l'intention : ${avoid.slice(0, CAP).join(", ")}${avoid.length > CAP ? `, … (+${avoid.length - CAP})` : ""}`
                  : null,
                `Règle : dans ce bloc, une même fiche ne peut pas apparaître 2 semaines consécutives, ni plus de 2 fois au total. Privilégie systématiquement une variante non encore utilisée de la même famille d'intention.`,
              ].filter(Boolean);
              diversityBlock = lines.join("\n");
            }
          }

          // ─── Rappel dynamique signatures LCW — voir lcwSignatureReminder.ts ───
          // "Dernière chance" = aucune semaine APRÈS ce chunk n'est encore en
          // phase Build/Peak (donc plus aucun chunk suivant, s'il y en a, ne
          // pourra accueillir ces séances sans casser l'affûtage/la course).
          const lcwSignatureBlock = isFullFreshLCWGeneration
            ? buildLcwSignatureReminder({
                consumedIdCounts,
                chunkIndex: ci,
                totalChunks,
                chunkStartWeek: chunk.start,
                chunkEndWeek: chunk.end,
                isLastBuildOrPeakChunk: !Array.from(
                  { length: Math.max(0, totalWeeks - chunk.end) },
                  (_, i) => chunk.end + 1 + i,
                ).some((wk) => ["build", "peak"].includes(inferPhaseFromWeek(wk, totalWeeks))),
              })
            : null;

          const userPrompt = [
            athleteConstraintsBlock || null,
            terrainHardBan || null,
            baseUserPrompt,
            quotasBlock ? `\n${quotasBlock}\n` : null,
            catalogDump ? `\n${catalogDump}\n` : null,
            historyBlock,
            diversityBlock,
            lcwSignatureBlock,
            canonicalRaceCard,
            `\n📋 DIAGNOSTIC STRUCTURÉ (référence cohérence) :\n${structuredDiagnostic}`,
            `\n🎯 CIBLE CHUNK : ${chunkHeader}`,
            `\n📅 weekNumber attendus (obligatoire, sans trou ni doublon) : [${weeksList.join(", ")}]`,
            `\n🚨 PHASE ACTIVE ESTIMÉE : "${activePhase}"`,
            athleteConstraintsBlock ? `\n${athleteConstraintsBlock}` : null,
          ].filter(Boolean).join("\n");


          const schemaOptions: BuildPlanChunkSchemaOptions = {
            expectedWeekCount,
            isFirstChunk: isFirst,
          };

          try {
            const { chunk: planChunk, usedRetry, finishReason, repairDiag } = await generateChunkJSON({
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

            // P2 diversité — mémorise les fiches réellement consommées par ce chunk.
            {
              let counted = 0;
              for (const wk of (planChunk as { weeks?: Array<{ sessions?: Array<{ catalogId?: unknown }> }> }).weeks ?? []) {
                for (const se of wk.sessions ?? []) {
                  const cid = se.catalogId;
                  if (typeof cid === "string" && cid.length > 0) {
                    consumedIdCounts.set(cid, (consumedIdCounts.get(cid) ?? 0) + 1);
                    counted++;
                  }
                }
              }
              console.log(`[diversity_memory] chunk=${ci} consumed=${counted} distinct_total=${consumedIdCounts.size}`);
            }


            if (usedRetry) {
              enqueue("chunk-progress", {
                chunkIndex: ci, totalChunks, status: "retry-succeeded",
              });
            }

            if (repairDiag) {
              const msg = `chunk=${ci} attempt=${repairDiag.attempt} repairs=[${repairDiag.repairs.join(",")}] parseError="${(repairDiag.parseError ?? "").slice(0, 200)}"`;
              console.warn(`[json_repair] ${msg}`);
              enqueue("warning", {
                code: "json_repair",
                severity: "info",
                message: msg,
                repair: {
                  chunkIndex: ci,
                  attempt: repairDiag.attempt,
                  repairs: repairDiag.repairs,
                  parseError: repairDiag.parseError,
                },
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
          if (regenerateWeek) {
            const regeneratedWeeks = collectedChunks.flatMap((chunk) => chunk.weeks);
            if (regeneratedWeeks.length !== 1 || regeneratedWeeks[0]?.weekNumber !== regenerateWeek.weekNumber) {
              throw new MergePlanError(
                "GAP",
                `[SCHEMA_FAIL] régénération S${regenerateWeek.weekNumber}: une semaine unique portant le bon numéro est requise.`,
              );
            }
          } else {
            mergePlanChunks(collectedChunks, mergedTotal);
          }

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

          // ─── SONDE DIAGNOSTIC TRAIL (à retirer) ───
          for (const ch of collectedChunks as Array<Record<string, unknown>>) {
            const weeks = Array.isArray((ch as { weeks?: unknown }).weeks) ? (ch as { weeks: Array<Record<string, unknown>> }).weeks : [];
            for (const wk of weeks) {
              const sessions = Array.isArray((wk as { sessions?: unknown }).sessions) ? (wk as { sessions: Array<Record<string, unknown>> }).sessions : [];
              for (const se of sessions) {
                const cid = (se as { catalogId?: unknown }).catalogId;
                if (typeof cid === "string" && isTrailCatalogId(cid)) {
                  __trailDebug.push(
                    `[survivor] POST-GUARD week=${(wk as { weekNumber?: unknown }).weekNumber} day=${(se as { day?: unknown }).day} ` +
                    `id="${cid}" custom=${String((se as { custom?: unknown }).custom)} sport=${String((se as { sport?: unknown }).sport)}`,
                  );
                }
              }
            }
          }


          // PHASE 2A.2 — Enforcement SL déterministe (post-guard, avant merge final)
          const slEnforce = applySLFloorEnforcement(
            guard.chunks,
            planConfig?._weeklyQuotas ?? null,
            catalogDumpsByChunk,
          );
          for (const line of slEnforce.traces) {
            console.log(line);
            enqueue("warning", { code: "sl_floor_trace", severity: "info", message: line });
          }
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


          // PHASE 2A.3 — Réconciliateur (rebalance day + insert missing sport)
          const reconciled = applyReconciler(
            slEnforce.chunks,
            planConfig?._weeklyQuotas ?? null,
            catalogDumpsByChunk,
            planConfig?.identifiedLimiters ?? null,
          );
          for (const line of reconciled.traces) {
            console.log(line);
            enqueue("warning", { code: "reconciler_trace", severity: "info", message: line });
          }
          for (const repair of reconciled.repairs) {
            const msg = repair.code === "day_rebalanced"
              ? `S${repair.weekNumber} rebalance ${repair.sport} ${repair.fromDay}→${repair.toDay}`
              : repair.code === "session_inserted"
                ? `S${repair.weekNumber} insert ${repair.sport} on ${repair.toDay} → ${repair.session?.catalogId}`
                : repair.code === "rest_floor_breached"
                  ? `S${repair.weekNumber} plancher de repos non respecté (${repair.reason})`
                  : `S${repair.weekNumber} insert ${repair.sport} unresolved (${repair.reason})`;
            console.warn(`[Reconciler] ${repair.code}: ${msg}`, repair);
            enqueue("warning", {
              code: repair.code,
              severity: repair.severity,
              message: msg,
              repair,
            });
          }

          // Filet déterministe signatures LCW (post-reconciler, avant value-check) —
          // voir applyLcwSignatureEnforcement ci-dessus. No-op si le plan n'est pas LCW.
          const lcwEnforced = regenerateWeek
            ? { chunks: reconciled.chunks, repairs: [] as ReturnType<typeof applyLcwSignatureEnforcement>["repairs"], traces: [] as string[] }
            : applyLcwSignatureEnforcement(reconciled.chunks, catalogDumpsByChunk, planConfig);
          for (const line of lcwEnforced.traces) {
            console.log(line);
            enqueue("warning", { code: "lcw_signature_trace", severity: "info", message: line });
          }
          for (const repair of lcwEnforced.repairs) {
            const msg = repair.code === "lcw_signature_enforced"
              ? `S${repair.weekNumber}: signature LCW ${repair.catalogId} forcée (checklist bloquante non respectée par la génération)`
              : `S${repair.weekNumber}: signature LCW ${repair.catalogId} non résolue (${repair.reason})`;
            console.warn(`[LCW signature enforce] ${repair.code}: ${msg}`, repair);
            enqueue("warning", {
              code: repair.code,
              severity: repair.severity,
              message: msg,
              repair,
            });
          }

          // Filet déterministe plancher séances/jour Elite+ (post-LCW, avant
          // value-check) — voir applyDailySessionFloorEnforcement ci-dessus.
          // No-op si l'objectif n'est pas IM/70.3 ou l'ambition < competitor.
          const dailyFloorEnforced = regenerateWeek
            ? { chunks: lcwEnforced.chunks, repairs: [] as ReturnType<typeof applyDailySessionFloorEnforcement>["repairs"], traces: [] as string[] }
            : applyDailySessionFloorEnforcement(
                lcwEnforced.chunks,
                planConfig?._weeklyQuotas ?? null,
                catalogDumpsByChunk,
                planConfig?.objective ?? null,
                planConfig?.ambitionMeta?.effective ?? planConfig?.ambition ?? null,
              );
          for (const line of dailyFloorEnforced.traces) {
            console.log(line);
            enqueue("warning", { code: "daily_floor_trace", severity: "info", message: line });
          }
          for (const repair of dailyFloorEnforced.repairs) {
            const msg = repair.code === "daily_floor_enforced"
              ? `S${repair.weekNumber} ${repair.day}: séance ajoutée (plancher 2-3/jour ambition élevée non respecté par la génération)`
              : `S${repair.weekNumber} ${repair.day}: plancher séances/jour non résolu (${repair.reason})`;
            console.warn(`[Daily floor enforce] ${repair.code}: ${msg}`, repair);
            enqueue("warning", {
              code: repair.code,
              severity: repair.severity,
              message: msg,
              repair,
            });
          }

          // PHASE 2B — Validateur de valeurs (post-reconciler, avant merge final)
          const valueChecked = applyValueCheck(
            dailyFloorEnforced.chunks,
            planConfig?._targetTable ?? null,
          );
          for (const line of valueChecked.traces) {
            console.log(line);
          }
          for (const repair of valueChecked.repairs) {
            const msg = repair.code === "value_relativized"
              ? `S${repair.weekNumber} ${repair.day} ${repair.sport}: ${repair.reason} (${repair.before} → ${repair.after})`
              : `S${repair.weekNumber} ${repair.day} ${repair.sport}: ${repair.reason} [token="${repair.token}"]`;
            console.warn(`[VALUE_CHECK] ${repair.code}: ${msg}`, repair);
            enqueue("warning", {
              code: repair.code,
              severity: repair.severity,
              message: msg,
              repair,
            });
          }
          enqueue("warning", {
            code: "value_check_summary",
            severity: "info",
            message: `[VALUE_CHECK] TOTAL tokens=${valueChecked.totalTokens} conforme=${valueChecked.conformantTokens} relativized=${valueChecked.relativizedTokens} unresolved=${valueChecked.unresolvedTokens} residualAbs=${valueChecked.residualAbsoluteTokens}`,
            summary: {
              // Contrat v2 (canonique) — nommage aligné avec checkB9
              tokens: valueChecked.totalTokens,
              conforme: valueChecked.conformantTokens,
              relativized: valueChecked.relativizedTokens,
              unresolved: valueChecked.unresolvedTokens,
              residualAbsolute: valueChecked.residualAbsoluteTokens,
              // Alias legacy (compat rétro éventuelle)
              totalTokens: valueChecked.totalTokens,
              conformantTokens: valueChecked.conformantTokens,
              relativizedTokens: valueChecked.relativizedTokens,
              unresolvedTokens: valueChecked.unresolvedTokens,
              residualAbsoluteTokens: valueChecked.residualAbsoluteTokens,
            },
          });

          const merged = regenerateWeek
            ? { totalWeeks: 1, weeks: valueChecked.chunks.flatMap((chunk) => chunk.weeks) }
            : mergePlanChunks(valueChecked.chunks, mergedTotal);
          for (let ci = 0; ci < valueChecked.chunks.length; ci++) {
            enqueue("chunk-json", { chunkIndex: ci, chunk: valueChecked.chunks[ci] });
          }
          // ─── DIAGNOSTIC (à retirer) — remonte les sondes trail au client ───
          console.log(`[trail_probe_enqueue] lines=${__trailDebug.length}`);
          enqueue("trail-debug", { lines: [...__trailDebug] });
          __trailDebug.length = 0;
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

        stopHeartbeat();
        controller.close();
      } catch (e) {
        console.error("[jsonPlanHandler] fatal:", e);
        try {
          controller.enqueue(sseEvent("error", {
            code: "FATAL",
            message: e instanceof Error ? e.message : "Unknown error",
          }));
        } catch { /* ignore */ }
        stopHeartbeat();
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
