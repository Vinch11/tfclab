import { describe, it, expect } from "vitest";
import {
  findLactateThresholds,
  findMLSSPower,
  findSteadyStateLactate,
  type MaderProfile,
} from "../maderMetabolicModel";

/**
 * Audit fix — l'ancien solveur itératif (calculateLactateProduction vs
 * calculateLactateClearance) saturait à la baseline (1 mmol/L) pour la quasi-
 * totalité des profils VO2max/VLamax réalistes : la capacité d'élimination
 * croît avec VO2max plus vite que la production ne croît avec VLamax, donc
 * la lactatémie ne dépassait jamais 2 mmol/L pour un athlète bien entraîné.
 * Conséquence : `findLactateThresholds` ne trouvait jamais de croisement et
 * retombait en silence sur 60%/75% VO2max fixes, en contradiction avec le
 * MLSS calculé séparément par `findMLSSPower` pour le même profil.
 *
 * Ces tests couvrent toute la plage réaliste (VO2max 45-75, VLamax 0.25-0.70)
 * pour garantir qu'aucun profil courant ne retombe plus sur le repli fixe.
 */

const REALISTIC_PROFILES: MaderProfile[] = [];
for (const vo2max of [45, 50, 55, 60, 65, 70, 75]) {
  for (const vlamax of [0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7]) {
    REALISTIC_PROFILES.push({ vo2max, vlamax, weight: 70 });
  }
}

describe("findLactateThresholds — profils réalistes", () => {
  it("ne retombe jamais sur 60%/75% VO2max en dur pour un profil physiologique valide", () => {
    for (const profile of REALISTIC_PROFILES) {
      const { lt1Intensity, lt2Intensity } = findLactateThresholds(profile);
      expect(lt1Intensity, `vo2max=${profile.vo2max} vlamax=${profile.vlamax}`).toBeGreaterThan(0);
      expect(lt2Intensity, `vo2max=${profile.vo2max} vlamax=${profile.vlamax}`).toBeGreaterThan(0);
    }
  });

  it("LT1 < LT2 pour tout profil réaliste", () => {
    for (const profile of REALISTIC_PROFILES) {
      const { lt1Intensity, lt2Intensity, lt1Power, lt2Power } = findLactateThresholds(profile);
      expect(lt1Intensity).toBeLessThan(lt2Intensity);
      expect(lt1Power).toBeLessThan(lt2Power);
    }
  });

  it("LT2 est exactement le MLSS calculé séparément — plus de contradiction entre les deux formules", () => {
    for (const profile of REALISTIC_PROFILES) {
      const { lt2Power } = findLactateThresholds(profile);
      expect(lt2Power).toBe(findMLSSPower(profile));
    }
  });

  it("un VLamax plus élevé (à VO2max égal) abaisse LT2 en %VO2max (plus glycolytique → seuil plus bas)", () => {
    const low = findLactateThresholds({ vo2max: 60, vlamax: 0.3, weight: 70 });
    const high = findLactateThresholds({ vo2max: 60, vlamax: 0.6, weight: 70 });
    expect(high.lt2Intensity).toBeLessThan(low.lt2Intensity);
  });

  it("entrées invalides → 0 partout (sentinelle 'non calculable'), jamais un repli fictif 60/75", () => {
    const r = findLactateThresholds({ vo2max: 0, vlamax: 0.4, weight: 70 });
    expect(r).toEqual({ lt1Power: 0, lt2Power: 0, lt1Intensity: 0, lt2Intensity: 0 });
  });
});

describe("findSteadyStateLactate — courbe non-plate pour un profil réaliste", () => {
  it("ne reste pas figée à la baseline (1.0) du seuil bas au seuil haut pour un athlète entraîné", () => {
    // VO2max=60, VLamax=0.42 — profil ordinaire, cassait systématiquement avant le fix
    // (courbe plate à 1.00 mmol/L de 30% à 100%, cf. probe de l'audit).
    const low = findSteadyStateLactate(40, 60, 0.42, 70);
    const high = findSteadyStateLactate(95, 60, 0.42, 70);
    expect(high).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(3.5); // proche/au-dessus de LT2 à haute intensité
  });

  it("est monotone croissante avec l'intensité", () => {
    const { vo2max, vlamax, weight } = { vo2max: 65, vlamax: 0.45, weight: 68 };
    let prev = -Infinity;
    for (let i = 30; i <= 100; i += 5) {
      const l = findSteadyStateLactate(i, vo2max, vlamax, weight);
      expect(l).toBeGreaterThanOrEqual(prev);
      prev = l;
    }
  });

  it("vaut ~2.0 mmol/L à LT1 et ~4.0 mmol/L à LT2 (cohérence avec findLactateThresholds)", () => {
    const profile: MaderProfile = { vo2max: 62, vlamax: 0.38, weight: 72 };
    const { lt1Intensity, lt2Intensity } = findLactateThresholds(profile);
    const atLt1 = findSteadyStateLactate(lt1Intensity, profile.vo2max, profile.vlamax, profile.weight);
    const atLt2 = findSteadyStateLactate(lt2Intensity, profile.vo2max, profile.vlamax, profile.weight);
    expect(atLt1).toBeCloseTo(2.0, 0);
    expect(atLt2).toBeCloseTo(4.0, 0);
  });
});
