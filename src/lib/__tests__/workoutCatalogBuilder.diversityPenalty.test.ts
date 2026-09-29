import { describe, it, expect } from "vitest";
import { buildWorkoutCatalog, type CatalogEntry } from "@/lib/workoutCatalogBuilder";

/**
 * P3 diversité — retour coach ("les plans utilisent souvent les mêmes
 * séances"). Mesuré empiriquement (catalogue marathon réel) : avec l'ancien
 * réglage (HISTORY_PENALTY_PER_USE=6, HISTORY_PENALTY_CAP=14), une fiche
 * réutilisée dans le seul plan précédent (poids de récence 1.0) restait
 * sélectionnable quasiment sans effet visible sur son classement. Avec le
 * nouveau réglage (7/18), la fiche en tête de classement recule dès un
 * usage modéré (poids ≈0.5) et sort effectivement du catalogue dès qu'elle
 * cumule l'équivalent d'un plan complet de réutilisation (poids ≈1.0) — un
 * vrai effet de rotation qui n'existait pas avant. (Seuils exacts mesurés
 * avec `rotationSeed` par défaut (0) — cf. aussi P4 diversité/
 * workoutCatalogBuilder.rotationSeed.test.ts, qui fait varier le départage
 * des égalités et peut donc légèrement déplacer CE seuil précis d'une fiche
 * à l'autre sans changer le comportement global.)
 */

function indexOf(catalog: CatalogEntry[], id: string): number {
  return catalog.findIndex(e => e.id === id);
}

describe("buildWorkoutCatalog — pénalité de diversité P3 (historicalUsage)", () => {
  const baseArgs = ["marathon", 1, 12, 12] as const;
  const options = { maxItems: 30 };

  it("sans historique, le comportement est inchangé", () => {
    const withoutHistory = buildWorkoutCatalog(...baseArgs, options);
    const withEmptyHistory = buildWorkoutCatalog(...baseArgs, { ...options, historicalUsage: new Map() });
    expect(withEmptyHistory.map(e => e.id)).toEqual(withoutHistory.map(e => e.id));
  });

  it("un usage modéré récent (poids 0.5) reste disponible mais recule dans le classement", () => {
    const baseline = buildWorkoutCatalog(...baseArgs, options);
    const targetId = baseline[0].id;

    const penalized = buildWorkoutCatalog(...baseArgs, {
      ...options,
      historicalUsage: new Map([[targetId, 0.5]]),
    });

    const idx = indexOf(penalized, targetId);
    expect(idx, `${targetId} devrait rester présent après un usage récent modéré`).toBeGreaterThan(0);
  });

  it("une fiche utilisée massivement (poids ≈1 plan complet ou plus) sort du catalogue envoyé au modèle", () => {
    const baseline = buildWorkoutCatalog(...baseArgs, options);
    const targetId = baseline[0].id;

    const penalized = buildWorkoutCatalog(...baseArgs, {
      ...options,
      historicalUsage: new Map([[targetId, 1.7]]),
    });

    expect(indexOf(penalized, targetId)).toBe(-1);
  });

  it("une fiche pénalisée au maximum reste sélectionnable si elle est la seule de sa famille (jamais un hard-ban)", () => {
    const baseline = buildWorkoutCatalog(...baseArgs, options);
    // Pénalise TOUTES les fiches du catalogue de base au maximum : si une
    // fiche est irremplaçable (aucune alternative hors du catalogue de base),
    // elle doit rester dans le catalogue final malgré la pénalité maximale.
    const historicalUsage = new Map<string, number>(baseline.map(e => [e.id, 10]));
    const penalized = buildWorkoutCatalog(...baseArgs, { ...options, historicalUsage });

    expect(penalized.length).toBeGreaterThan(0);
  });
});
