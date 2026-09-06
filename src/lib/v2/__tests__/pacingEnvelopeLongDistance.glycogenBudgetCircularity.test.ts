import { describe, it, expect } from "vitest";
import { computeLongDistanceEnvelope, type LongDistanceInput } from "../pacingEnvelopeLongDistance";
import type { PacingEnvelopeResult, EnvelopeBoundary } from "../pacingEnvelopeEngine";

/**
 * Bug réel corrigé (audit "simulation course/nutrition", passe 4).
 * computeGlycogenBudget() recevait `baseEnvelope.boundary.highPct` — l'intensité
 * BRUTE, avant l'application de durationPenaltyPct/glycogenPenaltyPct/
 * thermalPenaltyPct — pour estimer le taux de combustion glucidique, alors que
 * l'intensité RÉELLEMENT retenue in fine (adjustedHighPct) est toujours plus
 * basse. Le budget glycogène (et carbDeficitPenaltyPct, qui en dérive)
 * surestimait donc systématiquement le risque de bonk.
 *
 * Avec l'intensité brute (90%) l'ancien code classait ce profil "critical"
 * (bonk risk 90, pénalité carbDeficitPenaltyPct = 6) ; avec l'intensité déjà
 * réduite par les pénalités connues (73%, calculée dans le fix), le même
 * profil est en réalité "safe" (pénalité 0) — le vrai statut nutritionnel de
 * l'intensité que l'athlète va effectivement rouler.
 */

function makeBoundary(highPct: number, lowPct: number): EnvelopeBoundary {
  return {
    lowPct,
    centerPct: Math.round((highPct + lowPct) / 2),
    highPct,
    toleratedPct: highPct + 8,
    forbiddenPct: highPct + 8,
    widthLow: (highPct + lowPct) / 2 - lowPct,
    widthHigh: highPct - (highPct + lowPct) / 2,
    asymmetryRatio: 1,
    referenceBase: "FTP",
    referenceLabel: "% FTP",
    referenceShortLabel: "FTP",
    isFallbackReference: false,
  };
}

function makeBaseEnvelope(highPct: number, lowPct: number): PacingEnvelopeResult {
  return {
    boundary: makeBoundary(highPct, lowPct),
  } as unknown as PacingEnvelopeResult;
}

function makeInput(highPct: number, lowPct: number): LongDistanceInput {
  return {
    baseEnvelope: makeBaseEnvelope(highPct, lowPct),
    targetDurationHours: 8,
    vlamaxValue: 0.5,
    vlamaxConfidence: 0.8,
    tteConfidence: 0.8,
    athleteAge: 35,
    fatmaxPct: null, // → effectiveFatmax = 65 (défaut)
    historicalFadePattern: null,
    glycogenAvailability: null,
    bodyMassKg: 70,
    plannedCarbIntakeGph: 90,
    gutTrainingLevel: 3,
    sport: "bike",
    ambientTempC: null,
    humidityPct: null,
    heatAcclimationLevel: null,
  } as LongDistanceInput;
}

describe("computeLongDistanceEnvelope — computeGlycogenBudget n'utilise plus l'intensité brute (dépendance circulaire corrigée)", () => {
  it("un profil que l'ancienne formule aurait classé « critical » (intensité brute 90%) est en réalité « safe » une fois les pénalités connues déjà déduites (73%)", () => {
    const result = computeLongDistanceEnvelope(makeInput(90, 60));
    expect(result).not.toBeNull();
    expect(result!.glycogenBudget).not.toBeNull();
    expect(result!.glycogenBudget!.status).toBe("safe");
    expect(result!.penalties.carbDeficitPenaltyPct).toBe(0);
  });

  it("le taux de combustion glucidique projeté est bien calculé sur l'intensité réduite (~73%), pas sur l'intensité brute (90%)", () => {
    const result = computeLongDistanceEnvelope(makeInput(90, 60));
    // À 90% brut (bug), le taux projeté aurait été ~197 g/h ; à 73% (fix), ~126 g/h.
    expect(result!.glycogenBudget!.projectedBurnRateGph).toBeLessThan(150);
    expect(result!.glycogenBudget!.projectedBurnRateGph).toBeGreaterThan(100);
  });

  it("non-régression : un profil réellement à risque (apport CHO faible) reste classé en déficit malgré la correction", () => {
    const input = makeInput(90, 60);
    input.plannedCarbIntakeGph = 40;
    input.gutTrainingLevel = 1;
    const result = computeLongDistanceEnvelope(input);
    expect(result!.glycogenBudget!.status === "deficit" || result!.glycogenBudget!.status === "critical").toBe(true);
    expect(result!.penalties.carbDeficitPenaltyPct).toBeGreaterThan(0);
  });
});
