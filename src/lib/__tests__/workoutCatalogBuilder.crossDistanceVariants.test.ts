import { describe, it, expect } from "vitest";
import { buildWorkoutCatalog } from "@/lib/workoutCatalogBuilder";

/**
 * BUG constaté (audit plan 10K réel) : BILLAT_RUN_SEMI_PACE — une fiche
 * allure-semi-marathon (Z4 87-92% VMA, sans champ `goals`) dont `variants`
 * documente ironman/half/marathon/semi mais AUCUNE entrée "10k" — était
 * sélectionnée telle quelle dans un plan 10K, prescrivant une allure/volume
 * inadaptés à la spécificité 10K.
 *
 * Fix : workoutCatalogBuilder.scoreWorkout pénalise désormais (sans exclure
 * durement) les fiches sans `goals` dont `variants` ne documente pas
 * l'objectif principal du plan — pour ne jamais les préférer à une fiche
 * correctement documentée pour cet objectif (ex: C_SEMI_HILL_STRENGTH /
 * D_SEMI_RECOVERY_30, qui documentent explicitement "10k").
 */
describe("buildWorkoutCatalog — cross-distance variants penalty", () => {
  it("BILLAT_RUN_SEMI_PACE (pas de variant 10k) ne figure pas dans un petit catalogue 10K Build/Peak", () => {
    // Semaines 12-16 sur 20 → build/peak, la même fenêtre de phase que la fiche
    // (phase: ["build","peak"]) — pire cas pour la pénalité si elle ne marchait pas.
    const cat = buildWorkoutCatalog("10K", 12, 16, 20, { maxItems: 5 });
    expect(cat.map(e => e.id)).not.toContain("BILLAT_RUN_SEMI_PACE");
  });

  it("les fiches semi documentant explicitement 10k (variants) restent disponibles pour un plan 10K", () => {
    const cat = buildWorkoutCatalog("10K", 5, 10, 20, { maxItems: 80 });
    const ids = cat.map(e => e.id);
    // C_SEMI_HILL_STRENGTH / D_SEMI_RECOVERY_30 documentent variants["10k"] —
    // ne doivent PAS être pénalisées par le nouveau garde-fou.
    expect(ids).toEqual(expect.arrayContaining(["C_SEMI_HILL_STRENGTH"]));
  });
});
