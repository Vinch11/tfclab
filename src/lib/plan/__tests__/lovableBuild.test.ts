import { afterAll, describe, expect, it } from "vitest";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { assertSameDeclaration, calculatePlanRelease, checkedPlanRelease, readDeclaration } from "../../../../scripts/preproduction/plan-release-source.mjs";

const root = process.cwd();
const temp = mkdtempSync(join(tmpdir(), "tfcl-lovable-source-test-"));
for (const name of ["src", "supabase/functions/_shared", "supabase/functions/ai-training-plan", "supabase/functions/ai-training-plan-test", "scripts/preproduction", "vite.config.ts", "package.json", "bun.lockb"]) {
  cpSync(join(root, name), join(temp, name), { recursive: true });
}
symlinkSync(resolve(root, "node_modules"), join(temp, "node_modules"), "dir");
afterAll(() => rmSync(temp, { recursive: true, force: true }));

describe("Lovable build fingerprints its actual checkout, without Git or preparation script", () => {
  it("recomputes the committed declaration from the catalogue and all three source components", async () => {
    expect(existsSync(join(temp, ".git"))).toBe(false);
    const computed = await checkedPlanRelease(temp);
    expect(computed.info).toEqual(readDeclaration(root));
    expect(computed.catalogueEntries).toBe(920);
    expect(computed.info.provenance).toBe("declared-source");
    expect(computed.info.attested).toBe(false);
    expect(computed.info.sourceCommit).toBeNull();
  }, 20000);

  it("ignores only Lovable's injected Tailwind metadata, without changing any fingerprint", async () => {
    const injected = join(temp, "src/tailwind.config.lov.json");
    try {
      for (const content of ['{}', '{"theme":{"extend":{"colors":{"synthetic":"#123456"}}}}']) {
        writeFileSync(injected, content);
        expect((await checkedPlanRelease(temp)).info).toEqual(readDeclaration(root));
      }
    } finally { rmSync(injected, { force: true }); }
  }, 20000);

  it("still fingerprints other JSON, frontend sources and both server components", async () => {
    const declared = readDeclaration(root);
    const addedJSON = join(temp, "src/synthetic-critical-config.json");
    try {
      writeFileSync(addedJSON, '{}');
      await expect(checkedPlanRelease(temp)).rejects.toThrow("PLAN_RELEASE_DECLARATION_STALE");
    } finally { rmSync(addedJSON, { force: true }); }
    for (const [file, component] of [
      ["src/App.tsx", "frontend"],
      ["supabase/functions/ai-training-plan/index.ts", "ai-training-plan"],
      ["supabase/functions/ai-training-plan-test/index.ts", "ai-training-plan-test"],
    ] as const) {
      const path = join(temp, file);
      const original = readFileSync(path, "utf8");
      try {
        writeFileSync(path, `${original}\n// synthetic drift\n`);
        const changed = await calculatePlanRelease(temp);
        expect(changed.info.components[component]).not.toBe(declared.components[component]);
        expect(() => assertSameDeclaration(declared, changed.info)).toThrow("PLAN_RELEASE_DECLARATION_STALE");
      } finally { writeFileSync(path, original); }
    }
  }, 20000);

  it("rejects stale contract sources and modified effective catalogue instead of widening compatibility", async () => {
    const contract = join(temp, "supabase/functions/_shared/repairSportingEquivalence.ts");
    const original = readFileSync(contract, "utf8");
    writeFileSync(contract, `${original}\n// synthetic source drift\n`);
    await expect(checkedPlanRelease(temp)).rejects.toThrow("PLAN_RELEASE_DECLARATION_STALE");
    writeFileSync(contract, original);
    const catalogue = join(temp, "src/lib/workoutLibrary.ts");
    const before = readFileSync(catalogue, "utf8");
    writeFileSync(catalogue, `${before}\nWorkoutLibrary[0].title += " synthetic mutation";\n`);
    const changed = await calculatePlanRelease(temp);
    expect(changed.info.catalogueHash).not.toBe(readDeclaration(root).catalogueHash);
    expect(() => assertSameDeclaration(readDeclaration(root), changed.info)).toThrow("PLAN_RELEASE_DECLARATION_STALE");
    writeFileSync(catalogue, before);
  }, 20000);

  it("an arbitrary archive environment/SHA cannot substitute different contract fingerprints", async () => {
    const declared = readDeclaration(root);
    await expect(checkedPlanRelease(temp, { ...declared, attested: true, provenance: "archived-source", sourceCommit: "a".repeat(40), sourceEpoch: 1, contractHash: "f".repeat(64) })).rejects.toThrow("PLAN_RELEASE_DECLARATION_STALE");
  }, 20000);
});
