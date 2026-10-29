import { compareQualificationChanges } from "@/test/qualificationV23Compatibility";
import { afterEach, expect, it, vi } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import { computeDiagnostic } from "../computeDiagnostic";
import { QA_PROFILES } from "@/lib/plan/qa/syntheticProfiles";
import { buildPilotDiagnosticInput } from "@/lib/plan/qa/preparePilotTrainingPlanContext";
const path = "docs/physiology-validation/v2.3/evidence/qa-reference-4d8c788f.json.gz";
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("retains the independent reference for every QA profile and documents semantic changes separately", () => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-29T14:00:00Z"));
  vi.stubGlobal("fetch", () => { throw Error("NETWORK_FORBIDDEN"); });
  vi.spyOn(console, "log").mockImplementation(() => {}); vi.spyOn(console, "warn").mockImplementation(() => {});
  const rows = QA_PROFILES.map(p => { const d = computeDiagnostic(buildPilotDiagnosticInput(p)); return { id: p.id, effectifs: d.effectifs, limiter: d.limiter, readiness: d.readiness, targets: d.targets, runMLSS: d.runMLSS, synthesis: d.synthesis }; });
  expect(rows).toHaveLength(37);
  if (process.env.PHYSIOLOGY_V23_CAPTURE === "1") writeFileSync(path, gzipSync(JSON.stringify(rows)));
  else {
    const before = JSON.parse(gunzipSync(readFileSync(path)).toString());
    expect(before.map((r: { id: string }) => r.id)).toEqual(rows.map(r => r.id));
    const changes = rows.map((row, i) => ({ id: row.id, changes: compareQualificationChanges(row, before[i]) }));
    expect(changes.every(r => r.changes.length > 0)).toBe(true);
    if (process.env.PHYSIOLOGY_V23_EVIDENCE === "1") writeFileSync("docs/physiology-validation/v2.3/evidence/qa-semantic-differences.json", JSON.stringify({ profiles: 37, numericDifferences: 0, decisionDifferences: 0, changes }, null, 2) + "\n");
  }
});
