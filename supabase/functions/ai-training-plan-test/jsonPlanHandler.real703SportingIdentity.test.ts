import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applySLFloorEnforcement, testOnlyApplyReconciler } from "./jsonPlanHandler.ts";
import { buildPlanChunkSchema, type PlanChunk } from "./planSchema.ts";
import { getSystemPromptJSON } from "./systemPromptJSON.ts";
import { generateChunkJSON } from "./generateChunkJSON.ts";
import { buildUserPrompt } from "./promptHelpers.ts";
import fixture from "../_shared/fixtures/currentRepairCatalog.json" with { type: "json" };
import type { RepairWorkoutMetadata } from "../_shared/repairSportingEquivalence.ts";

Deno.test("official event cannot be upgraded into an endurance workout even with an eligible candidate", () => {
  const race = { day: "samedi" as const, sport: "bike" as const, title: "COURSE : contre-la-montre officiel",
    details: "Course officielle datée, parcours et consignes propres.", durationMin: 60, zones: ["Z2"],
    custom: false as const, catalogId: "ORIGINAL_BIKE_EASY", isKeySession: false };
  const chunk = { weeks: [{ weekNumber: 9, phase: "base", theme: "Course", sessions: [race] }] } as PlanChunk;
  const before = structuredClone(race);
  const result = applySLFloorEnforcement([chunk], { 9: { weekType: "load", longRideWeekly: true,
    slLongRideMin: 120 } }, [fixture.tables.standard], [fixture.entries as unknown as RepairWorkoutMetadata[]], "703");
  assertEquals(race, before);
  assertEquals(result.repairs.length, 0);
});

Deno.test("S9 official 10 km never becomes an SL repair target despite a load quota", () => {
  const race = { day: "samedi" as const, sport: "run" as const, title: "Course — 🏁 OBJECTIF B : 10 km (Wsl)",
    details: "Course 10 km le 19 décembre 2026. [ID: V3_RUN_10K_RACE_SIM]", durationMin: 60, zones: ["Z4"],
    custom: false as const, catalogId: "V3_RUN_10K_RACE_SIM", isKeySession: true };
  const chunk = { weeks: [{ weekNumber: 9, phase: "base", theme: "Course", sessions: [race] }] } as PlanChunk;
  const before = structuredClone(race);
  const result = applySLFloorEnforcement([chunk], { 9: { weekType: "load", longRunWeekly: true,
    slLongRunMin: 90 } }, [], [], "703");
  assertEquals(race, before);
  assertEquals(result.repairs.length, 0);
});

Deno.test("full session quota with recovery-only sessions remains unresolved instead of adding sessions", () => {
  const sessions = ["mardi", "jeudi"].map(day => ({ day, sport: "swim", title: "Technique nage", details: "Drills Z1",
    durationMin: 40, zones: ["Z1"], custom: true, catalogId: null, isKeySession: false }));
  const chunk = { weeks: [{ weekNumber: 1, phase: "base", theme: "Fondation", sessions }] } as PlanChunk;
  const before = structuredClone(sessions);
  const zero = { min: 0, max: 0 };
  const quota = { weekType: "load", quota: { swim: { min: 2, max: 2 }, bike: zero, run: zero, brick: zero,
    strength: zero, totalSessions: { min: 2, max: 2 }, maxSessionsPerDay: 2, minFullRestDays: 0 } };
  const dump = "#### Natation\n| ID | Cat | Titre | Phase | Durée | Structure |\n| SWIM_ENDURANCE_CONTINU | A | Sortie continue | Base | 40-55 | endurance Z2 [Z2] |";
  const result = testOnlyApplyReconciler([chunk], { 1: quota }, [dump]);
  assertEquals(sessions, before);
  assert(result.repairs.some(r => r.code === "insert_unresolved" && r.severity === "critical"));
  assert(!result.repairs.some(r => r.code === "session_inserted"));
});

Deno.test("JSON generation explicitly separates official event from race-sim training", () => {
  const prompt = getSystemPromptJSON();
  assert(prompt.includes("principale OU intermédiaire"));
  assert(prompt.includes("`custom = true`, `catalogId = null`"));
  assert(prompt.includes("notamment RACE_SIM"));
});

