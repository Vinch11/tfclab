import { describe, it, expect, vi, beforeEach } from "vitest";
import { useRef, useState } from "react";
import { renderHook } from "@testing-library/react";
import { PILOT_PROFILES } from "../pilotCockpitProfiles";
import { resetBudgetState } from "../pilotCockpitBudget";
import { usePilotCockpit } from "../usePilotCockpit";

/**
 * Sprint qualité Marathon/Ironman (oct. 2026) — PRÉPARATION DU PREMIER TEST
 * CONTRÔLÉ (consigne coach explicite) : `usePilotCockpit.runProfile` prend
 * un second paramètre optionnel `maxChunks`, EXPLICITEMENT opt-in, qui pose
 * `PlanConfig._pilotMaxChunks` pour CE run uniquement (jamais par défaut).
 * Ce test vérifie que le câblage atteint réellement l'appel à
 * `plan.generatePlan(...)` — pas seulement un paramètre mort — et que tout
 * appel SANS second argument reste identique au comportement normal
 * (aucun champ `_pilotMaxChunks` posé).
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

describe("usePilotCockpit.runProfile — mode test limité au 1er chunk (_pilotMaxChunks)", () => {
  beforeEach(() => {
    resetBudgetState();
    capturedConfigs = [];
  });

  // Timeouts généreux : `waitForCompletion` (usePilotCockpit.ts) attend
  // jusqu'à 15s qu'`isLoading` "démarre" avant de surveiller sa fin, alors
  // que `generatePlan()` est déjà `await`é avant cet appel — latence
  // préexistante documentée dans usePilotCockpit.staleClosure.test.ts,
  // pas un délai lié à ce correctif. Un `it` = 1 appel `runProfile` ⇒ ~15s.

  it("sans 2e argument (appel normal) → _pilotMaxChunks n'est JAMAIS posé sur le planConfig envoyé à generatePlan", async () => {
    const { result } = renderHook(() => usePilotCockpit());
    const profile = PILOT_PROFILES.find((p) => p.id === "B-10K-TO-70.3")!;

    await result.current.runProfile(profile);

    expect(capturedConfigs).toHaveLength(1);
    expect(capturedConfigs[0]._pilotMaxChunks).toBeUndefined();
    expect("_pilotMaxChunks" in capturedConfigs[0]).toBe(false);
  }, 20000);

  it("avec maxChunks=1 (test contrôlé 1er chunk) → _pilotMaxChunks=1 atteint réellement planConfig envoyé à generatePlan", async () => {
    const { result } = renderHook(() => usePilotCockpit());
    const profile = PILOT_PROFILES.find((p) => p.id === "B-10K-TO-70.3")!;

    await result.current.runProfile(profile, 1);

    expect(capturedConfigs).toHaveLength(1);
    expect(capturedConfigs[0]._pilotMaxChunks).toBe(1);
  }, 20000);

  it("avec maxChunks=0 ou négatif → traité comme absent (jamais posé), cohérent avec computePilotChunksToRun côté Edge", async () => {
    const { result } = renderHook(() => usePilotCockpit());
    const profile = PILOT_PROFILES.find((p) => p.id === "B-10K-TO-70.3")!;

    await result.current.runProfile(profile, 0);
    await result.current.runProfile(profile, -2);

    expect(capturedConfigs).toHaveLength(2);
    expect(capturedConfigs[0]._pilotMaxChunks).toBeUndefined();
    expect(capturedConfigs[1]._pilotMaxChunks).toBeUndefined();
  }, 35000);

  it("un autre profil (ex. B-5K-BEGINNER) lancé sans maxChunks reste lui aussi inchangé — invariant global, pas spécifique au nouveau profil", async () => {
    const { result } = renderHook(() => usePilotCockpit());
    const profile = PILOT_PROFILES.find((p) => p.id === "B-5K-BEGINNER")!;

    await result.current.runProfile(profile);

    expect(capturedConfigs).toHaveLength(1);
    expect("_pilotMaxChunks" in capturedConfigs[0]).toBe(false);
  }, 20000);
});
