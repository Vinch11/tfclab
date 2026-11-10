import { it, expect } from "vitest";
import { terrainReasons } from "../../../../supabase/functions/_shared/terrainPolicy";
const mountain = { id: "A_TR_SL_MONTAGNE_BASE", title: "Sortie longue montagne", structure: "Montagne", when: "Base, week-end", tags: ["montagne"], dPlusTargetM: { min: 800, max: 1500 } };
it("flat terrain refuses mountain on a weekday, but retains declared weekend expedition", () => {
  expect(terrainReasons(mountain, "plat", "mardi")).toEqual(["terrain_weekday_unavailable"]);
  expect(terrainReasons(mountain, "plat", "samedi")).toEqual([]);
  expect(terrainReasons(mountain, "plat")).toEqual([]);
});
it("urban treadmill compensation is not mistaken for natural mountain access", () => {
  expect(terrainReasons({ ...mountain, id: "URBAN_TAPIS", title: "Tapis incliné", structure: "Simulation montagne sur tapis", tags: ["urbain"] }, "plat", "mardi")).toEqual([]);
});
it("mountain access permits the mountain card", () => {
  expect(terrainReasons(mountain, "montagne", "mardi")).toEqual([]);
});