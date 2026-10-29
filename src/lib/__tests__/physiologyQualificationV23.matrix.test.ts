import { expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { computeVLamaxEffectif } from "@/lib/vlamaxEffectif";
import { qualifyReference, type ReferenceEvidence } from "@/lib/scientificQualification";

it("records the category/qualification matrix without changing internal values or approving a dose", () => {
  const subject = "synthetic:v23-matrix";
  const e: ReferenceEvidence = { subjectId: subject, quantity: "vlamax", value: 0.42, unit: "mmol/L/s", discipline: "bike", nature: "calculated", methodKind: "blood_lactate_protocol", method: "Synthetic documentary protocol", date: "2026-10-20", sourceRef: "fixture:v23-matrix-report", primaryMeasurementSourceRef: "fixture:v23-matrix-primary-lactate" };
  const cases: { name: string; evidence: ReferenceEvidence | null }[] = [
    { name: "historical_incomplete", evidence: null },
    { name: "documented_lactate_derived", evidence: e },
    { name: "documented_field_estimate", evidence: { ...e, nature: "estimated", methodKind: "field_protocol", method: "Synthetic field sprint protocol", primaryMeasurementSourceRef: null } },
    { name: "documented_model_derived_reference", evidence: { ...e, methodKind: "physiological_model", method: "Synthetic versioned model calculation", primaryMeasurementSourceRef: null } },
    { name: "documented_coach_declaration", evidence: { ...e, nature: "declared", methodKind: "coach_declaration", method: "Synthetic coach statement, not a measurement", primaryMeasurementSourceRef: null } },
    { name: "incompatible_discipline", evidence: { ...e, discipline: "run" } },
    { name: "invalid_direct_flux_claim", evidence: { ...e, nature: "measured" } },
  ];
  const rows = cases.map(c => {
    const result = computeVLamaxEffectif({ athleteId: subject, objectif: "IM", tests: [], snapshots: [{ id: "synthetic", athlete_id: subject, date: "2026-10-29", sport_main: "bike", vlamax: 0.42, physiologicalEvidence: c.evidence ? { vlamax: c.evidence } : {} }] });
    expect(result.value).toBe(0.42); expect(result.confidence).toBe(0.95); expect(result.errorMargin).toBe(0.02);
    expect(result.v2.source).toBe("test_labo");
    expect(result.scientificQualification?.individualDoseApproved).toBe(false);
    if (["historical_incomplete", "incompatible_discipline", "invalid_direct_flux_claim"].includes(c.name)) expect(result.scientificQualification?.admissibility).toBe("not_established");
    return { case: c.name, calculationCategoryBeforeAndAfter: result.v2.source, valueBeforeAndAfter: result.value, internalConfidenceBeforeAndAfter: result.confidence, internalMarginBeforeAndAfter: result.errorMargin, legacyLabelBefore: "VLamax (mesurée labo)", labelAfter: result.label, scientificQualification: result.scientificQualification };
  });
  const legacyTypeAlone = qualifyReference(null, { subjectId: subject, quantity: "vlamax", value: 0.42, unit: "mmol/L/s", discipline: "bike" });
  expect(legacyTypeAlone.status).toBe("unknown");
  if (process.env.PHYSIOLOGY_V23_EVIDENCE === "1") writeFileSync("docs/physiology-validation/v2.3/evidence/source-qualification-matrix.json", JSON.stringify({ syntheticOnly: true, noNewExperimentalObservation: true, rows }, null, 2) + "\n");
});
