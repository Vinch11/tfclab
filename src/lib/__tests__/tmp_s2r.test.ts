import { describe, it } from "vitest";
import { buildWorkoutCatalog } from "@/lib/workoutCatalogBuilder";
describe("s2r12", () => {
  it("phases", () => {
    const ranges=[[1,5],[3,8],[7,11],[10,12]];
    ranges.forEach(([a,b],i)=>{
      const l:any=buildWorkoutCatalog("StartToRun",a,b,12,{maxItems:80,chunkIndex:i});
      console.log("RANGE",a,b,"N=",l.length,l.map((e:any)=>e.id).join(","));
    });
  });
});
