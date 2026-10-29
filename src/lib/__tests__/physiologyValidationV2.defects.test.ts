import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import * as original from "@/lib/effectiveRefs";
import { mapExtractToSnapshot as originalMapper } from "@/lib/labImport/snapshotMapper";
import { createEmptyLabExtract } from "@/lib/labImport/types";
import type { DbAthlete, DbSnapshot } from "@/hooks/useCloudData";


const refs = original;
const mapper = originalMapper;
const athlete = (values: Record<string, number | null>) => ({ id: "synthetic:v1", refs: values } as unknown as DbAthlete);

describe("F1 — profile fallback uses the existing snapshot admission bounds", () => {
  it.each([-1, 501, NaN, Infinity])("rejects invalid profile FTP %s", value => {
    const result = refs.getEffectiveRefs(athlete({ ftp: value, weightKg: 70 }), []);
    expect(result.ftp).toBeNull();
    expect(result.sources.ftp).toBe("none");
    expect(original.computeFtpKg(result)).toBeNull();
  });
  it("preserves every valid profile reference, including existing boundaries", () => {
    const values = { weightKg: 30, fatPct: 3, fcMax: 100, vma: 8, ftp: 50, css: 50, vo2max: 20 };
    expect(refs.getEffectiveRefs(athlete(values), [])).toEqual(original.getEffectiveRefs(athlete(values), []));
  });
  it("preserves valid active snapshot priority and does not mutate inputs", () => {
    const a = { ...athlete({ ftp: -1 }), active_snapshot_id: "old" } as DbAthlete;
    const snapshots = [
      { id: "old", athlete_id: a.id, date: "2026-10-01", ftp: 280 },
      { id: "new", athlete_id: a.id, date: "2026-10-28", ftp: 300 },
    ] as DbSnapshot[];
    const before = structuredClone({ a, snapshots });
    expect(refs.getEffectiveRefs(a, snapshots).ftp).toBe(280);
    expect({ a, snapshots }).toEqual(before);
  });
});

describe("F2 — storage provenance must not claim a direct measurement", () => {
  it("labels a snapshot as storage, including Profil Express estimates", () => {
    expect(refs.getSourceLabel("snapshot")).toBe("Stocké (snapshot)");
  });
  it("preserves profile and absent labels", () => {
    for (const source of ["profile", "none"] as const) {
      expect(refs.getSourceLabel(source)).toBe(original.getSourceLabel(source));
    }
  });
});

describe("F3 — explicit running laboratory VLamax reaches the running snapshot field", () => {
  it("preserves explicit report sport and VLamax scientific source", () => {
    const extract = createEmptyLabExtract();
    extract.meta.reportDate = "2026-10-20";
    extract.meta.sourceConfidence = 0.9;
    extract.performance.sport = "run";
    extract.performance.vo2max_ml_kg_min = 60;
    extract.vlamax = { value: 0.42, source: "lab" };
    const payload = mapper(extract, "Marathon");
    expect(payload.vlamax_run).toBe(0.42);
    expect(payload.vlamax).toBeNull();
    expect(payload.sport_main).toBe("run");
    expect(payload.vlamax_source).toBe("lab");
    expect(payload.confidence).toBe(0.9);
    expect(payload.date).toBe("2026-10-20");
  });
  it("keeps bike values and does not invent laboratory provenance", () => {
    const extract = createEmptyLabExtract();
    extract.performance.sport = "bike";
    extract.vlamax = { value: 0.5, source: null };
    const payload = mapper(extract, "Cyclisme");
    expect(payload.vlamax).toBe(0.5);
    expect(payload.vlamax_run).toBeNull();
    expect(payload.vlamax_source ?? null).toBeNull();
  });
  it("leaves ambiguous triathlon reports for explicit segment review", () => {
    const extract = createEmptyLabExtract();
    extract.performance.sport = "tri";
    const payload = mapper(extract, "IM");
    expect(payload.vlamax).toBeNull();
    expect(payload.vlamax_run).toBeNull();
    expect(payload.sport_main).toBe("tri");
  });
});
