/**
 * Verrouille l'égalité stricte des schémas Zod client ↔ edge.
 * Toute divergence (nouveau champ non miroité, tuple modifié) fait échouer le test.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirnameLocal = path.dirname(__filename);

function normalize(src: string): string {
  return src
    // strip banner block comment
    .replace(/^[\s\S]*?\*\//, "")
    // strip import lines (client uses "zod", edge uses esm.sh URL)
    .replace(/^import[^\n]*\n/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

describe("payloadSchema mirror", () => {
  it("client and edge schemas are byte-equal after normalization", () => {
    const client = fs.readFileSync(path.resolve(__dirnameLocal, "../payloadSchema.ts"), "utf-8");
    const edge = fs.readFileSync(
      path.resolve(__dirnameLocal, "../../../../supabase/functions/ai-training-plan/payloadSchema.ts"),
      "utf-8",
    );
    expect(normalize(client)).toBe(normalize(edge));
  });
});
