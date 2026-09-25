import { describe, it, expect } from "vitest";
import { buildWorkoutCatalog, isStructuralSession } from "@/lib/workoutCatalogBuilder";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import { ficheCompatibleWithPhases } from "@/lib/plan/phaseNormalization";
import { getCatalogSportFilter } from "@/hooks/useAITrainingPlan";
import { intentFamilyOf } from "@/lib/plan/intentFamily";

const NON_TRAIL_EXCLUDE_ID_PATTERNS = [
  /^HEDGEHOG_/i, /_HEDGEHOG_/i, /^URBAN_/i, /^TRAIL_/i, /_TRAIL_/i,
  /^[A-D]_TR(?:50)?_/i, /^EXPE_HORS_VILLE_/i, /^V3_TRAIL_/i,
];
const NON_TRAIL_EXCLUDE_TAGS = ["trail", "trail-urban"];

const CHUNK_SIZE = 4;

function median(range: [number, number]) {
  return (range[0] + range[1]) / 2;
}

describe("buildWorkoutCatalog — F-CHUNK-STRUCT structural coverage", () => {
  it("un plan 70.3 12 sem : chaque chunk contient ≥2 bike ≥120min, ≥2 run ≥90min, ≥1 brick", () => {
    const totalWeeks = 12;
    const totalChunks = Math.ceil(totalWeeks / CHUNK_SIZE);
    const chunkUsedIds = new Set<string>();
    const perChunk: Array<ReturnType<typeof buildWorkoutCatalog>> = [];

    for (let ci = 0; ci < totalChunks; ci++) {
      const cStart = ci * CHUNK_SIZE + 1;
      const cEnd = Math.min(cStart + CHUNK_SIZE - 1, totalWeeks);
      const cat = buildWorkoutCatalog("70.3", cStart, cEnd, totalWeeks, {
        maxItems: 45,
        chunkIndex: ci,
        excludeIds: chunkUsedIds,
        excludeIdPatterns: NON_TRAIL_EXCLUDE_ID_PATTERNS,
        excludeTags: NON_TRAIL_EXCLUDE_TAGS,
      });
      perChunk.push(cat);

      const bikeLong = cat.filter(
        e => (e.sport === "cyclisme" || e.sport === "bike") && median(e.durationMin) >= 120,
      );
      const runLong = cat.filter(
        e => (e.sport === "course" || e.sport === "run") && median(e.durationMin) >= 90,
      );
      const brick = cat.filter(e => e.sport === "brick");

      expect(
        bikeLong.length,
        `chunk ${ci} bike ≥120min: ${bikeLong.map(b => b.id).join(",")}`,
      ).toBeGreaterThanOrEqual(2);
      expect(
        runLong.length,
        `chunk ${ci} run ≥90min: ${runLong.map(r => r.id).join(",")}`,
      ).toBeGreaterThanOrEqual(2);
      expect(brick.length, `chunk ${ci} brick: ${brick.map(b => b.id).join(",")}`).toBeGreaterThanOrEqual(1);

      // Rotation soft — exclut la moitié des courtes du chunk pour le suivant
      const halfShort = cat
        .slice(0, Math.floor(cat.length / 2))
        .filter(e => median(e.durationMin) < 120 && !/race[-_\s]?sim/i.test(e.cat))
        .map(e => e.id);
      halfShort.forEach(id => chunkUsedIds.add(id));
    }

    expect(perChunk.length).toBe(totalChunks);
  });

  it("la rotation des séances courtes reste effective entre chunks", () => {
    const totalWeeks = 12;
    const chunkUsedIds = new Set<string>();
    const cat1 = buildWorkoutCatalog("70.3", 1, 4, totalWeeks, {
      maxItems: 45,
      chunkIndex: 0,
      excludeIds: chunkUsedIds,
      excludeIdPatterns: NON_TRAIL_EXCLUDE_ID_PATTERNS,
      excludeTags: NON_TRAIL_EXCLUDE_TAGS,
    });

    // Simule la soft-rotation du hook : exclut moitié des courtes non structurelles
    const isStructuralEntry = (e: { cat: string; durationMin: [number, number]; objectif: string }) => {
      if (median(e.durationMin) >= 120) return true;
      if (/race[-_\s]?sim/i.test(e.cat)) return true;
      if (/\bsortie\s*longue\b|\blong\s*run\b|\blong\s*ride\b|\brace[-\s]?sim\b/i.test(e.objectif)) return true;
      return false;
    };
    const shortInChunk1 = cat1.filter(e => !isStructuralEntry(e));
    const excludedShort = shortInChunk1.slice(0, Math.floor(shortInChunk1.length / 2)).map(e => e.id);
    excludedShort.forEach(id => chunkUsedIds.add(id));

    const cat2 = buildWorkoutCatalog("70.3", 5, 8, totalWeeks, {
      maxItems: 45,
      chunkIndex: 1,
      excludeIds: chunkUsedIds,
      excludeIdPatterns: NON_TRAIL_EXCLUDE_ID_PATTERNS,
      excludeTags: NON_TRAIL_EXCLUDE_TAGS,
    });

    // Les IDs courts exclus ne doivent PAS réapparaître dans le chunk 2
    const cat2Ids = new Set(cat2.map(e => e.id));
    for (const excludedId of excludedShort) {
      expect(cat2Ids.has(excludedId), `${excludedId} (court) ne doit pas réapparaître au chunk 2`).toBe(false);
    }
  });

  it("semaine d'affûtage pure (taper) : le backfill structurel n'injecte PAS de vélo/course longs ou de brick incompatibles avec la phase", () => {
    // Régression : Pass 5 (F-CHUNK-STRUCT) forçait ≥2 bike ≥120min, ≥2 run
    // ≥90min et ≥1 brick dans CHAQUE chunk sans filtrer par phase — alors
    // qu'aucune de ces fiches n'est taguée "taper" dans la bibliothèque.
    // Semaine 10/10 d'un plan 70.3 : midPct=1.0 ⇒ phase taper pure (aucun
    // chevauchement avec peak, cf. phasesForWeekRange).
    const totalWeeks = 10;
    const cat = buildWorkoutCatalog("70.3", totalWeeks, totalWeeks, totalWeeks, {
      maxItems: 45,
      chunkIndex: 2,
      excludeIds: new Set(),
      excludeIdPatterns: NON_TRAIL_EXCLUDE_ID_PATTERNS,
      excludeTags: NON_TRAIL_EXCLUDE_TAGS,
    });

    const bikeLong = cat.filter(
      e => (e.sport === "cyclisme" || e.sport === "bike") && median(e.durationMin) >= 120,
    );
    const runLong = cat.filter(
      e => (e.sport === "course" || e.sport === "run") && median(e.durationMin) >= 90,
    );
    const brick = cat.filter(e => e.sport === "brick");

    // Le backfill peut légitimement injecter une fiche longue si elle est
    // elle-même déclarée compatible taper (ex. répétition générale dont le
    // `when` mentionne explicitement "Affûtage (S19)") — l'invariant n'est
    // pas "zéro fiche longue en taper" mais "aucune fiche incompatible avec
    // la phase ne doit être forcée".
    const byId = new Map(WorkoutLibrary.map(w => [w.id, w]));
    for (const e of [...bikeLong, ...runLong, ...brick]) {
      const fiche = byId.get(e.id);
      expect(fiche, `fiche introuvable dans WorkoutLibrary: ${e.id}`).toBeDefined();
      if (!fiche) continue;
      expect(
        ficheCompatibleWithPhases(fiche, new Set(["taper"])),
        `${e.id} injectée en semaine taper mais incompatible avec la phase "taper"`,
      ).toBe(true);
    }
  });

  // Régression réelle (retour coach : "très peu de CAP en préparation du
  // marathon") — audit "bibliothèque de séances" : `catalogObjective` (fix
  // précédent) passe désormais l'objectif du CYCLE ("Marathon") au lieu de
  // l'objectif final du plan ("Ironman") pour un cycle intermédiaire d'un
  // plan multi-objectifs. Mais `isTriGoal` (ce fichier) ne reconnaissait que
  // "ironman"/"half" — pour goals=["marathon","semi"], le pass structurel
  // entier était sauté : plus AUCUNE garantie de sortie longue course.
  it("objectif Marathon (mono-objectif ou cycle intermédiaire) : chaque chunk contient ≥3 sorties longues course ≥90min, sans vélo/brick forcé", () => {
    const totalWeeks = 12;
    const cat = buildWorkoutCatalog("Marathon", 1, 4, totalWeeks, {
      maxItems: 45,
      chunkIndex: 0,
      excludeIds: new Set(),
      excludeIdPatterns: NON_TRAIL_EXCLUDE_ID_PATTERNS,
      excludeTags: NON_TRAIL_EXCLUDE_TAGS,
    });

    const runLong = cat.filter(
      e => (e.sport === "course" || e.sport === "run") && median(e.durationMin) >= 90,
    );
    expect(
      runLong.length,
      `run ≥90min: ${runLong.map(r => r.id).join(",")}`,
    ).toBeGreaterThanOrEqual(3);
  });

  // Root cause réelle du même retour coach : même avec le fix ci-dessus, le
  // socle de couverture par (sport × famille) de buildWorkoutCatalog garantit
  // une présence minimale POUR CHAQUE SPORT ÉLIGIBLE, indépendamment du score
  // "objectif marathon" — tant que `sportFilter` reste celui de l'objectif
  // FINAL du plan (Ironman → sports triathlon complets), vélo/natation
  // gardent une représentation quasi égale à la course dans le catalogue
  // envoyé à l'IA (mesuré : 47 course / 45 vélo / 33 natation sur une fenêtre
  // réelle S16-S22 d'un plan Manu-like). Le vrai levier est le filtre sport
  // lui-même : useAITrainingPlan.ts applique désormais `catalogObjective`
  // (pas seulement l'objectif final) à `getCatalogSportFilter`, exactement
  // comme pour un plan Marathon mono-objectif classique.
  it("filtre sport dérivé de l'objectif du CYCLE (Marathon) élimine vélo/natation du catalogue, contrairement au filtre de l'objectif final (Ironman)", () => {
    const totalWeeks = 39;
    const withFinalObjectiveFilter = buildWorkoutCatalog("Marathon", 16, 22, totalWeeks, {
      maxItems: 45,
      chunkIndex: 0,
      excludeIds: new Set(),
      sportFilter: getCatalogSportFilter("Ironman"),
    });
    const withCycleObjectiveFilter = buildWorkoutCatalog("Marathon", 16, 22, totalWeeks, {
      maxItems: 45,
      chunkIndex: 0,
      excludeIds: new Set(),
      sportFilter: getCatalogSportFilter("Marathon"),
    });

    const nonRun = (cat: typeof withFinalObjectiveFilter) =>
      cat.filter(e => e.sport !== "course" && e.sport !== "run");

    // Avant le fix (filtre basé sur l'objectif final) : vélo/natation bien présents.
    expect(nonRun(withFinalObjectiveFilter).length).toBeGreaterThan(0);
    // Avec le fix (filtre basé sur l'objectif du cycle) : plus aucun vélo/natation.
    expect(
      withCycleObjectiveFilter.filter(e => e.sport === "cyclisme" || e.sport === "bike").length,
    ).toBe(0);
    expect(
      withCycleObjectiveFilter.filter(e => e.sport === "natation" || e.sport === "swim").length,
    ).toBe(0);
  });

  // Suite à la question du coach ("est-ce juste scientifiquement pour
  // quelqu'un qui prépare aussi un Ironman ?") : exclure TOTALEMENT vélo/
  // natation pendant tout un cycle Marathon intermédiaire (~20 sem) risque
  // une vraie perte spécifique (feel-for-water, tolérance posturale vélo)
  // avant l'Ironman qui suit. `maintenanceSports` réinjecte une dose minimale
  // (≤1 séance chacun, famille "recuperation" uniquement) sans revenir au mix
  // ~1/3-1/3-1/3 d'avant le fix précédent.
  it("maintenanceSports réinjecte ≤1 séance récupération par sport, sans revenir à une représentation équilibrée", () => {
    const totalWeeks = 39;
    const cat = buildWorkoutCatalog("Marathon", 16, 22, totalWeeks, {
      maxItems: 45,
      chunkIndex: 0,
      excludeIds: new Set(),
      sportFilter: getCatalogSportFilter("Marathon"),
      maintenanceSports: ["cyclisme", "natation"],
    });

    const bikeEntries = cat.filter(e => e.sport === "cyclisme" || e.sport === "bike");
    const swimEntries = cat.filter(e => e.sport === "natation" || e.sport === "swim");

    expect(bikeEntries.length).toBeLessThanOrEqual(1);
    expect(swimEntries.length).toBeLessThanOrEqual(1);

    const byId = new Map(WorkoutLibrary.map(w => [w.id, w]));
    for (const e of [...bikeEntries, ...swimEntries]) {
      const fiche = byId.get(e.id);
      expect(fiche, `fiche introuvable: ${e.id}`).toBeDefined();
      if (fiche) expect(intentFamilyOf(fiche)).toBe("recuperation");
    }
  });

  it("sans maintenanceSports (comportement par défaut) : toujours 0 vélo/natation", () => {
    const totalWeeks = 39;
    const cat = buildWorkoutCatalog("Marathon", 16, 22, totalWeeks, {
      maxItems: 45,
      chunkIndex: 0,
      excludeIds: new Set(),
      sportFilter: getCatalogSportFilter("Marathon"),
    });
    expect(cat.filter(e => e.sport === "cyclisme" || e.sport === "bike").length).toBe(0);
    expect(cat.filter(e => e.sport === "natation" || e.sport === "swim").length).toBe(0);
  });

  it("isStructuralSession détecte SL (≥120min), race-sim et tags long", () => {
    const longBike = WorkoutLibrary.find(
      w => (w.sport === "cyclisme" || w.sport === "bike") && (w.durationMin[0] + w.durationMin[1]) / 2 >= 120,
    );
    expect(longBike).toBeDefined();
    if (longBike) expect(isStructuralSession(longBike)).toBe(true);

    const shortVO2 = WorkoutLibrary.find(
      w => w.sport === "course" && (w.durationMin[0] + w.durationMin[1]) / 2 < 90 && /vo2/i.test(w.objectif),
    );
    if (shortVO2) expect(isStructuralSession(shortVO2)).toBe(false);
  });
});
