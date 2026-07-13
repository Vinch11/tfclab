/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Phase 0 — QA runner : orchestre 3 profils × N runs via useAITrainingPlan
 * ═══════════════════════════════════════════════════════════════════════════════
 * Non-invasif : ré-utilise le hook existant. Chaque itération :
 *   1. Force _outputFormat="json" sur le planConfig synthétique
 *   2. Appelle generatePlan (async)
 *   3. Attend la fin (isLoading → false) via un poll léger + timeout de garde
 *   4. Capture mergedPlan/parsedPlan/sportObjectiveIssues + dernière stat
 *   5. Exécute B1-B7 puis passe au run suivant
 * L'ensemble est séquentiel (jamais parallèle) — cohérent avec le budget IA.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { useCallback, useRef, useState } from "react";
import { useAITrainingPlan } from "@/hooks/useAITrainingPlan";
import { QA_PROFILES } from "./syntheticProfiles";
import { runAllChecks } from "./checks";
import { runMergeTests, type TestResult } from "@/lib/plan/mergeTests";
import { readPlanStats, type PlanGenerationStat } from "@/lib/plan/planGenerationStats";
import { computeVerdict, saveQASession, type QARunRecord, type QASession } from "./verdict";

export interface QARunnerProgress {
  running: boolean;
  currentRun: number;                    // 1..total
  totalRuns: number;                     // 3 × N
  currentProfile?: string;
  currentRunOfProfile?: number;
  N?: number;
}

const RUN_TIMEOUT_MS = 8 * 60 * 1000;    // 8 min max par run (garde-fou)
const POLL_INTERVAL_MS = 500;

async function waitForCompletion(getIsLoading: () => boolean, deadline: number): Promise<"done" | "timeout"> {
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    if (!getIsLoading()) return "done";
  }
  return "timeout";
}

export function useQARunner() {
  const plan = useAITrainingPlan();
  const [progress, setProgress] = useState<QARunnerProgress>({ running: false, currentRun: 0, totalRuns: 0 });
  const [lastSession, setLastSession] = useState<QASession | null>(null);
  const isLoadingRef = useRef(plan.isLoading);
  isLoadingRef.current = plan.isLoading;

  const runFullSuite = useCallback(async (N: 1 | 3 | 5) => {
    if (isLoadingRef.current) return;
    const totalRuns = QA_PROFILES.length * N;
    setProgress({ running: true, currentRun: 0, totalRuns, N });
    const runs: QARunRecord[] = [];
    const sessionStart = Date.now();

    for (const profile of QA_PROFILES) {
      for (let ri = 1; ri <= N; ri++) {
        const overallIndex = runs.length + 1;
        setProgress({
          running: true, currentRun: overallIndex, totalRuns,
          currentProfile: profile.id, currentRunOfProfile: ri, N,
        });
        const t0 = Date.now();
        const beforeStats = readPlanStats().length;
        let errorMessage: string | undefined;
        try {
          plan.reset();
          await new Promise(r => setTimeout(r, 50));
          // force JSON path
          await plan.generatePlan(profile.athleteData, { ...profile.planConfig, _outputFormat: "json" });
          const outcome = await waitForCompletion(() => isLoadingRef.current, Date.now() + RUN_TIMEOUT_MS);
          if (outcome === "timeout") errorMessage = "Timeout (>8 min) — génération non complétée.";
        } catch (e) {
          errorMessage = e instanceof Error ? e.message : String(e);
        }
        const durationMs = Date.now() - t0;
        // Capture: dernière stat ajoutée pendant ce run
        const allStats = readPlanStats();
        const newStat: PlanGenerationStat | undefined = allStats.length > beforeStats
          ? allStats[allStats.length - 1]
          : undefined;
        // Extract state (may be null si fallback markdown)
        const merged = plan.mergedPlan;
        const parsed = plan.parsedPlan;
        const issues = plan.sportObjectiveIssues;
        const allowedIds = plan.lastAllowedCatalogIdsRef.current;

        let checks;
        if (!merged || !parsed) {
          // Génération JSON non aboutie → un seul check B1 explicite
          checks = [
            {
              id: "B1" as const,
              label: "Zod planSchema OK sans échec définitif",
              level: "critical" as const,
              pass: false,
              details: [errorMessage ?? "Aucun mergedPlan/parsedPlan récupéré (fallback Markdown ou erreur)."],
            },
          ];
        } else {
          checks = runAllChecks({
            profileId: profile.id,
            merged, parsed,
            allowedCatalogIds: allowedIds,
            sportObjectiveIssues: issues,
            stat: newStat,
            objective: profile.planConfig.objective,
          });
        }
        runs.push({
          ts: Date.now(),
          profileId: profile.id,
          runIndex: ri,
          totalRuns: N,
          checks,
          stat: newStat,
          errorMessage,
          durationMs,
        });
      }
    }

    // Merge tests locaux
    let mergeTests: TestResult[] | null = null;
    try { mergeTests = await runMergeTests(); } catch { mergeTests = null; }

    const { verdict, summary } = computeVerdict(runs, mergeTests);
    const session: QASession = {
      ts: sessionStart, n: N, runs, mergeTests, verdict, summary,
    };
    saveQASession(session);
    setLastSession(session);
    setProgress({ running: false, currentRun: totalRuns, totalRuns, N });
    return session;
  }, [plan]);

  return { runFullSuite, progress, lastSession, setLastSession };
}
