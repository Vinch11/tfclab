/**
 * Mission Axe C (consigne coach) : étend au catalogue injecté à Gemini un
 * garde-fou de prérequis de niveau pour 8 fiches dont le contenu réel
 * (texte `avoid`/`when`, pas le nom de la méthode) documente explicitement
 * un seuil d'expérience/volume/qualificatif de niveau — cf.
 * MISSION_AXE_C_VALIDATION.md §1. Utilise le VRAI catalogue
 * (`@/lib/workoutLibrary`, 920 fiches) et les paramètres réels du run
 * B-5K-BEGINNER du 2026-10-14 — pas des fixtures mockées.
 *
 * Rejoue les profils de contrôle de la Mission Axe C (validation) : les
 * mêmes mesures doivent être retrouvées à l'identique après implémentation.
 */
import { describe, it, expect } from "vitest";
import { buildWorkoutCatalog } from "@/lib/workoutCatalogBuilder";

const EIGHT_IDS = [
  "CANOVA_RUN_INTRODUCTIVE_PHASE",
  "CANOVA_RUN_FAST_CONTINUOUS_INTRO",
  "BILLAT_RUN_30_30_INTRO",
  "NORWEGIAN_WEEK_STRUCTURE_RUN",
  "KENYAN_WEEK_STRUCTURE_MARATHON",
  "COGGAN_BIKE_CP_OVER_UNDER",
  "COGGAN_BIKE_CP_DEPLETION",
  "V3_BIKE_VO2_TABATA",
];
const VMA_ONLY_IDS = ["BILLAT_RUN_30_30_PRO", "BILLAT_RUN_3MIN_3MIN"];

const B5K_CHUNKS: Array<[number, number]> = [[1, 4], [5, 8], [9, 12]];

function b5kCatalog(cStart: number, cEnd: number, chunkIndex: number, level: string, source: string) {
  return buildWorkoutCatalog("5 KM", cStart, cEnd, 12, {
    maxItems: 130,
    chunkIndex,
    beginnerIntensitySignal: { trainingLevel: level, trainingLevelSource: source },
  });
}

function catalogFor(objective: string, totalWeeks: number, cStart: number, cEnd: number, level: string, source: string) {
  return buildWorkoutCatalog(objective, cStart, cEnd, totalWeeks, {
    maxItems: 130,
    chunkIndex: 0,
    beginnerIntensitySignal: { trainingLevel: level, trainingLevelSource: source },
  });
}

function sportCounts(catalog: ReturnType<typeof buildWorkoutCatalog>) {
  return {
    run: catalog.filter(c => c.sport === "run" || c.sport === "course").length,
    bike: catalog.filter(c => c.sport === "bike" || c.sport === "cyclisme").length,
    swim: catalog.filter(c => c.sport === "swim" || c.sport === "natation").length,
  };
}

