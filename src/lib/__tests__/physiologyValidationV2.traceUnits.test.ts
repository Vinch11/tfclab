import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { analyzeRunMLSSDrift } from "@/lib/calibration/runMLSSContinuous";
import { buildRunMLSSSignature, buildRunMLSSTracePayload, RUN_MLSS_TRACE_VERSION } from "@/lib/v2/runMLSSTracePersistence";
import { computeRunMLSSFromInput } from "@/engines/diagnostic/computeDiagnostic";

describe("V2 — old ambiguous CE traces stay archived without creating a physiological drift", () => {
  const inputs = { vlamaxRun: 0.5, runningEconomy: 200, runningEconomyUnit: "ml O2/kg/km" as const, paceThresholdSecPerKm: null, vmaKmh: 18 };
  const diagnostic = computeRunMLSSFromInput({ sportFocus: "run", vlamaxRun: 0.5, runningEconomyCostMlKgKm: 200, vma: 18, paceThresholdSecPerKm: null })!;
  it("versions and identifies the corrected unit in signatures and payloads", () => {
    const payload = buildRunMLSSTracePayload(inputs, diagnostic);
    expect(payload.version).toBe(RUN_MLSS_TRACE_VERSION);
    expect(payload.inputs.runningEconomyUnit).toBe("ml O2/kg/km");
    expect(buildRunMLSSSignature(inputs, diagnostic)).not.toBe(buildRunMLSSSignature({ ...inputs, runningEconomyUnit: "unknown" }, diagnostic));
  });
  it("excludes legacy score-based CE/predictions, preserving VLamax and the original trace bytes", () => {
    const traces = [1, 8, 15, 22].map(day => ({ id: `synthetic:${day}`, date: `2026-10-${String(day).padStart(2, "0")}`, payload: {
      ...buildRunMLSSTracePayload(inputs, diagnostic), version: "tfcl_run_mlss_modele_c_v1",
      inputs: { ...inputs, runningEconomy: 3, runningEconomyUnit: undefined },
    } }));
    const before = structuredClone(traces);
    const result = analyzeRunMLSSDrift(traces, new Date("2026-10-29"));
    expect(result.metrics.runningEconomy.n).toBe(0);
    expect(result.metrics.effectivePct.n).toBe(0);
    expect(result.metrics.vlamaxRun.n).toBe(4);
    expect(result.notes.join(" ")).toContain("historiques conservés");
    expect(traces).toEqual(before);
  });
  it("retains admissible observed threshold proxies even in legacy traces", () => {
    const observed = { ...diagnostic, effectiveSource: "observed" as const, effectivePct: 83.3, observedPct: 83.3 };
    const traces = [1, 8, 15, 22].map(day => ({ id: `synthetic:${day}`, date: `2026-10-${String(day).padStart(2, "0")}`, payload: { ...buildRunMLSSTracePayload({ ...inputs, runningEconomyUnit: "unknown" }, observed) } }));
    const result = analyzeRunMLSSDrift(traces, new Date("2026-10-29"));
    expect(result.metrics.effectivePct.n).toBe(4);
    expect(result.metrics.runningEconomy.n).toBe(0);
  });
});
