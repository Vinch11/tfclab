import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState, useRef } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import type { MergedPlan, MergedWeek, MergedSession } from "@/lib/plan/mergePlanChunks";
import { jsonPlanToParsedPlan } from "@/lib/plan/jsonPlanToParsedPlan";
import { PILOT_PROFILES } from "../pilotCockpitProfiles";
import { resetBudgetState } from "../pilotCockpitBudget";
import { usePilotCockpit } from "../usePilotCockpit";
import { readPlanStats, type PlanGenerationStat } from "@/lib/plan/planGenerationStats";

const telemetry = (ts: number): PlanGenerationStat => ({
  ts, format: "json", ok: true, objective: "5 KM", totalWeeks: 12,
  totalChunks: 3, durationMs: 200,
  semanticRepairs: ["value_check_summary: tokens=1 conforme=1 relativized=0 unresolved=0 residualAbs=0"],
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Diagnostic coach (B-5K-BEGINNER, 1er run réel) — "la génération IA a
 * réussi" (confirmé côté Supabase : ok=true, 3 chunks, 114s, aucune erreur),
 * mais le Pilot Cockpit a rapporté un échec. Cause : `usePilotCockpit.
 * runProfile` lisait `plan.mergedPlan`/`plan.parsedPlan`/
 * `plan.lastGenerationUsage` (et `plan.sportObjectiveIssues`/
 * `plan.weeklyQuotaIssues`) sur l'objet `plan` capturé par la fermeture du
 * `useCallback` AU MOMENT DU CLIC — jamais mis à jour une fois la
 * génération commencée, même après son succès réel (cf. correctif
 * usePilotCockpit.ts : refs tenues à jour à chaque rendu, même mécanisme
 * déjà appliqué à `isLoadingRef`/déjà présent dans `useQARunner.ts`).
 *
 * Ce fichier reproduit le bug avec un `useAITrainingPlan` FACTICE qui :
 *   - passe `isLoading` à `true` immédiatement,
 *   - attend un délai (simule une vraie génération qui prend du temps),
 *   - PUIS pose `mergedPlan`/`parsedPlan`/`lastGenerationUsage`/les issues
 *     ET repasse `isLoading` à `false` — exactement la séquence réelle de
 *     `useAITrainingPlan.generatePlan()` (tous les `setState` de succès
 *     juste avant `setIsLoading(false)` en fin de fonction).
 * Sans le correctif (refs), `runProfile()` retomberait sur `merged`/
 * `parsed`/`usage` tous `null`, malgré un `generatePlan()` qui a
 * authentiquement réussi — ce test verrouille le comportement corrigé.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

function makeSession(overrides: Partial<MergedSession>): MergedSession {
  return {
    weekNumber: 1, weekTheme: "Base", phase: "base", dayName: "Lundi", dayIndex: 0,
    sport: "run", title: "EF", details: "30min Z2", isRest: false, isKeySession: false,
    catalogId: "A_RUN_EF_30", custom: false, durationMin: 30, zones: ["Z2"],
    ...overrides,
  };
}

function makeWeek(weekNumber: number, phase: string, sessions: MergedSession[]): MergedWeek {
  return { weekNumber, theme: "Chantier", phase, sessions: sessions.map((s) => ({ ...s, weekNumber })) };
}

const FAKE_MERGED: MergedPlan = {
  title: "Plan TFCL™ — 5K Test — 1 semaine",
  phases: [{ name: "Bloc unique", weeks: "S1", objective: "Développement" }],
  totalWeeks: 1,
  weeks: [
    makeWeek(1, "base", [
      makeSession({ dayName: "Lundi", dayIndex: 0 }),
      makeSession({ dayName: "Mercredi", dayIndex: 2, title: "Seuil", details: "2x10min Z4", zones: ["Z4"], isKeySession: true, durationMin: 35, catalogId: "B_RUN_SEUIL" }),
      makeSession({ dayName: "Dimanche", dayIndex: 6, title: "SL", details: "40min Z2", durationMin: 40, catalogId: "A_RUN_SL" }),
    ]),
  ],
};
const FAKE_PARSED = jsonPlanToParsedPlan(FAKE_MERGED);
const FAKE_USAGE = { promptTokens: 1200, completionTokens: 2400, totalTokens: 3600, chunksWithUsage: 3, totalChunksSeen: 3 };

/**
 * Hook factice remplaçant `useAITrainingPlan` — reproduit UNIQUEMENT la
 * séquence de setState pertinente pour ce bug (pas de fetch/SSE réel).
 */
function useFakeAITrainingPlanSuccess() {
  const [isLoading, setIsLoading] = useState(false);
  const [mergedPlan, setMergedPlan] = useState<MergedPlan | null>(null);
  const [parsedPlan, setParsedPlan] = useState<typeof FAKE_PARSED | null>(null);
  const [lastGenerationUsage, setLastGenerationUsage] = useState<typeof FAKE_USAGE | null>(null);
  const [sportObjectiveIssues, setSportObjectiveIssues] = useState<unknown[]>([]);
  const [weeklyQuotaIssues, setWeeklyQuotaIssues] = useState<unknown[]>([]);
  const lastAllowedCatalogIdsRef = useRef<string[]>([]);
  const lastWeeklyQuotasRef = useRef<Record<number, unknown>>({});

  const reset = () => {
    setMergedPlan(null);
    setParsedPlan(null);
    setLastGenerationUsage(null);
    setSportObjectiveIssues([]);
    setWeeklyQuotaIssues([]);
  };

  const generatePlan = async () => {
    setIsLoading(true);
    // Simule une vraie génération qui prend du temps (114s en réalité).
    await new Promise((r) => setTimeout(r, 200));
    setMergedPlan(FAKE_MERGED);
    setParsedPlan(FAKE_PARSED);
    setLastGenerationUsage(FAKE_USAGE);
    setSportObjectiveIssues([]);
    setWeeklyQuotaIssues([]);
    setIsLoading(false);
    localStorage.setItem("tfcl:plan_gen_stats", JSON.stringify([...readPlanStats(), telemetry(Date.now())].slice(-50)));
  };

  return {
    isLoading, mergedPlan, parsedPlan, lastGenerationUsage,
    sportObjectiveIssues, weeklyQuotaIssues,
    lastAllowedCatalogIdsRef, lastWeeklyQuotasRef,
    chunkProgress: null,
    reset, generatePlan,
  };
}

vi.mock("@/hooks/useAITrainingPlan", () => ({
  useAITrainingPlan: () => useFakeAITrainingPlanSuccess(),
}));

describe("usePilotCockpit — données React périmées (diagnostic coach B-5K-BEGINNER)", () => {
  beforeEach(() => {
    resetBudgetState();
    localStorage.setItem("tfcl:plan_gen_stats", JSON.stringify(Array.from({ length: 50 }, (_, i) => telemetry(i))));
  });

  it("récupère le plan complet (merged/parsed) et l'usage d'une génération qui a RÉELLEMENT réussi, pas l'état figé au clic", async () => {
    const { result } = renderHook(() => usePilotCockpit());
    const beginnerProfile = PILOT_PROFILES.find((p) => p.id === "B-5K-BEGINNER")!;

    // Volontairement PAS wrappé dans un seul `act(async () => ...)` englobant
    // tout l'appel : `runProfile` a lui-même besoin d'observer les rendus
    // intermédiaires (via les refs) PENDANT son exécution — un unique act()
    // autour de tout l'appel les retient jusqu'à la fin, masquant exactement
    // le mécanisme qu'on veut vérifier ici.
    const runResult = await result.current.runProfile(beginnerProfile);

    // Le cœur du bug : avant le correctif, ces trois champs restaient `null`
    // (lus sur l'objet `plan` figé au clic, avant tout succès) malgré un
    // generatePlan() authentiquement réussi.
    expect(runResult.merged).toBe(FAKE_MERGED);
    expect(runResult.parsed).toEqual(FAKE_PARSED);
    expect(runResult.usage).toEqual(FAKE_USAGE);
    // Conséquence directe si le bug était présent : un message d'échec
    // générique sur une génération qui a pourtant réussi.
    expect(runResult.errorMessage).toBeUndefined();
    expect(runResult.stat?.ok).toBe(true);
    expect(runResult.checks?.find(c => c.id === "B1")?.pass).toBe(true);
    expect(runResult.checks?.find(c => c.id === "B9")?.pass).toBe(true);

    // `lastResult` (exposé par le hook pour l'UI) converge vers la même
    // valeur une fois le rendu suivant commité.
    await waitFor(() => {
      expect(result.current.lastResult?.merged).toBe(FAKE_MERGED);
    });
    expect(result.current.lastResult?.parsed).toEqual(FAKE_PARSED);
    expect(result.current.lastResult?.errorMessage).toBeUndefined();
  }, 20000);
  // Timeout généreux (pas un délai lié au bug corrigé ici) : `waitForCompletion`
  // (usePilotCockpit.ts/useQARunner.ts) attend jusqu'à 15s qu'`isLoading`
  // "démarre" avant de surveiller sa fin — mais `generatePlan()` étant
  // toujours `await`é avant cet appel, `isLoading` est TOUJOURS déjà
  // retombé à `false` à ce moment-là (succès ou échec) : cette première
  // boucle ne "break" donc jamais et attend ses 15s pour rien, à CHAQUE
  // run, en prod comme ici. Latence réelle préexistante (identique dans
  // useQARunner.ts, donc antérieure à ce correctif) — observation notée
  // pour une suite séparée, hors du périmètre demandé ici (staleness des
  // données, pas la latence de ce polling).
});
