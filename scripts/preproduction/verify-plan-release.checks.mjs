import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { verifyRelease } from "./verify-plan-release.mjs";
const hash = x => createHash("sha256").update(x).digest("hex");
function fixture(mixed = false, version = 1) {
 const dir = mkdtempSync(join(tmpdir(), "tfcl-manifest-test-"));
 const catalogue = "[]";
 const info = { manifestVersion: 1, attested: true, sourceCommit: "a".repeat(40), contractHash: "b".repeat(64), catalogueHash: hash(catalogue), lockHash: "d".repeat(64), sourceEpoch: 1 };
 if (version === 2) Object.assign(info, { manifestVersion: 2, deploymentAttested: false, releaseId: "f".repeat(64), provenance: "archived-source", components: { frontend: "a".repeat(64), "ai-training-plan": "b".repeat(64), "ai-training-plan-test": "c".repeat(64) } });
 const artifacts = {};
 for (const name of ["frontend","ai-training-plan","ai-training-plan-test"]) {
  const root = join(dir,name); mkdirSync(root);
  if (name === "frontend") writeFileSync(join(root,"plan-release.json"), JSON.stringify(info));
  else {
   mkdirSync(join(root,"supabase/functions/_shared"), { recursive: true });
   const altered = mixed && name === "ai-training-plan-test" ? version === 1 ? { ...info, sourceCommit: "e".repeat(40) }
     : mixed === "component" ? { ...info, components: { ...info.components, frontend: "e".repeat(64) } } : { ...info, releaseId: "e".repeat(64) } : info;
   writeFileSync(join(root,"supabase/functions/_shared/plan-release.json"), JSON.stringify(altered));
  }
  execFileSync("tar", ["-cf",join(dir,`${name}.tar`),"-C",root,...(name === "frontend" ? ["."] : ["supabase/functions/_shared"])]);
  const bytes = readFileSync(join(dir,`${name}.tar`));
  artifacts[name] = { file: `${name}.tar`, sha256: hash(bytes), bytes: bytes.length };
 }
 writeFileSync(join(dir,"catalogue.json"), catalogue);
 const path = join(dir,"manifest.json"); writeFileSync(path,JSON.stringify({ ...info, artifacts }));
 return { dir, path };
}
test("reject a mixed server release even when tar checksums are correct", () => {
 const { path } = fixture(true); assert.throws(() => verifyRelease(path), /Mixed release/);
});
test("reject corrupted artifacts", () => {
 const { dir, path } = fixture(); writeFileSync(join(dir,"frontend.tar"), "corrupted");
 assert.throws(() => verifyRelease(path), /checksum/);
});

test("accept a coherent three-artifact release", () => {
 const { path } = fixture(); assert.equal(verifyRelease(path).sourceCommit, "a".repeat(40));
});
test("v2 archives reject a mixed release identity with correct checksums", () => {
 assert.throws(() => verifyRelease(fixture(true, 2).path), /Mixed release/);
});
test("v2 archives reject mismatched component fingerprints", () => {
 assert.throws(() => verifyRelease(fixture("component", 2).path), /Mixed release/);
});
test("v2 coherent archives retain archive source provenance", () => {
 assert.equal(verifyRelease(fixture(false, 2).path).provenance, "archived-source");
});
