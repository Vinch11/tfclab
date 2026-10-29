import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { TestLibrary } from "@/types/testLibrary";
import type { Athlete, AthleteRefs } from "@/types/athlete";
import type { DbAthlete, DbSnapshot } from "@/hooks/useCloudData";
import { getEffectiveRefs, computeFtpKg } from "@/lib/effectiveRefs";
import { QA_PROFILES } from "@/lib/plan/qa/syntheticProfiles";
import { buildPilotDiagnosticInput, buildPilotFormConfig } from "@/lib/plan/qa/preparePilotTrainingPlanContext";
import { prepareTrainingPlanContext } from "@/engines/plan/prepareTrainingPlanContext";
import { computeVLamaxEffectif } from "@/lib/vlamaxEffectif";
import { mapSnapshotToV2 } from "@/lib/mapSnapshotToV2";
import { createEmptyLabExtract } from "@/lib/labImport/types";
import { mapExtractToSnapshot } from "./candidates";
import { mergeTestingWeekSnapshots, buildConsolidatedSnapshotPayload } from "@/lib/testingWeekSnapshotMerge";
import { computeMLSSConfidenceInterval } from "@/lib/v2/inscydPoffe2024Sensitivity";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-29T14:00:00Z"));
  vi.stubGlobal("fetch", () => { throw new Error("NETWORK_FORBIDDEN"); });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function evidence(name: string, value: unknown) {
  if (process.env.PHYSIOLOGY_WRITE_EVIDENCE === "1") {
    writeFileSync(`docs/physiology-validation/v1/evidence/${name}.json`, JSON.stringify(value, null, 2) + "\n");
  }
}

