import { describe, it, expect } from "vitest";
import { simulatePacingScenarios } from "../pacingScenarioSimulator";
import type { PacingEnvelopeResult } from "../pacingEnvelopeEngine";

/**
 * Bug réel (audit simulation de course) : RaceSimulationPage.tsx appelait
 * simulatePacingScenarios avec `raceDistanceKm: 90` codé en dur, quel que
 * soit l'objectif/discipline réellement simulé. `breakpointKm` (le km où la
 * conséquence d'une erreur de pacing se manifeste, affiché dans le rapport
 * exporté — buildRaceSimulationHTML.ts) est calculé comme une fraction de
 * cette distance : pour un Marathon (42.195 km), ça affichait par exemple
 * "Décrochage ~ km 63" — un point de décrochage AU-DELÀ de l'arrivée.
 * Ces tests figent la relation breakpointKm ∝ raceDistanceKm pour détecter
 * toute régression vers une distance figée.
 */
const envelope = {} as PacingEnvelopeResult;

function breakpointsFor(raceDistanceKm: number) {
  const result = simulatePacingScenarios({
    envelope,
    raceObjective: "Marathon",
    vlamaxValue: 0.5,
    tteMin: 40,
    raceDistanceKm,
    raceDurationMin: 210,
  });
  return result.scenarios
    .map((s) => s.consequence.breakpointKm)
    .filter((km): km is number => km != null);
}

describe("simulatePacingScenarios — breakpointKm suit raceDistanceKm (pas une distance figée)", () => {
  it("aucun breakpointKm ne dépasse la distance réelle de la course", () => {
    const raceDistanceKm = 42.195; // Marathon
    const breakpoints = breakpointsFor(raceDistanceKm);
    expect(breakpoints.length).toBeGreaterThan(0);
    for (const km of breakpoints) {
      expect(km).toBeLessThanOrEqual(raceDistanceKm);
    }
  });

  it("les breakpointKm d'un semi (21.0975 km) sont environ moitié moindres que ceux d'un marathon", () => {
    const marathonBreakpoints = breakpointsFor(42.195);
    const semiBreakpoints = breakpointsFor(21.0975);
    expect(semiBreakpoints.length).toBe(marathonBreakpoints.length);
    for (let i = 0; i < marathonBreakpoints.length; i++) {
      // Tolérance ±1 km pour absorber l'arrondi indépendant de chaque scénario.
      expect(Math.abs(semiBreakpoints[i] - marathonBreakpoints[i] / 2)).toBeLessThanOrEqual(1);
    }
  });

  it("régression : un breakpointKm > distance réelle indiquerait une raceDistanceKm figée (ex. 90 pour un marathon)", () => {
    const marathonBreakpoints = breakpointsFor(42.195);
    // Avant fix : raceDistanceKm=90 en dur produisait des breakpoints jusqu'à round(90*0.8)=72,
    // très supérieurs à la distance réelle (42.195 km).
    expect(Math.max(...marathonBreakpoints)).toBeLessThan(90 * 0.5);
  });
});
