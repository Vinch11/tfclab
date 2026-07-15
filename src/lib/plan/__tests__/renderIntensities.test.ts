// @ts-nocheck
import { describe, it, expect } from "vitest";
import { enrichWithAbsoluteValues } from "@/lib/plan/renderIntensities";
import type { TargetTable } from "@/lib/plan/targetTable";

const T: TargetTable = {
  ftpW: 280,
  bikeZonesW: {},
  sstW: null,
  racePowerW: null,
  racePowerRange: null,
  vmaKmh: 18,
  runPacesSecPerKm: {},
  racePaceSecPerKm: null,
  racePaceRange: null,
  cssSecPer100m: 90,
  cssRange: null,
  swimZonesSecPer100m: {},
  fcMax: null,
  fcZonesBpm: {},
  meta: { objective: "70.3", ambition: "age_group", sport: "tri_70_3", generatedAt: 0 },
};

describe("enrichWithAbsoluteValues", () => {
  it("bike: Z4a → watts (88-93% FTP=280 → 246-260W)", () => {
    const out = enrichWithAbsoluteValues("3x12' Z4a récup 5'", T, "bike");
    expect(out).toContain("Z4a (246-260W)");
  });

  it("bike: Z4 nu = union Z4a+Z4b", () => {
    const out = enrichWithAbsoluteValues("Bloc Z4", T, "bike");
    // union 88-98% × 280 = 246-274W
    expect(out).toContain("Z4 (246-274W)");
  });

  it("run: Z2 → pace (60-70% VMA)", () => {
    const out = enrichWithAbsoluteValues("Endurance Z2 60'", T, "run");
    // 70%×18=12.6km/h → 4:46/km ; 60%×18=10.8 → 5:33/km
    expect(out).toMatch(/Z2 \(\d:\d{2}-\d:\d{2}\/km\)/);
  });

  it("annote %FTP", () => {
    const out = enrichWithAbsoluteValues("3x10' @90% FTP", T, "bike");
    expect(out).toContain("90% FTP (252W)");
  });

  it("annote %VMA", () => {
    const out = enrichWithAbsoluteValues("6x400m @95% VMA", T, "run");
    // 95%×18=17.1 → 3:31/km
    expect(out).toMatch(/95% VMA \(\d:\d{2}\/km\)/);
  });

  it("CSS+5s (nat) → pace", () => {
    const out = enrichWithAbsoluteValues("10x100m CSS+5s r=20\"", T, "swim");
    expect(out).toContain("CSS+5s (1:35/100m)");
  });

  it("idempotent : ne double pas l'annotation", () => {
    const once = enrichWithAbsoluteValues("Z4a", T, "bike");
    const twice = enrichWithAbsoluteValues(once, T, "bike");
    expect(twice).toBe(once);
  });

  it("texte sans intensité inchangé", () => {
    const out = enrichWithAbsoluteValues("Récupération complète.", T, "recovery");
    expect(out).toBe("Récupération complète.");
  });
});
