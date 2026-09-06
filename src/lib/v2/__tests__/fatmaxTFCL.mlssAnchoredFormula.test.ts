import { describe, it, expect } from "vitest";
import { computeFatMaxAnchorPctFTP, computeFatMaxTFCL, generateEnergyProfileData, type FatMaxTFCLInput } from "../fatmaxTFCL";
import { computeMLSS } from "../maderMetabolicModel";

/**
 * Bug réel corrigé (audit "estimations physiologiques", suite de l'audit
 * "dashboard/plan/export"). La formule FatMax canonique était une régression
 * linéaire isolée (78 − 52·(VLa−0.25) + 0.15·(VO2−50)) sans source citée pour
 * ses coefficients, et divergeait fortement (jusqu'à ~50 points de %FTP-
 * équivalent) du modèle de lactate Mader déjà calibré sur 44 profils de labo
 * (computeMLSS, α=1.98) utilisé en parallèle dans le même rapport PDF exporté
 * (3 sections "INSCYD-STYLE" + la section "FatMax TFCL" dédiée).
 *
 * Nouvelle formule : MLSS calibré → LT1 (×0.85, même ancre que le reste du
 * module) → FatMax (LT1 − (8+15×VLamax), écart situé dans la fourchette
 * rapportée par la littérature pour la position de FatMax sous LT1).
 */

describe("computeFatMaxAnchorPctFTP — ancrée sur le MLSS calibré (α=1.98), pas une régression isolée", () => {
  it("VLa=0.25, VO2=50 (poids défaut 70kg) → 81% FTP", () => {
    expect(computeFatMaxAnchorPctFTP(0.25, 50)).toBe(81);
  });

  it("VLamax null → null (pas de valeur fantôme)", () => {
    expect(computeFatMaxAnchorPctFTP(null, 50)).toBeNull();
  });

  it("VLamax <= 0 → null", () => {
    expect(computeFatMaxAnchorPctFTP(0, 50)).toBeNull();
    expect(computeFatMaxAnchorPctFTP(-0.1, 50)).toBeNull();
  });

  it("VO2max absent → retombe sur la valeur neutre par défaut (50 ml/kg/min), toujours calculable", () => {
    const withoutVo2 = computeFatMaxAnchorPctFTP(0.30, null);
    const withDefaultVo2 = computeFatMaxAnchorPctFTP(0.30, 50);
    expect(withoutVo2).not.toBeNull();
    expect(withoutVo2).toBe(withDefaultVo2);
  });

  it("VLamax croissante → FatMax décroissante (monotonie physiologique conservée)", () => {
    const values = [0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90].map(
      (vla) => computeFatMaxAnchorPctFTP(vla, 55)!
    );
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
    }
  });

  it("reste dans les bornes de sécurité [40, 90] même aux extrêmes de VLamax", () => {
    expect(computeFatMaxAnchorPctFTP(0.05, 50)).toBeLessThanOrEqual(90);
    expect(computeFatMaxAnchorPctFTP(1.5, 50)).toBeGreaterThanOrEqual(40);
  });

  it("cohérence interne : la FatMax dérivée reste toujours sous le MLSS du même profil (ordre physiologique FatMax < LT1 < MLSS)", () => {
    const profiles = [
      { vlamax: 0.25, vo2max: 50, weight: 70 },
      { vlamax: 0.45, vo2max: 58, weight: 74 },
      { vlamax: 0.70, vo2max: 62, weight: 80 },
    ];
    for (const p of profiles) {
      const mlss = computeMLSS({ vo2max: p.vo2max, vlamax: p.vlamax, weight: p.weight });
      expect(mlss).not.toBeNull();
      // Le MLSS est ici exprimé en %VO2max ; on le convertit en %FTP en
      // adoptant la même convention de repli (FTP ≈ 76% de la puissance à
      // VO2max) que celle utilisée par la formule quand la FTP réelle est
      // absente — juste pour comparer les deux valeurs sur une base commune.
      const mlssPctFtpEquivalent = mlss!.intensityPct / 0.76;
      const fatMaxPctFtp = computeFatMaxAnchorPctFTP(p.vlamax, p.vo2max, p.weight)!;
      expect(fatMaxPctFtp).toBeLessThan(mlssPctFtpEquivalent);
    }
  });

  it("avec la FTP réelle de l'athlète fournie, la conversion utilise la puissance réelle plutôt que le ratio moyen de repli", () => {
    const vlamax = 0.35;
    const vo2max = 55;
    const weightKg = 72;
    const withoutFtp = computeFatMaxAnchorPctFTP(vlamax, vo2max, weightKg)!;
    // FTP délibérément choisie très différente du ratio moyen (0.76×VO2maxPower)
    // pour vérifier qu'elle change bien le résultat.
    const withLowFtp = computeFatMaxAnchorPctFTP(vlamax, vo2max, weightKg, 150)!;
    const withHighFtp = computeFatMaxAnchorPctFTP(vlamax, vo2max, weightKg, 400)!;
    expect(withLowFtp).not.toBe(withoutFtp);
    expect(withHighFtp).not.toBe(withoutFtp);
    // FTP plus basse → même puissance FatMax représente une plus grande part de FTP
    expect(withLowFtp).toBeGreaterThan(withHighFtp);
  });
});

