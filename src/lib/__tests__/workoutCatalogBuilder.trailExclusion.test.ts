import { describe, it, expect } from "vitest";
import { buildWorkoutCatalog } from "@/lib/workoutCatalogBuilder";
import { isTrailWorkout } from "@/lib/plan/trailMarkers";

const TRAIL_ID_RX = /^([A-D]_TR(?:50)?_|EXPE_HORS_VILLE_|V3_TRAIL_|HEDGEHOG_|URBAN_|TRAIL_)/i;

function hasTrailIds(catalog: { id: string; sport: string }[]): string[] {
  return catalog.filter(e => TRAIL_ID_RX.test(e.id)).map(e => e.id);
}

describe("buildWorkoutCatalog — trail exclusion for non-trail objectives", () => {
  it("70.3 catalog contains zero trail IDs", () => {
    const cat = buildWorkoutCatalog("70.3", 1, 12, 12, {
      maxItems: 80,
      excludeIdPatterns: [
        /^HEDGEHOG_/i, /_HEDGEHOG_/i, /^URBAN_/i, /^TRAIL_/i, /_TRAIL_/i,
        /^[A-D]_TR(?:50)?_/i, /^EXPE_HORS_VILLE_/i, /^V3_TRAIL_/i,
      ],
      excludeTags: ["trail", "trail-urban"],
    });
    expect(hasTrailIds(cat)).toEqual([]);
  });

  it("semi-marathon catalog contains zero trail IDs", () => {
    const cat = buildWorkoutCatalog("semi-marathon", 1, 12, 12, {
      maxItems: 80,
      excludeIdPatterns: [
        /^HEDGEHOG_/i, /_HEDGEHOG_/i, /^URBAN_/i, /^TRAIL_/i, /_TRAIL_/i,
        /^[A-D]_TR(?:50)?_/i, /^EXPE_HORS_VILLE_/i, /^V3_TRAIL_/i,
      ],
      excludeTags: ["trail", "trail-urban"],
    });
    expect(hasTrailIds(cat)).toEqual([]);
  });

  it("trail_ultra catalog CAN contain trail IDs (sanity)", () => {
    const cat = buildWorkoutCatalog("trail ultra 100km", 1, 12, 12, { maxItems: 80 });
    expect(hasTrailIds(cat).length).toBeGreaterThan(0);
  });

  it("70.3 catalog keeps a viable course pool (≥ 25)", () => {
    const cat = buildWorkoutCatalog("70.3", 1, 12, 12, {
      maxItems: 80,
      excludeIdPatterns: [
        /^HEDGEHOG_/i, /_HEDGEHOG_/i, /^URBAN_/i, /^TRAIL_/i, /_TRAIL_/i,
        /^[A-D]_TR(?:50)?_/i, /^EXPE_HORS_VILLE_/i, /^V3_TRAIL_/i,
      ],
      excludeTags: ["trail", "trail-urban"],
    });
    const courseCount = cat.filter(e => e.sport === "course").length;
    expect(courseCount).toBeGreaterThanOrEqual(15); // pool minimum viable après exclusions
  });

  it("bannit ECONOMY_TRAIL_DESCENT_TECH d'un catalogue 70.3 (forme _TRAIL_)", () => {
    const cat = buildWorkoutCatalog("IRONMAN 70.3", 1, 4, 12, {
      maxItems: 130,
      sportFilter: ["swim", "bike", "run", "brick", "strength"],
    });
    expect(cat.some(e => e.id === "ECONOMY_TRAIL_DESCENT_TECH")).toBe(false);
  });

  it("isTrailWorkout couvre sport=trail sans tag, ID _TRAIL_, tag Trail casse mixte", () => {
    expect(isTrailWorkout({ id: "X", sport: "trail", tags: [] })).toBe(true);
    expect(isTrailWorkout({ id: "ECONOMY_TRAIL_DESCENT_TECH", sport: "run", tags: [] })).toBe(true);
    expect(isTrailWorkout({ id: "X", sport: "run", tags: ["Trail"] })).toBe(true);
    expect(isTrailWorkout({ id: "LYDIARD_RUN_TRACK_VMA", sport: "run", tags: ["vma"] })).toBe(false);
  });
});
