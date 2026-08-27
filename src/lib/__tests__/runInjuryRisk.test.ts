import { describe, it, expect } from "vitest";
import { computeRunInjuryRisk } from "../runInjuryRisk";
import type { FatigueEffectif } from "../fatigueEffectif";

/**
 * Batch 3 — audit méthodologique. computeTTEComponent (pilier TTE, poids 20%
 * du score composite) importait getTTETarget (tteEffectif.ts, source unique)
 * mais ne l'appelait jamais — une table locale figée était utilisée à la
 * place, divergente de la cible canonique de 5 à 8 min selon l'objectif
 * (703: 50 au lieu de 45 ; TrailCourt: 42 au lieu de 50 via l'alias Trail).
 */

const FATIGUE_NEUTRAL = { score: 40 } as unknown as FatigueEffectif;

describe("computeRunInjuryRisk — pilier TTE aligné sur la cible canonique", () => {
  it("TrailCourt et Trail produisent le même composant TTE pour la même valeur (alias canonique)", () => {
    // Avant fix : TrailCourt utilisait une cible locale (42) différente de
    // celle de Trail (50 canonique) — deux composants différents pour la
    // même valeur TTE et le même profil physiologique de fond.
    const trailCourt = computeRunInjuryRisk({
      fatigueEffectif: FATIGUE_NEUTRAL,
      tteEffectif: { tte_min: 46, source: "observed", confidence: 0.9, label: "TTE" },
      age: 35,
      objectif: "TrailCourt",
    });
    const trail = computeRunInjuryRisk({
      fatigueEffectif: FATIGUE_NEUTRAL,
      tteEffectif: { tte_min: 46, source: "observed", confidence: 0.9, label: "TTE" },
      age: 35,
      objectif: "Trail",
    });

    const tteDriver = (r: typeof trailCourt) => r.drivers.find(d => d.label === "TTE effectif")!;

    expect(tteDriver(trailCourt).component).toBeCloseTo(tteDriver(trail).component, 1);
  });

  it("703 utilise la cible canonique (45 min), pas l'ancienne table locale (50 min)", () => {
    // TTE=46min : au-dessus de la cible canonique 703 (45) → risque bas.
    // Avec l'ancienne table locale (target=50), 46 serait EN DESSOUS de la
    // cible → risque plus élevé à tort.
    const result = computeRunInjuryRisk({
      fatigueEffectif: FATIGUE_NEUTRAL,
      tteEffectif: { tte_min: 46, source: "observed", confidence: 0.9, label: "TTE" },
      age: 35,
      objectif: "703",
    });
    const tteDriver = result.drivers.find(d => d.label === "TTE effectif")!;

    // ratio = 46/45 ≈ 1.022 → component = clamp(100 - 102.2, 0, 100) = 0
    expect(tteDriver.component).toBeCloseTo(0, 0);
  });
});
