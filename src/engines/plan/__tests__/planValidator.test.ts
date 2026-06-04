import { describe, it, expect } from "vitest";
import { deriveLimiterKeysFromGapAnalysis, validatePlan, type PlanValidationResult } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Test",
    phase: "base",
    dayName: "Lundi",
    dayIndex: 0,
    sport: "Course",
    title: "EF Z2 45min",
    details: "Zone 2 endurance fondamentale",
    isRest: false,
    ...overrides,
  };
}

function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[], theme = "Standard"): ParsedWeek {
  return {
    weekNumber,
    theme,
    phase: "base",
    sessions: sessions.map((s, i) => makeSession({
      weekNumber,
      weekTheme: theme,
      dayIndex: i % 7,
      dayName: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"][i % 7],
      ...s,
    })),
  };
}

function makePolarizedWeek(weekNumber: number, deload = false): ParsedWeek {
  if (deload) {
    return makeWeek(weekNumber, [
      { sport: "Course", title: "EF Z2 30min", details: "Récupération" },
      { sport: "Course", title: "EF Z2 30min", details: "Récup active" },
      { sport: "Repos", title: "Repos", details: "", isRest: true },
    ], "Décharge");
  }
  return makeWeek(weekNumber, [
    { sport: "Course", title: "EF Z2 45min", details: "Endurance fondamentale" },
    { sport: "Course", title: "EF Z2 50min", details: "Endurance" },
    { sport: "Course", title: "Intervalles seuil 3x10min", details: "Séance clé 🔑 Z5" },
    { sport: "Course", title: "EF Z2 40min", details: "Footing récup" },
    { sport: "Vélo", title: "Z2 60min", details: "Endurance vélo" },
    { sport: "Course", title: "Sortie longue 20km", details: "SL progressive 🔑" },
    { sport: "Repos", title: "Repos", details: "", isRest: true },
  ]);
}

function makePlan(weeks: ParsedWeek[]): ParsedPlan {
  return {
    title: "Test Plan",
    phases: [],
    weeks,
    totalWeeks: weeks.length,
  };
}

