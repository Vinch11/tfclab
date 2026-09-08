import { describe, it, expect } from "vitest";
import { computeCAPInjuryRiskIndex } from "@/lib/capInjuryRisk";
import { computeRunInjuryRiskFromValues, computeRunInjuryRisk, RUN_INJURY_RISK_SCALE } from "@/lib/runInjuryRisk";
import { computeCAPInjuryRisk, adaptRunInjuryRiskToEnvelope } from "@/lib/v2/injuryRiskUnified";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 3) : 3
 * moteurs de risque blessure CAP indépendants coexistaient —
 * capInjuryRisk.ts (Dashboard/PDF/Templates/Wahoo, VLamax+TTE seuls, charge
 * ignorée), injuryRiskUnified.ts (RunningProfilePage, tss7d/runLoad7d
 * déclarés en entrée mais jamais utilisés dans le score), et runInjuryRisk.ts
 * (pipeline Plan IA, seul à inclure fatigue+charge+âge). Pour un athlète
 * Semi-marathon en surcharge (TSS 7j = 580, fatigue 20%, VLamax=0.45,
 * TTE=42min, 35 ans) : Dashboard/PDF disaient "Très faible" pendant que le
 * Plan IA disait "Modéré" (score canonique 32) pour le même athlète.
 *
 * capInjuryRisk.ts délègue désormais au moteur canonique
 * (computeRunInjuryRiskFromValues) dès que fatiguePct est fourni, et
 * RunningProfilePage utilise directement computeRunInjuryRisk (adapté vers
 * InjuryRiskEnvelope) au lieu du calcul indépendant d'injuryRiskUnified.ts.
 */

describe("computeCAPInjuryRiskIndex — délégation au moteur canonique", () => {
  it("sans fatiguePct : comportement historique préservé (VLamax+TTE seuls)", () => {
    const result = computeCAPInjuryRiskIndex({ vlamaxValue: 0.45, tteValue: 42, objectif: "Semi" });
    expect(result.level).toBe(0);
    expect(result.label).toBe("Très faible");
  });

  it("avec fatiguePct+tss7d : reproduit exactement le cas mesuré par l'audit (Semi, TSS 580, fatigue 20%) — le niveau change désormais", () => {
    const withoutLoad = computeCAPInjuryRiskIndex({ vlamaxValue: 0.45, tteValue: 42, objectif: "Semi" });
    const withLoad = computeCAPInjuryRiskIndex({
      vlamaxValue: 0.45, tteValue: 42, objectif: "Semi",
      fatiguePct: 20, tss7d: 580, age: 35,
    });
    // Avant le fix, ces deux appels étaient IDENTIQUES (charge ignorée).
    expect(withLoad.level).toBeGreaterThan(withoutLoad.level);
  });

  it("le niveau canonique correspond au score continu du moteur riche (même seuils que RUN_INJURY_RISK_SCALE)", () => {
    const canonical = computeRunInjuryRiskFromValues({
      fatiguePct: 20, vlamaxValue: 0.45, tteValue: 42, tss7d: 580, age: 35, objectif: "Semi",
    });
    expect(canonical.score).toBeGreaterThan(RUN_INJURY_RISK_SCALE.FAIBLE.max);
    expect(canonical.score).toBeLessThanOrEqual(RUN_INJURY_RISK_SCALE.MODERE.max);

    const capResult = computeCAPInjuryRiskIndex({
      vlamaxValue: 0.45, tteValue: 42, objectif: "Semi",
      fatiguePct: 20, tss7d: 580, age: 35,
    });
    // canonical.score dans la bande MODERE (26-50) → capInjuryRisk.ts niveau 1
    expect(capResult.level).toBe(1);
  });

  it("une charge très élevée peut faire monter le niveau au-delà de ce que VLamax+TTE seuls indiqueraient, même avec un profil par ailleurs excellent", () => {
    const excellentProfileHeavyLoad = computeCAPInjuryRiskIndex({
      vlamaxValue: 0.30, tteValue: 60, objectif: "Semi", // VLamax/TTE excellents
      fatiguePct: 85, tss7d: 700, age: 50, // mais fatigue/charge/âge très défavorables
    });
    const excellentProfileNoLoadData = computeCAPInjuryRiskIndex({
      vlamaxValue: 0.30, tteValue: 60, objectif: "Semi",
    });
    expect(excellentProfileHeavyLoad.level).toBeGreaterThan(excellentProfileNoLoadData.level);
  });
});

