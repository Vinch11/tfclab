import { describe, it, expect } from "vitest";
import { computeCAPInjuryRisk, computeBikeInjuryRisk } from "../injuryRiskUnified";

/**
 * Batch 3 — audit méthodologique. computeCAPTTEComponent/computeBikeTTEComponent
 * recevaient `objectif` sous la forme `_objectif` (préfixé pour signaler qu'il
 * était volontairement ignoré) et appliquaient un seuil fixe (45/55 min) à
 * TOUS les objectifs — une cible implicite ≈50 min. Corrigé : bandes relatives
 * ±10% autour de la cible canonique par objectif (physiologicalTargets.ts via
 * tteEffectif.ts::getTTETarget).
 */

describe("computeCAPInjuryRisk — pilier TTE aligné sur la cible canonique par objectif", () => {
  const tteDriver = (r: ReturnType<typeof computeCAPInjuryRisk>) =>
    r.drivers.find(d => d.label === "TTE effectif")!;

  it("Semi (cible canonique 40min) : TTE=42min est AU-DESSUS de la cible → risque bas, pas élevé", () => {
    // Avant fix : seuil fixe 45min → 42 < 45 → "risque élevé" (60) alors que
    // 42 dépasse la vraie cible Semi (40).
    const result = computeCAPInjuryRisk({
      vlamaxValue: null,
      economyLevel: null,
      tteMin: 42,
      fatiguePct: 40,
      tss7d: null,
      runLoad7d: null,
      age: null,
      objectif: "Semi",
    });
    expect(tteDriver(result).component).toBeLessThanOrEqual(30);
  });

  it("Ultra (cible canonique 60min) : TTE=48min est NETTEMENT SOUS la cible → risque élevé, pas neutre", () => {
    // Avant fix : seuil fixe 45-55min → 48 dans la bande "neutre" (30) alors
    // que 48 est bien en dessous de la vraie cible Ultra (60).
    const result = computeCAPInjuryRisk({
      vlamaxValue: null,
      economyLevel: null,
      tteMin: 48,
      fatiguePct: 40,
      tss7d: null,
      runLoad7d: null,
      age: null,
      objectif: "Ultra",
    });
    expect(tteDriver(result).component).toBeGreaterThanOrEqual(60);
  });
});

describe("computeBikeInjuryRisk — même correction pour le pilier vélo", () => {
  const tteDriver = (r: ReturnType<typeof computeBikeInjuryRisk>) =>
    r.drivers.find(d => d.label === "TTE effectif")!;

  it("Ultra (cible 60min) : TTE=48min → risque élevé, pas neutre", () => {
    const result = computeBikeInjuryRisk({
      vlamaxValue: null,
      ifscScore: null,
      tteMin: 48,
      fatiguePct: 40,
      tss7d: null,
      longRideDurationMin: null,
      age: null,
      objectif: "Ultra",
    });
    expect(tteDriver(result).component).toBeGreaterThanOrEqual(60);
  });
});
