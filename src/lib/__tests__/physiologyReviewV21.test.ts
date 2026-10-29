import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { appendPhysiologyEvidence, preservePhysiologyNotes, snapshotPhysiologyEvidence, runningEconomyCostFromSnapshot } from "@/lib/physiologyEvidence";
import { mapExtractToSnapshot } from "@/lib/labImport/snapshotMapper";
import { createEmptyLabExtract } from "@/lib/labImport/types";
import { computeVLamaxEffectif } from "@/lib/vlamaxEffectif";
import { snapshotSchema } from "@/lib/validationSchemas";

function envelope(parameter: Record<string, unknown> = {}) {
  return `TFCL_PHYSIOLOGY_V1:${JSON.stringify({ version: 1, date: "2026-10-20", storageSource: "lab_import", confidence: 0.9, confidenceBasis: "extraction", parameters: {
    vma: { value: 18, unit: "km/h", discipline: "run", ...parameter },
  } })}`;
}

describe("V2.1 — confirmed provenance boundaries", () => {
  it("does not restore stale evidence when a scalar is edited away and back", () => {
    // JS accepts the additional change context on the V2 baseline; it is ignored there.
    const preserve = preservePhysiologyNotes as (old: string, next: string | undefined, changes: { vma: number }) => string;
    const changed = preserve(envelope(), undefined, { vma: 19 });
    const returned = preserve(changed, undefined, { vma: 18 });
    expect(snapshotPhysiologyEvidence({ vma: 18, coach_notes: returned }).vma.date).toBeNull();
  });
  it("explicit unknown test date overrides a shared report date", () => {
    expect(snapshotPhysiologyEvidence({ vma: 18, coach_notes: envelope({ date: null }) }).vma.date).toBeNull();
  });
  it("explicit unknown confidence is not replaced by extraction confidence", () => {
    expect(snapshotPhysiologyEvidence({ vma: 18, coach_notes: envelope({ confidence: null }) }).vma.confidence).toBeNull();
  });
  it("per-parameter storage origin is retained", () => {
    expect(snapshotPhysiologyEvidence({ vma: 18, coach_notes: envelope({ storageSource: "coach_declared" }) }).vma.storageSource).toBe("coach_declared");
  });
  it("rejects a malformed replacement instead of overwriting valid provenance", () => {
    expect(() => preservePhysiologyNotes(envelope(), "edited\nTFCL_PHYSIOLOGY_V1:broken")).toThrow();
  });
  it("invalid calendar dates remain unknown", () => {
    expect(snapshotPhysiologyEvidence({ vma: 18, coach_notes: envelope({ date: "2026-02-31" }) }).vma.date).toBeNull();
  });
  it("unknown discipline cannot create a stored metabolic classification", () => {
    const extract = createEmptyLabExtract(); extract.performance.sport = "unknown";
    extract.performance.vo2max_ml_kg_min = 60; extract.vlamax.value = 0.42;
    const payload = mapExtractToSnapshot(extract, "Marathon");
    expect(payload.metabolic_score).toBeNull();
    expect(payload.metabolic_profile).toBe("Données insuffisantes");
  });
  it.each(["Marathon", "IM"])("missing laboratory discipline is not inferred from goal %s", objectif => {
    const result = computeVLamaxEffectif({ athleteId: "synthetic:v21", objectif, tests: [{ athlete_id: "synthetic:v21", type: "LAB", name: "Imported laboratory value", date: "2026-10-20", vlamax: 0.8 }], snapshots: [] });
    expect(result.value).toBeNull();
  });
  it("the existing 2000-character limit rejects overflow without truncating the evidence", () => {
    const metadata = appendPhysiologyEvidence("", { version: 1, date: null, storageSource: "manual", confidence: null, confidenceBasis: "unknown", parameters: {} });
    const exact = "x".repeat(1999 - metadata.length) + "\n" + metadata;
    expect(exact).toHaveLength(2000);
    expect(snapshotSchema.shape.coach_notes.safeParse(exact).success).toBe(true);
    expect(snapshotSchema.shape.coach_notes.safeParse(exact + "x").success).toBe(false);
    expect(runningEconomyCostFromSnapshot({ coach_notes: "historical free text, score=65; cost not established" })).toBeNull();
  });
});

import { diagnosticPhysiologicalEvidence } from "@/lib/physiologyEvidence";
import { computeDiagnostic } from "@/engines/diagnostic/computeDiagnostic";
import { QA_PROFILES } from "@/lib/plan/qa/syntheticProfiles";
import { buildPilotDiagnosticInput } from "@/lib/plan/qa/preparePilotTrainingPlanContext";

it("a stored laboratory category alone does not establish direct measurement", () => {
  const d = computeDiagnostic(buildPilotDiagnosticInput(QA_PROFILES.find(p => p.id === "B-MARATHON")!));
  d.effectifs.vlamax.v2.source = "test_labo";
  d._rawInput.physiologicalEvidence = {};
  expect(diagnosticPhysiologicalEvidence(d).vlamaxEffective.scientificOrigin).toBe("unknown");
});
it("keeps known per-parameter origin, method and test date on an unchanged effective value", () => {
  const d = computeDiagnostic(buildPilotDiagnosticInput(QA_PROFILES.find(p => p.id === "B-MARATHON")!));
  d._rawInput.physiologicalEvidence = { vlamax_run: {
    value: d.effectifs.vlamax.value!, unit: "mmol/L/s", discipline: "run", method: "declared-method",
    date: "2026-10-20", scientificOrigin: "coach_declared", storageSource: "synthetic", confidence: null,
    confidenceBasis: "unknown", errorMargin: null,
  } };
  expect(diagnosticPhysiologicalEvidence(d).vlamaxEffective).toMatchObject({ scientificOrigin: "coach_declared", method: "declared-method", date: "2026-10-20", confidenceBasis: "heuristic" });
});
it.each(["null", "[]", '{"version":1,"parameters":[]}', '{"version":1,"parameters":{"cost":null}}'])("ignores malformed historical envelope %s without changing source text", payload => {
  const notes = `History\nTFCL_PHYSIOLOGY_V1:${payload}`;
  expect(runningEconomyCostFromSnapshot({ coach_notes: notes })).toBeNull();
  expect(preservePhysiologyNotes(notes, undefined)).toBe(notes);
});
it("does not assign global snapshot confidence to a scalar whose evidence was invalidated", () => {
  const notes = preservePhysiologyNotes(envelope(), undefined, { vma: 19 });
  expect(snapshotPhysiologyEvidence({ vma: 19, confidence: 0.9, coach_notes: notes }).vma.confidence).toBeNull();
});
