import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory transport only: no real database client or network is imported.
const transport = vi.hoisted(() => ({
  user: { id: "11111111-1111-4111-8111-111111111111" },
  rows: {} as Record<string, Record<string, unknown>[]>,
  failWrite: false,
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: transport.user }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from(table: string) {
    let payload: Record<string, unknown> | null = null;
    let operation = "read";
    const filters: [string, unknown][] = [];
    const execute = () => {
      if (operation !== "read" && transport.failWrite) return { data: null, error: { message: "offline" } };
      const rows = transport.rows[table] ??= [];
      if (payload && operation === "upsert") {
        const existing = rows.findIndex(row => row.athlete_id === payload!.athlete_id);
        const saved = JSON.parse(JSON.stringify(payload));
        if (existing >= 0) rows[existing] = { ...rows[existing], ...saved };
        else rows.push(saved);
      } else if (payload && operation === "update") {
        rows.forEach((row, i) => { if (filters.every(([key, value]) => row[key] === value)) rows[i] = { ...row, ...JSON.parse(JSON.stringify(payload)) }; });
      } else if (payload && operation === "insert") {
        rows.push({ id: "33333333-3333-4333-8333-333333333333", ...JSON.parse(JSON.stringify(payload)) });
      }
      return { data: structuredClone(operation === "insert" ? [rows.at(-1)!] : rows.filter(row => filters.every(([key, value]) => row[key] === value))), error: null };
    };
    const query = {
      select: () => query, order: () => query,
      eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
      upsert: (value: Record<string, unknown>) => { payload = value; operation = "upsert"; return query; },
      update: (value: Record<string, unknown>) => { payload = value; operation = "update"; return query; },
      insert: (value: Record<string, unknown>) => { payload = value; operation = "insert"; return query; },
      single: () => { const result = execute(); return Promise.resolve({ ...result, data: result.data?.at(-1) ?? null }); },
      then: (resolve: (value: ReturnType<typeof execute>) => unknown) => Promise.resolve(execute()).then(resolve),
    };
    return query;
  },
} }));
import { useCloudData } from "../useCloudData";

const athleteId = "22222222-2222-4222-8222-222222222222";
beforeEach(() => {
  transport.failWrite = false;
  const owner = { athlete_id: athleteId, coach_id: transport.user.id };
  transport.rows = {
    athletes: [{ id: athleteId, coach_id: transport.user.id, name: "Synthetic", refs: { vma: 15 }, active_snapshot_id: "snapshot-1" }],
    snapshots: [{ ...owner, id: "snapshot-1", date: "2026-10-25", vma: 15, confidence: 0.6, run_economy_score: 50 }],
    tests: [{ ...owner, id: "test-1", reliability: 75, raw: { protocol: "synthetic", samples: [1, 2] } }],
    plans: [], checkins: [],
  };
});


import { createEmptyLabExtract } from "@/lib/labImport/types";
import { applyFieldEdits, extractToValidationFields, mapExtractToSnapshot } from "@/lib/labImport/snapshotMapper";
import { snapshotPhysiologyEvidence, runningEconomyCostFromSnapshot, physiologyNarrative } from "@/lib/physiologyEvidence";
import { snapshotSchema } from "@/lib/validationSchemas";
import { computeDiagnostic } from "@/engines/diagnostic/computeDiagnostic";
import { QA_PROFILES } from "@/lib/plan/qa/syntheticProfiles";
import { buildPilotDiagnosticInput, buildPilotFormConfig } from "@/lib/plan/qa/preparePilotTrainingPlanContext";
import { prepareTrainingPlanContext } from "@/engines/plan/prepareTrainingPlanContext";
import { buildRunMLSSCoherenceHTML } from "@/components/ExportTools";
import { writeFileSync } from "node:fs";

function extraction(sport: "run" | "bike" | "tri" | "unknown" = "run") {
  const extract = createEmptyLabExtract();
  extract.meta.reportDate = "2026-10-20";
  extract.meta.sourceConfidence = 0.9;
  extract.performance.sport = sport;
  extract.performance.vo2max_ml_kg_min = 60;
  extract.performance.vma_kmh = 18;
  extract.anthropo.weight_kg = 70;
  extract.vlamax = { value: 0.42, source: "lab" };
  return extract;
}

