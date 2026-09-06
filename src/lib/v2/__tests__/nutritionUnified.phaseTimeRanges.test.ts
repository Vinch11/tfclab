import { describe, it, expect } from "vitest";
import { computeNutritionUnified } from "../nutritionUnified";

/**
 * Bug réel (audit "simulation course/nutrition") : les `timeRange` affichés
 * pour les phases START/MID/LATE utilisaient les valeurs BRUTES (30 en dur,
 * `lateStartMin` = 70% de la durée) au lieu des bornes déjà clampées
 * utilisées pour les totaux. Pour toute course courte où 70% de la durée
 * tombe avant la fenêtre START (30min ou durée totale si plus courte) — cas
 * réel : 5K (21min) → MID affichait "30 → 15 min", 10K (40min) → "30 → 28
 * min" — le texte affichait une plage qui finit avant de commencer.
 */

const baseInput = {
  vlamaxValue: 0.45,
  vlamaxConfidence: 0.8,
  vo2max: 55,
  weightKg: 70,
  sport: "cap" as const,
  targetIntensityPct: null,
  digestiveTolerance: "MEDIUM" as const,
};

describe("computeNutritionUnified — timeRange des phases jamais à l'envers", () => {
  it("5K (21 min) : aucune phase n'a un timeRange dont la fin est avant le début", () => {
    const result = computeNutritionUnified({
      ...baseInput, objectif: "5K", tteMin: 40, targetDurationHours: 0.35,
    });
    expect(result).not.toBeNull();
    for (const phase of result!.phases) {
      if (phase.name === "PRE" || phase.name === "NIGHT") continue;
      const nums = phase.timeRange.match(/\d+/g)?.map(Number) ?? [];
      if (nums.length === 2) {
        expect(nums[1], `${phase.name}: "${phase.timeRange}"`).toBeGreaterThanOrEqual(nums[0]);
      }
    }
  });

  it("10K (40 min) : aucune phase n'a un timeRange dont la fin est avant le début", () => {
    const result = computeNutritionUnified({
      ...baseInput, objectif: "10K", tteMin: 40, targetDurationHours: 0.67,
    });
    expect(result).not.toBeNull();
    for (const phase of result!.phases) {
      if (phase.name === "PRE" || phase.name === "NIGHT") continue;
      const nums = phase.timeRange.match(/\d+/g)?.map(Number) ?? [];
      if (nums.length === 2) {
        expect(nums[1], `${phase.name}: "${phase.timeRange}"`).toBeGreaterThanOrEqual(nums[0]);
      }
    }
  });

  it("Marathon (durée normale, non-régression) : START/MID/LATE gardent leurs plages historiques", () => {
    const result = computeNutritionUnified({
      ...baseInput, objectif: "Marathon", tteMin: 40, targetDurationHours: 3.5,
    });
    expect(result).not.toBeNull();
    const start = result!.phases.find((p) => p.name === "START");
    const mid = result!.phases.find((p) => p.name === "MID");
    const late = result!.phases.find((p) => p.name === "LATE");
    expect(start!.timeRange).toBe("0 → 30 min");
    expect(mid!.timeRange).toBe("30 → 147 min"); // 70% de 210 min = 147
    expect(late!.timeRange).toBe("147 min → fin");
  });
});
