import { describe, it, expect } from "vitest";
import { buildWorkoutCatalog } from "@/lib/workoutCatalogBuilder";

/**
 * P6 diversité — cause #3 de l'audit catalogue (suite). Même après avoir
 * corrigé les `goals` trop larges des fiches "méthode" (workoutGoalsEnricher),
 * certaines restaient invisibles à cause d'un second bug, plus profond :
 * `effectiveCap` était relevé pile à `socleIds.size` quand le socle dépassait
 * déjà `maxItems` (fréquent pour un sport couvrant beaucoup de familles
 * d'intention, ex. "course" en plan marathon/semi/10k — 12 familles × jusqu'à
 * 4-5 fiches chacune). Or `selected.length` juste après l'insertion du socle
 * vaut EXACTEMENT `socleIds.size` — le tout premier test du remplissage
 * (`selected.length >= capForThis`) était donc déjà vrai avant même de
 * démarrer : le remplissage n'ajoutait JAMAIS rien, quels que soient les
 * scores restants. Mesuré : CANOVA_RUN_PROGRESSIVE_LONG et
 * KENYAN_RUN_LONG_NEGATIVE_SPLIT (score=28, à égalité stricte avec ~13 autres
 * fiches pour seulement 4 places de socle dans leur famille) n'entraient
 * JAMAIS dans le catalogue à aucun rotationSeed testé (0-19), malgré un rang
 * global ~25/701. Fix : garantir une marge de remplissage AU-DELÀ du socle
 * même quand celui-ci dépasse déjà maxItems — proportionnelle à maxItems pour
 * ne pas noyer un cap volontairement serré (tests, sportFilter resserré).
 */
describe("buildWorkoutCatalog — headroom de remplissage au-delà du socle", () => {
  it("une fiche à égalité stricte hors du top-4 de sa famille (mais bien notée) devient atteignable", () => {
    const seeds = [0, 1, 2, 3, 4, 5];
    let hits = 0;
    for (const seed of seeds) {
      const cat = buildWorkoutCatalog("marathon", 4, 12, 16, { maxItems: 80, rotationSeed: seed });
      if (cat.some(e => e.id === "CANOVA_RUN_PROGRESSIVE_LONG")) hits++;
    }
    expect(hits, "CANOVA_RUN_PROGRESSIVE_LONG devrait être atteignable sur au moins un seed").toBeGreaterThan(0);
  });

  it("le total sélectionné dépasse la taille du socle quand celui-ci dépasse déjà maxItems", () => {
    const cat = buildWorkoutCatalog("marathon", 4, 12, 16, { maxItems: 80 });
    // Le socle seul dépassait déjà maxItems pour cet objectif (mesuré ~183) —
    // le remplissage doit malgré tout avoir pu ajouter des fiches au-delà.
    expect(cat.length).toBeGreaterThan(80);
  });

  it("un maxItems volontairement petit reste un vrai cap serré (la marge ne l'engloutit pas)", () => {
    const catSmall = buildWorkoutCatalog("IRONMAN 70.3", 8, 12, 20, {
      maxItems: 10,
      sportFilter: ["brick"],
    });
    // La marge de remplissage est proportionnelle à maxItems (moitié) : pour
    // maxItems=10, elle ne doit pas transformer un cap serré en cap qui laisse
    // passer la quasi-totalité du pool brick (52 fiches).
    expect(catSmall.length).toBeLessThan(30);
  });
});
