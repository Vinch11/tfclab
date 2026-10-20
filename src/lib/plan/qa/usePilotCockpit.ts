/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Pilot Cockpit (consigne coach) — orchestration d'UN run réel, pour UN
 * profil, à la fois. Volontairement distinct de `useQARunner` (conçu pour
 * des campagnes de N répétitions × plusieurs profils) : ce cockpit sert à
 * piloter manuellement, profil par profil, le pilote de qualification Mode
 * B — un clic, un run, un rapport, une décision de continuer ou non.
 * ═══════════════════════════════════════════════════════════════════════════════
 * Réutilise les MÊMES briques que la génération réelle et que `useQARunner`
 * (même fonction `validatePlan`, même `runAllChecks`) — aucune logique de
 * validation réécrite pour ce cockpit.
 */
import { useCallback, useRef, useState } from "react";
import { useAITrainingPlan } from "@/hooks/useAITrainingPlan";
import { type QAProfile } from "./syntheticProfiles";
import { runAllChecks, type CheckResult } from "./checks";
import { readPlanStats, planStatsSince, type PlanGenerationStat } from "@/lib/plan/planGenerationStats";
import { validatePlan, type PlanValidationResult } from "@/engines/plan/planValidator";
import type { MergedPlan } from "@/lib/plan/mergePlanChunks";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import type { PreparedTrainingPlanContext, TrainingPlanPhysiologicalTrace } from "@/engines/plan";
import { preparePilotTrainingPlanContext } from "./preparePilotTrainingPlanContext";
import { auditBeginnerRunSafety } from "./auditBeginnerRunSafety";
import { buildPilotSafetyExport } from "./buildPilotSafetyExport";
import {
  buildSessionPhysiologicalTraceability,
  type SessionPhysiologicalTraceabilityReport,
} from "./sessionPhysiologicalTraceability";
import {
  appendRun, checkBudgetBeforeLaunch, readBudgetState,
  CREDIT_PER_CHUNK_LOW, CREDIT_PER_CHUNK_HIGH,
  type BudgetCheckResult, type BudgetState,
} from "./pilotCockpitBudget";

const RUN_TIMEOUT_MS = 8 * 60 * 1000;
const POLL_INTERVAL_MS = 500;

async function waitForCompletion(getIsLoading: () => boolean, deadline: number): Promise<"done" | "timeout"> {
  const startupDeadline = Math.min(deadline, Date.now() + 15000);
  while (Date.now() < startupDeadline) {
    if (getIsLoading()) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    if (!getIsLoading()) return "done";
  }
  return "timeout";
}

/**
 * Diagnostic coach (échec silencieux B-5K-BEGINNER, 1er run réel) — avant ce
 * correctif, `runProfile` retombait TOUJOURS sur le message générique
 * "Aucun mergedPlan/parsedPlan récupéré (échec de génération)" dès que
 * `merged`/`parsed` étaient null, car `plan.generatePlan()` (useAITrainingPlan.ts)
 * avale lui-même TOUTES ses erreurs dans son propre catch (console.error +
 * toast.error + logPlanStat) et ne relance JAMAIS — le `try/catch` autour de
 * `await plan.generatePlan(...)` ici ne capture donc quasiment rien en
 * pratique. La cause réelle (HTTP, 429/402, timeout, échec Zod client,
 * event SSE "error", échec du merge...) existe pourtant bel et bien : elle
 * est déjà écrite dans le `PlanGenerationStat` que `logPlanStat` vient de
 * persister (`errorCode`/`errorMessage`/`schemaFailDetails`), lu juste
 * au-dessus via `readPlanStats()` — seulement jamais transmise jusqu'à
 * `result.errorMessage`, celui que `PilotCockpitPanel` affiche réellement.
 * Même angle mort déjà présent dans `useQARunner.ts` (cf. son commentaire
 * "report only shows..."), copié sans correction lors de la création de ce
 * cockpit — corrigé ICI plutôt que dans `useQARunner` pour rester dans le
 * périmètre du Pilot Cockpit (consigne coach).
 */
