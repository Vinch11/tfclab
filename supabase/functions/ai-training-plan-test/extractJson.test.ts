import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractJsonPayload } from "./extractJson.ts";

Deno.test("extractJsonPayload — JSON brut, aucun nettoyage", () => {
  const raw = `{"a":1,"b":[2,3]}`;
  const { json, unwrapped } = extractJsonPayload(raw);
  assertEquals(unwrapped, false);
  assertEquals(JSON.parse(json).a, 1);
});

Deno.test("extractJsonPayload — fence ```json ... ``` supprimée", () => {
  const raw = "```json\n{\"x\":42}\n```";
  const { json, unwrapped } = extractJsonPayload(raw);
  assertEquals(unwrapped, true);
  assertEquals(JSON.parse(json).x, 42);
});

Deno.test("extractJsonPayload — fence ``` sans langage", () => {
  const raw = "Voici ta réponse :\n```\n{\"y\":\"ok\"}\n```\nMerci !";
  const { json, unwrapped } = extractJsonPayload(raw);
  assertEquals(unwrapped, true);
  assertEquals(JSON.parse(json).y, "ok");
});

Deno.test("extractJsonPayload — préambule + suffixe texte, substring équilibré", () => {
  const raw = `Voici le plan JSON :\n{"weeks":[{"n":1},{"n":2}]}\nFin.`;
  const { json, unwrapped } = extractJsonPayload(raw);
  assertEquals(unwrapped, true);
  const parsed = JSON.parse(json);
  assertEquals(parsed.weeks.length, 2);
});

Deno.test("extractJsonPayload — JSON tronqué (non équilibré) → throw", () => {
  const raw = `Préambule\n{"weeks":[{"n":1},{"n":2}`;
  assertThrows(
    () => extractJsonPayload(raw),
    Error,
    "non équilibré",
  );
});
