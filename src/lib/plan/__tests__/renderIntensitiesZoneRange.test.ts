import { describe, it, expect } from "vitest";
import { enrichWithAbsoluteValues } from "@/lib/plan/renderIntensities";
import type { TargetTable } from "@/lib/plan/targetTable";

const tt: TargetTable = {
  ftpW: 250,
  vmaKmh: 16,
  cssSecPer100m: 90,
} as TargetTable;

describe("renderIntensities — ranges de zones", () => {
  it("annote 'Z2-Z3' (run) comme un seul bloc pace", () => {
    const out = enrichWithAbsoluteValues("Vélo 60' Z2-Z3 endurance", tt, "run");
    expect(out).toMatch(/Z2-Z3\s*\([^)]*\/km\)/);
    // exactement une paire de parenthèses
    expect((out.match(/\(/g) || []).length).toBe(1);
  });

  it("annote 'Z2-Z3' (bike) comme un seul bloc watts", () => {
    const out = enrichWithAbsoluteValues("2h Z2-Z3 gut training", tt, "bike");
    expect(out).toMatch(/Z2-Z3\s*\(\d+-\d+W\)/);
    expect((out.match(/\(/g) || []).length).toBe(1);
  });

  it("préserve l'annotation des zones isolées", () => {
    const out = enrichWithAbsoluteValues("WU 10' Z1 puis 3x8' Z4 récup Z2", tt, "bike");
    expect(out).toMatch(/Z1\s*\(\d+-\d+W\)/);
    expect(out).toMatch(/Z4\s*\(\d+-\d+W\)/);
    expect(out).toMatch(/Z2\s*\(\d+-\d+W\)/);
  });

  it("gère les ranges avec sous-zones Z4a-Z4b", () => {
    const out = enrichWithAbsoluteValues("3x10' Z4a-Z4b sweet spot", tt, "bike");
    expect(out).toMatch(/Z4a-Z4b\s*\(\d+-\d+W\)/);
  });
});
