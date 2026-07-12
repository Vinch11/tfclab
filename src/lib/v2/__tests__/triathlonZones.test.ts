import { describe, it, expect } from "vitest";
import { deriveTriathlonZones, formatTriathlonZonesForPrompt } from "../triathlonZones";

describe("deriveTriathlonZones", () => {
  it("produit des zones bike cohérentes (Z2 unique 56-75% FTP)", () => {
    const r = deriveTriathlonZones({
      ftpW: 200, vmaKmh: 15, objective: "703", ambition: "age_group", tteMinBike: 45,
    });
    expect(r.bike).not.toBeNull();
    const z2 = r.bike!.zones.find((z) => z.name.startsWith("Z2"))!;
    expect(z2.lo).toBe(112); // 56% × 200
    expect(z2.hi).toBe(150); // 75% × 200
    expect(r.bike!.racePowerW).toBeGreaterThan(120);
    expect(r.bike!.racePowerW).toBeLessThan(180); // borné par TTE
  });

  it("Cath — TTE 35' → race power < 78% FTP", () => {
    const r = deriveTriathlonZones({
      ftpW: 200, vmaKmh: 14, objective: "70.3 / Half Ironman", ambition: "age_group", tteMinBike: 35,
    });
    expect(r.bike!.raceIF).toBeLessThan(0.78);
    expect(r.bike!.raceIfWasCapped).toBe(true);
  });

  it("formatte un bloc markdown injectable", () => {
    const r = deriveTriathlonZones({
      ftpW: 250, vmaKmh: 16, objective: "im", ambition: "elite", tteMinBike: 60,
    });
    const md = formatTriathlonZonesForPrompt(r);
    expect(md).toContain("ZONES CANONIQUES TRIATHLON");
    expect(md).toContain("VÉLO");
    expect(md).toContain("COURSE");
  });

  it("run zones — Z4 marathon/semi cohérente 78-88% VMA", () => {
    const r = deriveTriathlonZones({
      ftpW: 220, vmaKmh: 18, objective: "703", ambition: "competitor",
    });
    const z4 = r.run!.zones.find((z) => z.name.startsWith("Z4"))!;
    expect(z4.pctLo).toBe(78);
    expect(z4.pctHi).toBe(88);
  });
});
