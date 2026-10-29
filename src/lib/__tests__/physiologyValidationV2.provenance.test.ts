import type { DbAthlete, DbSnapshot } from "@/hooks/useCloudData";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { appendPhysiologyEvidence, snapshotPhysiologyEvidence, runningEconomyCostFromSnapshot, validRunningEconomyCost, preservePhysiologyNotes } from "@/lib/physiologyEvidence";
import { computeRunMLSSFromInput } from "@/engines/diagnostic/computeDiagnostic";
import { createEmptyLabExtract } from "@/lib/labImport/types";
import { mapExtractToSnapshot } from "@/lib/labImport/snapshotMapper";
import { getEffectiveRefs } from "@/lib/effectiveRefs";
import { computeVLamaxEffectif } from "@/lib/vlamaxEffectif";
import { mapTestToV2 } from "@/lib/mapSnapshotToV2";

function athleteWithRefs(refs: DbAthlete["refs"]): DbAthlete {
  return { id: "synthetic", coach_id: "synthetic", name: "Synthetic", goal: null, refs,
    vo2max: null, sex: null, active_snapshot_id: null, birth_date: null, is_hidden: false, created_at: "2026-10-20" };
}

describe("V2 — invalid/unknown provenance must not manufacture a physiological input", () => {
  it.each([null, undefined, NaN, Infinity, -1, 0, 3, 65, 149, 281, "200"])("does not predict from invalid explicit cost %s", cost => {
    expect(validRunningEconomyCost(cost)).toBeNull();
    expect(computeRunMLSSFromInput({ sportFocus: "run", vlamaxRun: 0.5, vma: null, paceThresholdSecPerKm: null, runningEconomyCostMlKgKm: cost as number })).toBeNull();
  });
  it("does not turn an old narrative cost or a score into an explicit cost", () => {
    expect(runningEconomyCostFromSnapshot({ run_economy_score: 65, vma: 18, coach_notes: "Économie: 200 ml/kg/km" })).toBeNull();
  });
  it("does not substitute storage date for unknown test date", () => {
    const result = snapshotPhysiologyEvidence({ date: "2026-10-29", ftp: 280, source: "manual" });
    expect(result.ftp.date).toBeNull();
    expect(result.ftp.scientificOrigin).toBe("unknown");
    expect(result.ftp.method).toBeNull();
    expect(result.ftp.errorMargin).toBeNull();
  });
  it("attributes a valid profile fallback to the profile rather than an invalid snapshot", () => {
    const snapshot = { id: "s", coach_id: "synthetic", athlete_id: "synthetic", date: "2026-10-20", ftp: 800, source: "manual" };
    const references = getEffectiveRefs(athleteWithRefs({ ftp: 280 }), [snapshot]);
    expect(snapshotPhysiologyEvidence(snapshot, references).ftp).toMatchObject({ value: 280, storageSource: "athlete.refs", date: null, scientificOrigin: "unknown" });
  });
  it("invalidates stale per-field evidence after scalar edit, preserving the new scalar as scientifically unknown", () => {
    const extract = createEmptyLabExtract(); extract.performance.sport = "run"; extract.performance.vma_kmh = 18;
    extract.meta.reportDate = "2026-10-20";
    const snapshot = mapExtractToSnapshot(extract, "Marathon");
    expect(snapshotPhysiologyEvidence(snapshot).vma.date).toBe("2026-10-20");
    expect(snapshotPhysiologyEvidence({ ...snapshot, vma: 19 }).vma).toMatchObject({ value: 19, date: null, scientificOrigin: "unknown" });
  });
  it("keeps an ambiguous VLamax recoverable without assigning bike/run", () => {
    const extract = createEmptyLabExtract(); extract.performance.sport = "tri"; extract.vlamax.value = 0.42;
    const snapshot = mapExtractToSnapshot(extract, "IM");
    expect(snapshot.vlamax).toBeNull(); expect(snapshot.vlamax_run).toBeNull();
    expect(snapshotPhysiologyEvidence(snapshot).unassignedVlamax).toMatchObject({ value: 0.42, discipline: "unknown" });
  });
  it("refuses malformed or dimensionally incompatible cost metadata", () => {
    expect(runningEconomyCostFromSnapshot({ coach_notes: "TFCL_PHYSIOLOGY_V1:broken" })).toBeNull();
    const notes = appendPhysiologyEvidence("", { version: 1, date: null, storageSource: "manual", confidence: null, confidenceBasis: "unknown", parameters: { runningEconomyCostMlKgKm: { value: 200, unit: "score/100", discipline: "run" } } });
    expect(runningEconomyCostFromSnapshot({ coach_notes: notes })).toBeNull();
    expect(preservePhysiologyNotes(notes, "edited")).toContain("TFCL_PHYSIOLOGY_V1:");
  });
  it.each([
    ["weightKg", 29, "weightKg"], ["fatPct", 51, "fatPct"], ["fcMax", 99, "fcMax"],
    ["vma", 31, "vma"], ["ftp", 501, "ftp"], ["css", 49, "css"], ["vo2max", 101, "vo2max"],
  ])("applies existing reference bounds to profile %s", (key, value, output) => {
    expect(getEffectiveRefs(athleteWithRefs({ [key]: value }), [])[output]).toBeNull();
  });
  it("does not let an explicitly running linked LAB test contaminate the bike pivot", () => {
    const test = mapTestToV2({ athlete_id: "synthetic", vlamax: 0.8, date: "2026-10-20", type: "LAB", name: "Test labo importé", sport: "run" });
    const result = computeVLamaxEffectif({ athleteId: "synthetic", objectif: "IM", tests: [test], snapshots: [] });
    expect(result.value).not.toBe(0.8);
    expect(result.isLocked).not.toBe(true);
  });
  it.each(["bike", "tri", "swim", "unknown"])("does not assign a linked %s laboratory VLamax to running", sport => {
    const test = mapTestToV2({ athlete_id: "synthetic", vlamax: 0.8, date: "2026-10-20", type: "LAB", name: "Test labo importé", sport });
    const result = computeVLamaxEffectif({ athleteId: "synthetic", objectif: "Marathon", tests: [test], snapshots: [] });
    expect(result.value).not.toBe(0.8);
  });
});
