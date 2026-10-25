#!/usr/bin/env node
// Offline build only. No Supabase/Gemini/client-data requests, deployment or credentials.
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, symlinkSync, cpSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, relative } from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
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
function sourceHash(paths) { return hash(paths.sort().map(p => `${p}\0${hash(readFileSync(join(source,p)))}\n`).join("")); }
const contractPaths = ["supabase/functions/_shared/sessionCatalogueContract.ts", "supabase/functions/_shared/repairSportingEquivalence.ts", "supabase/functions/_shared/raceDayIdentity.ts", "supabase/functions/_shared/intentEvidence.ts", "supabase/functions/ai-training-plan/planSchema.ts", "supabase/functions/ai-training-plan-test/planSchema.ts", "src/lib/plan/planSchema.ts", "src/lib/plan/repairCatalogMetadata.ts", "src/lib/plan/phaseNormalization.ts", "src/lib/workoutCatalogBuilder.ts", "src/engines/plan/sessionSizingMatrix.ts"];
const { createServer, build } = await import("vite");
const previousLog = console.log;
const ssr = await createServer({ configFile: false, root: source, resolve: { alias: { "@": join(source, "src") } }, server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
let catalog;
try { console.log = () => {}; catalog = (await ssr.ssrLoadModule("/src/lib/workoutLibrary.ts")).WorkoutLibrary; }
finally { console.log = previousLog; await ssr.close(); }
const canonical = x => Array.isArray(x) ? x.map(canonical) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().filter(k => x[k] !== undefined).map(k => [k, canonical(x[k])])) : x;
const catalogJSON = JSON.stringify(canonical([...catalog].sort((a,b) => a.id.localeCompare(b.id, "en"))));
writeFileSync(join(out, "catalogue.json"), catalogJSON);
const info = { manifestVersion: 1, attested: true, sourceCommit: commit, contractHash: sourceHash(contractPaths), catalogueHash: hash(catalogJSON), lockHash: sourceHash(["bun.lockb", "package.json", "scripts/preproduction/edge-dependencies.lock"]), sourceEpoch: epoch };
// The source template remains unbuilt in Git; only this archived tree gets an attestation.
const template = readFileSync(join(source,"supabase/functions/_shared/planReleaseInfo.ts"),"utf8");
writeFileSync(join(source,"supabase/functions/_shared/planReleaseInfo.ts"), template.replace(/export const PLAN_RELEASE_INFO: PlanReleaseInfo = [\s\S]*?;/, `export const PLAN_RELEASE_INFO: PlanReleaseInfo = ${JSON.stringify(info)};`));
process.env.SOURCE_DATE_EPOCH = String(epoch);
process.env.TFCL_PLAN_RELEASE_INFO = JSON.stringify(info);
process.env.TZ = "UTC";
await build({ root: source, logLevel: "error" });
writeFileSync(join(source,"dist/plan-release.json"), JSON.stringify(info));
const tar = (name, root, paths) => { const target = join(out, `${name}.tar`); execFileSync("tar", ["--sort=name", `--mtime=@${epoch}`, "--owner=0", "--group=0", "--numeric-owner", "--format=ustar", "-cf", target, "-C", root, ...paths]); return { file: `${name}.tar`, sha256: hash(readFileSync(target)), bytes: readFileSync(target).length }; };
const artifacts = { frontend: tar("frontend", join(source,"dist"), ["."]) };
const deno = process.env.TFCL_DENO_BIN ?? "deno";
const denoVersion = execFileSync(deno, ["--version"], { encoding: "utf8" }).split("\n")[0];
if (denoVersion !== "deno 2.9.6 (stable, release, x86_64-unknown-linux-gnu)") throw new Error("Use pinned Deno 2.9.6 on linux-x64");
const edge = join(stage, "edge"); mkdirSync(join(edge,"supabase/functions"), { recursive: true });
for (const name of ["ai-training-plan", "ai-training-plan-test", "_shared"]) cpSync(join(source,"supabase/functions",name),join(edge,"supabase/functions",name),{ recursive:true });
const edgePackage = join(stage,"edge-package"); mkdirSync(join(edgePackage,"supabase/functions/_shared"),{ recursive:true });
writeFileSync(join(edgePackage,"supabase/functions/_shared/plan-release.json"),JSON.stringify(info));
for (const name of ["ai-training-plan", "ai-training-plan-test"]) {
 const entry = `supabase/functions/${name}/index.ts`;
 mkdirSync(join(edgePackage,"supabase/functions",name), { recursive:true });
 execFileSync(deno, ["bundle", "--platform=deno", "--node-modules-dir=none", `--lock=${join(source,"scripts/preproduction/edge-dependencies.lock")}`, "--frozen-lockfile", "-o", join(edgePackage,entry), entry], { cwd:edge, stdio:["ignore","pipe","pipe"] });
 const bundle = readFileSync(join(edgePackage,entry),"utf8");
 if (bundle.includes(stage) || /(?:from\s*|import\s*\()\s*["'](?:https?:|npm:|jsr:)/.test(bundle)) throw new Error("Unclosed or path-dependent edge bundle");
 artifacts[name] = tar(name,edgePackage,[entry,"supabase/functions/_shared/plan-release.json"]);
}
const dependencies = hash(files(resolve(repo,"node_modules/vite")).filter(p => !p.includes("node_modules/.cache")).map(p => relative(repo,p)+"\0"+hash(readFileSync(p))).join("\n"));
const manifest = { ...info, sourceArchiveSha256: hash(readFileSync(archive)), catalogueEntries: catalog.length, toolchain: { node: process.version, deno: denoVersion, vite: require("vite/package.json").version, viteInstallationSha256: dependencies }, artifacts,
  edgePackaging: "Deno bundles with shared and remote/npm libraries closed using the frozen edge dependency lock; node:/Deno builtins remain runtime-provided. Not a deployed-version attestation.",
  rollback: { frontendPublicationId: null, productionDeploymentId: null, testDeploymentId: null, status: "unattested" } };
writeFileSync(join(out,"manifest.json"), JSON.stringify(manifest,null,2)+"\n");
console.log(JSON.stringify({ out, sourceCommit: commit, catalogueHash: info.catalogueHash, artifacts }));
