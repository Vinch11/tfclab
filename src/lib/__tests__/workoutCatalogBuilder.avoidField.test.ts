import { describe, it, expect } from "vitest";
import { buildWorkoutCatalog, serializeCatalogForPrompt } from "@/lib/workoutCatalogBuilder";

// Audit "cohérence placement des séances" — constat n°2 (partie basse
// risque) : le champ `avoid` de chaque fiche (ex. "Trop proche course",
// "Fatigue élevée", "Douleur genou") portait les vraies règles de
// placement mais n'était jamais transmis à l'IA — absent de la structure
// sérialisée dans le prompt (`serializeCatalogForPrompt`). Le seul code
// qui le lisait correctement (checkB11) n'était branché que dans l'outil
// QA admin, jamais dans la génération réelle d'un plan.
describe("workoutCatalogBuilder — champ `avoid` transmis à l'IA", () => {
  it("le catalogue 70.3 contient des fiches avec une contre-indication `avoid` significative", () => {
    const cat = buildWorkoutCatalog("70.3", 1, 4, 12, { maxItems: 80, chunkIndex: 0 });
    const withAvoid = cat.filter(e => e.avoid);
    expect(withAvoid.length, "aucune fiche du catalogue ne porte `avoid`").toBeGreaterThan(0);
    // "—" et "aucun" (bibliothèque source) signifient "pas de contre-indication"
    // et ne doivent jamais fuiter dans le champ `avoid` sérialisé.
    for (const e of withAvoid) {
      expect(e.avoid).not.toMatch(/^(—|aucun)$/i);
    }
  });

  it("serializeCatalogForPrompt ajoute la colonne Éviter et la règle de respect quand au moins une fiche en porte une", () => {
    const cat = buildWorkoutCatalog("70.3", 1, 4, 12, { maxItems: 80, chunkIndex: 0 });
    const md = serializeCatalogForPrompt(cat);
    expect(md).toContain("Éviter");
    expect(md).toMatch(/contre-indication de placement/i);
  });

  it("n'ajoute PAS la colonne Éviter quand aucune fiche du catalogue n'a de contre-indication (pas de régression de format)", () => {
    const md = serializeCatalogForPrompt([
      {
        id: "TEST_ID",
        cat: "A",
        sport: "course",
        objectif: "Test",
        phase: ["base"],
        durationMin: [30, 40],
        structure: "Z2 30min",
      },
    ]);
    expect(md).not.toContain("Éviter");
  });
});
