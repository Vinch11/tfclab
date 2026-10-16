import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { RepairIntentFamily, RepairWorkoutMetadata } from "../_shared/repairSportingEquivalence.ts";
import { applyReconciler, applySLFloorEnforcement } from "./jsonPlanHandler.ts";

function metadata(
  id: string,
  intentFamily: RepairIntentFamily,
  zones: string[],
  options: Partial<RepairWorkoutMetadata> = {},
): RepairWorkoutMetadata {
  return {
    metadataVersion: 1,
    complete: true,
    id,
    sport: "run",
    title: id,
    objective: id,
    intentFamily,
    goals: ["5k"],
    objectiveSpecific: false,
    phases: ["base", "build", "peak", "taper"],
    durationMin: [55, 75],
    mainZoneMax: zones.some(zone => /Z4/i.test(zone)) ? 4 : 2,
    specialContext: null,
    prerequisiteKeys: [],
    necessity: "Recommandé",
    when: "Toute l'année",
    avoid: "",
    tags: [],
    structure: `${id} ${zones.join(" ")}`,
    zones,
    ...options,
  };
}

const EASY = metadata("A_RUN_Z2_EASY", "endurance_fondamentale", ["Z2"], { durationMin: [35, 50] });
const SIX_BY_1000 = metadata("ENR_RUN_DESCENDING_REST", "seuil", ["Z4"], { durationMin: [60, 70] });
const NORWEGIAN = metadata("NORWEGIAN_RUN_LACTATE_TEST_PROTOCOL", "test", ["Z2", "Z4"], {
  goals: ["10k", "semi", "marathon"],
  prerequisiteKeys: ["lactatemetre", "bloc_double_seuil"],
});
const IRONMAN = metadata("A_IM_RUN_PACE", "race_pace", ["Z2"], {
  goals: ["ironman"], objectiveSpecific: true, specialContext: "post_bike", durationMin: [60, 120],
});

const LOAD_QUOTA = {
  weekType: "load",
  longRideWeekly: false,
  longRunWeekly: true,
  slLongRideMin: 0,
  slLongRunMin: 60,
  quota: {
    swim: { min: 0, max: 0 }, bike: { min: 0, max: 0 }, run: { min: 0, max: 5 }, brick: { min: 0, max: 0 }, strength: { min: 0, max: 0 },
    maxSessionsPerDay: 2, minFullRestDays: 1,
  },
  floors: { longRunWeekly: true, slLongRunMin: 60 },
};

function catalogDump(entries: RepairWorkoutMetadata[]): string {
  return [
    "#### Course",
    "| ID | Cat | Titre | Phase | Durée | Structure |",
    ...entries.map(entry => `| ${entry.id} | A | ${entry.title} | Build | ${entry.durationMin[0]}-${entry.durationMin[1]} | ${entry.structure} |`),
  ].join("\n");
}

Deno.test("serveur — SL facile ne devient ni 6 × 1 000 m, ni protocole norvégien, ni allure Ironman", () => {
  for (const bad of [SIX_BY_1000, NORWEGIAN, IRONMAN]) {
    const session: any = {
      day: "dimanche", sport: "run", title: EASY.title, details: EASY.structure,
      catalogId: EASY.id, custom: false, durationMin: 45, zones: ["Z2"], isKeySession: true,
    };
    const chunk: any = { weeks: [{ weekNumber: 1, phase: "build", sessions: [session] }] };
    const result = applySLFloorEnforcement(
      [chunk],
      { 1: LOAD_QUOTA },
      [catalogDump([EASY, bad])],
      [[EASY, bad]],
      "5K",
    );
    assertEquals(session.catalogId, EASY.id);
    assertEquals(result.repairs.at(-1)?.code, "sl_upgrade_unresolved");
    assert(result.traces.some(trace => trace.includes("action=unresolved")));
  }
});

Deno.test("serveur — recovery sans weeklyNotes rejette une réparation Z4", () => {
  const original = metadata("RECOVERY_EASY", "endurance_fondamentale", ["Z2"], { durationMin: [30, 40] });
  const hard = metadata("HARD_DISGUISED_AS_EASY", "endurance_fondamentale", ["Z2"], { mainZoneMax: 4, durationMin: [30, 40] });
  const make = (day: string): any => ({ day, sport: "run", title: original.title, details: original.structure, catalogId: original.id, custom: false, durationMin: 35, zones: ["Z2"], isKeySession: true });
  const chunk: any = { weeks: [{ weekNumber: 6, phase: "build", sessions: [make("mardi"), make("jeudi")] }] };
  const quota: any = { ...LOAD_QUOTA, weekType: "recovery", longRunWeekly: false };
  const result = applyReconciler([chunk], { 6: quota }, [catalogDump([original, hard])], null, [[original, hard]], "5K");
  assertEquals(chunk.weeks[0].sessions[1].catalogId, original.id);
  assert(result.repairs.some(repair => repair.code === "duplicate_catalog_id_unresolved"));
});