export function resolvePilotRunErrorMessage(stat: PlanGenerationStat | undefined): string {
  if (stat && stat.ok === false) {
    const codePart = stat.errorCode ? `[${stat.errorCode}] ` : "";
    const schemaDetail = stat.schemaFailDetails?.zodErrorText ?? stat.schemaFailDetails?.parseError;
    const parts = [stat.errorMessage?.trim(), schemaDetail].filter((s): s is string => !!s && s.length > 0);
    return `${codePart}${parts.length > 0 ? parts.join(" — ") : "cause non précisée dans planGenerationStats"}`;
  }
  return 'Aucun mergedPlan/parsedPlan récupéré (échec de génération) — aucun détail capturé dans planGenerationStats pour ce run. Vérifiez la console navigateur, le localStorage "tfcl:plan_gen_stats", ou les logs Supabase de la fonction Edge "ai-training-plan".';
}

export interface PilotCockpitResult {
  profileId: string;
  ts: number;
  durationMs: number;
  merged: MergedPlan | null;
  parsed: ParsedPlan | null;
  stat: PlanGenerationStat | undefined;
  checks: CheckResult[] | null;
  validatorResult: PlanValidationResult | null;
  physiologicalTrace: TrainingPlanPhysiologicalTrace | null;
  sessionPhysiologicalTraceability: SessionPhysiologicalTraceabilityReport | null;
  preparedContext: PreparedTrainingPlanContext | null;
  errorMessage?: string;
  usage: {
    promptTokens: number; completionTokens: number; totalTokens: number;
    chunksWithUsage: number; totalChunksSeen: number;
  } | null;
}

