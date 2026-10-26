import { describe,it,expect } from "vitest";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import { buildRepairWorkoutMetadata } from "@/lib/plan/repairCatalogMetadata";
import { buildWorkoutCatalog,serializeCatalogForPrompt } from "@/lib/workoutCatalogBuilder";
import { extractCatalogIdsFromDump } from "../../../../supabase/functions/_shared/catalogueIds";
import { checkSessionCatalogue } from "../../../../supabase/functions/_shared/sessionCatalogueContract";
const metadata=(id:string)=>buildRepairWorkoutMetadata(WorkoutLibrary.find(w=>w.id===id)!);
describe("shared source-to-prescription contract",()=>{
 it("round-trips every existing library ID without case conversion",()=>{
  const dump=WorkoutLibrary.map(w=>`| ${w.id} | A | fiche |`).join("\n");
  expect(new Set(extractCatalogIdsFromDump(dump))).toEqual(new Set(WorkoutLibrary.map(w=>w.id)));
 });
 it("does not change physiology when a source title is shortened or has a neutral suffix",()=>{
  const m=metadata("A_RUN_Z2_EASY");
  for(const title of [m.title.slice(0,50),m.title+" — S3"]) {
   expect(checkSessionCatalogue({catalogId:m.id,sport:"run",custom:false,title,details:m.structure,durationMin:50,zones:["Z2"]},{catalog:[m],phase:"base",objective:"10K"}).errors).toEqual([]);
  }
 });
 it("does not classify bodyweight tempo as metabolic threshold or a conversation check as an exercise test",()=>{
  expect(metadata("C_STR_BODYWEIGHT_HOME").intentFamily).toBe("force");
  expect(metadata("SEILER_RUN_Z1_RECOVERY_STRICT").intentFamily).toBe("recuperation");
 });
 it("continues rejecting real duration, intensity and intent changes",()=>{
  const m=metadata("A_RUN_Z2_EASY"),session={catalogId:m.id,sport:"run",title:"Seuil lactique",details:m.structure,durationMin:500,zones:["Z5"]};
  const errors=checkSessionCatalogue(session,{catalog:[m],phase:"base",objective:"10K"}).errors;
  expect(errors).toContain("catalogue_duration");
  expect(errors).toContain("catalogue_intensity_exceeded");
  expect(errors).toContain("catalogue_physiological_intent");
 });
 it("keeps compatible coverage when diversity preferences have seen every source ID",()=>{
  const options={strictPhaseFilter:true,phaseOverride:["base" as const],maxItems:130,rotationSeed:0};
  const first=buildWorkoutCatalog("10K",1,4,12,options);
  const rotated=buildWorkoutCatalog("10K",1,4,12,{...options,rotationIds:new Set(WorkoutLibrary.map(w=>w.id))});
  expect(new Set(rotated.map(w=>w.id))).toEqual(new Set(first.map(w=>w.id)));
 });
 it("transmits complete prescriptions and bounded duration instructions",()=>{
  const catalog=buildWorkoutCatalog("10K",1,4,12,{strictPhaseFilter:true,phaseOverride:["base"],maxItems:80});
  const dump=serializeCatalogForPrompt(catalog);
  const long=catalog.find(e=>e.structure.length>120)!;
  expect(dump).toContain(long.structure.replace(/\s*\|\s*/g," / ").replace(/\s+/g," ").trim());
  expect(dump).not.toContain("tolérance ±15% pour la progression hebdomadaire");
 });
});
import { resolveCanonicalDuration } from "@/lib/plan/workoutDurationResolver";
it("keeps exact fixed-duration prescriptions instead of rounding them outside their contract",()=>{
 const violations=WorkoutLibrary.flatMap(w=>(["base","build","peak","taper"] as const).flatMap(phase=>{
  const duration=resolveCanonicalDuration(w,phase);
  return duration<w.durationMin[0]||duration>w.durationMin[1]?[`${w.id}:${phase}`]:[];
 }));
 expect(violations).toEqual([]);
});
