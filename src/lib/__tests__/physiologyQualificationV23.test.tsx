import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { computeDiagnostic } from "@/engines/diagnostic/computeDiagnostic";
import { buildPilotDiagnosticInput } from "@/lib/plan/qa/preparePilotTrainingPlanContext";
import { QA_PROFILES } from "@/lib/plan/qa/syntheticProfiles";
import { toVLamaxEnvelope } from "@/lib/vlamaxEffectif";
import { VLamaxV2DisplayCard } from "@/components/VLamaxV2DisplayCard";

afterEach(cleanup);
const legacy = () => computeDiagnostic({ ...buildPilotDiagnosticInput(QA_PROFILES.find(p => p.id === "B-IM")!), vlamax: 0.42, vlamaxSource: null }).effectifs.vlamax;
it("C8: a stored reference with no scientific method is not labelled a laboratory measurement", () => {
  const v = legacy();
  expect(v.value).toBe(0.42); expect(v.confidence).toBe(0.95); expect(v.errorMargin).toBe(0.02);
  expect(v.label).not.toMatch(/mesurée labo/i);
  expect(v.label).toMatch(/inconnue/i);
});
it("C8: the Dashboard envelope does not promote a stored scalar to scientific MEASURED", () => {
  expect(toVLamaxEnvelope(legacy(), "IM").source).not.toBe("MEASURED");
});
it("C8: staff display distinguishes the heuristic margin from experimental precision", () => {
  render(<VLamaxV2DisplayCard objectif="Ironman" vlamax={0.42} staffMode v2Result={legacy().v2} />);
  expect(screen.queryByText("Test labo")).toBeNull();
  expect(screen.getAllByText(/heuristique/i).length).toBeGreaterThan(0);
});

