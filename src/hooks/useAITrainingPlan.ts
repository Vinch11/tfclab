import { prepareGenerationContracts } from "@/lib/plan/prepareGenerationContracts";
import { assessPreparedGeneration, prevalidateTrainingPlan } from "@/lib/plan/prevalidateTrainingPlan";
import { assertPlanPrevalidation, prevalidateDeclaredCalendar, withPrevalidationIssues, type PlanPrevalidation } from "../../supabase/functions/_shared/planPrevalidation";
import { currentPlanReleaseHeaders } from "@/lib/plan/planReleasePreflight";
import { sanitizeSchemaFailure, safeFailureCode, sanitizeWarningEvidence } from "../../supabase/functions/_shared/planFailureDiagnostics";
import { technicalGenerationConfig, technicalGenerationEvent, technicalRelease } from "../../supabase/functions/_shared/planDiagnosticPrivacy";
/**
 * Hook for streaming AI training plan generation
 * ─────────────────────────────────────────────────
 * Two output paths :
 *   • Markdown (legacy) — response=string, downstream parser (aiPlanParser).
 *   • JSON     (Phase 1B) — activated by `planConfig._outputFormat === "json"`.
 *     SSE events (chunk-json / chunk-progress / plan-complete / error) are
 *     validated by Zod, merged via mergePlanChunks, and exposed as `parsedPlan`.
 *     `response` is left empty in this mode; consumers should prefer parsedPlan.
 */
import { traceSLFloorConsumer } from "@/lib/plan/slFloorAudit";
import { formatSLRepairDiagnostic } from "@/lib/plan/slRepairDiagnostics";
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { buildWorkoutCatalog } from "@/lib/workoutCatalogBuilder";
import type { CatalogDurationStats } from "@/lib/workoutCatalogBuilder";
import type { PhaseTag } from "@/types/workoutLibrary";
import { supabase } from "@/integrations/supabase/client";
import { zPlanChunk, type PlanChunk } from "@/lib/plan/planSchema";
import { mergePlanChunks, validateSportObjective, MergePlanError, type MergedPlan, type SportObjectiveIssue } from "@/lib/plan/mergePlanChunks";
import { jsonPlanToParsedPlan } from "@/lib/plan/jsonPlanToParsedPlan";
import { logPlanStat } from "@/lib/plan/planGenerationStats";
import { validateCoachLoadIssues } from "@/lib/plan/coachVolumeValidation";
import { computePlanDiversity, formatDiversitySummary } from "@/lib/plan/diversityMetrics";
import { fetchHistoricalCatalogUsage, serializeHistoricalUsage } from "@/lib/plan/historicalCatalogUsage";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import { inferWeekType } from "@/engines/plan/sessionSizingMatrix";
import { validateWeeklyQuotas, type QuotaIssue, type WeekQuotaEntry } from "@/lib/plan/validateWeeklyQuotas";
import { computeFinalValidationIssues, type FinalValidationIssue } from "@/lib/plan/qa/finalValidation";
import { checkB5, checkB5ToValidationIssues } from "@/lib/plan/qa/checks";
import { buildTargetTable, formatTargetTableBlock, type TargetTable } from "@/lib/plan/targetTable";
import { runReconciler } from "@/lib/plan/planReconciler";
import { normalizeObjectiveKey } from "@/lib/normalizeObjectiveKey";

import { normalizeWeeksAndPhases } from "@/engines/plan/normalizeWeeksPhases";
import { buildWindowRegenConfig, mergeWindowIntoPlan } from "@/engines/plan/planWindowRegen";
import { computeObjectiveCycleSegments } from "@/lib/plan/multiObjectiveClassification";

