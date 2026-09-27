import { describe, it, expect } from "vitest";
import { buildWorkoutCatalog, resetCatalogAttribution, getCatalogAttribution } from "../workoutCatalogBuilder";
import { WorkoutLibrary } from "../workoutLibrary";

/**
 * Bug réel (audit "génération de plan IA", plan Emanuela, "Bloc 4 ·
 * Régénération post-pic" S22-23, 3ᵉ vérification post-PR #274) : même avec
 * `phaseOverride: ["base"] + strictPhaseFilter`, deux fiches à forte charge
 * ont fuité dans le catalogue de la semaine de régénération :
 *  - `C_STR_MAX_LOWER_HEAVY` (squat 4×4 @85-90% 1RM, Rønnestad) —
 *    `phase: ["base", "build"]`.
 *  - `SEILER_BIKE_Z1_LONG` (sortie longue vélo jusqu'à 210min) —
 *    `phase: ["base", "build", "peak"]`.
 * Les deux sont légitimement taguées "base" (piliers authentiques de la
 * phase base en périodisation classique) : le filtre par PHASE les garde à
 * raison. Le vrai problème est que "base" ≠ "déload" — une semaine de
 * régénération inter-cycles a besoin d'un vrai déload (charge basse), un axe
 * orthogonal à la phase que `phaseOverride` seul ne peut pas capturer.
 *
 * Fix : `regenGapLoadFilter` ajoute un filtre par charge indépendant de la
 * phase (Stage 6.5) — exclusion des tags force max (`heavy`/`max-force`),
 * des fiches dont une partie de structure contient une zone Z4+ (défense en
 * profondeur contre une fuite build/peak par ailleurs), et plafond de durée
 * pour les sports d'endurance.
 *
 * Les assertions utilisent `getCatalogAttribution()` (bestStage atteint par
 * chaque fiche) plutôt que la présence finale dans le catalogue tronqué :
 * le cap souple par catégorie (fill_cat_cap, indépendant de ce fix) peut
 * exclure une fiche du catalogue final pour des raisons de tri par score
 * sans rapport avec le filtre par phase/charge — l'attribution isole
 * précisément l'étage responsable de l'exclusion.
 */
