import { describe, it, expect } from "vitest";
import {
  RECENCY_WEIGHTS,
  HISTORY_PLAN_LIMIT,
  extractCatalogIdsFromPlanJson,
  serializeHistoricalUsage,
} from "../historicalCatalogUsage";

/**
 * Retour coach ("les plans utilisent souvent les mêmes séances") : avec
 * seulement 3 plans de mémoire, une fiche réutilisée au plan n-4 repartait
 * avec un poids de zéro — comme si elle n'avait jamais été servie. Fenêtre
 * élargie à 5 plans avec une décroissance plus progressive.
 */
describe("historicalCatalogUsage — fenêtre de mémoire élargie", () => {
  it("RECENCY_WEIGHTS couvre 5 plans (HISTORY_PLAN_LIMIT dérivé de sa longueur)", () => {
    expect(RECENCY_WEIGHTS.length).toBe(5);
    expect(HISTORY_PLAN_LIMIT).toBe(5);
  });

  it("les poids décroissent strictement avec l'ancienneté, jusqu'à un plancher non nul", () => {
    for (let i = 1; i < RECENCY_WEIGHTS.length; i++) {
      expect(RECENCY_WEIGHTS[i]).toBeLessThan(RECENCY_WEIGHTS[i - 1]);
    }
    expect(RECENCY_WEIGHTS[0]).toBe(1);
    expect(RECENCY_WEIGHTS[RECENCY_WEIGHTS.length - 1]).toBeGreaterThan(0);
  });
});

describe("extractCatalogIdsFromPlanJson", () => {
  it("extrait les catalogId des séances non-repos, ignore les jours de repos", () => {
    const planJson = {
      weeks: [
        {
          sessions: [
            { catalogId: "A_RUN_TEMPO_01", isRest: false },
            { isRest: true, catalogId: "SHOULD_NOT_APPEAR" },
            { title: "[B_BIKE_VO2_02] 5x4min VO2", isRest: false },
          ],
        },
      ],
    };
    const ids = extractCatalogIdsFromPlanJson(planJson);
    expect(ids).toContain("A_RUN_TEMPO_01");
    expect(ids).not.toContain("SHOULD_NOT_APPEAR");
  });

  it("renvoie un tableau vide si weeks est absent ou malformé", () => {
    expect(extractCatalogIdsFromPlanJson(null)).toEqual([]);
    expect(extractCatalogIdsFromPlanJson({})).toEqual([]);
    expect(extractCatalogIdsFromPlanJson({ weeks: "not-an-array" })).toEqual([]);
  });
});

describe("serializeHistoricalUsage", () => {
  it("arrondit les poids à 2 décimales", () => {
    const usage = new Map([["A_RUN_TEMPO_01", 1.23456], ["B_BIKE_VO2_02", 0.7]]);
    expect(serializeHistoricalUsage(usage)).toEqual({
      A_RUN_TEMPO_01: 1.23,
      B_BIKE_VO2_02: 0.7,
    });
  });
});