describe("V2 — actual import editing, validation, mocked save/reopen, diagnostic, planning and staff report", () => {
  it("persists explicit oxygen cost with its provenance and preserves it when coach notes are edited", async () => {
    const extract = extraction();
    expect(extractToValidationFields(extract).find(f => f.key === "running_economy")?.editable).toBe(true);
    const edited = applyFieldEdits(extract, { running_economy: 200 });
    expect(edited.economy.running_cost_ml_kg_km).toBe(200);
    const payload = { athlete_id: athleteId, coach_id: "", ...mapExtractToSnapshot(edited, "Marathon") } as any;
    const validated = snapshotSchema.parse(payload);
    const evidence = snapshotPhysiologyEvidence(validated);
    expect(evidence.runningEconomyCostMlKgKm).toMatchObject({ value: 200, unit: "ml O2/kg/km", discipline: "run", date: "2026-10-20", storageSource: "lab_import", confidence: 0.9, confidenceBasis: "extraction", scientificOrigin: "unknown", errorMargin: null });
    const first = renderHook(() => useCloudData());
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    let saved: any;
    await act(async () => { saved = await first.result.current.addSnapshot(payload); });
    expect(saved.vlamax_run).toBe(0.42);
    expect(saved.vlamax).toBeNull();
    await act(async () => { expect(await first.result.current.updateSnapshot(saved.id, { coach_notes: "Notes coach modifiées" })).toBe(true); });
    first.unmount();
    const reopened = renderHook(() => useCloudData());
    await waitFor(() => expect(reopened.result.current.loading).toBe(false));
    const snapshot = reopened.result.current.getSnapshotsForAthlete(athleteId).find(s => s.id === saved.id)!;
    expect(runningEconomyCostFromSnapshot(snapshot)).toBe(200);
    expect(snapshotPhysiologyEvidence(snapshot)).toMatchObject(evidence);
    expect(physiologyNarrative(snapshot.coach_notes)).toBe("Notes coach modifiées");
    const profile = QA_PROFILES.find(p => p.id === "B-MARATHON")!;
    const input = { ...buildPilotDiagnosticInput(profile), athleteId, vlamaxRun: snapshot.vlamax_run, vlamax: null,
      vlamaxSource: snapshot.vlamax_source, vlamaxProtocol: null, runEconomyScore: 65,
      runningEconomyCostMlKgKm: runningEconomyCostFromSnapshot(snapshot), physiologicalEvidence: snapshotPhysiologyEvidence(snapshot),
      paceThresholdSecPerKm: null, vma: 18 };
    const prepared = prepareTrainingPlanContext({ diagnosticInput: input, formConfig: buildPilotFormConfig(profile.planConfig) });
    expect(prepared.diagnostic.runMLSS?.prediction).not.toBeNull();
    expect(prepared.trace.parameters.runningEconomyCostMlKgKm).toEqual(evidence.runningEconomyCostMlKgKm);
    expect(prepared.athleteData.physiologicalEvidence?.vlamaxEffective.confidenceBasis).toBe("heuristic");
    expect(prepared.athleteData.physiologicalEvidence?.vlamaxEffective.errorMargin).toBeGreaterThan(0);
    const html = buildRunMLSSCoherenceHTML({ athlete: { goal: "Marathon" }, effectiveSnapshot: snapshot, runMLSS: prepared.diagnostic.runMLSS } as any);
    expect(html).toContain("200 ml O2/kg/km");
    expect(html).toContain("2026-10-20");
    expect(html).toContain("extraction");
    expect(html).not.toContain("TFCL_PHYSIOLOGY_V1:");
    const planForStorage = JSON.parse(JSON.stringify({ physiologicalTrace: prepared.trace, athleteData: prepared.athleteData }));
    await act(async () => { expect(await reopened.result.current.savePlan(athleteId, planForStorage)).toBe(true); });
    expect(reopened.result.current.getPlan(athleteId)?.plan_json).toMatchObject({ physiologicalTrace: { parameters: evidence } });
    if (process.env.PHYSIOLOGY_V2_EVIDENCE === "1") {
      writeFileSync("docs/physiology-validation/v2/evidence/import-save-diagnostic-report.json", JSON.stringify({ syntheticOnly: true, saved: snapshot, evidence, diagnosticMLSS: prepared.diagnostic.runMLSS, planParameters: prepared.trace.parameters, limiters: prepared.planConfig.identifiedLimitersRaw }, null, 2) + "\n");
      writeFileSync("docs/physiology-validation/v2/evidence/run-mlss-report.html", html);
    }
    const expectedPlan = JSON.parse(JSON.stringify(reopened.result.current.getPlan(athleteId)?.plan_json));
    reopened.unmount();
    const finalRead = renderHook(() => useCloudData());
    await waitFor(() => expect(finalRead.result.current.loading).toBe(false));
    expect(finalRead.result.current.getPlan(athleteId)?.plan_json).toEqual(expectedPlan);
    finalRead.unmount();
  });

  it("does not reassign an explicit bike lab report because the athlete goal is running", async () => {
    const hook = renderHook(() => useCloudData());
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    transport.rows.athletes[0].goal = "Marathon";
    // Reload the hook with the explicit running goal.
    hook.unmount();
    const loaded = renderHook(() => useCloudData());
    await waitFor(() => expect(loaded.result.current.loading).toBe(false));
    let saved: any;
    await act(async () => { saved = await loaded.result.current.addSnapshot({ athlete_id: athleteId, coach_id: "", ...mapExtractToSnapshot(extraction("bike"), "Marathon") } as any); });
    expect(saved.sport_main).toBe("bike");
    expect(saved.vlamax).toBe(0.42);
    expect(saved.vlamax_run).toBeNull();
    loaded.unmount();
  });

  it("rejects a failed snapshot save without adding a phantom local snapshot", async () => {
    const hook = renderHook(() => useCloudData());
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    const before = structuredClone(hook.result.current.snapshots);
    transport.failWrite = true;
    await act(async () => { expect(await hook.result.current.addSnapshot({ athlete_id: athleteId, coach_id: "", ...mapExtractToSnapshot(extraction(), "Marathon") } as any)).toBeNull(); });
    expect(hook.result.current.snapshots).toEqual(before);
    hook.unmount();
  });
});
