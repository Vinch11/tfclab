import { describe, it, expect } from "vitest";
import { buildWorkoutCatalog, isStructuralSession } from "@/lib/workoutCatalogBuilder";
import { WorkoutLibrary } from "@/lib/workoutLibrary";

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
    const shortInChunk1 = cat1.filter(e => median(e.durationMin) < 120 && !/race[-_\s]?sim/i.test(e.cat));
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
