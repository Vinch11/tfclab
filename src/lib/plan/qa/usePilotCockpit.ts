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
import { readPlanStats, type PlanGenerationStat } from "@/lib/plan/planGenerationStats";
import { validatePlan, type PlanValidationResult } from "@/engines/plan/planValidator";
import type { MergedPlan, ParsedPlan } from "@/lib/plan/mergePlanChunks";
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

export interface PilotCockpitResult {
  profileId: string;
  ts: number;
  durationMs: number;
  merged: MergedPlan | null;
  parsed: ParsedPlan | null;
  stat: PlanGenerationStat | undefined;
  checks: CheckResult[] | null;
  validatorResult: PlanValidationResult | null;
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

  const isLoadingRef = useRef(plan.isLoading);
  isLoadingRef.current = plan.isLoading;

  const checkBudget = useCallback((expectedChunks: number): BudgetCheckResult => {
    return checkBudgetBeforeLaunch(budget, expectedChunks);
  }, [budget]);

  const runProfile = useCallback(async (profile: QAProfile): Promise<PilotCockpitResult> => {
    if (isLoadingRef.current) {
      throw new Error("Une génération est déjà en cours — attendez la fin.");
    }
    setIsRunning(true);
    const t0 = Date.now();
    const beforeStats = readPlanStats().length;
    let errorMessage: string | undefined;

    try {
      plan.reset();
      await new Promise((r) => setTimeout(r, 50));
      await plan.generatePlan(profile.athleteData, { ...profile.planConfig, _outputFormat: "json" });
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
    const newStats = allStats.slice(beforeStats);
    const failStat = newStats.find((s) => s.schemaFailDetails || (!s.ok && s.errorCode));
    const newStat: PlanGenerationStat | undefined = failStat ?? newStats[newStats.length - 1];
    const merged = plan.mergedPlan;
    const parsed = plan.parsedPlan;

    let checks: CheckResult[] | null = null;
    let validatorResult: PlanValidationResult | null = null;

    if (merged && parsed) {
      try {
        checks = runAllChecks({
          profileId: profile.id,
          merged, parsed,
          allowedCatalogIds: plan.lastAllowedCatalogIdsRef.current,
          sportObjectiveIssues: plan.sportObjectiveIssues,
          stat: newStat,
          objective: profile.planConfig.objective,
          quotaIssues: plan.weeklyQuotaIssues,
          quotasByWeek: plan.lastWeeklyQuotasRef.current,
        });
      } catch (e) {
        errorMessage = errorMessage ?? `runAllChecks a échoué : ${e instanceof Error ? e.message : String(e)}`;
      }

      try {
        const cfg = profile.planConfig;
        const isLcw3Day = cfg.raceFormat === "lcw_3day"
          || (Array.isArray(cfg.raceGoals) && cfg.raceGoals.some((g) => g?.raceFormat === "lcw_3day"));
        validatorResult = validatePlan(
          parsed,
          cfg.objective,
          undefined, // prohibitions — nécessite un diagnostic coach, absent des profils synthétiques (limite connue, cf. rapport Étape 2)
          undefined, // raceWeekNumbers
          undefined, // identifiedLimiters
          undefined, // identifiedLimiterKeys
          profile.athleteData,
          undefined, // coachLimiterOrder
          { sessionsPerWeek: cfg.sessionsPerWeek, maxSessionsPerDay: cfg.maxSessionsPerDay },
          undefined, // injuryRisk
          cfg.ambition,
          cfg.constraints,
          isLcw3Day,
          cfg.deloadCadenceWeeks,
        );
      } catch (e) {
        errorMessage = errorMessage ?? `validatePlan a échoué : ${e instanceof Error ? e.message : String(e)}`;
      }
    } else if (!errorMessage) {
      errorMessage = "Aucun mergedPlan/parsedPlan récupéré (échec de génération).";
    }

    const usage = plan.lastGenerationUsage ? { ...plan.lastGenerationUsage } : null;

    const result: PilotCockpitResult = {
      profileId: profile.id, ts: t0, durationMs, merged, parsed, stat: newStat,
      checks, validatorResult, errorMessage, usage,
    };
    setLastResult(result);

    // Budget — toujours enregistré (même en cas d'échec : la consommation
    // a quand même pu avoir lieu sur les chunks tentés avant l'échec).
    const chunksForEstimate = usage?.totalChunksSeen && usage.totalChunksSeen > 0
      ? usage.totalChunksSeen
      : profile.expectedChunks;
    const nextBudget = appendRun({
      profileId: profile.id,
      ts: t0,
      chunks: chunksForEstimate,
      estimatedCreditsLow: chunksForEstimate * CREDIT_PER_CHUNK_LOW,
      estimatedCreditsHigh: chunksForEstimate * CREDIT_PER_CHUNK_HIGH,
      realTotalTokens: usage?.totalTokens,
      realChunksWithUsage: usage?.chunksWithUsage,
      realTotalChunksSeen: usage?.totalChunksSeen,
    });
    setBudget(nextBudget);

    setIsRunning(false);
    return result;
  }, [plan]);

  return {
    isRunning, lastResult, runProfile, checkBudget, budget,
    chunkProgress: plan.chunkProgress,
  };
}
