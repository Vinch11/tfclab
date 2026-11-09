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

import { substituteIneligibleCatalogueSession } from "./catalogueSessionIdentity.ts";
const triSwim: RepairWorkoutMetadata = { ...easy, id: "SWIM_TRI_ONLY", sport: "swim", title: "Natation 70.3", goals: ["half"], objectiveSpecific: true, structure: "2000m Z2", durationMin: [50, 70] };
const swimAny: RepairWorkoutMetadata = { ...easy, id: "SWIM_ANY", sport: "swim", title: "Natation endurance", goals: [], objectiveSpecific: false, structure: "1800m Z2", durationMin: [45, 60] };
const swimVo2: RepairWorkoutMetadata = { ...swimAny, id: "SWIM_VO2", intentFamily: "vo2", mainZoneMax: 5, zones: ["Z5"] };

Deno.test("fiche réservée à un autre objectif : remplacée par une fiche du même sport et du même rôle", () => {
  const c = { phase: "base", objective: "10km", catalog: [triSwim, swimAny, swimVo2] };
  const s = { day: "mercredi", sport: "swim", title: "Natation", details: "", durationMin: 60, zones: ["Z2"], custom: false, catalogId: triSwim.id };
  assert(checkSessionCatalogue(s, c).errors.length > 0);
  const out = substituteIneligibleCatalogueSession(s, c, [triSwim.id, swimAny.id, swimVo2.id]);
  assertEquals(out?.toId, "SWIM_ANY");
  assertEquals(out?.session.title, swimAny.title);
  assertEquals(checkSessionCatalogue(out!.session, c).errors, []);
});

Deno.test("aucune fiche équivalente autorisée : pas de remplacement, le refus reste", () => {
  const c = { phase: "base", objective: "10km", catalog: [triSwim, swimVo2] };
  const s = { day: "mercredi", sport: "swim", title: "Natation", details: "", durationMin: 60, zones: ["Z2"], custom: false, catalogId: triSwim.id };
  assertEquals(substituteIneligibleCatalogueSession(s, c, [triSwim.id, swimVo2.id]), null);
  assertEquals(substituteIneligibleCatalogueSession(s, { ...c, catalog: [triSwim, swimAny] }, [triSwim.id]), null);
});

import { sessionSportMatchesCard } from "./sessionCatalogueContract.ts";
Deno.test("fiche « mixed » : mobilité = récupération/renfo, brique = brick, jamais course/vélo", () => {
  assert(sessionSportMatchesCard("strength", { sport: "mixed", intentFamily: "recuperation" }));
  assert(sessionSportMatchesCard("recovery", { sport: "mixed", intentFamily: "technique" }));
  assert(!sessionSportMatchesCard("run", { sport: "mixed", intentFamily: "recuperation" }));
  assert(sessionSportMatchesCard("brick", { sport: "mixed", intentFamily: "brick" }));
  assert(!sessionSportMatchesCard("strength", { sport: "mixed", intentFamily: "brick" }));
  assert(!sessionSportMatchesCard("bike", { sport: "run", intentFamily: "seuil" }));
});

const swimSeuil: RepairWorkoutMetadata = { ...swimAny, id: "SWIM_SEUIL", title: "Natation seuil CSS", intentFamily: "seuil", mainZoneMax: 4, zones: ["Z4"], structure: "10x100 CSS" };
Deno.test("semaine de décharge : une séance seuil est remplacée par une séance facile du même sport, jamais par une autre séance dure", () => {
  const c = { phase: "build", weekType: "recovery", objective: "half", catalog: [swimSeuil, swimVo2, swimAny] };
  const s = { day: "mardi", sport: "swim", title: "Natation seuil CSS", details: "10x100 CSS", durationMin: 50, zones: ["Z4"], custom: false, catalogId: swimSeuil.id, isKeySession: true };
  assert(checkSessionCatalogue(s, c).errors.some((e) => e.startsWith("recovery_")));
  const out = substituteIneligibleCatalogueSession(s, c, [swimSeuil.id, swimVo2.id, swimAny.id]);
  assertEquals(out?.toId, "SWIM_ANY");
  assertEquals((out?.session as Record<string, unknown>).isKeySession, false);
  assertEquals(checkSessionCatalogue(out!.session, c).errors, []);
  // Hors décharge, aucune rétrogradation d'intensité.
  assertEquals(substituteIneligibleCatalogueSession(s, { ...c, weekType: "load", objective: "10km", catalog: [{ ...swimSeuil, goals: ["half"], objectiveSpecific: true }, swimAny] }, [swimSeuil.id, swimAny.id]), null);
});
