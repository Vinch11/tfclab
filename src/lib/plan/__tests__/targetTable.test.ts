import { describe, it, expect } from "vitest";
import { buildTargetTable } from "@/lib/plan/targetTable";

describe("buildTargetTable", () => {
  it("B-70.3 profile (FTP=280) → SST 246-263W, bikeZonesW cohérents", () => {
    const t = buildTargetTable({
      ftp: 280, vma: 18.0, css: 90, fcMax: 188,
      objective: "IRONMAN 70.3", ambition: "age_group",
      weeklyHours: 10, trainingLevel: "trained",
    });
    expect(t.ftpW).toBe(280);
    expect(t.sstW).toEqual([Math.round(0.88 * 280), Math.round(0.94 * 280)]); // 246..263
    expect(t.sstW).toEqual([246, 263]);
    expect(t.racePowerW).toBe(Math.round(0.85 * 280)); // 238
    expect(t.racePowerRange).toEqual([233, 243]);
    // Z2 = 56-75% FTP = 157-210W
    expect(t.bikeZonesW.Z2).toEqual([Math.round(0.56 * 280), Math.round(0.75 * 280)]);
  });

  it("B-SEMI profile (VMA=18) → racePace fenêtre plausible pour semi", () => {
    const t = buildTargetTable({
      ftp: null, vma: 18.0, css: null, fcMax: 188,
      paceThresholdSecPerKm: 220,
      objective: "SEMI-MARATHON", ambition: "competitor",
      weeklyHours: 6, trainingLevel: "trained",
    });
    expect(t.vmaKmh).toBe(18.0);
    expect(t.racePaceSecPerKm).toBeGreaterThan(180);
    expect(t.racePaceSecPerKm).toBeLessThan(280);
    expect(t.racePaceRange![1] - t.racePaceRange![0]).toBe(10);
  });

  it("CSS ±3s/100m", () => {
    const t = buildTargetTable({
      ftp: 250, vma: 17, css: 95, fcMax: 190,
      objective: "IRONMAN 70.3", ambition: "age_group",
    });
    expect(t.cssSecPer100m).toBe(95);
    expect(t.cssRange).toEqual([92, 98]);
  });
});
