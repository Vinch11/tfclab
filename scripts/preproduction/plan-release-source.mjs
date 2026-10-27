// Build/CI only. No credentials, runtime requests or Git required by Lovable.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createHttpServer } from "node:http";

export const manifestPath = "supabase/functions/_shared/planReleaseManifest.ts";
const hash = value => createHash("sha256").update(value).digest("hex");
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, canonical(value[key])])) : value;
const contractPaths = ["supabase/functions/_shared/planPrevalidation.ts", "supabase/functions/_shared/planningFeasibility.ts", "supabase/functions/_shared/prevalidateTransport.ts", "src/lib/plan/prepareGenerationContracts.ts", "src/lib/plan/prevalidateTrainingPlan.ts", "src/lib/plan/catalogScope.ts", "supabase/functions/_shared/sessionCatalogueContract.ts", "supabase/functions/_shared/catalogueWeeklyFrequency.ts", "supabase/functions/_shared/repairSportingEquivalence.ts", "supabase/functions/_shared/raceDayIdentity.ts", "supabase/functions/_shared/intentEvidence.ts", "supabase/functions/ai-training-plan/planSchema.ts", "supabase/functions/ai-training-plan-test/planSchema.ts", "src/lib/plan/planSchema.ts", "src/lib/plan/repairCatalogMetadata.ts", "src/lib/plan/phaseNormalization.ts", "src/lib/workoutCatalogBuilder.ts", "src/engines/plan/sessionSizingMatrix.ts"];
// Exact, versioned inventory of environment-only metadata. No glob exclusions:
// this Lovable Tailwind editor file is not imported by the runtime or contracts.
// Changes to actual source/configuration remain hashed, including this inventory.
const environmentOnlyFiles = new Set(["src/tailwind.config.lov.json"]);
function runtimeFiles(root, folder) {
  return readdirSync(join(root, folder), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, "en"))
    .filter(entry => !["__tests__", "__e2e", "test"].includes(entry.name))
    .flatMap(entry => entry.isDirectory() ? runtimeFiles(root, join(folder, entry.name)) : [join(folder, entry.name)])
    .filter(file => /\.(ts|tsx|js|json|css)$/.test(file) && !/\.(test|spec)\./.test(file) && file !== manifestPath && !environmentOnlyFiles.has(file));
}
const sourceHash = (root, paths) => hash([...paths].sort().map(file => `${file}\0${hash(readFileSync(join(root, file)))}\n`).join(""));
export function declarationText(info) {
  return `// Generated source declaration, NOT an attestation of deployed bytes. CI/build must check freshness.\nexport const CHECKED_IN_PLAN_RELEASE_INFO = ${JSON.stringify(info, null, 2)} as const;\n`;
}
export function readDeclaration(root) {
  const match = readFileSync(join(root, manifestPath), "utf8").match(/export const CHECKED_IN_PLAN_RELEASE_INFO = ([\s\S]*?) as const;/);
  if (!match) throw new Error("PLAN_RELEASE_DECLARATION_INVALID");
  return JSON.parse(match[1]);
}
export function assertSameDeclaration(expected, actual) {
  for (const key of ["manifestVersion", "releaseId", "contractHash", "catalogueHash", "lockHash", "components"]) {
    if (JSON.stringify(canonical(expected[key])) !== JSON.stringify(canonical(actual?.[key]))) throw new Error(`PLAN_RELEASE_DECLARATION_STALE:${key}`);
  }
}
export async function calculatePlanRelease(root) {
  const { createServer } = await import("vite");
  const hmrServer = createHttpServer(); // Never listens: no socket needed to evaluate the catalogue.
  const ssr = await createServer({ configFile: false, root, resolve: { alias: { "@": join(root, "src") } },
    server: { middlewareMode: true, watch: null, hmr: { server: hmrServer } }, appType: "custom", logLevel: "error" });
  const oldLog = console.log;
  let catalog;
  try { console.log = () => {}; catalog = (await ssr.ssrLoadModule("/src/lib/workoutLibrary.ts")).WorkoutLibrary; }
  finally { console.log = oldLog; await ssr.close(); }
  const catalogJSON = JSON.stringify(canonical([...catalog].sort((a, b) => a.id.localeCompare(b.id, "en"))));
  const common = runtimeFiles(root, "supabase/functions/_shared");
  const components = {
    frontend: sourceHash(root, [...runtimeFiles(root, "src"), ...common, "vite.config.ts", "scripts/preproduction/plan-release-source.mjs"]),
    "ai-training-plan": sourceHash(root, [...common, ...runtimeFiles(root, "supabase/functions/ai-training-plan")]),
    "ai-training-plan-test": sourceHash(root, [...common, ...runtimeFiles(root, "supabase/functions/ai-training-plan-test")]),
  };
  const identity = { manifestVersion: 2, components, contractHash: sourceHash(root, contractPaths), catalogueHash: hash(catalogJSON),
    lockHash: sourceHash(root, ["bun.lockb", "package.json", "scripts/preproduction/edge-dependencies.lock"]) };
  const info = { ...identity, releaseId: hash(JSON.stringify(canonical(identity))), attested: false, deploymentAttested: false,
    provenance: "declared-source", sourceCommit: null, sourceEpoch: null };
  return { info, catalogJSON, catalogueEntries: catalog.length };
}
export async function checkedPlanRelease(root, override) {
  const computed = await calculatePlanRelease(root);
  assertSameDeclaration(computed.info, readDeclaration(root));
  if (override) {
    assertSameDeclaration(computed.info, override);
    if (override.provenance !== "archived-source" || override.deploymentAttested !== false || override.attested !== true || !/^[a-f0-9]{40}$/.test(override.sourceCommit ?? "") || !Number.isFinite(override.sourceEpoch)) throw new Error("PLAN_RELEASE_ARCHIVE_INVALID");
  }
  return { ...computed, info: override ? { ...computed.info, provenance: "archived-source", attested: true,
    sourceCommit: override.sourceCommit, sourceEpoch: override.sourceEpoch } : computed.info };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const { info } = await calculatePlanRelease(root);
  if (process.argv.includes("--write")) writeFileSync(join(root, manifestPath), declarationText(info));
  else if (JSON.stringify(canonical(info)) !== JSON.stringify(canonical(readDeclaration(root)))) throw new Error("PLAN_RELEASE_DECLARATION_STALE");
  console.log(JSON.stringify({ releaseId: info.releaseId, checked: !process.argv.includes("--write") }));
}
