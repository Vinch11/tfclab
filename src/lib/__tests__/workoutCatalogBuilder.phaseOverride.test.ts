import { describe, it, expect } from "vitest";
import { buildWorkoutCatalog } from "../workoutCatalogBuilder";
import { WorkoutLibrary } from "../workoutLibrary";

/**
 * Bug réel (audit "génération de plan IA", plan Emanuela, "Bloc 4 ·
 * Régénération post-pic" S22-23 d'un plan Marathon→Ironman de 39 semaines) :
 * ces 2 semaines de régénération inter-cycles affichaient une charge COMPLÈTE
 * (FTP threshold 2x20', MLSS "Obligatoire", squat/deadlift lourds, VO2max,
 * brick long) malgré le fix PR #272 (quota hebdomadaire réduit à
 * weekType="recovery"). Cause racine : le catalogue envoyé au LLM pour le
 * chunk contenant S22-23 (`buildWorkoutCatalog(catalogObjective, cStart, cEnd,
 * totalWeeks, ...)`, appelé depuis useAITrainingPlan.ts) infère sa phase
 * UNIQUEMENT depuis la position calendaire du chunk (`phasesForWeekRange`) —
 * aveugle aux segments de cycles multi-objectifs. Pour un chunk S21-25 d'un
 * plan de 39 semaines, le milieu (S23) tombe à 59% → phases=["build","peak"],
 * qui boostent et laissent passer (Stage 6 `phase_filter`) exactement les
 * fiches intenses que le prompt textuel demande d'éviter — le quota réduit le
 * NOMBRE de séances, jamais le contenu disponible pour les remplir.
 *
 * Fix : nouvelle option `phaseOverride` sur `buildWorkoutCatalog`, utilisée
 * par useAITrainingPlan.ts pour construire un second catalogue RESTREINT
 * (phaseOverride=["base"]) dédié aux semaines de régénération inter-cycles
 * couvertes par un chunk, en plus du catalogue normal (qui reste inchangé
 * pour les autres semaines du même chunk). `["base"]` doit exclure dur (Stage
 * 6 `phase_filter`) toute fiche dont le tag `phase` n'inclut PAS "base" (ex.
 * `phase: ["build"]` uniquement, comme `V3_BIKE_THRESHOLD_2x20`, la fiche FTP
 * 2x20' "gold standard" à l'origine du bug).
 */
describe("buildWorkoutCatalog — phaseOverride force la phase retenue (régénération inter-cycles)", () => {
  // Fiche connue et stable : phase build UNIQUEMENT (jamais "base"), tag
  // reconnaissable — signature exacte du contenu qui fuitait dans le bug.
  const KNOWN_BUILD_ONLY_ID = "V3_BIKE_THRESHOLD_2x20";

  it("préconditions bibliothèque — la fiche de référence est bien phase build UNIQUEMENT (pas base)", () => {
    const w = WorkoutLibrary.find((e) => e.id === KNOWN_BUILD_ONLY_ID);
    expect(w, `${KNOWN_BUILD_ONLY_ID} doit exister dans WorkoutLibrary (sinon changer la fiche de référence du test)`).toBeTruthy();
    expect(w!.phase, `${KNOWN_BUILD_ONLY_ID} doit être taguée phase=["build"] uniquement pour servir de cas de test`).toEqual(["build"]);
  });

  it("avec phaseOverride=['base'], AUCUNE fiche taguée uniquement build/peak/taper (jamais 'base') ne peut apparaître dans le catalogue", () => {
    // Chunk S21-25 d'un plan de 39 semaines : reproduit fidèlement la
    // position réelle du "Bloc 4 · Régénération post-pic" du plan Emanuela.
    const catalog = buildWorkoutCatalog("Ironman", 21, 25, 39, {
      maxItems: 200,
      phaseOverride: ["base"],
      strictPhaseFilter: true,
    });
    const nonBaseOnlyLeaks = catalog.filter((e) => {
      const w = WorkoutLibrary.find((lib) => lib.id === e.id);
      return w && Array.isArray(w.phase) && w.phase.length > 0 && !w.phase.includes("base");
    });
    expect(
      nonBaseOnlyLeaks.map((e) => e.id),
      "un catalogue restreint phaseOverride=['base'] ne doit contenir AUCUNE fiche dont la phase exclut 'base' — c'est exactement la fuite de contenu build/peak qui causait le bug",
    ).toEqual([]);
    expect(catalog.length, "le catalogue restreint doit rester non-vide").toBeGreaterThan(0);
  });

  it("sans override, le même chunk (position calendaire build/peak) reste permissif : au moins une fiche build-only y est éligible", () => {
    const catalog = buildWorkoutCatalog("Ironman", 21, 25, 39, { maxItems: 200 });
    const buildOnlyPresent = catalog.some((e) => {
      const w = WorkoutLibrary.find((lib) => lib.id === e.id);
      return w && Array.isArray(w.phase) && w.phase.length > 0 && !w.phase.includes("base");
    });
    expect(
      buildOnlyPresent,
      "sans phaseOverride, ce chunk (phases calculées ~['build','peak']) doit rester permissif aux fiches build/peak-only — comportement historique pour les vraies semaines de charge du même chunk, qui ne doit pas être cassé par le fix",
    ).toBe(true);
  });
});
