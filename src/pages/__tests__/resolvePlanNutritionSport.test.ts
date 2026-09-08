import { describe, it, expect } from "vitest";
import { resolvePlanNutritionSport } from "../AITrainingPlanPage";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 4, priorité
 * 4). La fiche "Plan Nutritionnel" classait le sport via
 * `/velo|bike|v[ée]lo/.test(objStr)` — cette regex ne matche AUCUN objectif
 * réel de cette app (ObjectifType), donc le résultat était TOUJOURS "cap"
 * par défaut, y compris pour un pur cycliste — un fallback correct pour la
 * mauvaise raison (une regex cassée, jamais un choix explicite).
 */
describe("resolvePlanNutritionSport", () => {
  it("aucun objectif réel de cette app ne matchait l'ancienne regex /velo|bike|v[ée]lo/ — vérifie que le nouveau code n'en dépend plus", () => {
    const realObjectifs = ["IM", "703", "Sprint", "Olympic", "Marathon", "Semi", "5K", "10K", "StartToRun", "Trail", "TrailShort", "TrailMountain", "TrailUltra"];
    for (const obj of realObjectifs) {
      expect(/velo|bike|v[ée]lo/.test(obj.toLowerCase())).toBe(false);
    }
  });

  it("retourne 'cap' pour tous les objectifs réels de cette app (aucun n'est un pur objectif vélo)", () => {
    const realObjectifs = ["IM", "703", "Sprint", "Olympic", "Marathon", "Semi", "5K", "10K", "StartToRun", "Trail", "TrailShort", "TrailMountain", "TrailUltra"];
    for (const obj of realObjectifs) {
      expect(resolvePlanNutritionSport(obj)).toBe("cap");
    }
  });

  it("reste explicite pour un objectif vélo si l'app en introduit un un jour", () => {
    expect(resolvePlanNutritionSport("Vélo")).toBe("velo");
    expect(resolvePlanNutritionSport("Bike Race")).toBe("velo");
  });

  it("gère une chaîne vide ou undefined sans planter", () => {
    expect(resolvePlanNutritionSport("")).toBe("cap");
  });
});
