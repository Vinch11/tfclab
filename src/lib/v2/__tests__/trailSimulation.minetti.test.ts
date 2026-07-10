/**
 * Sanity: Minetti et al. 2002 — coût énergétique locomotion en pente.
 * Polynôme: C(i) = 155.4·i⁵ − 30.4·i⁴ − 43.3·i³ + 46.3·i² + 19.5·i + 3.6 [J/kg/m]
 * Ref: Minetti AE et al., J Appl Physiol 93:1039-1046 (2002).
 */
import { describe, it, expect } from "vitest";
import {
  minettiCost,
  minettiFactor,
  computeGAP,
  simulateTrail,
  type TrailAthleteProfile,
} from "@/lib/v2/trailSimulation";

describe("Minetti 2002 polynomial", () => {
  it("C(0) = 3.6 J/kg/m (reference plat)", () => {
    expect(minettiCost(0)).toBeCloseTo(3.6, 3);
    expect(minettiFactor(0)).toBeCloseTo(1.0, 3);
  });

  it("valeurs de référence (montées)", () => {
    // Depuis polynôme exact
    expect(minettiFactor(5)).toBeCloseTo(1.301, 2);
    expect(minettiFactor(10)).toBeCloseTo(1.658, 2);
    expect(minettiFactor(15)).toBeCloseTo(2.060, 2);
    expect(minettiFactor(20)).toBeCloseTo(2.502, 2);
    expect(minettiFactor(30)).toBeCloseTo(3.494, 2);
  });

  it("valeurs de référence (descentes)", () => {
    expect(minettiFactor(-5)).toBeCloseTo(0.763, 2);
    expect(minettiFactor(-10)).toBeCloseTo(0.598, 2);
    expect(minettiFactor(-20)).toBeCloseTo(0.500, 2);
  });

  it("monotone en montée [0, +30%]", () => {
    let prev = minettiFactor(0);
    for (let g = 1; g <= 30; g++) {
      const cur = minettiFactor(g);
      expect(cur).toBeGreaterThan(prev);
      prev = cur;
    }
  });

  it("clamp au domaine validé [-45%, +45%]", () => {
    // Au-delà de 45%, on doit obtenir la même valeur qu'à 45% (clamp).
    expect(minettiCost(0.60)).toBeCloseTo(minettiCost(0.45), 6);
    expect(minettiCost(-0.60)).toBeCloseTo(minettiCost(-0.45), 6);
  });

  it("computeGAP : sur plat, GAP = vitesse réelle", () => {
    expect(computeGAP(12, 0)).toBeCloseTo(12, 3);
  });

  it("computeGAP : en montée, GAP > vitesse réelle", () => {
    expect(computeGAP(10, 10)).toBeGreaterThan(10);
  });
});

describe("simulateTrail — no fake defaults (F38-bis)", () => {
  const baseAthlete: TrailAthleteProfile = {
    vma: 16,
    fatmaxCenterPct: 70,
    tteMin: 60,
    vlamaxEffectif: 0.45,
    weightKg: 68,
    ftp: 260,
  };

  const baseInput = {
    distanceKm: 42,
    dPlusM: 2000,
    dMinusM: 2000,
    technicite: "moyen" as const,
    ambition: "perf" as const,
    tempC: 18,
    plannedCarbsGH: 70,
  };

  it("VLamax null → warning explicite, pas de crash, contribution glycolytique nulle", () => {
    const res = simulateTrail({
      ...baseInput,
      athlete: { ...baseAthlete, vlamaxEffectif: null },
    });
    expect(res.warnings.some(w => w.toLowerCase().includes("vlamax"))).toBe(true);
    // Sans VLamax, la déplétion doit être ≤ la déplétion avec VLamax=0.45 (glycolyse absente)
    const resWithVla = simulateTrail({
      ...baseInput,
      athlete: baseAthlete,
    });
    expect(res.glycogenFinalG).toBeGreaterThanOrEqual(resWithVla.glycogenFinalG - 1);
    expect(Number.isFinite(res.estimatedTimeMin)).toBe(true);
  });

  it("Poids null → warning + fallback documenté (70 kg pour dual-pool)", () => {
    const res = simulateTrail({
      ...baseInput,
      athlete: { ...baseAthlete, weightKg: null as any },
    });
    expect(res.warnings.some(w => w.toLowerCase().includes("poids"))).toBe(true);
  });

  it("Profil complet → aucune warning 'non renseignée'", () => {
    const res = simulateTrail({ ...baseInput, athlete: baseAthlete });
    const hasNonRenseigneeWarning = res.warnings.some(w =>
      /non renseignée?/i.test(w)
    );
    expect(hasNonRenseigneeWarning).toBe(false);
  });

  it("Temps estimé cohérent : marathon vallonné perf ∈ [3h, 6h30]", () => {
    const res = simulateTrail({ ...baseInput, athlete: baseAthlete });
    expect(res.estimatedTimeMin).toBeGreaterThan(180);
    expect(res.estimatedTimeMin).toBeLessThan(390);
  });
});