const PLAN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-training-plan`;

/**
 * JOUR 1 — sécurisation du déploiement (consigne coach explicite) :
 * résout l'URL de génération réellement appelée — fonction de production
 * ("ai-training-plan") par défaut, ou une fonction Edge de TEST distincte
 * (ex. "ai-training-plan-test", copie exacte de la fonction de production
 * sur une branche non fusionnée) quand `pilotFunctionName` est fourni.
 * Extraite en fonction pure (comme `accumulateChunkUsage` ci-dessous) pour
 * rester testable sans mock fetch/SSE — aucun précédent de ce genre dans
 * ce dépôt pour `generatePlan()` lui-même, cf. son propre test.
 * `pilotFunctionName` absent/vide = comportement inchangé (PLAN_URL de
 * production), pour tout appelant existant qui ne le fournit jamais.
 */
export function resolvePlanUrl(supabaseUrl: string, pilotFunctionName?: string): string {
  const functionName = pilotFunctionName && pilotFunctionName.trim().length > 0
    ? pilotFunctionName
    : "ai-training-plan";
  return `${supabaseUrl}/functions/v1/${functionName}`;
}

/** Nombre maximal de blocs standards générés par requête HTTP (cf. generatePlanWindowed). */
export const MAX_CHUNKS_PER_WINDOW = 3;

/**
 * Taille de bloc standard + seuil de chunking pour un objectif donné.
 * Miroir de la sélection faite dans `generatePlan` ci-dessous et côté edge
 * (jsonPlanHandler.ts) — à garder synchronisé si l'un des trois change.
 */
export function computeChunkSizing(objective: string, totalWeeks: number): { chunkSize: number; chunkThreshold: number } {
  const obj = (objective || "").toUpperCase();
  const isTriVerbose = /IRON|IM\b|703|70\.3|TRIATHLON|TRI\b/i.test(obj);
  const isTrailVerbose = /TRAIL\s*(ULTRA|MOUNTAIN|MONT|UTMB|CCC|OCC|LONG)/i.test(obj) || (/TRAIL/i.test(obj) && totalWeeks >= 12);
  return {
    chunkSize: isTriVerbose ? 5 : isTrailVerbose ? 6 : 4,
    chunkThreshold: isTriVerbose ? 6 : isTrailVerbose ? 8 : 6,
  };
}

/** Nombre de blocs standards qu'une génération de `totalWeeks` semaines produirait en une seule requête. */
export function computeTotalChunks(objective: string, totalWeeks: number): number {
  const { chunkSize, chunkThreshold } = computeChunkSizing(objective, totalWeeks);
  return totalWeeks > chunkThreshold ? Math.ceil(totalWeeks / chunkSize) : 1;
}

/** Préparation pilote Mode B (consigne coach, "consulter la consommation") —
 *  usage réel (tokens) accumulé sur une génération JSON complète. */
export interface GenerationUsageTotals {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** Nombre de chunks "done" pour lesquels le gateway a renvoyé un usage exploitable. */
  chunksWithUsage: number;
  /** Nombre total de chunks "done" reçus (avec ou sans usage). */
  totalChunksSeen: number;
}

export function emptyUsageTotals(): GenerationUsageTotals {
  return { promptTokens: 0, completionTokens: 0, totalTokens: 0, chunksWithUsage: 0, totalChunksSeen: 0 };
}

/**
 * Pure, testable sans mock fetch/SSE : accumule un event `chunk-progress`
 * (déjà parsé en JSON) dans les totaux d'usage. N'accumule que sur
 * `status === "done"` (un seul event par chunk réellement complété, cf.
 * jsonPlanHandler.ts) — jamais sur "retry-succeeded"/"generating", qui ne
 * portent pas d'usage et doubleraient le compte sinon.
 */
export function accumulateChunkUsage(
  acc: GenerationUsageTotals,
  chunkProgressEvent: { status?: string; usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number } },
): GenerationUsageTotals {
  if (chunkProgressEvent.status !== "done") return acc;
  const next: GenerationUsageTotals = { ...acc, totalChunksSeen: acc.totalChunksSeen + 1 };
  const u = chunkProgressEvent.usage;
  if (u && (typeof u.promptTokens === "number" || typeof u.completionTokens === "number" || typeof u.totalTokens === "number")) {
    next.chunksWithUsage += 1;
    next.promptTokens += u.promptTokens ?? 0;
    next.completionTokens += u.completionTokens ?? 0;
    next.totalTokens += u.totalTokens ?? 0;
  }
  return next;
}

/**
 * Incident réel #2 (coach, 2e test B-10K-TO-70.3, consigne coach explicite) :
 * `mergePlanChunks(collected, totalWeeks)` exige une couverture EXACTE de
 * `1..totalWeeks` (sinon `MergePlanError("GAP", ...)`) — correct pour une
 * génération normale, mais `_pilotMaxChunks` (Pilot Cockpit UNIQUEMENT) ne
 * produit QUE les premières semaines par construction. Le serveur
 * (jsonPlanHandler.ts) avait déjà été corrigé pour son PROPRE merge interne
 * — mais ce hook fait un second merge, côté client, totalement indépendant
 * (`src/lib/plan/mergePlanChunks.ts`, miroir explicite du fichier serveur),
 * qui ignorait encore `_pilotMaxChunks`.
 *
 * Dérivé des semaines RÉELLEMENT reçues (`weekNumbersReceived`, depuis
 * `collected`), jamais d'une formule recalculée à partir de CHUNK_SIZE —
 * qui peut varier (LCW, cf. `computeLcwChunkSize` côté serveur) et
 * diverger silencieusement de ce que le serveur a réellement produit.
 * Pure, testable sans mock fetch/SSE (même principe que
 * `accumulateChunkUsage` ci-dessus).
 *
 * Strictement gated par `pilotMaxChunks` : absent/≤0 → `totalWeeks`
 * inchangé, donc une génération normale incomplète continue d'échouer la
 * validation GAP exactement comme avant (jamais une acceptation silencieuse
 * de semaines manquantes hors de ce mode explicitement opt-in).
 */
export function computePilotMergedTotalWeeks(
  totalWeeks: number,
  pilotMaxChunks: unknown,
  weekNumbersReceived: number[],
): number {
  const n = Number(pilotMaxChunks);
  if (!Number.isFinite(n) || n <= 0) return totalWeeks;
  if (weekNumbersReceived.length === 0) return totalWeeks;
  return Math.min(totalWeeks, Math.max(...weekNumbersReceived));
}

/**
 * Titre du plan complet assemblé après une génération multi-fenêtres — ne
 * doit JAMAIS reprendre tel quel le titre de la fenêtre 1 (ex: "...15
 * semaines (Bloc 1)"), qui ne décrit que son propre périmètre, pas le plan
 * entier une fois toutes les fenêtres fusionnées (cf. generatePlanWindowed).
 */
export function buildAssembledPlanTitle(
  objective: string | undefined,
  raceName: string | undefined,
  totalWeeks: number,
): string {
  const goalLabel = raceName ? `${objective} — ${raceName}` : objective;
  return `Plan TFCL™ — ${goalLabel} — ${totalWeeks} semaines`;
}

/**
 * Découpe `totalWeeks` semaines en fenêtres d'au plus `maxChunksPerWindow`
 * blocs standards chacune (cf. generatePlanWindowed — évite de dépasser le
 * délai maximal d'exécution du serveur sur un plan long).
 */
export function computeWindowRanges(
  totalWeeks: number,
  chunkSize: number,
  maxChunksPerWindow: number = MAX_CHUNKS_PER_WINDOW,
): Array<{ from: number; to: number }> {
  const weeksPerWindow = maxChunksPerWindow * chunkSize;
  const windows: Array<{ from: number; to: number }> = [];
  for (let start = 1; start <= totalWeeks; start += weeksPerWindow) {
    windows.push({ from: start, to: Math.min(start + weeksPerWindow - 1, totalWeeks) });
  }
  return windows;
}

export interface ObjectiveAwareWindow {
  from: number;
  to: number;
  /** Cycle d'objectif auquel cette fenêtre appartient (plan multi-objectifs
   *  uniquement) — à transmettre tel quel à `buildWindowRegenConfig`. */
  cycle?: { objective: string; startWeek: number; endWeek: number };
}

/**
 * Découpe `totalWeeks` semaines en fenêtres HTTP (≤`maxChunksPerWindow` blocs
 * chacune, cf. `computeWindowRanges`) sans jamais faire chevaucher une
 * fenêtre sur deux cycles d'objectifs différents d'un plan multi-objectifs
 * (`computeObjectiveCycleSegments`) — sinon une course intermédiaire (ex.
 * Marathon en S22 d'un plan de 39 sem vers l'Ironman) tombe dans une fenêtre
 * traitée comme "build vers l'objectif final" au lieu de recevoir son propre
 * taper (bug réel constaté sur un plan coach réel, audit "structure d'un plan
 * multi-objectifs long"). Chaque sous-plage (cycle ou intervalle de
 * régénération entre deux cycles) est elle-même re-découpée en fenêtres de
 * taille standard si elle dépasse `maxChunksPerWindow` blocs.
 */
export function computeObjectiveAwareWindows(
  totalWeeks: number,
  chunkSize: number,
  raceGoals: RaceGoal[] | undefined,
  planStartDate: string | undefined,
  maxChunksPerWindow: number = MAX_CHUNKS_PER_WINDOW,
): ObjectiveAwareWindow[] {
  const cycleSegments = computeObjectiveCycleSegments(raceGoals, planStartDate, totalWeeks);
  if (!cycleSegments) {
    return computeWindowRanges(totalWeeks, chunkSize, maxChunksPerWindow);
  }

  const offsetWindows = (windows: Array<{ from: number; to: number }>, offset: number) =>
    windows.map((w) => ({ from: w.from + offset, to: w.to + offset }));

  const windows: ObjectiveAwareWindow[] = [];
  let cursor = 1;
  for (const seg of cycleSegments) {
    if (seg.startWeek > cursor) {
      // Intervalle de régénération inter-cycles (n'appartient à aucun des
      // deux objectifs) — fenêtre(s) neutre(s), sans `cycle`.
      windows.push(...offsetWindows(computeWindowRanges(seg.startWeek - cursor, chunkSize, maxChunksPerWindow), cursor - 1));
    }
    const cycleWeeks = seg.endWeek - seg.startWeek + 1;
    const cycleRanges = offsetWindows(computeWindowRanges(cycleWeeks, chunkSize, maxChunksPerWindow), seg.startWeek - 1);
    windows.push(...cycleRanges.map((r) => ({ ...r, cycle: { objective: seg.objective, startWeek: seg.startWeek, endWeek: seg.endWeek } })));
    cursor = seg.endWeek + 1;
  }
  if (cursor <= totalWeeks) {
    windows.push(...offsetWindows(computeWindowRanges(totalWeeks - cursor + 1, chunkSize, maxChunksPerWindow), cursor - 1));
  }
  return windows;
}

export { getCatalogSportFilter, getCatalogExclusions, TRAIL_ID_PATTERNS, META_WEEK_TEMPLATE_ID_PATTERNS } from "@/lib/plan/catalogScope";

export interface PlanAthleteData {
  nom?: string;
  sex?: string | null;
  /** Âge (années) — utilisé par F-21 pour réinjecter la section Master >=40/>=50 ans dans le systemPrompt */
  age?: number | null;
  ftp?: number | null;
  weightKg?: number | null;
  vlamax?: number | null;
  vlamaxRun?: number | null;
  vo2max?: number | null;
  vma?: number | null;
  css?: number | null;
  fcMax?: number | null;
  tte?: number | null;
  pmax5s?: number | null;
  p30s?: number | null;
  p60s?: number | null;
  map5min?: number | null;
  paceThresholdSecPerKm?: number | null;
  /** Run MLSS effectif (% VMA au seuil) — observé si pace_threshold dispo, sinon prédit Modèle C (VLamax run + CE) */
  runMLSSEffectivePct?: number | null;
  runMLSSEffectiveSource?: "observed" | "predicted" | "none" | null;
  /** Économie de course (Score G, 1-5) utile pour qualifier la prédiction MLSS */
  runEconomyScore?: number | null;
}

export interface RaceGoal {
  objective: string;
  raceName?: string;
  raceDate?: string;
  weeksUntilRace?: number;
  priority: "A" | "B" | "C";
  /** Format de course : "continuous" (défaut, 70.3/IM/marathon classiques)
   *  ou "lcw_3day" (Long Course Weekend Wales/Belgium : Ven nat / Sam vélo / Dim run). */
  raceFormat?: "continuous" | "lcw_3day" | null;
  /** Trail uniquement — utilisés pour pré-calculer le profil de course (D+/km, séances clés) */
  distanceKm?: number | null;
  elevationGainM?: number | null;
  targetTimeMinutes?: number | null;
  maxAltitudeM?: number | null;
}

/**
 * Profil de course trail pré-calculé côté code et injecté dans le prompt IA.
 * Voir src/lib/trailProfile.ts.
 */
export interface TrailProfileSummary {
  distanceKm: number;
  elevationGainM: number;
  dPlusPerKm: number;
  terrainLabel: string;
  weeklyDPlusPeakM: number;
  weeklyDPlusBaseM: number;
  descentTechnicalRequired: boolean;
  estimatedRaceDurationMin: number | null;
  needsAcclimatation: boolean;
  needsNightSimulation: boolean;
  gutTrainingTargetGPerH: number;
  summary: string;
}

export interface AdaptationProjection {
  leverId: string;
  leverLabel: string;
  impactScore: number;
  impactLabel: string;
  metrics: Array<{
    label: string;
    current: number | null;
    projected: number | null;
    deltaPct: number;
    direction: "up" | "down" | "stable";
  }>;
  performanceImpacts: Array<{
    distance: string;
    improvementPct: number;
  }>;
  recommendation: string;
}

export interface PlanConfig {
  _outputFormat?: "json" | "markdown";
  objective: string;
  /** ID de l'athlète — requis pour la mémoire de diversité inter-plans (P3). */
  athleteId?: string;
  raceName?: string;
  raceDate?: string;
  raceGoals?: RaceGoal[];
  planStartDate?: string;
  weeksAvailable?: number;
  weeklyHours?: number;
  /** Source of a planning target; internal references are never measured load. */
  weeklyHoursSource?: "coach" | "internal-matrix";
  sessionsPerWeek?: number;
  maxSessionsPerDay?: number;
  strengthSessionsPerWeek?: number;
  /**
   * Cycle de décharge coach (override — audit "génération de plan IA", fix
   * F1/UI) : 3 = 2:1 (décharge toutes les 3 semaines), 4 = 3:1 (toutes les 4
   * semaines). Omis = auto-détection par âge (inferWeekType, sessionSizing
   * Matrix.ts : 2:1 dès 40 ans, sinon 3:1).
   */
  deloadCadenceWeeks?: 3 | 4;
  ambition?: string;
  /**
   * Métadonnées de résolution d'ambition (déclassement en amont).
   * `ambition` ci-dessus = ambition EFFECTIVE (utilisée pour tous les calculs dérivés).
   * `ambitionMeta.saisie` = ambition originale du formulaire (affichée à l'utilisateur).
   */
  ambitionMeta?: {
    saisie: string;
    effective: string;
    saisieLabel: string;
    effectiveLabel: string;
    downgraded: boolean;
    trainingLevel: "untrained" | "light" | "trained" | "highly_trained";
    trainingLevelSource: "manual" | "auto-tss" | "fallback-prudent";
    diagnosticNote: string | null;
  };
  constraints?: string;
  identifiedLimiters?: string[];
  /**
   * Liste légère des limiteurs (noms de métriques uniquement, ex: ["VLamax","VO2max","TTE"]).
   * Utilisée pour l'injection dans les chunks 2..N et les heuristiques L1/L2,
   * sans transporter le bloc markdown lourd de `identifiedLimiters` (qui n'est
   * pertinent que pour le chunk 1 — section buildAthleteProfile).
   */
  identifiedLimitersRaw?: string[];
  /**
   * Durée suggérée (semaines) du bloc Chantier consacré au limiteur #1,
   * calculée depuis l'ampleur du gap (status "limiting"/"acceptable"/"optimal"
   * du diagnostic) et bornée par weeksAvailable — cf.
   * computeChantierDurationWeeks (planConfigBuilder.ts). Remplace la valeur
   * générique "3-4 sem" codée en dur dans le prompt système. Reste toujours
   * dans la plage validée par PHASE_DURATION_RANGE (2-6 sem, planValidator.ts).
   */
  chantierDurationWeeks?: number;
  /**
   * Durée suggérée (semaines) du bloc Fondation, calculée depuis le niveau
   * d'entraînement effectif de l'athlète (untrained/light/trained/highly_trained)
   * et bornée par weeksAvailable — cf. computeFondationDurationWeeks
   * (planConfigBuilder.ts). Remplace la valeur générique "3-4 sem" codée en
   * dur dans le prompt système. Reste toujours dans la plage validée par
   * PHASE_DURATION_RANGE (2-6 sem, planValidator.ts).
   */
  fondationDurationWeeks?: number;
  /**
   * Risque blessure RÉEL (Fatigue + VLamax + TTE, cf. computeCAPInjuryRisk /
   * computeBikeInjuryRisk dans injuryRiskUnified.ts), extrait de
   * diagnostic.injuryRisk. Jusqu'ici ce score était calculé, affiché au coach
   * (Dashboard), mais jamais transmis à la génération — ni dans le prompt, ni
   * dans la sélection du catalogue. Consommé par nutritionAndSafetyGuardrails.ts
   * (garde-fou texte) et workoutCatalogBuilder.ts (malus séances à impact
   * élevé). `bike` couvre un trou complet : aucun garde-fou vélo n'existait.
   */
  injuryRisk?: {
    run?: { level: "FAIBLE" | "MODERE" | "ELEVE" | "CRITIQUE"; score: number; why: string; guardrails: string[] };
    bike?: { level: "FAIBLE" | "MODERE" | "ELEVE" | "CRITIQUE"; score: number; why: string; guardrails: string[] };
  };
  activeLevers?: string[];
  prohibitions?: string[];
  /** Décision stratégique calculée par la préparation physiologique partagée. */
  strategyContext?: {
    source: "lorang" | "matrix" | "diagnostic_fallback" | "unavailable";
    primaryAction: string | null;
    confidence: "high" | "moderate" | "low" | "unknown";
    levers: Array<{ id: string; label: string; priority: number; reason: string; adaptations: string[] }>;
    trainingFocus: { do: string[]; avoid: string[] };
    recommendedWeekType: string | null;
  };
  /** Preuve QA de l'origine, de la transmission et des consommateurs connus. */
  physiologicalTrace?: import("@/engines/plan/prepareTrainingPlanContext").TrainingPlanPhysiologicalTrace;
  adaptationProjections?: AdaptationProjection[];
  /**
   * Stratégie de récupération inter-séries utilisée pour calculer les durées
   * de repos via W'bal (Skiba 2012). Par défaut "passive" (0 W).
   *  - "passive"      : récup à 0 W (debout/marche)
   *  - "active-light" : récup à 50% CP (Z1, spinning)
   *  - "active-tempo" : récup à 70% CP (haut Z2, type over-under)
   */
  recoveryStrategy?: "passive" | "active-light" | "active-tempo";
  /**
   * Charge récente de référence (CRR) — TSS 7j contextualisé vs cible objectif.
   * Permet à l'IA de calibrer la progression de volume sans surcharger
   * un athlète déjà chargé ou sous-stimuler un athlète frais.
   */
  recentLoad?: {
    tss7d: number | null;
    source: "NOLIO" | "SNAPSHOT" | "MANUAL" | "UNKNOWN";
    status: "low" | "optimal" | "high" | "overload" | "unknown";
    label: string;
    recommendation: string;
    target: { min: number; opt: number; max: number };
  };
  /**
   * Correction sprint qualité Marathon/Ironman (oct. 2026), #E (demande
   * coach explicite, suite à la découverte d'une hausse de charge 8h→17h
   * sur 4 semaines) : historique de charge DÉCLARATIF, en heures — distinct
   * de `recentLoad` ci-dessus (TSS mesuré, Nolio/snapshot uniquement, cf.
   * `chargeRecenteReference.ts`) et de `weeklyHours` (cible/disponibilité
   * pour CE plan, inchangé). Alimente UNIQUEMENT le bloc prompt informatif
   * (promptHelpers.ts) et `validateLoadHistoryCoherence` (planValidator.ts)
   * — ne modifie JAMAIS `volumeRamp`/`weeklyHours`/`volumeCible` : ces
   * valeurs ne doivent jamais être transformées en TSS fictif ni se
   * substituer à la cible/disponibilité déclarée pour ce plan (invariant
   * explicite, demande coach point 5).
   */
  loadHistory?: {
    /** Volume hebdo chronique tenu AVANT la hausse récente (si une hausse a eu lieu). Jamais déduit si absent. */
    chronicWeeklyHours?: number;
    /** Volume hebdo RÉELLEMENT effectué récemment — peut différer de `weeklyHours` (la cible/disponibilité pour ce plan). */
    recentWeeklyHours?: number;
    /** Nombre de semaines consécutives à ce volume récent. Absent = durée inconnue, jamais estimée. */
    recentWeeksCount?: number;
  };
  /**
   * Correction sprint qualité Marathon/Ironman (oct. 2026), #E : plafond
   * explicite du nombre de journées à 2 séances/jour par semaine (distinct
   * de `maxSessionsPerDay`, qui plafonne le nombre de séances UN jour
   * donné). Coach-déclaré, jamais déduit automatiquement d'une combinaison
   * sessionsPerWeek/jours disponibles — pas de seuil universel.
   */
  maxDoubleDaysPerWeek?: number;
  /**
   * Sprint qualité Marathon/Ironman (oct. 2026) — PRÉPARATION DU PREMIER
   * TEST CONTRÔLÉ (consigne coach explicite) : mode de test EXPLICITEMENT
   * opt-in, réservé au Pilot Cockpit (jamais posé par le formulaire coach
   * normal). Quand présent et > 0, borne le nombre de chunks RÉELLEMENT
   * générés par la fonction Edge `ai-training-plan` (voir sa boucle de
   * chunking, index.ts) à `min(_pilotMaxChunks, nombre réel de chunks du
   * plan)` — permet d'examiner les premières semaines sans lancer
   * automatiquement les chunks suivants. Génération RÉELLE sur les chunks
   * exécutés (jamais simulée) : le chunk 1 ne demande déjà que les semaines
   * de son propre bloc, qu'il soit suivi d'autres chunks ou non. Absent ou
   * ≤0 = comportement inchangé (tous les chunks s'exécutent), y compris
   * pour tout appelant existant qui ne pose jamais ce champ.
   */
  _pilotMaxChunks?: number;
  /**
   * JOUR 1 — sécurisation du déploiement (consigne coach explicite) :
   * mode de test EXPLICITEMENT opt-in, réservé au Pilot Cockpit, qui
   * redirige CET appel de génération vers une fonction Edge de TEST
   * distincte (ex. "ai-training-plan-test", copie exacte de
   * "ai-training-plan" sur une branche non fusionnée) au lieu de la
   * fonction de production utilisée par les athlètes réels. Permet de
   * tester le moteur corrigé sans jamais déployer par-dessus la fonction
   * de production, donc sans aucun risque de rollback à gérer sur celle-ci.
   * Absent = comportement inchangé (fonction de production normale), pour
   * tout appelant existant qui ne pose jamais ce champ.
   */
  _pilotFunctionName?: string;
  _athleteSex?: string | null;
  /** F-EXPRESS — Profil onboardé via Démarrage Express (FC + poids uniquement, confiance 60%).
   *  Injecte un bloc systemPrompt qui force prescription en zones FC + RPE uniquement. */
  _expressFinisher?: boolean;
  /** F-EXPRESS — Préfixe systemPrompt injecté en tête (renforce la règle FC/RPE). */
  _expressFinisherPromptPrefix?: string;
  /** Profil trail pré-calculé (D+/km, terrain, D+ hebdo cible) — injecté chunk 1 uniquement */
  trailProfile?: TrailProfileSummary;
  /**
   * Terrain disponible pour l'entraînement (lieu de vie de l'athlète).
   * Critique pour les athlètes urbains préparant un trail de montagne :
   * permet à l'IA de substituer les séances montagne par des compensations
   * (escaliers, tapis incliné, côtes urbaines, sorties weekend programmées).
   *  - "plat"      : aucun dénivelé accessible en semaine (ex: Bruxelles, Amsterdam)
   *  - "vallonne"  : collines 50-200m D+ accessibles (ex: Liège, Lyon)
   *  - "montagne"  : accès direct montagne (ex: Chamonix, Grenoble)
   *  - "mixte"     : urbain en semaine + accès montagne weekend
   */
  terrainAvailability?: "plat" | "vallonne" | "montagne" | "mixte";
  /**
   * Maintien croisé (vélo/natation) autorisé pendant les cycles course/trail
   * (objectif résolu run_route ou trail — Marathon, Semi, 10K, 5K, Trail...).
   * Coach-configurable (audit "asymétrie vélo/natation", plan Emanuela) : le
   * vélo Z1 léger était toujours autorisé en récupération active mais la
   * natation bannie à 0% sans option pour l'activer, alors que les deux sont
   * physiologiquement valables en maintien léger. Omis = comportement
   * historique (vélo autorisé, natation interdite) — cf.
   * resolveCrossTrainingMaintenance (promptHelpers.ts).
   */
  crossTrainingMaintenance?: { velo?: boolean; natation?: boolean };
  /**
   * Rampe de volume des premières semaines — dérivée de `trainingLevel`, puis
   * réconciliée avec la Charge Récente de Référence (CRR) réellement mesurée
   * (NOLIO/SNAPSHOT) via `resolveVolumeRampLoadAdjustment` (planConfigBuilder.ts) :
   * une charge réelle basse ou en surcharge abaisse le palier effectif utilisé
   * pour la rampe, sans jamais le faire pour une simple estimation manuelle
   * dérivée du niveau déclaré lui-même (pas de circularité). `trainingLevel`
   * reste le niveau déclaré par le coach ; `recentLoadAdjustment` n'apparaît
   * que si la CRR mesurée a effectivement abaissé le palier.
   * Contrainte dure injectée chunk 1 pour borner Sem 1 et le ramp-up.
   * Absent si `trainingLevel` non fourni.
   */
  volumeRamp?: {
    trainingLevel: "untrained" | "light" | "trained" | "highly_trained";
    week1PctTarget: number;       // 0-1 (ex: 0.40 = 40% du volume cible Sem 1)
    rampWeeks: number;            // Nombre de semaines pour atteindre weeklyHours
    week1HoursCap: number | null; // Plafond absolu Sem 1 (h), null si pas de cap
    weeklyHoursTarget: number;    // Rappel cible
    week1HoursMax: number;        // Sem 1 effective max (h)
    weeklyIncreasePctMax: number; // Progression max/sem (ex: 0.10 = +10%/sem)
    /** Présent uniquement si la CRR réellement mesurée a abaissé le palier déclaré. */
    recentLoadAdjustment?: {
      effectiveLevel: "untrained" | "light" | "trained" | "highly_trained";
      reason: string;
    };
  };
  /**
   * ─── RÉGÉNÉRATION DE FENÊTRE — contexte de position globale ───────────────
   * Renseigné UNIQUEMENT par `planWindowRegen.ts` lors d'une régénération
   * partielle. Absent (undefined) en génération complète normale = AUCUN
   * changement de comportement (fallback sur `weeksAvailable`/`totalWeeks`).
   *
   * Sans ce contexte, une fenêtre de N semaines régénérée au milieu d'un plan
   * de M semaines (N << M) est traitée comme un mini-plan frais de N semaines
   * avec son propre cycle base/build/peak/taper — donnant par ex. une phase
   * "taper" à la dernière semaine de la fenêtre alors qu'elle est en plein
   * bloc Build dans le plan réel. `globalTotalWeeks`/`globalWeekOffset`
   * permettent de calculer phase/type de semaine/quotas par rapport à la
   * VRAIE position globale, sans changer le nombre de semaines générées.
   */
  globalTotalWeeks?: number;
  globalWeekOffset?: number;
  /**
   * Nom de phase catalogue dominant de la fenêtre ("base"|"build"|"peak"|"taper"),
   * pré-calculé par `planWindowRegen.ts` à partir de la position globale.
   * Utilisé côté edge pour forcer la sélection du bon catalogue de séances
   * (sinon toujours "base", cf. bug confirmé : en génération non-chunkée,
   * `chunk.start` vaut 1 donc `inferPhaseFromWeek(1, N)` retombe sur "base").
   */
  windowRegenPhase?: string;
  /** Slice of the full engine calendar, shared by prompt, quotas and server contracts. */
  windowWeekPhases?: Record<number, PhaseTag>;
  /**
   * Objectif à utiliser pour le SCORING/FILTRAGE du catalogue de séances
   * (`buildWorkoutCatalog`'s `objective` param — tags `goals`, cf.
   * `normalizeGoal`), quand il diffère de `objective` (verrou sport,
   * exclusions, texte de prompt — inchangés). Renseigné par
   * `planWindowRegen.ts` quand la fenêtre appartient à un cycle d'objectif
   * intermédiaire d'un plan multi-objectifs (`computeObjectiveCycleSegments`).
   *
   * Bug réel (audit "bibliothèque de séances", plan Manu Marathon S1-S22 +
   * Ironman S25-S39) : sans ce champ, `buildWorkoutCatalog` était TOUJOURS
   * appelé avec l'objectif FINAL du plan (`objective`, ex. "Ironman"), même
   * pour les semaines du cycle Marathon intermédiaire — le taper avant le
   * marathon piochait donc dans le pool de séances calibrées Ironman
   * (allures/watts IM) plutôt que dans le pool marathon (allure course,
   * taper spécifique 42km), alors que la PHASE (taper) était déjà correcte
   * depuis le fix précédent (`windowRegenPhase`).
   */
  catalogObjective?: string;
  /**
   * Fix D4 (audit "génération de plan IA") : décompte des occurrences des
   * fiches signature LCW (B_LCW_BIKE_LONG_RACE_SAT / B_LCW_RUN_OFF_LEGS_SUN)
   * déjà présentes AILLEURS dans le plan (hors de la fenêtre régénérée),
   * pré-calculé par `planWindowRegen.ts` à partir de la visibilité
   * plan-entier du client. Sans ce contexte, le filet dur côté edge
   * (applyLcwSignatureEnforcement) ne voit QUE les semaines de la fenêtre —
   * il peut forcer un week-end LCW en double dans chaque fenêtre régénérée
   * (quota déjà satisfait ailleurs) ou, si la checklist prompt-side est
   * suffisante, signaler une non-résolution qui n'en est pas une. Même
   * mécanisme que `HandlerInput.regenerateWeek.lcwSignatureCountsElsewhere`
   * (fix D2), étendu à la régénération de fenêtre.
   */
  lcwSignatureCountsElsewhere?: Record<string, number> | null;
}

export interface ChunkProgress {
  currentWeek: number;
  totalWeeks: number;
  currentChunk: number;
  totalChunks: number;
}

/** Complete read-only scope: all known windows are checked before any generation. */
export function prevalidateGenerationScope(athlete:PlanAthleteData,config:PlanConfig,options:Parameters<typeof prepareGenerationContracts>[2]={}) {
  const totalWeeks=config.weeksAvailable??0;
  if(config._outputFormat!=="json"||computeTotalChunks(config.objective??"",totalWeeks)<=MAX_CHUNKS_PER_WINDOW) return prevalidateTrainingPlan(athlete,config,options).report;
  const {chunkSize}=computeChunkSizing(config.objective??"",totalWeeks);
  const windows=computeObjectiveAwareWindows(totalWeeks,chunkSize,config.raceGoals,config.planStartDate);
  const reports=windows.map(({from,to,cycle},i)=>{
    const currentPlan:ParsedPlan={title:"Prévalidation",phases:[],totalWeeks,weeks:i===windows.length-1?[]:[{weekNumber:to+1,theme:"Suite du plan",phase:"build",sessions:[]}]};
    const {config:local}=buildWindowRegenConfig({fromWeek:from,toWeek:to,currentPlan,athleteData:athlete,baseConfig:config,cycle});
    return {from,report:prevalidateTrainingPlan(athlete,{...local,volumeRamp:config.volumeRamp},options).report};
  });
  const issues=reports.flatMap(({from,report})=>report.issues.map(issue=>({...issue,week:issue.week===0?0:from+issue.week-1})));
  return withPrevalidationIssues({status:issues.some(i=>i.severity==="blocking")?"blocked":issues.length?"coach_review":"admissible",issues,
    weeks:reports.flatMap(({from,report})=>report.weeks.map(w=>({...w,cycleWeek:w.globalWeek,globalWeek:from+w.week-1,week:from+w.week-1}))),limiterPriorities:[...(config.identifiedLimitersRaw??[])]} as PlanPrevalidation,prevalidateDeclaredCalendar(config,totalWeeks));
}

export function useAITrainingPlan() {
  const [prevalidation, setPrevalidation] = useState<PlanPrevalidation|null>(null);
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Audit coach (plan Manu 40 sem) : une génération longue (>3 blocs standards)
  // dépasse le délai maximal d'exécution du serveur (~400s) avant même d'avoir
  // pu émettre le moindre bloc au navigateur (cf. generatePlanWindowed plus
  // bas). `isBatchGenerating` couvre TOUTE la séquence multi-requêtes, alors
  // que `isLoading` (interne à generatePlan) se remet à `false` entre deux
  // fenêtres — sans ce second flag, l'UI ("Générer" ré-activable) laisserait
  // croire que c'est fini entre deux requêtes.
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [chunkProgress, setChunkProgress] = useState<ChunkProgress | null>(null);
  // Préparation pilote Mode B (consigne coach, "consulter la consommation") —
  // usage réel (tokens) accumulé sur TOUS les chunks de la dernière
  // génération JSON, si le gateway l'a renvoyé pour chaque chunk ; `null`
  // sinon (jamais une valeur inventée). Remis à `null` à chaque nouvel appel
  // de `generatePlan` (chemin JSON).
  const [lastGenerationUsage, setLastGenerationUsage] = useState<GenerationUsageTotals | null>(null);
  // Phase 1B — populated only when server ran the JSON path.
  const [parsedPlan, setParsedPlan] = useState<ParsedPlan | null>(null);
  const [mergedPlan, setMergedPlan] = useState<MergedPlan | null>(null);
  const [sportObjectiveIssues, setSportObjectiveIssues] = useState<SportObjectiveIssue[]>([]);
  // Phase 2A — issues remontées par la validation post-merge du quota hebdo.
  const [weeklyQuotaIssues, setWeeklyQuotaIssues] = useState<QuotaIssue[]>([]);
  // Audit scientifique P0 — F12 : issues B13 (critique)/B14 (avertissement)
  // de la validation finale post-mutations, exposées en plus de `parsed.
  // finalValidationIssues` (seul le champ sur `parsed` est garanti d'être
  // visible dans AIPlanViewer ; cet état sert aux consommateurs qui ont
  // besoin d'y réagir sans dépendre du rendu du viewer).
  const [finalValidationIssues, setFinalValidationIssues] = useState<FinalValidationIssue[]>([]);
  // Finalisation PR #383 ("preserve-repair-intent") — Correction 2 (suite) :
  // issues B5 (catalogId ⊂ catalogue injecté) sur le plan réel, exposées en
  // plus de `parsed.catalogIdIssues` — même convention que
  // `finalValidationIssues`/`weeklyQuotaIssues` ci-dessus.
  const [catalogIdIssues, setCatalogIdIssues] = useState<ReturnType<typeof checkB5ToValidationIssues>>([]);
  const lastWeeklyQuotasRef = useRef<Record<number, WeekQuotaEntry>>({});
  // Phase 0 QA — union des catalogId injectés (phase + chunks) pour check B5.
  // Peuplée dans generatePlan une fois les catalogues bâtis, avant l'appel edge.
  const lastAllowedCatalogIdsRef = useRef<string[]>([]);
  // Résultat brut du dernier run — lisible IMMÉDIATEMENT après `await generatePlan`
  // (les states React ne sont pas encore rafraîchis dans le closure appelant).
  const lastResponseRef = useRef<string>("");
  const lastParsedPlanRef = useRef<ParsedPlan | null>(null);

  const planningSnapshotRef=useRef<{key:string;options:Promise<NonNullable<Parameters<typeof prepareGenerationContracts>[2]>>}|null>(null);
  const resolvePlanningOptions=useCallback(async(athlete:PlanAthleteData,config:PlanConfig)=>{
    // In-memory identity only; never logged or sent to a model.
    const key=JSON.stringify({athlete,config});
    if(planningSnapshotRef.current?.key===key)return planningSnapshotRef.current.options;
    const options=fetchHistoricalCatalogUsage(config.athleteId).then(historicalUsage=>({historicalUsage,rotationSeed:Date.now()}));
    planningSnapshotRef.current={key,options};return options;
  },[]);

  const previewPlan = useCallback(async(athlete:PlanAthleteData,config:PlanConfig)=>{
    let report:PlanPrevalidation;
    try { report=prevalidateGenerationScope(athlete,config,await resolvePlanningOptions(athlete,config)); }
    catch (error) { report={status:"blocked",issues:[{week:0,code:error instanceof Error&&error.message==="PREVALIDATION_INVALID_DURATION"?"prevalidation_duration_invalid":"prevalidation_input_invalid",severity:"blocking"}],weeks:[]}; }
    if(planningSnapshotRef.current?.key===JSON.stringify({athlete,config}))setPrevalidation(report);
    return report;
  },[resolvePlanningOptions]);

  const generationInFlightRef=useRef(false);
  const batchInFlightRef=useRef(false);
  const generatePlan = useCallback(async (athleteData: PlanAthleteData, planConfig: PlanConfig & { _outputFormat?: "json" | "markdown" }, frozenOptions?:Parameters<typeof prepareGenerationContracts>[2]) => {
    // Guard against double-fire
    if (isLoading || generationInFlightRef.current) {
      console.warn("Plan generation already in progress — ignoring duplicate call");
      return;
    }
    const totalWeeks = planConfig.weeksAvailable;
    if (!totalWeeks || totalWeeks <= 0) {
      toast.error("Durée du plan manquante. Renseigne une date de course ou une durée libre (formulaire coach).");
      return;
    }
    // Position globale pour la périodisation (cf. PlanConfig.globalTotalWeeks) :
    // égale à totalWeeks/0 en génération complète normale (aucun changement).
    const effTotalWeeks = planConfig.globalTotalWeeks ?? totalWeeks;
    const weekOffset = planConfig.globalWeekOffset ?? 0;
    generationInFlightRef.current=true;
    setIsLoading(true);
    const jsonMode = planConfig._outputFormat === "json";
    // Match edge function's chunk sizing
    const obj = (planConfig.objective || "").toUpperCase();
    const isTriVerbose = /IRON|IM\b|703|70\.3|TRIATHLON|TRI\b/i.test(obj);
    const isTrailVerbose = /TRAIL\s*(ULTRA|MOUNTAIN|MONT|UTMB|CCC|OCC|LONG)/i.test(obj) || (/TRAIL/i.test(obj) && totalWeeks >= 12);
    const isVerbose = isTriVerbose || isTrailVerbose;
    const CHUNK_SIZE = isTriVerbose ? 5 : isTrailVerbose ? 6 : 4;
    const chunkThreshold = isTriVerbose ? 6 : isTrailVerbose ? 8 : 6;
    const needsChunking = totalWeeks > chunkThreshold;
    const totalChunks = needsChunking ? Math.ceil(totalWeeks / CHUNK_SIZE) : 1;
    setChunkProgress(totalChunks > 1 ? { currentWeek: 0, totalWeeks, currentChunk: 1, totalChunks } : null);

    try {
      const options=frozenOptions??await resolvePlanningOptions(athleteData,planConfig);
      const preparation = prepareGenerationContracts(athleteData, planConfig, options);
      const historicalUsage=preparation.historicalUsage;
      const { phaseCatalogs, phaseRepairCatalogs, chunkCatalogs, chunkRepairCatalogs,
        chunkRegenCatalogs, chunkRegenRepairCatalogs, chunkRegenWeeks,
        catalogDurationStats, weeklyQuotas, quotasByChunkText, beginnerIntensitySignal } = preparation;
      lastAllowedCatalogIdsRef.current = preparation.allowedCatalogIds;
      const prevalidation = assessPreparedGeneration(planConfig, preparation);
      setPrevalidation(prevalidation);
      assertPlanPrevalidation(prevalidation);
    setResponse("");
    lastResponseRef.current = "";
    lastParsedPlanRef.current = null;
    setParsedPlan(null);
    setMergedPlan(null);
    setSportObjectiveIssues([]);
    setWeeklyQuotaIssues([]);
    setCatalogIdIssues([]);
    setLastGenerationUsage(null);

      lastWeeklyQuotasRef.current = weeklyQuotas;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Session expirée, reconnectez-vous.");
        logPlanStat({
          ts: Date.now(),
          format: jsonMode ? "json" : "markdown",
          objective: planConfig.objective ?? null,
          totalWeeks, totalChunks, durationMs: 0, ok: false,
          errorCode: "AUTH_MISSING",
          errorMessage: "Aucune session Supabase active — impossible d'appeler l'edge function.",
        });
        setIsLoading(false);
        return;
      }

      // ─── PHASE 2B : Target Table (source unique des valeurs physiologiques) ───
      let targetTable: TargetTable | null = null;
      try {
        targetTable = buildTargetTable({
          ftp: athleteData.ftp ?? null,
          vma: athleteData.vma ?? null,
          css: athleteData.css ?? null,
          fcMax: athleteData.fcMax ?? null,
          paceThresholdSecPerKm: athleteData.paceThresholdSecPerKm ?? null,
          vlamax: athleteData.vlamax ?? null,
          vlamaxRun: athleteData.vlamaxRun ?? null,
          vo2max: athleteData.vo2max ?? null,
          weightKg: athleteData.weightKg ?? null,

          objective: planConfig.objective ?? null,
          // Clé canonique ("world_class"), jamais le libellé UI (planConfig.ambition,
          // ex. "Elite") : buildTargetTable → deriveRaceTargets fait un lookup exact
          // sur la clé interne historique "elite", qui collisionne avec ce libellé
          // (palier world_class depuis le relabeling — src/types/ambitionLevel.ts).
          ambition: planConfig.ambitionMeta?.effective ?? planConfig.ambition ?? null,
          weeklyHours: planConfig.weeklyHours ?? null,
          trainingLevel: planConfig.ambitionMeta?.trainingLevel ?? null,
          // Bug réel (ChatGPT, plan 10K "Vince") : sans ce champ, l'allure
          // "cible course" injectée dans le prompt (tblBlock ci-dessous, à
          // CHAQUE chunk) venait uniquement du palier d'ambition, ignorant un
          // temps cible explicite saisi par le coach pour cet objectif —
          // cf. deriveRaceTargets.ts pour le détail du mécanisme.
          targetTimeMinutes: (Array.isArray(planConfig.raceGoals)
            ? planConfig.raceGoals.find(g => g?.objective === planConfig.objective)?.targetTimeMinutes
            : null) ?? null,
        });
        const tblBlock = formatTargetTableBlock(targetTable);
        // Injecter dans chaque chunk (rappel de la table à chaque appel LLM)
        for (let i = 0; i < quotasByChunkText.length; i++) {
          quotasByChunkText[i] = quotasByChunkText[i]
            ? `${tblBlock}\n\n${quotasByChunkText[i]}`
            : tblBlock;
        }
        console.log("🔢 targetTable built:", {
          ftpW: targetTable.ftpW, vmaKmh: targetTable.vmaKmh, css: targetTable.cssSecPer100m,
          racePowerW: targetTable.racePowerW, racePaceSecPerKm: targetTable.racePaceSecPerKm,
        });
      } catch (e) {
        console.warn("[useAITrainingPlan] targetTable build failed:", e);
      }

      // Enrichit planConfig avec les quotas + target table (transmission edge)
      const planConfigWithQuota = {
        ...planConfig,
        _weeklyQuotas: weeklyQuotas,
        _weeklyQuotasPromptByChunk: quotasByChunkText,
        _targetTable: targetTable,
        // P3 diversité — historique athlète transmis au prompt (bloc anti-réemploi).
        _historyUsedIdCounts: historicalUsage.size > 0 ? serializeHistoricalUsage(historicalUsage) : undefined,
      };

      // JOUR 1 — sécurisation du déploiement : voir resolvePlanUrl ci-dessus.
      const planUrl = planConfig?._pilotFunctionName
        ? resolvePlanUrl(import.meta.env.VITE_SUPABASE_URL, planConfig._pilotFunctionName)
        : PLAN_URL;
      for (const [week, entry] of Object.entries(weeklyQuotas)) traceSLFloorConsumer("transmitted", Number(week), entry);
      console.info("[generation_contract_client]", {
        release: typeof __PLAN_RELEASE_INFO__ === "undefined" ? null : __PLAN_RELEASE_INFO__,
        clientBuild: typeof __APP_VERSION__ === "undefined" ? null : __APP_VERSION__,
        buildTime: typeof __BUILD_TIME__ === "undefined" ? null : __BUILD_TIME__,
        functionName: planUrl.split("/functions/v1/")[1] ?? "unavailable", outputFormat: planConfig._outputFormat ?? "markdown",
        ...technicalGenerationConfig(planConfig),
      });
      const releaseHeaders = await currentPlanReleaseHeaders(planUrl, token);
      const resp = await fetch(planUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...releaseHeaders,
          Authorization: `Bearer ${token}`,
          ...(jsonMode ? { "X-Plan-Output-Format": "json" } : {}),
        },
        body: JSON.stringify({
          athleteData,
          planConfig: planConfigWithQuota,
          phaseCatalogs,
          phaseRepairCatalogs,
          chunkCatalogs: chunkCatalogs.length > 0 ? chunkCatalogs : undefined,
          chunkRepairCatalogs: chunkRepairCatalogs.length > 0 ? chunkRepairCatalogs : undefined,
          // Bloc catalogue restreint dédié aux semaines de régénération
          // inter-cycles (cf. commentaire au site de construction) — index
          // aligné sur chunkCatalogs, chaîne vide/tableau vide pour un chunk
          // sans semaine de régénération.
          chunkRegenCatalogs: chunkRegenCatalogs.some((c) => c.length > 0) ? chunkRegenCatalogs : undefined,
          chunkRegenRepairCatalogs: chunkRegenRepairCatalogs.some((c) => c.length > 0) ? chunkRegenRepairCatalogs : undefined,
          chunkRegenWeeks: chunkRegenWeeks.some((w) => w.length > 0) ? chunkRegenWeeks : undefined,
          chunkSize: CHUNK_SIZE,
          catalogDurationStats,
        }),
      });

      if (resp.status === 429) {
        toast.error("Rate limit dépassé, réessayez dans quelques instants.");
        logPlanStat({
          ts: Date.now(), format: jsonMode ? "json" : "markdown",
          objective: planConfig.objective ?? null, totalWeeks, totalChunks,
          durationMs: 0, ok: false, errorCode: "RATE_LIMIT_429",
          errorMessage: "HTTP 429 — rate limit edge function.",
        });
        setIsLoading(false);
        setChunkProgress(null);
        return;
      }
      if (resp.status === 402) {
        toast.error("Crédits IA épuisés.");
        logPlanStat({
          ts: Date.now(), format: jsonMode ? "json" : "markdown",
          objective: planConfig.objective ?? null, totalWeeks, totalChunks,
          durationMs: 0, ok: false, errorCode: "CREDITS_402",
          errorMessage: "HTTP 402 — crédits IA épuisés.",
        });
        setIsLoading(false);
        setChunkProgress(null);
        return;
      }
      if (!resp.ok || !resp.body) {
        const bodyText = await resp.text().catch(() => "");
        console.error(`[useAITrainingPlan] edge fn HTTP ${resp.status} :`, bodyText.slice(0, 500));
        throw new Error(`Erreur du service IA (HTTP ${resp.status}) : ${bodyText.slice(0, 200) || "réponse vide"}`);
      }

      // ─────────────────────────────────────────────────────────────────────
      // Phase 1B — JSON path : consume named SSE events, merge, expose parsedPlan.
      // On failure : échec visible (toast.error identifiant le bloc/la cause),
      // jamais de repli silencieux vers le Markdown legacy (audit coach, plan
      // Manu 40 sem — le repli produisait un plan à l'air complet mais dégradé)
      // et jamais un état à moitié fusionné.
      // ─────────────────────────────────────────────────────────────────────
      if (jsonMode) {
        const jsonStartTs = Date.now();
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        const collected: PlanChunk[] = [];
        const semanticRepairs: string[] = [];
        const warningEvidence: Array<ReturnType<typeof sanitizeWarningEvidence>> = [];
        let generationContext: ReturnType<typeof technicalGenerationEvent> | undefined;
        let fatalError: { code: string; message: string; details?: any; chunkIndex?: number } | null = null;
        // Préparation pilote Mode B — accumulateur local (fonction pure
        // `accumulateChunkUsage`, testable sans mock fetch/SSE), exposé via
        // `lastGenerationUsage` une fois la génération terminée.
        let usageAcc: GenerationUsageTotals = emptyUsageTotals();

        // ─── Progression fluide semaine-par-semaine (esthétique) ──────────
        // Les événements `chunk-progress` n'arrivent qu'à la fin de chaque
        // bloc (jump de CHUNK_SIZE semaines). On lisse visuellement en
        // incrémentant `currentWeek` d'une unité toutes les ~2.5 s pendant
        // qu'un bloc est en cours, en réservant la dernière semaine du bloc
        // au vrai event.
        let progressTicker: ReturnType<typeof setInterval> | null = null;
        let tickerWeek = 0;
        const stopTicker = () => {
          if (progressTicker !== null) { clearInterval(progressTicker); progressTicker = null; }
        };
        const startTicker = (fromWeek: number, chunkIndexZeroBased: number, tcArg: number) => {
          stopTicker();
          const chunkEnd = Math.min((chunkIndexZeroBased + 1) * CHUNK_SIZE, totalWeeks);
          const ceiling = Math.max(fromWeek, chunkEnd - 1);
          tickerWeek = fromWeek;
          progressTicker = setInterval(() => {
            if (tickerWeek >= ceiling) { stopTicker(); return; }
            tickerWeek += 1;
            setChunkProgress({
              currentWeek: tickerWeek,
              totalWeeks,
              currentChunk: chunkIndexZeroBased + 1,
              totalChunks: tcArg,
            });
          }, 2500);
        };
        if (totalChunks > 1) {
          setChunkProgress({ currentWeek: 1, totalWeeks, currentChunk: 1, totalChunks });
          startTicker(1, 0, totalChunks);
        } else if (totalWeeks > 1) {
          setChunkProgress({ currentWeek: 1, totalWeeks, currentChunk: 1, totalChunks: 1 });
          startTicker(1, 0, 1);
        }


        const handleEvent = (event: string, dataStr: string) => {
          // ─── DIAGNOSTIC (à retirer) : log tout event SSE reçu ───
          console.log(`[SSE evt] ${event} (${dataStr.length} chars)`);
          let data: any;
          try { data = JSON.parse(dataStr); } catch { return; }
          if (event === "chunk-progress") {
            const ci = typeof data.chunkIndex === "number" ? data.chunkIndex + 1 : 1;
            const tc = typeof data.totalChunks === "number" ? data.totalChunks : totalChunks;
            const realWeek = data.weekRange?.[1] ?? 0;
            stopTicker();
            setChunkProgress({ currentWeek: realWeek, totalWeeks, currentChunk: ci, totalChunks: tc });
            if (ci < tc) startTicker(realWeek + 1, ci, tc);
            // Préparation pilote Mode B — fonction pure, testée séparément.
            usageAcc = accumulateChunkUsage(usageAcc, data);

          } else if (event === "chunk-json") {
            const parsed = zPlanChunk.safeParse(data.chunk);
            if (!parsed.success) {
              console.error("[useAITrainingPlan] chunk failed Zod validation client-side", parsed.error.errors.slice(0, 5));
              fatalError = { code: "SCHEMA_CLIENT_FAIL", message: "Chunk JSON invalide côté client." };
              return;
            }
            collected.push(parsed.data);
          } else if (event === "trail-debug") {
            // ─── DIAGNOSTIC (à retirer) ───
            const lines = Array.isArray(data?.lines) ? (data.lines as string[]) : [];
            if (lines.length > 0) {
              console.log("===== [TRAIL DEBUG edge→client] =====");
              for (const line of lines) console.log(line);
              console.log("===== [/TRAIL DEBUG] =====");
            } else {
              console.log("[TRAIL DEBUG edge→client] (aucune ligne collectée)");
            }
          } else if (event === "generation-context") {
            const context = technicalGenerationEvent(data);
            generationContext = context;
            semanticRepairs.push(`[info] generation_context: ${JSON.stringify(context)}`);
            console.info("[generation_contract_server]", context);
          } else if (event === "error") {
            fatalError = {
              code: data.code ?? "UNKNOWN",
              message: data.message ?? "Erreur inconnue",
              details: data.details,
              chunkIndex: typeof data.chunkIndex === "number" ? data.chunkIndex : undefined,
            };
          } else if (event === "prevalidation") {
            setPrevalidation(previous=>({...previous,weeks:previous?.weeks??[],status:data.status,issues:data.issues??[]}));
          } else if (event === "warning") {
            warningEvidence.push(sanitizeWarningEvidence(data));
            const code = data.code ?? "warning";
            const severity = data.severity ?? "warning";
            const repair = data.repair;
            if (code === "json_repair" && repair) {
              const rlist = Array.isArray(repair.repairs) ? repair.repairs.join(",") : "";
              const pe = typeof repair.parseError === "string" ? repair.parseError.slice(0, 200) : "";
              semanticRepairs.push(
                `[info] json_repair: chunk=${repair.chunkIndex ?? "?"} attempt=${repair.attempt ?? "?"} repairs=[${rlist}] parseError="${pe}"`,
              );
              return;
            }
            if (code === "value_check_summary" && data.summary) {
              const s = data.summary;
              // Contrat v2 : { tokens, conforme, relativized, unresolved, residualAbsolute }
              // Fallback aux alias legacy si l'edge n'a pas encore été redéployée.
              const tokens = s.tokens ?? s.totalTokens ?? 0;
              const conforme = s.conforme ?? s.conformantTokens ?? 0;
              const relativized = s.relativized ?? s.relativizedTokens ?? 0;
              const unresolved = s.unresolved ?? s.unresolvedTokens ?? 0;
              const residualAbs = s.residualAbsolute ?? s.residualAbsoluteTokens ?? 0;
              semanticRepairs.push(
                `[info] value_check_summary: tokens=${tokens} conforme=${conforme} relativized=${relativized} unresolved=${unresolved} residualAbs=${residualAbs}`,
              );
              return;
            }
            if ((code === "value_relativized" || code === "value_unresolved") && repair) {
              const beforeStr = repair.before ? ` before="${repair.before}"` : "";
              const afterStr = repair.after ? ` after="${repair.after}"` : "";
              const tokenStr = repair.token ? ` token="${repair.token}"` : "";
              // Classifier la raison pour un unresolved actionnable
              let category = "";
              if (code === "value_unresolved") {
                const r = String(repair.reason ?? "");
                if (/inconnue/i.test(r)) category = " [zone_inconnue]";
                else if (/hors\s*(bornes|grille)/i.test(r)) category = " [pourcent_hors_grille]";
                else category = " [absolu_ambigu]";
              }
              semanticRepairs.push(
                `[${severity}] ${code}${category}: W${repair.weekNumber ?? "?"} ${repair.day ?? "?"} ${repair.sport ?? "?"} — ${repair.reason}${tokenStr}${beforeStr}${afterStr}`,
              );
              return;
            }
            if (repair?.before && (code === "sl_upgrade_unresolved" || code === "sl_upgraded")) {
              semanticRepairs.push(formatSLRepairDiagnostic(code, severity, repair));
              return;
            }
            if (repair?.before) {
              const sport = repair.sport ?? "?";
              const target = repair.targetDurationMin ?? repair.before?.durationMin ?? "?";
              const sameCount = repair.sameSportCandidatesInChunk ?? "?";
              const totalCount = repair.totalCandidatesInChunk ?? "?";
              const nearest = Array.isArray(repair.nearestCandidates) && repair.nearestCandidates.length > 0
                ? repair.nearestCandidates.map((n: any) => `${n.id}(${n.durationMedian}min,Δ${n.deltaMin}min)`).join(" | ")
                : "aucun";
              const beforeTitle = repair.before.title ?? "?";
              const beforeDetails = (repair.before.details ?? "").slice(0, 240);
              const beforeStr = `"${beforeTitle}" [${target}min ${sport}] details="${beforeDetails}"`;
              const afterStr = repair.after
                ? `"${repair.after.title ?? "?"}" [${repair.after.catalogId ?? "?"}] (${repair.after.durationMin ?? "?"}min, Δ${repair.after.deltaMin ?? "?"}min)`
                : `UNRESOLVED — sameSportCandidates=${sameCount}/${totalCount}, nearest=[${nearest}]`;
              const reasonStr = repair.reason ? ` — motif=${repair.reason}` : "";
              semanticRepairs.push(`[${severity}] ${code}: W${repair.weekNumber ?? "?"} ${repair.day ?? "?"} — ${beforeStr} → ${afterStr}${reasonStr}`);
            } else {
              const msg = data.message ?? JSON.stringify(data);
              semanticRepairs.push(`[${severity}] ${code}: ${msg}`);
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = sseBuffer.indexOf("\n\n")) !== -1) {
            const rawEvent = sseBuffer.slice(0, idx);
            sseBuffer = sseBuffer.slice(idx + 2);
            let evName = "message";
            let evData = "";
            for (const line of rawEvent.split("\n")) {
              if (line.startsWith("event:")) evName = line.slice(6).trim();
              else if (line.startsWith("data:")) evData += (evData ? "\n" : "") + line.slice(5).trim();
            }
            if (evData) handleEvent(evName, evData);
          }
        }
        stopTicker();

        // Préparation pilote Mode B — exposé que des chunks aient réussi ou
        // non (la consommation a quand même eu lieu) ; `null` si aucun event
        // "done" n'a été reçu du tout (ex. échec avant le premier chunk).
        setLastGenerationUsage(usageAcc.totalChunksSeen > 0 ? { ...usageAcc } : null);


        // Attempt merge only if no fatal error and chunks received
        let jsonSuccess = false;
        let sportIssuesCount = 0;
        let mergedLocal: ReturnType<typeof mergePlanChunks> | null = null;
        let mergeError: { code: string; message: string; details?: any; chunkIndex?: number } | null = fatalError;
        if (!fatalError && collected.length > 0) {
          try {
            // ─── PHASE 2C.4 — Réconciliateur déterministe (client) ─────────
            // Corrige phase/durée/discipline/quota AVANT le merge final, à
            // partir des mêmes règles que B10/B11 (ficheAllowedPhases).
            try {
              const rec = runReconciler(collected, lastWeeklyQuotasRef.current, 2, lastAllowedCatalogIdsRef.current, {
                objectiveKey: planConfig.objective ? normalizeObjectiveKey(planConfig.objective) : null,
                constraints: (planConfig as any)?.constraints ?? null,
                isLcw3Day:
                  (Array.isArray(planConfig.raceGoals) &&
                    planConfig.raceGoals.some(g => g?.raceFormat === "lcw_3day")) ||
                  /long\s*course\s*weekend|\blcw\b/i.test(String(planConfig.raceName ?? "")),
                // Fix B1 (audit "génération de plan IA") : sans ça, ensureRaceDaySession
                // traite la dernière semaine des chunks REÇUS (`collected`, qui ne
                // couvre que la fenêtre régénérée en régénération partielle) comme la
                // dernière semaine du PLAN ENTIER — cf. commentaire au site de
                // définition dans planReconciler.ts. effTotalWeeks/weekOffset sont
                // déjà calculés ci-dessus (PlanConfig.globalTotalWeeks/globalWeekOffset,
                // posés par planWindowRegen.ts) ; en génération complète (pas de
                // fenêtre), ils valent totalWeeks/0 et ne changent rien.
                globalTotalWeeks: effTotalWeeks,
                globalWeekOffset: weekOffset,
                // Fix B3 + fix "traitement des limiteurs" : même liste (TOUS les
                // limiteurs, pas seulement L1) que le serveur transmet à
                // extractLimiterKeywords/applyReconciler (jsonPlanHandler.ts)
                // — sans ça, le réconciliateur client pouvait remplacer une
                // insertion serveur ciblant le limiteur par une fiche générique.
                identifiedLimiters: planConfig.identifiedLimitersRaw ?? planConfig.identifiedLimiters ?? null,
                // P0 (audit "B-5K-BEGINNER round 2") : fait respecter le plafond
                // coach explicite — cf. enforceMaxSessionsPerDay (planReconciler.ts).
                maxSessionsPerDay: planConfig.maxSessionsPerDay ?? null,
                // P1 (audit "B-5K-BEGINNER round 2", consigne coach suite PR #376) :
                // même signal que buildWorkoutCatalog ci-dessus — pilote
                // enforceDemandingAccumulation (downgrade proactif de l'excédent
                // de séances "vo2" pour un débutant confirmé à signal fiable).
                beginnerIntensitySignal,
              });

              const c = rec.counters;
              const summary = `phase_substituted=${c.phase_substituted} id_substituted_duration=${c.id_substituted_duration} discipline_substituted=${c.discipline_substituted} quota_floor_inserted=${c.quota_floor_inserted_from_catalog} quota_ceiling_trimmed=${c.quota_ceiling_trimmed} id_remapped_to_neighbor=${c.id_remapped_to_neighbor} id_remap_fallback_custom=${c.id_remap_no_intent_match_fallback_custom} phase_unresolved=${c.phase_unresolved} duration_unresolved=${c.duration_unresolved} discipline_unresolved=${c.discipline_unresolved} floor_unresolved=${c.quota_floor_unresolved} reconcile_conflict=${c.reconcile_conflict} zone_hydrated=${c.zone_hydrated ?? 0} taper_weeks_enforced=${c.taper_weeks_enforced ?? 0} constraint_day_moved=${c.constraint_day_moved ?? 0} constraint_day_unresolved=${c.constraint_day_unresolved ?? 0} constraint_banned_sport_removed=${c.constraint_banned_sport_removed ?? 0} demanding_accumulation_downgraded=${c.demanding_accumulation_downgraded ?? 0} demanding_accumulation_unresolved=${c.demanding_accumulation_unresolved ?? 0}`;

              console.groupCollapsed(`🔧 [reconciler] ${summary}`);
              for (const line of rec.logs) console.log(line);
              console.groupEnd();
              semanticRepairs.push(`[info] reconciler_summary: ${summary}`);
              for (const line of rec.logs) semanticRepairs.push(`[reconciler] ${line}`);
            } catch (rerr) {
              const rmsg = rerr instanceof Error ? `${rerr.name}: ${rerr.message}` : String(rerr);
              const rstack = rerr instanceof Error ? (rerr.stack ?? "").slice(0, 500) : "";
              console.error(`❌ [useAITrainingPlan] reconciler exception — ${rmsg}\n${rstack}`, rerr);
              semanticRepairs.push(`[error] reconciler_exception: ${rmsg}`);
              throw rerr; // diagnostic mode: do not swallow, bubble to outer merge catch
            }
            const mergedTotal = computePilotMergedTotalWeeks(
              totalWeeks,
              planConfig._pilotMaxChunks,
              collected.flatMap((c) => c.weeks.map((w) => w.weekNumber)),
            );
            const merged = mergePlanChunks(collected, mergedTotal);
            merged.weeklyQuotas = structuredClone(lastWeeklyQuotasRef.current);
            mergedLocal = merged;
            // P3 — normalisation déterministe de phase (source unique) sur chemin JSON.
            let incompletePhaseWeeks: number[] = [];
            try {
              const phaseStats = normalizeWeeksAndPhases(merged, { weeksAvailable: merged.totalWeeks });
              incompletePhaseWeeks = phaseStats.incompletePhaseWeeks;
              console.log(
                `🧭 [json] normalizeWeeksAndPhases — phases réassignées: ${phaseStats.phaseReassignedCount} · ` +
                `labels nettoyés: ${phaseStats.labelCleanedCount}` +
                (incompletePhaseWeeks.length > 0 ? ` · ⚠️ semaines sans bloc identifié: [${incompletePhaseWeeks.join(",")}]` : ""),
              );
              if (incompletePhaseWeeks.length > 0) {
                const first = incompletePhaseWeeks[0];
                const last = incompletePhaseWeeks[incompletePhaseWeeks.length - 1];
                toast.warning(
                  `⚠️ Récap de phases incomplet — semaine${incompletePhaseWeeks.length > 1 ? "s" : ""} S${first}${last !== first ? `-S${last}` : ""} sans bloc de périodisation identifié. Vérifie ce contenu avant utilisation, ou régénère le plan.`,
                );
              }
            } catch (nerr) {
              console.error("[useAITrainingPlan] normalizeWeeksAndPhases (json) failed:", nerr);
            }
            const parsed = jsonPlanToParsedPlan(merged);
            if (incompletePhaseWeeks.length > 0) parsed.incompletePhaseWeeks = incompletePhaseWeeks;
            // Audit scientifique P0 — F12 : validation finale post-mutations
            // (B13 critique : doublon catalogId/cumul "à jeun" ; B14 avertissement :
            // cohérence phase/fiche ; B15 avertissement, Correction sprint qualité
            // M/IM oct. 2026 #4 : cohérence ambition chronométrique↔physiologie,
            // même ambition EFFECTIVE que targetTable ci-dessus) — tourne ICI,
            // après que `runReconciler` a terminé TOUTES ses passes
            // (enforceTaperWeeks, ensureRaceDaySession, enforceAthleteConstraints...),
            // sur le plan RÉEL livré au coach — pas seulement dans le harnais QA
            // synthétique.
            try {
              const finalValidation = computeFinalValidationIssues({ ...merged, weeklyQuotas: lastWeeklyQuotasRef.current }, semanticRepairs, {
                vmaKmh: athleteData.vma ?? null,
                thresholdPaceSecPerKm: athleteData.paceThresholdSecPerKm ?? null,
                objective: planConfig.objective ?? "",
                ambition: planConfig.ambitionMeta?.effective ?? planConfig.ambition ?? "",
              });
              if (finalValidation.issues.length > 0) parsed.finalValidationIssues = finalValidation.issues;
              setFinalValidationIssues(finalValidation.issues);
              if (finalValidation.hasCritical) {
                console.error(
                  `🚨 [useAITrainingPlan] validation finale CRITIQUE (${finalValidation.issues.filter(i => i.severity === "error").length}) :`,
                  finalValidation.issues.filter(i => i.severity === "error"),
                );
              }
            } catch (fvErr) {
              console.error("[useAITrainingPlan] computeFinalValidationIssues failed:", fvErr);
            }
            // Physiologie de référence figée à la génération (base du calcul de dérive)
            parsed.physioRefs = {
              ftp: athleteData.ftp ?? null,
              vma: athleteData.vma ?? null,
              css: athleteData.css ?? null,
              fcMax: athleteData.fcMax ?? null,
              paceThresholdSecPerKm: athleteData.paceThresholdSecPerKm ?? null,
              capturedAt: new Date().toISOString(),
            };
            const issues = validateSportObjective(merged, planConfig.objective);
            sportIssuesCount = issues.filter(i => i.severity === "critical").length;
            if (issues.length > 0) {
              console.warn(`[useAITrainingPlan] sport↔objective issues (${issues.length}) :`, issues.slice(0, 5));
            }
            // Priorité 1 (coach) : attacher AVANT setParsedPlan — ces deux
            // listes étaient calculées puis jamais rendues (seulement
            // consolées) ; `AIPlanViewer.tsx` les lit maintenant sur `parsed`,
            // même convention que `finalValidationIssues`/`incompletePhaseWeeks`.
            if (issues.length > 0) parsed.sportObjectiveIssues = issues;
            // Phase 2A — validation post-merge du quota hebdo (source moteur)
            let qIssues: QuotaIssue[] = [];
            try {
              qIssues = validateWeeklyQuotas(merged, lastWeeklyQuotasRef.current);
              parsed.weeklyQuotaIssues = qIssues;
              if (qIssues.length > 0) {
                const crit = qIssues.filter(i => i.severity === "critical").length;
                console.warn(`[useAITrainingPlan] quota issues: ${crit} critical / ${qIssues.length - crit} warning`, qIssues.slice(0, 6));
              }
            } catch (e) {
              console.error("[useAITrainingPlan] validateWeeklyQuotas failed:", e);
            }
            // Finalisation PR #383 ("preserve-repair-intent") — Correction 2
            // (suite) : B5 (catalogId ⊂ catalogue injecté) ne tournait que
            // dans le harnais QA (usePilotCockpit/useQARunner) — jamais sur
            // le plan réel livré au coach, alors que `lastAllowedCatalogIdsRef`
            // (union du catalogue injecté) est déjà disponible ici, calculée
            // pour ce même run. Couvre notamment `catalog_id_no_safe_neighbor`
            // (réconciliateur client) quand aucun voisin équivalent n'a été
            // prouvé : le catalogId d'origine reste en place et doit être
            // visible, pas seulement journalisé.
            let catIssues: ReturnType<typeof checkB5ToValidationIssues> = [];
            try {
              const b5 = checkB5(merged, lastAllowedCatalogIdsRef.current, planConfig.objective);
              catIssues = checkB5ToValidationIssues(b5);
              if (catIssues.length > 0) {
                parsed.catalogIdIssues = catIssues;
                // B5 revalide structurellement le même état final que la trace
                // catalog_id_no_safe_neighbor. Le bandeau B5, plus précis, prime
                // afin de ne pas afficher deux alertes pour une seule séance.
                const dedupedFinalIssues = (parsed.finalValidationIssues ?? [])
                  .filter(issue => issue.rule !== "catalog_id_no_safe_neighbor");
                parsed.finalValidationIssues = dedupedFinalIssues.length > 0 ? dedupedFinalIssues : undefined;
                setFinalValidationIssues(dedupedFinalIssues);
                console.error(`[useAITrainingPlan] catalogId hors catalogue injecté (${catIssues.length}) :`, catIssues.slice(0, 6));
              }
            } catch (e) {
              console.error("[useAITrainingPlan] checkB5 failed:", e);
            }
            // Même source que le payload et validateWeeklyQuotas ; aucun
            // recalcul depuis le formulaire vivant lors de l'affichage.
            parsed.weeklyQuotas = structuredClone(lastWeeklyQuotasRef.current);
            for (const [week, entry] of Object.entries(parsed.weeklyQuotas)) traceSLFloorConsumer("retained", Number(week), entry);
            setMergedPlan(merged);
            lastParsedPlanRef.current = parsed;
            setParsedPlan(parsed);
            setSportObjectiveIssues(issues);
            setWeeklyQuotaIssues(qIssues);
            setCatalogIdIssues(catIssues);
            setChunkProgress(null);
            jsonSuccess = true;
          } catch (e) {
            const code = e instanceof MergePlanError ? e.code : "MERGE_FAIL";
            const msg = e instanceof Error ? e.message : String(e);
            mergeError = { code, message: msg };
          }
        } else if (!fatalError && collected.length === 0) {
          mergeError = { code: "NO_CHUNKS", message: "Aucun chunk reçu du serveur." };
        }

        const jsonDurMs = Date.now() - jsonStartTs;
        if (jsonSuccess) {
          // Compute custom ratio for observability (Invariant 8 target < 20%)
          let nonRest = 0, customCount = 0;
          for (const w of (mergedLocal?.weeks ?? [])) {
            for (const s of w.sessions) {
              if (s.sport === "rest") continue;
              nonRest++;
              if (s.custom) customCount++;
            }
          }
          const customRatio = nonRest > 0 ? customCount / nonRest : 0;
          const subCount = semanticRepairs.filter(r => r.includes("substituted_offsport")).length;
          const unresolvedCount = semanticRepairs.filter(r => r.includes("offsport_unresolved")).length;
          const jsonRepairCount = semanticRepairs.filter(r => r.includes("json_repair:")).length;
          const catalogSubstitutions = semanticRepairs.filter(r => r.includes("[catalog_id_substituted]")).length;
          // Motifs de rejet de substitution — pour calibrer les gardes.
          const noNeighborLines = semanticRepairs.filter(r => r.includes("[catalog_id_no_safe_neighbor]"));
          const noNeighborCount = noNeighborLines.length;
          const dominantBreakdown: Record<string, number> = {};
          for (const line of noNeighborLines) {
            const m = /dominant=([a-z_]+)/i.exec(line);
            const key = m ? m[1] : "unknown";
            dominantBreakdown[key] = (dominantBreakdown[key] ?? 0) + 1;
          }
          const dominantStr = Object.entries(dominantBreakdown)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `${k}=${v}`)
            .join(", ") || "—";
          semanticRepairs.unshift(`[summary] customRatio=${Math.round(customRatio * 100)}% (${customCount}/${nonRest}), substitutions=${subCount}, unresolved=${unresolvedCount}, jsonRepairs=${jsonRepairCount}, catalogSubstitutions=${catalogSubstitutions}, noSafeNeighbor=${noNeighborCount} [${dominantStr}]`);

          // Diversité catalogue (P0) — mesure réelle d'exploitation de la bibliothèque.
          const diversity = computePlanDiversity(mergedLocal as any);
          semanticRepairs.unshift(`[diversity] ${formatDiversitySummary(diversity)}`);

          logPlanStat({
            ts: Date.now(), format: "json", objective: planConfig.objective ?? null,
            totalWeeks, totalChunks, durationMs: jsonDurMs, ok: true,
            sportObjectiveCriticalIssues: sportIssuesCount,
            customRatio, customSessionCount: customCount, nonRestSessionCount: nonRest,
            catalogSubstitutions,
            diversityRatio: diversity.distinctRatio,
            distinctCatalogIds: diversity.distinctCatalogIds,
            maxFicheRepeat: diversity.maxRepeat,
            semanticRepairs, generationContext, warningEvidence,
            clientRelease: typeof __PLAN_RELEASE_INFO__ === "undefined" ? undefined : technicalRelease(__PLAN_RELEASE_INFO__),
          });

          setIsLoading(false);
          return;
        }

        // Audit coach (plan Manu 40 sem) : JSON en échec ne doit JAMAIS déclencher
        // un repli silencieux vers le Markdown legacy (moins fiable, historique de
        // troncature silencieuse remplissant des semaines de placeholders) — ça
        // produisait un plan qui AVAIT L'AIR complet mais contenait du contenu
        // dégradé/manquant sans que le coach ne le sache. On échoue franchement,
        // avec un message qui identifie le bloc/la cause, et on laisse le coach
        // relancer lui-même (bouton Générer) — ce qui retente le chemin JSON et
        // bénéficie du retry serveur sur erreurs transitoires (generateChunkJSON.ts).
        const failCode = mergeError?.code ?? "UNKNOWN";
        const failMsg = mergeError?.message ?? "Erreur inconnue";
        const failChunk = mergeError?.chunkIndex;
        const chunkRef = typeof failChunk === "number" ? ` (bloc ${failChunk + 1}/${totalChunks})` : "";
        const FAIL_CODE_LABELS: Record<string, string> = {
          RATE_LIMIT: `Limite de requêtes IA atteinte${chunkRef}.`,
          CREDITS: "Crédits IA épuisés.",
          GATEWAY_ERROR: `Erreur du service de génération IA${chunkRef}.`,
          TRUNCATED: `Réponse IA tronquée${chunkRef} — sortie incomplète.`,
          SCHEMA_FAIL: `Contenu IA non conforme au format attendu${chunkRef}, même après correction automatique.`,
          SCHEMA_CLIENT_FAIL: `Contenu IA invalide détecté côté client${chunkRef}.`,
          NO_CHUNKS: "Aucun contenu reçu du service de génération.",
          GAP: "Semaines manquantes après assemblage du plan.",
          DUP: "Semaines dupliquées après assemblage du plan.",
          EMPTY: "Aucune semaine après assemblage du plan.",
          OUT_OF_RANGE: "Semaines hors plage après assemblage du plan.",
          MERGE_FAIL: "Échec d'assemblage du plan généré.",
        };
        // Coupure serveur : la fonction de génération est stoppée d'office à ~400 s ;
        // les blocs n'étant émis qu'en fin de traitement, un plan long (8 blocs ×
        // ~70 s) finit en NO_CHUNKS sans aucun message d'erreur du serveur.
        const serverTimeout = failCode === "NO_CHUNKS" && jsonDurMs >= 380_000;
        const failLabel = serverTimeout
          ? `Délai maximal du serveur dépassé (~400 s) — plan trop long (${totalWeeks} sem., ${totalChunks} blocs) pour être généré en une seule fois.`
          : FAIL_CODE_LABELS[failCode] ?? `Erreur inconnue${chunkRef} (${failCode}).`;
        console.error("[useAITrainingPlan] JSON generation failed", { code: safeFailureCode(failCode), chunkIndex: failChunk, details: sanitizeSchemaFailure(mergeError?.details) });
        toast.error(`⚠️ Génération du plan échouée — ${failLabel}${serverTimeout ? "" : " Réessaie via le bouton Générer."}`, { duration: 20000 });
        logPlanStat({
          ts: Date.now(), format: "json",
          objective: planConfig.objective ?? null,
          totalWeeks, totalChunks, durationMs: jsonDurMs, ok: false,
          errorCode: failCode, errorMessage: failMsg,
          schemaFailDetails: mergeError?.details,
          semanticRepairs, generationContext, warningEvidence,
          clientRelease: typeof __PLAN_RELEASE_INFO__ === "undefined" ? undefined : technicalRelease(__PLAN_RELEASE_INFO__),
        });
        setIsLoading(false);
        setChunkProgress(null);
        return;
      }



      const markdownStartTs = Date.now();
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";
      let maxWeekSeen = 0;
      

      const updateWeekProgress = (text: string) => {
        // Detect ### Semaine N patterns to track progress
        const matches = text.match(/###\s*Semaine\s*(\d+)/gi);
        if (matches) {
          for (const m of matches) {
            const num = parseInt(m.replace(/\D/g, ""), 10);
            if (num > maxWeekSeen) maxWeekSeen = num;
          }
          if (totalChunks > 1) {
            const currentChunk = Math.min(Math.ceil(maxWeekSeen / CHUNK_SIZE), totalChunks);
            setChunkProgress({ currentWeek: maxWeekSeen, totalWeeks, currentChunk, totalChunks });
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const streamError = parsed.error as string | undefined;
            const streamCode = parsed.code as number | undefined;

            if (streamError) {
              if (streamCode === 402) toast.error("Crédits IA épuisés.");
              else if (streamCode === 429) toast.error("Rate limit dépassé, réessayez dans quelques instants.");
              else toast.error(streamError);
              throw new Error("__STREAM_ABORT__");
            }

            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullText += content;
              lastResponseRef.current = fullText;
              setResponse(fullText);
              updateWeekProgress(fullText);
            }
          } catch (err) {
            if (err instanceof Error && err.message === "__STREAM_ABORT__") throw err;
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const streamError = parsed.error as string | undefined;
            const streamCode = parsed.code as number | undefined;

            if (streamError) {
              if (streamCode === 402) toast.error("Crédits IA épuisés.");
              else if (streamCode === 429) toast.error("Rate limit dépassé, réessayez dans quelques instants.");
              else toast.error(streamError);
              throw new Error("__STREAM_ABORT__");
            }

            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullText += content;
              lastResponseRef.current = fullText;
              setResponse(fullText);
            }
          } catch (err) {
            if (err instanceof Error && err.message === "__STREAM_ABORT__") throw err;
            /* ignore */
          }
        }
      }
      // Log Markdown-path success (chemin direct uniquement — plus de repli JSON→Markdown).
      logPlanStat({
        ts: Date.now(),
        format: "markdown",
        objective: planConfig.objective ?? null,
        totalWeeks, totalChunks,
        durationMs: Date.now() - markdownStartTs,
        ok: true,
      });
    } catch (e) {
      const exceptionCode = safeFailureCode(e instanceof Error && e.message.startsWith("PLAN_PREVALIDATION_BLOCKED:") ? "PLAN_PREVALIDATION_BLOCKED" : e instanceof Error ? e.message : "EXCEPTION");
      console.error("AI training plan error:", { code: exceptionCode === "UNKNOWN" ? "EXCEPTION" : exceptionCode });
      if (!(e instanceof Error && e.message === "__STREAM_ABORT__")) {
        const rawMsg = e instanceof Error ? e.message : String(e);
        const isNetwork = e instanceof TypeError
          || /load failed|failed to fetch|network|networkerror/i.test(rawMsg);
        const msg = isNetwork
          ? "connexion interrompue avec le service IA (réseau ou délai dépassé). Réessayez — si le Wi-Fi est instable, restez sur la page pendant la génération."
          : rawMsg.startsWith("PLAN_PREVALIDATION_BLOCKED:")
            ? "prévalidation bloquante : vérifiez les paramètres et les contrôles affichés avant de réessayer."
            : rawMsg;
        toast.error(`Impossible de générer le plan : ${msg}`);
      }

      logPlanStat({
        ts: Date.now(),
        format: jsonMode ? "json" : "markdown",
        objective: planConfig.objective ?? null,
        totalWeeks, totalChunks, durationMs: 0, ok: false,
        errorCode: exceptionCode === "UNKNOWN" ? "EXCEPTION" : exceptionCode,
        clientRelease: typeof __PLAN_RELEASE_INFO__ === "undefined" ? undefined : technicalRelease(__PLAN_RELEASE_INFO__),
      });
    } finally {
      planningSnapshotRef.current=null;
      generationInFlightRef.current=false;
      setIsLoading(false);
      setChunkProgress(null);
    }
  }, [isLoading, resolvePlanningOptions]);

  // Audit coach (plan Manu 40 sem) : jsonPlanHandler.ts accumule TOUS les
  // blocs en mémoire serveur et ne les envoie au navigateur qu'à la toute fin
  // (`enqueue("chunk-json", ...)` après le merge complet) — si la durée totale
  // dépasse le délai maximal d'exécution du serveur (~400s, soit un plan de
  // plus de MAX_CHUNKS_PER_WINDOW blocs standards pour la plupart des
  // objectifs), le serveur est coupé AVANT d'avoir rien émis, même si
  // plusieurs blocs étaient déjà générés. Le navigateur reçoit alors
  // NO_CHUNKS après ~400s d'attente et rien ne s'affiche.
  //
  // Fix : découper la génération en plusieurs requêtes séquentielles d'au
  // plus MAX_CHUNKS_PER_WINDOW blocs chacune, en réutilisant le mécanisme de
  // régénération de fenêtre déjà en production (planWindowRegen.ts —
  // buildWindowRegenConfig/mergeWindowIntoPlan), qui sait déjà injecter la
  // vraie position globale (phase/périodisation correcte) et reconcaténer le
  // résultat. Chaque requête reste sous la limite serveur ; le plan complet
  // est assemblé côté navigateur puis post-traité normalement
  // (postProcessParsedPlan, AITrainingPlanPage.tsx) exactement comme un plan
  // généré en une seule requête.
  //
  // Les catalogues anti-répétition envoyés à l'IA sont calculés côté client
  // AVANT l'envoi de chaque requête (buildWorkoutCatalog, dans `generatePlan`
  // ci-dessus) — le découpage en plusieurs requêtes HTTP ne change rien à
  // cette diversité, qui n'a jamais dépendu d'un état "live" partagé entre
  // blocs pendant une même exécution serveur.
  //
  // Les quotas et leurs issues voyagent avec chaque résultat de fenêtre et
  // sont fusionnés/renumérotés par mergeWindowIntoPlan. Le hook est synchronisé
  // sur la liste assemblée pour la sauvegarde. Les autres familles d'issues
  // (sportObjectiveIssues, etc.) gardent leur périmètre préexistant.
  const generatePlanWindowed = useCallback(async (
    athleteData: PlanAthleteData,
    planConfig: PlanConfig & { _outputFormat?: "json" | "markdown" },
  ): Promise<void> => {
    const totalWeeks = planConfig.weeksAvailable ?? 0;
    const { chunkSize } = computeChunkSizing(planConfig.objective || "", totalWeeks);
    const totalChunksForPlan = computeTotalChunks(planConfig.objective || "", totalWeeks);

    if (planConfig._outputFormat !== "json" || totalChunksForPlan <= MAX_CHUNKS_PER_WINDOW) {
      // Plan assez court (ou chemin Markdown, non concerné par la coupure
      // serveur JSON) — comportement inchangé, une seule requête.
      return generatePlan(athleteData, planConfig);
    }

    const windows = computeObjectiveAwareWindows(totalWeeks, chunkSize, planConfig.raceGoals, planConfig.planStartDate);

    if(batchInFlightRef.current)return;
    batchInFlightRef.current=true;
    setIsBatchGenerating(true);
    try {
      const scopeOptions=await resolvePlanningOptions(athleteData,planConfig);
      const scopePrevalidation=prevalidateGenerationScope(athleteData,planConfig,scopeOptions);
      setPrevalidation(scopePrevalidation);
      if(scopePrevalidation.status==="blocked") {
        toast.error("Prévalidation bloquante : aucune fenêtre envoyée au modèle.");
        return;
      }
      let assembled: ParsedPlan | null = null;

      for (let wi = 0; wi < windows.length; wi++) {
        const { from, to } = windows[wi];
        const isLastWindow = wi === windows.length - 1;

        toast.info(`Génération — fenêtre ${wi + 1}/${windows.length} (S${from}-S${to})…`, { duration: 6000 });

        const currentPlanForContext: ParsedPlan = assembled ?? {
          title: planConfig.raceName || planConfig.objective || "Plan",
          phases: [],
          totalWeeks,
          weeks: [],
        };
        // buildWindowRegenConfig déduit son texte d'ancrage futur ("Pas de
        // semaines après la fenêtre… la dernière semaine doit clôturer le
        // bloc") de `currentPlan.weeks` au-delà de `to` — toujours vide ici
        // puisque les fenêtres suivantes n'existent pas encore au moment de
        // générer celle-ci. Sans ce placeholder, chaque fenêtre NON FINALE
        // recevrait à tort l'instruction de clôturer le bloc (mini-taper
        // prématuré au milieu du plan).
        const contextWithFuturePlaceholder: ParsedPlan = isLastWindow
          ? currentPlanForContext
          : {
              ...currentPlanForContext,
              weeks: [
                ...currentPlanForContext.weeks,
                { weekNumber: to + 1, theme: "Suite du plan", phase: "build", sessions: [] },
              ],
            };

        const { config: windowConfigBase } = buildWindowRegenConfig({
          fromWeek: from,
          toWeek: to,
          currentPlan: contextWithFuturePlaceholder,
          athleteData,
          baseConfig: planConfig,
          cycle: windows[wi].cycle,
        });
        const windowConfig: PlanConfig & { _outputFormat?: "json" | "markdown" } = {
          ...windowConfigBase,
          _outputFormat: planConfig._outputFormat,
          // Initial construction retains the same global ramp across windows.
          // globalWeekOffset prevents restarting S1 at each window.
          volumeRamp: planConfig.volumeRamp,
        };

        await generatePlan(athleteData, windowConfig,scopeOptions);

        const windowPlan = lastParsedPlanRef.current;
        if (!windowPlan || windowPlan.weeks.length === 0) {
          // generatePlan a déjà affiché son propre toast.error (échec dur,
          // identifiant le bloc/la cause) — on arrête simplement la séquence.
          console.error(`[generatePlanWindowed] fenêtre ${wi + 1}/${windows.length} (S${from}-S${to}) — échec, séquence interrompue.`);
          return;
        }

        assembled = assembled
          ? mergeWindowIntoPlan(assembled, windowPlan, from, to)
          // `windowPlan.totalWeeks` vaut la taille de CETTE fenêtre (ex: 15),
          // pas le vrai total du plan (ex: 40) — `buildWindowRegenConfig`
          // lit `currentPlan.totalWeeks` pour calculer `globalTotalWeeks` de
          // la fenêtre SUIVANTE (periodisation/phase). Sans ce `totalWeeks`
          // explicite dès la première fenêtre, les fenêtres suivantes
          // recevraient un `globalTotalWeeks` erroné (celui de la 1ère
          // fenêtre) et donc une phase/catalogue incorrects.
          : { ...windowPlan, totalWeeks, weeks: windowPlan.weeks.map((w) => ({ ...w })) };
      }

      if (assembled) {
        // Audit coach (plan Manu) : `title`/`phases`/`diagnostic`/`strategicRecap`
        // sont hérités de la fenêtre 1 par `mergeWindowIntoPlan` (qui spread
        // `currentPlan` en premier) et restent donc figés sur SON seul
        // périmètre (ex: titre "...15 semaines (Bloc 1)" affiché sur un plan
        // assemblé de 40 semaines ; récap de phases ne couvrant que S1-S15,
        // que normalizeWeeksAndPhases interpréterait comme "récap incomplet"
        // sur le reste du plan — faux positif). On les réinitialise
        // explicitement sur le plan complet assemblé : normalizeWeeksAndPhases
        // (postProcessParsedPlan, en aval) régénère un récap propre sur les
        // `totalWeeks` réels via le fallback Lorang.
        assembled = {
          ...assembled,
          title: buildAssembledPlanTitle(planConfig.objective, planConfig.raceName, totalWeeks),
          phases: [],
          diagnostic: undefined,
          strategicRecap: undefined,
        };
        assembled.finalValidationIssues = [
          ...(assembled.finalValidationIssues ?? []).filter(i => i.rule !== "coach_load_violation" && i.rule !== "coach_initial_load_unverified"),
          ...validateCoachLoadIssues(assembled, assembled.weeklyQuotas),
        ];
        setFinalValidationIssues(assembled.finalValidationIssues);
        lastParsedPlanRef.current = assembled;
        setParsedPlan(assembled);
        // Le bandeau lit le plan, la sauvegarde lit cet état du hook :
        // tous deux doivent porter les mêmes issues de TOUTES les fenêtres.
        setWeeklyQuotaIssues(assembled.weeklyQuotaIssues ?? []);
        toast.success(`Plan complet généré — ${windows.length} fenêtres assemblées.`);
      }
    } finally {
      batchInFlightRef.current=false;
      setIsBatchGenerating(false);
    }
  }, [generatePlan, resolvePlanningOptions]);

  const reset = useCallback(() => {
    planningSnapshotRef.current=null;
    setPrevalidation(null);
    setResponse("");
    lastResponseRef.current = "";
    lastParsedPlanRef.current = null;
    setParsedPlan(null);
    setMergedPlan(null);
    setSportObjectiveIssues([]);
    setWeeklyQuotaIssues([]);
    lastWeeklyQuotasRef.current = {};
    setCatalogIdIssues([]);
    setIsLoading(false);
    setChunkProgress(null);
  }, []);

  return {
    response,
    // isBatchGenerating couvre toute une séquence generatePlanWindowed
    // (isLoading, interne à generatePlan, se remet à false entre deux
    // fenêtres) — combiné ici pour que les consommateurs existants (bouton
    // Générer, spinner) n'aient rien à changer pour rester corrects.
    isLoading: isLoading || isBatchGenerating,
    chunkProgress, generatePlan, generatePlanWindowed, reset, setResponse,
    prevalidation, prevalidateTrainingPlan:previewPlan,
    // Phase 1B — JSON-mode outputs (null when Markdown path was used).
    parsedPlan, mergedPlan, sportObjectiveIssues,
    // Phase 2A — quota hebdo moteur (validation post-merge).
    weeklyQuotaIssues, lastWeeklyQuotasRef,
    // Audit scientifique P0 — F12 : validation finale post-mutations (B13/B14).
    finalValidationIssues,
    // Finalisation PR #383 ("preserve-repair-intent") — Correction 2 (suite) :
    // issues B5 (catalogId ⊂ catalogue injecté) sur le plan réel.
    catalogIdIssues,
    // Phase 0 QA — union catalogId injectés au dernier run (pour check B5).
    lastAllowedCatalogIdsRef,
    // Résultat brut immédiat du dernier run (évite les states périmés).
    lastResponseRef, lastParsedPlanRef,
    // Préparation pilote Mode B — usage réel accumulé du dernier run JSON
    // (null si non disponible), cf. docstring du state.
    lastGenerationUsage,
  };
}
