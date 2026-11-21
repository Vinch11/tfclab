import { staffLactateUpdate } from "@/lib/vlamaxEvidence";
import { describe, it, expect } from "vitest";
import { pickReferenceSnapshot } from "@/lib/referenceSnapshot";
import { computeVLamaxEffectif } from "@/lib/vlamaxEffectif";
import { computeDiagnostic } from "@/engines/diagnostic/computeDiagnostic";
import { snapshotSchema } from "@/lib/validationSchemas";

const A = "a1";
const snap = (id: string, date: string, created_at: string, extra: Record<string, unknown> = {}) =>
  ({ id, athlete_id: A, date, created_at, ...extra });

describe("bilan de référence", () => {
  it("prend le bilan actif même s'il est plus ancien", () => {
    const list = [snap("old", "2026-01-01", "2026-01-01T10:00"), snap("new", "2026-11-09", "2026-11-09T10:00")];
    expect(pickReferenceSnapshot(list, A, "old")?.id).toBe("old");
  });
  it("même date : le dernier créé gagne, quel que soit l'ordre", () => {
    const x = snap("x", "2026-11-09", "2026-11-09T08:00");
    const y = snap("y", "2026-11-09", "2026-11-09T20:00");
    expect(pickReferenceSnapshot([x, y], A)?.id).toBe("y");
    expect(pickReferenceSnapshot([y, x], A)?.id).toBe("y");
  });
  it("ajouter un ancien bilan ne change pas la référence", () => {
    const ref = snap("ref", "2026-11-09", "2026-11-09T08:00");
    expect(pickReferenceSnapshot([ref, snap("hist", "2025-05-01", "2025-05-01T08:00")], A)?.id).toBe("ref");
  });
});

describe("VLamax vélo verrouillée seulement avec preuve", () => {
  const base = { athleteId: A, objectif: "70.3", tests: [], sportOverride: "velo" as const };
  it("une VLamax stockée sans preuve n'est pas une mesure labo", () => {
    const r = computeVLamaxEffectif({ ...base, snapshots: [snap("s", "2026-11-09", "t", { vlamax: 0.6, source: "manual", ftp: 220, weight_kg: 60 })] as any });
    expect(r.source).not.toBe("snapshot");
    expect(r.details?.testType).not.toBe("LACTATE_LAB");
  });
  it("une VLamax déclarée mesurée en labo reste verrouillée", () => {
    const r = computeVLamaxEffectif({ ...base, snapshots: [snap("s", "2026-11-09", "t", { vlamax: 0.6, vlamax_source: "lab" })] as any });
    expect(r.source).toBe("snapshot");
    expect(r.details?.testType).toBe("LACTATE_LAB");
  });
});

describe("durabilité inconnue", () => {
  it("sans aucune donnée de durabilité, la TTE est « inconnue », jamais limitante", () => {
    const d = computeDiagnostic({ vo2max: 55, ftpKg: 3.5, ftp: null, weight: 60, vma: 16, objectif: "Marathon", sportFocus: "run", ambition: "competitor", age: 35 } as any);
    const t = (d as any).limiter.gapAnalysis.find((m: any) => m.metric === "TTE");
    expect(t.value).toBeNull();
    expect(t.status).toBe("unknown");
  });
});

describe("validation des modifications", () => {
  it("rejette une durée tenue au seuil course hors limites", () => {
    expect(snapshotSchema.partial().safeParse({ tte_observed_min_run: 500 }).success).toBe(false);
    expect(snapshotSchema.partial().safeParse({ tte_observed_min_run: 40 }).success).toBe(true);
  });
});

describe("parcours bilan → profil par discipline", () => {
  const base = { athleteId: A, objectif: "IM", snapshots: [], tests: [] };
  const snapshot = { id: "s", athlete_id: A, date: "2026-11-01" };
  const sportTest = (sport: string, value: number, date: string) => ({
    athlete_id: A, name: "Sprint lactate", type: "VLAMAX_LAB", sport, date, vlamax: value,
  });

  it("réserve chaque test lactate au sport renseigné, même si son titre est générique", () => {
    const tests = [sportTest("Cyclisme", .35, "2026-11-01"), sportTest("Course à pied", .60, "2026-11-02"), sportTest("Natation", .72, "2026-11-03")];
    for (const [sport, value] of [["velo", .35], ["cap", .60], ["natation", .72]] as const) {
      const result = computeVLamaxEffectif({ ...base, sportOverride: sport, tests });
      expect(result.value).toBe(value);
      expect(result.v2?.source).toBe("test_labo");
    }
    expect(computeVLamaxEffectif({ ...base, sportOverride: "cap", tests: [tests[0]] }).value).toBeNull();
    expect(computeVLamaxEffectif({ ...base, sportOverride: "natation", snapshots: [{ ...snapshot, vlamax: .35, source: "staff", ftp: 300, weight_kg: 75 }] }).value).toBeNull();
  });

  it("conserve une estimation course renseignée lorsque les autres entrées manquent", () => {
    const result = computeVLamaxEffectif({ ...base, sportOverride: "cap", snapshots: [{ ...snapshot, vlamax_run: .49 }] });
    expect(result.value).toBe(.49);
    expect(result.isLocked).toBe(false);
  });

  it("conserve les mesures déclarées à la création, à la modification et au retrait d’une discipline", () => {
    const bike = { ...snapshot, ...staffLactateUpdate({}, .35, null), vlamax: .35, vlamax_run: null };
    const both = { ...bike, ...staffLactateUpdate(bike, .35, .63), vlamax_run: .63 };
    const run = { ...both, ...staffLactateUpdate(both, null, .63), vlamax: null };
    const onlyBike = { ...both, ...staffLactateUpdate(both, .35, null), vlamax_run: null };
    for (const [row, sport, expected] of [[bike,"velo",.35], [both,"velo",.35], [both,"cap",.63], [run,"cap",.63], [onlyBike,"velo",.35]] as const) {
      const result = computeVLamaxEffectif({ ...base, snapshots: [row], sportOverride: sport });
      expect(result.value).toBe(expected);
      expect(result.isLocked).toBe(true);
    }
  });

  it("garde les estimations visibles et exclut les mesures dérivées du classement", () => {
    const diagnosis = (source: string, observed: boolean) => computeDiagnostic({
      athleteId: A, objectif: "IM", ambition: "competitor", age: 35, sportFocus: "bike",
      vlamaxEffectifPrecomputed: { value: .8, source, confidence: .85 },
      tteEffectifPrecomputed: { tte_min: 12, source: observed ? "observed" : "records", confidence: .6 },
      fatmax: 30, fatmaxSource: "model",
    } as Parameters<typeof computeDiagnostic>[0]);
    const estimated = diagnosis("estimated", false);
    expect(estimated.limiter.primaryLimiter).toBe("none");
    expect(estimated.synthesis.headline).toContain("hypothèse à vérifier");
    for (const metric of ["VLamax", "FatMax", "TTE"]) {
      const gap = estimated.limiter.gapAnalysis.find(g => g.metric === metric);
      expect(gap?.value).toBeGreaterThan(0);
      expect(gap?.prescriptionApplicable).toBe(false);
    }
    const observed = diagnosis("snapshot", true);
    const ranked = observed.limiter.categoryRanking.flatMap(group => group.metrics.map(metric => metric.metric));
    expect(ranked).toEqual(expect.arrayContaining(["TTE", "VLamax"]));
    expect(ranked).not.toContain("FatMax");
  });
});
