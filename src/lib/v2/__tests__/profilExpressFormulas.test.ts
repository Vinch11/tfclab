import { describe, it, expect } from "vitest";
import {
  vo2maxFromCooper12min,
  vlamaxRunFromSprintRatio,
  vmaFromTrack1500m,
  vlamaxRunFromSprint15Distance,
} from "../profilExpressFormulas";

describe("vo2maxFromCooper12min", () => {
  it("reproduit la formule de Cooper (1968)", () => {
    // 2400m en 12min — exemple classique manuel
    expect(vo2maxFromCooper12min(2400)).toBeCloseTo((2400 - 504.9) / 44.73, 5);
  });

  it("est croissante avec la distance parcourue", () => {
    expect(vo2maxFromCooper12min(3000)).toBeGreaterThan(vo2maxFromCooper12min(2000));
  });
});

describe("vlamaxRunFromSprintRatio", () => {
  it("retombe sur le plancher 0.25 pour un sprint ratio bas (profil très endurant)", () => {
    // v15 à peine plus rapide que v12 → sprint ratio proche de 1
    expect(vlamaxRunFromSprintRatio(4.0, 3.9)).toBeCloseTo(0.25, 3);
  });

  it("retombe sur le plafond 0.80 pour un sprint ratio élevé (profil très glycolytique)", () => {
    // normalized est lui-même clampé à [0,1], donc le plafond réel de la
    // formule est 0.25 + 0.55×1 = 0.80 (le Math.min(0.95, …) de sécurité
    // n'est jamais atteint pour une entrée positive).
    expect(vlamaxRunFromSprintRatio(8.0, 3.0)).toBeCloseTo(0.80, 3);
  });

  it("est strictement croissante avec le sprint ratio dans la plage normalisée", () => {
    const low = vlamaxRunFromSprintRatio(5.0, 3.5); // sr ≈ 1.43 (sous le plancher 1.55)
    const mid = vlamaxRunFromSprintRatio(5.5, 3.5); // sr = 1.57
    const high = vlamaxRunFromSprintRatio(6.3, 3.5); // sr = 1.80
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(mid);
  });

  it("reste dans les bornes physiologiques [0.25, 0.95] pour toute entrée positive", () => {
    for (const v15 of [2, 4, 6, 8, 10]) {
      for (const v12 of [2, 3, 4, 5]) {
        if (v15 <= 0 || v12 <= 0) continue;
        const vlamax = vlamaxRunFromSprintRatio(v15, v12);
        expect(vlamax).toBeGreaterThanOrEqual(0.25);
        expect(vlamax).toBeLessThanOrEqual(0.95);
      }
    }
  });
});

describe("vmaFromTrack1500m", () => {
  it("reproduit la formule Track Day™ (distance/temps × 3.6 × correction +2% piste)", () => {
    // 1500m en 5min30 (330s)
    const vMs = 1500 / 330;
    expect(vmaFromTrack1500m(330)).toBeCloseTo(vMs * 3.6 * 1.02, 5);
  });

  it("est décroissante avec le temps (plus lent = VMA plus basse)", () => {
    expect(vmaFromTrack1500m(300)).toBeGreaterThan(vmaFromTrack1500m(360));
  });

  it("donne une VMA physiologiquement plausible pour un coureur entraîné (5min30 au 1500m)", () => {
    const vma = vmaFromTrack1500m(330);
    expect(vma).toBeGreaterThan(14);
    expect(vma).toBeLessThan(20);
  });
});

describe("vlamaxRunFromSprint15Distance", () => {
  it("reproduit la régression Track Day™ (−0.5066 + 0.0142 × distance)", () => {
    expect(vlamaxRunFromSprint15Distance(90)).toBeCloseTo(-0.5066 + 0.0142 * 90, 5);
  });

  it("est strictement croissante avec la distance sprint", () => {
    expect(vlamaxRunFromSprint15Distance(100)).toBeGreaterThan(vlamaxRunFromSprint15Distance(80));
  });

  it("reste dans les bornes physiologiques [0.15, 1.10] même pour des distances extrêmes", () => {
    expect(vlamaxRunFromSprint15Distance(10)).toBeGreaterThanOrEqual(0.15);
    expect(vlamaxRunFromSprint15Distance(200)).toBeLessThanOrEqual(1.10);
  });
});
