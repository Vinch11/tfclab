/**
 * Hook for streaming AI training plan generation
 */
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { buildWorkoutCatalog, serializeCatalogForPrompt, computeCatalogDurationStats } from "@/lib/workoutCatalogBuilder";
import type { CatalogDurationStats } from "@/lib/workoutCatalogBuilder";
import { supabase } from "@/integrations/supabase/client";

const PLAN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-training-plan`;

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

  const generatePlan = useCallback(async (athleteData: PlanAthleteData, planConfig: PlanConfig) => {
    // Guard against double-fire
    if (isLoading) {
      console.warn("Plan generation already in progress — ignoring duplicate call");
      return;
    }
    // ─── Durée du plan : OBLIGATOIRE, pas de défaut caché ────────────────
    // Un défaut fabriqué invisible (ancien `|| 12`) masquait des générations
    // 12 sem sur des athlètes sans course ni durée renseignée.
    const totalWeeks = planConfig.weeksAvailable;
    if (!totalWeeks || totalWeeks <= 0) {
      toast.error("Durée du plan manquante. Renseigne une date de course ou une durée libre (formulaire coach).");
      return;
    }
    setResponse("");
    setIsLoading(true);
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
      const phaseRanges: Array<{ phase: string; start: number; end: number }> = [
        { phase: "base", start: 1, end: Math.ceil(totalWeeks * 0.35) },
        { phase: "build", start: Math.ceil(totalWeeks * 0.25), end: Math.ceil(totalWeeks * 0.65) },
        { phase: "peak", start: Math.ceil(totalWeeks * 0.55), end: Math.ceil(totalWeeks * 0.85) },
        { phase: "taper", start: Math.ceil(totalWeeks * 0.80), end: totalWeeks },
      ];

      // Compute catalog duration stats from all phases combined
      let allCatalogEntries: ReturnType<typeof buildWorkoutCatalog> = [];
      const usedIds = new Set<string>();

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
          { maxItems: 80, chunkIndex: i, excludeIds: usedIds, limiters: limiterKeys, prohibitions: planConfig.prohibitions }
        );
        phaseCatalogs[pr.phase] = serializeCatalogForPrompt(catalog);
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
          // 45 sessions/chunk: enough variety, much less noise than 80 (≈45% reduction)
          const chunkCatalog = buildWorkoutCatalog(
            planConfig.objective || "",
            cStart,
            cEnd,
            totalWeeks,
            { maxItems: 45, chunkIndex: ci, excludeIds: chunkUsedIds, limiters: limiterKeys, prohibitions: planConfig.prohibitions }
          );
          chunkCatalogs.push(serializeCatalogForPrompt(chunkCatalog));
          // Soft rotation: only exclude ~half the previous chunk's IDs to allow progression continuity
          const halfIds = chunkCatalog.slice(0, Math.floor(chunkCatalog.length / 2)).map(e => e.id);
          halfIds.forEach(id => chunkUsedIds.add(id));
        }
      }

      // Derive duration stats from the actual library — sent to edge function
      const catalogDurationStats = computeCatalogDurationStats(allCatalogEntries);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Session expirée, reconnectez-vous.");
        setIsLoading(false);
        return;
      }
      const resp = await fetch(PLAN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          athleteData,
          planConfig,
          phaseCatalogs,
          chunkCatalogs: chunkCatalogs.length > 0 ? chunkCatalogs : undefined,
          chunkSize: CHUNK_SIZE,
          catalogDurationStats,
        }),
      });

      if (resp.status === 429) {
        toast.error("Rate limit dépassé, réessayez dans quelques instants.");
        setIsLoading(false);
        setChunkProgress(null);
        return;
      }
      if (resp.status === 402) {
        toast.error("Crédits IA épuisés.");
        setIsLoading(false);
        setChunkProgress(null);
        return;
      }
      if (!resp.ok || !resp.body) {
        throw new Error("Erreur du service IA");
      }

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
              setResponse(fullText);
            }
          } catch (err) {
            if (err instanceof Error && err.message === "__STREAM_ABORT__") throw err;
            /* ignore */
          }
        }
      }
    } catch (e) {
      console.error("AI training plan error:", e);
      if (!(e instanceof Error && e.message === "__STREAM_ABORT__")) {
        toast.error("Impossible de générer le plan d'entraînement");
      }
    } finally {
      setIsLoading(false);
      setChunkProgress(null);
    }
  }, [isLoading]);

  const reset = useCallback(() => {
    setResponse("");
    setIsLoading(false);
    setChunkProgress(null);
  }, []);

  return { response, isLoading, chunkProgress, generatePlan, reset, setResponse };
}
