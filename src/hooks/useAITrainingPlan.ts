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
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { buildWorkoutCatalog, serializeCatalogForPrompt, computeCatalogDurationStats, resetCatalogAttribution } from "@/lib/workoutCatalogBuilder";
import { isTrailCatalogId } from "@/lib/plan/trailMarkers";
import type { CatalogDurationStats } from "@/lib/workoutCatalogBuilder";
import type { TrainingSport } from "@/types/workoutLibrary";
import { supabase } from "@/integrations/supabase/client";
import { zPlanChunk, type PlanChunk } from "@/lib/plan/planSchema";
import { mergePlanChunks, validateSportObjective, MergePlanError, type MergedPlan, type SportObjectiveIssue } from "@/lib/plan/mergePlanChunks";
import { jsonPlanToParsedPlan } from "@/lib/plan/jsonPlanToParsedPlan";
import { logPlanStat } from "@/lib/plan/planGenerationStats";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import { computeWeeklySessionQuota, inferWeekType, buildQuotaPromptBlock, applySessionsPerWeekTarget } from "@/engines/plan/sessionSizingMatrix";
import { buildWeeklySlotLayout, buildLayoutPromptBlock, type WeeklySlotLayout } from "@/engines/plan/weeklySlotLayout";
import { validateWeeklyQuotas, type QuotaIssue, type WeekQuotaEntry } from "@/lib/plan/validateWeeklyQuotas";
import { buildTargetTable, formatTargetTableBlock, type TargetTable } from "@/lib/plan/targetTable";
import { runReconciler } from "@/lib/plan/planReconciler";
import { normalizeObjectiveKey } from "@/lib/normalizeObjectiveKey";

import { normalizeWeeksAndPhases } from "@/engines/plan/normalizeWeeksPhases";

