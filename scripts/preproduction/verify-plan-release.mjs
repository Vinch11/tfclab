import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
export function verifyRelease(path) {
 const manifest = JSON.parse(readFileSync(path, "utf8"));
 if (!manifest.attested || !/^[a-f0-9]{40}$/.test(manifest.sourceCommit ?? "")) throw new Error("Unattested source");
 const keys = ["sourceCommit","contractHash","catalogueHash","lockHash","sourceEpoch"];
 for (const name of ["frontend","ai-training-plan","ai-training-plan-test"]) {
  const artifact = manifest.artifacts[name];
  if (!artifact || artifact.file !== `${name}.tar`) throw new Error("Unexpected artifact path");
  const file = resolve(dirname(path), artifact.file), content = readFileSync(file);
  if (createHash("sha256").update(content).digest("hex") !== artifact.sha256 || content.length !== artifact.bytes) throw new Error(`Artifact checksum mismatch: ${name}`);
  const text = execFileSync("tar", ["-xOf", file, name === "frontend" ? "./plan-release.json" : "supabase/functions/_shared/plan-release.json"], { encoding: "utf8" });
  const info = JSON.parse(text);
  if (!info.attested || keys.some(key => info[key] !== manifest[key])) throw new Error(`Mixed release: ${name}`);
 }
 const catalog = readFileSync(resolve(dirname(path), "catalogue.json"));
 if (createHash("sha256").update(catalog).digest("hex") !== manifest.catalogueHash) throw new Error("Catalogue checksum mismatch");
 return manifest;
}
if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
 const one = verifyRelease(resolve(process.argv[2]));
 if (process.argv[3]) {
  const two = verifyRelease(resolve(process.argv[3]));
  if (JSON.stringify(one.artifacts) !== JSON.stringify(two.artifacts) || one.catalogueHash !== two.catalogueHash || one.sourceCommit !== two.sourceCommit) throw new Error("Non-reproducible release");
 }
 console.log(JSON.stringify({ verified: true, sourceCommit: one.sourceCommit }));
}
