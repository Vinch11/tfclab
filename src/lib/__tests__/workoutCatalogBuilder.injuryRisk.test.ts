import { describe, it, expect } from "vitest";
import { buildWorkoutCatalog, toInjuryRiskCatalogOption, type CatalogEntry } from "@/lib/workoutCatalogBuilder";
import { HIGH_IMPACT_SESSION_PATTERNS } from "@/lib/limiterSessionPatterns";

/**
 * Régression pour F-INJ (malus risque blessure) : le score de risque
 * (injuryRiskUnified.ts, transmis via PlanConfig.injuryRisk) n'avait jusqu'ici
 * aucun effet sur la sélection des séances — seulement sur son affichage au
 * coach. `scoreWorkout` applique désormais un malus (pas une exclusion) aux
 * séances CAP/vélo à impact mécanique élevé quand ÉLEVÉ/CRITIQUE.
 */

function countHighImpactCap(catalog: CatalogEntry[]): number {
  return catalog.filter(e => {
    const text = `${e.id} ${e.structure} ${e.variants ?? ""}`.toLowerCase();
    const isCap = /course|run|cap|trail/i.test(e.sport);
    return isCap && (HIGH_IMPACT_SESSION_PATTERNS.run_long.test(text) || HIGH_IMPACT_SESSION_PATTERNS.run_intensity.test(text));
  }).length;
}

describe("buildWorkoutCatalog — injury risk malus (F-INJ)", () => {
  it("un catalogue CAP capé contient moins (ou autant) de séances à impact élevé quand le risque run est CRITIQUE", () => {
    const baseArgs = ["marathon", 1, 12, 12] as const;
    const options = { maxItems: 25 };

    const withoutRisk = buildWorkoutCatalog(...baseArgs, options);
    const withCritiqueRisk = buildWorkoutCatalog(...baseArgs, { ...options, injuryRisk: { run: "CRITIQUE" as const } });

    expect(withoutRisk.length).toBeGreaterThan(0);
    expect(withCritiqueRisk.length).toBeGreaterThan(0);

    const highImpactWithout = countHighImpactCap(withoutRisk);
    const highImpactWithRisk = countHighImpactCap(withCritiqueRisk);

    // Effet réel confirmé (pas juste "au pire égal") : 15 → 9 sur ce catalogue.
    expect(highImpactWithRisk).toBeLessThan(highImpactWithout);
  });

  it("un risque FAIBLE/absent n'applique aucun malus (catalogue identique)", () => {
    const baseArgs = ["marathon", 1, 12, 12] as const;
    const options = { maxItems: 25 };

    const withoutRisk = buildWorkoutCatalog(...baseArgs, options);
    const withFaibleRisk = buildWorkoutCatalog(...baseArgs, { ...options, injuryRisk: toInjuryRiskCatalogOption({ run: { level: "FAIBLE" } }) });

    expect(withoutRisk.map(e => e.id)).toEqual(withFaibleRisk.map(e => e.id));
  });
});

describe("toInjuryRiskCatalogOption", () => {
  it("ne retient que les niveaux ÉLEVÉ/CRITIQUE, FAIBLE/MODÉRÉ ignorés", () => {
    expect(toInjuryRiskCatalogOption(undefined)).toBeUndefined();
    expect(toInjuryRiskCatalogOption({ run: { level: "FAIBLE" }, bike: { level: "MODERE" } })).toBeUndefined();
    expect(toInjuryRiskCatalogOption({ run: { level: "ELEVE" } })).toEqual({ run: "ELEVE", bike: undefined });
    expect(toInjuryRiskCatalogOption({ bike: { level: "CRITIQUE" } })).toEqual({ run: undefined, bike: "CRITIQUE" });
  });
});
