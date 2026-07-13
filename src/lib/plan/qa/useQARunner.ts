/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Phase 0 — QA runner : orchestre 3 profils × N runs via useAITrainingPlan
 * ═══════════════════════════════════════════════════════════════════════════════
 * Non-invasif : ré-utilise le hook existant.
 *
 * BUG-FIX (rapport vide) — étapes sécurisées :
 *   0. Merge tests (8 cas) exécutés AU DÉBUT du run ; jamais null dans le
 *      rapport ; échec → raison écrite dans `mergeTestsError`.
 *   1. Chaque génération dans try/catch → errorMessage + errorStack (500 chars).
 *   2. Chaque runAllChecks dans try/catch → erreur → un checks synthétique
 *      B1=fail avec la stack.
 *   3. Progress + verdict TOUJOURS persistés, même si toutes les générations
 *      échouent, pour que le rapport contienne les diagnostics.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { useCallback, useRef, useState } from "react";
import { useAITrainingPlan } from "@/hooks/useAITrainingPlan";
import { QA_PROFILES } from "./syntheticProfiles";
import { runAllChecks, type CheckResult } from "./checks";
import { runMergeTests, type TestResult } from "@/lib/plan/mergeTests";
import { readPlanStats, type PlanGenerationStat } from "@/lib/plan/planGenerationStats";
import { computeVerdict, saveQASession, type QARunRecord, type QASession } from "./verdict";

export interface QARunnerProgress {
  running: boolean;
  currentRun: number;
  totalRuns: number;
  currentProfile?: string;
  currentRunOfProfile?: number;
  N?: number;
  phase?: "merge-tests" | "generation" | "checks" | "finalizing";
}

const RUN_TIMEOUT_MS = 8 * 60 * 1000;
const POLL_INTERVAL_MS = 500;

function truncStack(e: unknown): string {
  const s = e instanceof Error ? (e.stack || e.message) : String(e);
  return s.slice(0, 500);
}

async function waitForCompletion(getIsLoading: () => boolean, deadline: number): Promise<"done" | "timeout"> {
  // Attendre d'abord que isLoading passe à true (démarrage), puis à false (fin).
  const startupDeadline = Math.min(deadline, Date.now() + 15000);
  while (Date.now() < startupDeadline) {
    if (getIsLoading()) break;
    await new Promise(r => setTimeout(r, 100));
  }
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

  const runFullSuite = useCallback(async (N: 1 | 3 | 5): Promise<QASession> => {
    if (isLoadingRef.current) throw new Error("Une génération est déjà en cours — attendez la fin.");
    const totalRuns = QA_PROFILES.length * N;
    setProgress({ running: true, currentRun: 0, totalRuns, N, phase: "merge-tests" });
    const runs: QARunRecord[] = [];
    const sessionStart = Date.now();

    // ── Étape 0 : merge tests EN PREMIER, jamais null ──────────────────────
    let mergeTests: TestResult[] | null = null;
    let mergeTestsError: string | undefined;
    try {
      mergeTests = await runMergeTests();
    } catch (e) {
      mergeTestsError = truncStack(e);
      mergeTests = null;
    }

    // ── Étape 1..N : générations ───────────────────────────────────────────
    for (const profile of QA_PROFILES) {
      for (let ri = 1; ri <= N; ri++) {
        const overallIndex = runs.length + 1;
        setProgress({
          running: true, currentRun: overallIndex, totalRuns,
          currentProfile: profile.id, currentRunOfProfile: ri, N,
          phase: "generation",
        });
        const t0 = Date.now();
        const beforeStats = readPlanStats().length;
        let errorMessage: string | undefined;
        let errorStack: string | undefined;

        try {
          plan.reset();
          await new Promise(r => setTimeout(r, 50));
          await plan.generatePlan(profile.athleteData, { ...profile.planConfig, _outputFormat: "json" });
          const outcome = await waitForCompletion(() => isLoadingRef.current, Date.now() + RUN_TIMEOUT_MS);
          if (outcome === "timeout") {
            errorMessage = "Timeout (>8 min) — génération non complétée.";
          }
        } catch (e) {
          errorMessage = e instanceof Error ? e.message : String(e);
          errorStack = truncStack(e);
        }

        const durationMs = Date.now() - t0;
        const allStats = readPlanStats();
        const newStat: PlanGenerationStat | undefined = allStats.length > beforeStats
          ? allStats[allStats.length - 1]
          : undefined;
        const merged = plan.mergedPlan;
        const parsed = plan.parsedPlan;
        const issues = plan.sportObjectiveIssues;
        const allowedIds = plan.lastAllowedCatalogIdsRef.current;

        setProgress(p => ({ ...p, phase: "checks" }));

        let checks: CheckResult[];
        if (!merged || !parsed) {
          checks = [{
            id: "B1",
            label: "Zod planSchema OK sans échec définitif",
            level: "critical",
            pass: false,
            details: [
              errorMessage ?? "Aucun mergedPlan/parsedPlan récupéré (fallback Markdown ou erreur).",
              errorStack ? `stack: ${errorStack}` : "",
            ].filter(Boolean),
          }];
        } else {
          try {
            checks = runAllChecks({
              profileId: profile.id,
              merged, parsed,
              allowedCatalogIds: allowedIds,
              sportObjectiveIssues: issues,
              stat: newStat,
              objective: profile.planConfig.objective,
            });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            const stk = truncStack(e);
            checks = [{
              id: "B1",
              label: "Zod planSchema OK sans échec définitif",
              level: "critical",
              pass: false,
              details: [`Exception runAllChecks : ${msg}`, `stack: ${stk}`],
            }];
            errorMessage = errorMessage ?? `runAllChecks threw: ${msg}`;
            errorStack = errorStack ?? stk;
          }
        }

        runs.push({
          ts: Date.now(),
          profileId: profile.id,
          runIndex: ri,
          totalRuns: N,
          checks,
          stat: newStat,
          errorMessage,
          errorStack,
          durationMs,
        });
      }
    }

    // ── Étape finale : verdict + persistance ───────────────────────────────
    setProgress(p => ({ ...p, phase: "finalizing" }));
    const { verdict, summary } = computeVerdict(runs, mergeTests);
    const session: QASession = {
      ts: sessionStart, n: N, runs, mergeTests, mergeTestsError, verdict, summary,
    };
    try { saveQASession(session); } catch { /* ignore quota */ }
    setLastSession(session);
    setProgress({ running: false, currentRun: totalRuns, totalRuns, N });
    return session;
  }, [plan]);

  return { runFullSuite, progress, lastSession, setLastSession };
}
