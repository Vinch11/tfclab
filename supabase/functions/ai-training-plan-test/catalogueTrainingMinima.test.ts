import { assertEquals, assertStrictEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { catalogueTrainingMinimaForWeek } from "../_shared/catalogueTrainingMinima.ts";
const q={run:{min:4,max:4},strength:{min:0,max:1},totalSessions:{min:4,max:5}};
const cfg={objective:"10K",planStartDate:"2026-10-26",raceGoals:[{objective:"10K",raceDate:"2027-01-17"},{objective:"10K",raceDate:"2026-12-19"}]};
Deno.test("coverage excludes only the declared custom event, final quotas remain intact",()=>{
 assertEquals(catalogueTrainingMinimaForWeek(q,cfg,12).run.min,3);
 assertEquals(catalogueTrainingMinimaForWeek(q,cfg,8).run.min,3);
 assertEquals(catalogueTrainingMinimaForWeek(q,{...cfg,globalWeekOffset:8},4).run.min,3);
 assertEquals(q.run.min,4);
 assertEquals(catalogueTrainingMinimaForWeek(q,cfg,12).totalSessions,q.totalSessions);
});
Deno.test("no inferred race, no duplicate subtraction, no invalid date or cross-discipline waiver",()=>{
 assertStrictEquals(catalogueTrainingMinimaForWeek(q,cfg,11),q);
 assertStrictEquals(catalogueTrainingMinimaForWeek(q,{...cfg,raceGoals:[]},12),q);
 assertStrictEquals(catalogueTrainingMinimaForWeek(q,{...cfg,planStartDate:undefined},12),q);
 assertStrictEquals(catalogueTrainingMinimaForWeek(q,{...cfg,objective:"703"},12),q);
 assertStrictEquals(catalogueTrainingMinimaForWeek(q,{...cfg,raceGoals:[{objective:"10K",raceDate:"2027-02-31"}]},12),q);
 assertEquals(catalogueTrainingMinimaForWeek(q,{...cfg,raceGoals:[cfg.raceGoals[0],cfg.raceGoals[0]]},12).run.min,3);
});
