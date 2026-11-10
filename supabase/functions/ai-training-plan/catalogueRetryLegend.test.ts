import { assert, assertEquals } from "jsr:@std/assert";
import { catalogueRetryLegend } from "./generateChunkJSON.ts";
Deno.test("legend explains sport and intensity codes", () => {
  const out = catalogueRetryLegend("- weeks.1.sessions.1.catalogId: catalogue_prescription_incompatible:catalogue_sport\n- x: catalogue_prescription_incompatible:catalogue_intensity_exceeded");
  assert(out.includes("MÊME sport")); assert(out.includes("moins intense"));
  assertEquals(catalogueRetryLegend("- weeks: Required"), "");
});
