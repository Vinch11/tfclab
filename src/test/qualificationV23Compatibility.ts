import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { expect } from "vitest";
import type { AthleteDiagnostic } from "@/engines/diagnostic/types";
type Row = Pick<AthleteDiagnostic, "effectifs" | "limiter" | "readiness" | "targets" | "runMLSS" | "synthesis"> & { id: string };
const rows: Row[] = JSON.parse(gunzipSync(readFileSync("docs/physiology-validation/v2.3/evidence/qa-reference-4d8c788f.json.gz")).toString());
export const referenceDiagnostic = (id: string) => rows.find(r => r.id === id)!;
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object";
/** Only explicitly reviewed presentation paths may differ. Every old number, boolean and decision remains exact. */
export function compareQualificationChanges(current: unknown, previous: unknown, path = ""): { path: string; before: unknown; after: unknown }[] {
  if (Object.is(current, previous)) return [];
  if (/^effectifs\.vlamax\.(scientificQualification|v2\.scientificQualification)$/.test(path)) {
    expect(previous, path).toBeUndefined(); expect(record(current), path).toBe(true);
    if (!record(current)) throw Error(path);
    expect(current.status, path).toBe("unknown");
    expect(current.individualValidityEstablished, path).toBe(false); expect(current.individualDoseApproved, path).toBe(false);
    return [{ path, before: null, after: current }];
  }
  if (/^effectifs\.vlamax\.(label|details\.protocol|v2\.(label|details|calibrationLog\.(reason|sources\.\d+)))$/.test(path)) {
    expect(typeof current, path).toBe("string"); expect(typeof previous, path).toBe("string");
    return [{ path, before: previous, after: current }];
  }
  if (record(current) && record(previous)) {
    return [...new Set([...Object.keys(previous), ...Object.keys(current)])].flatMap(k => compareQualificationChanges(current[k], previous[k], path ? `${path}.${k}` : k));
  }
  expect(current, path).toEqual(previous);
  return [];
}
export function assertQualificationCompatibility(id: string, d: AthleteDiagnostic) {
  const current: Row = { id, effectifs: d.effectifs, limiter: d.limiter, readiness: d.readiness, targets: d.targets, runMLSS: d.runMLSS, synthesis: d.synthesis };
  return compareQualificationChanges(current, referenceDiagnostic(id));
}
