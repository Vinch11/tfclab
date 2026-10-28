import { prevalidateTransport } from "../_shared/prevalidateTransport.ts";
import { prevalidatePlanWeeks, type PrevalidationInputWeek } from "../_shared/planPrevalidation.ts";
import { catalogueTrainingMinimaForWeek } from "../_shared/catalogueTrainingMinima.ts";
import { periodizationBounds, phaseWithinPeriodization, reducedFondationWeeksPostPeak } from "../_shared/periodizationBounds.ts";
import { PLAN_RELEASE_INFO } from "../_shared/planReleaseInfo.ts";
import { sanitizeSchemaFailure } from "../_shared/planFailureDiagnostics.ts";
import { executableCatalogueVariantsForWeeks, catalogueForWeek, checkSessionCatalogue, type CatalogueContract } from "../_shared/sessionCatalogueContract.ts";
import { technicalGenerationConfig, technicalRuntimeContext, technicalFloorAudit, technicalFloors } from "../_shared/planDiagnosticPrivacy.ts";
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
  computeMultiObjectiveSegments,
  computePilotChunksToRun,
} from "./promptHelpers.ts";
import { getSystemPromptJSON } from "./systemPromptJSON.ts";
import { extractLimiterKeywords, normalizeAmbKey, normalizeObjKey, taperWeeksForObjectiveServer } from "./sportRatioMatrix.ts";
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
import { mergePlanChunks, MergePlanError, type MergedPlan } from "./mergePlanChunks.ts";
import { computePhaseCoverageGaps, generatePhasesPatch } from "./generatePhasesPatch.ts";
import { applyValueCheck } from "./valueCheck.ts";
import { detectLcwFromConfig, buildLcwSignatureReminder, computeLcwChunkSize } from "./lcwSignatureReminder.ts";
import {
  evaluateRepairSportingEquivalence,
  isCompleteRepairWorkoutMetadata,
  normalizeRepairSport,
  type RepairCompatibilityContext,
  type RepairWorkoutMetadata,
} from "../_shared/repairSportingEquivalence.ts";

import { effectiveSessionQuota, countQuotaSessions } from "../_shared/sessionQuotaAccounting.ts";
import { isRaceEventTitle } from "../_shared/raceDayIdentity.ts";

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
  metadata?: RepairWorkoutMetadata;
  legacyTestOnly?: true;
}

/** Explicit escape hatch for legacy unit fixtures only. Production never passes it. */
export const TEST_ONLY_ALLOW_LEGACY_REPAIR_CANDIDATES = Symbol("test-only-legacy-repair-candidates");
type LegacyRepairTestMode = typeof TEST_ONLY_ALLOW_LEGACY_REPAIR_CANDIDATES;

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

function catalogCandidatesFromMetadata(
  entries: RepairWorkoutMetadata[] | null | undefined,
  allowedIds: ReadonlySet<string>,
): CatalogCandidate[] {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter(isCompleteRepairWorkoutMetadata)
    .filter(entry => allowedIds.has(entry.id.toUpperCase()))
    .map(entry => ({
      id: entry.id,
      sport: normalizeSport(entry.sport),
      title: entry.title || entry.objective || entry.id,
      durationMin: entry.durationMin,
      durationMedian: Math.round((entry.durationMin[0] + entry.durationMin[1]) / 2),
      structure: entry.structure,
      zones: entry.zones,
      metadata: entry,
    }));
}

function buildCandidatesByChunk(
  dumps: Array<string | null | undefined>,
  metadata?: RepairWorkoutMetadata[][],
  legacyTestMode?: LegacyRepairTestMode,
): CatalogCandidate[][] {
  return dumps.map((dump, index) => {
    const legacy = parseCatalogCandidatesFromDump(dump);
    // L'autorisation dépend des IDs réellement injectés, pas du parseur
    // historique de durées (ses indices de colonnes précèdent Intention).
    const allowedIds = new Set(extractCatalogIdsFromDump(dump));
    const structured = catalogCandidatesFromMetadata(metadata?.[index], allowedIds);
    if (structured.length > 0) return structured;
    return legacyTestMode === TEST_ONLY_ALLOW_LEGACY_REPAIR_CANDIDATES
      ? legacy.map(candidate => ({ ...candidate, legacyTestOnly: true as const }))
      : [];
  });
}

function repairCandidateCompatibility(
  candidate: CatalogCandidate,
  pool: CatalogCandidate[],
  originalId: string | null | undefined,
  context: RepairCompatibilityContext,
): { compatible: boolean; reasons: string[] } {
  if (candidate.legacyTestOnly && pool.every(item => item.legacyTestOnly)) return { compatible: true, reasons: [] };
  if (!candidate.metadata || candidate.metadata.id.toUpperCase() !== candidate.id.toUpperCase()) {
    return { compatible: false, reasons: ["candidate_metadata_missing_or_id_mismatch"] };
  }
  const original = originalId
    ? pool.find(item => item.id.toUpperCase() === originalId.toUpperCase())?.metadata
    : null;
  return evaluateRepairSportingEquivalence(original, candidate.metadata, context);
}

function repairCandidateCompatible(
  candidate: CatalogCandidate, pool: CatalogCandidate[], originalId: string | null | undefined,
  context: RepairCompatibilityContext,
): boolean {
  return repairCandidateCompatibility(candidate, pool, originalId, context).compatible;
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

// Audit "B-5K-BEGINNER round 2" (suite, JSON réel) : bug réel confirmé —
// applySLFloorEnforcement a substitué 3 sorties longues faciles par
// ENR_RUN_FARTLEK_SCANDINAVE / V2_RUN_SPRINT_PLAT / ENR_RUN_PYRAMIDE_LACTIQUE
// (traces [sl_upgraded] réelles). Cause racine : le dump catalogue réel
// (colonne Structure en PROSE libre, jamais de notation `[Z4,Z5]` entre
// crochets) ne permet jamais à `extractZones` d'extraire quoi que ce soit —
// la classification retombe donc entièrement sur ce vocabulaire texte, qui
// ne couvrait pas "fartlek"/"sprint"/"pyramide" (lactique). Ces séances
// tombaient dans le filtre ENDURANCE générique via le warm-up "Z1→Z2"
// présent dans presque toute fiche. Vocabulaire étendu pour couvrir ces
// formats qualité fréquents du catalogue — classification AVANT le repli
// générique endurance, jamais l'inverse.
function classifyIntensity(zones: string[] | undefined, text: string): IntensityClass {
  const t = (text || "").toLowerCase();
  const zonesU = (zones || []).map(z => (z || "").toUpperCase());
  if (/race[- ]?sim|simulation.*course|race.?pace|allure.?course|sp[eé]cifique.?course/.test(t)) return "race_sim";
  if (zonesU.some(z => /Z[567]/.test(z)) || /\bvo2\b|vma\b|30\/30|15\/15|40\/20|special block|canova|fartlek|\bsprints?\b|pyramide/.test(t)) return "vo2_intensity";
  if (zonesU.some(z => /Z[34]/.test(z)) || /seuil|threshold|tempo|sweet.?spot|lactate|lactique|shuttle|ftp\b/.test(t)) return "tempo_threshold";
  if (/r[eé]cup|recovery|regen|regeneration/.test(t) || (zonesU.length > 0 && zonesU.every(z => /Z1\b/.test(z)))) return "recovery";
  if (zonesU.some(z => /Z2/.test(z)) || /endurance|z1.?z2|fondamental|foncier|\bsl\b|sortie longue|long run|long ride|EF\b|aerobic/.test(t)) return "endurance";
  return "unknown";
}

/** Disciplines endurance couvertes par le plancher "séance clé par sport"
 *  (cf. planValidator.ts::KEY_SESSION_ENDURANCE_SPORTS côté client) — Renfo
 *  a une sémantique de présence différente. Partagé entre applyReconciler
 *  (bloc b, insertion si 0 séance clé) et applyDailySessionFloorEnforcement
 *  (fix A4, audit "génération de plan IA") pour rester une seule définition. */
const KEY_FLOOR_SPORTS = new Set<"swim" | "bike" | "run" | "strength">(["swim", "bike", "run"]);
/** Classes comptant comme "séance clé" pour le plancher par sport — tout sauf
 *  récupération/inconnu. Partagé pour la même raison que KEY_FLOOR_SPORTS. */
const isKeyClass = (cls: IntensityClass) =>
  cls === "endurance" || cls === "tempo_threshold" || cls === "vo2_intensity" || cls === "race_sim";

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
  originalId?: string | null,
  context: RepairCompatibilityContext = {},
): { candidate: CatalogCandidate | null; delta: number } {
  const { ranked } = rankCandidatesBySport(candidates, sport, durationMin);
  const tolerance = computeToleranceMin(durationMin);
  // Filtre intensité : on n'accepte que la même classe ; unknown échoue fermé.
  const viable = ranked.find(x => {
    if (x.delta > tolerance) return false;
    if (!repairCandidateCompatible(x.c, candidates, originalId, context)) return false;
    if (!requiredClass || requiredClass === "unknown") return true;
    const candClass = classifyIntensity(x.c.zones, `${x.c.title} ${x.c.structure}`);
    if (candClass === "unknown") return false;
    return candClass === requiredClass;
  });
  return viable ? { candidate: viable.c, delta: viable.delta } : { candidate: null, delta: -1 };
}

