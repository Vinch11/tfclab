import { writeFileSync } from "node:fs";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { mapTestToV2 } from "@/lib/mapSnapshotToV2";
import { computeVLamaxEffectif } from "@/lib/vlamaxEffectif";
import { computeEssentielsData } from "@/lib/essentiels/computeEssentielsData";
import { computeRunMLSSFromInput, computeDiagnostic } from "@/engines/diagnostic/computeDiagnostic";
import { diagnosticPhysiologicalEvidence } from "@/lib/physiologyEvidence";
import { buildRunMLSSCoherenceHTML } from "@/components/ExportTools";
import { RunMLSSCoherenceCard } from "@/components/RunMLSSCoherenceCard";
import { buildPilotDiagnosticInput } from "@/lib/plan/qa/preparePilotTrainingPlanContext";
import { QA_PROFILES } from "@/lib/plan/qa/syntheticProfiles";

afterEach(cleanup);
const subject = "synthetic:v22";
const laboratory = (sport: string, name = "Imported laboratory value") => ({ athlete_id: subject, vlamax: 0.42, date: "2026-10-29", type: "LAB", name, raw: { labExtract: { performance: { sport } } } });
const essential = (tests: unknown[] = [], snapshot: Record<string, unknown> = {}) => computeEssentielsData({ athlete: { id: subject, nom: "Synthetic", objectif: "Marathon" }, tests,
 snapshots: [{ id: "synthetic-snapshot", athlete_id: subject, date: "2026-10-29", vo2max: 60, ...snapshot }] })!;

describe("V2.2 independent oracles: source identity, physical dimensions and acknowledged writes", () => {
  it("preserves an explicit unknown raw discipline over a misleading run test name", () => {
    const test = laboratory("unknown", "Run laboratory test");
    const result = computeVLamaxEffectif({ athleteId: subject, objectif: "Marathon", snapshots: [], tests: [mapTestToV2(test)] });
    expect(result.value).toBeNull();
  });
  it("preserves an explicit raw running discipline even without a sport word in the name", () => {
    const result = computeVLamaxEffectif({ athleteId: subject, objectif: "Marathon", snapshots: [], tests: [mapTestToV2(laboratory("run"))] });
    expect(result.value).toBeCloseTo(0.42);
  });
  it("does not drop the discipline when the same source is consumed by Essentiels", () => {
    const identity = essential([laboratory("run")]).pillars.find(p => p.id === "vo2-vlamax")!;
    expect(identity.metrics.find(m => m.label === "VLamax")!.value).toBeCloseTo(0.42);
  });
  it("does not display an oxygen cost computed solely from a dimensionless historical score", () => {
    const mlss = essential([], { run_economy_score: 65 }).pillars.find(p => p.id === "mlss-run")!;
    expect(mlss.metrics.find(m => m.unit === "ml O₂/kg/km")!.value).toBeNull();
    expect(mlss.status).toBe("missing");
  });
  it("labels a Model C prediction in the oxygen fraction documented by the predictor", () => {
    const runMLSS = computeRunMLSSFromInput({ sportFocus: "run", vlamaxRun: 0.5, runningEconomyCostMlKgKm: 200, vma: null, paceThresholdSecPerKm: null });
    const html = buildRunMLSSCoherenceHTML({ athlete: { goal: "Marathon" }, effectiveSnapshot: null, runMLSS });
    expect(html).toContain("83.2% VO₂max");
    expect(html).not.toContain("83.2% VMA");
    expect(essential([], { vlamax_run: 0.5 }).pillars.find(p => p.id === "mlss-run")!.metrics[0].label).toContain("VO₂max");
  });
  it("does not describe an internal consistency result as a certified model validation", () => {
    const runMLSS = computeRunMLSSFromInput({ sportFocus: "run", vlamaxRun: 0.5, runningEconomyCostMlKgKm: 200, vma: 18, paceThresholdSecPerKm: 240 });
    expect(runMLSS?.crossValidation?.severity).toBe("ok");
    render(<RunMLSSCoherenceCard runMLSS={runMLSS} />);
    expect(screen.queryByText(/validée par le Modèle C/)).toBeNull();
    expect(buildRunMLSSCoherenceHTML({ athlete: { goal: "Marathon" }, effectiveSnapshot: null, runMLSS })).not.toContain("validée par le Modèle C");
  });
  it("equal scalar values do not make a computed estimate inherit a coach declaration", () => {
    const diagnostic = computeDiagnostic(buildPilotDiagnosticInput(QA_PROFILES.find(p => p.id === "B-MARATHON")!));
    diagnostic.effectifs.vlamax.v2.source = "estimation";
    diagnostic._rawInput.physiologicalEvidence = { vlamax_run: { value: diagnostic.effectifs.vlamax.value!, unit: "mmol/L/s", discipline: "run", method: "coach text", date: "2026-10-20", scientificOrigin: "coach_declared", storageSource: "snapshot", confidence: null, confidenceBasis: "unknown", errorMargin: null } };
    expect(diagnosticPhysiologicalEvidence(diagnostic).vlamaxEffective.scientificOrigin).toBe("unknown");
    expect(diagnosticPhysiologicalEvidence(diagnostic).vlamaxEffective.scientificQualification?.admissibility).toBe("not_established");
  });
});
it("V2.2: an explicit unknown date/method on the selected snapshot remains unknown", () => {
  const input = { ...buildPilotDiagnosticInput(QA_PROFILES.find(p => p.id === "B-MARATHON")!), vlamaxRun: 0.42, vlamaxSource: "lab" };
  const diagnostic = computeDiagnostic(input);
  diagnostic._rawInput.physiologicalEvidence = { vlamax_run: { value: 0.42, unit: "mmol/L/s", discipline: "run", method: null, date: null, scientificOrigin: "unknown", storageSource: "lab_import", confidence: null, confidenceBasis: "unknown", errorMargin: null } };
  expect(diagnosticPhysiologicalEvidence(diagnostic).vlamax_run).toMatchObject({ scientificOrigin: "unknown", date: null, method: null, storageSource: "lab_import" });
  expect(diagnosticPhysiologicalEvidence(diagnostic).vlamaxEffective).toMatchObject({ scientificOrigin: "unknown", date: null, method: null, storageSource: null });
});
it("V2.2: records the remaining legacy display ambiguity without certifying its scientific origin", () => {
  const input = { ...buildPilotDiagnosticInput(QA_PROFILES.find(p => p.id === "B-IM")!), vlamax: 0.42, vlamaxSource: null };
  const diagnostic = computeDiagnostic(input);
  const evidence = diagnosticPhysiologicalEvidence(diagnostic).vlamaxEffective;
  expect(evidence.scientificOrigin).toBe("unknown");
  if (process.env.PHYSIOLOGY_V22_EVIDENCE === "1") writeFileSync("docs/physiology-validation/v2.2/evidence/legacy-label-observation.json", JSON.stringify({ input: { vlamax: input.vlamax, vlamaxSource: input.vlamaxSource }, effective: diagnostic.effectifs.vlamax, scientificEvidence: evidence, interpretation: "legacy display category is not proof of laboratory measurement" }, null, 2) + "\n");
});
