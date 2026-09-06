import { describe, it, expect } from "vitest";
import { calculateGlycogenDepletion, calculateTTEMechanisms, type MaderProfile } from "../maderMetabolicModel";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 2) : ce
 * fichier comble un trou de couverture total sur calculateGlycogenDepletion
 * (aucun test n'existait — grep confirmé par l'audit) et verrouille les
 * corrections suivantes :
 *
 * 1. LIVER_GLUCOSE_RELEASE_MAX (0.5 g/min, Coyle 1986) est un débit MOYEN
 *    soutenu sur des heures, pas un plafond instantané. L'ancien code le
 *    traitait comme un plafond dur : dès que la demande sanguine dépassait
 *    0.5 g/min, le surplus non couvert faisait chuter la glycémie CE MÊME
 *    MINUTE, même si le foie avait encore ~100% de ses réserves — un
 *    cycliste bien fourni (60g/h) atteignait "hypoglycémie critique" en
 *    3 minutes. Le foie couvre désormais la demande tant qu'il a du
 *    glycogène (contrainte de réserve, pas de débit).
 * 2. calculateTTEMechanisms expose désormais intensityPct (déduit de
 *    power/VO2max réels) pour que les appelants ne hardcodent plus une
 *    intensité différente pour un calcul lié (ex: TTEGlycogenInsightsCard.tsx
 *    affichait tteGlycogen à l'intensité réelle ET une alerte fringale à
 *    75% fixe — deux nombres contradictoires sur la même carte).
 */

describe("calculateGlycogenDepletion — le débit hépatique moyen n'est plus un plafond instantané", () => {
  const wellFueledCyclist: MaderProfile = { vo2max: 65, vlamax: 0.6, weight: 80 };

  it("un cycliste bien fourni (60g/h) à 75% ne bonk plus en 3 minutes (bug réel corrigé)", () => {
    const result = calculateGlycogenDepletion(wellFueledCyclist, 75, 300, 60, 32);
    // Avant le fix : bonkRiskMin=3, limitingFactor="blood_glucose" (absurde).
    expect(result.bonkRiskMin).toBeGreaterThan(60);
    expect(result.limitingFactor).not.toBe("blood_glucose");
  });

  it("la glycémie ne chute plus tant que le foie a des réserves (contrainte de pool, pas de débit)", () => {
    const result = calculateGlycogenDepletion(wellFueledCyclist, 75, 10, 60, 32);
    // Sur seulement 10 minutes, le foie (100g) est loin d'être vide :
    // la glycémie doit rester proche de la baseline (5.0 mmol/L), pas
    // s'effondrer comme avant le fix.
    expect(result.bloodGlucoseMmol).toBeGreaterThan(4.5);
    expect(result.liverGlycogenG).toBeGreaterThan(90);
  });

  it("un athlète bien fourni à intensité modérée (60%, 60g/h) ne déclenche aucun risque sur 5h", () => {
    const result = calculateGlycogenDepletion({ vo2max: 55, vlamax: 0.35, weight: 70 }, 60, 300, 60, 30);
    expect(result.bonkRiskMin).toBe(Infinity);
    expect(result.hypoglycemiaRisk).toBe("none");
  });

  it("un athlète sous-fourni (20g/h) à intensité plus élevée (75%) déclenche un vrai risque, mais après un délai physiologiquement plausible (pas en quelques minutes)", () => {
    const result = calculateGlycogenDepletion({ vo2max: 55, vlamax: 0.35, weight: 70 }, 75, 300, 20, 30);
    expect(result.bonkRiskMin).toBeGreaterThan(60);
    expect(result.bonkRiskMin).toBeLessThan(300);
  });
});

describe("calculateTTEMechanisms — expose intensityPct pour éviter une intensité divergente en aval", () => {
  it("intensityPct reflète l'intensité réelle déduite de power/VO2max, pas une constante fixe", () => {
    const profile: MaderProfile = { vo2max: 55, vlamax: 0.35, weight: 70 };
    const lowPower = calculateTTEMechanisms(profile, 150, {});
    const highPower = calculateTTEMechanisms(profile, 280, {});
    expect(lowPower.intensityPct).toBeLessThan(highPower.intensityPct);
    // Aucune des deux ne doit coïncider par hasard avec l'ancienne constante hardcodée (75)
    // sauf si c'est authentiquement l'intensité réelle calculée.
    expect(highPower.intensityPct).not.toBe(75);
  });
});
