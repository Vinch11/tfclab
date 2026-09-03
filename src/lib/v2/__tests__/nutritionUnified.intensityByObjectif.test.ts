import { describe, it, expect } from "vitest";
import { computeNutritionUnified } from "../nutritionUnified";

/**
 * Bug réel (audit fiabilité génération de plan IA) : contrairement à la durée
 * (`DURATION_BY_OBJECTIF`), aucune table objectif → intensité n'existait.
 * `computeBaseRateMader` retombait tout droit sur un flat 70% VO₂max dès que
 * `targetIntensityPct` était absent — et AUCUN appelant réel de
 * `NutritionUnifiedCard` (Dashboard `Index.tsx`, `RaceSimulationPage.tsx`
 * bike/run) ne le fournissait. Un marathon (≈78% VO₂max) et un Ironman
 * (≈68%) recevaient donc la même prescription glucides sur le Dashboard.
 */
const baseInput = {
  vlamaxValue: 0.45,
  tteMin: 40,
  vo2max: 55,
  weightKg: 70,
  heatCondition: false,
} as const;

describe("computeNutritionUnified — intensité résolue par objectif quand targetIntensityPct absent", () => {
  it("Marathon et Ironman (même durée forcée) donnent des taux glucides DIFFÉRENTS sans targetIntensityPct", () => {
    // Durée forcée identique pour isoler l'effet de l'intensité seule.
    const marathon = computeNutritionUnified({
      ...baseInput, sport: "cap", objectif: "Marathon",
      targetDurationHours: 3.5, targetIntensityPct: null,
    });
    const im = computeNutritionUnified({
      ...baseInput, sport: "cap", objectif: "IM",
      targetDurationHours: 3.5, targetIntensityPct: null,
    });
    expect(marathon).not.toBeNull();
    expect(im).not.toBeNull();
    expect(marathon!.carbsCentral).not.toBe(im!.carbsCentral);
  });

  it("un targetIntensityPct explicite prime toujours sur la table objectif (pas de régression)", () => {
    const explicit68 = computeNutritionUnified({
      ...baseInput, sport: "cap", objectif: "Marathon",
      targetDurationHours: 3.5, targetIntensityPct: 68,
    });
    const im = computeNutritionUnified({
      ...baseInput, sport: "cap", objectif: "IM",
      targetDurationHours: 3.5, targetIntensityPct: null, // IM table = 68 aussi
    });
    expect(explicit68).not.toBeNull();
    expect(im).not.toBeNull();
    // Un "Marathon" forcé à la même intensité qu'un IM (68%) doit converger
    // vers le même taux — preuve que l'intensité, pas juste l'objectif brut,
    // pilote bien le calcul.
    expect(explicit68!.carbsCentral).toBe(im!.carbsCentral);
  });

  it("objectif inconnu (hors table) : retombe sur le flat 70% historique, pas d'erreur", () => {
    const r = computeNutritionUnified({
      ...baseInput, sport: "cap", objectif: "ObjectifInconnuXYZ",
      targetDurationHours: 3.5, targetIntensityPct: null,
    });
    expect(r).not.toBeNull();
    expect(Number.isFinite(r!.carbsCentral)).toBe(true);
  });
});
