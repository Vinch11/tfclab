import { describe, it, expect, vi, beforeEach } from "vitest";
import { useRef, useState } from "react";
import { renderHook } from "@testing-library/react";
import { PILOT_PROFILES } from "../pilotCockpitProfiles";
import { resetBudgetState } from "../pilotCockpitBudget";
import { usePilotCockpit } from "../usePilotCockpit";

/**
 * JOUR 1 — SÉCURISATION DU DÉPLOIEMENT (consigne coach explicite) :
 * `usePilotCockpit.runProfile` prend un 3e paramètre optionnel
 * `functionName`, EXPLICITEMENT opt-in, qui pose `PlanConfig.
 * _pilotFunctionName` pour CE run uniquement (jamais par défaut). Objectif :
 * permettre de tester le moteur corrigé via une fonction Edge de test
 * distincte ("ai-training-plan-test") sans jamais déployer par-dessus la
 * fonction de production utilisée par les athlètes réels.
 *
 * Ce test vérifie que le câblage atteint réellement l'appel à
 * `plan.generatePlan(...)` — pas seulement un paramètre mort — et que tout
 * appel SANS 3e argument reste identique au comportement normal (aucun
 * champ `_pilotFunctionName` posé, donc `useAITrainingPlan.ts` utilise la
 * constante PLAN_URL de production inchangée).
 */

let capturedConfigs: Record<string, unknown>[] = [];

function useFakeAITrainingPlanCapture() {
  const [isLoading, setIsLoading] = useState(false);
  const lastAllowedCatalogIdsRef = useRef<string[]>([]);
  const lastWeeklyQuotasRef = useRef<Record<number, unknown>>({});

  const reset = () => { /* no-op */ };

  const generatePlan = async (_athleteData: unknown, planConfig: Record<string, unknown>) => {
    capturedConfigs.push(planConfig);
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 50));
    setIsLoading(false);
  };

  return {
    isLoading, mergedPlan: null, parsedPlan: null, lastGenerationUsage: null,
    sportObjectiveIssues: [], weeklyQuotaIssues: [],
    lastAllowedCatalogIdsRef, lastWeeklyQuotasRef,
    chunkProgress: null,
    reset, generatePlan,
  };
}

vi.mock("@/hooks/useAITrainingPlan", () => ({
  useAITrainingPlan: () => useFakeAITrainingPlanCapture(),
}));

describe("usePilotCockpit.runProfile — fonction Edge de test isolée (_pilotFunctionName)", () => {
  beforeEach(() => {
    resetBudgetState();
    capturedConfigs = [];
  });

  // Timeouts généreux : cf. usePilotCockpit.pilotMaxChunks.test.ts (latence
  // préexistante de waitForCompletion, pas liée à ce correctif).

  it("sans 3e argument (appel normal) → _pilotFunctionName n'est JAMAIS posé sur le planConfig envoyé à generatePlan", async () => {
    const { result } = renderHook(() => usePilotCockpit());
    const profile = PILOT_PROFILES.find((p) => p.id === "B-10K-TO-70.3")!;

    await result.current.runProfile(profile);

    expect(capturedConfigs).toHaveLength(1);
    expect("_pilotFunctionName" in capturedConfigs[0]).toBe(false);
  }, 20000);

  it("avec functionName='ai-training-plan-test' → _pilotFunctionName atteint réellement planConfig envoyé à generatePlan", async () => {
    const { result } = renderHook(() => usePilotCockpit());
    const profile = PILOT_PROFILES.find((p) => p.id === "B-10K-TO-70.3")!;

    await result.current.runProfile(profile, undefined, "ai-training-plan-test");

    expect(capturedConfigs).toHaveLength(1);
    expect(capturedConfigs[0]._pilotFunctionName).toBe("ai-training-plan-test");
  }, 20000);

  it("combinable avec maxChunks (1er chunk sur la fonction de test) — les deux champs coexistent sans interférence", async () => {
    const { result } = renderHook(() => usePilotCockpit());
    const profile = PILOT_PROFILES.find((p) => p.id === "B-10K-TO-70.3")!;

    await result.current.runProfile(profile, 1, "ai-training-plan-test");

    expect(capturedConfigs).toHaveLength(1);
    expect(capturedConfigs[0]._pilotMaxChunks).toBe(1);
    expect(capturedConfigs[0]._pilotFunctionName).toBe("ai-training-plan-test");
  }, 20000);
});
