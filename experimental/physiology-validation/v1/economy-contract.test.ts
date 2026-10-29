import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
import { computeDiagnostic as original } from "@/engines/diagnostic/computeDiagnostic";
import { computeDiagnostic as candidate } from "physiology:diagnostic-candidate";
import { predictRunMLSSPctFromVLaCE } from "@/lib/v2/runMLSSPredictor";
import { QA_PROFILES } from "@/lib/plan/qa/syntheticProfiles";
import { buildPilotDiagnosticInput } from "@/lib/plan/qa/preparePilotTrainingPlanContext";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-29T14:00:00Z"));
  vi.stubGlobal("fetch", () => { throw Error("NETWORK_FORBIDDEN"); });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const seed = buildPilotDiagnosticInput(QA_PROFILES.find(p => p.id === "B-MARATHON")!);
const input = { ...seed, runEconomyScore: 65, vlamaxRun: 0.5, vma: 18, paceThresholdSecPerKm: null };
const compute = process.env.PHYSIOLOGY_BASELINE === "1" ? original : candidate;

describe("F4 — economy score is distinct from oxygen cost", () => {
  it("does not synthesize MLSS from a 0–100 score when CE is missing", () => {
    expect(compute(input).runMLSS?.prediction ?? null).toBeNull();
  });
  it("uses explicit CE in ml O2/kg/km, preserving the original limiter score", () => {
    const enriched = { ...input, runningEconomyCostMlKgKm: 200 };
    const before = original(enriched);
    const after = compute(enriched);
    expect(after.runMLSS?.prediction).toEqual(predictRunMLSSPctFromVLaCE(0.5, 200));
    expect(after.limiter).toEqual(before.limiter);
    expect(after.effectifs).toEqual(before.effectifs);
    expect(after._rawInput.runEconomyScore).toBe(65);
    if (process.env.PHYSIOLOGY_WRITE_EVIDENCE === "1") {
      writeFileSync("docs/physiology-validation/v1/evidence/economy-contract.json", JSON.stringify({
        syntheticOnly: true, input: enriched, before: before.runMLSS, after: after.runMLSS,
        limitersUnchanged: JSON.stringify(before.limiter) === JSON.stringify(after.limiter),
        scope: "experimental in-memory patch; no production source edited; CE has no new automatic producer",
      }, null, 2) + "\n");
    }
  });
  it("retains threshold/VMA proxy when CE is absent, without false model cross-validation", () => {
    const after = compute({ ...input, paceThresholdSecPerKm: 240 });
    expect(after.runMLSS?.effectiveSource).toBe("observed");
    expect(after.runMLSS?.effectivePct).toBeCloseTo(83.3, 1);
    expect(after.runMLSS?.crossValidation).toBeNull();
  });
  it.each(QA_PROFILES.map(profile => [profile.id, profile] as const))(
    "preserves effectifs, limiter, readiness and targets for existing synthetic profile %s", (_id, profile) => {
      const raw = buildPilotDiagnosticInput(profile);
      const before = original(raw);
      const after = candidate(raw);
      expect(after.effectifs).toEqual(before.effectifs);
      expect(after.limiter).toEqual(before.limiter);
      expect(after.readiness).toEqual(before.readiness);
      expect(after.targets).toEqual(before.targets);
      if (raw.sportFocus === "bike") expect(after.runMLSS).toBeNull();
    },
  );
});
