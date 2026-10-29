import { describe, expect, it, vi } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { transpileModule, ModuleKind, ScriptTarget } from "typescript";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import * as predictor from "@/lib/v2/runMLSSPredictor";
import { computeDiagnostic } from "@/engines/diagnostic/computeDiagnostic";
import type { DiagnosticInput } from "@/engines/diagnostic/types";

const root = "docs/physiology-validation/v2.2/evidence/";
const fixtures: { physiology: { id: string; raw: DiagnosticInput; envelope: Record<string, unknown> }[]; verifiedArtifacts: Record<string, unknown> } = JSON.parse(readFileSync(root + "v25-physiology-fixtures.json", "utf8"));
const source = readFileSync(root + "V25_PHYSIOLOGY_SOURCE.txt", "utf8");
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const compiled = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2020 } }).outputText;
const exports: Record<string, unknown> = {};
runInNewContext(compiled, { exports, require: (id: string) => {
  if (id === "@/lib/v2/runMLSSPredictor") return predictor;
  if (id === "./v9-prospective") return { digest };
  throw Error("Unapproved import: " + id);
} });
type Result = { status: string; reasons: string[]; experimental: { prediction: ReturnType<typeof predictor.predictRunMLSSPctFromVLaCE> }; nativeRefusalsRemoved: number; individualDoseApproved: boolean };
const consume = exports.consumeRunCostV25 as (envelope: Record<string, unknown>, raw: DiagnosticInput, native: ReturnType<typeof computeDiagnostic>["runMLSS"], asOf: string, context: { simulation: boolean; verifiedArtifacts: Record<string, unknown> }) => Result;

describe("V2.2 read-only execution of pinned V25 cost consumer against current #425", () => {
  it("keeps absent native cost separate from the explicitly documented synthetic context", () => {
    const rows = fixtures.physiology.map(f => {
      const frozen = structuredClone(f.raw);
      expect(digest(f.raw)).toBe(f.envelope.rawInputHash);
      const native = computeDiagnostic(f.raw).runMLSS;
      expect(native).toBeNull(); // no pace and no explicit native cost in this unchanged fixture
      const result = consume(f.envelope, f.raw, native, "2026-10-29T12:00:00Z", { simulation: true, verifiedArtifacts: fixtures.verifiedArtifacts });
      expect(result.status).toBe(f.id === "typed_cost_from_separate_424_fixture" ? "typed_context_consumed_for_review" : "hold_typed_reference");
      if (f.id === "typed_cost_from_separate_424_fixture") expect(result.experimental.prediction?.mlssPct).toBe(83.2);
      else expect(result.experimental.prediction).toBeNull();
      expect(result.nativeRefusalsRemoved).toBe(0); expect(result.individualDoseApproved).toBe(false);
      expect(f.raw).toEqual(frozen);
      return { id: f.id, native, result };
    });
    if (process.env.PHYSIOLOGY_V22_EVIDENCE === "1") writeFileSync(root + "det-v25-probe.json", JSON.stringify(rows, null, 2) + "\n");
  });
  it("refuses a relabelled score even when its envelope claims the oxygen unit", () => {
    const f = fixtures.physiology[0];
    const r = consume({ ...f.envelope, value: 65 }, f.raw, null, "2026-10-29T12:00:00Z", { simulation: true, verifiedArtifacts: fixtures.verifiedArtifacts });
    expect(r.status).toBe("hold_typed_reference");
    expect(r.experimental.prediction).toBeNull();
  });
});
