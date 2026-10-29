import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { qualifyReference, requalifyReference, scientificReferenceLabel, qualifyScoreEnvelope, type ReferenceEvidence } from "@/lib/scientificQualification";
import { resolveVlamaxForGoal } from "@/lib/vlamaxResolver";
import { snapshotToEngineData } from "@/lib/v2/cycleIntelligence";
import { computeVLamaxEffectif, toVLamaxEnvelope } from "@/lib/vlamaxEffectif";
import { computeDiagnostic } from "@/engines/diagnostic/computeDiagnostic";
import { buildPlanAthleteDataFromDiagnostic } from "@/engines/plan/planConfigBuilder";
import { diagnosticPhysiologicalEvidence, appendPhysiologyEvidence, snapshotPhysiologyEvidence } from "@/lib/physiologyEvidence";
import { buildPilotDiagnosticInput } from "@/lib/plan/qa/preparePilotTrainingPlanContext";
import { QA_PROFILES } from "@/lib/plan/qa/syntheticProfiles";
import { VLamaxUnifiedCard } from "@/components/VLamaxUnifiedCard";
import { ScoreEnvelopeDisplay } from "@/components/ScoreEnvelopeDisplay";
import { LabAthleteValidator } from "@/components/calibration/LabAthleteValidator";
import { buildVLamaxZoneConfidenceHTML } from "@/components/ExportTools";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const subject = "synthetic:A";
const context = { subjectId: subject, quantity: "vlamax", discipline: "bike", value: 0.42, unit: "mmol/L/s" };
const proof: ReferenceEvidence = { ...context, discipline: "bike", method: "Synthetic versioned model", date: "2026-10-20", sourceRef: "fixture:model-A", nature: "estimated", methodKind: "physiological_model" };
const input = () => ({ ...buildPilotDiagnosticInput(QA_PROFILES.find(p => p.id === "B-IM")!), athleteId: subject, vlamax: 0.42, vlamaxSource: null });
const run = { id: "synthetic:run", athlete_id: subject, date: "2026-10-20", sport_main: "run", objectif: "10 km", vlamax_run: 0.7, vma: 18, pace_threshold_sec_per_km: 235 };
const lactate: ReferenceEvidence = { ...proof, value: 0.7, discipline: "run", nature: "calculated", methodKind: "blood_lactate_protocol", method: "Synthetic post-sprint lactate calculation", primaryMeasurementSourceRef: "fixture:primary-lactate-A" };
const metadata = (p: ReferenceEvidence) => appendPhysiologyEvidence("Synthetic only", { version: 1, date: null, storageSource: "synthetic", confidence: null, confidenceBasis: "unknown", parameters: { [p.discipline === "run" ? "vlamax_run" : "vlamax"]: p } });

