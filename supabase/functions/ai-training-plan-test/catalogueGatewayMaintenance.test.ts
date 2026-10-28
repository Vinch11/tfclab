import {
  assert,
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ChunkGenerationError,
  generateChunkJSON,
} from "./generateChunkJSON.ts";
import { buildPlanChunkSchema } from "./planSchema.ts";
import { sanitizeSchemaFailure } from "../_shared/planFailureDiagnostics.ts";
import type { RepairWorkoutMetadata } from "../_shared/repairSportingEquivalence.ts";
const fiche: RepairWorkoutMetadata = {
  metadataVersion: 1,
  complete: true,
  id: "SYNTHETIC_RUN_EASY",
  sport: "run",
  title: "Endurance facile",
  objective: "10K",
  intentFamily: "endurance_fondamentale",
  goals: ["10k"],
  objectiveSpecific: false,
  phases: ["base"],
  durationMin: [60, 60],
  mainZoneMax: 2,
  specialContext: null,
  prerequisiteKeys: [],
  necessity: "Recommandé",
  when: "Base",
  avoid: "",
  tags: [],
  structure: "60min Z2",
  zones: ["Z2"],
  variants: {
    "10K": "Z2 25-35min",
    "Marathon": "Z2 80-90min",
    "prose": "un peu plus court",
  },
};
const contracts = { 1: { phase: "base", objective: "10K", catalog: [fiche] } };
const base = {
  day: "mardi",
  sport: "run",
  title: fiche.title,
  details: fiche.structure,
  durationMin: 60,
  zones: ["Z2"],
  custom: false,
  catalogId: fiche.id,
  isKeySession: false,
};
const chunk = (session: unknown) => ({
  weeks: [{
    weekNumber: 1,
    phase: "base",
    theme: "Synthetic",
    sessions: [session],
  }],
});
const args = {
  apiKey: "offline",
  model: "offline",
  systemPrompt: "fixture",
  userPrompt: "fixture",
  allowedCatalogIds: [fiche.id],
  chunkIndex: 0,
  schemaOptions: { catalogueContractsByWeek: contracts },
};
const ok = (content: unknown) =>
  new Response(
    JSON.stringify({
      choices: [{
        message: { content: JSON.stringify(content) },
        finish_reason: "stop",
      }],
    }),
    { status: 200 },
  );
