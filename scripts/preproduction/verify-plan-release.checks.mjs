import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { verifyRelease } from "./verify-plan-release.mjs";
const hash = x => createHash("sha256").update(x).digest("hex");
function fixture(mixed = false) {
 const dir = mkdtempSync(join(tmpdir(), "tfcl-manifest-test-"));
 const catalogue = "[]";
 const info = { manifestVersion: 1, attested: true, sourceCommit: "a".repeat(40), contractHash: "b".repeat(64), catalogueHash: hash(catalogue), lockHash: "d".repeat(64), sourceEpoch: 1 };
 const artifacts = {};
 for (const name of ["frontend","ai-training-plan","ai-training-plan-test"]) {
  const root = join(dir,name); mkdirSync(root);
  if (name === "frontend") writeFileSync(join(root,"plan-release.json"), JSON.stringify(info));
  else {
   mkdirSync(join(root,"supabase/functions/_shared"), { recursive: true });
   writeFileSync(join(root,"supabase/functions/_shared/plan-release.json"), JSON.stringify(mixed && name === "ai-training-plan-test" ? { ...info, sourceCommit: "e".repeat(40) } : info));
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