describe("existing raw calculators → effective refs → diagnostic → planning contract", () => {
  it("preserves FTP watts, CSS seconds/100m, VMA km/h and Cooper estimate", () => {
    const a = { historique: [], vo2max: null } as unknown as Athlete;
    const refs = {} as AthleteRefs;
    const run = (id: string, input: Record<string, number>) => TestLibrary.find(t => t.id === id)!.compute(a, input, refs);
    const ftp = run("bike_ftp", { p20: 300 });
    const css = run("swim_css", { t400: 440, t200: 220 });
    const cooper = run("run_cooper", { distance: 3000 });
    const vma = run("run_vma", { vma: 18 });
    expect([ftp.ok, css.ok, cooper.ok, vma.ok]).toEqual([true, true, true, true]);
    expect(refs.ftp).toBe(285);
    expect(refs.css).toBe(110);
    expect(refs.vma).toBe(18);
    expect(cooper.raw.vo2max_est).toBe(55.8);
    const athlete = { id: "synthetic:v1-chain", refs: {} } as DbAthlete;
    const snapshot = { id: "raw", athlete_id: athlete.id, date: "2026-10-28", source: "synthetic_field_estimates",
      ftp: refs.ftp, css: refs.css, vma: refs.vma, vo2max: cooper.raw.vo2max_est, weight_kg: 70 } as DbSnapshot;
    const effective = getEffectiveRefs(athlete, [snapshot]);
    const profile = QA_PROFILES.find(p => p.id === "B-IM")!;
    const diagnosticInput = { ...buildPilotDiagnosticInput(profile), athleteId: athlete.id,
      ftp: effective.ftp, ftpKg: computeFtpKg(effective), css: effective.css, vma: effective.vma,
      weightKg: effective.weightKg, vo2max: effective.vo2max, snapshotDate: snapshot.date };
    const prepared = prepareTrainingPlanContext({ diagnosticInput, formConfig: buildPilotFormConfig(profile.planConfig) });
    for (const key of ["ftp", "css", "vma", "vo2max"] as const) expect(prepared.athleteData[key]).toBe(effective[key]);
    expect(prepared.athleteData.tte).toBe(prepared.diagnostic.effectifs.tte.tte_min);
    expect(prepared.athleteData.vlamax).toBe(prepared.diagnostic.effectifs.vlamax.value);
    expect(prepared.trace.diagnostic.confidenceGlobal).toBe(prepared.diagnostic.meta.confidenceGlobal);
    evidence("raw-to-plan", { syntheticOnly: true, raw: { ftp, css, cooper, vma }, snapshot,
      effective, diagnostic: prepared.diagnostic, athleteData: prepared.athleteData,
      limiters: prepared.planConfig.identifiedLimitersRaw, trace: prepared.trace,
      limitation: "assembly between library and DbSnapshot is explicit in this test, not a browser/DB save replay" });
  });

  it("retains a running laboratory value and its uncertainty through candidate mapper and canonical effectif", () => {
    const extract = createEmptyLabExtract();
    extract.meta.reportDate = "2026-10-20";
    extract.performance.sport = "run";
    extract.performance.vo2max_ml_kg_min = 60;
    extract.anthropo.weight_kg = 70;
    extract.vlamax = { value: 0.42, source: "lab" };
    const snapshot = { ...mapExtractToSnapshot(extract, "Marathon"), id: "lab", athlete_id: "synthetic:v1-lab" } as DbSnapshot;
    const effective = computeVLamaxEffectif({ athleteId: snapshot.athlete_id, objectif: "Marathon", tests: [], snapshots: [mapSnapshotToV2(snapshot)] });
    expect(effective.value).toBe(0.42);
    expect(effective.isLocked).toBe(true);
    expect(effective.confidence).toBeGreaterThan(0.9);
    const seed = QA_PROFILES.find(p => p.id === "B-MARATHON")!;
    const prepared = prepareTrainingPlanContext({ diagnosticInput: { ...buildPilotDiagnosticInput(seed),
      athleteId: snapshot.athlete_id, vlamaxRun: 0.42, vlamaxSource: "lab", vlamaxEffectifPrecomputed: effective },
      formConfig: buildPilotFormConfig(seed.planConfig) });
    expect(prepared.diagnostic.effectifs.vlamax).toBe(effective);
    expect(prepared.athleteData.vlamax).toBe(0.42);
    evidence("candidate-run-lab-to-plan", { syntheticOnly: true, snapshot, effective,
      diagnosticEffectif: prepared.diagnostic.effectifs.vlamax, transmittedAthlete: prepared.athleteData });
  });

  it("records the existing consolidation provenance limit without changing it", () => {
    // Same synthetic shape and latest-per-field rule as testingWeekSnapshotMerge.test.ts.
    const inputs = [
      { id: "bike", athlete_id: "synthetic:merge", date: "2026-10-10", source: "bike_test", ftp: 280 },
      { id: "run", athlete_id: "synthetic:merge", date: "2026-10-20", source: "cap_test", vma: 18 },
    ] as DbSnapshot[];
    const merged = mergeTestingWeekSnapshots("synthetic:merge", inputs, "2026-10-01");
    const payload = buildConsolidatedSnapshotPayload(merged, "2026-10-29");
    expect(merged.fieldOrigins.ftp?.date).toBe("2026-10-10");
    expect(payload.ftp).toBe(280);
    expect(payload.coach_notes).toContain("2026-10-10");
    evidence("consolidation-provenance", { syntheticOnly: true, merged, payload,
      limitation: "fieldOrigins exists in preview; payload retains source/date list in notes, not a structured per-field mapping" });
  });

  it("uncertainty widens at lower confidence under the existing sensitivity convention", () => {
    const lab = computeMLSSConfidenceInterval({ pmlssW: 280, vo2maxConfidence: 1, vlamaxConfidence: 1 });
    const estimated = computeMLSSConfidenceInterval({ pmlssW: 280, vo2maxConfidence: 0.5, vlamaxConfidence: 0.5 });
    expect(lab.uncertaintyW).toBe(26);
    expect(estimated.uncertaintyW).toBeGreaterThan(lab.uncertaintyW);
    evidence("mlss-uncertainty", { lab, estimated, scope: "software propagation convention, not TFCLab experimental accuracy" });
  });
});
