import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { inferPhaseFromWeek } from "./jsonPlanHandler.ts";
import { buildStructuredDiagnosticBlock, computeMultiObjectiveSegments } from "./promptHelpers.ts";
const cfg={objective:"10K",ambition:"age_group",weeksAvailable:12,fondationDurationWeeks:4,identifiedLimitersRaw:["VLamax","FatMax","VMA","VO2max","Wprime"],planStartDate:"2026-10-26",raceGoals:[{objective:"10K",priority:"A",raceDate:"2027-01-17"},{objective:"10K",priority:"B",raceDate:"2026-12-19"}]};
Deno.test("10K light S4 matches the four-week Foundation already prescribed",()=>{
 assertEquals(computeMultiObjectiveSegments(cfg,12),null);
 assertStringIncludes(buildStructuredDiagnosticBlock(cfg,12),"Bloc Fondation + Intensité : S1-S4");
 assertEquals(inferPhaseFromWeek(4,12,"10K",cfg),"base");
});

Deno.test("all twelve calculated phases agree with the existing prompt bounds",()=>{
 assertEquals(Array.from({length:12},(_,i)=>inferPhaseFromWeek(i+1,12,"10K",cfg)),
  [...Array(4).fill("base"),...Array(5).fill("build"),"peak","peak","taper"]);
});
