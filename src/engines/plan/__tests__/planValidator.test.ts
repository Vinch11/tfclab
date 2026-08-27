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

function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[], theme = "Standard", phase = "base"): ParsedWeek {
  return {
    weekNumber,
    theme,
    phase,
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

  it("ne classe pas une séance EF+strides comme 'high' à cause d'une mention de zone dans l'accroche courte", () => {
    // Cas réel observé (audit plan 10K) : "EF + Strides" (Cat A OBLIGATOIRE,
    // séance canoniquement polarisée) faisait basculer S1 à "50% Z1-Z2"
    // (cible ≥75%) uniquement à cause de "Z2→Z5" dans "6x20" accélérations
    // progressives" — un tag de zone sur ~2min de strides greffées sur un
    // run EF de 45min à dominante Z1-Z2.
    const week = makeWeek(1, [
      { sport: "Vélo", title: "Vélo Récupération Z1", details: "45min Z1 <55% FTP" },
      { sport: "Course", title: "EF + Strides", details: "45-60' Z2 fondamental. Dernières 10': 6x20\" accélérations progressives (Z2→Z5) r=1' trot. Neuromusculation dans volume" },
      { sport: "Course", title: "Lydiard Medium Run", details: "50 min en Z1-Z2" },
      { sport: "Course", title: "Volume aérobie Lydiard", details: "40-60 min en Z1-Z2" },
    ]);
    const result = validatePlan(makePlan([week]));
    const polarError = result.issues.find(i => i.rule === "polarization" && i.severity === "error");
    expect(polarError).toBeUndefined();
  });

  it("le garde strides ne masque pas une semaine réellement non polarisée (VMA/seuil avec mention 'accélérations')", () => {
    const week = makeWeek(1, [
      { sport: "Course", title: "VMA piste", details: "20' Z1→Z2 + accélérations progressives en warm-up, puis 6x400m à VMA (100%) fractionné Z6" },
      { sport: "Course", title: "Seuil 2x20min", details: "Z5 seuil" },
      { sport: "Course", title: "Over-under 4x8min", details: "Z5 intervalles" },
      { sport: "Course", title: "Sprint côtes 10x30s", details: "Z7 force" },
    ]);
    const result = validatePlan(makePlan([week]));
    const polarError = result.issues.find(i => i.rule === "polarization" && i.severity === "error");
    expect(polarError).toBeDefined();
  });

  it("pondère la polarisation en minutes par zone plutôt qu'en nombre de séances entières", () => {
    // Séance réaliste "EF + fin de séance appuyée" : ~56min Z2 (low) suivies de
    // ~4min seuil (high). L'ancienne logique classait la séance ENTIÈRE en
    // "high" dès qu'un pattern seuil matchait n'importe où dans le texte —
    // 4 séances comme ça auraient donné 0% low / 100% high sur la semaine,
    // alors qu'en réalité ~93% du temps de la semaine est en Z1-Z2.
    const week = makeWeek(1, [
      { sport: "Course", title: "EF + fin appuyée", details: "56min Z2 fondamental. Puis 4min seuil." },
      { sport: "Course", title: "EF + fin appuyée", details: "50min Z2 fondamental. Puis 5min seuil." },
      { sport: "Course", title: "EF + fin appuyée", details: "55min Z2 fondamental. Puis 4min seuil." },
      { sport: "Vélo", title: "EF + fin appuyée", details: "60min Z2 fondamental. Puis 5min seuil." },
    ]);
    const result = validatePlan(makePlan([week]));

    // L'ancienne logique (session-count) aurait donné lowPct = 0 (4 séances
    // "high") et déclenché une erreur "seulement 0% en Z1-Z2".
    const polarError = result.issues.find(i => i.rule === "polarization" && i.severity === "error");
    expect(polarError).toBeUndefined();
    expect(result.weekMetrics[0].intensityProfile.lowPct).toBeGreaterThanOrEqual(85);
  });

  it("flags a Race-Specific block with no race-pace/simulation session at all", () => {
    const weeks = [
      makeWeek(1, [
        { sport: "Course", title: "Seuil 2x20min", details: "Chantier seuil" },
        { sport: "Course", title: "Norvégienne 2x15min", details: "Chantier VO2max" },
      ], "Chantier", "Chantier"),
      makeWeek(2, [
        { sport: "Course", title: "Seuil 2x20min", details: "Chantier seuil" },
        { sport: "Course", title: "Norvégienne 2x15min", details: "Chantier VO2max" },
      ], "Chantier", "Chantier"),
      makeWeek(3, [
        { sport: "Course", title: "Seuil 2x20min", details: "Rappel seuil" },
        { sport: "Course", title: "Force max 3x4RM", details: "Rappel force" },
      ], "Race-Specific", "Race-Specific"),
      makeWeek(4, [
        { sport: "Course", title: "Seuil 2x20min", details: "Rappel seuil" },
        { sport: "Course", title: "Force max 3x4RM", details: "Rappel force" },
      ], "Race-Specific", "Race-Specific"),
    ];
    const result = validatePlan(makePlan(weeks));
    const raceSpecificIssue = result.issues.find(
      i => i.rule === "phase_coherence" && /sans aucune séance allure course/i.test(i.message)
    );
    expect(raceSpecificIssue).toBeDefined();
    expect(raceSpecificIssue?.severity).toBe("warning");
  });

  it("flags a Race-Specific block that isn't more concentrated in allure course than the Chantier block", () => {
    const weeks = [
      makeWeek(1, [
        { sport: "Course", title: "Allure course 3x2km", details: "Chantier allure course" },
        { sport: "Course", title: "Simulation semi 8km", details: "Chantier simulation" },
      ], "Chantier", "Chantier"),
      makeWeek(2, [
        { sport: "Course", title: "Allure course 3x2km", details: "Chantier allure course" },
        { sport: "Course", title: "Simulation semi 8km", details: "Chantier simulation" },
      ], "Chantier", "Chantier"),
      makeWeek(3, [
        { sport: "Course", title: "Allure course 2x3km", details: "Rappel allure course" },
        { sport: "Course", title: "Force max 3x4RM", details: "Rappel force" },
      ], "Race-Specific", "Race-Specific"),
      makeWeek(4, [
        { sport: "Course", title: "Allure course 2x3km", details: "Rappel allure course" },
        { sport: "Course", title: "Force max 3x4RM", details: "Rappel force" },
      ], "Race-Specific", "Race-Specific"),
    ];
    const result = validatePlan(makePlan(weeks));
    const rampIssue = result.issues.find(
      i => i.rule === "phase_coherence" && /ne concentre pas plus de spécificité/i.test(i.message)
    );
    expect(rampIssue).toBeDefined();
    expect(rampIssue?.severity).toBe("info");
  });

  it("does not flag a Race-Specific block that is more concentrated in allure course than Chantier", () => {
    const weeks = [
      makeWeek(1, [
        { sport: "Course", title: "Seuil 2x20min", details: "Chantier seuil" },
        { sport: "Course", title: "Norvégienne 2x15min", details: "Chantier VO2max" },
      ], "Chantier", "Chantier"),
      makeWeek(2, [
        { sport: "Course", title: "Seuil 2x20min", details: "Chantier seuil" },
        { sport: "Course", title: "Norvégienne 2x15min", details: "Chantier VO2max" },
      ], "Chantier", "Chantier"),
      makeWeek(3, [
        { sport: "Course", title: "Allure course 3x2km", details: "Simulation semi" },
        { sport: "Course", title: "Allure course 2x3km", details: "Simulation semi" },
      ], "Race-Specific", "Race-Specific"),
      makeWeek(4, [
        { sport: "Course", title: "Allure course 3x2km", details: "Simulation semi" },
        { sport: "Course", title: "Allure course 2x3km", details: "Simulation semi" },
      ], "Race-Specific", "Race-Specific"),
    ];
    const result = validatePlan(makePlan(weeks));
    const raceSpecificIssues = result.issues.filter(
      i => i.rule === "phase_coherence" &&
        (/sans aucune séance allure course/i.test(i.message) || /ne concentre pas plus de spécificité/i.test(i.message))
    );
    expect(raceSpecificIssues).toHaveLength(0);
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
    // Audit fix — le message annonçait "1-3" alors que le code (et le
    // prompt) ciblent 2-4 ; 4 formulations différentes existaient pour la
    // même règle avant ce fix.
    expect(keyIssues[0].message).toContain("2-4");
  });

  it("4 séances clés/semaine ne déclenche pas l'avertissement de surcharge (cible 2-4, cohérente avec le prompt)", () => {
    const week = makeWeek(1, [
      { sport: "Course", title: "🔑 Seuil 4x8min", details: "Séance clé" },
      { sport: "Course", title: "🔑 VO2max 5x3min", details: "Séance clé" },
      { sport: "Vélo", title: "🔑 SST 3x20min", details: "Séance clé" },
      { sport: "Course", title: "🔑 Sortie longue", details: "Séance clé" },
      { sport: "Course", title: "EF Z2 30min", details: "Récup" },
    ]);
    const result = validatePlan(makePlan([week]));
    const overloadWarnings = result.issues.filter(i => i.rule === "key_sessions" && i.message.includes("surcharge"));
    expect(overloadWarnings).toHaveLength(0);
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

  // Lot 4 — Lorang A/B/C/D distribution
  it("Lot 4: detects a week without any A or B (HIT/seuil) session as an error", () => {
    const plan = makePlan([
      makeWeek(1, [
        { sport: "Course", title: "EF Z2 50min", details: "Endurance" },
        { sport: "Course", title: "EF Z2 60min", details: "Endurance" },
        { sport: "Vélo", title: "Z2 90min", details: "Endurance" },
        { sport: "Course", title: "Sortie longue 20km Z2", details: "Long run" },
      ], "Chantier VO2max"), // pas de décharge
    ]);
    const result = validatePlan(plan);
    const errs = result.issues.filter(i => i.rule === "lorang_categories" && i.severity === "error");
    expect(errs.length).toBeGreaterThan(0);
    expect(result.lorangCategories.weeks[0].hasHighOrThreshold).toBe(false);
  });

  it("Lot 4: classifies explicit [A]/[B]/[C]/[D] tags and catalog prefixes", () => {
    const plan = makePlan([
      makeWeek(1, [
        { sport: "Course", title: "[A] VO2max 5x3min", details: "Z6" },
        { sport: "Vélo", title: "B_BIKE_SST_3x20", details: "Sweet spot" },
        { sport: "Course", title: "[C] EF Z2 60min", details: "Endurance" },
        { sport: "Course", title: "[D] Récup 30min", details: "Spin facile" },
      ]),
    ]);
    const result = validatePlan(plan);
    const d = result.lorangCategories;
    expect(d.A).toBe(1);
    expect(d.B).toBe(1);
    expect(d.C).toBe(1);
    expect(d.D).toBe(1);
    expect(d.taggedPct).toBeGreaterThanOrEqual(75);
  });

  it("Lot 4: flags plans with excessive A+B intensity vs polarization target", () => {
    const plan = makePlan(Array.from({ length: 4 }, (_, i) =>
      makeWeek(i + 1, [
        { sport: "Course", title: "[A] VMA 30/30", details: "Z6" },
        { sport: "Course", title: "[A] VO2max 5x4min", details: "Z6" },
        { sport: "Course", title: "[B] Seuil 3x12min", details: "Z4" },
        { sport: "Course", title: "[B] SST 4x8min", details: "Sweet spot" },
        { sport: "Course", title: "[C] EF Z2 45min", details: "Endurance" },
      ])
    ));
    const result = validatePlan(plan);
    const warns = result.issues.filter(i => i.rule === "lorang_categories" && i.severity === "warning");
    expect(warns.length).toBeGreaterThan(0);
    expect(result.summary.lorangCategoriesScore).toBeLessThan(90);
  });

  // Audit fix — les seuils hebdo (35% A+B / 55% C) et globaux (30% A+B / 60% C)
  // étaient plus laxistes que ce que le prompt demande (A+B ≤ 25%, C ≥ 75% —
  // POLARIZED TRAINING §3 : 80% Z1-Z2 / 0-5% Z3 / 15-20% Z4-Z5+). Une semaine
  // à 30% A+B / 70% C passait ces deux garde-fous sans le moindre avertissement.
  it("Lot 4: signale (hebdo) une semaine à 30% A+B / 70% C — passait silencieusement l'ancien seuil 35%/55%", () => {
    const plan = makePlan([
      makeWeek(1, [
        { sport: "Course", title: "[A] VMA 30/30", details: "Z6" },
        { sport: "Course", title: "[A] VO2max 5x4min", details: "Z6" },
        { sport: "Course", title: "[B] Seuil 3x12min", details: "Z4" },
        { sport: "Course", title: "[C] EF Z2 45min", details: "Endurance" },
        { sport: "Course", title: "[C] EF Z2 40min", details: "Endurance" },
        { sport: "Course", title: "[C] EF Z2 50min", details: "Endurance" },
        { sport: "Vélo", title: "[C] Z2 90min", details: "Endurance" },
        { sport: "Course", title: "[C] EF Z2 35min", details: "Endurance" },
        { sport: "Course", title: "[C] Sortie longue Z2", details: "Long run" },
        { sport: "Course", title: "[C] EF Z2 30min", details: "Endurance" },
      ], "Chantier"),
    ]);
    const result = validatePlan(plan);
    const hiWarn = result.issues.find(i => i.rule === "lorang_categories" && /A\+B/.test(i.message));
    const cWarn = result.issues.find(i => i.rule === "lorang_categories" && /endurance fondamentale/.test(i.message));
    expect(hiWarn).toBeDefined();
    expect(cWarn).toBeDefined();
  });

  it("Lot 4: signale (global) une distribution à 30% A+B / 70% C sur l'ensemble du plan — passait silencieusement l'ancien seuil 30%/60%", () => {
    // 2 semaines à 2 A+B / 3 C, 2 semaines à 1 A+B / 4 C → 20 actives,
    // 6 A+B (30%) / 14 C (70%) au global.
    const heavyWeek = (n: number) => makeWeek(n, [
      { sport: "Course", title: "[A] VMA 30/30", details: "Z6" },
      { sport: "Course", title: "[B] Seuil 3x12min", details: "Z4" },
      { sport: "Course", title: "[C] EF Z2 45min", details: "Endurance" },
      { sport: "Course", title: "[C] EF Z2 40min", details: "Endurance" },
      { sport: "Vélo", title: "[C] Z2 60min", details: "Endurance" },
    ], "Chantier");
    const lightWeek = (n: number) => makeWeek(n, [
      { sport: "Course", title: "[B] Seuil 3x12min", details: "Z4" },
      { sport: "Course", title: "[C] EF Z2 45min", details: "Endurance" },
      { sport: "Course", title: "[C] EF Z2 40min", details: "Endurance" },
      { sport: "Vélo", title: "[C] Z2 60min", details: "Endurance" },
      { sport: "Course", title: "[C] Sortie longue Z2", details: "Long run" },
    ], "Chantier");
    const plan = makePlan([heavyWeek(1), heavyWeek(2), lightWeek(3), lightWeek(4)]);
    const result = validatePlan(plan);
    expect(result.lorangCategories.totalActive).toBe(20);
    expect(result.lorangCategories.APct + result.lorangCategories.BPct).toBe(30);
    expect(result.lorangCategories.CPct).toBe(70);
    const globalHiWarn = result.issues.find(i => i.rule === "lorang_categories" && /Distribution globale/.test(i.message));
    const globalCWarn = result.issues.find(i => i.rule === "lorang_categories" && /ensemble du plan/.test(i.message));
    expect(globalHiWarn).toBeDefined();
    expect(globalCWarn).toBeDefined();
  });

  describe("injury_risk_compliance", () => {
    function highImpactCapWeek(weekNumber: number, count: number): ParsedWeek {
      const highImpact: Partial<ParsedSession>[] = [
        { sport: "Course", title: "VO2max 5x4min", details: "Z6 haute intensité" },
        { sport: "Course", title: "Fractionné côtes", details: "Répétitions côtes" },
        { sport: "Course", title: "Sortie longue 25km", details: "Endurance longue" },
      ];
      const sessions = [
        ...highImpact.slice(0, count),
        { sport: "Course", title: "EF Z2 40min", details: "Footing récup" },
        { sport: "Repos", title: "Repos", details: "", isRest: true },
      ];
      return makeWeek(weekNumber, sessions);
    }

    it("bloque (error) une semaine avec >2 séances CAP à impact élevé quand le risque run est CRITIQUE", () => {
      const plan = makePlan([highImpactCapWeek(1, 3)]);
      const result = validatePlan(
        plan, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
        { run: { level: "CRITIQUE" } },
      );
      const errors = result.issues.filter(i => i.rule === "injury_risk_compliance" && i.severity === "error");
      expect(errors.length).toBe(1);
      expect(result.summary.injuryRiskComplianceScore).toBeLessThan(100);
    });

    it("ne bloque pas une semaine avec ≤2 séances CAP à impact élevé même en risque CRITIQUE", () => {
      const plan = makePlan([highImpactCapWeek(1, 2)]);
      const result = validatePlan(
        plan, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
        { run: { level: "CRITIQUE" } },
      );
      const errors = result.issues.filter(i => i.rule === "injury_risk_compliance");
      expect(errors.length).toBe(0);
      expect(result.summary.injuryRiskComplianceScore).toBe(100);
    });

    it("ne bloque pas au niveau ÉLEVÉ (avertissement, pas blocage) — seul CRITIQUE bloque", () => {
      const plan = makePlan([highImpactCapWeek(1, 3)]);
      const result = validatePlan(
        plan, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
        { run: { level: "ELEVE" } },
      );
      const errors = result.issues.filter(i => i.rule === "injury_risk_compliance");
      expect(errors.length).toBe(0);
    });

    it("n'ajoute aucun problème quand aucun risque n'est transmis (rétrocompatibilité)", () => {
      const plan = makePlan([highImpactCapWeek(1, 3)]);
      const result = validatePlan(plan);
      const issues = result.issues.filter(i => i.rule === "injury_risk_compliance");
      expect(issues.length).toBe(0);
      expect(result.summary.injuryRiskComplianceScore).toBe(100);
    });
  });

  describe("race_day — minimum de séances Race Week", () => {
    // Audit fix — le garde-fou exigeait 5 séances réelles, le prompt en
    // exigeait 6, et l'exemple few-shot donné à l'IA comme référence
    // (FEWSHOT_RACEWEEK_MARATHON) n'en démontre que 4 (2 rappels/activation +
    // Jour J, le reste en repos) : un plan fidèle à cet exemple était donc
    // rejeté par ce garde-fou. Les deux sont désormais alignés sur 4.

    function raceWeekWith(realSessionsCount: number): ParsedWeek {
      const sessions: Partial<ParsedSession>[] = [];
      for (let i = 0; i < realSessionsCount; i++) {
        sessions.push(
          i === realSessionsCount - 1
            ? { sport: "Course", title: "🏁 COURSE OBJECTIF", details: "Jour J — pacing + nutrition" }
            : { sport: "Course", title: "Rappel allure course", details: "Séance courte" },
        );
      }
      // Complète la semaine à 7 jours avec du repos.
      while (sessions.length < 7) {
        sessions.push({ sport: "Repos", title: "Repos complet", details: "", isRest: true });
      }
      return makeWeek(1, sessions, "Taper", "taper");
    }

    it("reproduit exactement l'exemple few-shot (4 séances réelles, dont Jour J) sans avertissement 'sous-peuplée'", () => {
      const plan = makePlan([raceWeekWith(4)]);
      const result = validatePlan(plan, undefined, undefined, [1]);
      const warnings = result.issues.filter(i => i.rule === "race_day" && i.message.includes("sous-peuplée"));
      expect(warnings).toHaveLength(0);
    });

    it("signale toujours une Race Week en dessous de 4 séances réelles", () => {
      const plan = makePlan([raceWeekWith(3)]);
      const result = validatePlan(plan, undefined, undefined, [1]);
      const warnings = result.issues.filter(i => i.rule === "race_day" && i.message.includes("sous-peuplée"));
      expect(warnings).toHaveLength(1);
    });
  });

  describe("sport_ratio — Sprint/Olympic triathlon (angle mort corrigé)", () => {
    // Audit fix — avant, normalizeObjectiveKey ne reconnaissait pas Sprint/
    // Olympic : SPORT_RATIO_TARGETS ne trouvait jamais de cible pour ces
    // objectifs, donc un plan 100% course sans natation ni vélo passait
    // silencieusement (juste "3 sports présents ?" → faux → score 80, aucun
    // avertissement) au lieu d'être signalé comme un plan mono-sport pour un
    // objectif triathlon.
    function runOnlyWeek(weekNumber: number): ParsedWeek {
      return makeWeek(weekNumber, [
        { sport: "Course", title: "EF Z2 45min", details: "Endurance" },
        { sport: "Course", title: "EF Z2 40min", details: "Endurance" },
        { sport: "Course", title: "Seuil 3x10min", details: "Séance clé 🔑" },
        { sport: "Course", title: "EF Z2 50min", details: "Endurance" },
        { sport: "Course", title: "Sortie longue", details: "SL 🔑" },
      ], "Chantier");
    }

    it("signale un plan 100% course pour un objectif Sprint (natation/vélo absents)", () => {
      const plan = makePlan([runOnlyWeek(1), runOnlyWeek(2), runOnlyWeek(3)]);
      const result = validatePlan(plan, "Triathlon Sprint");
      const ratioIssues = result.issues.filter(i => i.rule === "sport_ratio");
      expect(ratioIssues.length).toBeGreaterThan(0);
      expect(ratioIssues.some(i => i.message.includes("Natation"))).toBe(true);
    });

    it("signale un plan 100% course pour un objectif Olympique (natation/vélo absents)", () => {
      const plan = makePlan([runOnlyWeek(1), runOnlyWeek(2), runOnlyWeek(3)]);
      const result = validatePlan(plan, "Triathlon Olympique");
      const ratioIssues = result.issues.filter(i => i.rule === "sport_ratio");
      expect(ratioIssues.length).toBeGreaterThan(0);
    });
  });

  // Audit méthodologique — phase compressée "Peak" (promptHelpers.ts, garde-fou
  // Ultra-Trail ≤6 sem : "Fondation 2 sem · Build 2 sem · Peak 1 sem · Taper 1
  // sem") ne matchait aucune clé de PHASE_ORDER — getPhaseIndex("Peak") rendait
  // null, donc validatePhaseCoherence ignorait silencieusement cette phase pour
  // l'ordre, la durée ET le contenu, précisément sur le scénario défensif que le
  // prompt identifie comme le plus à risque (taper ultra compressé).
  describe("Phase compressée 'Peak' (Ultra-Trail ≤6 sem)", () => {
    function peakWeek(weekNumber: number, sessions: Partial<ParsedSession>[] = [
      { sport: "Course", title: "EF Z2 volume", details: "Volume D+ progressif, aisance respiratoire" },
      { sport: "Course", title: "SL D+", details: "Sortie longue Z2 dénivelé progressif" },
    ]): ParsedWeek {
      return makeWeek(weekNumber, sessions, "Peak", "Peak");
    }

    it("ne flague pas de régression pour Fondation→Chantier→Peak→Affûtage", () => {
      const weeks = [
        makeWeek(1, [{ sport: "Course", title: "Force max", details: "Fondation" }], "Fondation", "Fondation"),
        makeWeek(2, [{ sport: "Course", title: "Chantier D+", details: "Build" }], "Chantier", "Chantier"),
        peakWeek(3),
        makeWeek(4, [{ sport: "Course", title: "Rappel activation", details: "Taper" }], "Affûtage", "Affûtage"),
      ];
      const result = validatePlan(makePlan(weeks));
      const regressionIssues = result.issues.filter(
        i => i.rule === "phase_coherence" && /Régression de phase/i.test(i.message)
      );
      expect(regressionIssues).toHaveLength(0);
    });

    it("flague toujours une régression réelle depuis Peak vers Chantier", () => {
      const weeks = [
        peakWeek(1),
        makeWeek(2, [{ sport: "Course", title: "Chantier D+", details: "Build" }], "Chantier", "Chantier"),
      ];
      const result = validatePlan(makePlan(weeks));
      const regressionIssues = result.issues.filter(
        i => i.rule === "phase_coherence" && /Régression de phase/i.test(i.message)
      );
      expect(regressionIssues.length).toBeGreaterThan(0);
    });

    it("flague une phase Peak trop longue pour la fenêtre compressée (1-2 sem)", () => {
      const weeks = [
        makeWeek(1, [{ sport: "Course", title: "Force max", details: "Fondation" }], "Fondation", "Fondation"),
        peakWeek(2), peakWeek(3), peakWeek(4), peakWeek(5),
      ];
      // Bloc "Phases" fourni explicitement (format "2-5" parsable par la regex
      // de durée) plutôt que dérivé des semaines ("S2-S5", format que cette
      // regex ne parse pas — limitation préexistante et hors scope ici).
      const plan = makePlan(weeks);
      plan.phases = [
        { name: "Fondation", weeks: "1-1" },
        { name: "Peak", weeks: "2-5" },
      ];
      const result = validatePlan(plan);
      const durationIssue = result.issues.find(
        i => i.rule === "phase_coherence" && /trop longue/i.test(i.message) && /Peak/i.test(i.message)
      );
      expect(durationIssue).toBeDefined();
    });

    it("flague un contenu VMA/seuil dur en phase Peak (interdit par le garde-fou ultra-trail)", () => {
      const weeks = [
        makeWeek(1, [{ sport: "Course", title: "Force max", details: "Fondation" }], "Fondation", "Fondation"),
        peakWeek(2, [
          { sport: "Course", title: "VMA piste", details: "6x400m à VMA fractionné" },
        ]),
      ];
      const result = validatePlan(makePlan(weeks));
      const contentIssue = result.issues.find(
        i => i.rule === "phase_coherence" && /inadapté en phase "Peak"/i.test(i.message)
      );
      expect(contentIssue).toBeDefined();
    });
  });
});