export function usePilotCockpit() {
  const plan = useAITrainingPlan();
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<PilotCockpitResult | null>(null);
  const [budget, setBudget] = useState<BudgetState>(() => readBudgetState());

  // Diagnostic coach (B-5K-BEGINNER, génération réussie côté serveur —
  // ok=true, 3 chunks, 114s — mais lue comme un échec) — `runProfile`
  // (ci-dessous) est un `useCallback` qui capture `plan` dans sa fermeture
  // AU MOMENT DU CLIC. La génération dure, elle, ~2 minutes : `plan.reset()`
  // puis `plan.generatePlan(...)` mettent à jour l'état React RÉEL via les
  // setters internes de `useAITrainingPlan` (setMergedPlan/setParsedPlan/
  // setLastGenerationUsage), mais ces mises à jour ne sont JAMAIS visibles
  // sur l'objet `plan` déjà capturé par cette fermeture — lire `plan.mergedPlan`
  // après l'attente retombe donc TOUJOURS sur l'état figé au clic (donc
  // `null`, puisque `reset()` vient de l'effacer), quel que soit le résultat
  // réel de la génération. Même mécanisme déjà identifié pour `isLoading`
  // ci-dessous (`isLoadingRef`) — seulement jamais étendu à mergedPlan/
  // parsedPlan/lastGenerationUsage lors de la création de ce cockpit.
  // `useQARunner.ts` (dont ce cockpit s'inspire) l'avait déjà résolu
  // correctement pour `mergedPlan`/`parsedPlan` via le même procédé de refs
  // tenues à jour à CHAQUE rendu (son commentaire : "so async runFullSuite
  // reads live values, not the state captured by the useCallback closure at
  // click-time") — reproduit ici à l'identique, étendu à `lastGenerationUsage`
  // (champ que `useQARunner` ne suit pas).
  const isLoadingRef = useRef(plan.isLoading);
  const mergedPlanRef = useRef(plan.mergedPlan);
  const parsedPlanRef = useRef(plan.parsedPlan);
  const lastGenerationUsageRef = useRef(plan.lastGenerationUsage);
  // Même bug, même correctif : `sportObjectiveIssues`/`weeklyQuotaIssues`
  // sont aussi de simples `useState` (pas déjà des refs internes comme
  // `lastAllowedCatalogIdsRef`/`lastWeeklyQuotasRef` ci-dessous, qui eux
  // restent toujours à jour car la ref ELLE-MÊME — pas sa valeur — est
  // stable entre rendus). Repérés en étendant le même correctif à tout
  // l'état lu après l'attente, pas seulement mergedPlan/parsedPlan.
  const sportObjectiveIssuesRef = useRef(plan.sportObjectiveIssues);
  const weeklyQuotaIssuesRef = useRef(plan.weeklyQuotaIssues);
  isLoadingRef.current = plan.isLoading;
  mergedPlanRef.current = plan.mergedPlan;
  parsedPlanRef.current = plan.parsedPlan;
  lastGenerationUsageRef.current = plan.lastGenerationUsage;
  sportObjectiveIssuesRef.current = plan.sportObjectiveIssues;
  weeklyQuotaIssuesRef.current = plan.weeklyQuotaIssues;

  const checkBudget = useCallback((expectedChunks: number): BudgetCheckResult => {
    return checkBudgetBeforeLaunch(budget, expectedChunks);
  }, [budget]);

  const runProfile = useCallback(async (profile: QAProfile): Promise<PilotCockpitResult> => {
    if (isLoadingRef.current) {
      throw new Error("Une génération est déjà en cours — attendez la fin.");
    }
    setIsRunning(true);
    const t0 = Date.now();
    const beforeStats = readPlanStats();
    let errorMessage: string | undefined;
    let preparedContext: PreparedTrainingPlanContext | null = null;

    try {
      preparedContext = preparePilotTrainingPlanContext(profile);
      plan.reset();
      await new Promise((r) => setTimeout(r, 50));
      await plan.generatePlan(preparedContext.athleteData, { ...preparedContext.planConfig, _outputFormat: "json" });
      const outcome = await waitForCompletion(() => isLoadingRef.current, Date.now() + RUN_TIMEOUT_MS);
      if (outcome === "timeout") {
        errorMessage = "Timeout (>8 min) — génération non complétée.";
      }
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : String(e);
    }

    // Laisser React committer les derniers setState (mergedPlan/parsedPlan/usage).
    await new Promise((r) => setTimeout(r, 100));

    const durationMs = Date.now() - t0;
    const allStats = readPlanStats();
    const newStats = planStatsSince(beforeStats, allStats, t0);
    const failStat = newStats.find((s) => s.schemaFailDetails || (!s.ok && s.errorCode));
    const newStat: PlanGenerationStat | undefined = failStat ?? newStats[newStats.length - 1];
    // Toujours lire via les refs (cf. commentaire plus haut) — JAMAIS
    // `plan.mergedPlan`/`plan.parsedPlan` directement, qui retomberaient sur
    // l'état figé au clic.
    const merged = mergedPlanRef.current;
    const parsed = parsedPlanRef.current;

    let checks: CheckResult[] | null = null;
    let validatorResult: PlanValidationResult | null = null;
    let sessionPhysiologicalTraceability: SessionPhysiologicalTraceabilityReport | null = null;

    if (merged && parsed) {
      try {
        checks = runAllChecks({
          profileId: profile.id,
          merged, parsed,
          allowedCatalogIds: plan.lastAllowedCatalogIdsRef.current,
          sportObjectiveIssues: sportObjectiveIssuesRef.current,
          stat: newStat,
          objective: preparedContext?.planConfig.objective ?? profile.planConfig.objective,
          quotaIssues: weeklyQuotaIssuesRef.current,
          quotasByWeek: plan.lastWeeklyQuotasRef.current,
        });
      } catch (e) {
        errorMessage = errorMessage ?? `runAllChecks a échoué : ${e instanceof Error ? e.message : String(e)}`;
      }

      try {
        const cfg = preparedContext?.planConfig ?? profile.planConfig;
        // raceFormat n'existe que sur RaceGoal (pas PlanConfig) — cf. useAITrainingPlan.ts
        const isLcw3Day = Array.isArray(cfg.raceGoals) && cfg.raceGoals.some((g) => g?.raceFormat === "lcw_3day");
        validatorResult = validatePlan(
          parsed,
          cfg.objective,
          cfg.prohibitions,
          undefined, // raceWeekNumbers
          cfg.identifiedLimiters,
          cfg.identifiedLimitersRaw,
          preparedContext?.athleteData ?? profile.athleteData,
          undefined, // coachLimiterOrder
          { sessionsPerWeek: cfg.sessionsPerWeek, maxSessionsPerDay: cfg.maxSessionsPerDay },
          cfg.injuryRisk,
          cfg.ambition,
          cfg.constraints,
          isLcw3Day,
          cfg.deloadCadenceWeeks,
          // P1 (audit "B-5K-BEGINNER round 2") : signal de niveau réel du
          // profil QA — cf. validateDemandingSessionAccumulation. Profils
          // sans ambitionMeta (pas encore renseigné) = contrôle inactif.
          cfg.ambitionMeta
            ? { trainingLevel: cfg.ambitionMeta.trainingLevel, trainingLevelSource: cfg.ambitionMeta.trainingLevelSource }
            : null,
        );
      } catch (e) {
        errorMessage = errorMessage ?? `validatePlan a échoué : ${e instanceof Error ? e.message : String(e)}`;
      }

      try {
        const cfg = preparedContext?.planConfig ?? profile.planConfig;
        sessionPhysiologicalTraceability = buildSessionPhysiologicalTraceability({
          plan: merged,
          planConfig: cfg,
          allowedCatalogIds: plan.lastAllowedCatalogIdsRef.current,
        });
      } catch (e) {
        errorMessage = errorMessage ?? `La traçabilité physiologique a échoué : ${e instanceof Error ? e.message : String(e)}`;
      }
    } else if (!errorMessage) {
      errorMessage = resolvePilotRunErrorMessage(newStat);
    }

    // Idem — via la ref, pas `plan.lastGenerationUsage` directement.
    const usage = lastGenerationUsageRef.current ? { ...lastGenerationUsageRef.current } : null;

    const result: PilotCockpitResult = {
      profileId: profile.id, ts: t0, durationMs, merged, parsed, stat: newStat,
      checks, validatorResult, physiologicalTrace: preparedContext?.trace ?? null,
      sessionPhysiologicalTraceability, preparedContext, errorMessage, usage,
    };
    setLastResult(result);

    // Budget — toujours enregistré (même en cas d'échec : la consommation
    // a quand même pu avoir lieu sur les chunks tentés avant l'échec).
    // Diagnostic coach — `usageSource` rend explicite que "fallback_estimate"
    // suppose le coût PLEIN (expectedChunks), jamais zéro : l'absence de
    // confirmation du gateway n'est jamais une preuve d'absence de facturation.
    const hasMeasuredUsage = typeof usage?.totalChunksSeen === "number" && usage.totalChunksSeen > 0;
    const chunksForEstimate = hasMeasuredUsage ? usage.totalChunksSeen : profile.expectedChunks;
    const nextBudget = appendRun({
      profileId: profile.id,
      ts: t0,
      chunks: chunksForEstimate,
      estimatedCreditsLow: chunksForEstimate * CREDIT_PER_CHUNK_LOW,
      estimatedCreditsHigh: chunksForEstimate * CREDIT_PER_CHUNK_HIGH,
      realTotalTokens: usage?.totalTokens,
      realChunksWithUsage: usage?.chunksWithUsage,
      realTotalChunksSeen: usage?.totalChunksSeen,
      usageSource: hasMeasuredUsage ? "measured" : "fallback_estimate",
    });
    setBudget(nextBudget);

    setIsRunning(false);
    return result;
  }, [plan]);

  /** Explicit coach-provided RUN-only contracts; never guesses from mixed-sport quotas. */
  const exportLastRunSafety = useCallback((config: Parameters<typeof auditBeginnerRunSafety>[1]) => {
    if (!lastResult?.merged) return null;
    const issues = auditBeginnerRunSafety(lastResult.merged, config);
    return buildPilotSafetyExport(lastResult.merged, issues);
  }, [lastResult]);

  return {
    isRunning, lastResult, runProfile, checkBudget, budget, exportLastRunSafety,
    chunkProgress: plan.chunkProgress,
  };
}
