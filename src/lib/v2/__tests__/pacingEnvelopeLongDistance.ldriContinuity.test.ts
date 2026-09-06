import { describe, it, expect } from "vitest";
import { computeLongDistanceEnvelope, type LongDistanceInput } from "../pacingEnvelopeLongDistance";
import type { PacingEnvelopeResult, EnvelopeBoundary } from "../pacingEnvelopeEngine";

/**
 * Bug réel corrigé (audit "simulation course/nutrition", passe 4). Dans
 * computeLDRI (LongDistanceRiskIndex), le palier "≤1.5h" du risque durée
 * valait 10, alors que le palier suivant valait déjà 20 juste au-dessus de
 * 1.5h (20 + (1.5-1.5)*15) — un saut brutal de +10 points exactement au
 * seuil où `computeLongDistanceEnvelope` autorise encore l'appel (garde
 * `targetDurationHours < LONG_DISTANCE_THRESHOLD_HOURS`, 1.5h inclus). Un
 * objectif estimé à exactement 1.5h franchissait donc ce saut pour une
 * différence de durée infinitésimale, alors que les paliers 3h et 5h sont,
 * eux, déjà continus entre eux.
 */

function makeBoundary(): EnvelopeBoundary {
  return {
    lowPct: 60,
    centerPct: 70,
    highPct: 80,
    toleratedPct: 88,
    forbiddenPct: 88,
    widthLow: 10,
    widthHigh: 10,
    asymmetryRatio: 1,
    referenceBase: "FTP",
    referenceLabel: "% FTP",
    referenceShortLabel: "FTP",
    isFallbackReference: false,
  };
}

function makeBaseEnvelope(): PacingEnvelopeResult {
  return { boundary: makeBoundary() } as unknown as PacingEnvelopeResult;
}

function makeInput(targetDurationHours: number): LongDistanceInput {
  return {
    baseEnvelope: makeBaseEnvelope(),
    targetDurationHours,
    vlamaxValue: 0.45,
    vlamaxConfidence: 0.8,
    tteConfidence: 0.8,
    athleteAge: 35,
    fatmaxPct: null,
    historicalFadePattern: null,
    glycogenAvailability: null,
    bodyMassKg: 70,
    sport: "bike",
  } as LongDistanceInput;
}

describe("computeLDRI (via computeLongDistanceEnvelope) — plus de saut de risque durée au seuil 1.5h", () => {
  it("exactement 1.5h : risque durée = 20 (aligné avec le palier suivant), plus 10", () => {
    const result = computeLongDistanceEnvelope(makeInput(1.5));
    expect(result!.ldri.components.durationRisk).toBe(20);
  });

  it("juste au-dessus de 1.5h (1.51h) : risque durée quasi identique à 1.5h, pas de saut", () => {
    const at15 = computeLongDistanceEnvelope(makeInput(1.5))!.ldri.components.durationRisk;
    const above15 = computeLongDistanceEnvelope(makeInput(1.51))!.ldri.components.durationRisk;
    expect(Math.abs(above15 - at15)).toBeLessThan(1);
  });

  it("non-régression : les paliers 3h et 5h restent continus entre eux", () => {
    const at3 = computeLongDistanceEnvelope(makeInput(3))!.ldri.components.durationRisk;
    const above3 = computeLongDistanceEnvelope(makeInput(3.01))!.ldri.components.durationRisk;
    expect(Math.abs(above3 - at3)).toBeLessThan(1);

    const at5 = computeLongDistanceEnvelope(makeInput(5))!.ldri.components.durationRisk;
    const above5 = computeLongDistanceEnvelope(makeInput(5.01))!.ldri.components.durationRisk;
    expect(Math.abs(above5 - at5)).toBeLessThan(1);
  });

  it("le risque durée continue de croître avec la durée (pas de plateau ni de sur-réaction)", () => {
    const r15 = computeLongDistanceEnvelope(makeInput(1.5))!.ldri.components.durationRisk;
    const r3 = computeLongDistanceEnvelope(makeInput(3))!.ldri.components.durationRisk;
    const r5 = computeLongDistanceEnvelope(makeInput(5))!.ldri.components.durationRisk;
    const r10 = computeLongDistanceEnvelope(makeInput(10))!.ldri.components.durationRisk;
    expect(r15).toBeLessThan(r3);
    expect(r3).toBeLessThan(r5);
    expect(r5).toBeLessThanOrEqual(r10);
  });
});