Deno.test("33-week declared calendar anchors only the two races S9/S33, no invented S24 objective", () => {
  const card = buildUserPrompt({}, { planStartDate: "2026-10-19", weeksAvailable: 33, objective: "703",
    raceGoals: [
      { objective: "10K", raceDate: "2026-12-19", priority: "B", raceName: "10 km WSL" },
      { objective: "703", raceDate: "2027-06-06", priority: "A", raceName: "IRONMAN 70.3 TOURS" },
    ] });
  assert(card.includes("2026-12-19"));
  assert(card.includes("2027-06-06"));
  const anchors = card.split("\n").filter(line => line.includes("Ancrage absolu :"));
  assertEquals(anchors.length, 2);
  assert(anchors[0].includes("dans S9"));
  assert(anchors[1].includes("dans S33"));
  assert(!card.includes("Activation Objectif Intermédiaire"));
});

Deno.test("generation schema rejects a real race linked to a simulation, keeps both event and training forms valid", () => {
  const schema = buildPlanChunkSchema(["V3_RUN_10K_RACE_SIM"]);
  const parse = (value: unknown) => schema.safeParse({ weeks: [{ weekNumber: 9, phase: "taper", sessions: [value] }] });
  const session = { day: "samedi", sport: "run", title: "Course — 🏁 OBJECTIF B : 10 km (Wsl)",
    details: "Course officielle 10 km", durationMin: 60, zones: ["Z4"], isKeySession: true,
    custom: false, catalogId: "V3_RUN_10K_RACE_SIM" };
  assertEquals(parse(session).success, false);
  assertEquals(parse({ ...session, custom: true, catalogId: null }).success, true);
  assertEquals(parse({ ...session, title: "Simulation course 10K — dress rehearsal" }).success, true);
});

Deno.test("mocked generation retries the invalid simulation association and preserves the corrected real race", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  const race = { day: "samedi" as const, sport: "run" as const, title: "COURSE : 10 km WSL", details: "10 km officiel le 19 décembre 2026",
    durationMin: 60, zones: ["Z4"], isKeySession: true, custom: false, catalogId: "V3_RUN_10K_RACE_SIM" };
  globalThis.fetch = (() => {
    calls++;
    const session = calls === 1 ? race : { ...race, custom: true, catalogId: null };
    return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      weeks: [{ weekNumber: 9, phase: "taper", theme: "Course", sessions: [session] }],
    }) }, finish_reason: "stop" }] }), { status: 200, headers: { "Content-Type": "application/json" } }));
  }) as typeof fetch;
  try {
    const result = await generateChunkJSON({ apiKey: "test-key", model: "test-model", systemPrompt: "test", userPrompt: "test",
      allowedCatalogIds: ["V3_RUN_10K_RACE_SIM"], chunkIndex: 0, schemaOptions: { expectedWeekCount: 1 } });
    assertEquals(calls, 2);
    assertEquals(result.usedRetry, true);
    assertEquals(result.chunk.weeks[0].sessions[0], { ...race, custom: true, catalogId: null });
  } finally { globalThis.fetch = originalFetch; }
});

Deno.test("brick-adjusted total capacity is shared with validation, not the nominal ceiling", () => {
  const sessions = ["mardi", "jeudi"].map(day => ({ day, sport: "swim", title: "Technique nage", details: "Drills Z1",
    durationMin: 40, zones: ["Z1"], custom: true, catalogId: null, isKeySession: false }));
  sessions.push({ day: "samedi", sport: "brick", title: "Brique aérobie", details: "Z2",
    durationMin: 140, zones: ["Z2"], custom: true, catalogId: null, isKeySession: false });
  const chunk = { weeks: [{ weekNumber: 1, phase: "base", theme: "Fondation", sessions }] } as PlanChunk;
  const before = structuredClone(sessions);
  const zero = { min: 0, max: 0 };
  const quota = { weekType: "load", quota: { swim: { min: 2, max: 5 }, bike: { min: 1, max: 1 },
    run: zero, brick: { min: 1, max: 1 }, strength: zero,
    totalSessions: { min: 4, max: 4 }, maxSessionsPerDay: 2, minFullRestDays: 0 } };
  const dump = "#### Natation\n| ID | Cat | Titre | Phase | Durée | Structure |\n| SWIM_ENDURANCE_CONTINU | A | Sortie continue | Base | 40-55 | endurance Z2 [Z2] |";
  const result = testOnlyApplyReconciler([chunk], { 1: quota }, [dump]);
  assertEquals(sessions, before);
  assert(result.repairs.some(r => r.code === "insert_unresolved" && r.severity === "critical"));
});
