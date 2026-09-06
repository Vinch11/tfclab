import { describe, it, expect } from "vitest";
import { generateMaderPowerDurationCurve } from "../maderPowerDurationCurve";
import { analyzeCriticalPower } from "../criticalPowerModel";
import type { MaderProfile } from "../maderMetabolicModel";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 1) :
 * NolioImporter.tsx et NolioAnalysisCard.tsx appelaient
 * generateMaderPowerDurationCurve sans cpOverride/wPrimeJOverride, utilisant
 * toujours l'heuristique non citée (W' ≈ 320×VLamax×poids) même quand
 * l'athlète a des données de puissance courte réelles (P30s/P60s/MAP5')
 * permettant une vraie régression CP/W' — contrairement à
 * PowerDurationUnifiedChart.tsx qui câble déjà ces overrides depuis
 * analyzeCriticalPower(). Les deux composants font désormais de même.
 *
 * Trace de l'audit : VLamax=0.35, poids=75kg → heuristique W' = 8 400J,
 * clampée au plancher 8 000J. Avec les données réelles de puissance courte
 * (P30s=750W, P60s=500W, MAP5min=330W), la régression donne un W' différent
 * (issu des vraies données, pas d'une formule non calibrée).
 */

describe("generateMaderPowerDurationCurve — priorité à la régression CP/W' quand elle est disponible", () => {
  const profile: MaderProfile = { vo2max: 55, vlamax: 0.35, weight: 75 };

  it("sans override, utilise l'heuristique non citée (comportement historique, toujours le fallback)", () => {
    const curve = generateMaderPowerDurationCurve(profile, [30, 60, 300]);
    expect(curve.wPrimeSource).toBe("heuristic");
    // 320×0.35×75 = 8400J = 8.4kJ, arrondi à 8kJ.
    expect(curve.wPrime).toBe(8);
  });

  it("avec le CP/W' régressé depuis de vraies données de puissance courte, utilise la régression (pas l'heuristique)", () => {
    const cpResult = analyzeCriticalPower({
      p30s_w: 750,
      p60s_w: 500,
      map5min_w: 330,
      ftp: 300,
      weight_kg: 75,
    });
    expect(cpResult).not.toBeNull();

    const curveWithRegression = generateMaderPowerDurationCurve(profile, [30, 60, 300], {
      cpOverride: cpResult!.effectiveCP,
      wPrimeJOverride: cpResult!.wprime,
    });

    expect(curveWithRegression.wPrimeSource).toBe("regression");
    // Le W' vient des vraies données, pas de la formule 320×VLamax×poids (8kJ).
    expect(curveWithRegression.wPrime).not.toBe(8);
    expect(curveWithRegression.wPrime).toBe(Math.round(cpResult!.wprime / 1000));
  });
});
