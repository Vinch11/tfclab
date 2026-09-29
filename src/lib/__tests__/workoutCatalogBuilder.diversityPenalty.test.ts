import { describe, it, expect } from "vitest";
import { buildWorkoutCatalog, type CatalogEntry } from "@/lib/workoutCatalogBuilder";

/**
 * P3 diversité — retour coach ("les plans utilisent souvent les mêmes
 * séances"). Mesuré empiriquement (catalogue marathon réel) : avec l'ancien
 * réglage (HISTORY_PENALTY_PER_USE=6, HISTORY_PENALTY_CAP=14), une fiche
 * réutilisée dans le seul plan précédent (poids de récence 1.0) restait
 * sélectionnable quasiment sans effet visible sur son classement. Avec le
 * nouveau réglage (7/18) : elle reste disponible après UNE réutilisation
 * (jamais de hard-ban sur un seul usage récent) mais recule nettement, et
 * sort effectivement du catalogue après DEUX plans consécutifs (poids
 * cumulé ≈1.7, cf. RECENCY_WEIGHTS) — un vrai effet de rotation qui
 * n'existait pas avant.
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

  it("une fiche utilisée dans le seul plan précédent (poids 1.0) reste disponible mais recule dans le classement", () => {
    const baseline = buildWorkoutCatalog(...baseArgs, options);
    const targetId = baseline[0].id;

    const penalized = buildWorkoutCatalog(...baseArgs, {
      ...options,
      historicalUsage: new Map([[targetId, 1.0]]),
    });

    const idx = indexOf(penalized, targetId);
    expect(idx, `${targetId} devrait rester présent après une seule réutilisation récente`).toBeGreaterThan(0);
  });

  it("une fiche utilisée dans les DEUX derniers plans consécutifs (poids cumulé ≈1.7) sort du catalogue envoyé au modèle", () => {
    const baseline = buildWorkoutCatalog(...baseArgs, options);
    const targetId = baseline[0].id;

    // RECENCY_WEIGHTS[0] + RECENCY_WEIGHTS[1] = 1 + 0.7 — la fiche est
    // présente dans le plan n-1 ET le plan n-2.
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
