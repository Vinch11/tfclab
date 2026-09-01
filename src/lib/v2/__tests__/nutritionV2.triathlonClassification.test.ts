import { describe, it, expect } from "vitest";
import { computeNutritionV2 } from "../nutritionV2";

/**
 * Audit nutrition/multi-objectifs : `computeNutritionV2` (utilisé par le
 * rapport PDF, ExportTools.tsx) ne connaissait que 'velo'|'cap' — un athlète
 * IM/70.3 tombait dans le "else" du call site et recevait le facteur vélo
 * NON corrigé (1.0, le plus généreux), alors que `computeNutritionEstimate`
 * (nutritionPredictive.ts), affiché dans le MÊME rapport pour le MÊME
 * athlète, classe ces objectifs "triathlon" et applique le facteur de
 * tolérance digestive dédié (0.90, entre vélo 1.0 et CAP 0.82) — deux
 * chiffres g/h différents dans le même document.
 *
 * `computeNutritionV2` sait maintenant traiter 'triathlon' nativement :
 * mappé sur 'cap' pour le calcul de base Mader (source canonique), puis
 * corrigé avec exactement la même formule que nutritionPredictive.ts
 * (baseRate / 0.82 * 0.90).
 */
function baseInput(sport: "velo" | "cap" | "triathlon") {
  return {
    vlamaxValue: 0.45,
    vlamaxConfidence: 0.8,
    vo2max: 55,
    tteMin: 40,
    sport,
    targetDurationHours: 10,
    targetIntensityPct: 70,
    weightKg: 70,
  };
}

describe("computeNutritionV2 — classification 'triathlon' (audit nutrition)", () => {
  it("le taux de base triathlon = taux CAP / 0.82 * 0.90 (même formule que nutritionPredictive.ts)", () => {
    const tri = computeNutritionV2(baseInput("triathlon"));
    const cap = computeNutritionV2(baseInput("cap"));
    expect(tri).not.toBeNull();
    expect(cap).not.toBeNull();

    const expectedTriBase = Math.round(cap!.baseRate / 0.82 * 0.90);
    expect(tri!.baseRate).toBe(expectedTriBase);
  });

  it("le taux de base triathlon diffère du taux vélo pur (la correction est bien appliquée, pas un simple fallback 'velo')", () => {
    const tri = computeNutritionV2(baseInput("triathlon"));
    const velo = computeNutritionV2(baseInput("velo"));
    expect(tri).not.toBeNull();
    expect(velo).not.toBeNull();
    expect(tri!.baseRate).not.toBe(velo!.baseRate);
    // Le facteur triathlon (0.90) doit rester STRICTEMENT entre CAP (0.82,
    // le plus conservateur) et vélo (1.0, le plus généreux) — jamais égal
    // au vélo pur, qui était le bug.
    expect(tri!.baseRate).toBeLessThan(velo!.baseRate);
  });

  it("sportLabel affiche 'Triathlon' (pas 'Vélo')", () => {
    const tri = computeNutritionV2(baseInput("triathlon"));
    expect(tri!.sportLabel).toBe("Triathlon");
    expect(tri!.sport).toBe("triathlon");
  });

  it("le contributeur 'base' et le chiffre central affichés reflètent le taux CORRIGÉ (pas de chiffre brut Mader non corrigé qui contredirait carbsCentral)", () => {
    // Régression visée : si le contributeur "Taux de base (Mader)" affichait
    // encore le taux vélo non corrigé pendant que carbsCentral affichait un
    // chiffre corrigé, le rapport contiendrait une incohérence interne au
    // même endroit où on vient de corriger l'incohérence inter-rapport.
    const tri = computeNutritionV2(baseInput("triathlon"));
    const baseContributor = tri!.contributors.find(c => c.id === "base");
    expect(baseContributor).toBeDefined();
    expect(baseContributor!.value).toBe(`${tri!.baseRate} g/h`);
  });
});