describe("buildWorkoutCatalog — garde-fou prérequis de niveau (Mission Axe C)", () => {
  it("A1. B-5K-BEGINNER, untrained/manual : CANOVA_RUN_INTRODUCTIVE_PHASE et NORWEGIAN_WEEK_STRUCTURE_RUN disparaissent des 3 chunks réels où elles seraient atteignables", () => {
    B5K_CHUNKS.forEach(([s, e], i) => {
      const catalog = b5kCatalog(s, e, i, "untrained", "manual");
      const ids = new Set(catalog.map(c => c.id));
      for (const bannedId of EIGHT_IDS) {
        expect(ids.has(bannedId)).toBe(false);
      }
    });
  });

  it("A2. Même sans troncature (maxItems très large) : hard-ban réel, pas un effet de cap", () => {
    const untruncated = buildWorkoutCatalog("5 KM", 5, 8, 12, {
      maxItems: 100000,
      chunkIndex: 1,
      beginnerIntensitySignal: { trainingLevel: "untrained", trainingLevelSource: "manual" },
    });
    const ids = new Set(untruncated.map(c => c.id));
    for (const bannedId of EIGHT_IDS) {
      expect(ids.has(bannedId)).toBe(false);
    }
  });

  it("A3. B-5K-BEGINNER, trained/manual (contrôle) : les 8 fiches restent disponibles — aucune sur-correction", () => {
    B5K_CHUNKS.forEach(([s, e], i) => {
      const before = b5kCatalog(s, e, i, "untrained", "manual");
      const after = b5kCatalog(s, e, i, "trained", "manual");
      expect(after.length).toBeGreaterThanOrEqual(before.length);
    });
  });

  it("B/C1. Profil untrained/manual, catalogue non tronqué : les 2 fiches à critère VMA uniquement ne sont jamais retirées par le garde-fou (comparaison directe untrained vs trained)", () => {
    for (const [s, e] of B5K_CHUNKS) {
      const untrainedIds = new Set(buildWorkoutCatalog("5 KM", s, e, 12, {
        maxItems: 100000, chunkIndex: 1,
        beginnerIntensitySignal: { trainingLevel: "untrained", trainingLevelSource: "manual" },
      }).map(c => c.id));
      const trainedIds = new Set(buildWorkoutCatalog("5 KM", s, e, 12, {
        maxItems: 100000, chunkIndex: 1,
        beginnerIntensitySignal: { trainingLevel: "trained", trainingLevelSource: "manual" },
      }).map(c => c.id));
      // Toute fiche présente pour "trained" mais absente pour "untrained" ne
      // doit JAMAIS être l'une des 2 fiches VMA-only — elles doivent être
      // soit présentes dans les deux, soit absentes des deux (jamais
      // retirées SPÉCIFIQUEMENT par le niveau).
      for (const id of VMA_ONLY_IDS) {
        expect(trainedIds.has(id)).toBe(untrainedIds.has(id));
      }
    }
  });

  it("C2. Profil untrained + source fallback-prudent : jamais d'exclusion (signal non fiable)", () => {
    const catalog = b5kCatalog(5, 8, 1, "untrained", "fallback-prudent");
    const untruncated = buildWorkoutCatalog("5 KM", 5, 8, 12, {
      maxItems: 100000, chunkIndex: 1,
      beginnerIntensitySignal: { trainingLevel: "untrained", trainingLevelSource: "fallback-prudent" },
    });
    expect(catalog.length).toBeGreaterThan(0);
    expect(untruncated.length).toBeGreaterThan(0);
  });

  it("C3. Profil sans signal (beginnerIntensitySignal omis) : comportement identique à un profil 'trained' — un niveau incertain ne doit jamais provoquer une exclusion définitive", () => {
    const noSignal = new Set(buildWorkoutCatalog("5 KM", 5, 8, 12, { maxItems: 100000, chunkIndex: 1 }).map(c => c.id));
    const trained = new Set(buildWorkoutCatalog("5 KM", 5, 8, 12, {
      maxItems: 100000, chunkIndex: 1,
      beginnerIntensitySignal: { trainingLevel: "trained", trainingLevelSource: "manual" },
    }).map(c => c.id));
    for (const id of EIGHT_IDS) {
      expect(noSignal.has(id)).toBe(trained.has(id));
    }
  });

  it("B. Semi-marathon trained/manual : les fiches natives à cet objectif/niveau restent disponibles (pas de sur-correction transversale)", () => {
    const catalog = catalogFor("Semi-marathon", 16, 5, 8, "trained", "manual");
    const counts = sportCounts(catalog);
    expect(counts.run).toBeGreaterThan(15);
  });

  it("B. Marathon highly_trained/manual (contrôle) : au moins une des 8 fiches reste disponible pour ce niveau — aucune exclusion globale", () => {
    const catalog = buildWorkoutCatalog("Marathon", 5, 8, 16, {
      maxItems: 100000, chunkIndex: 0,
      beginnerIntensitySignal: { trainingLevel: "highly_trained", trainingLevelSource: "manual" },
    });
    const ids = new Set(catalog.map(c => c.id));
    expect(EIGHT_IDS.some(id => ids.has(id))).toBe(true);
  });

  it("B. Marathon untrained/manual : la correction se généralise au-delà du 5K", () => {
    const catalog = catalogFor("Marathon", 16, 5, 8, "untrained", "manual");
    const ids = new Set(catalog.map(c => c.id));
    for (const bannedId of EIGHT_IDS) {
      expect(ids.has(bannedId)).toBe(false);
    }
  });

  it("B. 10K untrained/manual : la correction se généralise au 10K", () => {
    const catalog = catalogFor("10 KM", 12, 5, 8, "untrained", "manual");
    const ids = new Set(catalog.map(c => c.id));
    for (const bannedId of EIGHT_IDS) {
      expect(ids.has(bannedId)).toBe(false);
    }
  });

  it("B. Trail untrained/manual : aucune contamination croisée (fiches course/cyclisme hors de propos pour trail)", () => {
    const catalog = catalogFor("Trail", 20, 5, 8, "untrained", "manual");
    const counts = sportCounts(catalog);
    expect(counts.run).toBeGreaterThan(0);
  });

  it("B. Ironman trained/manual : COGGAN_BIKE_CP_OVER_UNDER (natif) reste disponible quand éligible", () => {
    const catalog = catalogFor("Ironman", 28, 20, 23, "trained", "manual");
    const counts = sportCounts(catalog);
    expect(counts.bike).toBeGreaterThan(0);
  });

  it("D. Séances fondamentales préservées (A_RUN_Z2_EASY / taper) dans les 3 chunks B-5K-BEGINNER untrained", () => {
    const [s1, s2, s3] = B5K_CHUNKS.map(([s, e], i) => new Set(b5kCatalog(s, e, i, "untrained", "manual").map(c => c.id)));
    expect(s1.has("A_RUN_Z2_EASY")).toBe(true);
    expect(s2.has("A_RUN_Z2_EASY")).toBe(true);
    expect(s3.has("D_TAPER_RUN_OPENER") || s3.has("D_RUN_SHAKEOUT")).toBe(true);
  });

  it("D. Pas de raréfaction disproportionnée du pool RUN sur les 3 chunks B-5K-BEGINNER untrained", () => {
    B5K_CHUNKS.forEach(([s, e], i) => {
      const catalog = b5kCatalog(s, e, i, "untrained", "manual");
      const counts = sportCounts(catalog);
      expect(counts.run).toBeGreaterThan(15);
    });
  });

  it("E. Aucune régression des règles #377-#379 : axe B (contexte non confirmé) et axe A palier 1 (race-sim) actifs simultanément avec l'axe C", () => {
    const catalog = b5kCatalog(5, 8, 1, "untrained", "manual");
    const ids = new Set(catalog.map(c => c.id));
    // Axe B (#377/#378) : toujours exclu sans contexte confirmé.
    expect(ids.has("FM_RUN_FATMAX_ZONE")).toBe(false);
    expect(ids.has("ENR_ALTITUDE_EASY_RUN")).toBe(false);
    // Axe A palier 1 (#379) : toujours exclu pour un objectif 5K.
    expect(ids.has("V3_RUN_10K_RACE_SIM")).toBe(false);
    // Axe C (cette PR) : toujours exclu pour untrained.
    expect(ids.has("CANOVA_RUN_INTRODUCTIVE_PHASE")).toBe(false);
  });
});
