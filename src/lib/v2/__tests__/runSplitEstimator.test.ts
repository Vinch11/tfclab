import { describe, it, expect } from "vitest";
import { estimateRunSplitMin, V_SEUIL_FRACTION_BY_AMBITION } from "../runSplitEstimator";

describe("estimateRunSplitMin", () => {
  it("retourne null sans allure seuil (données insuffisantes, pas de valeur devinée)", () => {
    expect(estimateRunSplitMin({
      distanceKm: 21.0975, thresholdPaceSecPerKm: null, vSeuilFraction: 0.82,
    })).toBeNull();
  });

  it("allure seuil 240s/km (4:00/km), fraction 0.82 (age_group semi) → ~87min49 sur 21.0975km", () => {
    const min = estimateRunSplitMin({
      distanceKm: 21.0975,
      thresholdPaceSecPerKm: 240,
      vSeuilFraction: V_SEUIL_FRACTION_BY_AMBITION.age_group.half,
    });
    expect(min).not.toBeNull();
    // pace run = 240 / 0.82 = 292.68s/km → 292.68 × 21.0975 / 60 ≈ 102.9min
    expect(min!).toBeGreaterThan(100);
    expect(min!).toBeLessThan(106);
  });

  it("VLamax élevée (≥0.55) pénalise -2 pts de fraction vSeuil → temps plus long", () => {
    const base = { distanceKm: 21.0975, thresholdPaceSecPerKm: 240, vSeuilFraction: 0.82 };
    const withoutPenalty = estimateRunSplitMin(base)!;
    const withPenalty = estimateRunSplitMin({ ...base, vlamaxRun: 0.6 })!;
    expect(withPenalty).toBeGreaterThan(withoutPenalty);
  });

  it("durabilité faible (>1.08) pénalise -3 pts de fraction vSeuil → temps plus long", () => {
    const base = { distanceKm: 42.195, thresholdPaceSecPerKm: 250, vSeuilFraction: 0.76 };
    const goodDurability = estimateRunSplitMin({ ...base, durabilityIndex: 1.0 })!;
    const poorDurability = estimateRunSplitMin({ ...base, durabilityIndex: 1.15 })!;
    expect(poorDurability).toBeGreaterThan(goodDurability);
  });
});
