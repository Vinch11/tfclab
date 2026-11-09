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
