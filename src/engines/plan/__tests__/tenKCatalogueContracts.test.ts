import { describe, it, expect } from "vitest";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import { buildRepairWorkoutMetadata } from "@/lib/plan/repairCatalogMetadata";
import { checkSessionCatalogue, catalogueForWeek } from "../../../../supabase/functions/_shared/sessionCatalogueContract";
import { computeWeekQuotaEntry } from "../sessionSizingMatrix";
import { buildWeeklySlotLayout } from "../weeklySlotLayout";
const easy = () => buildRepairWorkoutMetadata(WorkoutLibrary.find(w => w.id === "A_RUN_Z2_EASY")!);
describe("10K P0 demonstrated catalogue contracts", () => {
 it("totalSessions is a global count, never a missing sport", () => {
  const q=computeWeekQuotaEntry("10K","age_group",4,"load",false)!;
  const pool=[0,1,2,3,4].map(i=>({...easy(),id:`EASY_${i}`}));
  pool.push({...easy(),id:"STRENGTH",sport:"strength"});
  expect(catalogueForWeek(pool,{phase:"base",objective:"10K"},q.quota).missingSports).toEqual([]);
 });
 it("same Z2 content remains compatible after a descriptive title change", () => {
  const m=easy();
  const result=checkSessionCatalogue({catalogId:m.id,title:"Endurance fondamentale Z2",sport:"run",custom:false,durationMin:35,zones:["Z1","Z2"],details:m.structure},{phase:"base",objective:"10K",catalog:[m]});
  expect(result.errors).toEqual([]);
 });
 it("the conversational Seiler test does not turn a long aerobic run into a test session", () => {
  const m=buildRepairWorkoutMetadata(WorkoutLibrary.find(w=>w.id==="SEILER_RUN_Z1_EASY_LONG")!);
  expect(m.intentFamily).toBe("endurance_fondamentale");
 });
 it("does not impose an optional bike slot absent from the compatible catalogue", () => {
  const q=computeWeekQuotaEntry("10K","age_group",4,"load",false)!;
  const layout=buildWeeklySlotLayout(q.quota,q.floors,"load",{availableSports:new Set(["run","strength"])});
  expect(layout.days.flatMap(d=>d.slots).filter(s=>s.sport==="bike")).toEqual([]);
  expect(layout.days.flatMap(d=>d.slots).filter(s=>s.sport==="run")).toHaveLength(4);
 });
});

import { buildPeriodizationCalendar } from "@/lib/plan/periodizationCalendar";
import { normalizeWeeksAndPhases } from "../normalizeWeeksPhases";
import { inferWeekType } from "../sessionSizingMatrix";
const fixture = {
 objective: "10K", ambition: "age_group", weeksAvailable: 12, fondationDurationWeeks: 4,
 identifiedLimitersRaw: ["VLamax", "FatMax", "VMA", "VO2max", "Wprime"],
 planStartDate: "2026-10-26", raceGoals: [
  { objective: "10K", priority: "A" as const, raceDate: "2027-01-17" },
  { objective: "10K", priority: "B" as const, raceDate: "2026-12-19" },
 ],
};
describe("10K calendar and preserved sporting controls", () => {
 it("carries the calculated twelve-week calendar through normalization, without replacing limiter priorities", () => {
  const prior = structuredClone(fixture);
  const calendar = buildPeriodizationCalendar(fixture)!;
  expect(Object.values(calendar)).toEqual([...Array(4).fill("base"), ...Array(5).fill("build"), "peak", "peak", "taper"]);
  const plan = { weeks: Array.from({length:12},(_,i)=>({weekNumber:i+1,phase:"build",sessions:[{phase:"build"}]})),
   weeklyQuotas: Object.fromEntries(Object.entries(calendar).map(([w,phase])=>[w,{phase}])),
   phases:[{name:"Build",weeks:"S1-S12"}] };
  normalizeWeeksAndPhases(plan, { weeksAvailable:12 });
  expect(plan.weeks.map(w=>w.phase)).toEqual(Object.values(calendar));
  expect(plan.weeks.map(w=>w.sessions[0].phase)).toEqual(Object.values(calendar));
  expect(fixture).toEqual(prior);
  const window = buildPeriodizationCalendar({...fixture,weeksAvailable:4,globalTotalWeeks:12,globalWeekOffset:4});
  expect(Object.values(window!)).toEqual(Object.values(calendar).slice(4,8));
 });
 it("retains mandatory missing-sport warnings and strict phase filtering", () => {
  const m=easy();
  expect(catalogueForWeek([m],{phase:"base",objective:"10K"},{swim:{min:1},totalSessions:{min:5}}).missingSports).toEqual(["swim"]);
  expect(catalogueForWeek([{...m,phases:["build","peak"]}],{phase:"base",objective:"10K"}).eligible).toEqual([]);
 });
 it.each([34,91])("still refuses an out-of-range Z2 duration %s", durationMin=>{
  const m=easy();
  expect(checkSessionCatalogue({catalogId:m.id,title:"Endurance fondamentale Z2",sport:"run",durationMin,zones:["Z2"]},{phase:"base",objective:"10K",catalog:[m]}).errors).toContain("catalogue_duration");
 });
 it("retains true intensity and physiological intent refusals",()=>{
  const m=easy();
  expect(checkSessionCatalogue({catalogId:m.id,title:"Endurance fondamentale Z2",sport:"run",durationMin:40,zones:["Z3"]},{phase:"base",objective:"10K",catalog:[m]}).errors).toContain("catalogue_intensity_exceeded");
  expect(checkSessionCatalogue({catalogId:m.id,title:"Technique éducatifs",sport:"run",durationMin:40,zones:["Z2"]},{phase:"base",objective:"10K",catalog:[m]}).errors).toContain("catalogue_physiological_intent");
 });
 it.each(["Semi-Marathon","Marathon","Trail","70.3","Ironman"])("keeps a complete calendar and required sports for %s", objective=>{
  const calendar=buildPeriodizationCalendar({...fixture,objective,raceGoals:undefined})!;
  expect(Object.keys(calendar)).toHaveLength(12);
  expect(calendar[12]).toBe("taper");
  const entry=computeWeekQuotaEntry(objective,"age_group",4,"load",false);
  if (!entry) return;
  const layout=buildWeeklySlotLayout(entry.quota,entry.floors,"load",{availableSports:new Set(["run","strength"])});
  const previous=buildWeeklySlotLayout(entry.quota,entry.floors,"load");
  for(const sport of ["run","bike","swim","brick"] as const) {
   if(entry.quota[sport].min>0) expect(layout.days.flatMap(d=>d.slots).filter(s=>s.sport===sport).length).toEqual(previous.days.flatMap(d=>d.slots).filter(s=>s.sport===sport).length);
  }
 });
 it("keeps recovery cadence independent of phase",()=>{
  expect(Array.from({length:12},(_,i)=>inferWeekType(i+1,12,"10K",50))).toEqual([
   "load","load","recovery","load","load","recovery","load","load","recovery","load","taper","race"
  ]);
 });
});

