import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { computeDiagnostic } from "@/engines/diagnostic/computeDiagnostic";
import { QA_PROFILES } from "@/lib/plan/qa/syntheticProfiles";
import { buildPilotDiagnosticInput } from "@/lib/plan/qa/preparePilotTrainingPlanContext";

const file = "docs/physiology-validation/v2/evidence/qa-before.json";
const capture = process.env.PHYSIOLOGY_V2_CAPTURE_BASELINE === "1";
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const baseline = capture ? null : JSON.parse(readFileSync(file, "utf8"));
const rows: unknown[] = [];
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-29T14:00:00Z"));
  vi.stubGlobal("fetch", () => { throw Error("NETWORK_FORBIDDEN"); });
  vi.spyOn(console, "log").mockImplementation(() => {}); vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("37 unchanged QA fixtures — baseline main versus V2", () => {
  it("compares independent baseline fingerprints and records expected MLSS-only changes", () => {
    expect(QA_PROFILES).toHaveLength(37);
    for (const profile of QA_PROFILES) {
      const d = computeDiagnostic(buildPilotDiagnosticInput(profile));
      const row = { id: profile.id,
        stableBlocks: Object.fromEntries(["effectifs", "limiter", "readiness", "targets"].map(key => [key, hash(d[key])])),
        runMLSS: d.runMLSS, alerts: d.synthesis.alerts };
      if (!capture) {
        const before = baseline.find((r: any) => r.id === row.id);
        expect(row.stableBlocks, row.id).toEqual(before.stableBlocks);
        expect(d.runMLSS?.prediction ?? null).toBeNull(); // existing QA inputs have scores, no explicit O2 cost
        expect(d.runMLSS?.observedPct ?? null, row.id).toBe(before.runMLSS?.observedPct ?? null);
      }
      rows.push(row);
    }
    if (capture) writeFileSync(file, JSON.stringify(rows, null, 2) + "\n");
    else if (process.env.PHYSIOLOGY_V2_EVIDENCE === "1") writeFileSync("docs/physiology-validation/v2/evidence/qa-after.json", JSON.stringify(rows, null, 2) + "\n");
  });
});