describe("computeRunInjuryRiskFromValues — équivalence avec computeRunInjuryRisk (objets effectifs)", () => {
  it("produit le même score que computeRunInjuryRisk pour les mêmes valeurs sous-jacentes", () => {
    const fromValues = computeRunInjuryRiskFromValues({
      fatiguePct: 45, vlamaxValue: 0.5, tteValue: 40, tss7d: 400, age: 40, objectif: "Marathon",
    });
    const fromObjects = computeRunInjuryRisk({
      fatigueEffectif: { score: 45 } as any,
      vlamaxEffectif: { value: 0.5 } as any,
      tteEffectif: { tte_min: 40 } as any,
      tss7d: 400,
      age: 40,
      objectif: "Marathon",
    });
    expect(fromValues.score).toBe(fromObjects.score);
    expect(fromValues.level).toBe(fromObjects.level);
  });
});

describe("adaptRunInjuryRiskToEnvelope — RunInjuryRiskEnvelope vers InjuryRiskEnvelope (RunningProfilePage)", () => {
  it("reste cohérent avec le score/niveau canonique et conserve les guardrails/coachOptions", () => {
    const canonical = computeRunInjuryRiskFromValues({
      fatiguePct: 80, vlamaxValue: 0.6, tteValue: 30, tss7d: 600, age: 45, objectif: "Marathon",
    });
    const adapted = adaptRunInjuryRiskToEnvelope(canonical);
    expect(adapted.sport).toBe("CAP");
    expect(adapted.score).toBe(canonical.score);
    expect(adapted.level).toBe(canonical.level);
    expect(adapted.coachRecommendations).toEqual(canonical.coachOptions);
    expect(adapted.guardrails).toEqual(canonical.guardrails);
    expect(adapted.drivers.length).toBe(canonical.drivers.length);
  });

  it("diverge de l'ancien computeCAPInjuryRisk (injuryRiskUnified.ts) pour un athlète en surcharge — preuve que la charge compte désormais", () => {
    const legacyIgnoresLoad = computeCAPInjuryRisk({
      vlamaxValue: 0.45, economyLevel: null, tteMin: 42, fatiguePct: 20,
      tss7d: 580, runLoad7d: null, age: 35, objectif: "Semi",
    });
    const canonicalUsesLoad = computeRunInjuryRiskFromValues({
      fatiguePct: 20, vlamaxValue: 0.45, tteValue: 42, tss7d: 580, age: 35, objectif: "Semi",
    });
    // legacy: 0.35*20 + 0.25*vlamax(30) + 0.25*tte(30) + 0.15*economy(30) = 27 → MODERE déjà en fait
    // mais surtout : le score canonique change si on fait varier tss7d, pas le legacy.
    const legacyLowLoad = computeCAPInjuryRisk({
      vlamaxValue: 0.45, economyLevel: null, tteMin: 42, fatiguePct: 20,
      tss7d: 50, runLoad7d: null, age: 35, objectif: "Semi",
    });
    const canonicalLowLoad = computeRunInjuryRiskFromValues({
      fatiguePct: 20, vlamaxValue: 0.45, tteValue: 42, tss7d: 50, age: 35, objectif: "Semi",
    });
    expect(legacyIgnoresLoad.score).toBe(legacyLowLoad.score); // bug historique : identique quelle que soit la charge
    expect(canonicalUsesLoad.score).not.toBe(canonicalLowLoad.score); // moteur canonique : sensible à la charge
  });
});
