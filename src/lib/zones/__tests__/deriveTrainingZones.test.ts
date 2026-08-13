import { describe, it, expect } from "vitest";
import { deriveTrainingZones } from "@/lib/zones/deriveTrainingZones";
import {
  canonicalizeToZone6,
  legacyToZone6,
  zone6ToLegacy,
  ZONE6_IDS,
  type ZoneId6,
} from "@/lib/zones/zoneMapping";

function assertMonotonic(zones: { pctRef: { min: number; max: number } }[]) {
  for (let i = 0; i < zones.length; i++) {
    expect(zones[i].pctRef.max).toBeGreaterThan(zones[i].pctRef.min);
    if (i > 0) expect(zones[i].pctRef.min).toBeGreaterThanOrEqual(zones[i - 1].pctRef.max);
  }
}

describe("deriveTrainingZones — course", () => {
  it("profil débutant (ratio seuil/VMA 0.78) → zones dérivées monotones", () => {
    const set = deriveTrainingZones({
      sport: "run",
      vma: 14,
      paceThresholdSecPerKm: Math.round(3600 / (14 * 0.78)),
      vlamax: 0.55,
      vo2max: 48,
      fcMax: 190,
    });
    expect(set.source).toBe("derived");
    assertMonotonic(set.zones);
    // vVO2max très au-dessus du seuil pour un ratio bas
    expect(set.zones.find((z) => z.id === "Z5")!.pctRef.max).toBeGreaterThan(120);
  });

  it("profil élite (ratio 0.92) → Z5 plus resserrée que le débutant", () => {
    const elite = deriveTrainingZones({
      sport: "run",
      vma: 21,
      paceThresholdSecPerKm: Math.round(3600 / (21 * 0.92)),
      vlamax: 0.32,
      vo2max: 72,
    });
    const debutant = deriveTrainingZones({
      sport: "run",
      vma: 14,
      paceThresholdSecPerKm: Math.round(3600 / (14 * 0.78)),
      vlamax: 0.55,
    });
    expect(elite.source).toBe("derived");
    const wElite = elite.zones.find((z) => z.id === "Z5")!;
    const wDeb = debutant.zones.find((z) => z.id === "Z5")!;
    expect(wElite.pctRef.max - wElite.pctRef.min).toBeLessThan(wDeb.pctRef.max - wDeb.pctRef.min);
  });

  it("VLamax haute abaisse la fenêtre FatMax (Z2)", () => {
    const base = { sport: "run" as const, vma: 17, paceThresholdSecPerKm: 240 };
    const high = deriveTrainingZones({ ...base, vlamax: 0.7 });
    const low = deriveTrainingZones({ ...base, vlamax: 0.3 });
    const z2h = high.zones.find((z) => z.id === "Z2")!.pctRef.max;
    const z2l = low.zones.find((z) => z.id === "Z2")!.pctRef.max;
    expect(z2h).toBeLessThan(z2l);
  });

  it("allure seuil manquante → repli grille standard", () => {
    const set = deriveTrainingZones({ sport: "run", vma: 17, vlamax: 0.45 });
    expect(set.source).toBe("standard");
    expect(set.fallbackReason).toBe("Allure seuil manquante");
    assertMonotonic(set.zones);
  });

  it("affiche des allures absolues", () => {
    const set = deriveTrainingZones({ sport: "run", vma: 17, paceThresholdSecPerKm: 240, vlamax: 0.4 });
    expect(set.zones.find((z) => z.id === "Z4")!.absolute).toMatch(/\/km$/);
  });
});

describe("deriveTrainingZones — vélo", () => {
  it("profil complet → zones dérivées et MLSS tracé", () => {
    const set = deriveTrainingZones({
      sport: "bike",
      ftp: 280,
      vlamax: 0.45,
      vo2max: 62,
      weightKg: 72,
      fcMax: 188,
    });
    expect(set.source).toBe("derived");
    assertMonotonic(set.zones);
    expect(set.anchors.some((a) => a.includes("MLSS"))).toBe(true);
    expect(set.zones.find((z) => z.id === "Z4")!.absolute).toMatch(/W$/);
  });

  it("VLamax manquante → repli standard", () => {
    const set = deriveTrainingZones({ sport: "bike", ftp: 280, vo2max: 62, weightKg: 72 });
    expect(set.source).toBe("standard");
    expect(set.fallbackReason).toBe("VLamax manquante");
  });

  it("confiance DRE basse → repli standard même avec données complètes", () => {
    const set = deriveTrainingZones({
      sport: "bike",
      ftp: 280,
      vlamax: 0.45,
      vo2max: 62,
      weightKg: 72,
      dreConfidence: 0.3,
    });
    expect(set.source).toBe("standard");
    expect(set.fallbackReason).toBe("Confiance des données insuffisante");
  });
});

describe("mapping Z1..Z7 ↔ Z1..Z6", () => {
  it("fusionne Z4a/Z4b/Z5 dans Z4", () => {
    expect(legacyToZone6("Z4a")).toBe("Z4");
    expect(legacyToZone6("Z4b")).toBe("Z4");
    expect(legacyToZone6("Z5")).toBe("Z4");
    expect(legacyToZone6("Z6")).toBe("Z5");
    expect(legacyToZone6("Z7")).toBe("Z6");
  });

  it("aller-retour 6 → héritage → 6 est stable", () => {
    ZONE6_IDS.forEach((id: ZoneId6) => {
      expect(legacyToZone6(zone6ToLegacy(id))).toBe(id);
    });
  });

  it("canonicalise les libellés texte", () => {
    expect(canonicalizeToZone6("z4a")).toBe("Z4");
    expect(canonicalizeToZone6("Zone 6")).toBe("Z5");
    expect(canonicalizeToZone6("Z9")).toBeNull();
  });
});
