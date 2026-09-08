import { describe, it, expect } from "vitest";
import { computeNutritionV2 } from "../nutritionV2";
import { computeNutritionEstimateSimple } from "../nutritionUnified";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 4, priorité
 * 1 — le plus critique). Dans le MÊME export PDF (ExportTools.tsx), deux
 * champs affichaient deux chiffres de glucides/h différents pour le MÊME
 * athlète triathlète au MÊME instant :
 * - `nutritionV2` (computeNutritionV2) : facteur de blend fixe (0.90) sur un
 *   calcul "course entière" avec des tables durée/intensité locales à
 *   ExportTools.tsx.
 * - `nutritionEstimate` (computeNutritionEstimateSimple) : modèle 2 legs
 *   (vélo + course), tables canoniques DURATION_BY_OBJECTIF/
 *   INTENSITY_BY_OBJECTIF de nutritionUnified.ts, leg le plus exigeant retenu.
 *
 * Écart mesuré : ~20-25 g/h (jusqu'à ~26%) pour un profil IM réaliste.
 *
 * Corrigé : `computeNutritionV2` délègue désormais au même modèle 2 legs que
 * `computeNutritionEstimateSimple` dès que `objectif` est fourni (nouveau
 * champ optionnel, compat arrière — sans lui, l'ancien facteur de blend 0.90
 * reste inchangé, cf. nutritionV2.triathlonClassification.test.ts).
 */
describe("computeNutritionV2 — alignement avec computeNutritionEstimateSimple (triathlon, 2 legs)", () => {
  it("carbsMin/carbsMax sont désormais identiques entre nutritionV2 et nutritionEstimate pour un même profil IM", () => {
    const weightKg = 75, vo2max = 45, vlamax = 0.30, tteMin = 60;

    const v2 = computeNutritionV2({
      vlamaxValue: vlamax, vlamaxConfidence: 0.7, vo2max, tteMin,
      sport: "triathlon", objectif: "IM",
      targetDurationHours: null, targetIntensityPct: null, weightKg,
    });
    const estimate = computeNutritionEstimateSimple({
      vlamax, objectif: "IM", tteMin, vo2max, weightKg,
    });

    expect(v2).not.toBeNull();
    expect(estimate).not.toBeNull();
    expect(v2!.carbsMin).toBe(estimate!.carbsMin);
    expect(v2!.carbsMax).toBe(estimate!.carbsMax);
  });

  it("régression : avant le fix, l'ancien facteur de blend produisait un écart réel (~18 g/h central) pour ce même profil", () => {
    const weightKg = 75, vo2max = 45, vlamax = 0.30, tteMin = 60;

    // Ancien comportement (toujours actif sans `objectif`, compat arrière) :
    // reproduit exactement l'appel ExportTools.tsx d'avant ce correctif
    // (tables locales IM = 10h / 70%).
    const legacyV2 = computeNutritionV2({
      vlamaxValue: vlamax, vlamaxConfidence: 0.7, vo2max, tteMin,
      sport: "triathlon", targetDurationHours: 10, targetIntensityPct: 70, weightKg,
    });
    const estimate = computeNutritionEstimateSimple({
      vlamax, objectif: "IM", tteMin, vo2max, weightKg,
    });
    const estimateCentral = Math.round((estimate!.carbsMin + estimate!.carbsMax) / 2);

    expect(legacyV2!.carbsCentral - estimateCentral).toBeGreaterThan(10);
  });

  it("utilise bien vlamaxRun/tteRunMin pour le leg course quand ils divergent du vélo (leg course dominant)", () => {
    const weightKg = 75, vo2max = 45, vlamax = 0.30, tteMin = 60;

    const v2 = computeNutritionV2({
      vlamaxValue: vlamax, vlamaxConfidence: 0.7, vo2max, tteMin,
      sport: "triathlon", objectif: "IM", vlamaxRun: 0.50, tteRunMin: 35,
      targetDurationHours: null, targetIntensityPct: null, weightKg,
    });
    const estimate = computeNutritionEstimateSimple({
      vlamax, vlamaxRun: 0.50, objectif: "IM", tteMin, tteRunMin: 35, vo2max, weightKg,
    });

    expect(v2).not.toBeNull();
    expect(estimate).not.toBeNull();
    expect(v2!.carbsMin).toBe(estimate!.carbsMin);
    expect(v2!.carbsMax).toBe(estimate!.carbsMax);
    expect(v2!.glycogenRisk).toBe(estimate!.risk);
  });

  it("sans `objectif` (compat arrière), l'ancien facteur de blend (0.90) reste strictement inchangé", () => {
    const input = {
      vlamaxValue: 0.45, vlamaxConfidence: 0.8, vo2max: 55, tteMin: 40,
      sport: "triathlon" as const, targetDurationHours: 10, targetIntensityPct: 70, weightKg: 70,
    };
    const tri = computeNutritionV2(input);
    const cap = computeNutritionV2({ ...input, sport: "cap" as const });
    const expectedTriBase = Math.round(cap!.baseRate / 0.82 * 0.90);
    expect(tri!.baseRate).toBe(expectedTriBase);
  });
});
