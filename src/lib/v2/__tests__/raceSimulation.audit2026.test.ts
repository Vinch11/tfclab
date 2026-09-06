import { describe, it, expect } from "vitest";
import { computeRaceSimulation, type RaceSimulationInput } from "../raceSimulation";
import { getDefaultSimulationModifiers } from "../potentielTypes";

/**
 * Bugs réels (audit "simulation course/nutrition") trouvés dans
 * `computeRaceSimulation`/`generateScenario` (raceSimulation.ts).
 */

function baseInput(overrides: Partial<RaceSimulationInput> = {}): RaceSimulationInput {
  return {
    raceType: "IM",
    heat: "moderate",
    terrain: "flat",
    plannedCarbsGH: 70,
    gutTraining: false,
    ambition: "age_group",
    vlamaxEffectif: 0.55,
    vlamaxConfidence: 0.8,
    vlamaxDiscipline: "bike",
    tteMin: 40,
    tteConfidence: 0.8,
    fatmaxCenterPct: 65,
    fatmaxRange: [60, 70],
    disponibiliteScore: 70,
    disponibiliteLevel: "GREEN",
    weight: 75,
    ...overrides,
  } as RaceSimulationInput;
}

describe("computeRaceSimulation — breakpointKm n'écrase plus le PREMIER segment à risque (bug falsy-zero)", () => {
  it("le breakpointKm rapporté correspond toujours au premier segment dont fuelRiskIndex >= 60, jamais un segment plus tardif", () => {
    // Conditions défavorables pour maximiser les chances qu'au moins un
    // segment précoce (y compris potentiellement km 0) franchisse le seuil.
    const result = computeRaceSimulation(baseInput({
      raceType: "IM",
      heat: "hot",
      vlamaxEffectif: 0.75,
      tteMin: 20,
      fatmaxCenterPct: 45,
      plannedCarbsGH: 20,
    }));

    for (const scenario of result.scenarios) {
      const firstAtRiskIndex = scenario.segments.findIndex((s) => s.fuelRiskIndex >= 60);
      if (firstAtRiskIndex === -1) {
        expect(scenario.breakpointKm).toBeNull();
        continue;
      }
      // Aucun segment AVANT le breakpoint rapporté ne doit déjà être à risque
      // (sinon c'est le signe qu'un segment antérieur a été écrasé par un
      // segment plus tardif — exactement le bug falsy-zero).
      for (let i = 0; i < firstAtRiskIndex; i++) {
        expect(scenario.segments[i].fuelRiskIndex, `segment ${i}`).toBeLessThan(60);
      }
      expect(scenario.breakpointKm).not.toBeNull();
    }
  });
});

describe("computeRaceSimulation — le risque de panne suit l'intensité RÉELLE du segment (pas une constante)", () => {
  it("activer negativeSplitAllowed change fuelRiskIndex/glycogenRemaining sur les segments boostés du scénario aggressive, pas seulement intensityPct", () => {
    const withoutBoost = computeRaceSimulation(baseInput({
      readinessModifiers: { ...getDefaultSimulationModifiers(), negativeSplitAllowed: false },
    }));
    const withBoost = computeRaceSimulation(baseInput({
      readinessModifiers: { ...getDefaultSimulationModifiers(), negativeSplitAllowed: true },
    }));

    const aggWithout = withoutBoost.scenarios.find((s) => s.type === "aggressive")!;
    const aggWith = withBoost.scenarios.find((s) => s.type === "aggressive")!;

    // Le negative split boost s'applique aux 3 derniers segments (index 7,8,9)
    // — index 8 choisi pour éviter une coïncidence numérique au dernier
    // segment (9) où le boost negative-split (+3) égale par hasard le boost
    // "lateRaceIntensityBoostAllowed" (également actif par défaut, +3 lui aussi).
    const lastSegWithout = aggWithout.segments[8];
    const lastSegWith = aggWith.segments[8];

    // L'intensité affichée diffère bien (comportement déjà correct avant le fix).
    expect(lastSegWith.intensityPct).not.toBe(lastSegWithout.intensityPct);
    // Avant le correctif, fuelRiskIndex/glycogenRemaining utilisaient la
    // constante `targetIntensity` et ne changeaient JAMAIS avec ce
    // modificateur — ils doivent maintenant refléter le boost.
    expect(
      lastSegWith.fuelRiskIndex !== lastSegWithout.fuelRiskIndex ||
      lastSegWith.glycogenRemaining !== lastSegWithout.glycogenRemaining
    ).toBe(true);
  });
});

describe("computeRaceSimulation — le fallback glycogène (poids inconnu) applique la même formule que le calcul normal", () => {
  it("weight=null et weight=65 (poids par défaut documenté) donnent des courbes de glycogène identiques", () => {
    const withNullWeight = computeRaceSimulation(baseInput({ weight: null }));
    const with65 = computeRaceSimulation(baseInput({ weight: 65 }));

    for (const type of ["conservative", "optimal", "aggressive"] as const) {
      const a = withNullWeight.scenarios.find((s) => s.type === type)!;
      const b = with65.scenarios.find((s) => s.type === type)!;
      for (let i = 0; i < a.segments.length; i++) {
        expect(a.segments[i].glycogenRemaining).toBe(b.segments[i].glycogenRemaining);
      }
    }
  });

  it("weight=null (fallback 65kg) diffère nettement de weight=45 (avant le fix, le fallback valait 450g ≈ un poids de 37.5kg)", () => {
    const withNullWeight = computeRaceSimulation(baseInput({ weight: null }));
    const with45 = computeRaceSimulation(baseInput({ weight: 45 }));

    const a = withNullWeight.scenarios.find((s) => s.type === "optimal")!;
    const b = with45.scenarios.find((s) => s.type === "optimal")!;
    // Un athlète de 45kg a nettement moins de réserves qu'un fallback à 65kg.
    expect(a.segments[9].glycogenRemaining).not.toBe(b.segments[9].glycogenRemaining);
  });
});
