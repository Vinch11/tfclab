import { describe, expect, it } from "vitest";
import { computeCoachingCompass, type CoachingCompassInput } from "..";
import { axisAssessment, buildCompassPresentation } from "../presentation";
import { computeRaceReadiness } from "@/lib/raceReadiness/computeRaceReadiness";

const fixture = (objectif = "IM"): CoachingCompassInput => ({
  ftp: 188, poids: 52, vo2max: 50, tss7d: null, snapshotDate: "2026-11-12", snapshotUpdatedAt: null,
  pmax5s: 359, p30sW: 318, p60sW: 275, map5minW: 222, runEconomyScore: 65,
  hrDriftPct: 1.3, vma: 14.2, paceThresholdSecPerKm: 315, fatmax: 68,
  vlamaxEffectif: { value: .2, confidence: .7, source: "estimation" },
  tteEffectif: { tte_min: 35, confidence: .5, source: "estimated" },
  tteEffectifRun: { tte_min: 40, confidence: .95, source: "observed" },
  fatigueEffectif: null, potentielPhysiologique: null, strategyResult: null, lactateThresholds: null,
  wprimeKj: null, objectif, ambition: "competitor", sportFocus: "triathlon", athleteAge: 51,
  limiterResult: { primaryLimiter: "specific_endurance", limiterLabel: "Endurance au seuil", confidence: 70,
    gapAnalysis: [{ metric: "TTE", gap: -20, weightedImpact: 20 }, { metric: "W'", gap: 0, weightedImpact: 0 }],
    categoryRanking: [{ category: "metabolic_endurance", metrics: [{ metric: "TTE", weightedImpact: 20 }] }],
  },
});

describe("Read-only compass presentation", () => {
  it.each(["5K", "10K", "Semi", "Marathon", "Trail", "703", "IM"])("preserves diagnostic and prescription outputs for %s", objectif => {
    const input = fixture(objectif);
    const before = structuredClone(input);
    const result = computeCoachingCompass(input);
    const contracts = structuredClone({ limiter: result.limiter, leverage: result.leverage, decision: result.decision, readiness: result.readiness, axes: result.radarAxes });
    const view = buildCompassPresentation(input, result);
    expect(input).toEqual(before);
    expect({ limiter: result.limiter, leverage: result.leverage, decision: result.decision, readiness: result.readiness, axes: result.radarAxes }).toEqual(contracts);
    expect(result.limiter.label).toBe("Endurance au seuil");
    expect(view.priorityMetrics).toEqual(["TTE"]);
    expect(view.axes.find(a => a.key === "tte")?.value).toBe(35);
    expect(result.radarAxes.find(a => a.key === "durability")?.value).not.toBe(35);
  });
  it("does not turn absent W′ into a demonstrated weakness", () => {
    const result = computeCoachingCompass(fixture());
    const axis = result.presentation?.axes.find(a => a.key === "wprime");
    expect(axis?.value).toBeNull();
    expect(axis && axisAssessment(axis)).toBe("Données insuffisantes");
    expect(result.presentation?.priorityMetrics).not.toContain("W'");
  });
  it("retains W′ when the current diagnostic ranks it", () => {
    const input = fixture();
    input.wprimeKj = 7;
    input.limiterResult = { primaryLimiter: "anaerobic_capacity", limiterLabel: "W′", confidence: 70,
      gapAnalysis: [{ metric: "W'", gap: -11, weightedImpact: 25 }] };
    const result = computeCoachingCompass(input);
    expect(result.limiter.label).toBe("W′");
    expect(result.presentation?.wprimeReview).toBe(true);
    expect(result.presentation?.priorityMetrics).toEqual(["W'"]);
  });
  it("keeps bike/run TTE and a zero decoupling observation separate", () => {
    const result = computeCoachingCompass({ ...fixture(), hrDriftPct: 0 });
    expect(result.presentation?.tteBike?.tte_min).toBe(35);
    expect(result.presentation?.tteRun?.tte_min).toBe(40);
    expect(result.presentation?.decouplingRun).toBe(0);
    expect(result.presentation?.axes.some(a => a.key === "durability")).toBe(false);
  });
  it("does not certify an estimated VLamax merely because its target is reached", () => {
    const result = computeCoachingCompass(fixture());
    const axis = result.presentation?.axes.find(a => a.key === "vlamax");
    expect(axis?.score).toBe(100);
    expect(axis && axisAssessment(axis)).toBe("À confirmer");
  });
  it("preserves legacy readiness score and keeps its display separate", () => {
    const result = computeCoachingCompass(fixture());
    const readiness = computeRaceReadiness(result);
    const legacy = computeRaceReadiness({ ...result, presentation: undefined });
    expect(readiness?.scorePct).toBe(legacy?.scorePct);
    expect(readiness?.governingAxis).toEqual(legacy?.governingAxis);
    expect(readiness?.presentationAxes?.find(a => a.key === "tte")?.value).toBe(35);
  });
});