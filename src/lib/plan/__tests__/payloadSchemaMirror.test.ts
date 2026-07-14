/**
 * Verrouille l'égalité stricte des schémas Zod client ↔ edge.
 * Toute divergence (nouveau champ non miroité, tuple modifié) fait échouer le test.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function normalize(src: string): string {
  return src
    // strip banner comment (may differ slightly)
    .replace(/^[\s\S]*?\*\//, "")
    // strip import lines (client uses "zod", edge uses esm.sh URL)
    .replace(/^import[^\n]*\n/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

describe("payloadSchema mirror", () => {
  it("client and edge schemas are byte-equal after normalization", () => {
    const client = readFileSync(resolve(__dirname, "../payloadSchema.ts"), "utf-8");
    const edge = readFileSync(
      resolve(__dirname, "../../../../supabase/functions/ai-training-plan/payloadSchema.ts"),
      "utf-8",
    );
    expect(normalize(client)).toBe(normalize(edge));
  });
});
