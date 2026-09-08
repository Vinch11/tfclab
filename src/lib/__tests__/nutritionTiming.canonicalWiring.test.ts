import { describe, it, expect } from "vitest";
import { computeNutritionTiming } from "../nutritionTiming";
import { computeEnergyDrift } from "../energyDrift";
import { computeNutritionEstimateSimple, computeNutritionUnified } from "../v2/nutritionUnified";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 4, priorité
 * 3). Dans TwoForCoachingAnalysis.tsx, la MÊME carte affiche côte à côte
 * "Glucides cible" (nutritionEstimate, moteur unifié canonique) et "Timing
 * par phases" (nutritionTiming, phase MID). L'appel à computeNutritionTiming
 * ne transmettait ni vo2max ni weightKg — alors que ces deux props sont
 * disponibles et déjà utilisées 30 lignes plus haut pour nutritionEstimate —
 * ce qui bascule computeNutritionTiming sur son modèle heuristique LEGACY
 * (seuils VLamax 0.40/0.55/0.70, table de durée en minutes propre à ce
 * fichier), au lieu de déléguer à computeBaseRateMader (source canonique
 * partagée avec nutritionEstimate/nutritionV2). Le plancher de la phase MID
 * affichée pouvait dépasser le plafond de la "cible" affichée juste
 * au-dessus, dans la même carte, pour le même athlète.
 */
function energyDriftFixture(vlamax: number, tteMin: number, objectif: string) {
  return computeEnergyDrift({
    vlamaxEffectif: { value: vlamax, source: "test" as any, confidence: 0.8, label: "test" },
    tteEffectif: { tte_min: tteMin, source: "test" as any, confidence: 0.8, label: "test", target: 55, status: "ok" as any, status_message: "" },
    objectif,
  });
}

describe("computeNutritionTiming — délégation canonique (vo2max/weightKg transmis)", () => {
  it("sans vo2max/weightKg (bug), le mode legacy diverge nettement de nutritionEstimate pour un profil IM réaliste", () => {
    const vlamax = 0.30, tteMin = 60, weightKg = 75, vo2max = 45, objectif = "IM";
    const energyDrift = energyDriftFixture(vlamax, tteMin, objectif);

    const legacyTiming = computeNutritionTiming({
      vlamax, tteMin, tteTarget: 55, objectif, sport: "cap",
      digestiveTolerance: "MEDIUM", energyDrift,
      // vo2max/weightKg absents — reproduit exactement le bug
    });
    const estimate = computeNutritionEstimateSimple({ vlamax, objectif, tteMin, vo2max, weightKg });
    const estimateCentral = Math.round((estimate!.carbsMin + estimate!.carbsMax) / 2);

    expect(Math.abs(legacyTiming.carbsTarget - estimateCentral)).toBeGreaterThan(5);
  });

  it("avec vo2max/weightKg transmis (fix), le mode canonique converge vers le même leg 'cap' que le moteur unifié", () => {
    const vlamax = 0.30, tteMin = 60, weightKg = 75, vo2max = 45, objectif = "IM";
    const energyDrift = energyDriftFixture(vlamax, tteMin, objectif);

    const canonicalTiming = computeNutritionTiming({
      vlamax, tteMin, tteTarget: 55, objectif, sport: "cap",
      digestiveTolerance: "MEDIUM", energyDrift, vo2max, weightKg,
    });
    // Comparaison au MÊME leg (sport="cap", objectif="IM") du moteur unifié —
    // computeNutritionTiming ne modélise pas encore le triathlon en 2 legs
    // (cf. commentaire du composant), donc la comparaison pertinente est au
    // leg unique qu'il représente, pas au leg "dominant" (potentiellement
    // vélo) de computeNutritionEstimateSimple.
    const capLeg = computeNutritionUnified({
      vlamaxValue: vlamax, vo2max, tteMin, sport: "cap", objectif,
      targetDurationHours: null, targetIntensityPct: null, weightKg,
    });

    // Même source (computeBaseRateMader) pour le taux de base — écart résiduel
    // possible uniquement lié aux modulations TTE/durée propres à chaque module.
    expect(Math.abs(canonicalTiming.carbsTarget - capLeg!.carbsCentral)).toBeLessThanOrEqual(15);
  });
});
