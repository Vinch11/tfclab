import { describe, expect, it } from "vitest";
import { getEffectiveRefs } from "@/lib/effectiveRefs";
import type { DbAthlete, DbSnapshot } from "@/hooks/useCloudData";

const snap = (id: string, date: string, extra: Partial<DbSnapshot> = {}) => ({ id, athlete_id: "a", date, created_at: date, ...extra }) as unknown as DbSnapshot;
const athlete = { id: "a", active_snapshot_id: "new", refs: {} } as unknown as DbAthlete;

describe("poids d'un bilan précédent", () => {
  it("un nouveau bilan sans poids garde le dernier poids mesuré, avec sa date", () => {
    const r = getEffectiveRefs(athlete, [snap("old", "2026-09-01", { weight_kg: 58, ftp: 200 }), snap("new", "2026-11-25", { ftp: 188 })]);
    expect(r.weightKg).toBe(58);
    expect(r.ftp).toBe(188);
    expect(r.carriedFrom).toEqual({ weightKg: "2026-09-01" });
  });
  it("ne reprend ni un poids de plus d'un an, ni une valeur de test", () => {
    const r = getEffectiveRefs(athlete, [snap("old", "2025-06-01", { weight_kg: 58, vma: 14 }), snap("new", "2026-11-25")]);
    expect(r.weightKg).toBeNull();
    expect(r.vma).toBeNull();
    expect(r.carriedFrom).toBeUndefined();
  });
});