it("audits all twelve quotas and preserves recovery and mandatory sports",()=>{
 const audit=Array.from({length:12},(_,i)=>{
  const week=i+1, weekType=inferWeekType(week,12,"10K",50);
  const entry=computeWeekQuotaEntry("10K","age_group",4,weekType,false)!;
  const layout=buildWeeklySlotLayout(entry.quota,entry.floors,weekType,{availableSports:new Set(["run","strength"])});
  const slots=layout.days.flatMap(d=>d.slots);
  expect(slots.filter(s=>s.sport==="bike")).toHaveLength(0);
  return {week,phase:buildPeriodizationCalendar(fixture)![week],weekType,run:entry.quota.run,total:entry.quota.totalSessions,slots:slots.length};
 });
 expect(audit).toHaveLength(12);
});
it("retains coherent limiter-specific recap blocks",()=>{
 const phases=[{name:"Fondation",weeks:"S1-S4",objective:"Priorité VLamax"},{name:"Chantier",weeks:"S5-S7",objective:"FatMax"},{name:"Consolidation",weeks:"S8-S9",objective:"VLamax"},{name:"Spécifique",weeks:"S10-S11"},{name:"Affûtage",weeks:"S12-S12"}];
 const calendar=buildPeriodizationCalendar(fixture)!;
 const plan={weeks:Array.from({length:12},(_,i)=>({weekNumber:i+1,phase:"?",sessions:[{phase:"?"}]})),phases:structuredClone(phases),weeklyQuotas:Object.fromEntries(Object.entries(calendar).map(([w,phase])=>[w,{phase}]))};
 normalizeWeeksAndPhases(plan,{weeksAvailable:12});
 expect(plan.phases).toEqual(phases);
});

import { buildWorkoutCatalog } from "@/lib/workoutCatalogBuilder";
it("replays the actual catalogue builder for S1–4 with both existing recovery cadences",()=>{
 const catalog=buildWorkoutCatalog("10K",1,4,12,{strictPhaseFilter:true,phaseOverride:["base"],maxItems:130,
  sportFilter:["course","run","strength","renforcement"],limiters:fixture.identifiedLimitersRaw,
  beginnerIntensitySignal:{trainingLevel:"light",trainingLevelSource:"manual",weeklyHours:4}}).map(e=>e.repairMetadata);
 for(const age of [32,50]) for(let week=1;week<=4;week++) {
  const weekType=inferWeekType(week,12,"10K",age);
  const quota=computeWeekQuotaEntry("10K","age_group",4,weekType,false)!;
  const {eligible,missingSports}=catalogueForWeek(catalog,{phase:"base",objective:"10K",weekType},quota.quota);
  expect(eligible.length).toBeGreaterThan(0);
  expect(missingSports).toEqual([]);
 }
});
