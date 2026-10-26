import { describe, it, expect } from "vitest";
import { computeWeekQuotaEntry, inferWeekType, taperWeeksForObjective } from "../sessionSizingMatrix";
import { buildWeeklySlotLayout } from "../weeklySlotLayout";
import { effectiveSessionQuota } from "../../../../supabase/functions/_shared/sessionQuotaAccounting";
const objectives=["5K","10K","Semi-Marathon","Marathon","703","IM"];
describe("contrat commun de semaine de course — données propres à chaque objectif",()=>{
 it.each(objectives)("%s : un total compatible avec ses propres minima, sans toucher aux fréquences",objective=>{
  const load=computeWeekQuotaEntry(objective,"age_group",30,"load",false)!;
  const race=computeWeekQuotaEntry(objective,"age_group",30,"race",false)!;
  for(const sport of ["swim","bike","run","brick"] as const) expect(race.quota[sport]).toEqual(load.quota[sport]);
  const mandatory=["swim","bike","run","brick","strength"].reduce((sum,sport)=>sum+race.quota[sport as "run"].min,0);
  expect(race.quota.totalSessions.max).toBeGreaterThanOrEqual(mandatory);
 });
 it.each(["703","IM"])("%s : le layout applique le même remplacement vélo/brick que le validateur",objective=>{
  const entry=computeWeekQuotaEntry(objective,"age_group",30,"race",false)!;
  const layout=buildWeeklySlotLayout(entry.quota,entry.floors,"race");
  const slots=layout.days.flatMap(d=>d.slots);
  const bricks=slots.filter(s=>s.sport==="brick").length;
  const effective=effectiveSessionQuota(entry.quota,bricks);
  expect(slots.filter(s=>s.sport==="bike").length).toBeLessThanOrEqual(effective.bike.max);
  expect(slots.length).toBeLessThanOrEqual(effective.totalSessions.max);
 });
});
import { buildPeriodizationCalendar } from "@/lib/plan/periodizationCalendar";
import { computeFondationDurationWeeks } from "../planConfigBuilder";
import { computeTrailProfile } from "@/lib/trailProfile";
import { buildStructuredDiagnosticBlock } from "../../../../supabase/functions/ai-training-plan/promptHelpers";
import { taperWeeksForObjectiveServer } from "../../../../supabase/functions/ai-training-plan/sportRatioMatrix";
const cases=[
 {objective:"5K",weeks:12,taper:1}, {objective:"10K",weeks:12,taper:1},
 {objective:"Semi-Marathon",weeks:16,taper:1}, {objective:"Marathon",weeks:20,taper:2},
 {objective:"Trail montagne",weeks:20,taper:2}, {objective:"Trail ultra",weeks:24,taper:3},
 {objective:"703",weeks:24,taper:2}, {objective:"IM",weeks:32,taper:3},
];
it.each(cases)("$objective : conserve son affûtage et ses cadences de récupération",({objective,weeks,taper})=>{
 expect(taperWeeksForObjective(objective)).toBe(taper);
 expect(taperWeeksForObjectiveServer(objective)).toBe(taper);
 expect(inferWeekType(weeks,weeks,objective,50)).toBe("race");
 expect(inferWeekType(weeks-taper,weeks,objective,50)).toBe("taper");
 expect(inferWeekType(3,weeks,objective,50)).toBe("recovery");
 expect(inferWeekType(4,weeks,objective,32)).toBe("recovery");
 const config={objective,weeksAvailable:weeks,ambition:"age_group",fondationDurationWeeks:computeFondationDurationWeeks("light",weeks),identifiedLimitersRaw:["VLamax","FatMax","VMA","VO2max","Wprime"]};
 const before=structuredClone(config);
 const phases=buildPeriodizationCalendar(config)!;
 expect(Object.keys(phases)).toHaveLength(weeks);
 expect(phases[1]).toBe("base");
 expect(Object.values(phases).filter(p=>p==="taper")).toHaveLength(taper);
 expect(config).toEqual(before);
});
it("trail : garde sa voie dédiée, ses contraintes de terrain et sa décharge D+",()=>{
 for(const objective of ["Trail court","Trail montagne","Trail ultra"]) {
  expect(computeWeekQuotaEntry(objective,"age_group",30,"race",false)).toBeNull();
 }
 const profile=computeTrailProfile({objective:"Trail montagne",distanceKm:42,elevationGainM:2500})!;
 const before=structuredClone(profile);
 const prompt=buildStructuredDiagnosticBlock({objective:"Trail montagne",ambition:"age_group",trailProfile:profile},20);
 expect(profile.descentTechnicalRequired).toBe(true);
 expect(profile.weeklyDPlusPeakM).toBeGreaterThan(profile.weeklyDPlusBaseM);
 expect(prompt).toContain("Décharge -40-50% D+ toutes les 3-4 sem");
 expect(profile).toEqual(before);
});
it.each(["703","IM"])("%s : préserve le format LCW sans lui appliquer un Jour J brick",objective=>{
 const entry=computeWeekQuotaEntry(objective,"age_group",30,"race",true)!;
 expect(entry.quota.brick).toEqual({min:0,max:0});
 const layout=buildWeeklySlotLayout(entry.quota,entry.floors,"race",{finalStageSport:"run"});
 expect(layout.days.flatMap(d=>d.slots).some(s=>s.sport==="brick")).toBe(false);
});
it.each(["finisher","age_group","competitor","elite","world_class"])("toutes ambitions %s : minima propres et renforcement facultatif",ambition=>{
 for(const objective of objectives) {
  const entry=computeWeekQuotaEntry(objective,ambition,40,"race",false)!;
  const q=entry.quota;
  expect(q.totalSessions.max).toBeGreaterThanOrEqual(q.swim.min+q.bike.min+q.run.min+q.brick.min);
  expect(q.strength.min).toBe(0);
  expect(entry.floors.minStrengthPerWeek).toBe(0);
  expect(entry.floors.longRideWeekly).toBe(false);
  expect(entry.floors.longRunWeekly).toBe(false);
 }
});
import { validateWeeklyQuotas } from "@/lib/plan/validateWeeklyQuotas";
import type { MergedPlan } from "@/lib/plan/mergePlanChunks";
it.each(objectives)("%s : les créneaux réels passent le comptage final de la semaine de course",objective=>{
 const entry=computeWeekQuotaEntry(objective,"age_group",30,"race",false)!;
 const layout=buildWeeklySlotLayout(entry.quota,entry.floors,"race");
 const sessions=layout.days.flatMap((day,dayIndex)=>day.slots.map(slot=>({
  weekNumber:12,weekTheme:"Contrat de comptage uniquement",phase:"taper",dayName:day.dayName,dayIndex,
  sport:slot.sport,title:"Activation synthétique",details:"",durationMin:20,isRest:false,isKeySession:!!slot.isKeySession,
  custom:true,catalogId:null,zones:["Z1"],
 })));
 const plan:MergedPlan={title:"Fixture structurelle, pas un plan sportif validé",totalWeeks:12,phases:[],weeks:[{weekNumber:12,phase:"taper",theme:"Comptage",sessions}]};
 expect(validateWeeklyQuotas(plan,{12:entry})).toEqual([]);
});
