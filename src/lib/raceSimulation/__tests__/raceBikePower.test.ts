import { describe, expect, it } from "vitest";
import { raceBikePower, raceBikeCap } from "@/lib/raceSimulation/raceBikePower";
import { estimateBikeSplit } from "@/lib/v2/bikeSplitEstimator";
import { buildTargetTable } from "@/lib/plan/targetTable";
import { deriveTriathlonZones } from "@/lib/v2/triathlonZones";

const emanuela = { objective: "IM", ambition: "competitor", ftpW: 188, weightKg: 52 };

describe("puissance vélo de course — source unique", () => {
  it("Ironman : la part de FTP dépend de la durée vélo estimée (≈ 5 h 50 → ≈ 70 % FTP, plus 76 %)", () => {
    const r = raceBikePower(emanuela)!;
    expect(r.durationMethod).toBe("model");
    expect(r.bikeHours).toBeGreaterThan(5.5);
    expect(r.bikeHours).toBeLessThan(6.2);
    expect(r.rangeW[1]).toBeLessThan(Math.round(0.76 * 188));
    expect(r.ifRange[0]).toBeGreaterThan(0.66);
    expect(r.tssRange).toEqual([280, 300]);
  });
  it("une TTE courte plafonne la puissance, et l'explication le dit", () => {
    const r = raceBikePower({ ...emanuela, tteMin: 19 })!;
    expect(r.limitedBy).toBe("tte");
    expect(r.rangeW[1]).toBeLessThan(raceBikePower(emanuela)!.rangeW[1]);
    expect(r.explanation).toMatch(/TTE 19 min/);
  });
  it("plus la durée est longue, plus la part de FTP baisse", () => {
    const fast = raceBikePower({ objective: "IM", ambition: "competitor", ftpW: 188, observedBikeHours: 5 })!;
    const slow = raceBikePower({ objective: "IM", ambition: "competitor", ftpW: 188, observedBikeHours: 6.5 })!;
    expect(slow.centerIF).toBeLessThan(fast.centerIF);
  });
  it("même physique que l'estimateur de split : la durée de la simulation colle à celle du calcul", () => {
    const r = raceBikePower(emanuela)!;
    const split = estimateBikeSplit({ distanceKm: 180, ftp: 188, weightKg: 52, ambition: "competitor", position: "tri", npW: r.centerW })!;
    expect(Math.abs(split.durationMin - r.bikeHours * 60)).toBeLessThan(6);
  });
  it("table des zones, zones triathlon (prompts) et simulation lisent la même cible", () => {
    const r = raceBikePower(emanuela)!;
    const table = buildTargetTable({ ftp: 188, objective: "IM", ambition: "competitor", weightKg: 52 });
    expect(table.racePowerRange).toEqual(r.rangeW);
    expect(table.racePowerW).toBe(r.centerW);
    const tri = deriveTriathlonZones({ ftpW: 188, vmaKmh: 13, objective: "IM", ambition: "competitor", weightKg: 52 });
    expect(Math.abs(tri.bike!.racePowerW! - r.centerW)).toBeLessThanOrEqual(2);
    expect(raceBikeCap(emanuela)!.cappedPctFTP).toBe(Math.round(r.centerIF * 100));
  });
  it("hors triathlon : rien (la table garde son repère historique)", () => {
    expect(raceBikePower({ objective: "Marathon", ambition: "competitor", ftpW: 188 })).toBeNull();
    expect(buildTargetTable({ ftp: 200, objective: "Marathon" }).racePowerW).toBe(180);
  });
});
