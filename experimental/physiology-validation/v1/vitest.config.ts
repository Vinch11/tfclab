import { defineConfig } from "vitest/config";
import base from "../../../vitest.config";
import { readFileSync } from "node:fs";
import path from "node:path";

const candidateId = path.resolve("experimental/physiology-validation/v1/diagnostic-candidate.ts");

export default defineConfig({
  ...base,
  plugins: [...base.plugins, {
    name: "physiology-review-only-diagnostic-candidate",
    resolveId(id) { if (id === "physiology:diagnostic-candidate") return candidateId; },
    load(id) {
      if (id !== candidateId) return;
      const source = readFileSync("src/engines/diagnostic/computeDiagnostic.ts", "utf8");
      const start = source.indexOf("function computeRunMLSSFromInput(");
      const end = source.indexOf("function computeSynthesis(", start);
      const prefix = source.slice(0, start);
      // Match the two CE arguments only, never the score used by limiter/readiness.
      const body = source.slice(start, end).replace(/input\.runEconomyScore/g, "input.runningEconomyCostMlKgKm");
      if (start < 0 || end < 0 || (source.slice(start, end).match(/input\.runEconomyScore/g) ?? []).length !== 2) {
        throw new Error("Review patch no longer matches the two MLSS CE arguments");
      }
      return (prefix + body + source.slice(end))
        .replaceAll('from "./types"', 'from "@/engines/diagnostic/types"')
        .replaceAll('from "./raceTimeEstimator"', 'from "@/engines/diagnostic/raceTimeEstimator"');
    },
  }],
  test: { ...base.test, include: ["experimental/physiology-validation/v1/**/*.test.ts"], retry: 0 },
});
