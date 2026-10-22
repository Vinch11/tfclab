import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { generateChunkJSON } from "./generateChunkJSON.ts";

// Chunk minimal valide : 1 semaine, 1 séance repos (pas de catalogId requis)
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

Deno.test("generateChunkJSON — utilise extractJsonPayload (sortie fenced markdown)", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  const fencedContent = "```json\n" + JSON.stringify(minimalChunk) + "\n```";

  globalThis.fetch = ((_url: string, _init?: RequestInit) => {
    fetchCalls++;
    return Promise.resolve(new Response(
      JSON.stringify({
        choices: [{
          message: { content: fencedContent },
          finish_reason: "stop",
        }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
  }) as typeof fetch;

  try {
    const result = await generateChunkJSON({
      apiKey: "test-key",
      model: "test-model",
      systemPrompt: "sys",
      userPrompt: "usr",
      allowedCatalogIds: [],
      chunkIndex: 0,
      schemaOptions: { expectedWeekCount: 1, isFirstChunk: false },
    });
    assertEquals(result.usedRetry, false);
    assertEquals(result.chunk.weeks.length, 1);
    assertEquals(result.chunk.weeks[0].sessions[0].sport, "rest");
    assertEquals(fetchCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
