import { describe, it, expect } from "vitest";
import { computeFtpKgRange, computeTTERange, computeVO2maxRange } from "../performanceRanges";
import { getPerformanceAgeFactor, getTTEAgeFactor, getVo2maxAgeFactor } from "../v2/unifiedLimiterDetection";

/**
 * performanceRanges.ts calculait ses propres deltas d'âge (paliers 40/45/50/55/60,
 * delta additif ad hoc) au lieu de réutiliser getPerformanceAgeFactor/getTTEAgeFactor/
 * getVo2maxAgeFactor (unifiedLimiterDetection.ts) — source unique déjà utilisée par
 * ageAdjustment.ts et le moteur de diagnostic. Les deux modèles n'étaient pas alignés :
 * une décennie entière (40-49 ans) traitée comme un seul palier côté diagnostic se
 * retrouvait coupée en deux côté Dashboard (40-44 vs 45-49), avec des magnitudes
 * différentes pour le même âge.
 */

const IM_CONTEXT = {
  discipline: "IM",
  vlamaxEffectif: null,
  vo2max: null,
  weeklyVolume: null,
  currentValue: null,
};

describe("performanceRanges — alignement du delta d'âge sur le modèle canonique", () => {
  it("applique le même delta FTP/kg pour deux âges de la même décennie canonique (41 et 48 ans)", () => {
    const r41 = computeFtpKgRange({ ...IM_CONTEXT, age: 41 });
    const r48 = computeFtpKgRange({ ...IM_CONTEXT, age: 48 });
    // Avant fix : 41 tombait dans le palier local [40,45) et 48 dans [45,50),
    // avec des deltas différents (-0.05 vs -0.1) alors que getPerformanceAgeFactor
    // traite 40-49 ans comme un seul palier (×0.95).
    expect(r41.realistic.min).toBe(r48.realistic.min);
    expect(r41.realistic.max).toBe(r48.realistic.max);
  });

  it("le delta FTP/kg à 45 ans correspond exactement au facteur canonique getPerformanceAgeFactor", () => {
    const base = computeFtpKgRange({ ...IM_CONTEXT, age: null });
    const adjusted = computeFtpKgRange({ ...IM_CONTEXT, age: 45 });
    const factor = getPerformanceAgeFactor(45);
    const referenceValue = (base.realistic.min + base.realistic.max) / 2;
    const expectedDelta = Math.round(referenceValue * (factor - 1) * 100) / 100;

    expect(Math.round((adjusted.realistic.min - base.realistic.min) * 100) / 100).toBeCloseTo(expectedDelta, 2);
  });

  it("applique le même delta TTE pour deux âges de la même décennie canonique (41 et 48 ans)", () => {
    const r41 = computeTTERange({ ...IM_CONTEXT, age: 41 });
    const r48 = computeTTERange({ ...IM_CONTEXT, age: 48 });
    expect(r41.realistic.min).toBe(r48.realistic.min);
    expect(r41.realistic.max).toBe(r48.realistic.max);
  });

  it("le delta TTE à 45 ans correspond au facteur canonique getTTEAgeFactor", () => {
    const base = computeTTERange({ ...IM_CONTEXT, age: null });
    const adjusted = computeTTERange({ ...IM_CONTEXT, age: 45 });
    const factor = getTTEAgeFactor(45);
    const referenceValue = (base.realistic.min + base.realistic.max) / 2;
    const expectedDelta = Math.round(referenceValue * (factor - 1));

    expect(adjusted.realistic.min - base.realistic.min).toBe(expectedDelta);
  });

  it("applique le même delta VO2max pour deux âges de la même décennie canonique (41 et 48 ans)", () => {
    const r41 = computeVO2maxRange({ ...IM_CONTEXT, age: 41 });
    const r48 = computeVO2maxRange({ ...IM_CONTEXT, age: 48 });
    expect(r41.realistic.min).toBe(r48.realistic.min);
    expect(r41.realistic.max).toBe(r48.realistic.max);
  });

  it("le delta VO2max à 45 ans correspond au facteur canonique getVo2maxAgeFactor", () => {
    const base = computeVO2maxRange({ ...IM_CONTEXT, age: null });
    const adjusted = computeVO2maxRange({ ...IM_CONTEXT, age: 45 });
    const factor = getVo2maxAgeFactor(45);
    const referenceValue = (base.realistic.min + base.realistic.max) / 2;
    const expectedDelta = Math.round(referenceValue * (factor - 1));

    expect(adjusted.realistic.min - base.realistic.min).toBe(expectedDelta);
  });
});
