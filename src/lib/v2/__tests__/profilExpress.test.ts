import { describe, it, expect } from "vitest";
import {
  computeProfilExpressRun,
  computeProfilExpressBike,
  type ProfilExpressRunInput,
  type ProfilExpressBikeInput,
} from "../profilExpress";
import { vo2maxFromCooper12min, vlamaxRunFromSprintRatio } from "../profilExpressFormulas";

describe("computeProfilExpressRun", () => {
  const validInput: ProfilExpressRunInput = {
    distSprint1M: 90,
    distSprint2M: 92,
    dist12MinM: 2800,
    weightKg: 70,
  };

  it("retourne null si une entrée est manquante, nulle ou négative", () => {
    expect(computeProfilExpressRun({ ...validInput, distSprint1M: 0 })).toBeNull();
    expect(computeProfilExpressRun({ ...validInput, dist12MinM: -100 })).toBeNull();
    expect(computeProfilExpressRun({ ...validInput, weightKg: NaN })).toBeNull();
  });

  it("calcule VO2max via la formule de Cooper (source unique profilExpressFormulas)", () => {
    const result = computeProfilExpressRun(validInput);
    expect(result).not.toBeNull();
    const expectedVo2max = Math.round(vo2maxFromCooper12min(validInput.dist12MinM) * 10) / 10;
    expect(result!.vo2max).toBeCloseTo(expectedVo2max, 5);
  });

  it("calcule VLamax via le sprint ratio (meilleure distance des 2 sprints)", () => {
    const result = computeProfilExpressRun(validInput);
    const v15 = Math.max(validInput.distSprint1M, validInput.distSprint2M) / 15;
    const v12 = validInput.dist12MinM / 720;
    expect(result!.vlamax).toBeCloseTo(vlamaxRunFromSprintRatio(v15, v12), 5);
  });

  it("dérive la VMA depuis VO2max (Léger-Mercier, VO2max ≈ 3.5 × VMA)", () => {
    const result = computeProfilExpressRun(validInput);
    expect(result!.vma).toBeCloseTo(result!.vo2max / 3.5, 1);
  });

  it("le seuil dérivé est toujours plus lent (allure en sec/km plus grande) que l'allure VMA", () => {
    const result = computeProfilExpressRun(validInput);
    expect(result!.thresholdPaceSecPerKm).not.toBeNull();
    const vmaPaceSecPerKm = 3600 / result!.vma;
    expect(result!.thresholdPaceSecPerKm!).toBeGreaterThan(vmaPaceSecPerKm);
  });

  it("l'intensité de seuil reste dans les bornes physiologiques de computeMLSS (45-95% VO2max)", () => {
    const result = computeProfilExpressRun(validInput);
    expect(result!.thresholdIntensityPctVo2max).not.toBeNull();
    expect(result!.thresholdIntensityPctVo2max!).toBeGreaterThanOrEqual(45);
    expect(result!.thresholdIntensityPctVo2max!).toBeLessThanOrEqual(95);
  });

  it("réduit la confiance quand les 2 sprints divergent fortement (protocole mal exécuté)", () => {
    const clean = computeProfilExpressRun(validInput);
    const messy = computeProfilExpressRun({ ...validInput, distSprint1M: 70, distSprint2M: 92 });
    expect(messy!.confidence).toBeLessThan(clean!.confidence);
  });

  it("liste les sources utilisées", () => {
    const result = computeProfilExpressRun(validInput);
    expect(result!.sources).toContain("Cooper 12min (VO2max)");
    expect(result!.sources).toContain("Sprint 15s×2 (VLamax)");
    expect(result!.sources).toContain("Mader MLSS (seuil dérivé)");
  });
});

describe("computeProfilExpressBike", () => {
  const validInput: ProfilExpressBikeInput = {
    map5MinW: 280,
    p30sW: 450,
    weightKg: 70,
  };

  it("retourne null si map5MinW ou weightKg est manquant/invalide", () => {
    expect(computeProfilExpressBike({ ...validInput, map5MinW: 0 })).toBeNull();
    expect(computeProfilExpressBike({ ...validInput, weightKg: -70 })).toBeNull();
  });

  it("calcule VO2max via Jeukendrup 1997 depuis MAP5min (pas depuis FTP)", () => {
    const result = computeProfilExpressBike(validInput);
    expect(result).not.toBeNull();
    const expected = (validInput.map5MinW / validInput.weightKg) * 10.8 + 7;
    expect(result!.vo2max).toBeCloseTo(Math.round(expected * 10) / 10, 5);
  });

  it("calcule CP/W' et en déduit un seuil estimé quand 2 points de puissance distincts sont fournis", () => {
    const result = computeProfilExpressBike(validInput);
    expect(result!.cp).not.toBeNull();
    expect(result!.wprimeKJ).not.toBeNull();
    expect(result!.vlamax).not.toBeNull();
    expect(result!.vlamax!).toBeGreaterThanOrEqual(0.15);
    expect(result!.vlamax!).toBeLessThanOrEqual(1.10);
    expect(result!.ftpEstimatedW).not.toBeNull();
    expect(result!.sources).toContain("Critical Power / W'");
    expect(result!.sources).toContain("Mader MLSS (seuil dérivé)");
  });

  it("ne calcule pas CP/W' avec un seul point de puissance (MAP5min seul)", () => {
    const result = computeProfilExpressBike({ map5MinW: 280, weightKg: 70 });
    expect(result).not.toBeNull();
    expect(result!.cp).toBeNull();
    expect(result!.vlamax).toBeNull();
    expect(result!.ftpEstimatedW).toBeNull();
    expect(result!.warnings.some(w => w.includes("au moins 2 points"))).toBe(true);
  });

  it("le seuil estimé en watts reste physiologiquement sous MAP5min", () => {
    const result = computeProfilExpressBike(validInput);
    if (result!.ftpEstimatedW != null) {
      expect(result!.ftpEstimatedW).toBeLessThan(validInput.map5MinW);
    }
  });

  it("confiance réduite (≤0.3) quand le seuil n'est pas calculable", () => {
    const result = computeProfilExpressBike({ map5MinW: 280, weightKg: 70 });
    expect(result!.confidence).toBeLessThanOrEqual(0.3);
  });
});