describe("buildWorkoutCatalog — regenGapLoadFilter exclut le contenu à forte charge d'une semaine de régénération", () => {
  const KNOWN_HEAVY_STRENGTH_ID = "C_STR_MAX_LOWER_HEAVY";
  const KNOWN_LONG_ENDURANCE_ID = "SEILER_BIKE_Z1_LONG";

  it("préconditions bibliothèque — les fiches de référence sont bien taguées phase='base' (le filtre par phase seul les garde à raison)", () => {
    const heavy = WorkoutLibrary.find((e) => e.id === KNOWN_HEAVY_STRENGTH_ID);
    const long = WorkoutLibrary.find((e) => e.id === KNOWN_LONG_ENDURANCE_ID);
    expect(heavy, `${KNOWN_HEAVY_STRENGTH_ID} doit exister dans WorkoutLibrary`).toBeTruthy();
    expect(long, `${KNOWN_LONG_ENDURANCE_ID} doit exister dans WorkoutLibrary`).toBeTruthy();
    expect(heavy!.phase?.includes("base"), `${KNOWN_HEAVY_STRENGTH_ID} doit inclure "base" pour servir de cas de test (fuite malgré phaseOverride)`).toBe(true);
    expect(long!.phase?.includes("base"), `${KNOWN_LONG_ENDURANCE_ID} doit inclure "base" pour servir de cas de test (fuite malgré phaseOverride)`).toBe(true);
    expect(long!.durationMin[1], `${KNOWN_LONG_ENDURANCE_ID} doit avoir une durée max > 120min pour servir de cas de test`).toBeGreaterThan(120);
  });

  it("phaseOverride+strictPhaseFilter SEULS ne suffisent pas : les 2 fiches à forte charge survivent au Stage 6 phase_filter (reproduit le bug)", () => {
    resetCatalogAttribution();
    buildWorkoutCatalog("Ironman", 22, 23, 39, {
      maxItems: 200,
      phaseOverride: ["base"],
      strictPhaseFilter: true,
    });
    const attr = getCatalogAttribution();
    expect(
      attr.get(KNOWN_HEAVY_STRENGTH_ID.toUpperCase())?.bestStage,
      "sans regenGapLoadFilter, le squat lourd ne doit PAS être bloqué au stage phase_filter (phase='base' légitime) — il doit survivre au moins jusqu'à un stage ultérieur",
    ).not.toBe("phase_filter");
    expect(
      attr.get(KNOWN_LONG_ENDURANCE_ID.toUpperCase())?.bestStage,
      "sans regenGapLoadFilter, la sortie longue ne doit PAS être bloquée au stage phase_filter (phase='base' légitime) — elle doit survivre au moins jusqu'à un stage ultérieur",
    ).not.toBe("phase_filter");
  });

  it("avec regenGapLoadFilter en plus, les 2 fiches à forte charge sont exclues précisément au stage regen_gap_load_filter", () => {
    resetCatalogAttribution();
    buildWorkoutCatalog("Ironman", 22, 23, 39, {
      maxItems: 200,
      phaseOverride: ["base"],
      strictPhaseFilter: true,
      regenGapLoadFilter: true,
    });
    const attr = getCatalogAttribution();
    expect(
      attr.get(KNOWN_HEAVY_STRENGTH_ID.toUpperCase())?.bestStage,
      "le squat lourd Rønnestad doit être exclu au stage regen_gap_load_filter (tag 'heavy')",
    ).toBe("regen_gap_load_filter");
    expect(
      attr.get(KNOWN_LONG_ENDURANCE_ID.toUpperCase())?.bestStage,
      "la sortie longue vélo doit être exclue au stage regen_gap_load_filter (plafond de durée)",
    ).toBe("regen_gap_load_filter");
  });

  it("regenGapLoadFilter n'exclut pas tout le contenu 'base' légitime d'une semaine de régénération (catalogue non vide)", () => {
    const catalog = buildWorkoutCatalog("Ironman", 22, 23, 39, {
      maxItems: 200,
      phaseOverride: ["base"],
      strictPhaseFilter: true,
      regenGapLoadFilter: true,
    });
    expect(catalog.length, "un catalogue de régénération filtré par charge doit rester exploitable (pas totalement vidé)").toBeGreaterThan(10);
  });

  it("aucune fiche du catalogue de régénération (regenGapLoadFilter) ne porte un tag force max, une zone Z4+, ou une durée d'endurance > 120min", () => {
    const catalog = buildWorkoutCatalog("Ironman", 22, 23, 39, {
      maxItems: 200,
      phaseOverride: ["base"],
      strictPhaseFilter: true,
      regenGapLoadFilter: true,
    });
    const violations = catalog.filter((e) => {
      const w = WorkoutLibrary.find((lib) => lib.id === e.id);
      if (!w) return false;
      const tagHit = (w.tags || []).some((t) => ["heavy", "max-force"].includes(String(t).toLowerCase()));
      const zoneHit = (w.structure || []).some((part) => (part.zones || []).some((z) => /^Z[4-6]/i.test(z)));
      const enduranceSports = ["bike", "cyclisme", "run", "course", "natation", "swim", "trail", "brick"];
      const durationHit = enduranceSports.includes(w.sport) && w.durationMin[1] > 120;
      return tagHit || zoneHit || durationHit;
    });
    expect(
      violations.map((e) => e.id),
      "un catalogue regenGapLoadFilter ne doit contenir aucune fiche à forte charge",
    ).toEqual([]);
  });

  it("regenGapLoadFilter désactive aussi le backfill structurel (Pass 5) qui forçait ≥2 sorties vélo ≥120min + ≥2 sorties course ≥90min + ≥1 brick", () => {
    // Bug réel (le plus persistant des 3 vérifications) : ce backfill piochait
    // dans SourceLibrary avec un filtre de phase SOUPLE et ignorait
    // totalement phaseOverride/strictPhaseFilter ET regenGapLoadFilter,
    // recréant exactement la "brique Obligatoire 120-180min" du bug initial
    // même une fois les Stages 6/6.5 corrigés.
    const catalog = buildWorkoutCatalog("Ironman", 22, 23, 39, {
      maxItems: 200,
      phaseOverride: ["base"],
      strictPhaseFilter: true,
      regenGapLoadFilter: true,
    });
    // Une brique COURTE (≤120min, phase='base', non taguée heavy) peut
    // légitimement survivre par mérite normal (score/socle) — ce n'est pas le
    // backfill forcé qu'on veut éliminer. Seule une brique "longue" (>120min,
    // la signature du bug initial "brique Obligatoire 120-180min") ne doit
    // plus jamais apparaître.
    const longBrickCount = catalog.filter((e) => {
      const w = WorkoutLibrary.find((lib) => lib.id === e.id);
      return w && w.sport === "brick" && w.durationMin[1] > 120;
    }).length;
    const longBikeCount = catalog.filter((e) => {
      const w = WorkoutLibrary.find((lib) => lib.id === e.id);
      return w && (w.sport === "cyclisme" || w.sport === "bike") && (w.durationMin[0] + w.durationMin[1]) / 2 >= 120;
    }).length;
    expect(longBrickCount, "aucune brique longue (>120min) ne doit être forcée dans un catalogue de régénération").toBe(0);
    expect(longBikeCount, "aucune sortie longue vélo (≥120min médiane) ne doit être forcée dans un catalogue de régénération").toBe(0);
  });

  it("sans regenGapLoadFilter (chunk normal hors régénération), les 2 fiches restent disponibles — comportement historique inchangé", () => {
    resetCatalogAttribution();
    buildWorkoutCatalog("Ironman", 1, 5, 39, { maxItems: 200 });
    const attr = getCatalogAttribution();
    expect(
      attr.get(KNOWN_HEAVY_STRENGTH_ID.toUpperCase())?.bestStage,
      "hors régénération (regenGapLoadFilter non activé), le fix ne doit jamais exclure au stage regen_gap_load_filter",
    ).not.toBe("regen_gap_load_filter");
    expect(
      attr.get(KNOWN_LONG_ENDURANCE_ID.toUpperCase())?.bestStage,
      "hors régénération (regenGapLoadFilter non activé), le fix ne doit jamais exclure au stage regen_gap_load_filter",
    ).not.toBe("regen_gap_load_filter");
  });
});
