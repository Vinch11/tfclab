import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const recipe = resolve(process.cwd(), "scripts/qa/isolated-supabase-recette.mjs");

describe("isolated Supabase two-coach recipe — offline integrity", () => {
  it("is parseable Node ESM without accessing any database", () => {
    expect(existsSync(recipe)).toBe(true);
    expect(() => execFileSync(process.execPath, ["--check", recipe], {
      timeout: 10000, stdio: "pipe", encoding: "utf8",
    })).not.toThrow();
  });

  it("requires explicit isolated URL and synthetic write authorization", () => {
    const source = readFileSync(recipe, "utf8");
    for (const key of [
      "TFCL_RECETTE_SUPABASE_URL",
      "TFCL_RECETTE_APPROVED_URL",
      "TFCL_PRODUCTION_SUPABASE_URL",
      "TFCL_RECETTE_WRITE_ACK",
      "I_AUTHORIZE_SYNTHETIC_ISOLATED_WRITES",
      "TFCL_RECETTE_COACH_A_EMAIL",
      "TFCL_RECETTE_COACH_B_EMAIL",
    ]) expect(source).toContain(key);
    expect(source).not.toMatch(/createClient\([^)]*service_role/i);
  });

  it("preallocates synthetic IDs and probes cross-coach upsert without production", () => {
    const source = readFileSync(recipe, "utf8");
    for (const name of ["athleteA", "athleteB", "test", "snapshot", "v1", "v2"]) {
      expect(source).toContain(`${name}: randomUUID()`);
    }
    expect(source).toContain("Cross-coach plan UPSERT accepted");
    expect(source).toContain("Cross-coach upsert modified coach A plan");
    expect(source).toContain("independentResidueAuditRequired: true");
  });
});
