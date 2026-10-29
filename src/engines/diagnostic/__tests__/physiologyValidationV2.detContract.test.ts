import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { computeDiagnostic } from "@/engines/diagnostic/computeDiagnostic";
import { QA_PROFILES } from "@/lib/plan/qa/syntheticProfiles";
import { buildPilotDiagnosticInput } from "@/lib/plan/qa/preparePilotTrainingPlanContext";

const spec = JSON.parse(readFileSync("docs/physiology-validation/v2/evidence/det-v22-inputs.json", "utf8"));
const handoff = JSON.parse(readFileSync("docs/physiology-validation/v2/evidence/det-current-handoff.json", "utf8"));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(spec.clock));
  vi.stubGlobal("fetch", () => { throw Error("NETWORK_FORBIDDEN"); });
  vi.spyOn(console, "log").mockImplementation(() => {}); vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("V22 frozen input compatibility, including current V23 physiology handoff", () => {
  it("keeps actual threshold proxies but removes cross-validation manufactured from score3", () => {
    const seed = buildPilotDiagnosticInput(QA_PROFILES.find(p => p.id === "B-IM")!);
    const rows = spec.cases.map((c: any) => {
      const raw = { ...seed, ...c.rawOverrides, athleteId: `synthetic:v22:${c.id}`, sportFocus: "tri", objectif: spec.common.objective, ambition: spec.common.ambition };
      const frozen = structuredClone(raw);
      const d = computeDiagnostic(raw);
      expect(raw).toEqual(frozen);
      expect(d.runMLSS?.prediction ?? null).toBeNull();
      expect(d.runMLSS?.crossValidation ?? null).toBeNull();
      const before = handoff.cases.find((r: any) => r.caseId === c.id)?.conflict.actualDiagnostic;
      if (before) {
        expect(d.runMLSS?.observedPct).toBe(before.observedPct);
        expect(d.runMLSS?.effectivePct).toBe(before.effectivePct);
        expect(d.runMLSS?.effectiveSource).toBe("observed");
      } else expect(d.runMLSS).toBeNull();
      return { id: c.id, before: before ?? null, after: d.runMLSS, interpretation: "removed invalid score-to-cost comparison; not a clearance of source-dose, capacity or physiological uncertainty" };
    });
    if (process.env.PHYSIOLOGY_V2_EVIDENCE === "1") writeFileSync("docs/physiology-validation/v2/evidence/det-contract-probe.json", JSON.stringify({ syntheticOnly: true, noDetFileChanged: true, noPrescriptionApproved: true, rows }, null, 2) + "\n");
  });
});
