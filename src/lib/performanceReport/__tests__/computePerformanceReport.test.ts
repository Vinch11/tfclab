import { describe, it, expect } from "vitest";
import { computePerformanceReport } from "../computePerformanceReport";
import { getGlycogenStore } from "@/lib/v2/maderMetabolicModel";

/**
 * Tests ciblés pour l'enrichissement "narration continue" du Rapport de
 * Performance : réserve de glycogène (chiffre-titre manquant vs INSCYD),
 * points forts (symétrique des limiteurs, absent jusqu'ici), structure du
 * prochain bloc (roadmap visible, absente jusqu'ici).
 */

const BASE_PAYLOAD = {
  athlete: { id: "a1", name: "Test Athlete", goal: "Marathon", refs: {} },
  effectiveSnapshot: { date: "2026-07-11", fc_repos: 48, fc_seuil: 168 },
  effectiveRefs: { vo2max: 76.1, weightKg: 73.5, ftp: 320, vma: 20.5, fcMax: 190 },
  vlamax: { value: 0.53 },
  tte: { tte_min: 52 },
  runningEconomy: { value: null },
  ageAdjustment: { age: 34 },
  unifiedLimiter: {
    limiterExplanation: "Test explanation",
    severity: "moderate",
    gapAnalysis: [
      { metric: "VO2max", value: 76.1, target: 60, gap: 16.1, gapPercent: 26, status: "optimal", weight: 0.3, weightedImpact: 2 },
      { metric: "VLamax", value: 0.53, target: 0.45, gap: 0.08, gapPercent: 17, status: "acceptable", weight: 0.25, weightedImpact: 12 },
      { metric: "TTE", value: 52, target: 45, gap: 7, gapPercent: 15, status: "optimal", weight: 0.2, weightedImpact: 3 },
    ],
    categoryRanking: [
      { category: "glycolytic", totalImpact: 30 },
      { category: "metabolic_endurance", totalImpact: 18 },
    ],
  },
  coachingCompass: {
    decision: { block: "Chantier VLamax", durationWeeks: 4, athleteMessage: "msg", prohibitions: [] },
    leverage: { label: "Endurance fondamentale", description: "desc", workoutExamples: [] },
  },
};

const opts = { ambitionLabel: "Confirmé", generatedAt: "26 août 2026", logoBase64: null };

describe("computePerformanceReport — réserve de glycogène", () => {
  it("expose la réserve totale de glycogène (grammes + kcal), source unique getGlycogenStore", () => {
    const result = computePerformanceReport(BASE_PAYLOAD, opts);
    const store = getGlycogenStore();
    expect(result.physio.glycogenStoreG).toBe(store.totalG);
    expect(result.physio.glycogenStoreKcal).toBe(store.kcal);
    expect(result.physio.glycogenStoreG).toBeGreaterThan(0);
  });
});

describe("computePerformanceReport — points forts", () => {
  it("dérive les points forts depuis les métriques au statut \"optimal\" du diagnostic", () => {
    const result = computePerformanceReport(BASE_PAYLOAD, opts);
    expect(result.strengths.length).toBeGreaterThan(0);
    expect(result.strengths.map((s) => s.title)).toContain("Cylindrée aérobie");
    expect(result.strengths.map((s) => s.title)).toContain("Durabilité au seuil");
    // VLamax est "acceptable", pas "optimal" — ne doit pas apparaître en point fort.
    expect(result.strengths.map((s) => s.title)).not.toContain("Profil métabolique économe");
  });

  it("ne retourne aucun point fort si gapAnalysis est absent (rétrocompatibilité)", () => {
    const payload = { ...BASE_PAYLOAD, unifiedLimiter: { ...BASE_PAYLOAD.unifiedLimiter, gapAnalysis: undefined } };
    const result = computePerformanceReport(payload, opts);
    expect(result.strengths).toEqual([]);
  });
});

describe("computePerformanceReport — structure du prochain bloc", () => {
  it("produit les 5 phases de l'architecture générique, personnalisées par les limiteurs de l'athlète", () => {
    const result = computePerformanceReport(BASE_PAYLOAD, opts);
    expect(result.blockStructure.map((b) => b.phase)).toEqual([
      "Fondation", "Chantier", "Consolidation", "Race-Specific", "Affûtage",
    ]);
    // Le focus du bloc Chantier doit référencer le limiteur #1 réel de l'athlète,
    // pas un texte générique interchangeable entre profils.
    expect(result.blockStructure[1].focus).toContain(result.limiters[0].title);
  });

  it("reste dans la plage validée par PHASE_DURATION_RANGE (2–6 sem pour les 3 premiers blocs)", () => {
    const result = computePerformanceReport(BASE_PAYLOAD, opts);
    for (const b of result.blockStructure.slice(0, 3)) {
      expect(b.weeksRange).toBe("2–6 sem");
    }
  });
});
