import { describe, it, expect } from "vitest";
import { buildWorkoutCatalog, type CatalogEntry } from "@/lib/workoutCatalogBuilder";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import { ficheMainZoneMax, intensityFamily } from "@/lib/plan/planReconciler";

/**
 * P1 (audit "B-5K-BEGINNER round 2", consigne coach) : "Utilise les
 * informations existantes de trainingLevel et trainingLevelSource pour
 * adapter la sélection des séances en amont." Avant ce correctif, le
 * catalogue injecté au LLM (buildWorkoutCatalog) ne tenait compte d'aucun
 * signal de niveau — un débutant confirmé (untrained/manual) et un confirmé
 * visant "finisher" recevaient exactement le même catalogue, y compris les
 * fiches "vo2" (zone max Main >4, ex. VMA/côtes/fartlek intenses).
 */

function countVo2(catalog: CatalogEntry[]): number {
  let n = 0;
  for (const e of catalog) {
    const fiche = WorkoutLibrary.find(w => w.id === e.id);
    if (fiche && intensityFamily(ficheMainZoneMax(fiche)) === "vo2") n++;
  }
  return n;
}

describe("buildWorkoutCatalog — beginnerIntensitySignal (P1, trainingLevel en amont)", () => {
  it("niveau untrained, source manual (fiable) → le catalogue 10K exclut les fiches vo2 pour le sport run", () => {
    const baseArgs = ["10K", 1, 10, 10] as const;
    const options = { maxItems: 80, sportFilter: ["course" as const] };

    const withoutSignal = buildWorkoutCatalog(...baseArgs, options);
    const withBeginnerSignal = buildWorkoutCatalog(...baseArgs, {
      ...options,
      beginnerIntensitySignal: { trainingLevel: "untrained", trainingLevelSource: "manual" },
    });

    expect(withoutSignal.length).toBeGreaterThan(0);
    expect(countVo2(withoutSignal)).toBeGreaterThan(0); // le catalogue normal contient bien du vo2 (10K en a besoin)
    expect(countVo2(withBeginnerSignal)).toBe(0); // exclu pour un débutant confirmé
  });

  it("niveau untrained MAIS source fallback-prudent → filtre INACTIF (jamais traité comme une mesure fiable)", () => {
    const baseArgs = ["10K", 1, 10, 10] as const;
    const options = { maxItems: 80, sportFilter: ["course" as const] };

    const withoutSignal = buildWorkoutCatalog(...baseArgs, options);
    const withFallback = buildWorkoutCatalog(...baseArgs, {
      ...options,
      beginnerIntensitySignal: { trainingLevel: "untrained", trainingLevelSource: "fallback-prudent" },
    });

    expect(withoutSignal.map(e => e.id)).toEqual(withFallback.map(e => e.id));
  });

  it("niveau 'trained' (confirmé) avec source manual, ambition='finisher' simulée côté appelant → accès complet préservé", () => {
    // Le filtre ne regarde QUE trainingLevel, jamais `ambition` — un confirmé
    // visant simplement à terminer garde l'accès complet aux séances
    // exigeantes adaptées à son niveau réel.
    const baseArgs = ["10K", 1, 10, 10] as const;
    const options = { maxItems: 80, sportFilter: ["course" as const] };

    const withoutSignal = buildWorkoutCatalog(...baseArgs, options);
    const withConfirmedSignal = buildWorkoutCatalog(...baseArgs, {
      ...options,
      beginnerIntensitySignal: { trainingLevel: "trained", trainingLevelSource: "manual" },
    });

    expect(withoutSignal.map(e => e.id)).toEqual(withConfirmedSignal.map(e => e.id));
  });

  it("niveau untrained, source auto-tss (fiable mais non manuel) → filtre actif quand même", () => {
    const baseArgs = ["10K", 1, 10, 10] as const;
    const options = { maxItems: 80, sportFilter: ["course" as const] };

    const withAutoTss = buildWorkoutCatalog(...baseArgs, {
      ...options,
      beginnerIntensitySignal: { trainingLevel: "untrained", trainingLevelSource: "auto-tss" },
    });
    expect(countVo2(withAutoTss)).toBe(0);
  });

  it("aucun signal transmis → comportement legacy inchangé (filtre inactif par défaut)", () => {
    const baseArgs = ["10K", 1, 10, 10] as const;
    const options = { maxItems: 80, sportFilter: ["course" as const] };

    const withoutOption = buildWorkoutCatalog(...baseArgs, options);
    const withNullSignal = buildWorkoutCatalog(...baseArgs, { ...options, beginnerIntensitySignal: null });
    expect(withoutOption.map(e => e.id)).toEqual(withNullSignal.map(e => e.id));
  });
});
