import { describe, it, expect } from "vitest";
import { computeNutritionEstimateSimple, computeNutritionUnified } from "../nutritionUnified";

/**
 * Bug réel (audit "simulations pas fiables") : ExportTools.tsx (PDF export),
 * TwoForCoachingAnalysis.tsx (dashboard) et l'assistant IA calculaient la
 * nutrition via nutritionPredictive.computeNutritionEstimate (V1) — un moteur
 * séparé avec ses propres tables durée/intensité par objectif et son propre
 * plafond digestif — pendant que /course (NutritionUnifiedCard) affiche le
 * résultat de computeNutritionUnified pour le MÊME athlète. Deux chiffres
 * g/h différents dans deux écrans différents pour la même course.
 *
 * computeNutritionEstimateSimple encapsule computeNutritionUnified pour ces
 * consommateurs "chiffre unique" (pas besoin du détail par phase) — garantit
 * qu'ils affichent EXACTEMENT le même calcul que /course, plutôt qu'un
 * troisième moteur parallèle de plus.
 */
const baseInput = {
  vlamax: 0.45,
  tteMin: 40,
  vo2max: 55,
  weightKg: 70,
};

describe("computeNutritionEstimateSimple — parité stricte avec computeNutritionUnified", () => {
  it("Marathon (course pure) : résultat identique à un appel direct computeNutritionUnified(sport='cap')", () => {
    const simple = computeNutritionEstimateSimple({ ...baseInput, objectif: "Marathon" });
    const direct = computeNutritionUnified({
      vlamaxValue: baseInput.vlamax,
      vo2max: baseInput.vo2max,
      tteMin: baseInput.tteMin,
      sport: "cap",
      objectif: "Marathon",
      targetDurationHours: null,
      targetIntensityPct: null,
      weightKg: baseInput.weightKg,
    });
    expect(simple).not.toBeNull();
    expect(simple!.carbsMin).toBe(direct!.carbsMin);
    expect(simple!.carbsMax).toBe(direct!.carbsMax);
    expect(simple!.risk).toBe(direct!.risk);
    expect(simple!.sport).toBe("cap");
  });

  it("objectif en clé canonique ('703') ou en libellé ('Ironman 70.3') sont tous deux reconnus comme triathlon", () => {
    const byKey = computeNutritionEstimateSimple({ ...baseInput, objectif: "703" });
    const byLabel = computeNutritionEstimateSimple({ ...baseInput, objectif: "Ironman 70.3" });
    expect(byKey).not.toBeNull();
    expect(byLabel).not.toBeNull();
    expect(byKey!.carbsMin).toBe(byLabel!.carbsMin);
  });

  it("triathlon (IM/70.3) : retourne le leg le plus exigeant (vélo, plus long) — pas un simple fallback vélo non corrigé", () => {
    const tri = computeNutritionEstimateSimple({ ...baseInput, objectif: "IM", targetDurationHours: 5 });
    const runLegAlone = computeNutritionUnified({
      vlamaxValue: baseInput.vlamax, vo2max: baseInput.vo2max, tteMin: baseInput.tteMin,
      sport: "cap", objectif: "IM", targetDurationHours: null, targetIntensityPct: null, weightKg: baseInput.weightKg,
    });
    expect(tri).not.toBeNull();
    // Le leg vélo (durée fournie, plus longue) doit dominer le leg course (générique, plus courte).
    expect(tri!.sport).toBe("velo");
    expect(tri!.carbsMin).not.toBe(runLegAlone!.carbsMin);
  });

  it("retourne null sans poids (comme computeNutritionUnified — pas de fallback 70kg silencieux)", () => {
    expect(computeNutritionEstimateSimple({ ...baseInput, weightKg: null, objectif: "Marathon" })).toBeNull();
  });

  it("retourne null sans VLamax NI TTE (aucune donnée physio exploitable)", () => {
    expect(computeNutritionEstimateSimple({ vlamax: null, tteMin: null, vo2max: 55, weightKg: 70, objectif: "Marathon" })).toBeNull();
  });

  it("Trail et Ultra sont distingués (pas bucketés en 'cap' générique comme l'ancien moteur V1)", () => {
    const trail = computeNutritionEstimateSimple({ ...baseInput, objectif: "TrailMountain" });
    const ultra = computeNutritionEstimateSimple({ ...baseInput, objectif: "TrailUltra" });
    expect(trail!.sport).toBe("trail");
    expect(ultra!.sport).toBe("ultra");
  });
});