const PLAN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-training-plan`;

const getCatalogSportFilter = (objective: string): TrainingSport[] | undefined => {
  const lower = objective.trim().toLowerCase();
  const isTriathlon = lower.includes("70.3") || lower === "703" || lower.includes("ironman") || lower === "im" || lower.includes("triathlon");
  // Triathlon: restreindre AUX sports triathlon (jamais de trail dans un plan 70.3/IM).
  if (isTriathlon) return ["swim", "bike", "run", "brick", "strength", "cyclisme", "course", "natation", "renforcement", "mixed"];
  const isTrail = lower.includes("trail") || lower.includes("utmb") || lower.includes("ccc") || lower.includes("occ") || lower.includes("ultra");
  if (isTrail) return ["course", "run", "trail", "strength", "renforcement"];
  return ["course", "run", "strength", "renforcement"];
};

/**
 * Compute id-regex / tag exclusions based on objective + raceFormat.
 * - Triathlon plans jamais de contenu trail (tags + IDs Hedgehog/Urban/Trail).
 * - Format LCW (70.3 3 jours éclatés) : bannir séances signature IM 1-jour
 *   qui masquent le paradigme LCW (brique T2 immédiate, run-fatigued-next-day
 *   sans long-bike race-pace la veille).
 */
/**
 * Patterns d'IDs de séances trail (source de vérité unique).
 * Utilisés partout pour bannir le trail des plans non-trail.
 */
export const TRAIL_ID_PATTERNS: RegExp[] = [
  /^HEDGEHOG_/i,
  /_HEDGEHOG_/i,
  /^URBAN_/i,
  /^TRAIL_/i,
  /_TRAIL_/i,
  /^[A-D]_TR(?:50)?_/i,
  /^EXPE_HORS_VILLE_/i,
  /^V3_TRAIL_/i,
];

const getCatalogExclusions = (
  objective: string,
  raceGoals?: RaceGoal[]
): { excludeIdPatterns: RegExp[]; excludeTags: string[] } => {
  const lower = objective.trim().toLowerCase();
  const isTriathlon = lower.includes("70.3") || lower === "703" || lower.includes("ironman") || lower === "im" || lower.includes("triathlon");
  const isHalf = lower.includes("70.3") || lower === "703";
  const isLCW = Array.isArray(raceGoals) && raceGoals.some(g => g?.raceFormat === "lcw_3day");
  const isTrailGoal = lower.includes("trail") || lower.includes("utmb") || lower.includes("ccc") || lower.includes("occ") || (lower.includes("ultra") && !lower.includes("ironman"));
  // CAP route : tout objectif course sur route (semi/marathon/10K/5K/start-to-run)
  // qui n'est ni trail ni triathlon → doit AUSSI bannir le trail.
  const isRoadRunning =
    !isTriathlon &&
    !isTrailGoal &&
    (
      lower.includes("semi") ||
      lower.includes("marathon") ||
      lower.includes("10k") ||
      lower.includes("10 km") ||
      lower.includes("10km") ||
      lower.includes("5k") ||
      lower.includes("5 km") ||
      lower.includes("5km") ||
      lower.includes("start") ||
      lower.includes("débutant") ||
      lower.includes("beginner")
    );

  const excludeIdPatterns: RegExp[] = [];
  const excludeTags: string[] = [];

  if (isTriathlon || isRoadRunning) {
    // Bannir tout contenu trail dans un plan triathlon OU CAP route.
    excludeTags.push("trail", "trail-urban");
    excludeIdPatterns.push(...TRAIL_ID_PATTERNS);
  }

  if (isLCW) {
    excludeIdPatterns.push(
      /^B_IM_BRICK_LONG_MARATHON_PACE$/i,
      /^B_IM_RUN_MARATHON_SPLIT/i,
      /^B_703_BRICK_RACE_PACE$/i,
    );
  }

  if (isHalf && !isLCW) {
    excludeIdPatterns.push(/^A_IM_RUN_LONG_DURABILITY/i, /^B_IM_RUN_MARATHON_SPLIT/i);
  }

  return { excludeIdPatterns, excludeTags };
};


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
  objective: string;
  raceName?: string;
  raceDate?: string;
  raceGoals?: RaceGoal[];
  planStartDate?: string;
  weeksAvailable?: number;
  weeklyHours?: number;
  sessionsPerWeek?: number;
  maxSessionsPerDay?: number;
  strengthSessionsPerWeek?: number;
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
  activeLevers?: string[];
  prohibitions?: string[];
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
   * Rampe de volume des premières semaines — dérivée de `trainingLevel`.
   * Contrainte dure injectée chunk 1 pour borner Sem 1 et le ramp-up.
   * Absent si `trainingLevel` non fourni ou si tss7d réel disponible (CRR prime).
   */
  volumeRamp?: {
    trainingLevel: "untrained" | "light" | "trained" | "highly_trained";
    week1PctTarget: number;       // 0-1 (ex: 0.40 = 40% du volume cible Sem 1)
    rampWeeks: number;            // Nombre de semaines pour atteindre weeklyHours
    week1HoursCap: number | null; // Plafond absolu Sem 1 (h), null si pas de cap
    weeklyHoursTarget: number;    // Rappel cible
    week1HoursMax: number;        // Sem 1 effective max (h)
    weeklyIncreasePctMax: number; // Progression max/sem (ex: 0.10 = +10%/sem)
  };
}

export interface ChunkProgress {
  currentWeek: number;
  totalWeeks: number;
  currentChunk: number;
  totalChunks: number;
}

export function useAITrainingPlan() {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chunkProgress, setChunkProgress] = useState<ChunkProgress | null>(null);
  // Phase 1B — populated only when server ran the JSON path.
  const [parsedPlan, setParsedPlan] = useState<ParsedPlan | null>(null);
  const [mergedPlan, setMergedPlan] = useState<MergedPlan | null>(null);
  const [sportObjectiveIssues, setSportObjectiveIssues] = useState<SportObjectiveIssue[]>([]);
  // Phase 2A — issues remontées par la validation post-merge du quota hebdo.
  const [weeklyQuotaIssues, setWeeklyQuotaIssues] = useState<QuotaIssue[]>([]);
  const lastWeeklyQuotasRef = useRef<Record<number, WeekQuotaEntry>>({});
  // Phase 0 QA — union des catalogId injectés (phase + chunks) pour check B5.
  // Peuplée dans generatePlan une fois les catalogues bâtis, avant l'appel edge.
  const lastAllowedCatalogIdsRef = useRef<string[]>([]);
  // Résultat brut du dernier run — lisible IMMÉDIATEMENT après `await generatePlan`
  // (les states React ne sont pas encore rafraîchis dans le closure appelant).
  const lastResponseRef = useRef<string>("");
  const lastParsedPlanRef = useRef<ParsedPlan | null>(null);

  const generatePlan = useCallback(async (athleteData: PlanAthleteData, planConfig: PlanConfig & { _outputFormat?: "json" | "markdown" }) => {
    // Guard against double-fire
    if (isLoading) {
      console.warn("Plan generation already in progress — ignoring duplicate call");
      return;
    }
    const totalWeeks = planConfig.weeksAvailable;
    if (!totalWeeks || totalWeeks <= 0) {
      toast.error("Durée du plan manquante. Renseigne une date de course ou une durée libre (formulaire coach).");
      return;
    }
    setResponse("");
    lastResponseRef.current = "";
    lastParsedPlanRef.current = null;
    setParsedPlan(null);
    setMergedPlan(null);
    setSportObjectiveIssues([]);
    setWeeklyQuotaIssues([]);
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
      // Build phase-specific workout catalogs for AI injection (fallback for non-chunked plans)
      const phaseCatalogs: Record<string, string> = {};
      // NB : bornes CHEVAUCHANTES volontairement — usage = injection catalogue aux transitions.
      // La phase canonique des semaines est fixée par normalizeWeeksAndPhases (source unique).
      const phaseRanges: Array<{ phase: string; start: number; end: number }> = [
        { phase: "base", start: 1, end: Math.ceil(totalWeeks * 0.35) },
        { phase: "build", start: Math.ceil(totalWeeks * 0.25), end: Math.ceil(totalWeeks * 0.65) },
        { phase: "peak", start: Math.ceil(totalWeeks * 0.55), end: Math.ceil(totalWeeks * 0.85) },
        { phase: "taper", start: Math.ceil(totalWeeks * 0.80), end: totalWeeks },
      ];
      const catalogSportFilter = getCatalogSportFilter(planConfig.objective || "");
      const { excludeIdPatterns, excludeTags } = getCatalogExclusions(
        planConfig.objective || "",
        planConfig.raceGoals
      );

      // Compute catalog duration stats from all phases combined
      let allCatalogEntries: ReturnType<typeof buildWorkoutCatalog> = [];
      const usedIds = new Set<string>();

      // Reset l'attribution B5 avant les builds (accumule sur tous les chunks du plan)
      resetCatalogAttribution();


      // Limiteurs diagnostiqués (clés métriques brutes issues du diagnostic unifié)
      // — utilisés par scoreWorkout pour booster les séances qui adressent le limiteur.
      const limiterKeys = planConfig.identifiedLimitersRaw && planConfig.identifiedLimitersRaw.length > 0
        ? planConfig.identifiedLimitersRaw
        : undefined;

      for (let i = 0; i < phaseRanges.length; i++) {
        const pr = phaseRanges[i];
        const catalog = buildWorkoutCatalog(
          planConfig.objective || "",
          pr.start,
          pr.end,
          totalWeeks,
          { maxItems: 80, chunkIndex: i, excludeIds: usedIds, limiters: limiterKeys, prohibitions: planConfig.prohibitions, sportFilter: catalogSportFilter, excludeIdPatterns, excludeTags }
        );
        phaseCatalogs[pr.phase] = serializeCatalogForPrompt(catalog);
        // ─── SONDE DIAGNOSTIC TRAIL (à retirer après analyse) ───
        {
          const trailEntries = catalog.filter((e) => isTrailCatalogId(e.id));
          console.log(
            `[trail_probe_phase] phase=${pr.phase} entries=${catalog.length} ` +
            `trail_entries=${trailEntries.length > 0 ? trailEntries.map((e) => e.id).join(",") : "NONE"}`,
          );
        }
        catalog.forEach(e => { allCatalogEntries.push(e); usedIds.add(e.id); });
      }

      // ─── OPTIMIZATION #1: Per-chunk filtered catalogs (40-50 ultra-relevant sessions) ───
      // Pre-compute one focused catalog per chunk using its EXACT week range.
      // The edge function will prefer these over phaseCatalogs when chunking.
      // This reduces cognitive noise: AI sees only sessions relevant to *this* block.
      const chunkCatalogs: string[] = [];
      if (needsChunking) {
        const chunkUsedIds = new Set<string>();
        for (let ci = 0; ci < totalChunks; ci++) {
          const cStart = ci * CHUNK_SIZE + 1;
          const cEnd = Math.min(cStart + CHUNK_SIZE - 1, totalWeeks);
          // Cap relevé à 130 (v2 coverage-first) : garantit un socle par
          // (sport × famille d'intention) avant tri par score. Marge large
          // sous la limite de contexte edge (~33k chars ≪ 64k tokens).
          const chunkCatalog = buildWorkoutCatalog(
            planConfig.objective || "",
            cStart,
            cEnd,
            totalWeeks,
            { maxItems: 130, chunkIndex: ci, excludeIds: chunkUsedIds, limiters: limiterKeys, prohibitions: planConfig.prohibitions, sportFilter: catalogSportFilter, excludeIdPatterns, excludeTags }
          );
          chunkCatalogs.push(serializeCatalogForPrompt(chunkCatalog));
          // ─── SONDE DIAGNOSTIC TRAIL (à retirer après analyse) ───
          {
            const trailEntries = chunkCatalog.filter((e) => isTrailCatalogId(e.id));
            console.log(
              `[trail_probe_client] chunk=${ci} entries=${chunkCatalog.length} ` +
              `trail_entries=${trailEntries.length > 0 ? trailEntries.map((e) => e.id).join(",") : "NONE"} ` +
              `sportFilter=[${(catalogSportFilter ?? []).join(",")}]`,
            );
          }
          // Soft rotation: only exclude ~half the previous chunk's IDs to allow progression continuity.
          // ⚠️ On EXEMPTE les séances structurelles (SL vélo/course, brick long, race-sim) :
          // buildWorkoutCatalog les réinjecte de toute façon (garantie de couverture),
          // mais on évite d'encombrer inutilement le set d'exclusion.
          const isStructuralEntry = (e: { cat: string; durationMin: [number, number]; objectif: string }) => {
            const median = (e.durationMin[0] + e.durationMin[1]) / 2;
            if (median >= 120) return true;
            if (/race[-_\s]?sim/i.test(e.cat)) return true;
            if (/\bsortie\s*longue\b|\blong\s*run\b|\blong\s*ride\b|\brace[-\s]?sim\b/i.test(e.objectif)) return true;
            return false;
          };
          const halfIds = chunkCatalog
            .slice(0, Math.floor(chunkCatalog.length / 2))
            .filter(e => !isStructuralEntry(e))
            .map(e => e.id);
          halfIds.forEach(id => chunkUsedIds.add(id));
        }
      }

      // Derive duration stats from the actual library — sent to edge function
      const catalogDurationStats = computeCatalogDurationStats(allCatalogEntries);

      // Phase 0 QA — expose l'union des catalogId RÉELLEMENT PRÉSENTÉS au modèle.
      // Source de vérité = tous les dumps sérialisés envoyés au edge (phase-catalogs
      // ET chunk-catalogs). Ne PAS partir de `allCatalogEntries` : il est amputé par
      // l'exclusion cumulative `usedIds` entre phases. La soft-rotation entre chunks
      // amputerait de même. En parsant les strings effectivement envoyées, l'union
      // reflète ce que le modèle a vu — un ID retiré par rotation reste visible via
      // le chunk d'origine, donc NE compte PAS comme "hors catalogue".
      {
        const union = new Set<string>();
        const parseDumpIds = (dump: string) => {
          for (const line of dump.split("\n")) {
            const m = line.match(/^\|\s*([A-Za-z0-9_-]{4,})\s*\|/);
            if (m && m[1] !== "ID") union.add(m[1]);
          }
        };
        for (const dump of Object.values(phaseCatalogs)) parseDumpIds(dump);
        for (const dump of chunkCatalogs) parseDumpIds(dump);
        // Filet de sécurité : inclure aussi les IDs de allCatalogEntries au cas où
        // la sérialisation aurait un edge-case (ex : catalogue vide court-circuité).
        allCatalogEntries.forEach(e => union.add(e.id));
        lastAllowedCatalogIdsRef.current = [...union];
        console.log(
          `[b5_union_source] phase_catalogs=${Object.keys(phaseCatalogs).length} chunk_catalogs=${chunkCatalogs.length} union_size=${union.size}`,
        );
      }



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

      // ─── PHASE 2A : quotas hebdomadaires déterministes ──────────────────
      // Calculés côté client, injectés dans le userPrompt (via planConfig),
      // et validés post-merge. Le LLM n'a plus la main sur "combien".
      const weeklyQuotas: Record<number, WeekQuotaEntry> = {};
      const quotasByChunkText: string[] = [];
      const hoursAvail = typeof planConfig.weeklyHours === "number" ? planConfig.weeklyHours : 0;
      const ambitionForQuota = typeof planConfig.ambition === "string" ? planConfig.ambition : "age_group";
      const objectiveForQuota = planConfig.objective || "";
      // Cible séances/semaine saisie (formulaire coach OU démarrage guidé) :
      // elle PRIME sur la matrice ambition×objectif, sinon le squelette imposé
      // au modèle ignorait la demande utilisateur.
      const targetSpw = typeof planConfig.sessionsPerWeek === "number" && planConfig.sessionsPerWeek > 0
        ? planConfig.sessionsPerWeek : null;
      // Disciplines interdites (champ libre "Contraintes") : le quota de la
      // discipline bannie est libéré et RÉAFFECTÉ aux sports autorisés.
      const bannedSportsForQuota = parseAthleteConstraints(
        (planConfig as any)?.constraints ?? null,
      ).bannedSports;
      for (let w = 1; w <= totalWeeks; w++) {
        const weekType = inferWeekType(w, totalWeeks);
        const q0 = computeWeeklySessionQuota(objectiveForQuota, ambitionForQuota, hoursAvail, weekType);
        if (q0) {
          let adj = targetSpw
            ? applySessionsPerWeekTarget({ quota: q0.quota, floors: q0.floors }, targetSpw, weekType)
            : { quota: q0.quota, floors: q0.floors };
          if (bannedSportsForQuota.length > 0) {
            const red = applyBannedSportsRedistribution(adj, bannedSportsForQuota);
            adj = { quota: red.quota, floors: red.floors };
          }
          const layout: WeeklySlotLayout = buildWeeklySlotLayout(adj.quota, adj.floors, weekType);
          weeklyQuotas[w] = { quota: adj.quota, floors: adj.floors, weekType, downgraded: q0.downgraded, downgradeReason: q0.downgradeReason, layout };
        }
      }


      lastWeeklyQuotasRef.current = weeklyQuotas;

      // Bloc texte par chunk (uniquement les semaines du chunk concerné).
      const chunksForQuota: Array<{ start: number; end: number }> = [];
      if (needsChunking) {
        for (let ci = 0; ci < totalChunks; ci++) {
          const s = ci * CHUNK_SIZE + 1;
          chunksForQuota.push({ start: s, end: Math.min(s + CHUNK_SIZE - 1, totalWeeks) });
        }
      } else {
        chunksForQuota.push({ start: 1, end: totalWeeks });
      }
      for (const c of chunksForQuota) {
        const scope: number[] = [];
        for (let w = c.start; w <= c.end; w++) if (weeklyQuotas[w]) scope.push(w);
        if (scope.length === 0) { quotasByChunkText.push(""); continue; }
        const quotaBlock = buildQuotaPromptBlock(scope, weeklyQuotas);
        const layoutMap: Record<number, WeeklySlotLayout> = {};
        for (const w of scope) if (weeklyQuotas[w].layout) layoutMap[w] = weeklyQuotas[w].layout!;
        const layoutBlock = Object.keys(layoutMap).length > 0
          ? buildLayoutPromptBlock(scope, layoutMap)
          : "";
        quotasByChunkText.push(layoutBlock ? `${quotaBlock}\n\n${layoutBlock}` : quotaBlock);
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
          objective: planConfig.objective ?? null,
          ambition: planConfig.ambition ?? null,
          weeklyHours: planConfig.weeklyHours ?? null,
          trainingLevel: planConfig.ambitionMeta?.trainingLevel ?? null,
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
      };

      const resp = await fetch(PLAN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(jsonMode ? { "X-Plan-Output-Format": "json" } : {}),
        },
        body: JSON.stringify({
          athleteData,
          planConfig: planConfigWithQuota,
          phaseCatalogs,
          chunkCatalogs: chunkCatalogs.length > 0 ? chunkCatalogs : undefined,
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
      // On failure : toast + auto-fallback to Markdown (relance complète), never
      // white-screen and never a half-merged state.
      // ─────────────────────────────────────────────────────────────────────
      if (jsonMode) {
        const jsonStartTs = Date.now();
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        const collected: PlanChunk[] = [];
        const semanticRepairs: string[] = [];
        let fatalError: { code: string; message: string; details?: any } | null = null;

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
          } else if (event === "error") {
            fatalError = { code: data.code ?? "UNKNOWN", message: data.message ?? "Erreur inconnue", details: data.details };
          } else if (event === "warning") {
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
              semanticRepairs.push(`[${severity}] ${code}: W${repair.weekNumber ?? "?"} ${repair.day ?? "?"} — ${beforeStr} → ${afterStr}`);
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



        // Attempt merge only if no fatal error and chunks received
        let jsonSuccess = false;
        let sportIssuesCount = 0;
        let mergedLocal: ReturnType<typeof mergePlanChunks> | null = null;
        let mergeError: { code: string; message: string; details?: any } | null = fatalError;
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
              });

              const c = rec.counters;
              const summary = `phase_substituted=${c.phase_substituted} id_substituted_duration=${c.id_substituted_duration} discipline_substituted=${c.discipline_substituted} quota_floor_inserted=${c.quota_floor_inserted_from_catalog} quota_ceiling_trimmed=${c.quota_ceiling_trimmed} id_remapped_to_neighbor=${c.id_remapped_to_neighbor} id_remap_fallback_custom=${c.id_remap_no_intent_match_fallback_custom} phase_unresolved=${c.phase_unresolved} duration_unresolved=${c.duration_unresolved} discipline_unresolved=${c.discipline_unresolved} floor_unresolved=${c.quota_floor_unresolved} reconcile_conflict=${c.reconcile_conflict} zone_hydrated=${c.zone_hydrated ?? 0} taper_weeks_enforced=${c.taper_weeks_enforced ?? 0} constraint_day_moved=${c.constraint_day_moved ?? 0} constraint_day_unresolved=${c.constraint_day_unresolved ?? 0} constraint_banned_sport_removed=${c.constraint_banned_sport_removed ?? 0}`;

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
            const merged = mergePlanChunks(collected, totalWeeks);
            mergedLocal = merged;
            // P3 — normalisation déterministe de phase (source unique) sur chemin JSON.
            try {
              const phaseStats = normalizeWeeksAndPhases(merged, { weeksAvailable: merged.totalWeeks });
              console.log(
                `🧭 [json] normalizeWeeksAndPhases — phases réassignées: ${phaseStats.phaseReassignedCount} · ` +
                `labels nettoyés: ${phaseStats.labelCleanedCount}`,
              );
            } catch (nerr) {
              console.error("[useAITrainingPlan] normalizeWeeksAndPhases (json) failed:", nerr);
            }
            const parsed = jsonPlanToParsedPlan(merged);
            const issues = validateSportObjective(merged, planConfig.objective);
            sportIssuesCount = issues.filter(i => i.severity === "critical").length;
            if (issues.length > 0) {
              console.warn(`[useAITrainingPlan] sport↔objective issues (${issues.length}) :`, issues.slice(0, 5));
            }
            setMergedPlan(merged);
            lastParsedPlanRef.current = parsed;
            setParsedPlan(parsed);
            setSportObjectiveIssues(issues);
            // Phase 2A — validation post-merge du quota hebdo (source moteur)
            try {
              const qIssues = validateWeeklyQuotas(merged, lastWeeklyQuotasRef.current);
              setWeeklyQuotaIssues(qIssues);
              if (qIssues.length > 0) {
                const crit = qIssues.filter(i => i.severity === "critical").length;
                console.warn(`[useAITrainingPlan] quota issues: ${crit} critical / ${qIssues.length - crit} warning`, qIssues.slice(0, 6));
              }
            } catch (e) {
              console.error("[useAITrainingPlan] validateWeeklyQuotas failed:", e);
            }
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

          logPlanStat({
            ts: Date.now(), format: "json", objective: planConfig.objective ?? null,
            totalWeeks, totalChunks, durationMs: jsonDurMs, ok: true,
            sportObjectiveCriticalIssues: sportIssuesCount,
            customRatio, customSessionCount: customCount, nonRestSessionCount: nonRest,
            catalogSubstitutions,
            semanticRepairs,
          });

          setIsLoading(false);
          return;
        }

        // JSON failed → automatic fallback to Markdown path (full relaunch)
        const failCode = mergeError?.code ?? "UNKNOWN";
        const failMsg = mergeError?.message ?? "Erreur inconnue";
        console.warn(`[useAITrainingPlan] JSON path failed (${failCode}: ${failMsg}) — falling back to Markdown.`);
        toast.warning("Génération JSON échouée — plan généré en mode compatibilité");
        logPlanStat({
          ts: Date.now(), format: "markdown-fallback-from-json",
          objective: planConfig.objective ?? null,
          totalWeeks, totalChunks, durationMs: jsonDurMs, ok: false,
          errorCode: failCode, errorMessage: failMsg,
          schemaFailDetails: mergeError?.details,
        });
        // Fresh Markdown request (identical body, no header, no _outputFormat flag)
        // ⚠️ Strip `_outputFormat: "json"` from planConfig, sinon l'edge relance
        // le chemin JSON via le flag body et le fallback échoue en boucle.
        const { _outputFormat: _dropOutputFormat, ...planConfigMarkdown } = planConfigWithQuota as PlanConfig & { _outputFormat?: string };
        void _dropOutputFormat;
        const fallbackResp = await fetch(PLAN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            athleteData, planConfig: planConfigMarkdown, phaseCatalogs,
            chunkCatalogs: chunkCatalogs.length > 0 ? chunkCatalogs : undefined,
            chunkSize: CHUNK_SIZE, catalogDurationStats,
          }),
        });

        if (!fallbackResp.ok || !fallbackResp.body) {
          throw new Error("Fallback Markdown a échoué (HTTP).");
        }
        // Continue in the Markdown streaming code below using this fallback body.
        // Rebind the reader/response — reassign vars used further down.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (resp as any).__fallback_body_reader = fallbackResp.body.getReader();
        setChunkProgress(totalChunks > 1 ? { currentWeek: 0, totalWeeks, currentChunk: 1, totalChunks } : null);
        // fall through to Markdown streaming block
      }



      const markdownStartTs = Date.now();
      const isFallback = !!(resp as any).__fallback_body_reader;
      const reader = isFallback
        ? (resp as any).__fallback_body_reader as ReadableStreamDefaultReader<Uint8Array>
        : resp.body.getReader();
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
      // Log Markdown-path success (covers both direct-Markdown and JSON-then-fallback)
      logPlanStat({
        ts: Date.now(),
        format: isFallback ? "markdown-fallback-from-json" : "markdown",
        objective: planConfig.objective ?? null,
        totalWeeks, totalChunks,
        durationMs: Date.now() - markdownStartTs,
        ok: true,
      });
    } catch (e) {
      console.error("AI training plan error:", e);
      if (!(e instanceof Error && e.message === "__STREAM_ABORT__")) {
        const rawMsg = e instanceof Error ? e.message : String(e);
        const isNetwork = e instanceof TypeError
          || /load failed|failed to fetch|network|networkerror/i.test(rawMsg);
        const msg = isNetwork
          ? "connexion interrompue avec le service IA (réseau ou délai dépassé). Réessayez — si le Wi-Fi est instable, restez sur la page pendant la génération."
          : rawMsg;
        toast.error(`Impossible de générer le plan : ${msg}`);
      }

      logPlanStat({
        ts: Date.now(),
        format: jsonMode ? "json" : "markdown",
        objective: planConfig.objective ?? null,
        totalWeeks, totalChunks, durationMs: 0, ok: false,
        errorCode: "EXCEPTION",
        errorMessage: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setIsLoading(false);
      setChunkProgress(null);
    }
  }, [isLoading]);

  const reset = useCallback(() => {
    setResponse("");
    lastResponseRef.current = "";
    lastParsedPlanRef.current = null;
    setParsedPlan(null);
    setMergedPlan(null);
    setSportObjectiveIssues([]);
    setWeeklyQuotaIssues([]);
    setIsLoading(false);
    setChunkProgress(null);
  }, []);

  return {
    response, isLoading, chunkProgress, generatePlan, reset, setResponse,
    // Phase 1B — JSON-mode outputs (null when Markdown path was used).
    parsedPlan, mergedPlan, sportObjectiveIssues,
    // Phase 2A — quota hebdo moteur (validation post-merge).
    weeklyQuotaIssues, lastWeeklyQuotasRef,
    // Phase 0 QA — union catalogId injectés au dernier run (pour check B5).
    lastAllowedCatalogIdsRef,
    // Résultat brut immédiat du dernier run (évite les states périmés).
    lastResponseRef, lastParsedPlanRef,
  };
}