describe("planValidator", () => {
  it("validates a well-structured 8-week plan", () => {
    // 3:1 pattern: 3 load + 1 deload × 2
    const weeks = [
      makePolarizedWeek(1),
      makePolarizedWeek(2),
      makePolarizedWeek(3),
      makePolarizedWeek(4, true),
      makePolarizedWeek(5),
      makePolarizedWeek(6),
      makePolarizedWeek(7),
      makeWeek(8, [
        { sport: "Course", title: "EF Z2 30min", details: "Activation pré-course" },
        { sport: "Course", title: "EF Z2 20min", details: "Récupération" },
        { sport: "Course", title: "🏁 COURSE OBJECTIF", details: "Jour J — Marathon" },
        { sport: "Repos", title: "Repos", details: "", isRest: true },
      ], "Affûtage / Course"),
    ];
    const result = validatePlan(makePlan(weeks));

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.grade).toMatch(/^[AB]$/);
    expect(result.issues.filter(i => i.severity === "error")).toHaveLength(0);
  });

  it("detects missing deload weeks", () => {
    // 8 consecutive load weeks with no deload
    const weeks = Array.from({ length: 8 }, (_, i) => makePolarizedWeek(i + 1));
    const result = validatePlan(makePlan(weeks));

    const loadIssues = result.issues.filter(i => i.rule === "load_pattern" && i.severity === "error");
    expect(loadIssues.length).toBeGreaterThan(0);
  });

  it("detects poor polarization", () => {
    // All intensity, no easy sessions
    const badWeek = makeWeek(1, [
      { sport: "Course", title: "Intervalles VO2max 5x3min", details: "Z6" },
      { sport: "Course", title: "Seuil 2x20min", details: "Z5" },
      { sport: "Course", title: "Over-under 4x8min", details: "Z5 intervalles" },
      { sport: "Course", title: "VMA 30/30", details: "Z6" },
      { sport: "Course", title: "Fartlek seuil", details: "Z5 intervalles" },
      { sport: "Course", title: "Sprint côtes 10x30s", details: "Z7 force" },
    ]);
    const result = validatePlan(makePlan([badWeek]));

    const polarIssues = result.issues.filter(i => i.rule === "polarization");
    expect(polarIssues.length).toBeGreaterThan(0);
  });

  it("detects missing key sessions", () => {
    // All easy, no key sessions
    const easyWeek = makeWeek(1, [
      { sport: "Course", title: "EF Z2 40min", details: "Facile" },
      { sport: "Course", title: "EF Z2 45min", details: "Facile" },
      { sport: "Course", title: "EF Z2 50min", details: "Facile" },
      { sport: "Course", title: "EF Z2 35min", details: "Facile" },
      { sport: "Course", title: "EF Z2 40min", details: "Facile" },
    ]);
    const result = validatePlan(makePlan([easyWeek]));

    const keyIssues = result.issues.filter(i => i.rule === "key_sessions" && i.severity === "error");
    expect(keyIssues.length).toBeGreaterThan(0);
  });

  it("produces weekMetrics for each week", () => {
    const plan = makePlan([makePolarizedWeek(1), makePolarizedWeek(2)]);
    const result = validatePlan(plan);

    expect(result.weekMetrics).toHaveLength(2);
    expect(result.weekMetrics[0].weekNumber).toBe(1);
    expect(result.weekMetrics[0].activeSessions).toBeGreaterThan(0);
    expect(result.weekMetrics[0].keySessions).toBeGreaterThan(0);
  });

  it("derives limiter keys from weighted gap order and coach override", () => {
    const gaps = [
      { metric: "TTE", weightedImpact: 18, status: "limiting" },
      { metric: "VO2max", weightedImpact: 25, status: "limiting" },
      { metric: "VLamax", weightedImpact: 12, status: "limiting" },
    ];

    expect(deriveLimiterKeysFromGapAnalysis(gaps)).toEqual(["vo2max", "tte", "vlamax"]);
    expect(deriveLimiterKeysFromGapAnalysis(gaps, ["VLamax", "VO2max"])).toEqual(["vlamax", "vo2max", "tte"]);
  });

  it("prioritizes explicit limiter keys over text parsing for limiter coverage", () => {
    const plan = makePlan([
      makeWeek(1, [
        { sport: "Course", title: "VO2max 6x3min", details: "Séance clé 🔑 Z6" },
        { sport: "Course", title: "EF Z2 45min", details: "Facile" },
      ]),
      makeWeek(2, [
        { sport: "Course", title: "VO2max 5x4min", details: "Séance clé 🔑 Z6" },
        { sport: "Course", title: "EF Z2 50min", details: "Facile" },
      ]),
      makeWeek(3, [
        { sport: "Course", title: "VO2max 30/30", details: "Séance clé 🔑 Z6" },
        { sport: "Course", title: "EF Z2 40min", details: "Facile" },
      ]),
    ]);

    const result = validatePlan(plan, undefined, undefined, undefined, ["### Limiteur #1 — TTE"], ["vo2max"]);

    expect(result.limiterCoverage[0]?.key).toBe("vo2max");
    expect(result.limiterCoverage[0]?.pct).toBeGreaterThan(0);
  });

  it("REGRESSION: L1/L2 coverage reaches minimum thresholds with realistic AI sessions", () => {
    // Simulates a plan with VLamax as L1, VO2max as L2 — typical AI-generated text
    const plan = makePlan([
      makeWeek(1, [
        { sport: "Course", title: "EF Z2 60min", details: "Endurance fondamentale 🔑" },
        { sport: "Course", title: "Intervalles Z5 5x4min", details: "Séance clé 🔑 r3min" },
        { sport: "Course", title: "EF Z2 45min", details: "Récupération active" },
        { sport: "Course", title: "Seuil continu 2x15min", details: "Séance clé 🔑 Z4" },
        { sport: "Course", title: "Sortie longue 25km", details: "SL progressive 🔑" },
      ]),
      makeWeek(2, [
        { sport: "Course", title: "EF Z2 70min à jeun", details: "Train low 🔑" },
        { sport: "Course", title: "VMA 30/30 x20", details: "Séance clé 🔑 Z6" },
        { sport: "Course", title: "EF Z2 50min", details: "Endurance fondamentale" },
        { sport: "Course", title: "Intervalles seuil 3x12min", details: "Séance clé 🔑" },
        { sport: "Course", title: "Sortie longue 22km", details: "Endurance longue 🔑" },
      ]),
      makeWeek(3, [
        { sport: "Course", title: "EF Z2 65min", details: "Endurance fondamentale 🔑" },
        { sport: "Course", title: "Intervalles Z5 6x3min", details: "Séance clé 🔑" },
        { sport: "Course", title: "EF Z2 40min", details: "Récupération" },
        { sport: "Course", title: "Tempo soutenu 25min", details: "Séance clé 🔑 Z4" },
        { sport: "Vélo", title: "Z2 90min", details: "Endurance vélo" },
      ]),
    ]);

    const result = validatePlan(plan, undefined, undefined, undefined, undefined, ["vlamax", "vo2max", "tte"]);

    // L1 (vlamax) should have meaningful coverage — train low, EF long, seuil co-contributor
    const l1 = result.limiterCoverage.find(c => c.key === "vlamax");
    expect(l1).toBeDefined();
    expect(l1!.pct).toBeGreaterThanOrEqual(15);

    // L2 (vo2max) should have meaningful coverage — Z5, VMA, 30/30
    const l2 = result.limiterCoverage.find(c => c.key === "vo2max");
    expect(l2).toBeDefined();
    expect(l2!.pct).toBeGreaterThanOrEqual(10);

    // L3 (tte) should have some coverage — seuil sessions
    const l3 = result.limiterCoverage.find(c => c.key === "tte");
    expect(l3).toBeDefined();
    expect(l3!.pct).toBeGreaterThan(0);
  });

  it("REGRESSION: zone-based fallback assigns Z5 sessions to vo2max when L1", () => {
    const plan = makePlan([
      makeWeek(1, [
        { sport: "Course", title: "Intervalles Z5 4x8min", details: "Séance clé 🔑" },
        { sport: "Course", title: "EF Z2 45min", details: "Récup" },
      ]),
      makeWeek(2, [
        { sport: "Course", title: "Fartlek Z5", details: "Séance clé 🔑 intense" },
        { sport: "Course", title: "EF Z2 50min", details: "Récup" },
      ]),
      makeWeek(3, [
        { sport: "Course", title: "Intervalles Z5 5x3min", details: "Séance clé 🔑" },
        { sport: "Course", title: "EF Z2 40min", details: "Récup" },
      ]),
    ]);

    const result = validatePlan(plan, undefined, undefined, undefined, undefined, ["vo2max"]);
    const l1 = result.limiterCoverage.find(c => c.key === "vo2max");
    expect(l1).toBeDefined();
    expect(l1!.pct).toBeGreaterThanOrEqual(30);
  });

  // F-05 — Rule 6 : count ALL catalog IDs per session (multi-ID brick / pyramid)
  it("F-05: counts every catalog ID emitted in a single key session", () => {
    const plan = makePlan(Array.from({ length: 4 }, (_, i) =>
      makeWeek(i + 1, [
        // Brick: 2 IDs concatenated in the same key session
        { sport: "Brick", title: "🔑 BRICK_703_BIKE_RUN — B_BIKE_SST_3x20 + B_RUN_TEMPO_LONG", details: "Séance clé brick" },
        { sport: "Vélo", title: "🔑 V3_BIKE_Z2_ENDURANCE_LONG", details: "Endurance" },
        { sport: "Course", title: "🔑 B_RUN_VO2_30_30", details: "VO2max" },
      ])
    ));
    const result = validatePlan(plan);
    // Without F-05: only first ID counted → uniqueCatalogIds = 3
    // With F-05: brick session yields 2 unique IDs → uniqueCatalogIds ≥ 4
    expect(result.catalogStats.uniqueCatalogIds).toBeGreaterThanOrEqual(4);
  });

  // F-14 — coachLimiterOrder defensively re-sorts identifiedLimiterKeys
  it("F-14: coachLimiterOrder reorders L1/L2 for limiter coherence scoring", () => {
    // Plan with 4× VO2 sessions and 1× seuil session — naturally favors vo2max as L1
    const plan = makePlan(Array.from({ length: 4 }, (_, i) =>
      makeWeek(i + 1, [
        { sport: "Course", title: "🔑 Intervalles VO2 5x3min Z5", details: "VO2max" },
        { sport: "Course", title: "🔑 Seuil 2x20min", details: "Seuil TTE" },
        { sport: "Course", title: "EF Z2 50min", details: "Récup" },
      ])
    ));

    // Pass keys in "wrong" order (vo2max first) but coach overrides → tte should rank first
    const result = validatePlan(
      plan,
      undefined,
      undefined,
      undefined,
      undefined,
      ["vo2max", "tte"],            // naive order
      undefined,
      ["TTE", "VO2max"]             // coach override (metric names)
    );
    // After defensive re-sort, "tte" must be ranked L1 (first in coverage array)
    expect(result.limiterCoverage[0]?.key).toBe("tte");
    expect(result.limiterCoverage[1]?.key).toBe("vo2max");
  });
});
