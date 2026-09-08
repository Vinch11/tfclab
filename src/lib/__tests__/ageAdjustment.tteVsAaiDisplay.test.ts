import { describe, it, expect } from "vitest";
import { computeAgeAdjustmentIndex } from "../ageAdjustment";
import { getTTEAgeFactor } from "../v2/unifiedLimiterDetection";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 3,
 * priorité 4). Dans le PDF Race Simulation (ExportTools.tsx, section
 * "6. Ajustement par l'Âge (AAI)"), la ligne du tableau "TTE — Cibles
 * abaissées de X%" affichait Math.round((1 - ageAdjustment.aai.aai) * 100)
 * — le facteur AAI (seuils VLamax/nutrition, computeAgeAdjustmentIndex) —
 * comme si c'était l'ajustement réellement appliqué aux cibles TTE, alors
 * que ce dernier est calculé séparément par getTTEAgeFactor
 * (unifiedLimiterDetection.ts, sources Peinado 2018 / Lepers 2013) et déjà
 * utilisé pour les vraies cibles TTE par capInjuryRisk.ts et
 * unifiedLimiterDetection.ts. Pour un Master2 (40-49 ans), l'AAI affichait
 * -10% alors que l'ajustement TTE réel n'est que de -3%.
 *
 * Corrigé pour utiliser getTTEAgeFactor(ageAdjustment.age) à la place.
 */
describe("ExportTools — affichage 'TTE Cibles abaissées de X%' (section AAI du PDF)", () => {
  it("l'AAI (VLamax/nutrition) et le facteur TTE réel divergent pour un Master2 (40-49 ans)", () => {
    const age = 45;
    const aai = computeAgeAdjustmentIndex(age);
    const oldBuggyDisplay = Math.round((1 - aai.aai) * 100);
    const fixedDisplay = Math.round((1 - getTTEAgeFactor(age)) * 100);

    expect(oldBuggyDisplay).toBe(10);
    expect(fixedDisplay).toBe(3);
    expect(fixedDisplay).not.toBe(oldBuggyDisplay);
  });

  it("reproduit la formule corrigée pour chaque tranche d'âge utilisée par le PDF", () => {
    const cases: Array<[number, number]> = [
      [25, 0],
      [35, 1],
      [45, 3],
      [55, 6],
      [65, 10],
    ];
    for (const [age, expectedPct] of cases) {
      expect(Math.round((1 - getTTEAgeFactor(age)) * 100)).toBe(expectedPct);
    }
  });

  it("le facteur TTE réel reste toujours plus proche de 1 (ajustement plus faible) que l'AAI, à partir de 30 ans", () => {
    for (const age of [30, 35, 40, 45, 50, 55, 60, 65, 70]) {
      const aai = computeAgeAdjustmentIndex(age);
      const tteFactor = getTTEAgeFactor(age);
      expect(tteFactor).toBeGreaterThanOrEqual(aai.aai);
    }
  });
});