describe("computeFatMaxTFCL — bornes physio/travail réharmonisées avec la formule de base", () => {
  function baseInput(overrides: Partial<FatMaxTFCLInput> = {}): FatMaxTFCLInput {
    return {
      vlamaxEffectif: 0.25,
      vlamaxConfidence: 0.9,
      vo2maxEffectif: 50,
      tteEffectif: 50,
      tteConfidence: 0.9,
      fatigueIndex: 20,
      objectif: "IM",
      ...overrides,
    };
  }

  it("un profil VLamax très basse + TTE élevé (>65) ne dépasse plus le plafond physio malgré les offsets cumulés", () => {
    const result = computeFatMaxTFCL(
      baseInput({ vlamaxEffectif: 0.05, vo2maxEffectif: 70, tteEffectif: 70, fatigueIndex: 0 })
    );
    expect(result).not.toBeNull();
    // Bug réel corrigé : l'ancien clamp final (85) dépassait le plafond que
    // la formule de base annonçait (82) — les bornes sont maintenant cohérentes
    // de bout en bout (STEP 1 et STEP 5 utilisent la même plage effective).
    expect(result!.physioCenterPctFTP).toBeLessThanOrEqual(92);
  });

  it("poids réel transmis via weightKg change le résultat par rapport au poids par défaut", () => {
    const light = computeFatMaxTFCL(baseInput({ weightKg: 55 }));
    const heavy = computeFatMaxTFCL(baseInput({ weightKg: 95 }));
    expect(light).not.toBeNull();
    expect(heavy).not.toBeNull();
    expect(light!.physioCenterPctFTP).not.toBe(heavy!.physioCenterPctFTP);
  });
});

describe("generateEnergyProfileData — le point 50/50 est au crossover, pas à la FatMax (bug réel corrigé)", () => {
  it("au centre de la FatMax, les lipides dominent strictement (> 50%), pas un mélange 50/50", () => {
    const fatmax = computeFatMaxTFCL({
      vlamaxEffectif: 0.35,
      vlamaxConfidence: 0.9,
      vo2maxEffectif: 55,
      tteEffectif: 50,
      tteConfidence: 0.9,
      fatigueIndex: 20,
      objectif: "IM",
    })!;
    const data = generateEnergyProfileData(fatmax);
    const atCenter = data.reduce((closest, p) =>
      Math.abs(p.intensityPctFTP - fatmax.centerPctFTP) < Math.abs(closest.intensityPctFTP - fatmax.centerPctFTP) ? p : closest
    );
    expect(atCenter.lipidPct).toBeGreaterThan(50);
  });

  it("le point où lipides = glucides (~50/50) se situe dans la crossoverZone, pas à centerPctFTP", () => {
    const fatmax = computeFatMaxTFCL({
      vlamaxEffectif: 0.35,
      vlamaxConfidence: 0.9,
      vo2maxEffectif: 55,
      tteEffectif: 50,
      tteConfidence: 0.9,
      fatigueIndex: 20,
      objectif: "IM",
    })!;
    const data = generateEnergyProfileData(fatmax);
    const near5050 = data.reduce((closest, p) =>
      Math.abs(p.lipidPct - 50) < Math.abs(closest.lipidPct - 50) ? p : closest
    );
    // Le point ~50/50 doit être notablement plus proche de la crossoverZone
    // que de centerPctFTP (l'ancien bug plaçait le 50/50 exactement à centerPctFTP).
    const crossoverCenter = (fatmax.crossoverZone[0] + fatmax.crossoverZone[1]) / 2;
    expect(Math.abs(near5050.intensityPctFTP - crossoverCenter)).toBeLessThan(
      Math.abs(near5050.intensityPctFTP - fatmax.centerPctFTP)
    );
  });
});
