import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { canonicalizeCatalogueSession } from "./catalogueSessionIdentity.ts";
import { checkSessionCatalogue } from "./sessionCatalogueContract.ts";
import type { RepairWorkoutMetadata } from "./repairSportingEquivalence.ts";

const easy: RepairWorkoutMetadata = { metadataVersion: 1, complete: true, id: "A_RUN_Z2_EASY", sport: "run", title: "Footing endurance Z2", objective: "10km",
  intentFamily: "endurance_fondamentale", goals: ["10km"], objectiveSpecific: false, phases: ["base", "build"], durationMin: [40, 60], mainZoneMax: 2,
  specialContext: null, prerequisiteKeys: [], necessity: "Recommandé", when: "Base", avoid: "", tags: [], structure: "45-60min Z2 continu", zones: ["Z2"] };
const contract = { phase: "base", objective: "10km", catalog: [easy] };

Deno.test("fiche catalogue : durée hors plage ramenée à la borne validée, titre/zones/protocole de la fiche", () => {
  const ai = { day: "mardi", sport: "run", title: "VMA 6x3min", details: "6x3min Z5", durationMin: 75, zones: ["Z5"], custom: false, catalogId: easy.id };
  assert(checkSessionCatalogue(ai, contract).errors.length > 0);
  const out = canonicalizeCatalogueSession(ai, contract);
  assert(out);
  assertEquals(out.session.durationMin, 60);
  assertEquals(out.session.title, easy.title);
  assertEquals(out.session.zones, ["Z2"]);
  assertEquals(out.session.details, easy.structure);
  assertEquals(checkSessionCatalogue(out.session, contract).errors, []);
});

Deno.test("fiche catalogue : durée sous la plage ramenée à 40 min", () => {
  const out = canonicalizeCatalogueSession({ day: "mardi", sport: "run", title: "Footing", details: "", durationMin: 25, zones: ["Z2"], custom: false, catalogId: easy.id }, contract);
  assertEquals(out?.session.durationMin, 40);
});

Deno.test("fiche hors phase de la semaine : jamais corrigée, le refus reste", () => {
  const out = canonicalizeCatalogueSession({ day: "mardi", sport: "run", title: "Footing", details: "", durationMin: 75, zones: ["Z2"], custom: false, catalogId: easy.id }, { ...contract, phase: "taper" });
  assertEquals(out, null);
});

Deno.test("sport différent de la fiche : jamais corrigé", () => {
  const out = canonicalizeCatalogueSession({ day: "mardi", sport: "bike", title: "Vélo", details: "", durationMin: 75, zones: ["Z2"], custom: false, catalogId: easy.id }, contract);
  assertEquals(out, null);
});

Deno.test("séance déjà conforme : inchangée", () => {
  const out = canonicalizeCatalogueSession({ day: "mardi", sport: "run", title: easy.title, details: easy.structure, durationMin: 50, zones: ["Z2"], custom: false, catalogId: easy.id }, contract);
  assertEquals(out, null);
});

Deno.test("zone principale de la fiche ajoutée quand sa liste ne cite que l'échauffement", () => {
  const seuil: RepairWorkoutMetadata = { ...easy, id: "B_SEUIL", title: "Seuil 3x10min", intentFamily: "seuil", mainZoneMax: 4, zones: ["Z2"], structure: "Échauffement Z2, 3x10min Z4, retour au calme", durationMin: [60, 75] };
  const c = { phase: "base", objective: "10km", catalog: [seuil] };
  const out = canonicalizeCatalogueSession({ day: "jeudi", sport: "run", title: "Seuil", details: "", durationMin: 60, zones: ["Z2"], custom: false, catalogId: seuil.id }, c);
  assert(out);
  assertEquals(out.session.zones, ["Z2", "Z4"]);
  assertEquals(checkSessionCatalogue(out.session, c).errors, []);
});
