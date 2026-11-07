import { assertQualificationCompatibility, referenceDiagnostic } from "@/test/qualificationV23Compatibility";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { computeDiagnostic } from "../computeDiagnostic";
import { QA_PROFILES } from "@/lib/plan/qa/syntheticProfiles";
import { buildPilotDiagnosticInput } from "@/lib/plan/qa/preparePilotTrainingPlanContext";
import { buildRunMLSSCoherenceHTML } from "@/components/ExportTools";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
type Row = { id: string; stableBlocks: Record<string, string>; runMLSS: ReturnType<typeof computeDiagnostic>["runMLSS"]; alerts: ReturnType<typeof computeDiagnostic>["synthesis"]["alerts"] };
const read = (name: string): Row[] => JSON.parse(readFileSync(`docs/physiology-validation/v2/evidence/${name}.json`, "utf8"));
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("V2.1 — retained QA and consequences of the 25 MLSS removals", () => {
  it("matches all 37 V2 outputs and never labels an unavailable comparison as successful", () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-29T14:00:00Z"));
    vi.stubGlobal("fetch", () => { throw Error("NETWORK_FORBIDDEN"); });
    vi.spyOn(console, "log").mockImplementation(() => {}); vi.spyOn(console, "warn").mockImplementation(() => {});
    const before = read("qa-before"), v2 = read("qa-after");
    const rows = QA_PROFILES.map(profile => {
      const d = computeDiagnostic(buildPilotDiagnosticInput(profile));
      const reference = v2.find(r => r.id === profile.id)!;
      const original = before.find(r => r.id === profile.id)!;
      const stableBlocks = Object.fromEntries(["effectifs", "limiter", "readiness", "targets"].map(key => [key, hash(d[key])]));
      assertQualificationCompatibility(profile.id, d);
      expect(hash(referenceDiagnostic(profile.id).effectifs), profile.id).toBe(reference.stableBlocks.effectifs);
      for (const key of ["limiter", "readiness", "targets"]) expect(stableBlocks[key], profile.id).toBe(reference.stableBlocks[key]);
      expect(d.runMLSS, profile.id).toEqual(reference.runMLSS);
      expect(d.synthesis.alerts, profile.id).toEqual(reference.alerts);
      const html = buildRunMLSSCoherenceHTML({ athlete: { goal: profile.planConfig.objective }, effectiveSnapshot: null, runMLSS: d.runMLSS });
      expect(d.runMLSS?.crossValidation ?? null, profile.id).toBeNull();
      expect(html, profile.id).not.toContain("Cross-validation observé vs prédit :</b>");
      expect(html, profile.id).not.toContain("Cohérence validée");
      return { id: profile.id, stableBlocks, predictionBefore: original.runMLSS?.prediction ?? null,
        predictionAfter: d.runMLSS?.prediction ?? null, proxyBefore: original.runMLSS?.observedPct ?? null,
        proxyAfter: d.runMLSS?.observedPct ?? null, effectiveSource: d.runMLSS?.effectiveSource ?? "none",
        alertsBefore: original.alerts, alertsAfter: d.synthesis.alerts,
        crossValidation: "unavailable, not successful", globalCategory: d.synthesis.globalCategory };
    });
    expect(rows).toHaveLength(37);
    expect(rows.filter(r => r.predictionBefore !== null && r.predictionAfter === null)).toHaveLength(25);
    expect(rows.filter(r => JSON.stringify(r.alertsBefore) !== JSON.stringify(r.alertsAfter)).map(r => r.id)).toEqual(["B-5K-BEGINNER"]);
    if (process.env.PHYSIOLOGY_V21_EVIDENCE === "1") writeFileSync("docs/physiology-validation/v2.1/evidence/qa-37-review.json", JSON.stringify(rows, null, 2) + "\n");
  });
});