Deno.test("serveur — S11 conserve deux openers et émet une anomalie si aucune alternative équivalente n'existe", () => {
  const opener = metadata("D_TAPER_RUN_OPENER", "race_pace", ["Z2", "Z4"], { phases: ["taper"], durationMin: [25, 40] });
  const make = (day: string): any => ({ day, sport: "run", title: opener.title, details: opener.structure, catalogId: opener.id, custom: false, durationMin: 30, zones: opener.zones, isKeySession: true });
  const chunk: any = { weeks: [{ weekNumber: 11, phase: "taper", sessions: [make("mardi"), make("jeudi")] }] };
  const quota: any = { ...LOAD_QUOTA, weekType: "taper", longRunWeekly: false, quota: { ...LOAD_QUOTA.quota, run: { min: 0, max: 5 } } };
  const result = applyReconciler([chunk], { 11: quota }, [catalogDump([opener])], null, [[opener]], "5K");
  assertEquals(chunk.weeks[0].sessions[1].catalogId, opener.id);
  assert(result.repairs.some(repair => repair.code === "duplicate_catalog_id_unresolved"));
});

Deno.test("serveur — catalogue legacy sans métadonnées reste non résolu", () => {
  const session: any = {
    day: "dimanche", sport: "run", title: EASY.title, details: EASY.structure,
    catalogId: EASY.id, custom: false, durationMin: 45, zones: ["Z2"], isKeySession: true,
  };
  const chunk: any = { weeks: [{ weekNumber: 1, phase: "build", sessions: [session] }] };
  const result = applySLFloorEnforcement([chunk], { 1: LOAD_QUOTA }, [catalogDump([EASY, SIX_BY_1000])]);
  assertEquals(session.catalogId, EASY.id);
  assert(result.repairs.some(repair => repair.code === "sl_upgrade_unresolved"));
});

Deno.test("serveur — métadonnées partielles ou incohérentes ne sont jamais candidates", () => {
  for (const repairCatalog of [
    [EASY, { ...SIX_BY_1000, phases: undefined } as unknown as RepairWorkoutMetadata],
    [EASY, { ...SIX_BY_1000, id: "OTHER_ID" }],
  ]) {
    const session: any = {
      day: "dimanche", sport: "run", title: EASY.title, details: EASY.structure,
      catalogId: EASY.id, custom: false, durationMin: 45, zones: ["Z2"], isKeySession: true,
    };
    const chunk: any = { weeks: [{ weekNumber: 1, phase: "build", sessions: [session] }] };
    const result = applySLFloorEnforcement(
      [chunk], { 1: LOAD_QUOTA }, [catalogDump([EASY, SIX_BY_1000])], [repairCatalog], "5K",
    );
    assertEquals(session.catalogId, EASY.id);
    assert(result.repairs.some(repair => repair.code === "sl_upgrade_unresolved"));
  }
});

Deno.test("serveur — séance d'origine absente et ancien contrat échouent fermés", () => {
  const longEasy = metadata("LONG_EASY", "endurance_fondamentale", ["Z2"], { durationMin: [60, 90] });
  for (const { repairCatalog, dump } of [
    { repairCatalog: [longEasy], dump: catalogDump([longEasy]) },
    {
      repairCatalog: [{ ...EASY, metadataVersion: 0 } as unknown as RepairWorkoutMetadata, longEasy],
      dump: catalogDump([EASY, longEasy]),
    },
  ]) {
    const session: any = {
      day: "dimanche", sport: "run", title: EASY.title, details: EASY.structure,
      catalogId: EASY.id, custom: false, durationMin: 45, zones: ["Z2"], isKeySession: true,
    };
    const chunk: any = { weeks: [{ weekNumber: 1, phase: "build", sessions: [session] }] };
    const result = applySLFloorEnforcement(
      [chunk], { 1: LOAD_QUOTA }, [dump], [repairCatalog], "5K",
    );
    assertEquals(session.catalogId, EASY.id);
    assert(result.repairs.some(repair => repair.code === "sl_upgrade_unresolved"));
  }
});

Deno.test("serveur — repli inter-chunks exige les métadonnées des deux séances", () => {
  const longEasy = metadata("LONG_EASY", "endurance_fondamentale", ["Z2"], { durationMin: [60, 90] });
  const makeChunk = (): any => ({ weeks: [{ weekNumber: 1, phase: "build", sessions: [{
    day: "dimanche", sport: "run", title: EASY.title, details: EASY.structure,
    catalogId: EASY.id, custom: false, durationMin: 45, zones: ["Z2"], isKeySession: true,
  }] }] });

  const safe = makeChunk();
  const safeResult = applySLFloorEnforcement(
    [safe, { weeks: [] } as any], { 1: LOAD_QUOTA },
    [catalogDump([EASY]), catalogDump([longEasy])], [[EASY], [longEasy]], "5K",
  );
  assertEquals(safe.weeks[0].sessions[0].catalogId, longEasy.id);
  assert(safeResult.repairs.some(repair => repair.code === "sl_upgraded"));

  const unverified = makeChunk();
  const unverifiedResult = applySLFloorEnforcement(
    [unverified, { weeks: [] } as any], { 1: LOAD_QUOTA },
    [catalogDump([EASY]), catalogDump([longEasy])], [[EASY], []], "5K",
  );
  assertEquals(unverified.weeks[0].sessions[0].catalogId, EASY.id);
  assert(unverifiedResult.repairs.some(repair => repair.code === "sl_upgrade_unresolved"));
});

