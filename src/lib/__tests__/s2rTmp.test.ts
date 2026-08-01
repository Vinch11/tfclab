import { describe, it, expect } from "vitest";
import { buildWorkoutCatalog } from "@/lib/workoutCatalogBuilder";
describe("s2r", () => {
  it("catalogue debutant isole", () => {
    const c: any = buildWorkoutCatalog("StartToRun" as any, ["base","build"] as any, 40);
    const list = Array.isArray(c) ? c : c.entries ?? c.catalog;
    console.log("N=", list.length, list.map((e: any) => e.id).join(","));
    expect(list.length).toBeGreaterThan(5);
    expect(list.every((e: any) => e.id.startsWith("S2R_"))).toBe(true);
  });
});
