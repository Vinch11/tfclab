import { describe, it, expect } from "vitest";
import { computeNutritionV2, NUTRITION_BOUNDS } from "../nutritionV2";

/**
 * Bug réel (audit "simulation course/nutrition") : `NUTRITION_BOUNDS.ADVANCED.min`
 * valait 50 (vs 40 en standard) — activer "Gut Training Avancé" sur un
 * effort dont le besoin réel calculé est bas (ex. 32 g/h, effort
 * court/facile) forçait artificiellement le résultat à 50 g/h, +25% sans
 * rapport avec l'effort réel de l'athlète. Le gut training relève la
 * tolérance digestive MAXIMALE, pas le besoin physiologique MINIMAL — le
 * plancher doit rester identique en standard et en avancé.
 */
function lowNeedInput(advancedGutTraining: boolean) {
  return {
    vlamaxValue: 0.25,
    vlamaxConfidence: 0.8,
    vo2max: 40,
    tteMin: 60,
    sport: "cap" as const,
    targetDurationHours: 1.5,
    targetIntensityPct: 50,
    weightKg: 55,
    advancedGutTraining,
  };
}

describe("computeNutritionV2 — le plancher gut training avancé n'est plus supérieur au plancher standard", () => {
  it("NUTRITION_BOUNDS.ADVANCED.min == NUTRITION_BOUNDS.STANDARD.min (le gut training relève le plafond, pas le plancher)", () => {
    expect(NUTRITION_BOUNDS.ADVANCED.min).toBe(NUTRITION_BOUNDS.STANDARD.min);
  });

  it("un effort à faible besoin (32-40 g/h) donne le MÊME carbsCentral en standard et en gut training avancé", () => {
    const standard = computeNutritionV2(lowNeedInput(false));
    const advanced = computeNutritionV2(lowNeedInput(true));
    expect(standard).not.toBeNull();
    expect(advanced).not.toBeNull();
    // Avant le correctif : standard clampait à 40, avancé forçait 50 pour le
    // MÊME athlète/effort — activer le switch gonflait artificiellement la
    // prescription. Les deux doivent maintenant converger vers le même plancher.
    expect(advanced!.carbsCentral).toBe(standard!.carbsCentral);
  });

  it("le plafond, lui, reste bien étendu par le gut training avancé (non-régression)", () => {
    expect(NUTRITION_BOUNDS.ADVANCED.max).toBeGreaterThan(NUTRITION_BOUNDS.STANDARD.max);
  });
});
