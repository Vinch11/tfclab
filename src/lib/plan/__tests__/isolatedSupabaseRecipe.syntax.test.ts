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
    for (const name of ["athleteA", "athleteB", "test", "snapshot", "snapshotB", "v1", "v2"]) {
      expect(source).toContain(`${name}: randomUUID()`);
    }
    expect(source).toContain("Cross-coach plan UPSERT accepted");
    expect(source).toContain("Cross-coach upsert modified coach A plan");
    expect(source).toContain("Cross-coach active snapshot UPDATE accepted");
    expect(source).toContain("Cross-coach snapshot replaced A active profile");
    expect(source).toContain("independentResidueAuditRequired: true");
  });

  it("supports Lovable QA user-scoped JWT files without service-role keys", () => {
    const source = readFileSync(recipe, "utf8");
    for (const required of [
      "TFCL_RECETTE_AUTH_MODE", "token-file",
      "TFCL_RECETTE_COACH_A_TOKEN_FILE", "TFCL_RECETTE_COACH_B_TOKEN_FILE",
      "statSync", "data.user.email", "db.auth.getUser(accessToken)",
      "Authorization: `Bearer ${accessToken}`",
    ]) expect(source).toContain(required);
    expect(source).toContain("Token file is readable by other users");
    expect(source).not.toContain("service_role:");
  });

  it("requires RLS to be enabled before candidate SQL policies can be applied", () => {
    const candidate = readFileSync(resolve(process.cwd(),
      "docs/qa/DET_RLS_ATHLETE_OWNER_CANDIDATE.sql"), "utf8");
    expect(candidate).toContain("relrowsecurity");
    expect(candidate).toContain("TFCL_RLS_PREFLIGHT_RLS_DISABLED_OR_TABLE_MISSING");
    expect(candidate).toContain("ADD CONSTRAINT plan_versions_athlete_id_fkey");
    expect(candidate).toContain("ON DELETE CASCADE");
    expect(candidate).toContain("tfcl_p0_snapshot_owner_unique");
    expect(candidate).toContain("tfcl_p0_active_snapshot_owned");
    expect(candidate).toContain("TFCL_RLS_PREFLIGHT_ACTIVE_SNAPSHOT_OWNER_MISMATCH");
    expect(candidate).toContain("DEFERRABLE INITIALLY DEFERRED");
    for (const tag of ["ownership_preflight", "plan_version_fk_preflight", "active_snapshot_fk_preflight"]) {
      expect(candidate).toContain(`END;\n${tag}$;`);
    }
  });
});
