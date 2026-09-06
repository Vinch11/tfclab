import { describe, it, expect } from "vitest";
import { computeTFCLDecisionMatrix, type TFCLDecisionInput, type DataWithSource } from "../tfclDecisionMatrix";
import { getVo2maxTarget } from "../unifiedLimiterDetection";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 1) : la cible
 * VO2max utilisée ici était recalculée localement (ftp_kg_min × 13, coefficient
 * non cité) au lieu d'utiliser la table canonique VO2MAX_TARGETS partagée avec
 * CoachingCompassCard — divergence jusqu'à 24% (ex: Marathon 55 vs 41.6) pouvant
 * produire des verdicts pass/fail opposés pour le même athlète sur le même écran.
 */

function src<T>(value: T): DataWithSource<T> {
  return { value, source: "snapshot" };
}

function baseInput(overrides: Partial<TFCLDecisionInput> = {}): TFCLDecisionInput {
  return {
    vo2max: src<number | null>(50),
    vlamax: src<number | null>(0.35),
    tte: src<number | null>(45),
    fatMaxPctVO2: src<number | null>(65),
    fatOxidationMax: src<number | null>(0.5),
    crossoverPctVO2: src<number | null>(75),
    freshnessScore: src<number | null>(80),
    tss7d: src<number | null>(300),
    tss28d: src<number | null>(1200),
    subjectiveFatigue: src<number | null>(3),
    confidenceScore: 80,
    discipline: "tri",
    objective: "Marathon",
    ambition: "age_group",
    age: null,
    ...overrides,
  };
}

describe("computeTFCLDecisionMatrix — cible VO2max alignée sur la table canonique unifiedLimiterDetection.ts", () => {
  it("la cible VO2max du domaine aerobic_engine correspond exactement à getVo2maxTarget (plus de dérivation locale ftp_kg_min×13)", () => {
    const objectives: TFCLDecisionInput["objective"][] = ["IM", "703", "Marathon", "Semi", "10km"];
    for (const objective of objectives) {
      const result = computeTFCLDecisionMatrix(baseInput({ objective }));
      const vo2maxDomain = result.domains.find((d) => d.domain === "aerobic_engine");
      expect(vo2maxDomain).toBeDefined();
      const expected = getVo2maxTarget(objective, "age_group", null);
      expect(vo2maxDomain!.metric.target).toBe(expected);
    }
  });

  it("l'ajustement par âge reste appliqué via la fonction canonique", () => {
    const young = computeTFCLDecisionMatrix(baseInput({ objective: "Marathon", age: 25 }));
    const masters = computeTFCLDecisionMatrix(baseInput({ objective: "Marathon", age: 55 }));
    const youngTarget = young.domains.find((d) => d.domain === "aerobic_engine")!.metric.target;
    const mastersTarget = masters.domains.find((d) => d.domain === "aerobic_engine")!.metric.target;
    expect(mastersTarget).toBeLessThan(youngTarget);
    expect(mastersTarget).toBe(getVo2maxTarget("Marathon", "age_group", 55));
  });
});