import { qualifyReference, type ReferenceEvidence } from "@/lib/scientificQualification";
import { appendPhysiologyEvidence, snapshotPhysiologyEvidence } from "@/lib/physiologyEvidence";
import { computeVLamaxEffectif } from "@/lib/vlamaxEffectif";
import { mapSnapshotToV2 } from "@/lib/mapSnapshotToV2";
import type { DbSnapshot } from "@/hooks/useCloudData";
const context = { subjectId: "synthetic:v23", quantity: "vlamax", discipline: "bike" as const, value: 0.42, unit: "mmol/L/s" };
const documented: ReferenceEvidence = { ...context, method: "Synthetic documented post-sprint lactate protocol", date: "2026-10-20", sourceRef: "fixture:synthetic-v23-report", nature: "calculated", methodKind: "blood_lactate_protocol", primaryMeasurementSourceRef: "fixture:synthetic-v23-primary-lactate" };
it.each([
  ["blood lactate derived calculation", documented, "calculated"],
  ["field estimate", { ...documented, methodKind: "field_protocol", nature: "estimated", method: "Synthetic field sprint protocol", primaryMeasurementSourceRef: null }, "estimated"],
  ["model inference", { ...documented, methodKind: "physiological_model", method: "Synthetic versioned model calculation", primaryMeasurementSourceRef: null }, "calculated"],
  ["coach declaration", { ...documented, methodKind: "coach_declaration", nature: "declared", method: "Synthetic coach statement, not a measurement", primaryMeasurementSourceRef: null }, "declared"],
] as const)("qualifies %s separately from storage and never approves an individual dose", (_name, evidence, nature) => {
  const q = qualifyReference(evidence, context);
  expect(q.status).toBe("documented_context"); expect(q.nature).toBe(nature);
  expect(q.individualDoseApproved).toBe(false); expect(q.individualValidityEstablished).toBe(false);
  expect(q.uncertainty).toBeNull(); expect(q.admissibility).toBe("documented_context_only");
});
it.each([
  { subjectId: null }, { subjectId: "another-subject" }, { discipline: "run" }, { quantity: "blood_lactate" },
  { unit: "mmol/L" }, { value: 0.55 }, { method: null }, { date: null }, { date: "2026-02-31" },
  { sourceRef: "labo" }, { primaryMeasurementSourceRef: null }, { nature: "measured" },
] as const)("does not qualify incomplete or incompatible provenance %j", change => {
  expect(qualifyReference({ ...documented, ...change } as ReferenceEvidence, context).status).toBe("unknown");
});
it("keeps reported scientific uncertainty separate from the engine's heuristic margin", () => {
  const q = qualifyReference({ ...documented, documentedUncertainty: { absoluteBound: 0.1, unit: "mmol/L/s", basis: "Synthetic serialization fixture; no individual experiment", sourceRef: "fixture:synthetic-uncertainty-record" } }, context);
  expect(q.uncertainty?.absoluteBound).toBe(0.1);
  expect(q.uncertaintyStatus).toBe("reported_not_independently_verified");
  expect(q.individualValidityEstablished).toBe(false);
});
it("round-trips explicit documentary evidence without inventing missing primary measurements", () => {
  const notes = appendPhysiologyEvidence("Synthetic only", { version: 1, date: null, storageSource: "synthetic_snapshot", confidence: null, confidenceBasis: "unknown", parameters: { vlamax: documented } });
  const snapshot: DbSnapshot = { id: "synthetic-v23-snapshot", coach_id: "synthetic-coach", athlete_id: context.subjectId, date: "2026-10-29", source: "manual", vlamax: 0.42, sport_main: "bike", coach_notes: notes };
  const evidence = snapshotPhysiologyEvidence(snapshot).vlamax;
  expect(evidence.date).toBe("2026-10-20");
  expect(evidence.scientificOrigin).not.toBe("direct_measurement");
  const result = computeVLamaxEffectif({ athleteId: context.subjectId, objectif: "IM", snapshots: [mapSnapshotToV2(snapshot)], tests: [] });
  expect(result.scientificQualification?.status).toBe("documented_context");
  expect(result.label).toMatch(/dérivée de mesures de lactate/);
  expect(result.confidence).toBe(0.95); expect(result.errorMargin).toBe(0.02);
  expect(toVLamaxEnvelope(result, "IM").source).not.toBe("MEASURED");
  expect(snapshot.coach_notes).toBe(notes);
});
import { scientificReferenceLabel, requalifyReference } from "@/lib/scientificQualification";
it("does not trust an old cached label, an approval flag or a qualification for another value/discipline", () => {
  const q = qualifyReference(documented, context);
  expect(scientificReferenceLabel({ ...q, evidence: null, label: "VLamax mesurée labo" }, 0.42)).toMatch(/inconnue/);
  expect(scientificReferenceLabel(q, 0.43)).toMatch(/inconnue/);
  expect(scientificReferenceLabel(q, 0.42, "run")).toMatch(/inconnue/);
  expect(requalifyReference({ ...q, individualDoseApproved: true } as unknown as typeof q, 0.42).individualDoseApproved).toBe(false);
});
it.each(["LAB", "LACTATE_LAB", "Sprint labo"])("does not qualify a test from its type or text alone: %s", type => {
  const result = computeVLamaxEffectif({ athleteId: context.subjectId, objectif: "IM", snapshots: [], tests: [{ athlete_id: context.subjectId, date: "2026-10-20", type, name: "Bike laboratory reference", sport: "bike", vlamax: 0.42 }] });
  expect(result.value).toBe(0.42);
  expect(result.scientificQualification?.status).toBe("unknown");
  expect(result.label).toMatch(/inconnue/);
});
it("propagates documentary lactate evidence from a linked test without calling VLamax a direct measurement", () => {
  const result = computeVLamaxEffectif({ athleteId: context.subjectId, objectif: "IM", snapshots: [], tests: [{ athlete_id: context.subjectId, date: "2026-10-20", type: "LAB", name: "Bike test", sport: "bike", vlamax: 0.42, raw: { physiologicalEvidence: { vlamax: documented } } }] });
  expect(result.scientificQualification?.nature).toBe("calculated");
  expect(result.confidence).toBeLessThan(0.95); // unchanged terrain-category convention, not a scientific precision score
  expect(result.scientificQualification?.individualValidityEstablished).toBe(false);
});
import { buildVLamaxZoneConfidenceHTML } from "@/components/ExportTools";
it("the actual staff export does not resurrect a cached laboratory label or an experimental margin", () => {
  const v = legacy(); v.label = "VLamax mesurée labo"; v.v2.label = "VLamax mesurée labo";
  const html = buildVLamaxZoneConfidenceHTML({ athlete: { goal: "IM" }, vlamax: v });
  expect(html).not.toContain("VLamax mesurée labo");
  expect(html).toContain("provenance scientifique inconnue");
  expect(html).toContain("marge heuristique interne ± 0.02");
  expect(html).toContain("Incertitude scientifique inconnue");
});
it("renders documented lactate-derived qualification and a separately reported uncertainty", () => {
  const q = qualifyReference({ ...documented, documentedUncertainty: { absoluteBound: 0.1, unit: "mmol/L/s", basis: "Synthetic documentary fixture", sourceRef: "fixture:uncertainty" } }, context);
  const v2 = { ...legacy().v2, scientificQualification: q };
  render(<VLamaxV2DisplayCard objectif="Ironman" vlamax={0.42} staffMode v2Result={v2} />);
  expect(screen.getAllByText(/dérivée de mesures de lactate sanguin/).length).toBeGreaterThan(0);
  expect(screen.getByText(/Incertitude rapportée : ± 0.1/)).toBeTruthy();
  expect(screen.queryByText("Test labo")).toBeNull();
});
import { ScoreEnvelopeDisplay } from "@/components/ScoreEnvelopeDisplay";
it("renders a historical ScoreEnvelope as unknown without changing or deleting its stored scalar/heuristics", () => {
  const historical = { ...toVLamaxEnvelope(legacy(), "IM"), scientificQualification: undefined, source: "MEASURED" as const, label: "VLamax mesurée labo", confidence: 0.95, why: ["Ancienne attribution labo"] };
  const before = JSON.stringify(historical);
  render(<ScoreEnvelopeDisplay envelope={historical} mode="staff" />);
  expect(screen.queryByText("VLamax mesurée labo")).toBeNull();
  expect(screen.getByText(/provenance scientifique inconnue/)).toBeTruthy();
  expect(screen.getAllByText(/95 \/ 100 \(heuristique\)/).length).toBeGreaterThan(0);
  expect(JSON.stringify(historical)).toBe(before);
});
import { diagnosticPhysiologicalEvidence } from "@/lib/physiologyEvidence";
it("qualifies raw VLamax evidence before handoff and never trusts a direct-measurement claim from a caller", () => {
  const input = { ...buildPilotDiagnosticInput(QA_PROFILES.find(p => p.id === "B-IM")!), vlamax: 0.42, vlamaxSource: null };
  input.physiologicalEvidence = { vlamax: { value: 0.42, unit: "mmol/L/s", discipline: "bike", method: "labo", date: null, scientificOrigin: "direct_measurement", storageSource: "snapshot", confidence: 0.95, confidenceBasis: "heuristic", errorMargin: 0.02 } };
  const frozen = JSON.stringify(input);
  const evidence = diagnosticPhysiologicalEvidence(computeDiagnostic(input));
  expect(evidence.vlamax.scientificOrigin).toBe("unknown");
  expect(evidence.vlamax.scientificQualification?.admissibility).toBe("not_established");
  expect(evidence.vlamaxEffective.scientificOrigin).toBe("unknown");
  expect(JSON.stringify(input)).toBe(frozen);
});
