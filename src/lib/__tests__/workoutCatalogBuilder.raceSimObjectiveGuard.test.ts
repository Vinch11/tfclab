/**
 * Mission 2D (palier 1, consigne coach) : étend au catalogue injecté à
 * Gemini le garde-fou objectif/distance pour les 5 fiches *_RACE_SIM dont
 * l'incompatibilité avec un objectif 5K/10K a été démontrée par simulation
 * sur le catalogue réel (cf. MISSION2D_VALIDATION_FINALE.md §1-2) —
 * notamment `V3_RUN_10K_RACE_SIM`, mesurée au rang n°1 (meilleur score) sur
 * 2 des 3 chunks réels de B-5K-BEGINNER AVANT ce correctif.
 *
 * Utilise le VRAI catalogue (`@/lib/workoutLibrary`, 920 fiches) et les
 * PARAMÈTRES RÉELS du run B-5K-BEGINNER du 2026-10-14 (objectif "5 KM",
 * 12 semaines, 3 chunks S1-S4/S5-S8/S9-S12, trainingLevel untrained/manual) —
 * pas des fixtures mockées, conformément à la consigne coach.
 */
import { describe, it, expect } from "vitest";
import { buildWorkoutCatalog } from "@/lib/workoutCatalogBuilder";

const FIVE_K_EXCLUDED = [
  "V3_RUN_10K_RACE_SIM",
  "ENR_RACE_SIM_MARATHON",
  "V3_RACESIM_MARATHON",
  "ENR_RACE_SIM_SEMI",
  "V3_RACESIM_SEMI",
];

// Mêmes 3 chunks que le run réel B-5K-BEGINNER du 2026-10-14 (cf. rapport
// Mission 2D §2) : S1-S4, S5-S8, S9-S12 sur un plan de 12 semaines.
const B5K_CHUNKS: Array<[number, number]> = [[1, 4], [5, 8], [9, 12]];

function b5kCatalog(cStart: number, cEnd: number, chunkIndex: number) {
  return buildWorkoutCatalog("5 KM", cStart, cEnd, 12, {
    maxItems: 130,
    chunkIndex,
    beginnerIntensitySignal: { trainingLevel: "untrained", trainingLevelSource: "manual" },
  });
}

function catalogFor(objective: string, totalWeeks: number, cStart: number, cEnd: number) {
  return buildWorkoutCatalog(objective, cStart, cEnd, totalWeeks, { maxItems: 130, chunkIndex: 0 });
}

