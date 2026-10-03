import { assertEquals } from "jsr:@std/assert@1";
import { normName } from "./index.ts";

Deno.test("normName — minuscule + trim, pour un matching insensible à la casse/espaces", () => {
  assertEquals(normName("  Jean DUPONT  "), "jean dupont");
  assertEquals(normName("Marie"), "marie");
});

Deno.test("normName — null/undefined → chaîne vide", () => {
  assertEquals(normName(null), "");
  assertEquals(normName(undefined), "");
});

Deno.test("normName — deux variantes de casse/espacement d'un même nom matchent après normalisation", () => {
  assertEquals(normName("Jean Dupont"), normName("  JEAN DUPONT  "));
});