Deno.test("provider and Zod agree on executable goal-scoped variants; identity survives normalization", async () => {
  const previous = globalThis.fetch;
  let body: any;
  globalThis.fetch = async (_url, init) => {
    body = JSON.parse(String(init?.body));
    return ok(
      chunk({
        ...base,
        durationMin: 30,
        details: "30min Z2",
        variantKey: "10K",
      }),
    );
  };
  try {
    const result = await generateChunkJSON(args);
    const ref =
      body.response_format.json_schema.schema.properties.weeks.items.properties
        .sessions.items.anyOf[1];
    assertEquals(ref.properties.variantKey.enum, ["10K"]);
    assertEquals(result.chunk.weeks[0].sessions[0].variantKey, "10K");
    assertEquals(result.chunk.weeks[0].sessions[0].catalogId, fiche.id);
  } finally {
    globalThis.fetch = previous;
  }
});
Deno.test("an invalid explicit variant is rejected, never treated as a normal catalogue reference", () => {
  const schema = buildPlanChunkSchema([fiche.id], args.schemaOptions);
  assert(!schema.safeParse(chunk({ ...base, variantKey: "prose" })).success);
  assert(
    !schema.safeParse(
      chunk({ ...base, variantKey: "Marathon", durationMin: 85 }),
    ).success,
  );
  assert(
    !schema.safeParse(
      chunk({ ...base, custom: true, catalogId: null, variantKey: "10K" }),
    ).success,
  );
  assert(
    schema.safeParse(chunk({ ...base, durationMin: 30, variantKey: "10K" }))
      .success,
  );
  assert(
    !schema.safeParse(chunk({ ...base, durationMin: 20, variantKey: "10K" }))
      .success,
  );
});
Deno.test("presentation-only title conflict is repaired only with exact unchanged source protocol and zones", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () =>
    ok(chunk({ ...base, title: "Endurance + éducatifs" }));
  try {
    const result = await generateChunkJSON(args);
    assertEquals(result.chunk.weeks[0].sessions[0].title, fiche.title);
    assertEquals(result.chunk.weeks[0].sessions[0].catalogId, fiche.id);
    assertEquals(result.chunk.weeks[0].sessions[0].details, base.details);
    assertEquals(result.usedRetry, false);
    assert(
      result.repairDiag?.repairs.some((r) =>
        r.endsWith("catalogue_title_restored_exact_protocol")
      ),
    );
  } finally {
    globalThis.fetch = previous;
  }
});
Deno.test("real intent changes, excessive/diluted intensity, out-of-range duration and unknown IDs still fail", async () => {
  const previous = globalThis.fetch;
  try {
    for (
      const session of [
        { ...base, title: "Technique éducatifs", durationMin: 20 },
        { ...base, title: "Technique éducatifs", zones: ["Z4"] },
        { ...base, title: "Technique éducatifs", details: "30min éducatifs" },
        { ...base, zones: ["Z4"], details: "60min Z4" },
        { ...base, durationMin: 20 },
        { ...base, catalogId: "INVENTED" },
      ]
    ) {
      globalThis.fetch = async () => ok(chunk(session));
      await assertRejects(() => generateChunkJSON(args), ChunkGenerationError);
    }
    const hard = {
      ...fiche,
      id: "SYNTHETIC_HARD",
      intentFamily: "seuil" as const,
      mainZoneMax: 4,
      zones: ["Z4"],
    };
    assert(
      !buildPlanChunkSchema([hard.id], {
        catalogueContractsByWeek: { 1: { ...contracts[1], catalog: [hard] } },
      }).safeParse(chunk({ ...base, catalogId: hard.id })).success,
    );
  } finally {
    globalThis.fetch = previous;
  }
});
Deno.test("HTTP400 fallback keeps technical parameter evidence without free-text leakage in logs or exports", async () => {
  const previous = globalThis.fetch, warn = console.warn, error = console.error;
  const logs: string[] = [];
  console.warn = (...x) => logs.push(x.join(" "));
  console.error = (...x) => logs.push(x.join(" "));
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    const b = JSON.parse(String(init?.body));
    return b.response_format.type === "json_schema"
      ? new Response(
        JSON.stringify({
          error: {
            status: "INVALID_ARGUMENT",
            param: "response_format.json_schema.schema",
            message:
              'Unsupported field "additionalProperties" PRIVATE_ATHLETE injuryRisk raceGoals',
          },
        }),
        { status: 400 },
      )
      : ok(chunk({ ...base, durationMin: 20 }));
  };
  try {
    const e = await assertRejects(
      () => generateChunkJSON(args),
      ChunkGenerationError,
    ) as ChunkGenerationError;
    const safe = sanitizeSchemaFailure(e.details) as any;
    assertEquals(calls, 4);
    assertEquals(safe.gateway.http400.code, "INVALID_ARGUMENT");
    assertEquals(
      safe.gateway.http400.parameter,
      "response_format.json_schema.schema",
    );
    assert(safe.gateway.http400.keywords.includes("additionalProperties"));
    assert(!JSON.stringify([safe, logs]).includes("PRIVATE_ATHLETE"));
    assert(!JSON.stringify([safe, logs]).includes("injuryRisk"));
    assert(!JSON.stringify([safe, logs]).includes("raceGoals"));
  } finally {
    globalThis.fetch = previous;
    console.warn = warn;
    console.error = error;
  }
});
Deno.test("HTTP403 is not retried as JSON-object fallback and never exports provider free text", async () => {
  const previous = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response("PRIVATE_ATHLETE", { status: 403 });
  };
  try {
    const e = await assertRejects(
      () => generateChunkJSON(args),
      ChunkGenerationError,
    ) as ChunkGenerationError;
    assertEquals(calls, 3);
    assertEquals(e.code, "GATEWAY_ERROR");
    assert(!String(JSON.stringify(e.details)).includes("PRIVATE_ATHLETE"));
  } finally {
    globalThis.fetch = previous;
  }
});

Deno.test("official races remain custom events, never repaired into a catalogue simulation", async () => {
  const previous = globalThis.fetch;
  const event = {
    ...base,
    title: "COURSE : 10 km officielle",
    custom: true,
    catalogId: null,
  };
  globalThis.fetch = async () => ok(chunk(event));
  try {
    const result = await generateChunkJSON(args);
    assertEquals(result.chunk.weeks[0].sessions[0].title, event.title);
    assertEquals(result.chunk.weeks[0].sessions[0].catalogId, null);
  } finally {
    globalThis.fetch = previous;
  }
});
