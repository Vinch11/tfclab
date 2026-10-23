import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { analyzeSportsPlan } from "./analyzePlan";
import { buildCatalogEvidence } from "./catalogEvidence";
import { normalizePlanExport } from "./normalizePlanExport";
import { renderMarkdownReport } from "./renderReport";
import { getReferenceScenario, REFERENCE_SCENARIOS } from "./scenarios";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  if (process.argv.includes("--list-scenarios")) {
    for (const scenario of REFERENCE_SCENARIOS) console.log(`${scenario.id}\t${scenario.label}`);
    return;
  }
  const planPath = option("--plan");
  const scenarioId = option("--scenario");
  const format = option("--format") ?? "markdown";
  const outputPath = option("--out");
  if (!planPath || !scenarioId || !["markdown", "json"].includes(format)) {
    throw new Error("Usage: bun src/qa/sports-plan-lab/cli.ts --plan plan.json --scenario confirmed-703 [--format markdown|json] [--out report.md]");
  }
  const scenario = getReferenceScenario(scenarioId);
  if (!scenario) throw new Error(`Scénario inconnu : ${scenarioId}. Utilisez --list-scenarios.`);
  const raw = JSON.parse(await readFile(resolve(planPath), "utf8"));
  const plan = normalizePlanExport(raw);
  const report = analyzeSportsPlan(plan, scenario, await buildCatalogEvidence());
  const rendered = format === "json" ? `${JSON.stringify(report, null, 2)}\n` : renderMarkdownReport(report);
  if (outputPath) await writeFile(resolve(outputPath), rendered, "utf8");
  else process.stdout.write(rendered);
  if (report.critical.length > 0) process.exitCode = 2;
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

