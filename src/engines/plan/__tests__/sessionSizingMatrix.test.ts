import { describe, it, expect } from "vitest";
import {
  computeWeeklySessionQuota,
  normalizeSizingObjective,
  normalizeSizingAmbition,
  inferWeekType,
} from "@/engines/plan/sessionSizingMatrix";

describe("sessionSizingMatrix — computeWeeklySessionQuota", () => {
  it("703 age_group 10h load → swim 3, total 11", () => {
    const r = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "load");
    expect(r).not.toBeNull();
    expect(r!.quota.swim.min).toBe(3);
    expect(r!.quota.swim.max).toBe(3);
    expect(r!.quota.totalSessions.min).toBe(11);
    expect(r!.downgraded).toBe(false);
  });

  it("703 elite 12h → downgraded=true vers competitor", () => {
    const r = computeWeeklySessionQuota("IRONMAN 70.3", "elite", 12, "load");
    expect(r).not.toBeNull();
    expect(r!.downgraded).toBe(true);
    expect(r!.downgradeReason).toBeTruthy();
    expect(r!.quota.strength.min).toBe(2); // competitor row
  });

  it("recovery 703 age_group → total ≤ 8, swim ≥ 2, strength ≥ 1", () => {
    const r = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "recovery");
    expect(r).not.toBeNull();
    expect(r!.quota.totalSessions.max).toBeLessThanOrEqual(8);
    expect(r!.quota.swim.min).toBeGreaterThanOrEqual(2);
    expect(r!.quota.strength.min).toBeGreaterThanOrEqual(1);
  });

  it("taper → longRideWeekly désactivé, swim ≥ 2 maintenu", () => {
    const r = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "taper");
    expect(r).not.toBeNull();
    expect(r!.floors.longRideWeekly).toBe(false);
    expect(r!.floors.longRunWeekly).toBe(false);
    expect(r!.floors.minSwimPerWeek).toBe(2);
  });

  it("TRI_SPRINT age_group → bike 2, run 2, swim 3", () => {
    const r = computeWeeklySessionQuota("TRIATHLON SPRINT", "age_group", 8, "load");
    expect(r).not.toBeNull();
    expect(r!.quota.bike.min).toBe(2);
    expect(r!.quota.run.min).toBe(2);
    expect(r!.quota.swim.min).toBe(3);
  });

  it("SEMI competitor → run 5, swim 0", () => {
    const r = computeWeeklySessionQuota("SEMI-MARATHON", "competitor", 6, "load");
    expect(r).not.toBeNull();
    expect(r!.quota.run.min).toBe(5);
    expect(r!.quota.run.max).toBe(5);
    expect(r!.quota.swim.max).toBe(0);
    expect(r!.downgraded).toBe(false); // CAP: pas de seuil horaire v1
  });

  it("est une fonction pure : mêmes entrées = mêmes sorties", () => {
    const a = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "load");
    const b = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "load");
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("normalizeSizingObjective — trail retourne null (hors scope 2A)", () => {
    expect(normalizeSizingObjective("UTMB")).toBeNull();
    expect(normalizeSizingObjective("Trail court")).toBeNull();
  });

  it("normalizeSizingAmbition — world_class mappe elite", () => {
    expect(normalizeSizingAmbition("world_class")).toBe("elite");
  });

  it("inferWeekType — dernière semaine = race, sinon 4e = recovery, sinon load", () => {
    expect(inferWeekType(32, 32)).toBe("race");   // pct=1 > 0.92 ET dernière
    expect(inferWeekType(31, 32)).toBe("taper");  // pct≈0.97 > 0.92
    expect(inferWeekType(4, 12)).toBe("recovery");
    expect(inferWeekType(5, 12)).toBe("load");
  });

  // ─── PHASE 2A.1 — Invariant de faisabilité sur TOUTES les cellules ─────────
  it("invariant faisabilité : totalSessions.max ≤ (7−minRest)×maxPerDay ET totalSessions.min ≥ Σ mins sport", () => {
    const objectives = ["IRONMAN 70.3", "IRONMAN", "TRIATHLON SPRINT", "TRIATHLON OLYMPIQUE",
                        "SEMI-MARATHON", "MARATHON", "10K", "5K"];
    const ambitions = ["finisher", "age_group", "competitor", "elite"];
    for (const obj of objectives) {
      for (const amb of ambitions) {
        const r = computeWeeklySessionQuota(obj, amb, 15, "load");
        if (!r) continue;
        const q = r.quota;
        const capacity = (7 - q.minFullRestDays) * q.maxSessionsPerDay;
        expect(q.totalSessions.max, `${obj}/${amb}: total.max=${q.totalSessions.max} > capacité=${capacity}`).toBeLessThanOrEqual(capacity);
        const sumMin = q.swim.min + q.bike.min + q.run.min + q.brick.min + q.strength.min;
        expect(q.totalSessions.min, `${obj}/${amb}: total.min=${q.totalSessions.min} < ΣminsSport=${sumMin}`).toBeGreaterThanOrEqual(sumMin);
      }
    }
  });

  it("finishers ont tous maxSessionsPerDay=2 (1 doublon nat+renfo autorisé)", () => {
    const objectives = ["IRONMAN 70.3", "IRONMAN", "TRIATHLON SPRINT", "TRIATHLON OLYMPIQUE",
                        "SEMI-MARATHON", "MARATHON", "10K", "5K"];
    for (const obj of objectives) {
      const r = computeWeeklySessionQuota(obj, "finisher", 6, "load");
      expect(r).not.toBeNull();
      expect(r!.quota.maxSessionsPerDay).toBe(2);
    }
  });

  it("floors 70.3 exposent slLongRideMin=120, slLongRunMin=90", () => {
    const r = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "load");
    expect(r!.floors.slLongRideMin).toBe(120);
    expect(r!.floors.slLongRunMin).toBe(90);
  });

  it("floors IM exposent slLongRideMin=150, slLongRunMin=100", () => {
    const r = computeWeeklySessionQuota("IRONMAN", "age_group", 10, "load");
    expect(r!.floors.slLongRideMin).toBe(150);
    expect(r!.floors.slLongRunMin).toBe(100);
  });

  it("recovery week — planchers SL réduits ×0.7 arrondis 5min", () => {
    const r = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "recovery");
    // 120*0.7=84 → arrondi 5 → 85 ; 90*0.7=63 → arrondi 5 → 65
    expect(r!.floors.slLongRideMin).toBe(85);
    expect(r!.floors.slLongRunMin).toBe(65);
  });

  it("taper — planchers SL désactivés (undefined)", () => {
    const r = computeWeeklySessionQuota("IRONMAN 70.3", "age_group", 10, "taper");
    expect(r!.floors.slLongRideMin).toBeUndefined();
    expect(r!.floors.slLongRunMin).toBeUndefined();
    expect(r!.floors.longRideWeekly).toBe(false);
  });
});