it.each(["Aucune mesure labo, valeur coach inconnue", "pas de laboratoire", "ancien test lactate labo non réalisé", "labo", "LAB"])("A1: free text %s never selects the lactate priority", text => {
  const plain = resolveVlamaxForGoal(run, { id: subject, goal: "10 km" });
  const denied = resolveVlamaxForGoal({ ...run, vlamax_protocol: text }, { id: subject, goal: "10 km" });
  expect(denied.value).toBe(0.42); expect(denied.value).toBe(plain.value);
  expect(denied.confidence).toBe(0.4); expect(denied.confidence).toBe(plain.confidence);
  expect(denied.scientificQualification?.admissibility).toBe("not_established");
  const effect = computeVLamaxEffectif({ athleteId: subject, objectif: "10 km", snapshots: [{ ...run, vlamax_protocol: text }], tests: [] });
  const control = computeVLamaxEffectif({ athleteId: subject, objectif: "10 km", snapshots: [run], tests: [] });
  expect(effect.value).toBe(control.value); expect(effect.confidence).toBe(control.confidence);
  expect(effect.v2.source).not.toBe("test_labo"); expect(effect.scientificQualification?.status).toBe("unknown");
  const cycle = snapshotToEngineData({ ...run, vlamax_protocol: text });
  expect(cycle.vlamax).toBe(snapshotToEngineData(run).vlamax);
  expect(cycle.vlamaxQualification?.status).toBe("unknown");
});
it("A1: structured primary lactate provenance preserves the justified run reference through diagnostic, cycle and planning", () => {
  const snap = { ...run, coach_notes: metadata(lactate) };
  const evidence = snapshotPhysiologyEvidence(snap);
  const resolved = resolveVlamaxForGoal({ ...run, physiologicalEvidence: evidence }, { id: subject, goal: "10 km" });
  expect(resolved.value).toBe(0.7); expect(resolved.confidence).toBe(0.92);
  expect(resolved.scientificQualification?.nature).toBe("calculated");
  const effect = computeVLamaxEffectif({ athleteId: subject, objectif: "10 km", snapshots: [{ ...run, physiologicalEvidence: evidence }], tests: [] });
  expect(effect.value).toBe(0.7); expect(effect.v2.source).toBe("test_labo");
  const cycle = snapshotToEngineData(snap); expect(cycle.vlamax).toBe(0.7); expect(cycle.vlamaxQualification?.status).toBe("documented_context");
  const d = computeDiagnostic({ ...input(), sportFocus: "run", objectif: "10 km", vlamax: null, vlamaxRun: 0.7, vma: 18, paceThresholdSecPerKm: 235, physiologicalEvidence: evidence });
  expect(d.effectifs.vlamax.value).toBe(0.7);
  expect(buildPlanAthleteDataFromDiagnostic(d).physiologicalEvidence?.vlamaxEffective.scientificQualification?.individualDoseApproved).toBe(false);
});
it.each(["LAB", "LACTATE_LAB", "VLAMAX_LAB"])("A1: test category %s alone cannot outrank the model; structured evidence can", type => {
  const test = { athlete_id: subject, date: "2026-10-20", sport: "run", type, name: "Aucune mesure labo", vlamax: 0.7 };
  const params = { athleteId: subject, objectif: "10 km", snapshots: [run], tests: [test] };
  const incomplete = computeVLamaxEffectif(params);
  expect(incomplete.value).not.toBe(0.7); expect(incomplete.v2.source).toBe("estimation");
  const documented = computeVLamaxEffectif({ ...params, tests: [{ ...test, raw: { physiologicalEvidence: { vlamax: lactate } } }] });
  expect(documented.value).toBe(0.7); expect(documented.scientificQualification?.evidence?.methodKind).toBe("blood_lactate_protocol");
});
it("A1: false priority disappears from the same diagnostic and planning input without disabling the model route", () => {
  const plain = { ...input(), sportFocus: "run" as const, objectif: "10 km", vlamax: null, vlamaxRun: 0.7, vma: 18, paceThresholdSecPerKm: 235 };
  const d0 = computeDiagnostic(plain), d1 = computeDiagnostic({ ...plain, vlamaxProtocol: "Aucune mesure labo, valeur coach inconnue" });
  expect(d1.effectifs.vlamax.value).toBe(d0.effectifs.vlamax.value); expect(d1.effectifs.vlamax.value).not.toBe(0.7);
  expect(d1.effectifs.vlamax.confidence).toBe(d0.effectifs.vlamax.confidence);
  expect(d1.effectifs.vlamax.v2.source).not.toBe("test_labo");
  const e = buildPlanAthleteDataFromDiagnostic(d1).physiologicalEvidence?.vlamaxEffective;
  expect(e?.value).toBe(d0.effectifs.vlamax.value); expect(e?.scientificQualification?.admissibility).toBe("not_established");
});
it.each([["synthetic:A", "synthetic:B"], ["synthetic:B", "synthetic:A"], ["synthetic:A", undefined]])("A2: cached qualification %s cannot authorize current subject %s", (stored, current) => {
  const q = qualifyReference({ ...proof, subjectId: stored }, { ...context, subjectId: stored });
  expect(requalifyReference(q, 0.42, "bike", current).status).toBe("unknown");
  expect(scientificReferenceLabel(q, 0.42, "bike", current)).toContain("inconnue");
  const effect = { ...computeDiagnostic(input()).effectifs.vlamax, scientificQualification: q };
  const r = render(<VLamaxUnifiedCard athleteId={current} objectif="Ironman" vlamaxEffectif={effect} />);
  expect(r.container.textContent).toContain("provenance scientifique inconnue");
  expect(r.container.textContent).not.toContain("inférence de modèle documentée");
  const html = buildVLamaxZoneConfidenceHTML({ athlete: { id: current, goal: "IM" }, vlamax: { ...effect, v2: { ...effect.v2, scientificQualification: q } } });
  expect(html).toContain("provenance scientifique inconnue");
});
it("A2: matching external identity permits documentary context, but a cached identity never substitutes for it", () => {
  const q = qualifyReference(proof, context);
  expect(requalifyReference(q, 0.42, "bike", subject).status).toBe("documented_context");
  expect(requalifyReference(q, 0.42).admissibility).toBe("not_established");
  const effect = computeDiagnostic(input()).effectifs.vlamax;
  expect(toVLamaxEnvelope({ ...effect, scientificQualification: q }, "IM", subject, "bike").scientificQualification?.status).toBe("documented_context");
  const history = { ...effect, scientificQualification: undefined };
  expect(toVLamaxEnvelope(history, "IM", subject, "bike").scientificQualification?.status).toBe("unknown");
});
it.each([
  ["physiological_model", "estimated", "model_inference"], ["physiological_model", "calculated", "model_inference"],
  ["field_protocol", "estimated", "field_estimate"], ["coach_declaration", "declared", "coach_declared"],
  ["blood_lactate_protocol", "estimated", "model_inference"], ["blood_lactate_protocol", "calculated", "model_inference"],
] as const)("A3: method %s and nature %s preserve origin %s at every boundary", (methodKind, nature, origin) => {
  const p = { ...proof, methodKind, nature, primaryMeasurementSourceRef: "fixture:primary-lactate-A" };
  const snap = { id: "synthetic:origin", athlete_id: subject, date: "2026-10-29", vlamax: 0.42, sport_main: "bike", coach_notes: metadata(p) };
  const raw = snapshotPhysiologyEvidence(snap); expect(raw.vlamax.scientificOrigin).toBe(origin);
  const d = computeDiagnostic({ ...input(), physiologicalEvidence: raw });
  expect(d.effectifs.vlamax.scientificQualification?.evidence?.methodKind).toBe(methodKind);
  for (const e of [diagnosticPhysiologicalEvidence(d), buildPlanAthleteDataFromDiagnostic(d).physiologicalEvidence!]) {
    expect(e.vlamax.scientificOrigin).toBe(origin); expect(e.vlamaxEffective.scientificOrigin).toBe(origin);
  }
});
it.each([undefined, null, true, 123, "broken", [], {}, { why: null }, { metricId: "vlamax", why: [null, {}], recommendations: [42], range: { low: "bad", high: {} }, scientificQualification: { evidence: [] } }])("A4: malformed JSON envelope %j stays renderable without mutating history", raw => {
  const before = JSON.stringify(raw);
  const e = qualifyScoreEnvelope(raw, subject, "bike");
  expect(() => render(<ScoreEnvelopeDisplay envelope={raw as never} athleteId={subject} discipline="bike" />)).not.toThrow();
  expect(e.source).toBe("UNKNOWN"); expect(e.scientificQualification?.individualDoseApproved ?? false).toBe(false);
  expect(JSON.stringify(raw)).toBe(before);
});
it.each([null, {}, [null], 123, "broken"])("A4: malformed reasons %j cannot crash an otherwise valid historical envelope", why => {
  const env = { ...toVLamaxEnvelope(computeDiagnostic(input()).effectifs.vlamax, "IM"), why };
  const before = JSON.stringify(env);
  expect(() => render(<ScoreEnvelopeDisplay envelope={env as never} mode="staff" />)).not.toThrow();
  expect(JSON.stringify(env)).toBe(before);
});
it.each([null, true, 3, "labo", [], {}, { evidence: null }, { evidence: "bad" }, { evidence: { ...proof, nature: "measured" } }])("A4: corrupted serialized qualification %j never becomes admissible", raw => {
  expect(requalifyReference(raw as never, 0.42, "bike", subject).admissibility).toBe("not_established");
});
it("A5: actual laboratory form distinguishes lactate measurement, calculated VLamax and imported reference", () => {
  const r = render(<LabAthleteValidator />);
  expect(r.container.textContent).not.toContain("mesurées en laboratoire");
  expect(r.container.textContent).toContain("lactate sanguin peut être mesuré");
  expect(r.container.textContent).toContain("VLamax est calculée ou estimée");
  expect(r.container.textContent).toContain("pas automatiquement validée scientifiquement");
});

it("A4: incomplete metric identity or incompatible displayed units cannot inherit documentary evidence", () => {
  const q = qualifyReference(proof, context);
  const env = toVLamaxEnvelope({ ...computeDiagnostic(input()).effectifs.vlamax, scientificQualification: q }, "IM", subject, "bike");
  for (const unit of [undefined, "mmol/L", "score/100"]) expect(qualifyScoreEnvelope({ ...env, unit }, subject, "bike").scientificQualification?.admissibility).toBe("not_established");
  expect(qualifyScoreEnvelope({ value: 0.42, source: "MEASURED", label: "VLamax mesurée labo", scientificQualification: q }, subject, "bike").source).toBe("UNKNOWN");
});
