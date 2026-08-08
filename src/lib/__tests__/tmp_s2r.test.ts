import { describe, it } from "vitest";
import { buildWorkoutCatalog } from "@/lib/workoutCatalogBuilder";
describe("s2rlabel", () => {
  it("label", () => {
    const l:any=buildWorkoutCatalog("Start to Run (débutant · marche-course)",1,4,12,{maxItems:130,chunkIndex:0});
    console.log("LABEL N=",l.length,l.slice(0,12).map((e:any)=>e.id).join(","));
  });
});
