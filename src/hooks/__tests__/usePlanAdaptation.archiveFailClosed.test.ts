import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Structural regression guard. The end-to-end Supabase failure-path proof is
// tracked separately in QA PR #455; this test does not simulate a database.
const source = readFileSync(resolve(process.cwd(), "src/hooks/usePlanAdaptation.ts"), "utf8");

describe("adaptation persistence — fail-closed archive", () => {
  it("rejects an unsuccessful plan_versions INSERT before overwriting plans", () => {
    const archiveStart = source.indexOf("const archive = useCallback(");
    const nextSection = source.indexOf("OPTION 1 — Patch déterministe", archiveStart);
    expect(archiveStart).toBeGreaterThanOrEqual(0);
    expect(nextSection).toBeGreaterThan(archiveStart);
    const archiveBody = source.slice(archiveStart, nextSection);
    expect(archiveBody).toContain('const { error } = await supabase.from("plan_versions").insert([');
    expect(archiveBody).toContain("if (error) throw error;");
  });

  it("archives before persisting both adaptation modes", () => {
    const calls = source.split("\n")
      .filter((line) => line.includes("await archive(") || line.includes("await persistPlan("))
      .map((line) => line.trim().split("(")[0]);
    expect(calls).toEqual([
      "await archive", "await persistPlan",
      "await archive", "await persistPlan",
    ]);
  });
});
