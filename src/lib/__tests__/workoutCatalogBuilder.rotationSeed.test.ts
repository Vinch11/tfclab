import { describe, it, expect } from "vitest";
import { buildWorkoutCatalog, type CatalogEntry } from "@/lib/workoutCatalogBuilder";

/**
 * P4 diversité — retour coach : "avec le catalogue étoffé qu'on a, ce
 * serait dommage que les plans soient réduits à seulement quelques séances
 * type". Mesuré empiriquement (1320 combinaisons objectif × phase × limiteur
 * × maxItems) : 137/896 fiches (≈15%) n'étaient JAMAIS sélectionnables,
 * quel que soit le scénario — dont une série de 10 variantes quasi-
 * identiques (`BR_HALF_V1_PRO` ... `BR_HALF_V10_PRO`, mêmes goals/tags/
 * phase/necessite, seule la durée varie en rampe — jamais utilisée par
 * scoreWorkout) où le même sous-ensemble sortait TOUJOURS. Cause :
 * `Array.prototype.sort` est stable — à score strictement égal, l'ordre de
 * concaténation de `WorkoutLibrary` (Pro Pack → Templates → ... →
 * Hedgehog → ...) décidait systématiquement, un accident d'historique de
 * fichier, pas un choix de pertinence.
 */
describe("buildWorkoutCatalog — départage des égalités (rotationSeed)", () => {
  const baseArgs = ["IRONMAN 70.3", 8, 12, 20] as const; // build phase

  it("sans rotationSeed (par défaut), le résultat est déterministe et reproductible", () => {
    const a = buildWorkoutCatalog(...baseArgs, { maxItems: 10 });
    const b = buildWorkoutCatalog(...baseArgs, { maxItems: 10 });
    expect(a.map(e => e.id)).toEqual(b.map(e => e.id));
  });

  it("le même rotationSeed produit toujours le même résultat (reproductible pour un seed donné)", () => {
    const a = buildWorkoutCatalog(...baseArgs, { maxItems: 10, rotationSeed: 42 });
    const b = buildWorkoutCatalog(...baseArgs, { maxItems: 10, rotationSeed: 42 });
    expect(a.map(e => e.id)).toEqual(b.map(e => e.id));
  });

  it("des rotationSeed différents font varier le sous-ensemble de BR_HALF_V* qui sort du catalogue capé", () => {
    // Série réelle de 10 variantes quasi-identiques trouvée par l'audit de
    // couverture. Avec un catalogue brick capé étroitement, un seed
    // différent doit faire ressortir un sous-ensemble différent — avant le
    // fix, c'était systématiquement le(s) même(s), quel que soit le seed.
    const pattern = /^BR_HALF_V\d+_PRO$/;
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    const membershipPerSeed = seeds.map(seed => {
      const cat = buildWorkoutCatalog("IRONMAN 70.3", 8, 12, 20, {
        maxItems: 10,
        sportFilter: ["brick"],
        rotationSeed: seed,
      });
      return cat.filter(e => pattern.test(e.id)).map(e => e.id).sort().join(",");
    });
    const distinctMemberships = new Set(membershipPerSeed);
    expect(
      distinctMemberships.size,
      `attendu : plusieurs seeds font varier le sous-ensemble BR_HALF_V* retenu, obtenu le même pour tous : ${[...distinctMemberships]}`,
    ).toBeGreaterThan(1);
  });

  it("une fiche nettement mieux notée qu'une série générique à égalité reste incluse quel que soit le seed", () => {
    // B_703_BRICK_RACE_PACE (séance signature 70.3, "Obligatoire", objectif
    // étroit) domine nettement le score des BR_HALF_V* (génériques,
    // "Recommandé", mêmes tags) — un vrai écart de score, pas une égalité.
    // Le départage par seed ne doit jamais faire sortir cette fiche du
    // catalogue au profit d'une variante générique.
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 100, 12345]) {
      const cat: CatalogEntry[] = buildWorkoutCatalog("IRONMAN 70.3", 8, 12, 20, {
        maxItems: 10,
        sportFilter: ["brick"],
        rotationSeed: seed,
      });
      const ids = cat.map(e => e.id);
      expect(ids, `seed=${seed}`).toContain("B_703_BRICK_RACE_PACE");
    }
  });

  it("ne casse pas le hard-ban (score <= -1000) : une fiche start_to_run reste exclue d'un plan non-débutant quel que soit le seed", () => {
    for (const seed of [0, 1, 2, 3]) {
      const cat: CatalogEntry[] = buildWorkoutCatalog("marathon", 1, 12, 12, { maxItems: 200, rotationSeed: seed });
      const hasS2R = cat.some(e => /S2R_|START_TO_RUN/i.test(e.id));
      expect(hasS2R).toBe(false);
    }
  });
});