describe("buildWorkoutCatalog — garde-fou objectif/distance RACE-SIM (Mission 2D, palier 1)", () => {
  it("1. B-5K-BEGINNER (3 chunks réels) : les 5 fiches sont absentes du catalogue réellement transmis à Gemini", () => {
    B5K_CHUNKS.forEach(([s, e], i) => {
      const catalog = b5kCatalog(s, e, i);
      const ids = new Set(catalog.map(c => c.id));
      for (const bannedId of FIVE_K_EXCLUDED) {
        expect(ids.has(bannedId)).toBe(false);
      }
    });
  });

  it("2. Même sans troncature (maxItems très large) : les 5 fiches n'apparaissent dans AUCUN rang — c'est un hard-ban, pas un effet de troncature (V3_RUN_10K_RACE_SIM était rang 1/226 et 1/205 AVANT ce correctif)", () => {
    const untruncated = buildWorkoutCatalog("5 KM", 5, 8, 12, {
      maxItems: 100000,
      chunkIndex: 1,
      beginnerIntensitySignal: { trainingLevel: "untrained", trainingLevelSource: "manual" },
    });
    const ids = new Set(untruncated.map(c => c.id));
    for (const bannedId of FIVE_K_EXCLUDED) {
      expect(ids.has(bannedId)).toBe(false);
    }
  });

  it("3. Objectif 10K : V3_RUN_10K_RACE_SIM (native) reste disponible ; les 4 fiches semi/marathon restent exclues", () => {
    const catalog = catalogFor("10 KM", 12, 5, 8);
    const ids = new Set(catalog.map(c => c.id));
    expect(ids.has("V3_RUN_10K_RACE_SIM")).toBe(true);
    for (const bannedId of ["ENR_RACE_SIM_MARATHON", "V3_RACESIM_MARATHON", "ENR_RACE_SIM_SEMI", "V3_RACESIM_SEMI"]) {
      expect(ids.has(bannedId)).toBe(false);
    }
  });

  it("4. Objectif semi-marathon : les fiches semi-RACE_SIM (natives) restent disponibles — aucune régression", () => {
    const catalog = catalogFor("Semi-marathon", 16, 5, 8);
    const ids = new Set(catalog.map(c => c.id));
    expect(ids.has("V3_RACESIM_SEMI") || ids.has("ENR_RACE_SIM_SEMI")).toBe(true);
  });

  it("5. Objectif marathon : les fiches marathon-RACE_SIM (natives) restent disponibles, ET les fiches semi-RACE_SIM ne sont PAS exclues (palier 2 pénalité, non implémenté ici — pas une exclusion)", () => {
    const catalog = catalogFor("Marathon", 16, 5, 8);
    const ids = new Set(catalog.map(c => c.id));
    expect(ids.has("V3_RACESIM_MARATHON") || ids.has("ENR_RACE_SIM_MARATHON")).toBe(true);
    // Pas d'assertion stricte "doit être présent" pour semi (scoring normal,
    // aucune garantie de rang) — seul le fait qu'elle ne soit jamais
    // hard-bannie pour marathon est vérifié unitairement dans
    // raceSimCompatibility.test.ts.
  });

  it("6. Séances fondamentales préservées dans les 3 chunks réels B-5K-BEGINNER (A_RUN_Z2_EASY en S1-S4/S5-S8, taper S9-S12 — cf. rapport §2/§5)", () => {
    // S1-S4/S5-S8 : A_RUN_Z2_EASY (endurance fondamentale) confirmée présente
    // au rapport. S9-S12 (taper) : le rapport nomme explicitement
    // D_TAPER_RUN_OPENER/D_RUN_SHAKEOUT comme fondamentales de ce chunk —
    // A_RUN_Z2_EASY y est naturellement moins prioritaire (affûtage), ce qui
    // est un comportement PRÉEXISTANT, sans rapport avec ce correctif.
    const [s1, s2, s3] = B5K_CHUNKS.map(([s, e], i) => new Set(b5kCatalog(s, e, i).map(c => c.id)));
    expect(s1.has("A_RUN_Z2_EASY")).toBe(true);
    expect(s2.has("A_RUN_Z2_EASY")).toBe(true);
    expect(s3.has("D_TAPER_RUN_OPENER") || s3.has("D_RUN_SHAKEOUT")).toBe(true);
  });

  it("7. Pas de raréfaction du pool RUN sur les 3 chunks réels B-5K-BEGINNER (retrait de 5 IDs nominatifs sur 920, jamais un effondrement)", () => {
    B5K_CHUNKS.forEach(([s, e], i) => {
      const catalog = b5kCatalog(s, e, i);
      const runCount = catalog.filter(c => c.sport === "run" || c.sport === "course").length;
      expect(runCount).toBeGreaterThan(15);
    });
  });

  it("8. Aucune régression du filtrage existant sport/phase/objectif sur 10K/semi/marathon (fiches spécifiques toujours présentes)", () => {
    const tenK = catalogFor("10 KM", 12, 5, 8);
    expect([...new Set(tenK.map(c => c.id))].some(id => /10K/i.test(id))).toBe(true);
    const semi = catalogFor("Semi-marathon", 16, 5, 8);
    expect([...new Set(semi.map(c => c.id))].some(id => /SEMI/i.test(id))).toBe(true);
    const marathon = catalogFor("Marathon", 16, 5, 8);
    expect([...new Set(marathon.map(c => c.id))].some(id => /MARATHON/i.test(id))).toBe(true);
  });

  it("9. Couverture inchangée sur les 3 chunks réels B-5K-BEGINNER : le nombre total transmis reste du même ordre de grandeur (composition différente, pas un effondrement — cf. rapport §2, cap_raised_for_coverage)", () => {
    const counts = B5K_CHUNKS.map(([s, e], i) => b5kCatalog(s, e, i).length);
    for (const n of counts) {
      expect(n).toBeGreaterThan(130); // confirme le mécanisme cap_raised_for_coverage toujours actif, non altéré par ce correctif
    }
  });
});
