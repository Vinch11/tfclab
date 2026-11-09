import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildPlanChunkSchema } from "./planSchema.ts";
import type { RepairWorkoutMetadata } from "../_shared/repairSportingEquivalence.ts";
import {checkSessionCatalogue} from '../_shared/sessionCatalogueContract.ts';
const fiche: RepairWorkoutMetadata = { metadataVersion: 1, complete: true, id: "BRICK_BUILD", sport: "brick", title: "Brick spécifique", objective: "703",
 intentFamily: "race_pace", goals: ["half"], objectiveSpecific: false, phases: ["build", "peak"], durationMin: [120, 150], mainZoneMax: 3,
 specialContext: null, prerequisiteKeys: [], necessity: "Recommandé", when: "Build/Peak", avoid: "", tags: [], structure: "Bike 90min Z3; Run30min Z3", zones: ["Z3"] };
Deno.test('retry réel mocké : le conflit intention reçoit le contrat source exact sans assouplir le validateur',async()=>{
 const {generateChunkJSON}=await import('./generateChunkJSON.ts');
 const card:RepairWorkoutMetadata={...fiche,id:'SYNTHETIC_RUN_THRESHOLD',sport:'run',title:'Seuil contrôlé',objective:'Marathon',intentFamily:'seuil',goals:['marathon'],phases:['base'],durationMin:[51,51],mainZoneMax:4,structure:'10 min Z1 ; 4×6 min Z4 ; 3×3 min récupération ; 8 min Z1',zones:['Z1','Z4']};
 const contract={phase:'base',objective:'Marathon',catalog:[card]};
 const bad={day:'mardi',sport:'run',title:'VO2max fractions courtes',details:'4×6 min Z4 ; récupération entre fractions',durationMin:51,zones:['Z1','Z4'],custom:false,catalogId:card.id};
 assert(checkSessionCatalogue(bad,contract).errors.includes('catalogue_physiological_intent'));
 const originalFetch=globalThis.fetch;let calls=0;
 globalThis.fetch=(async(_url,init)=>{
  const request=JSON.parse(String(init?.body)),prompt=request.messages[1].content;
  assert(prompt.includes('Recopie le titre exact'));
  if(calls>0){assert(prompt.includes('"exactTitle":"Seuil contrôlé"'));assert(prompt.includes('"durationMin":[51,51]'));assert(prompt.includes(card.structure));}
  const session=calls++===0?bad:{...bad,title:card.title,details:card.structure};
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({weeks:[{weekNumber:1,phase:'base',sessions:[session]}]})},finish_reason:'stop'}]}),{status:200});
 }) as typeof fetch;
 try{
  const result=await generateChunkJSON({apiKey:'SYNTHETIC',model:'SYNTHETIC',systemPrompt:'SYNTHETIC',userPrompt:'SYNTHETIC',allowedCatalogIds:[card.id],chunkIndex:0,schemaOptions:{catalogueContractsByWeek:{1:contract}}});
  assertEquals(calls,2);assert(result.usedRetry);assertEquals(result.chunk.weeks[0].sessions[0].title,card.title);assertEquals(result.chunk.weeks[0].sessions[0].durationMin,51);assertEquals(result.chunk.weeks[0].sessions[0].details,card.structure);
  assert(checkSessionCatalogue(bad,contract).errors.includes('catalogue_physiological_intent'));
 }finally{globalThis.fetch=originalFetch;}
});
Deno.test("schéma initial : ID dans le chunk mais incompatible avec la semaine Fondation → rejet explicite avant acceptation", () => {
 const schema = buildPlanChunkSchema([fiche.id], { catalogueContractsByWeek: { 1: { phase: "base", catalog: [fiche] } } });
 const session = { day: "samedi", sport: "brick", title: "Brique aérobie introductive", details: "90min vélo Z2 +30min CAP Z2", durationMin: 120, zones: ["Z2"], custom: false, catalogId: fiche.id };
 const result = schema.safeParse({ weeks: [{ weekNumber: 1, phase: "base", sessions: [session] }] });
 assert(!result.success);
 assert(result.error.issues.some(i => i.message.includes("phase:base")));
 assert(result.error.issues.some(i => i.message.includes("catalogue_intensity_diluted")));
 assertEquals(session.zones, ["Z2"]);
});
Deno.test("schéma initial : compétition officielle custom en brick conservée ; semaine hors contrat refusée", () => {
 const schema = buildPlanChunkSchema([], { catalogueContractsByWeek: { 32: { phase: "taper", catalog: [] } } });
 const week = { weekNumber: 32, phase: "taper", sessions: [{ day: "dimanche", sport: "brick", title: "COURSE : Ironman 70.3 Tours", details: "Nat1.9km vélo90km CAP21.1km", durationMin: 330, zones: [], custom: true, catalogId: null }] };
 assert(schema.safeParse({ weeks: [week] }).success);
 assert(!schema.safeParse({ weeks: [{ ...week, weekNumber: 33 }] }).success);
});

Deno.test("parcours JSON mocké : une prescription initiale incompatible n'est pas acceptée comme séance catalogue", async () => {
 const { generateChunkJSON } = await import("./generateChunkJSON.ts");
 const oldFetch = globalThis.fetch;
 let calls = 0;
 const bad = { day: "samedi", sport: "brick", title: "Brique aérobie", details: "Vélo90min Z2 +CAP30min Z2", durationMin: 120, zones: ["Z2"], custom: false, catalogId: fiche.id };
 const good = { ...bad, custom: true, catalogId: null };
 globalThis.fetch = (() => Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
  weeks: [{ weekNumber: 1, phase: "base", sessions: [++calls === 1 ? bad : good] }],
 }) }, finish_reason: "stop" }] }), { status: 200, headers: { "Content-Type": "application/json" } }))) as typeof fetch;
 try {
  const result = await generateChunkJSON({ apiKey: "mock-key", model: "mock-model", systemPrompt: "Fixture", userPrompt: "Fixture", allowedCatalogIds: [fiche.id], chunkIndex: 0,
   schemaOptions: { catalogueContractsByWeek: { 1: { phase: "base", catalog: [fiche] } } } });
  assertEquals(calls, 2); assert(result.usedRetry);
  assertEquals(result.chunk.weeks[0].sessions[0].catalogId, null);
  assertEquals(bad.catalogId, fiche.id); // decoder did not silently rewrite the bad session
 } finally { globalThis.fetch = oldFetch; }
});

Deno.test("la phase déclarée par le modèle ne peut remplacer la phase canonique de la semaine", () => {
 const schema = buildPlanChunkSchema([], { catalogueContractsByWeek: { 1: { phase: "base", catalog: [] } } });
 const result = schema.safeParse({ weeks: [{ weekNumber: 1, phase: "build", sessions: [{ day: "lundi", sport: "rest", title: "Repos", durationMin: 0, custom: true, catalogId: null }] }] });
 assert(!result.success); assert(result.error.issues.some(i => i.message === "week_phase_contract_mismatch"));
});
