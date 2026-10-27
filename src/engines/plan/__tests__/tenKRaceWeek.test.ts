import { describe, it, expect } from "vitest";
import { computeWeekQuotaEntry, inferWeekType } from "../sessionSizingMatrix";
import { buildWeeklySlotLayout } from "../weeklySlotLayout";
describe("10 km S12 : fréquence préservée, volume réduit",()=>{
 it("ne confond pas la réduction de volume avec une division de la fréquence",()=>{
  const q=computeWeekQuotaEntry("10K","age_group",4,"race",false)!;
  expect(q.quota.totalSessions.max).toBeGreaterThanOrEqual(q.quota.run.min);
  const layout=buildWeeklySlotLayout(q.quota,q.floors,"race",{availableSports:new Set(["run","strength"])});
  expect(layout.days.flatMap(d=>d.slots).length).toBeLessThanOrEqual(q.quota.totalSessions.max);
 });
});
import { validateWeeklyQuotas } from "@/lib/plan/validateWeeklyQuotas";
import type { MergedPlan } from "@/lib/plan/mergePlanChunks";
import { catalogueTrainingMinimaForWeek } from "../../../../supabase/functions/_shared/catalogueTrainingMinima";
import { catalogueForWeek } from "../../../../supabase/functions/_shared/sessionCatalogueContract";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import { buildRepairWorkoutMetadata } from "@/lib/plan/repairCatalogMetadata";
const calendar={objective:"10K",planStartDate:"2026-10-26",raceGoals:[{objective:"10K",raceDate:"2027-01-17"},{objective:"10K",raceDate:"2026-12-19"}]};
it("compte trois activations et la compétition comme quatre CAP, pas cinq",()=>{
 const entry=computeWeekQuotaEntry("10K","age_group",4,"race",false)!;
 const sessions=[1,3,5,6].map((dayIndex,i)=>({weekNumber:12,weekTheme:"Course",phase:"taper",dayIndex,
  dayName:["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"][dayIndex],
  sport:"run",title:i===3?"COURSE : 10 km officiel":"Activation pré-course",details:"",
  durationMin:i===3?45:20,isRest:false,isKeySession:i===3,custom:true,catalogId:null,zones:i===3?["Z4"]:["Z1"]}));
 const plan:MergedPlan={title:"Synthétique",totalWeeks:12,phases:[],weeks:[{weekNumber:12,theme:"Course",phase:"taper",sessions}]};
 expect(validateWeeklyQuotas(plan,{12:entry})).toEqual([]);
 expect(entry.quota.minFullRestDays).toBeGreaterThanOrEqual(1);
 expect(entry.floors.minStrengthPerWeek).toBe(0);
 expect(entry.floors.longRunWeekly).toBe(false);
 expect(entry.floors.slLongRunMin).toBeUndefined();
});
it.each(["finisher","age_group","competitor","elite","world_class"])("conserve une fréquence faisable pour %s sans forcer le renforcement",ambition=>{
 const load=computeWeekQuotaEntry("10K",ambition,30,"load",false)!;
 const race=computeWeekQuotaEntry("10K",ambition,30,"race",false)!;
 expect(race.quota.run).toEqual(load.quota.run);
 expect(race.quota.strength.min).toBe(0);
 expect(race.quota.totalSessions.min).toBe(load.quota.totalSessions.min-load.quota.strength.min);
 expect(race.quota.totalSessions.max).toBeGreaterThanOrEqual(race.quota.run.min);
});
it("préserve les règles S1–11 et les activations courtes d'affûtage",()=>{
 for(let w=1;w<=12;w++) {
  const type=inferWeekType(w,12,"10K",50);
  const entry=computeWeekQuotaEntry("10K","age_group",4,type,false)!;
  const required=entry.quota.run.min+entry.quota.strength.min;
  expect(entry.quota.totalSessions.max).toBeGreaterThanOrEqual(required);
  if(w===11 || w===12) {
   const layout=buildWeeklySlotLayout(entry.quota,entry.floors,type,{availableSports:new Set(["run"])});
   const activations=layout.days.flatMap(d=>d.slots).filter(s=>s.isActivation);
   expect(activations.length).toBeGreaterThan(0);
   expect(activations.every(s=>s.maxDurationMin===30)).toBe(true);
  }
 }
});
it("ne demande pas une quatrième fiche d'entraînement pour la compétition custom déclarée",()=>{
 const q=computeWeekQuotaEntry("10K","age_group",4,"race",false)!.quota;
 const metadata=buildRepairWorkoutMetadata(WorkoutLibrary.find(w=>w.id==="D_RUN_RECOVERY_30_PRO")!);
 const pool=[0,1,2].map(i=>({...metadata,id:`RECOVERY_${i}`}));
 const context={phase:"taper",objective:"10K",weekType:"race"};
 const trainingMinima=catalogueTrainingMinimaForWeek(q,calendar,12);
 // Uncapped recovery cards can repeat, but the event must not create a false
 // request for a fourth distinct training card or another diversity warning.
 expect(catalogueForWeek(pool,context,q).missingSports).toEqual([]);
 expect(catalogueForWeek(pool,context,q).limitedDiversitySports).toEqual(["run"]);
 expect(catalogueForWeek(pool,context,trainingMinima).missingSports).toEqual([]);
 expect(catalogueForWeek(pool,context,trainingMinima).limitedDiversitySports).toEqual([]);
 // An explicit frequency cap still makes the event reservation necessary.
 const capped=pool.map(card=>({...card,when:"Affûtage, 1x/semaine max"}));
 expect(catalogueForWeek(capped,context,q).missingSports).toEqual(["run"]);
 expect(catalogueForWeek(capped,context,trainingMinima).missingSports).toEqual([]);
 expect(q.run.min).toBe(4);
 expect(catalogueTrainingMinimaForWeek(q,calendar,11)).toBe(q);
 expect(catalogueTrainingMinimaForWeek(q,{...calendar,raceGoals:[]},12)).toBe(q);
});