// TODO Phase 2 — Terrain-aware relaxation
// Lorsque le profil athlète déclarera `terrainAvailability` (accès D+/massif/etc.),
// ce guard devra consommer le profil pour relâcher les règles vocabulaire D+ vélo
// (et éventuellement run/brick) pour ces athlètes : ne pas substituer une séance
// custom "4h vélo en massif" si l'athlète a un terrain vallonné confirmé.
export function applyOffsportTrailGuardToChunks(
  chunks: PlanChunk[],
  objective: string | null | undefined,
  catalogDumpsByChunk: Array<string | null | undefined>,
  repairCatalogsByChunk?: RepairWorkoutMetadata[][],
  legacyTestMode?: LegacyRepairTestMode,
): { chunks: PlanChunk[]; repairs: OffsportTrailRepair[] } {
  if (isTrailObjective(objective)) return { chunks, repairs: [] };
  const repairs: OffsportTrailRepair[] = [];
  const candidatesByChunk = buildCandidatesByChunk(catalogDumpsByChunk, repairCatalogsByChunk, legacyTestMode);
  // Repli catalogue global — même bug/même correctif que applyReconciler /
  // applySLFloorEnforcement / applyDailySessionFloorEnforcement (audit
  // "Test_Vince" puis audit systématique du reste du pipeline) : le dump
  // rotationné d'un chunk peut ne contenir aucune fiche de remplacement pour
  // le sport/classe requis, sans que ça reflète une vraie absence côté
  // catalogue complet.
  const allCandidatesAllChunks = candidatesByChunk.flat();
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
        const originalCatalogId = typeof session.catalogId === "string" ? session.catalogId : null;
        // Force custom pour la substitution (un catalogId trail survivant devient custom).
        // PlanSession est une union discriminée par `custom` (planSchema.ts) —
        // basculer le discriminant par mutation directe n'est pas type-safe
        // (TS2322), d'où le passage par `sess` (déjà utilisé juste au-dessus
        // pour le même contournement ciblé, pas un `as any` généralisé).
        if (survivingTrailId) {
          sess.custom = true;
          sess.catalogId = null;
        }
        const targetDur = session.durationMin ?? 0;
        const sessionSport = normalizeSport(session.sport);
        const tolerance = computeToleranceMin(targetDur);
        const requiredClass = classifyIntensity(
          session.zones,
          `${session.title ?? ""} ${session.details ?? ""}`,
        );

        // Substitution primaire same-sport + same intensity class — chunk
        // local d'abord, puis repli catalogue global si rien trouvé (cf.
        // commentaire allCandidatesAllChunks ci-dessus).
        const attemptSubstitution = (pool: typeof candidates) => {
          const originalId = originalCatalogId;
          const compatibilityContext: RepairCompatibilityContext = {
            objective,
            phase: String((week as any).phase ?? ""),
            operation: originalId ? "replacement" : "insertion",
          };
          let res = findCatalogCandidateForSport(pool, sessionSport, targetDur, requiredClass, originalId, compatibilityContext);
          let sport = sessionSport;
          let viaBrick = false;
          // Brick → fallback bike si aucun candidat brick (même classe)
          if (!res.candidate && sessionSport === "brick") {
            res = findCatalogCandidateForSport(pool, "bike", targetDur, requiredClass, originalId, compatibilityContext);
            if (res.candidate) { sport = "bike"; viaBrick = true; }
          }
          return { res, sport, viaBrick };
        };

        let attempt = attemptSubstitution(candidates);
        let searchPool = candidates;
        if (!attempt.res.candidate) {
          const globalAttempt = attemptSubstitution(allCandidatesAllChunks);
          if (globalAttempt.res.candidate) {
            attempt = globalAttempt;
            searchPool = allCandidatesAllChunks;
          }
        }
        let result = attempt.res;
        let attemptedSport = attempt.sport;
        let brickFallback = attempt.viaBrick;

        // Diagnostic (nearest candidates) : classé sur allCandidatesAllChunks
        // — un sur-ensemble de searchPool — pour rester informatif même
        // quand ni le chunk local ni le repli global n'ont abouti. Les
        // champs "...InChunk" ci-dessous restent, eux, spécifiquement des
        // comptes LOCAUX (cf. leur nom) : ils mesurent la rotation catalogue
        // de CE chunk, indépendamment du repli.
        const { ranked } = rankCandidatesBySport(allCandidatesAllChunks, attemptedSport, targetDur);
        const nearest3: OffsportNearestCandidate[] = ranked.slice(0, 3).map(x => ({
          id: x.c.id,
          durationMedian: x.c.durationMedian,
          durationMin: x.c.durationMin,
          deltaMin: x.delta,
        }));
        const sameSportInChunk = rankCandidatesBySport(candidates, attemptedSport, targetDur).sameSport;
        const before = {
          title: session.title ?? "",
          details: session.details ?? "",
          durationMin: targetDur,
        };

        if (!result.candidate) {
          const nearestStr = nearest3.length > 0
            ? nearest3.map(n => {
                const cls = classifyIntensity(
                  allCandidatesAllChunks.find(c => c.id === n.id)?.zones,
                  `${allCandidatesAllChunks.find(c => c.id === n.id)?.title ?? ""} ${allCandidatesAllChunks.find(c => c.id === n.id)?.structure ?? ""}`,
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
            reason: `no catalog candidate within ±${tolerance}min AND same intensity class="${requiredClass}" (sport=${sessionSport}, target=${targetDur}min, sameSportCandidatesInChunk=${sameSportInChunk.length}/${candidates.length}, nearest_global=[${nearestStr}], matchedMarker=${matchedMarker}) — recherché dans le chunk courant ET l'ensemble du catalogue (repli global), aucun match dans les deux`,
            matchedMarker,
            sameSportCandidatesInChunk: sameSportInChunk.length,
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
        const viaGlobalFallback = searchPool === allCandidatesAllChunks;
        repairs.push({
          code: "substituted_offsport",
          severity: "warning",
          chunkIndex: ci,
          weekNumber: week.weekNumber,
          day: session.day,
          sport: session.sport,
          before,
          after: { title: mutable.title, catalogId: candidate.id, durationMin: nextDuration, deltaMin: delta },
          reason: `custom trail vocabulary → ${brickFallback ? "brick→bike fallback" : "same-sport"} catalog substitution (sport=${sessionSport}${brickFallback ? "→bike" : ""}, target=${targetDur}min, tolerance=±${tolerance}min, Δ=${delta}min, sameSportCandidatesInChunk=${sameSportInChunk.length}/${candidates.length}, matchedMarker=${matchedMarker}${viaGlobalFallback ? ", via repli catalogue global (absent du dump local)" : ""})`,
          matchedMarker,
          sameSportCandidatesInChunk: sameSportInChunk.length,
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
  day?: string;
  sameSportCandidatesInChunk?: number;
  totalCandidatesInChunk?: number;
  nearestCandidates?: OffsportNearestCandidate[];
  diagnostics?: {
    originalCatalogId: string | null;
    injectedIds: string[];
    metadataIdsUsed: string[];
    injectedIdsWithoutCompleteMetadata: string[];
    localRejections: Record<string, number>;
    globalRejections: Record<string, number>;
    candidates: Array<{ id: string; scope: string; sourceChunk: number; durationMin: [number, number];
      phases: string[]; zones: string[]; intensity: string; family: string; excludedBy: string[] }>;
  };
  before: { day: string; title: string; details?: string; durationMin: number; catalogId: string | null };
  after?: { day: string; title: string; catalogId: string; durationMin: number };
  reason: string;
}

interface SLWeekFloor {
  floorAudit?: unknown;
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

export function applySLFloorEnforcement(
  chunks: PlanChunk[],
  weeklyQuotas: Record<number, SLWeekFloor> | undefined | null,
  catalogDumpsByChunk: Array<string | null | undefined>,
  repairCatalogsByChunk?: RepairWorkoutMetadata[][],
  objective?: string | null,
  legacyTestMode?: LegacyRepairTestMode,
): { chunks: PlanChunk[]; repairs: SLUpgradeRepair[]; traces: string[] } {
  const repairs: SLUpgradeRepair[] = [];
  const traces: string[] = [];
  if (!weeklyQuotas || typeof weeklyQuotas !== "object") {
    traces.push(`[SL_FLOOR] skipped_reason=no_weekly_quotas_payload`);
    return { chunks, repairs, traces };
  }
  const candidatesByChunk = buildCandidatesByChunk(catalogDumpsByChunk, repairCatalogsByChunk, legacyTestMode);
  // Repli catalogue global — cf. commentaire équivalent dans applyReconciler
  // (bug réel "Test_Vince" : le dump rotationné d'un chunk peut ne contenir
  // AUCUNE fiche endurance/recovery du sport concerné, alors que le catalogue
  // complet en a systématiquement — sans ce repli, ce upgrade abandonnait
  // silencieusement (sl_upgrade_unresolved, critical) faute de candidate
  // locale, alors qu'une fiche valide existait hors du dump de ce chunk).
  const allCandidatesAllChunks = candidatesByChunk.flat();

  chunks.forEach((chunk, ci) => {
    const candidates = candidatesByChunk[ci] ?? [];
    for (const week of chunk.weeks ?? []) {
      // Lookup PAR weekNumber (pas par index — chunk 2 commence à W6).
      const rawEntry = weeklyQuotas[week.weekNumber];
      if (rawEntry?.floorAudit) traces.push(`[sl_floor_pipeline] ${JSON.stringify({ stage: "server_received", week: week.weekNumber, floorAudit: technicalFloorAudit(rawEntry.floorAudit), consumedFloors: technicalFloors(rawEntry.floors) })}`);
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
        const sameSport = (week.sessions ?? []).filter(s => s.sport === spec.sport && !isRaceEventTitle(s));
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
        const originalId = (target as any).catalogId as string | null | undefined;
        const repairContext: RepairCompatibilityContext = {
          objective,
          phase: String((week as any).phase ?? ""),
          weekType: entry.weekType,
          operation: "replacement",
        };

        // These decisions drive BOTH selection and diagnostics. Do not run a
        // separate, more permissive explanation-only filter.
        const auditPool = (pool: typeof candidates, scope: string) => pool
          .filter(c => c.sport === spec.sport)
          .map(c => {
            const cls = classifyIntensity(c.zones, `${c.title} ${c.structure}`);
            const excludedBy = [...repairCandidateCompatibility(c, allCandidatesAllChunks, originalId, repairContext).reasons];
            if (cls !== "endurance" && cls !== "recovery") excludedBy.push(`intensity:${cls}`);
            if (!(c.durationMin[1] >= spec.floor || c.durationMedian >= spec.floor)) excludedBy.push(`duration_max_below_floor:${spec.floor}`);
            return { c, cls, audit: { id: c.id, scope, sourceChunk: candidatesByChunk.findIndex(items => items.includes(c)),
              durationMin: c.durationMin, phases: c.metadata?.phases ?? [], zones: c.zones,
              intensity: cls, family: c.metadata?.intentFamily ?? "legacy_test_only", excludedBy } };
          });
        const localAudit = auditPool(candidates, "chunk");
        const viable = (items: typeof localAudit) => items.filter(x => x.audit.excludedBy.length === 0)
          .sort((a, b) => a.c.durationMedian - b.c.durationMedian);
        const enduranceLocal = viable(localAudit);
        const globalAudit = enduranceLocal.length > 0 ? [] : auditPool(allCandidatesAllChunks, "global_fallback");
        const endurance = enduranceLocal.length > 0 ? enduranceLocal : viable(globalAudit);

        const picked = endurance.find(x => x.c.durationMedian >= spec.floor) ?? endurance[0];

        if (!picked) {
          const rejectionCounts = (items: typeof localAudit) => {
            const counts: Record<string, number> = {};
            for (const item of items) for (const reason of item.audit.excludedBy) counts[reason] = (counts[reason] ?? 0) + 1;
            return counts;
          };
          const injectedIds = extractCatalogIdsFromDump(catalogDumpsByChunk[ci]);
          const metadataIdsUsed = candidates.map(c => c.id);
          const diagnostics = {
            originalCatalogId: originalId ?? null, injectedIds, metadataIdsUsed,
            injectedIdsWithoutCompleteMetadata: injectedIds.filter(id => !metadataIdsUsed.includes(id)),
            localRejections: rejectionCounts(localAudit), globalRejections: rejectionCounts(globalAudit),
            candidates: [...localAudit, ...globalAudit].map(x => x.audit),
          };
          const nearestCandidates = [...localAudit, ...globalAudit]
            .map(({ c }) => ({ id: c.id, durationMedian: c.durationMedian, durationMin: c.durationMin,
              deltaMin: Math.abs(c.durationMedian - spec.floor) }))
            .sort((a, b) => a.deltaMin - b.deltaMin).slice(0, 5);
          traces.push(`[SL_CANDIDATE_AUDIT] S${week.weekNumber} ${spec.sport} floor=${spec.floor} ${JSON.stringify(diagnostics)}`);
          traces.push(`[SL_FLOOR] S${week.weekNumber} (${entry.weekType}) sport=${spec.sport} floor=${spec.floor}min longest=${longest}min action=unresolved (no catalog cand)`);
          repairs.push({
            code: "sl_upgrade_unresolved",
            severity: "critical",
            chunkIndex: ci, weekNumber: week.weekNumber, weekType: entry.weekType,
            sport: spec.sport, floorMin: spec.floor, day: target.day,
            sameSportCandidatesInChunk: localAudit.length, totalCandidatesInChunk: candidates.length,
            nearestCandidates, diagnostics,
            before: {
              day: target.day, title: "séance",
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
          day: target.day, title: "séance",
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
  | "duplicate_catalog_id_replaced" | "duplicate_catalog_id_unresolved"
  | "fasted_session_cap_replaced" | "fasted_session_cap_unresolved";
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
  if (isRaceEventTitle(s) || (s as any).isKeySession === true) return null;
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
/**
 * Nombre de jours (0-7) de repos COMPLET dans la semaine courante — aucune
 * séance ACTIVE ce jour.
 *
 * Audit "B-5K-BEGINNER round 3" (JSON réel 2026-10-14, consigne coach) : avant
 * ce correctif, CHAQUE session comptait ici — y compris les placeholders
 * `sport==="rest"` qu'une semaine valide porte systématiquement pour tout
 * jour sans entraînement (7 jours toujours représentés : repos explicite OU
 * séance active). Résultat : `countsByDay` n'était JAMAIS à 0 pour un jour
 * de repos, donc `rest_floor_breached` se déclenchait quasi systématiquement
 * (11/12 semaines du run réel, y compris des semaines avec 3 jours de repos
 * réels) — faux positif systématique, sans rapport avec le repos effectif du
 * plan livré. Même principe que le réconciliateur CLIENT (`computeLoad`,
 * planReconciler.ts), qui ignore déjà `sport==="rest"` pour calculer la
 * charge par jour.
 */
function countEmptyDays(week: PlanChunk["weeks"][number]): number {
  const countsByDay = new Map<DayLower, number>();
  for (const d of DAY_ORDER_FR) countsByDay.set(d, 0);
  for (const s of week.sessions ?? []) {
    if (s.sport === "rest") continue;
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
  repairCatalogsByChunk?: RepairWorkoutMetadata[][],
  objective?: string | null,
  legacyTestMode?: LegacyRepairTestMode,
): { chunks: PlanChunk[]; repairs: ReconcilerRepair[]; traces: string[] } {
  const repairs: ReconcilerRepair[] = [];
  const traces: string[] = [];
  if (!weeklyQuotas || typeof weeklyQuotas !== "object") {
    traces.push("[RECONCILER] skipped_reason=no_weekly_quotas");
    return { chunks, repairs, traces };
  }
  const candidatesByChunk = buildCandidatesByChunk(catalogDumpsByChunk, repairCatalogsByChunk, legacyTestMode);
  // Bug réel (audit "Test_Vince", plan 703 LCW 8 semaines) : V3_BIKE_FORCE_SFR
  // dupliqué mardi ET jeudi de S1, jamais corrigé malgré le dédoublonnage (c)
  // ci-dessous — root cause : la recherche d'alternative ne regardait QUE
  // candidatesByChunk[ci], le dump catalogue rotationné de CE chunk précis,
  // qui peut ne contenir AUCUNE autre fiche vélo Z3-Z4 (le catalogue complet
  // en a pourtant plusieurs : V3_BIKE_CLIMBING_TEMPO, V3_BIKE_THRESHOLD_2x20,
  // V3_BIKE_OVER_UNDER_ADV...). allCandidatesAllChunks sert de repli global
  // pour ce dédoublonnage déterministe post-génération, où la fiche de repli
  // n'a pas besoin d'avoir figuré dans le prompt du chunk courant.
  const allCandidatesAllChunks = candidatesByChunk.flat();
  // Mots-clés de TOUS les limiteurs identifiés, par rang (L1 en tête) — utilisés
  // pour préférer, à l'insertion d'une séance manquante, une fiche du catalogue
  // qui cible réellement UN des limiteurs identifiés, en priorisant le rang le
  // plus critique parmi ceux matchés, plutôt qu'une séance générique la plus
  // proche en durée (audit qualité plans IA). Fix "traitement des limiteurs" :
  // ne se limitait auparavant qu'à identifiedLimiters[0] (L1 seul) — un plan
  // avec 3-4 limiteurs classés laissait L2/L3/L4 sans AUCUN ciblage mécanique
  // à l'insertion, alors que la matrice de périodisation (systemPrompt.ts)
  // attend explicitement une séance clé dédiée pour L2 dès la Phase Base.
  const limiterKeywordsByRank: string[][] = (identifiedLimiters ?? []).map(l => extractLimiterKeywords(l));

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

      // ────────── (b) INSERT si min ≥1 et 0 séance CLÉ du sport ──────────
      // Bug réel corrigé (audit "génération de plan IA", volet composition
      // hebdomadaire) : ce filet ne se déclenchait que si `present === 0`
      // (aucune séance de ce sport DU TOUT) — un sport avec 2-3 séances
      // toutes classées récupération/technique passait sans jamais recevoir
      // de séance de qualité. Pour swim/bike/run, `present` compte
      // désormais les séances déjà présentes classées endurance/seuil/
      // vo2/race_sim (via classifyIntensity, même classifieur que le pool
      // de candidats juste en dessous) — pas n'importe quelle séance.
      // Renfo garde l'ancien critère de présence simple (sa notion de
      // "clé" n'a pas le même sens).
      if (entry.weekType !== "taper") {
        const sportsToCheck: Array<"swim" | "bike" | "run" | "strength"> = ["swim", "bike", "run", "strength"];
        for (const sport of sportsToCheck) {
          const q = (entry.quota as any)[sport];
          if (!q) continue;
          const effective = effectiveSessionQuota(entry.quota, (week.sessions ?? []).filter(s => s.sport === "brick").length);
          if ((sport === "bike" ? effective.bike.min : q.min) < 1) continue;
          const sportSessions = (week.sessions ?? []).filter(s => s.sport === sport);
          const present = KEY_FLOOR_SPORTS.has(sport)
            ? sportSessions.filter(s => isKeyClass(classifyIntensity((s as any).zones, `${s.title ?? ""} ${(s as any).details ?? ""}`))).length
            : sportSessions.length;
          if (present > 0) continue;
          const activeCount = countQuotaSessions(week.sessions ?? []);
          const sportMax = sport === "bike" ? effective.bike.max : q.max;
          if (sportSessions.length >= sportMax || activeCount >= effective.totalSessions.max) {
            traces.push(`[RECONCILER] S${week.weekNumber} floor ${sport} action=unresolved_quota_full`);
            repairs.push({ code: "insert_unresolved", severity: "critical", chunkIndex: ci,
              weekNumber: week.weekNumber, sport,
              reason: "qualité non identifiée mais quota déjà rempli — aucune insertion ni suppression de séance" });
            continue;
          }
          const floorMin =
            sport === "bike" && entry.floors?.longRideWeekly && entry.floors.slLongRideMin ? entry.floors.slLongRideMin :
            sport === "run"  && entry.floors?.longRunWeekly  && entry.floors.slLongRunMin  ? entry.floors.slLongRunMin  :
            0;
          const targetDur = floorMin > 0 ? floorMin : (sport === "strength" ? 45 : 60);
          // Recherche catalogue : même sport, endurance/recovery, durée >= targetDur
          // Rang du meilleur limiteur matché (0 = L1, 1 = L2, ...) ou Infinity si
          // aucun mot-clé de aucun limiteur identifié ne matche.
          const bestLimiterRank = (c: { title: string; structure: string }): number => {
            if (limiterKeywordsByRank.length === 0) return Infinity;
            const text = `${c.title} ${c.structure}`.toLowerCase();
            for (let rank = 0; rank < limiterKeywordsByRank.length; rank++) {
              if (limiterKeywordsByRank[rank].some(kw => text.includes(kw.toLowerCase()))) return rank;
            }
            return Infinity;
          };
          const buildInsertPool = (src: typeof candidates) => src
            .filter(c => c.sport === sport)
            .filter(c => repairCandidateCompatible(c, allCandidatesAllChunks, null, {
              objective,
              phase: String((week as any).phase ?? ""),
              weekType: entry.weekType,
              operation: "insertion",
            }))
            .map(c => ({ c, cls: classifyIntensity(c.zones, `${c.title} ${c.structure}`) }))
            // Pour swim/bike/run, le pool de réparation doit rester capable de
            // produire une séance CLÉ (cf. present ci-dessus) — "recovery" en est
            // exclu, sinon on réintroduit exactement le contenu que ce filet est
            // censé combler. Renfo garde l'ancien filtre large.
            .filter(x => KEY_FLOOR_SPORTS.has(sport) ? isKeyClass(x.cls) : (x.cls === "endurance" || x.cls === "recovery" || x.cls === "unknown"))
            .filter(x => floorMin === 0 ? true : (x.c.durationMin[1] >= floorMin || x.c.durationMedian >= floorMin))
            // Priorité au limiteur le plus critique matché (rang le plus bas) avant
            // la proximité de durée — auparavant seule la durée comptait, l'insertion
            // ne ciblait jamais aucun limiteur (audit qualité plans IA), puis
            // seulement L1 (audit "traitement des limiteurs").
            .sort((a, b) => {
              const limA = bestLimiterRank(a.c);
              const limB = bestLimiterRank(b.c);
              if (limA !== limB) return limA - limB;
              return Math.abs(a.c.durationMedian - targetDur) - Math.abs(b.c.durationMedian - targetDur);
            });
          // Repli catalogue global si le dump local du chunk n'a rien (cf.
          // commentaire allCandidatesAllChunks en tête de fonction).
          const poolLocal = buildInsertPool(candidates);
          const pool = poolLocal.length > 0 ? poolLocal : buildInsertPool(allCandidatesAllChunks);
          const picked = pool[0]?.c ?? null;
          const pickedLimiterRank = picked ? bestLimiterRank(picked) : Infinity;
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
            // floorMin n'est jamais calculé pour swim (seuls bike/run ont un
            // floor SL dédié) : sans ce cas, une réparation natation n'était
            // jamais taguée clé quel que soit son contenu réel (endurance
            // garanti par le pool ci-dessus pour swim/bike/run).
            isKeySession: KEY_FLOOR_SPORTS.has(sport) ? true : floorMin > 0,
            durationMin: dur,
            zones: picked.zones,
            sport,
            custom: false,
            catalogId: picked.id,
          };
          (week.sessions as any[]).push(newSess);
          const limiterMatchLabel = pickedLimiterRank === Infinity ? "none" : `L${pickedLimiterRank + 1}`;
          traces.push(`[RECONCILER] S${week.weekNumber} insert sport=${sport} day=${dayTarget} → ${picked.id} (${dur}min) limiterMatch=${limiterMatchLabel}`);
          repairs.push({
            code: "session_inserted",
            severity: "warning",
            chunkIndex: ci,
            weekNumber: week.weekNumber,
            sport,
            toDay: dayTarget,
            session: { title: picked.title, catalogId: picked.id, durationMin: dur },
            reason: `quota min=${q.min} for ${sport}, week had 0 sessions → inserted ${picked.id} on ${dayTarget}`
              + (limiterKeywordsByRank.length > 0
                ? (pickedLimiterRank !== Infinity ? ` (cible le limiteur ${limiterMatchLabel})` : " (aucune fiche candidate ne cible un limiteur identifié)")
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
      //
      // Angle mort comblé (retour ChatGPT, même plan "Vince" — Test tlim@vVO2max
      // Billat généré 2× en semaine 2, à 2 jours d'écart, malgré "Éviter : moins
      // de 2 jours depuis dernière séance intense" sur sa propre fiche) : ce
      // dédoublonnage ne regardait QUE `catalogId`, donc une 2e occurrence réécrite
      // en texte libre (`custom:true`) — même protocole, même titre — passait
      // inaperçue. Pour les protocoles de TEST à effort maximal (diagnostic, tlim,
      // 1RM...), on détecte aussi les doublons par signature de titre normalisée,
      // indépendamment de `catalogId`/`custom` — un effort maximal répété à <48h
      // est un vrai risque (fatigue, fiabilité de la mesure), contrairement à une
      // séance d'entraînement ordinaire où la répétition est parfois voulue.
      const ONE_TIME_TEST_TITLE_PATTERN = /\btest\b|\btlim\b|diagnostic|\b1\s*rm\b|contre[- ]la[- ]montre.*test/i;
      const normalizeTestTitleKey = (title: string): string =>
        title
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
      const dedupeKeyForSession = (s: PlanSession): string | null => {
        if (isRaceEventTitle(s)) return null;
        const id = (s as any).catalogId as string | null;
        const isCustom = (s as any).custom === true;
        if (id && !isCustom) return `id:${id}`;
        const title = (s as any).title as string | undefined;
        if (title && ONE_TIME_TEST_TITLE_PATTERN.test(title)) {
          const norm = normalizeTestTitleKey(title);
          return norm ? `test:${norm}` : null;
        }
        return null;
      };
      const idOccurrencesThisWeek = new Map<string, PlanSession[]>();
      for (const s of week.sessions ?? []) {
        if (s.sport === "rest") continue;
        const key = dedupeKeyForSession(s);
        if (!key) continue;
        if (!idOccurrencesThisWeek.has(key)) idOccurrencesThisWeek.set(key, []);
        idOccurrencesThisWeek.get(key)!.push(s);
      }
      const usedIdsThisWeek = new Set(
        [...idOccurrencesThisWeek.keys()]
          .filter((k) => k.startsWith("id:"))
          .map((k) => k.slice(3)),
      );
      for (const [dupKey, occurrences] of idOccurrencesThisWeek) {
        if (occurrences.length < 2) continue;
        // Étiquette lisible pour les traces/reasons — enlève le préfixe interne
        // ("id:"/"test:"). Le champ `session.catalogId` des repairs ci-dessous
        // lit toujours `(victim as any).catalogId` directement (jamais `dupKey`),
        // qui doit rester un catalogId réel ou null.
        const dupLabel = dupKey.startsWith("id:") ? dupKey.slice(3) : dupKey.startsWith("test:") ? `[test] ${dupKey.slice(5)}` : dupKey;
        // Garde la 1re occurrence intacte (probablement la mieux placée / la plus
        // intentionnelle), remplace les suivantes par une alternative du catalogue
        // du même sport et de la même classe d'intensité, non déjà utilisée cette semaine.
        for (let i = 1; i < occurrences.length; i++) {
          const victim = occurrences[i];
          const sport = victim.sport;
          const victimClass = classifyIntensity(victim.zones, `${victim.title} ${victim.details ?? ""}`);
          // Fix B4 (audit "génération de plan IA") : quand la classe de la
          // VICTIME est "unknown" (texte non reconnu par classifyIntensity),
          // l'ancien filtre (`x.cls === victimClass || x.cls === "unknown"
          // || victimClass === "unknown"`) acceptait N'IMPORTE QUELLE classe
          // de remplacement — y compris "recovery" — sans jamais relire ni
          // réécrire `isKeySession`. Une séance clé dupliquée dont le texte
          // ne matche aucun pattern d'intensité connu pouvait ainsi être
          // silencieusement dégradée en récupération. Sans confiance sur la
          // classe d'origine, on ne devine plus : la séance d'origine est
          // conservée telle quelle (le doublon de catalogId reste, mais
          // aucune dégradation de contenu n'est risquée).
          if (victimClass === "unknown") {
            traces.push(`[RECONCILER] S${week.weekNumber} dedupe sport=${sport} ${dupLabel}(x${occurrences.length}) → occurrence #${i + 1} conservée telle quelle (classe victime=unknown, pas de remplacement fiable)`);
            repairs.push({
              code: "duplicate_catalog_id_unresolved",
              severity: "warning",
              chunkIndex: ci,
              weekNumber: week.weekNumber,
              sport,
              session: { title: victim.title ?? "", catalogId: (victim as any).catalogId ?? null, durationMin: victim.durationMin ?? 0 },
              reason: `${dupLabel} utilisé ${occurrences.length}× dans S${week.weekNumber} — classe d'intensité de la séance non reconnue (unknown), remplacement non tenté pour éviter une dégradation silencieuse (ex. vers recovery)`,
            });
            continue;
          }
          const findAlt = (pool: typeof candidates) => pool
            .filter(c => c.sport === sport && !usedIdsThisWeek.has(c.id))
            .filter(c => repairCandidateCompatible(c, allCandidatesAllChunks, (victim as any).catalogId, {
              objective,
              phase: String((week as any).phase ?? ""),
              weekType: entry.weekType,
              operation: "replacement",
            }))
            .map(c => ({ c, cls: classifyIntensity(c.zones, `${c.title} ${c.structure}`) }))
            .filter(x => x.cls === victimClass)
            .sort((a, b) => Math.abs(a.c.durationMedian - (victim.durationMin ?? 0)) - Math.abs(b.c.durationMedian - (victim.durationMin ?? 0)))[0]?.c
            ?? null;
          // Repli catalogue complet (tous chunks) si le dump rotationné de CE
          // chunk ne propose aucune alternative — cf. commentaire allCandidatesAllChunks.
          const alt = findAlt(candidates) ?? findAlt(allCandidatesAllChunks);
          if (alt) {
            const beforeTitle = victim.title ?? "";
            (victim as any).catalogId = alt.id;
            (victim as any).title = alt.title;
            (victim as any).details = `${alt.structure || alt.title}. [ID: ${alt.id}]`;
            (victim as any).zones = alt.zones;
            usedIdsThisWeek.add(alt.id);
            traces.push(`[RECONCILER] S${week.weekNumber} dedupe sport=${sport} ${dupLabel}(x${occurrences.length}) → occurrence #${i + 1} remplacée par ${alt.id}`);
            repairs.push({
              code: "duplicate_catalog_id_replaced",
              severity: "warning",
              chunkIndex: ci,
              weekNumber: week.weekNumber,
              sport,
              session: { title: alt.title, catalogId: alt.id, durationMin: victim.durationMin ?? 0 },
              reason: `${dupLabel} utilisé ${occurrences.length}× dans S${week.weekNumber} — occurrence "${beforeTitle}" remplacée par ${alt.id}`,
            });
          } else {
            traces.push(`[RECONCILER] S${week.weekNumber} dedupe sport=${sport} ${dupLabel}(x${occurrences.length}) → action=unresolved_no_alternative`);
            repairs.push({
              code: "duplicate_catalog_id_unresolved",
              severity: "warning",
              chunkIndex: ci,
              weekNumber: week.weekNumber,
              sport,
              session: { title: victim.title ?? "", catalogId: (victim as any).catalogId ?? null, durationMin: victim.durationMin ?? 0 },
              reason: `${dupLabel} utilisé ${occurrences.length}× dans S${week.weekNumber}, aucune alternative catalogue disponible (sport=${sport}, classe=${victimClass})`,
            });
          }
        }
      }

      // ────────── (c2) PLAFOND cumul séances "à jeun" (Sleep Low / Train Low / Fasted) ──────────
      // Retour ChatGPT (même plan "Vince") : chaque fiche individuelle respecte
      // son propre plafond déclaratif ("1x/sem max" pour Sleep Low, "1-2x/sem
      // max" pour Train Low) mais rien ne plafonnait le CUMUL de deux
      // protocoles DIFFÉRENTS de jeûne/déplétion glycogénique dans la même
      // semaine — observé plusieurs fois (S1, S2, S4) : Sleep Low ET Train Low
      // Fasted la même semaine. Pire : la seule fiche catalogue "Sleep Low"
      // (FATMAX_SLEEP_LOW_PROTOCOL) est taguée vélo — une "Sleep Low → Run AM"
      // générée en texte libre pour un plan course n'a même pas de plafond
      // individuel, catalogue ou pas. On détecte par motif de texte (titre +
      // détails), indépendamment de catalogId/custom, pour couvrir ce cas.
      const FASTED_SESSION_PATTERN = /\bjeun\b|fasted|sleep[\s_-]*low|train[\s_-]*low/i;
      const fastedSessionsThisWeek = (week.sessions ?? []).filter(
        (s) => s.sport !== "rest" && !isRaceEventTitle(s) && FASTED_SESSION_PATTERN.test(`${(s as any).title ?? ""} ${(s as any).details ?? ""}`),
      );
      if (fastedSessionsThisWeek.length > 1) {
        for (let i = 1; i < fastedSessionsThisWeek.length; i++) {
          const victim = fastedSessionsThisWeek[i];
          const sport = victim.sport;
          const victimClass = classifyIntensity(victim.zones, `${victim.title} ${victim.details ?? ""}`);
          if (victimClass === "unknown") {
            traces.push(`[RECONCILER] S${week.weekNumber} fasted-cap sport=${sport} (x${fastedSessionsThisWeek.length}) → occurrence #${i + 1} conservée telle quelle (classe victime=unknown, pas de remplacement fiable)`);
            repairs.push({
              code: "fasted_session_cap_unresolved",
              severity: "warning",
              chunkIndex: ci,
              weekNumber: week.weekNumber,
              sport,
              session: { title: victim.title ?? "", catalogId: (victim as any).catalogId ?? null, durationMin: victim.durationMin ?? 0 },
              reason: `${fastedSessionsThisWeek.length} séances à jeun/train low/sleep low cumulées dans S${week.weekNumber} (max recommandé : 1/sem) — classe d'intensité non reconnue, remplacement non tenté`,
            });
            continue;
          }
          const findAltNonFasted = (pool: typeof candidates) => pool
            .filter(c => c.sport === sport && !usedIdsThisWeek.has(c.id) && !FASTED_SESSION_PATTERN.test(`${c.title ?? ""} ${c.structure ?? ""}`))
            .filter(c => repairCandidateCompatible(c, allCandidatesAllChunks, (victim as any).catalogId, {
              objective,
              phase: String((week as any).phase ?? ""),
              weekType: entry.weekType,
              operation: "replacement",
              allowedCandidateIntentFamilies: ["endurance_fondamentale", "recuperation"],
            }))
            .map(c => ({ c, cls: classifyIntensity(c.zones, `${c.title} ${c.structure}`) }))
            .filter(x => x.cls === victimClass)
            .sort((a, b) => Math.abs(a.c.durationMedian - (victim.durationMin ?? 0)) - Math.abs(b.c.durationMedian - (victim.durationMin ?? 0)))[0]?.c
            ?? null;
          const alt = findAltNonFasted(candidates) ?? findAltNonFasted(allCandidatesAllChunks);
          if (alt) {
            const beforeTitle = victim.title ?? "";
            (victim as any).catalogId = alt.id;
            (victim as any).title = alt.title;
            (victim as any).details = `${alt.structure || alt.title}. [ID: ${alt.id}]`;
            (victim as any).zones = alt.zones;
            usedIdsThisWeek.add(alt.id);
            traces.push(`[RECONCILER] S${week.weekNumber} fasted-cap sport=${sport} (x${fastedSessionsThisWeek.length}) → occurrence #${i + 1} remplacée par ${alt.id}`);
            repairs.push({
              code: "fasted_session_cap_replaced",
              severity: "warning",
              chunkIndex: ci,
              weekNumber: week.weekNumber,
              sport,
              session: { title: alt.title, catalogId: alt.id, durationMin: victim.durationMin ?? 0 },
              reason: `${fastedSessionsThisWeek.length} séances à jeun/train low/sleep low cumulées dans S${week.weekNumber} (max recommandé : 1/sem) — occurrence "${beforeTitle}" remplacée par ${alt.id}`,
            });
          } else {
            traces.push(`[RECONCILER] S${week.weekNumber} fasted-cap sport=${sport} (x${fastedSessionsThisWeek.length}) → action=unresolved_no_alternative`);
            repairs.push({
              code: "fasted_session_cap_unresolved",
              severity: "warning",
              chunkIndex: ci,
              weekNumber: week.weekNumber,
              sport,
              session: { title: victim.title ?? "", catalogId: (victim as any).catalogId ?? null, durationMin: victim.durationMin ?? 0 },
              reason: `${fastedSessionsThisWeek.length} séances à jeun/train low/sleep low cumulées dans S${week.weekNumber}, aucune alternative non-fasted disponible (sport=${sport}, classe=${victimClass})`,
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

export function applyLcwSignatureEnforcement(
  chunks: PlanChunk[],
  catalogDumpsByChunk: Array<string | null | undefined>,
  planConfig: unknown,
  // Fix D2 (audit "génération de plan IA") : décompte des occurrences déjà
  // présentes AILLEURS dans le plan (semaines non incluses dans `chunks`),
  // transmis par le client en régénération semaine seule — voir
  // HandlerInput.regenerateWeek.lcwSignatureCountsElsewhere. `{}` en
  // génération complète/fenêtre : `chunks` y couvre déjà tout le plan.
  alreadySatisfiedElsewhere: Record<string, number> = {},
  repairCatalogsByChunk?: RepairWorkoutMetadata[][],
  legacyTestMode?: LegacyRepairTestMode,
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
  const candidatesByChunk = buildCandidatesByChunk(catalogDumpsByChunk, repairCatalogsByChunk, legacyTestMode);
  const allCandidates = candidatesByChunk.flat();

  for (const target of LCW_HARD_ENFORCED_TARGETS) {
    const hasId = (week: PlanChunk["weeks"][number]) =>
      (week.sessions ?? []).some(s => String((s as any).catalogId ?? "").toUpperCase() === target.id);
    let have = (alreadySatisfiedElsewhere[target.id] ?? 0) + allWeeks.filter(({ week }) => hasId(week)).length;
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
      if (!fiche || !repairCandidateCompatible(fiche, allCandidates, beforeId, {
          objective: (planConfig as any)?.catalogObjective ?? (planConfig as any)?.objective ?? null,
          phase: String((week as any).phase ?? ""),
          operation: "replacement",
        })) {
        traces.push(`[LCW_SIGNATURE] S${week.weekNumber} ${target.id} action=unresolved_sporting_incompatibility`);
        repairs.push({
          code: "lcw_signature_unresolved",
          severity: "critical",
          weekNumber: week.weekNumber,
          catalogId: target.id,
          reason: `remplacement ${beforeId ?? "custom"} → ${target.id} non vérifiable ou sportivement incompatible`,
        });
        continue;
      }
      mutable.title = fiche.title;
      mutable.details = `${fiche.structure || fiche.title}. [ID: ${fiche.id}]`;
      mutable.catalogId = fiche.id;
      mutable.custom = false;
      mutable.durationMin = Math.round(fiche.durationMedian) || mutable.durationMin;
      mutable.zones = fiche.zones;
      if (!sameDaySameSport) mutable.day = target.day;
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
// PLANCHER SÉANCES/JOUR ELITE+ — DÉSACTIVÉ (décision coach, 2026-10-21)
// ─────────────────────────────────────────────────────────────────────────────
// Ce filet forçait l'ajout d'une séance complémentaire quand un jour (hors
// repos) n'avait qu'1 séance pour World Class/Elite/Competitor IM/70.3, au
// nom d'un plancher "2-3 séances/jour OBLIGATOIRE" (systemPrompt.ts /
// promptHelpers.ts). Revue du premier plan réel généré (B-10K-TO-70.3) :
// décision explicite du coach — 1 ou 2 séances/jour sont des choix sportifs
// légitimes ; l'ambition elite ne doit JAMAIS imposer artificiellement une
// séance supplémentaire. Conservé en no-op (plutôt que supprimé) pour
// garder la trace de ce qui a existé et permettre une réactivation future
// si la doctrine change à nouveau — cf.
// planValidator.ts::validateDailySessionFloor (même décision, même date).
interface DailyFloorRepair {
  code: "daily_floor_enforced" | "daily_floor_unresolved";
  severity: "warning" | "critical";
  weekNumber: number;
  day: DayLower;
  reason: string;
}

export function applyDailySessionFloorEnforcement(
  chunks: PlanChunk[],
  weeklyQuotas: Record<number, WeeklyQuotaEntry> | null | undefined,
  catalogDumpsByChunk: Array<string | null | undefined>,
  objective: string | null | undefined,
  ambition: string | null | undefined,
  repairCatalogsByChunk?: RepairWorkoutMetadata[][],
  legacyTestMode?: LegacyRepairTestMode,
): { chunks: PlanChunk[]; repairs: DailyFloorRepair[]; traces: string[] } {
  void weeklyQuotas; void catalogDumpsByChunk; void objective; void ambition;
  void repairCatalogsByChunk; void legacyTestMode;
  return {
    chunks,
    repairs: [],
    traces: ["[DAILY_FLOOR] skipped_reason=rule_disabled_by_coach_decision_2026-10-21"],
  };
}

/** Legacy markdown fixtures must opt in explicitly; the production handler never uses these wrappers. */
export const testOnlyApplyOffsportTrailGuardToChunks = (
  chunks: PlanChunk[],
  objective: string | null | undefined,
  dumps: Array<string | null | undefined>,
  metadata?: RepairWorkoutMetadata[][],
) => applyOffsportTrailGuardToChunks(chunks, objective, dumps, metadata, TEST_ONLY_ALLOW_LEGACY_REPAIR_CANDIDATES);

export const testOnlyApplySLFloorEnforcement = (
  chunks: PlanChunk[],
  quotas: Record<number, SLWeekFloor> | undefined | null,
  dumps: Array<string | null | undefined>,
  metadata?: RepairWorkoutMetadata[][],
  objective?: string | null,
) => applySLFloorEnforcement(chunks, quotas, dumps, metadata, objective, TEST_ONLY_ALLOW_LEGACY_REPAIR_CANDIDATES);

export const testOnlyApplyReconciler = (
  chunks: PlanChunk[],
  quotas: Record<number, any> | null | undefined,
  dumps: Array<string | null | undefined>,
  limiters?: string[] | null,
  metadata?: RepairWorkoutMetadata[][],
  objective?: string | null,
) => applyReconciler(chunks, quotas, dumps, limiters, metadata, objective, TEST_ONLY_ALLOW_LEGACY_REPAIR_CANDIDATES);

export const testOnlyApplyLcwSignatureEnforcement = (
  chunks: PlanChunk[],
  dumps: Array<string | null | undefined>,
  planConfig: unknown,
  alreadySatisfiedElsewhere: Record<string, number> = {},
  metadata?: RepairWorkoutMetadata[][],
) => applyLcwSignatureEnforcement(
  chunks, dumps, planConfig, alreadySatisfiedElsewhere, metadata, TEST_ONLY_ALLOW_LEGACY_REPAIR_CANDIDATES,
);

export const testOnlyApplyDailySessionFloorEnforcement = (
  chunks: PlanChunk[],
  quotas: Record<number, WeeklyQuotaEntry> | null | undefined,
  dumps: Array<string | null | undefined>,
  objective: string | null | undefined,
  ambition: string | null | undefined,
  metadata?: RepairWorkoutMetadata[][],
) => applyDailySessionFloorEnforcement(
  chunks, quotas, dumps, objective, ambition, metadata, TEST_ONLY_ALLOW_LEGACY_REPAIR_CANDIDATES,
);



/**
 * Objectif à utiliser pour construire le profil du system prompt JSON —
 * cf. commentaire au site d'appel dans handleJSONPlanRequest.
 *
 * `planConfig.objective` reste TOUJOURS l'objectif FINAL du plan (design
 * volontaire côté client, cf. PlanConfig.catalogObjective) — jamais
 * l'objectif du cycle en cours pour une fenêtre appartenant à un cycle
 * intermédiaire d'un plan multi-objectifs. `catalogObjective`, quand
 * présent, porte cet objectif de cycle : c'est lui qui doit piloter le
 * verrou sport (buildObjectiveSportLock) et les autres sections du system
 * prompt conditionnées par l'objectif, pour que cette fenêtre reflète ce
 * sur quoi l'athlète s'entraîne réellement pendant cette période.
 */
export function resolveSystemPromptObjective(planConfig: any): string | null {
  return planConfig?.catalogObjective ?? planConfig?.objective ?? null;
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
    // Fix D2 (audit "génération de plan IA") : en régénération semaine
    // seule, l'edge function ne voit QUE cette semaine — elle ne peut pas
    // compter elle-même les occurrences des fiches signature LCW déjà
    // présentes ailleurs dans le plan. Le client (seul à connaître le plan
    // complet) transmet ce décompte pour que applyLcwSignatureEnforcement
    // reste actif au lieu d'être désactivé en bloc (cf. commentaire au site
    // d'appel plus bas).
    lcwSignatureCountsElsewhere?: Record<string, number> | null;
  } | null;
  workoutCatalog?: string;
  phaseCatalogs?: Record<string, string>;
  phaseRepairCatalogs?: Record<string, RepairWorkoutMetadata[]>;
  chunkCatalogs?: string[];
  chunkRepairCatalogs?: RepairWorkoutMetadata[][];
  /**
   * Catalogue RESTREINT (phase forcée "base", donc sans fiches build/peak
   * intenses) pour les semaines de régénération inter-cycles couvertes par
   * chaque chunk — index aligné sur `chunkCatalogs`, chaîne vide si ce chunk
   * ne couvre aucune semaine de régénération. Cf. useAITrainingPlan.ts
   * (construction) et audit "génération de plan IA" (bug "fausse
   * régénération post-pic", plan Emanuela).
   */
  chunkRegenCatalogs?: string[];
  chunkRegenRepairCatalogs?: RepairWorkoutMetadata[][];
  /** Numéros de semaine (locaux) couverts par `chunkRegenCatalogs[i]`, index aligné. */
  chunkRegenWeeks?: number[][];
  catalogDurationStats?: any;
  corsHeaders: Record<string, string>;
  diagnosticContext?: { functionName: string; deploymentId: string | null; executionId: string | null };
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

function resolvePhaseRepairCatalog(
  phase: string,
  phaseCatalogs: Record<string, RepairWorkoutMetadata[]> | undefined,
): RepairWorkoutMetadata[] {
  if (!phaseCatalogs || typeof phaseCatalogs !== "object") return [];
  const phaseMap: Record<string, string> = {
    "fondation": "base", "base": "base", "adaptation": "base",
    "build": "build", "chantier": "build", "consolidation": "build", "développement": "build",
    "spécifique": "peak", "peak": "peak", "race-specific": "peak", "compétition": "peak",
    "affûtage": "taper", "taper": "taper", "pre-race": "taper",
  };
  const key = phaseMap[String(phase ?? "").toLowerCase()] || "build";
  const direct = phaseCatalogs[key];
  if (Array.isArray(direct) && direct.length > 0) return direct;
  for (const fallback of ["build", "base", "peak", "taper"]) {
    if (Array.isArray(phaseCatalogs[fallback]) && phaseCatalogs[fallback].length > 0) return phaseCatalogs[fallback];
  }
  return [];
}

/**
 * Heuristique de phase basée sur la position dans le plan (fallback si pas
 * de phaseCatalog). Bug réel confirmé (audit plan "Vince" 70.3 LCW 8
 * semaines) : sans awareness de l'objectif, le cutoff `pct > 0.92` ne
 * capture que la dernière semaine d'un plan court — sur un 703 (taper
 * attendu = 2 semaines), la semaine S-1 avant la course retombait "peak" au
 * lieu de "taper", alors que le moteur de quotas (weeklyQuotas côté client,
 * lui conscient de taperWeeksForObjective) traitait déjà correctement cette
 * même semaine comme taper (volume réduit). Le LLM recevait deux consignes
 * contradictoires (quota=taper vs phase-guidance=peak) et produisait du
 * contenu taper (openers/shakeouts J-1) sous une étiquette de phase "peak"
 * — exactement le symptôme détecté par checkB11 (fuite_mapping) côté
 * client, jamais corrigé jusqu'ici puisque la source du problème est cette
 * heuristique, pas le contenu généré en lui-même.
 *
 * Bug réel corrigé (audit "système de périodisation", suite) : cette
 * fonction pilote directement `resolvePhaseCatalog` — c'est-à-dire QUELLES
 * fiches catalogue le LLM a le droit de piocher pour un chunk donné. Sur un
 * plan multi-objectifs (raceGoals ≥2 pics complets), elle restait aveugle au
 * découpage en cycles utilisé par `buildStructuredDiagnosticBlock` : la
 * semaine d'une course intermédiaire (ex. Marathon en S22 d'un plan de 40
 * sem vers l'IM) était jugée sur sa position dans les 40 semaines TOTALES
 * (pct=0.55 → "build"), pendant que le texte du prompt exigeait un taper à
 * cette même semaine — le LLM recevait alors des fiches catalogue "build"
 * pour la semaine même de sa course. Le 5e paramètre optionnel
 * `multiObjectiveConfig` (le `planConfig` complet) permet de resegmenter par
 * cycle via `computeMultiObjectiveSegments` (MÊME fonction que la guidance
 * textuelle — une seule source de vérité sur le découpage).
 */
export function inferPhaseFromWeek(
  weekStart: number,
  totalWeeks: number,
  objective?: string | null,
  multiObjectiveConfig?: any,
): string {
  // A window carries the exact slice of the existing full engine calendar.
  const windowPhase = multiObjectiveConfig?.windowWeekPhases?.[weekStart];
  if (windowPhase) return windowPhase;
  if (multiObjectiveConfig?.windowRegenPhase) return multiObjectiveConfig.windowRegenPhase;
  const segments = multiObjectiveConfig ? computeMultiObjectiveSegments(multiObjectiveConfig, totalWeeks) : null;
  if (typeof multiObjectiveConfig?.fondationDurationWeeks === "number" && multiObjectiveConfig.fondationDurationWeeks > 0) {
    const index = segments?.findIndex(s => weekStart >= s.startWeek && weekStart <= s.endWeek) ?? 0;
    if (index < 0) return "base";
    const seg = segments?.[index] ?? { startWeek: 1, endWeek: totalWeeks, objective: objective ?? "" };
    const length = seg.endWeek - seg.startWeek + 1;
    const bounds = periodizationBounds(length, taperWeeksForObjectiveServer(seg.objective),
      normalizeAmbKey(multiObjectiveConfig?.ambitionMeta?.effective ?? multiObjectiveConfig?.ambition ?? "") === "finisher",
      multiObjectiveConfig?.identifiedLimitersRaw?.[0] ?? multiObjectiveConfig?.identifiedLimiters?.[0] ?? "",
      index === 0 ? multiObjectiveConfig.fondationDurationWeeks : reducedFondationWeeksPostPeak(length));
    return phaseWithinPeriodization(weekStart - seg.startWeek + 1, bounds);
  }
  if (segments) {
    const seg = segments.find((s) => weekStart >= s.startWeek && weekStart <= s.endWeek);
    if (seg) {
      const segLen = seg.endWeek - seg.startWeek + 1;
      const localWeek = weekStart - seg.startWeek + 1;
      const segTaperWeeks = Math.max(1, taperWeeksForObjectiveServer(seg.objective));
      if (localWeek > segLen - segTaperWeeks) return "taper";
      const pct = localWeek / Math.max(segLen, 1);
      if (pct <= 0.30) return "base";
      if (pct <= 0.70) return "build";
      return "peak";
    }
    // `weekStart` tombe dans l'intervalle de régénération ENTRE deux cycles
    // (pas couvert par un segment) : volume réduit, pas d'intensité — plus
    // proche des fiches "base" que d'un bloc de charge "build".
    return "base";
  }
  const taperWeeks = Math.max(1, taperWeeksForObjectiveServer(objective));
  if (weekStart > totalWeeks - taperWeeks) return "taper";
  const pct = weekStart / Math.max(totalWeeks, 1);
  if (pct <= 0.30) return "base";
  if (pct <= 0.70) return "build";
  return "peak";
}

export function handleJSONPlanRequest(input: HandlerInput): Response {
  const {
    apiKey, athleteData, planConfig, regenerateWeek,
    workoutCatalog, phaseCatalogs, phaseRepairCatalogs, chunkCatalogs, chunkRepairCatalogs,
    chunkRegenCatalogs, chunkRegenRepairCatalogs, chunkRegenWeeks, catalogDurationStats,
    corsHeaders,
  } = input;

  // Audit "génération de plan IA" — retour coach : plan multi-objectifs
  // (Marathon intermédiaire → Ironman final), le cycle Marathon gardait
  // natation/vélo toute la semaine malgré un catalogue restreint côté client
  // (PR #259) et aucun jour de course Marathon ne se plaçait — cf.
  // resolveSystemPromptObjective pour la cause racine.
  const systemPrompt = getSystemPromptJSON({
    sex: athleteData?.sex ?? planConfig?._athleteSex ?? null,
    age: athleteData?.age ?? null,
    objective: resolveSystemPromptObjective(planConfig),
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
    ? computeLcwChunkSize(
        totalWeeks,
        standardChunkSize,
        (w, tw) => inferPhaseFromWeek(w, tw, planConfig?.objective, planConfig),
      )
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
      controller.enqueue(sseEvent("generation-context", {
        diagnosticRevision: "p3-private-failure.1", release: PLAN_RELEASE_INFO,
        ...technicalRuntimeContext(input.diagnosticContext),
        outputFormat: "json", ...technicalGenerationConfig(planConfig),
      }));
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

        const transportCheck = prevalidateTransport(planConfig ?? {});
        if (transportCheck.status === "blocked") {
          enqueue("error", {code:"PLAN_PREVALIDATION_BLOCKED",message:"Contradiction mécanique avant tout appel modèle.",issues:transportCheck.issues.filter(i=>i.severity==="blocking")});
          stopHeartbeat(); controller.close(); return;
        }
        // Inspect every requested chunk, including later chunks, before the first paid call.
        const preflightWeeks: PrevalidationInputWeek[] = chunks.flatMap((chunk,ci)=>{
          const activePhase=regenerateWeek?.phase??inferPhaseFromWeek(chunk.start,totalWeeks,planConfig?.objective,planConfig);
          const primary=chunkRepairCatalogs?.[ci]?.length?chunkRepairCatalogs[ci]:resolvePhaseRepairCatalog(activePhase,phaseRepairCatalogs);
          const extra=chunkRegenRepairCatalogs?.[ci]??[];
          const dump=chunkCatalogs?.[ci]||resolvePhaseCatalog(activePhase,phaseCatalogs,workoutCatalog);
          const ids=new Set(extractCatalogIdsFromDump(dump??"").concat(extractCatalogIdsFromDump(chunkRegenCatalogs?.[ci]??"")));
          const catalog=[...new Map([...primary,...extra].filter(m=>ids.has(m.id)&&isCompleteRepairWorkoutMetadata(m)).map(m=>[m.id,m])).values()];
          return Array.from({length:chunk.end-chunk.start+1},(_,i)=>{
            const week=chunk.start+i,entry=planConfig?._weeklyQuotas?.[week];
            return {...entry,week,expectedPhase:planConfig?.windowWeekPhases?.[week],globalWeek:week+(planConfig?.globalWeekOffset??0),
              phase:regenerateWeek?.phase??inferPhaseFromWeek(week,totalWeeks,planConfig?.objective,planConfig),
              objective:computeMultiObjectiveSegments(planConfig,totalWeeks)?.find(s=>week>=s.startWeek&&week<=s.endWeek)?.objective??planConfig?.catalogObjective??planConfig?.objective,catalog};
          });
        });
        const preflight=prevalidatePlanWeeks(preflightWeeks,planConfig??{});
        enqueue("prevalidation",{status:preflight.status,issues:preflight.issues});
        if(preflight.status==="blocked") {
          enqueue("error",{code:"PLAN_PREVALIDATION_BLOCKED",message:"Contradiction mécanique avant tout appel modèle.",issues:preflight.issues.filter(i=>i.severity==="blocking")});
          stopHeartbeat();controller.close();return;
        }
        const collectedChunks: PlanChunk[] = [];
        const catalogDumpsByChunk: string[] = [];
        const repairCatalogsByChunk: RepairWorkoutMetadata[][] = [];
        // P2 diversité — mémoire des catalogId déjà consommés par les chunks
        // précédents. Injectée dans le prompt du chunk suivant avec une règle
        // de non-réemploi explicite (interdit ≥2 usages, à éviter à 1 usage).
        const consumedIdCounts = new Map<string, number>();
        const totalChunks = chunks.length;
        console.log(`[trail_probe_path] jsonPlanHandler main loop reached, totalChunks=${totalChunks}, regenerateWeek=${regenerateWeek ? "yes" : "no"}`);

        // Incident réel (coach, 1er test B-10K-TO-70.3) — consigne coach
        // explicite : `_pilotMaxChunks` était câblé UNIQUEMENT dans le chemin
        // Markdown legacy (index.ts:515/716) et jamais ici — alors que le
        // Pilot Cockpit force TOUJOURS `_outputFormat: "json"`
        // (usePilotCockpit.ts:184), donc passe TOUJOURS par CE handler. La
        // boucle tournait donc sur la totalité réelle des chunks (7 pour ce
        // profil 32 semaines) au lieu de s'arrêter à 1 — d'où le timeout
        // serveur (~400s) et les tokens Gemini réellement consommés (31109)
        // pour un résultat jamais transmis au client. Même fonction pure déjà
        // testée (`computePilotChunksToRun`), même log, pour rester cohérent
        // avec le chemin Markdown — comportement inchangé quand absent/≤0.
        const chunksToRun = computePilotChunksToRun(chunks.length, planConfig?._pilotMaxChunks);
        if (chunksToRun < chunks.length) {
          console.log(`🧪 PILOT TEST MODE (_pilotMaxChunks=${planConfig._pilotMaxChunks}) : seuls ${chunksToRun}/${chunks.length} chunk(s) réels seront générés — génération partielle, pas simulée.`);
        }

        for (let ci = 0; ci < chunksToRun; ci++) {
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
          // The fallback follows the chunk's first week, not the window majority.
          // Each week retains its own eligibility and schema phase below.
          const activePhase = regenerateWeek?.phase
            ?? inferPhaseFromWeek(chunk.start, totalWeeks, planConfig?.objective, planConfig);
          const catalogDump = chunkSpecificCatalog
            ?? resolvePhaseCatalog(activePhase, phaseCatalogs, workoutCatalog);

          // Bug réel (audit "génération de plan IA", plan Emanuela, "Bloc 4 ·
          // Régénération post-pic" S22-23) : `catalogDump` ci-dessus est
          // calculé sur la position calendaire brute du CHUNK entier (5
          // semaines) — un chunk peut donc mélanger des semaines de charge
          // normale ET des semaines de régénération inter-cycles sans que le
          // catalogue en tienne compte. On ajoute ici un second bloc,
          // EXPLICITEMENT restreint aux semaines de régénération couvertes
          // par ce chunk (déjà filtré côté client : phase forcée "base",
          // donc sans FTP-threshold/MLSS/squat-deadlift lourd/VO2max/brick
          // long) — sans réduire le catalogue principal, qui reste utilisé
          // tel quel par les autres semaines du même chunk.
          const regenWeeksForChunk = Array.isArray(chunkRegenWeeks) && Array.isArray(chunkRegenWeeks[ci])
            ? chunkRegenWeeks[ci]
            : [];
          const regenCatalogDump = Array.isArray(chunkRegenCatalogs)
            && typeof chunkRegenCatalogs[ci] === "string"
            && chunkRegenCatalogs[ci].length > 0
              ? chunkRegenCatalogs[ci]
              : null;
          const regenCatalogBlock = (regenCatalogDump && regenWeeksForChunk.length > 0)
            ? `\n🔒 CATALOGUE RESTREINT — RÉGÉNÉRATION INTER-CYCLES (${regenWeeksForChunk.map((w) => `S${w}`).join(", ")} UNIQUEMENT) :\n` +
              `Pour ${regenWeeksForChunk.length > 1 ? "ces semaines précisément" : "cette semaine précisément"} (creux volontaire entre deux cycles d'objectifs — vraie récupération, -40% volume, PAS d'intensité), ` +
              `IGNORE le catalogue principal ci-dessus et choisis EXCLUSIVEMENT parmi les fiches ci-dessous (déjà filtrées : aucune fiche build/peak). ` +
              `Les autres semaines de ce bloc continuent d'utiliser normalement le catalogue principal.\n${regenCatalogDump}\n`
            : null;

          catalogDumpsByChunk[ci] = regenCatalogBlock ? `${catalogDump}\n${regenCatalogDump}` : catalogDump;
          const primaryRepairCatalog = Array.isArray(chunkRepairCatalogs?.[ci]) && chunkRepairCatalogs![ci].length > 0
            ? chunkRepairCatalogs![ci]
            : resolvePhaseRepairCatalog(activePhase, phaseRepairCatalogs);
          const regenRepairCatalog = Array.isArray(chunkRegenRepairCatalogs?.[ci])
            ? chunkRegenRepairCatalogs![ci]
            : [];
          const repairById = new Map<string, RepairWorkoutMetadata>();
          for (const metadata of [...primaryRepairCatalog, ...regenRepairCatalog]) {
            if (metadata?.id) repairById.set(metadata.id.toUpperCase(), metadata);
          }
          repairCatalogsByChunk[ci] = [...repairById.values()];

          const allowedIds = extractCatalogIdsFromDump(catalogDump)
            .concat(regenCatalogDump ? extractCatalogIdsFromDump(regenCatalogDump) : []);
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
          const catalogueContractsByWeek: Record<number, CatalogueContract> = {};
          const eligibilityByWeek: Record<number, string[]> = {};
          for (const week of weeksList) {
            const phase = regenerateWeek?.phase ?? inferPhaseFromWeek(week, totalWeeks, planConfig?.objective, planConfig);
            const segment = computeMultiObjectiveSegments(planConfig, totalWeeks)?.find(s => week >= s.startWeek && week <= s.endWeek);
            const contract = { phase, objective: segment?.objective ?? planConfig?.catalogObjective ?? planConfig?.objective,
              weekType: planConfig?._weeklyQuotas?.[week]?.weekType,
              catalog: repairCatalogsByChunk[ci].filter(m => allowedIds.includes(m.id) && isCompleteRepairWorkoutMetadata(m)) };
            catalogueContractsByWeek[week] = contract;
            const { eligible, missingSports, limitedDiversitySports } = catalogueForWeek(contract.catalog, contract,
              catalogueTrainingMinimaForWeek(planConfig?._weeklyQuotas?.[week]?.quota ?? {}, planConfig ?? {}, week));
            eligibilityByWeek[week] = eligible.map(m => m.id);
            if (limitedDiversitySports.length) enqueue("warning", {
              code: "catalogue_diversity_limited", severity: "warning", weekNumber: week,
              eligibleCount: eligible.length, limitedDiversitySports,
              message: `S${week}: diversité catalogue limitée ; dose, placement et plafonds de répétition restent à valider`,
            });
            if (missingSports.length || (allowedIds.length > 0 && eligible.length === 0)) enqueue("warning", {
              code: "catalogue_pool_insufficient", severity: "critical", weekNumber: week,
              eligibleCount: eligible.length, missingSports,
              message: `S${week}: catalogue compatible insuffisant ; aucune relaxation sportive appliquée`,
            });
          }
          const admissibleIds = new Set(Object.values(eligibilityByWeek).flat());
          const filterDump = (dump: string) => dump.split("\n").filter(line => {
            const ids = extractCatalogIdsFromDump(line);
            return ids.length === 0 || ids.every(id => admissibleIds.has(id));
          }).join("\n");
          const executableVariants = executableCatalogueVariantsForWeeks(catalogueContractsByWeek, [...admissibleIds]);
          const weeklyCatalogBlock = `Phases obligatoires calculées par semaine : ${JSON.stringify(Object.fromEntries(Object.entries(catalogueContractsByWeek).map(([w,c]) => [w,c.phase])))}\nADMISSIBILITÉ STRICTE PAR SEMAINE : seuls ces IDs sont autorisés pour chaque semaine. Aucun ID d'une autre semaine du chunk. Catalogue insuffisant : ne pas inventer d'équivalence. Compétitions officielles custom=true, catalogId=null.\n${JSON.stringify(eligibilityByWeek)}\nVariantes numériques autorisées PAR SEMAINE puis ID (variantKey explicite obligatoire pour une adaptation) : ${JSON.stringify(executableVariants)}`;
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
                ).some((wk) => ["build", "peak"].includes(inferPhaseFromWeek(wk, totalWeeks, planConfig?.objective, planConfig))),
              })
            : null;

          const userPrompt = [
            athleteConstraintsBlock || null,
            terrainHardBan || null,
            baseUserPrompt,
            quotasBlock ? `\n${quotasBlock}\n` : null,
            catalogDump ? `\n${filterDump(catalogDump)}\n` : null,
            weeklyCatalogBlock,
            regenCatalogBlock ? filterDump(regenCatalogBlock) : null,
            historyBlock,
            diversityBlock,
            lcwSignatureBlock,
            canonicalRaceCard,
            `\n📋 DIAGNOSTIC STRUCTURÉ (référence cohérence) :\n${structuredDiagnostic}`,
            `\n🎯 CIBLE CHUNK : ${chunkHeader}`,
            `\n📅 weekNumber attendus (obligatoire, sans trou ni doublon) : [${weeksList.join(", ")}]`,
            `\n🚨 PHASE AU DÉBUT DU BLOC : "${activePhase}" — les phases calculées par semaine ci-dessus priment`,
            athleteConstraintsBlock ? `\n${athleteConstraintsBlock}` : null,
          ].filter(Boolean).join("\n");


          const schemaOptions: BuildPlanChunkSchemaOptions = {
            expectedWeekCount,
            catalogueContractsByWeek,
            isFirstChunk: isFirst,
          };

          try {
            const { chunk: planChunk, usedRetry, finishReason, repairDiag, usage: chunkUsage } = await generateChunkJSON({
              apiKey,
              model: PRIMARY_MODEL,
              systemPrompt,
              userPrompt,
              allowedCatalogIds: [...admissibleIds],
              chunkIndex: ci,
              schemaOptions,
              weekRange: { start: chunk.start, end: chunk.end },
              maxTokens: 65536,
            });
            for (const week of planChunk.weeks) for (const session of week.sessions) {
              const result = checkSessionCatalogue(session, catalogueContractsByWeek[week.weekNumber]);
              if (result.unknown.length) enqueue("warning", { code: "catalogue_prescription_unverified", severity: "critical",
                weekNumber: week.weekNumber, catalogId: session.catalogId, reasons: result.unknown,
                message: `S${week.weekNumber}: équivalence non vérifiée (${result.unknown.join(", ")})` });
            }
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
              const msg = `chunk=${ci} attempt=${repairDiag.attempt} repairCount=${repairDiag.repairs.length}`;
              console.warn(`[json_repair] ${msg}`);
              enqueue("warning", {
                code: "json_repair",
                severity: "info",
                message: msg,
                repair: {
                  chunkIndex: ci,
                  attempt: repairDiag.attempt,
                  repairCount: repairDiag.repairs.length,
                },
              });
            }

            enqueue("chunk-progress", {
              chunkIndex: ci, totalChunks, status: "done",
              finishReason,
              // Préparation pilote Mode B (consigne coach, "consulter la
              // consommation") : usage réel du chunk si le gateway le
              // renvoie, pour accumulation côté client. Absent sinon.
              usage: chunkUsage,
            });
          } catch (e) {
            if (e instanceof ChunkGenerationError) {
              enqueue("error", {
                chunkIndex: ci,
                code: e.code,
                message: `Échec technique ${e.code} (bloc ${ci + 1})`,
                details: sanitizeSchemaFailure(e.details),
              });
              controller.close();
              return;
            }
            throw e;
          }
        }

        // Merge déterministe côté serveur : validation continuité + dérivations
        // Incident réel (coach) — suite du correctif `chunksToRun` ci-dessus :
        // `mergePlanChunks` exige une couverture EXACTE de `1..mergedTotal`
        // (sinon `MergePlanError("GAP", ...)`). Avec `_pilotMaxChunks` actif,
        // seules les semaines du dernier chunk RÉELLEMENT généré existent —
        // leur demander de couvrir le `totalWeeks` du plan complet ferait
        // échouer le merge à coup sûr (GAP sur toutes les semaines non
        // générées), même une fois la boucle correctement bornée ci-dessus.
        const mergedTotal = regenerateWeek
          ? 1
          : chunksToRun < chunks.length ? chunks[chunksToRun - 1].end : totalWeeks;
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

          // Audit "génération de plan IA" (suite PR #263/#265) : `isTrailObjective`
          // (dans applyOffsportTrailGuardToChunks) court-circuitait tout le garde-fou
          // dès que l'objectif FINAL du plan était trail — même pour une fenêtre
          // appartenant à un cycle intermédiaire NON trail, où du contenu trail
          // égaré dans les séances aurait dû être détecté et substitué. Utilise
          // `catalogObjective` (l'objectif du cycle EN COURS pour cette fenêtre)
          // quand présent, même logique que `resolveSystemPromptObjective`.
          const guard = applyOffsportTrailGuardToChunks(
            collectedChunks,
            planConfig?.catalogObjective ?? planConfig?.objective ?? null,
            catalogDumpsByChunk,
            repairCatalogsByChunk,
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
            repairCatalogsByChunk,
            planConfig?.catalogObjective ?? planConfig?.objective ?? null,
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
            planConfig?.identifiedLimitersRaw ?? planConfig?.identifiedLimiters ?? null,
            repairCatalogsByChunk,
            planConfig?.catalogObjective ?? planConfig?.objective ?? null,
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
          // Fix D2 (audit "génération de plan IA") : ce filet était désactivé en
          // BLOC dès que regenerateWeek était défini — seule protection restante,
          // un rappel de prompt côté client sans aucune garantie d'exécution,
          // exactement le type de non-fiabilité que ce filet dur a été créé pour
          // couvrir. On reste actif en régénération semaine seule en informant le
          // filet du décompte déjà satisfait ailleurs dans le plan (transmis par
          // le client, seul à connaître le plan complet).
          // Fix D4 (audit "génération de plan IA") : même défaut de visibilité en
          // régénération de FENÊTRE (windowRegenPhase défini) — `chunks` ne couvre
          // alors que la fenêtre, jamais le reste du plan. planConfig.lcwSignatureCountsElsewhere
          // (planWindowRegen.ts::buildWindowRegenConfig, même mécanisme que D2) comble
          // ce blanc symétriquement à regenerateWeek.lcwSignatureCountsElsewhere.
          const lcwEnforced = applyLcwSignatureEnforcement(
            reconciled.chunks,
            catalogDumpsByChunk,
            planConfig,
            regenerateWeek?.lcwSignatureCountsElsewhere ?? planConfig?.lcwSignatureCountsElsewhere ?? {},
            repairCatalogsByChunk,
          );
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
          // Audit "génération de plan IA" (suite PR #263/#265) : ce filet est du
          // code SERVEUR qui peut muter le plan fusionné (insertion forcée d'une
          // séance natation/vélo) — plus dangereux qu'une simple instruction de
          // prompt. Il ne regardait que l'objectif FINAL du plan : pour une
          // fenêtre du cycle intermédiaire Marathon d'un plan Ironman, il pouvait
          // forcer l'ajout d'une séance natation/vélo dans une semaine que le
          // verrou sport (catalogObjective-aware) restreint pourtant à la course.
          // `catalogObjective` (objectif du cycle EN COURS) prime quand présent.
          const dailyFloorEnforced = regenerateWeek
            ? { chunks: lcwEnforced.chunks, repairs: [] as ReturnType<typeof applyDailySessionFloorEnforcement>["repairs"], traces: [] as string[] }
            : applyDailySessionFloorEnforcement(
                lcwEnforced.chunks,
                planConfig?._weeklyQuotas ?? null,
                catalogDumpsByChunk,
                planConfig?.catalogObjective ?? planConfig?.objective ?? null,
                planConfig?.ambitionMeta?.effective ?? planConfig?.ambition ?? null,
                repairCatalogsByChunk,
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

          let merged = regenerateWeek
            ? { totalWeeks: 1, weeks: valueChecked.chunks.flatMap((chunk) => chunk.weeks) }
            : mergePlanChunks(valueChecked.chunks, mergedTotal);

          // Filet actif récap périodisation (`phases`) — voir generatePhasesPatch.ts.
          // Seul le chunk 1 est prompté pour `phases` (systemPromptJSON.ts) ; si
          // son récap ne couvre pas totalWeeks (tronqué/oublié), on tente ICI un
          // patch LLM ciblé plutôt que de livrer un récap troué en silence.
          // No-op en régénération semaine seule (`merged` n'a pas de `phases`
          // dans cette branche — le récap global n'a jamais de sens pour 1 semaine).
          if (!regenerateWeek) {
            const mergedWithPhases = merged as MergedPlan;
            const gaps = computePhaseCoverageGaps(mergedWithPhases.phases, mergedTotal);
            if (gaps.length > 0) {
              const gapsDesc = gaps.map((g) => `S${g.start}-S${g.end}`).join(", ");
              console.warn(`[phases_patch] récap incomplet — trous=[${gapsDesc}] sur totalWeeks=${mergedTotal}`);
              const weekContext = valueChecked.chunks.flatMap((c) =>
                c.weeks.map((w) => ({ weekNumber: w.weekNumber, phase: w.phase, theme: w.theme ?? "" })),
              );
              const patch = await generatePhasesPatch({
                apiKey,
                model: PRIMARY_MODEL,
                objective: planConfig?.objective ?? null,
                totalWeeks: mergedTotal,
                gaps,
                weekContext,
              });
              if (patch && patch.length > 0) {
                const firstChunk = valueChecked.chunks[0];
                firstChunk.phases = [...(firstChunk.phases ?? []), ...patch];
                merged = mergePlanChunks(valueChecked.chunks, mergedTotal);
                const remaining = computePhaseCoverageGaps(merged.phases, mergedTotal);
                if (remaining.length > 0) {
                  const remainingDesc = remaining.map((g) => `S${g.start}-S${g.end}`).join(", ");
                  console.warn(`[phases_patch] patch partiel — trous restants=[${remainingDesc}]`);
                  enqueue("warning", {
                    code: "phases_recap_patch_partial",
                    severity: "warning",
                    message: `[phases_patch] récap de périodisation partiellement complété — semaines non couvertes: [${remainingDesc}]`,
                  });
                } else {
                  console.log(`[phases_patch] trous comblés avec succès: [${gapsDesc}]`);
                }
              } else {
                console.warn(`[phases_patch] échec du patch — trous conservés=[${gapsDesc}]`);
                enqueue("warning", {
                  code: "phases_recap_patch_failed",
                  severity: "warning",
                  message: `[phases_patch] récap de périodisation incomplet — semaines non couvertes: [${gapsDesc}]. Le contenu des semaines reste valide ; vérifie la frise de phases avant utilisation.`,
                });
              }
            }
          }

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
              message: `Erreur technique de fusion (${e.code})`,
            });
          } else {
            throw e;
          }
        }

        stopHeartbeat();
        controller.close();
      } catch (e) {
        console.error("[jsonPlanHandler] fatal:", { code: "INTERNAL_ERROR" });
        try {
          controller.enqueue(sseEvent("error", {
            code: "FATAL",
            message: "Erreur interne de génération",
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
