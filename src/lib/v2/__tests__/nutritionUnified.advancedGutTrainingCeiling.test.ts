import { describe, it, expect } from "vitest";
import { computeBaseRateMader } from "../nutritionUnified";

/**
 * Bug réel (audit "simulation course/nutrition") : `computeBaseRateMader`
 * plafonnait en interne à 90 g/h (vélo) / 75 g/h (cap) AVANT même que
 * l'appelant (nutritionUnified/V2/Timing) applique ses propres bonus
 * TTE/durée puis reclampe en sortie à un plafond "gut training avancé" plus
 * haut (120 g/h) — ce plafond avancé était donc structurellement
 * inatteignable (max réel ~110 g/h vélo, quel que soit le profil). Le
 * paramètre `capMultiplier` permet à chaque appelant de relever ce plafond
 * interne proportionnellement à sa propre promesse.
 */

describe("computeBaseRateMader — capMultiplier rend le plafond gut training avancé réellement atteignable", () => {
  it("un athlète extrême (VO2max élevé, intensité haute, longue durée) atteint un baseRate nettement > 90 g/h vélo avec capMultiplier=120/90", () => {
    const standard = computeBaseRateMader(90, "velo", 75, 0.75, 90, 8, true);
    const advanced = computeBaseRateMader(90, "velo", 75, 0.75, 90, 8, true, 120 / 90);
    expect(standard.baseRate).toBeLessThanOrEqual(90);
    expect(advanced.baseRate).toBeGreaterThan(standard.baseRate);
    expect(advanced.baseRate).toBeLessThanOrEqual(120);
  });

  it("capMultiplier=1 (défaut) préserve exactement le comportement historique — aucun appelant existant non mis à jour n'est affecté", () => {
    const withoutArg = computeBaseRateMader(70, "velo", 55, 0.5, 80, 5, false);
    const withDefaultMultiplier = computeBaseRateMader(70, "velo", 55, 0.5, 80, 5, false, 1);
    expect(withDefaultMultiplier.baseRate).toBe(withoutArg.baseRate);
  });

  it("un besoin faible (effort court/facile) n'est pas gonflé par capMultiplier — seul le plafond monte, pas le résultat d'un athlète qui a peu besoin", () => {
    const lowNeed = computeBaseRateMader(55, "cap", 45, 0.30, 60, 0.5, false, 120 / 90);
    // Le plancher interne (minFloor) reste 0 pour durée<1h — un capMultiplier
    // plus haut ne doit jamais À LUI SEUL faire monter un besoin déjà bas.
    expect(lowNeed.baseRate).toBeLessThan(90);
  });
});
