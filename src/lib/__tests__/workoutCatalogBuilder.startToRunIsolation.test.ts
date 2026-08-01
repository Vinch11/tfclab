import { describe, it, expect } from "vitest";
import { buildWorkoutCatalog } from "@/lib/workoutCatalogBuilder";
describe("s2r", () => {
  it("catalogue debutant isole", () => {
    const list: any = buildWorkoutCatalog("StartToRun", 1, 6, 12);
    console.log("N=", list.length, list.map((e: any) => e.id).join(","));
    expect(list.length).toBeGreaterThan(5);
    expect(list.every((e: any) => e.id.startsWith("S2R_"))).toBe(true);
  });
  it("10K ne recoit pas de fiches S2R", () => {
    const list: any = buildWorkoutCatalog("10K", 1, 6, 12);
    expect(list.some((e: any) => e.id.startsWith("S2R_"))).toBe(false);
  });
});
