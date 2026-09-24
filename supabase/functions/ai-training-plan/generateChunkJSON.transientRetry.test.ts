import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { generateChunkJSON, ChunkGenerationError } from "./generateChunkJSON.ts";

// Audit coach (plan Manu 40 sem) : avant ce fix, un statut 429/gateway/troncature
// sur le tout premier appel gateway tuait le chunk immédiatement (0 retry), ce qui
// déclenchait le repli silencieux côté client vers le Markdown legacy (désormais
// supprimé). Ces tests vérifient que generateChunkJSON absorbe maintenant quelques
// erreurs transitoires avant d'abandonner, sans jamais retenter CREDITS.

const minimalChunk = {
  weeks: [
    {
      weekNumber: 1,
      phase: "base",
      theme: "Test",
      sessions: [
        {
          day: "lundi",
          sport: "rest",
          title: "Repos",
          details: "",
          isKeySession: false,
          custom: true,
          catalogId: null,
          durationMin: 0,
          zones: [],
        },
      ],
    },
  ],
};

function okResponse() {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: JSON.stringify(minimalChunk) }, finish_reason: "stop" }] }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

Deno.test("generateChunkJSON — un 429 isolé est retenté et le chunk réussit ensuite", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = (() => {
    fetchCalls++;
    if (fetchCalls === 1) {
      return Promise.resolve(new Response("rate limited", { status: 429 }));
    }
    return Promise.resolve(okResponse());
  }) as typeof fetch;

  try {
    const result = await generateChunkJSON({
      apiKey: "test-key", model: "test-model", systemPrompt: "sys", userPrompt: "usr",
      allowedCatalogIds: [], chunkIndex: 0,
      schemaOptions: { expectedWeekCount: 1, isFirstChunk: false },
    });
    assertEquals(fetchCalls, 2);
    assertEquals(result.usedRetry, false); // usedRetry = retry Zod, pas le retry transitoire
    assertEquals(result.chunk.weeks.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("generateChunkJSON — CREDITS (402) n'est jamais retenté (échec immédiat)", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = (() => {
    fetchCalls++;
    return Promise.resolve(new Response("no credits", { status: 402 }));
  }) as typeof fetch;

  try {
    await assertRejects(
      () => generateChunkJSON({
        apiKey: "test-key", model: "test-model", systemPrompt: "sys", userPrompt: "usr",
        allowedCatalogIds: [], chunkIndex: 0,
        schemaOptions: { expectedWeekCount: 1, isFirstChunk: false },
      }),
      ChunkGenerationError,
    );
    assertEquals(fetchCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("generateChunkJSON — RATE_LIMIT persistant épuise les retries transitoires puis échoue", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = (() => {
    fetchCalls++;
    return Promise.resolve(new Response("rate limited", { status: 429 }));
  }) as typeof fetch;

  try {
    let caught: unknown;
    try {
      await generateChunkJSON({
        apiKey: "test-key", model: "test-model", systemPrompt: "sys", userPrompt: "usr",
        allowedCatalogIds: [], chunkIndex: 0,
        schemaOptions: { expectedWeekCount: 1, isFirstChunk: false },
      });
    } catch (e) {
      caught = e;
    }
    if (!(caught instanceof ChunkGenerationError) || caught.code !== "RATE_LIMIT") {
      throw new Error(`attendu ChunkGenerationError(RATE_LIMIT), reçu: ${String(caught)}`);
    }
    // 1 tentative initiale + 2 retries transitoires (TRANSIENT_RETRY_DELAYS_MS) = 3 appels,
    // puis abandon avant même d'atteindre le retry Zod (pas de 2e vague de 3 appels).
    assertEquals(fetchCalls, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
