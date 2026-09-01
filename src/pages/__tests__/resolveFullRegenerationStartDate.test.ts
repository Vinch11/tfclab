import { describe, it, expect } from "vitest";
import { resolveFullRegenerationStartDate } from "../AITrainingPlanPage";

/**
 * Bug réel signalé par le coach : plan de Cath démarré le 3 août, course le
 * 18-20 septembre. "Régénérer TOUT le plan" (choisi explicitement, pas
 * "à partir d'aujourd'hui") le 1er septembre a produit un mini-plan de 3
 * semaines au lieu de reconstruire le plan complet 3 août → 20 septembre —
 * parce que `handleGenerate` écrasait TOUJOURS `planStartDate` avec la date
 * du jour, y compris pour un plan déjà actif et déjà en cours.
 */
describe("resolveFullRegenerationStartDate", () => {
  it("un plan DÉJÀ ACTIF conserve sa date de début d'origine (ne bascule pas sur aujourd'hui)", () => {
    const originalStart = new Date(2026, 7, 3); // 3 août 2026 (mois 0-indexé)
    const today = new Date(2026, 8, 1); // 1er septembre 2026
    const result = resolveFullRegenerationStartDate(true, originalStart, today);
    expect(result).toEqual(originalStart);
  });

  it("sans plan actif (première génération), repart bien sur le lundi de la semaine courante", () => {
    const staleStart = new Date(2026, 7, 3);
    const today = new Date(2026, 8, 1); // mardi 1er septembre 2026
    const result = resolveFullRegenerationStartDate(false, staleStart, today);
    expect(result).not.toEqual(staleStart);
    // Lundi de la semaine du 1er septembre 2026 = 31 août 2026
    expect(result.getDate()).toBe(31);
    expect(result.getMonth()).toBe(7); // août
  });
});
