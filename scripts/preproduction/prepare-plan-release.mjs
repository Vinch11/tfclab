#!/usr/bin/env node
// Offline build only. No Supabase/Gemini/client-data requests, deployment or credentials.
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, symlinkSync, cpSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, relative } from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { checkedPlanRelease, declarationText, manifestPath } from "./plan-release-source.mjs";
process.env.NODE_ENV = "production";
process.env.TZ = "UTC";
const args = process.argv.slice(2), value = key => args[args.indexOf(key) + 1];
const repo = process.cwd(), commit = execFileSync("git", ["rev-parse", `${args.includes("--commit") ? value("--commit") : "HEAD"}^{commit}`], { encoding: "utf8" }).trim();
const epoch = Number(execFileSync("git", ["show", "-s", "--format=%ct", commit], { encoding: "utf8" }).trim());
const out = resolve(args.includes("--out") ? value("--out") : join(tmpdir(), `tfcl-release-${commit}`));
if (existsSync(out) && readdirSync(out).length) throw new Error("Output must be empty (no overwrite)");
mkdirSync(out, { recursive: true });
const stage = mkdtempSync(join(tmpdir(), "tfcl-release-"));
const archive = join(stage, "source.tar");
writeFileSync(archive, execFileSync("git", ["archive", commit], { maxBuffer: 128 * 1024 * 1024 }));
const source = join(stage, "source"); mkdirSync(source);
execFileSync("tar", ["-xf", archive, "-C", source]);
// Dependency resolution is separate from source identity. Frozen-install CI supplies node_modules.
symlinkSync(resolve(repo, "node_modules"), join(source, "node_modules"), "dir");
const require = createRequire(join(repo, "package.json"));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
function files(dir) { return readdirSync(dir, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name, "en")).flatMap(e => e.isDirectory() ? files(join(dir,e.name)) : [join(dir,e.name)]); }
const { build } = await import("vite");
const lexer = await import(createRequire(require.resolve("vite/package.json")).resolve("es-module-lexer"));
await lexer.init;
const computed = await checkedPlanRelease(source);
const { catalogJSON } = computed;
writeFileSync(join(out, "catalogue.json"), catalogJSON);
const info = { ...computed.info, attested: true, provenance: "archived-source", sourceCommit: commit, sourceEpoch: epoch };
writeFileSync(join(source, manifestPath), declarationText(info));
process.env.SOURCE_DATE_EPOCH = String(epoch);
process.env.TFCL_PLAN_RELEASE_INFO = JSON.stringify(info);
process.env.TZ = "UTC";
await build({ root: source, logLevel: "error" });
for (const file of files(join(source,"dist")).filter(f => /\.(js|html)$/.test(f))) if (readFileSync(file,"utf8").includes(stage)) throw new Error("Path-dependent frontend output");
writeFileSync(join(source,"dist/plan-release.json"), JSON.stringify(info));
const tar = (name, root, paths) => { const target = join(out, `${name}.tar`); execFileSync("tar", ["--sort=name", "--mode=u+rwX,go+rX,go-w", `--mtime=@${epoch}`, "--owner=0", "--group=0", "--numeric-owner", "--format=ustar", "-cf", target, "-C", root, ...paths]); return { file: `${name}.tar`, sha256: hash(readFileSync(target)), bytes: readFileSync(target).length }; };
const artifacts = { frontend: tar("frontend", join(source,"dist"), ["."]) };
const deno = process.env.TFCL_DENO_BIN ?? "deno";
const denoVersion = execFileSync(deno, ["--version"], { encoding: "utf8" }).split("\n")[0];
if (denoVersion !== "deno 2.9.6 (stable, release, x86_64-unknown-linux-gnu)") throw new Error("Use pinned Deno 2.9.6 on linux-x64");
const edge = join(stage, "edge"); mkdirSync(join(edge,"supabase/functions"), { recursive: true });
for (const name of ["ai-training-plan", "ai-training-plan-test", "_shared"]) cpSync(join(source,"supabase/functions",name),join(edge,"supabase/functions",name),{ recursive:true });
const runtimeImports = {};
const edgePackage = join(stage,"edge-package"); mkdirSync(join(edgePackage,"supabase/functions/_shared"),{ recursive:true });
writeFileSync(join(edgePackage,"supabase/functions/_shared/plan-release.json"),JSON.stringify(info));
for (const name of ["ai-training-plan", "ai-training-plan-test"]) {
 const entry = `supabase/functions/${name}/index.ts`;
 mkdirSync(join(edgePackage,"supabase/functions",name), { recursive:true });
 execFileSync(deno, ["bundle", "--minify", "--platform=deno", "--node-modules-dir=none", `--lock=${join(source,"scripts/preproduction/edge-dependencies.lock")}`, "--frozen-lockfile", "-o", join(edgePackage,entry), entry], { cwd:edge, stdio:["ignore","pipe","pipe"] });
 const bundle = readFileSync(join(edgePackage,entry),"utf8");
 const imports = lexer.parse(bundle)[0].filter(i => i.d !== -2);
 runtimeImports[name] = { imports: imports.map(i => i.n ?? "dynamic-runtime"), unresolvedDynamic: imports.filter(i => i.n === undefined).length };
 if (bundle.includes(stage) || bundle.includes(".cache/deno/") || imports.some(i => /^(https?:|npm:|jsr:)/.test(i.n ?? ""))) throw new Error("Unclosed or path-dependent edge bundle");
 artifacts[name] = tar(name,edgePackage,[entry,"supabase/functions/_shared/plan-release.json"]);
}
const dependencies = hash(files(resolve(repo,"node_modules/vite")).filter(p => !p.includes("node_modules/.cache")).map(p => relative(repo,p)+"\0"+hash(readFileSync(p))).join("\n"));
const manifest = { ...info, sourceArchiveSha256: hash(readFileSync(archive)), catalogueEntries: computed.catalogueEntries, toolchain: { node: process.version, nodeEnv: process.env.NODE_ENV, deno: denoVersion, vite: require("vite/package.json").version, viteInstallationSha256: dependencies }, artifacts,
  runtimeImports, edgePackaging: "Deno bundles with shared and remote/npm libraries closed using the frozen edge dependency lock; node:/Deno builtins remain runtime-provided. Not a deployed-version attestation.",
  rollback: { frontendPublicationId: null, productionDeploymentId: null, testDeploymentId: null, status: "unattested" } };
writeFileSync(join(out,"manifest.json"), JSON.stringify(manifest,null,2)+"\n");
console.log(JSON.stringify({ out, sourceCommit: commit, catalogueHash: info.catalogueHash, artifacts }));
