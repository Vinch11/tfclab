import { describe, it, expect } from "vitest";
import { deriveLimiterKeysFromGapAnalysis, validatePlan, PLAN_VALIDATION_WEIGHTS, type PlanValidationResult } from "../planValidator";
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
    // Conforme à la RÈGLE #0 (titre H1) pour ne pas faire trébucher les tests
    // qui ne portent pas sur ce point — les tests dédiés au titre (describe
    // "#18 lot 1" plus bas) écrasent ce champ explicitement.
    title: "Plan TFCL™ — Marathon Test Athlete — 8 semaines",
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

  // Batch 2 — exemption Finisher/Start to Run de la règle 1 (≥1 A/B par semaine) :
  // la Grille Volume/Intensité par Ambition (systemPrompt.ts) prescrit 1-2
  // séances clés/semaine pour Finisher et 0 pour Start to Run — une semaine
  // tout-Z2 y est conforme à la doctrine, pas une violation.
  it("Batch 2: n'émet pas d'erreur lorang_categories pour une semaine tout-Z2 en ambition Finisher", () => {
    const plan = makePlan([
      makeWeek(1, [
        { sport: "Course", title: "EF Z2 50min", details: "Endurance" },
        { sport: "Course", title: "EF Z2 60min", details: "Endurance" },
        { sport: "Vélo", title: "Z2 90min", details: "Endurance" },
        { sport: "Course", title: "Sortie longue 20km Z2", details: "Long run" },
      ], "Chantier"),
    ]);
    const result = validatePlan(
      plan, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      "finisher"
    );
    const errs = result.issues.filter(i => i.rule === "lorang_categories" && i.severity === "error");
    expect(errs.length).toBe(0);
  });

  it("Batch 2: n'émet pas d'erreur lorang_categories pour une semaine tout-Z2 en objectif Start to Run", () => {
    const plan = makePlan([
      makeWeek(1, [
        { sport: "Course", title: "EF Z2 50min", details: "Endurance" },
        { sport: "Course", title: "EF Z2 60min", details: "Endurance" },
        { sport: "Vélo", title: "Z2 90min", details: "Endurance" },
        { sport: "Course", title: "Sortie longue 20km Z2", details: "Long run" },
      ], "Adaptation"),
    ]);
    const result = validatePlan(plan, "StartToRun");
    const errs = result.issues.filter(i => i.rule === "lorang_categories" && i.severity === "error");
    expect(errs.length).toBe(0);
  });

  // Batch 3 — validateKeySessions manquait la même exemption Finisher/Start
  // to Run que sa règle sœur lorang_categories (Batch 2, ci-dessus) : un plan
  // Start to Run conforme à sa propre doctrine "0 séance clé/semaine" se
  // faisait pénaliser en erreur key_sessions chaque semaine.
  it("Batch 3: n'émet pas d'erreur key_sessions pour une semaine sans séance clé en ambition Finisher", () => {
    // Aucun titre ne doit matcher KEY_SESSION_PATTERNS, sinon le test ne
    // discrimine pas (ex. "sortie longue" compte déjà comme séance clé).
    const plan = makePlan([
      makeWeek(1, [
        { sport: "Course", title: "Footing tranquille 40min", details: "Facile" },
        { sport: "Vélo", title: "Vélo cool 60min", details: "Facile" },
        { sport: "Natation", title: "Natation détente 30min", details: "Facile" },
        { sport: "Course", title: "Marche active 50min", details: "Facile" },
      ], "Chantier"),
    ]);
    const result = validatePlan(
      plan, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      "finisher"
    );
    const errs = result.issues.filter(i => i.rule === "key_sessions" && i.severity === "error");
    expect(errs.length).toBe(0);
  });

  it("Batch 3: n'émet pas d'erreur key_sessions pour une semaine sans séance clé en objectif Start to Run", () => {
    const plan = makePlan([
      makeWeek(1, [
        { sport: "Course", title: "Footing tranquille 40min", details: "Facile" },
        { sport: "Vélo", title: "Vélo cool 60min", details: "Facile" },
        { sport: "Natation", title: "Natation détente 30min", details: "Facile" },
        { sport: "Course", title: "Marche active 50min", details: "Facile" },
      ], "Adaptation"),
    ]);
    const result = validatePlan(plan, "StartToRun");
    const errs = result.issues.filter(i => i.rule === "key_sessions" && i.severity === "error");
    expect(errs.length).toBe(0);
  });

  it("Batch 3: garde l'erreur key_sessions pour une semaine sans séance clé en ambition Age Group (non-exemptée)", () => {
    // Aucun titre ne doit matcher KEY_SESSION_PATTERNS (donc pas "sortie
    // longue"/"z2 long"/etc., qui compteraient comme séance clé à eux seuls).
    const plan = makePlan([
      makeWeek(1, [
        { sport: "Course", title: "Footing tranquille 40min", details: "Facile" },
        { sport: "Vélo", title: "Vélo cool 60min", details: "Facile" },
        { sport: "Natation", title: "Natation détente 30min", details: "Facile" },
        { sport: "Course", title: "Marche active 50min", details: "Facile" },
      ], "Chantier"),
    ]);
    const result = validatePlan(
      plan, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      "age_group"
    );
    const errs = result.issues.filter(i => i.rule === "key_sessions" && i.severity === "error");
    expect(errs.length).toBeGreaterThan(0);
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

  // #18 lot 2 : 4 règles conditionnelles (objectif/ambition spécifiques) sans
  // contrôle post-génération jusqu'ici. Composition séances clés trail
  // délibérément différée (cf. commentaire dans planValidator.ts).
  describe("#18 lot 2 — règles trail / Start-to-Run / plancher séances-jour Elite+", () => {
    it("flague une semaine Start to Run sans 2 séances Renforcement fondation", () => {
      // Plan à 2 semaines pour que S1 ne soit pas la "dernière semaine" (seuil
      // allégé à 1 séance) — le seuil normal de 2 doit s'appliquer ici.
      const weeks = [
        makeWeek(1, [
          { sport: "Course", title: "Footing découverte", details: "20min" },
          { sport: "Renfo", title: "Renforcement fondation", details: "" },
        ]),
        makeWeek(2, [
          { sport: "Course", title: "Footing découverte", details: "20min" },
          { sport: "Renfo", title: "Renforcement fondation", details: "" },
        ]),
      ];
      const result = validatePlan(makePlan(weeks), "Start to Run");
      const issue = result.issues.find(i => i.rule === "start_to_run_strength" && i.severity === "error" && i.week === 1);
      expect(issue).toBeDefined();
    });

    it("ne flague pas une semaine Start to Run avec 2 séances Renforcement fondation", () => {
      const weeks = [
        makeWeek(1, [
          { sport: "Course", title: "Footing découverte", details: "20min" },
          { sport: "Renfo", title: "Renforcement fondation", details: "" },
          { sport: "Renfo", title: "Renforcement fondation", details: "" },
        ]),
        makeWeek(2, [
          { sport: "Course", title: "Footing découverte", details: "20min" },
          { sport: "Renfo", title: "Renforcement fondation", details: "" },
          { sport: "Renfo", title: "Renforcement fondation", details: "" },
        ]),
      ];
      const result = validatePlan(makePlan(weeks), "Start to Run");
      expect(result.issues.filter(i => i.rule === "start_to_run_strength")).toHaveLength(0);
    });

    it("tolère 1 seule séance Renforcement fondation sur la DERNIÈRE semaine du plan Start to Run", () => {
      const weeks = [
        makeWeek(1, [
          { sport: "Course", title: "Footing", details: "" },
          { sport: "Renfo", title: "Renforcement fondation", details: "" },
          { sport: "Renfo", title: "Renforcement fondation", details: "" },
        ]),
        makeWeek(2, [
          { sport: "Course", title: "Footing", details: "" },
          { sport: "Renfo", title: "Renforcement fondation", details: "" },
        ]),
      ];
      const result = validatePlan(makePlan(weeks), "Start to Run");
      const week2Issue = result.issues.find(i => i.rule === "start_to_run_strength" && i.week === 2);
      expect(week2Issue).toBeUndefined();
    });

    it("ne vérifie pas le renfo hebdomadaire pour un objectif autre que Start to Run", () => {
      const week = makeWeek(1, [{ sport: "Course", title: "Footing", details: "" }]);
      const result = validatePlan(makePlan([week]), "Marathon");
      expect(result.issues.filter(i => i.rule === "start_to_run_strength")).toHaveLength(0);
    });

    it("flague l'absence de week-end back-to-back sur le bloc spécifique Trail Montagne", () => {
      const week = makeWeek(1, [
        { sport: "Course", title: "Seuil montée", details: "D+800m", dayIndex: 1 },
        { sport: "Course", title: "SL D+", details: "D+1200m", dayIndex: 5 }, // Samedi seul
        { sport: "Repos", title: "Repos", details: "", isRest: true, dayIndex: 6 },
      ], "Chantier", "Chantier");
      const result = validatePlan(makePlan([week]), "Trail Montagne");
      const issue = result.issues.find(i => i.rule === "trail_back_to_back");
      expect(issue).toBeDefined();
    });

    it("ne flague pas quand un week-end Samedi+Dimanche actif existe sur le bloc spécifique", () => {
      const week = makeWeek(1, [
        { sport: "Course", title: "Seuil montée", details: "D+800m", dayIndex: 1 },
        { sport: "Course", title: "SL D+", details: "D+1200m", dayIndex: 5 },
        { sport: "Course", title: "Technique descente", details: "D+600m", dayIndex: 6 },
      ], "Chantier", "Chantier");
      const result = validatePlan(makePlan([week]), "Trail Montagne");
      expect(result.issues.filter(i => i.rule === "trail_back_to_back")).toHaveLength(0);
    });

    it("flague un déficit de D+ chiffré sur les séances CAP pour un objectif trail", () => {
      const week = makeWeek(1, [
        { sport: "Course", title: "Seuil montée", details: "45min, sans dénivelé précisé" },
        { sport: "Course", title: "SL", details: "2h" },
        { sport: "Course", title: "Technique descente", details: "30min" },
      ]);
      const result = validatePlan(makePlan([week]), "Trail Ultra");
      const issue = result.issues.find(i => i.rule === "trail_dplus_presence");
      expect(issue).toBeDefined();
    });

    it("ne flague pas quand les séances CAP mentionnent systématiquement le D+", () => {
      const week = makeWeek(1, [
        { sport: "Course", title: "Seuil montée", details: "D+800m" },
        { sport: "Course", title: "SL D+ massive", details: "D+2500m" },
        { sport: "Course", title: "Technique descente", details: "dénivelé -600m" },
      ]);
      const result = validatePlan(makePlan([week]), "Trail Ultra");
      expect(result.issues.filter(i => i.rule === "trail_dplus_presence")).toHaveLength(0);
    });

    it("flague un jour à 1 séance pour IM ambition elite (ERREUR GRAVE)", () => {
      const week = makeWeek(1, [
        { sport: "Natation", title: "Nat technique", details: "", dayIndex: 1 },
        { sport: "Vélo", title: "Vélo Z2", details: "", dayIndex: 1 },
        { sport: "Course", title: "Footing seul", details: "", dayIndex: 2 }, // 1 seule séance ce jour
      ], "Chantier", "Chantier");
      const result = validatePlan(makePlan([week]), "IM", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, "elite");
      const issue = result.issues.find(i => i.rule === "daily_session_floor" && i.severity === "error");
      expect(issue).toBeDefined();
    });

    it("ne flague pas quand chaque jour actif a ≥2 séances pour IM ambition world_class", () => {
      const week = makeWeek(1, [
        { sport: "Natation", title: "Nat technique", details: "", dayIndex: 1 },
        { sport: "Vélo", title: "Vélo Z2", details: "", dayIndex: 1 },
        { sport: "Course", title: "Footing", details: "", dayIndex: 2 },
        { sport: "Renfo", title: "Renfo", details: "", dayIndex: 2 },
        { sport: "Repos", title: "Repos", details: "", isRest: true, dayIndex: 3 },
      ], "Chantier", "Chantier");
      const result = validatePlan(makePlan([week]), "IM", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, "world_class");
      expect(result.issues.filter(i => i.rule === "daily_session_floor")).toHaveLength(0);
    });

    it("ne vérifie pas le plancher séances/jour pour une ambition age_group (règle non applicable)", () => {
      const week = makeWeek(1, [
        { sport: "Course", title: "Footing seul", details: "", dayIndex: 2 },
      ], "Chantier", "Chantier");
      const result = validatePlan(makePlan([week]), "IM", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, "age_group");
      expect(result.issues.filter(i => i.rule === "daily_session_floor")).toHaveLength(0);
    });

    it("ne vérifie pas le plancher séances/jour pour un objectif hors IM/70.3", () => {
      const week = makeWeek(1, [
        { sport: "Course", title: "Footing seul", details: "", dayIndex: 2 },
      ], "Chantier", "Chantier");
      const result = validatePlan(makePlan([week]), "Marathon", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, "elite");
      expect(result.issues.filter(i => i.rule === "daily_session_floor")).toHaveLength(0);
    });
  });

  // #18 lot 1 : 10 règles INVIOLABLE/OBLIGATOIRE de systemPrompt.ts n'avaient
  // aucun contrôle post-génération correspondant. Ces 4 tests couvrent les
  // règles vérifiables sans paramètre supplémentaire.
  describe("#18 lot 1 — règles INVIOLABLE/OBLIGATOIRE sans contrôle jusqu'ici", () => {
    it("accepte un titre H1 conforme à la RÈGLE #0", () => {
      const plan = makePlan([makeWeek(1, [{ sport: "Course", title: "EF Z2", details: "45min" }])]);
      plan.title = "Plan TFCL™ — 70.3 LCW Cath — 11 semaines";
      const result = validatePlan(plan);
      expect(result.issues.filter(i => i.rule === "title_format")).toHaveLength(0);
    });

    it("flague un titre H1 sans nom d'athlète (exemple INTERDIT explicite du prompt)", () => {
      const plan = makePlan([makeWeek(1, [{ sport: "Course", title: "EF Z2", details: "45min" }])]);
      plan.title = "Plan TFCL™ — 70.3 — 12 semaines";
      const result = validatePlan(plan);
      const titleIssue = result.issues.find(i => i.rule === "title_format" && i.severity === "error");
      expect(titleIssue).toBeDefined();
    });

    it("flague un titre H1 réduit à un slogan (préfixe/suffixe du gabarit absents)", () => {
      const plan = makePlan([makeWeek(1, [{ sport: "Course", title: "EF Z2", details: "45min" }])]);
      plan.title = "Structure Qualifiable";
      const result = validatePlan(plan);
      const titleIssue = result.issues.find(i => i.rule === "title_format" && i.severity === "error");
      expect(titleIssue).toBeDefined();
    });

    it("flague un Bloc N dupliqué (signe de deux tables collées)", () => {
      const plan = makePlan([
        makeWeek(1, [{ sport: "Course", title: "Chantier", details: "" }], "Chantier", "Chantier"),
      ]);
      plan.phases = [
        { name: "Bloc 1 : Fondation", weeks: "1-2" },
        { name: "Bloc 2 : Chantier VLamax", weeks: "3-6" },
        { name: "Bloc 4 : Consolidation", weeks: "7-9" },
        { name: "Bloc 4 : Race-Specific", weeks: "10-12" },
      ];
      const result = validatePlan(plan);
      const dupIssue = result.issues.find(i => i.rule === "strategic_recap" && i.severity === "error");
      expect(dupIssue).toBeDefined();
      expect(dupIssue?.message).toContain("Bloc 4");
    });

    it("flague une numérotation de récap stratégique qui redémarre à 1", () => {
      const plan = makePlan([
        makeWeek(1, [{ sport: "Course", title: "Chantier", details: "" }], "Chantier", "Chantier"),
      ]);
      plan.strategicRecap = {
        limiters: [
          { rank: 1, name: "VLamax haute", status: "🔴", block: "Chantier VLamax↓", weeks: "S1-S4", keySessions: "Z2 long" },
          { rank: 2, name: "TTE faible", status: "🟡", block: "Consolidation TTE↑", weeks: "S5-S8", keySessions: "Seuil" },
          { rank: 1, name: "Économie", status: "🟢", block: "Chantier Économie", weeks: "S9-S12", keySessions: "SFR" },
        ],
        synergies: [],
      };
      const result = validatePlan(plan);
      const recapIssue = result.issues.find(i => i.rule === "strategic_recap" && i.severity === "warning");
      expect(recapIssue).toBeDefined();
    });

    it("ne flague pas un récap stratégique correctement numéroté", () => {
      const plan = makePlan([
        makeWeek(1, [{ sport: "Course", title: "Chantier", details: "" }], "Chantier", "Chantier"),
      ]);
      plan.strategicRecap = {
        limiters: [
          { rank: 1, name: "VLamax haute", status: "🔴", block: "Chantier VLamax↓", weeks: "S1-S4", keySessions: "Z2 long" },
          { rank: 2, name: "TTE faible", status: "🟡", block: "Consolidation TTE↑", weeks: "S5-S8", keySessions: "Seuil" },
        ],
        synergies: [],
      };
      const result = validatePlan(plan);
      expect(result.issues.filter(i => i.rule === "strategic_recap")).toHaveLength(0);
    });

    it("flague un jour \"Repos\" qui contient en réalité de la récupération active", () => {
      const week = makeWeek(1, [
        { sport: "Course", title: "EF Z2 45min", details: "Endurance" },
        { sport: "Course", title: "EF Z2 50min", details: "Endurance" },
        { sport: "Course", title: "Seuil 2x20min", details: "Séance clé 🔑" },
        { sport: "Vélo", title: "Récupération active", details: "Vélo Z1 30min", isRest: true },
      ]);
      const result = validatePlan(makePlan([week]));
      const restIssue = result.issues.find(i => i.rule === "rest_day_coherence" && /contenu actif/i.test(i.message));
      expect(restIssue).toBeDefined();
    });

    it("flague une semaine sans aucun jour de repos complet réel", () => {
      const week = makeWeek(1, [
        { sport: "Course", title: "EF Z2 45min", details: "Endurance" },
        { sport: "Course", title: "EF Z2 50min", details: "Endurance" },
        { sport: "Course", title: "Seuil 2x20min", details: "Séance clé 🔑" },
        { sport: "Course", title: "EF Z2 40min", details: "Endurance" },
      ]);
      const result = validatePlan(makePlan([week]));
      const restIssue = result.issues.find(i => i.rule === "rest_day_coherence" && /sans aucun jour repos complet/i.test(i.message));
      expect(restIssue).toBeDefined();
    });

    it("n'flague pas un jour \"Repos\" réellement complet", () => {
      const week = makeWeek(1, [
        { sport: "Course", title: "EF Z2 45min", details: "Endurance" },
        { sport: "Course", title: "EF Z2 50min", details: "Endurance" },
        { sport: "Course", title: "Seuil 2x20min", details: "Séance clé 🔑" },
        { sport: "Repos", title: "Repos complet", details: "", isRest: true },
      ]);
      const result = validatePlan(makePlan([week]));
      expect(result.issues.filter(i => i.rule === "rest_day_coherence")).toHaveLength(0);
    });

    it("flague une séance identique au même jour 2 semaines consécutives (Règle #1 Anti-Répétition)", () => {
      const sameSession = { sport: "Course", title: "Seuil 2x20min", details: "Z5 seuil" };
      const weeks = [
        makeWeek(1, [sameSession, { sport: "Course", title: "EF Z2 45min", details: "" }], "Chantier", "Chantier"),
        makeWeek(2, [sameSession, { sport: "Course", title: "EF Z2 50min", details: "" }], "Chantier", "Chantier"),
      ];
      const result = validatePlan(makePlan(weeks));
      const repetitionIssue = result.issues.find(i => i.rule === "anti_repetition");
      expect(repetitionIssue).toBeDefined();
    });

    it("ne flague pas une progression de séance (durée/format variés) d'une semaine à l'autre", () => {
      const weeks = [
        makeWeek(1, [{ sport: "Course", title: "Seuil 2x15min", details: "Z5 seuil" }], "Chantier", "Chantier"),
        makeWeek(2, [{ sport: "Course", title: "Seuil 2x20min", details: "Z5 seuil" }], "Chantier", "Chantier"),
      ];
      const result = validatePlan(makePlan(weeks));
      expect(result.issues.filter(i => i.rule === "anti_repetition")).toHaveLength(0);
    });

    it("n'flague pas un rappel identique en semaine de décharge/course (répétition attendue)", () => {
      const sameSession = { sport: "Course", title: "Rappel allure course", details: "Séance courte" };
      const weeks = [
        makeWeek(1, [sameSession], "Chantier", "Chantier"),
        makeWeek(2, [sameSession], "Taper", "taper"),
      ];
      const result = validatePlan(makePlan(weeks));
      expect(result.issues.filter(i => i.rule === "anti_repetition")).toHaveLength(0);
    });

    it("la somme des poids du score pondéré reste 1.00 (garde-fou anti-drift)", () => {
      // Rééquilibrage #18 lot 1 : 4 nouveaux poids financés par de petites
      // retenues sur 10 poids existants — la somme totale ne doit pas avoir
      // dérivé (sinon un plan "parfait" scorerait autre chose que 100/100).
      const total = Object.values(PLAN_VALIDATION_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1.0, 5);
    });
  });

  // Audit méthodologique — Niveau 2 : le prompt donne un exemple few-shot
  // complet (méthode norvégienne double-seuil) qui, suivi à la lettre par
  // l'IA, viole mécaniquement la règle 80/20 telle qu'appliquée par Rule 1 —
  // le prompt et le validateur se contredisaient sur ces semaines précises.
  describe("Niveau 2 — exception bloc seuil concentré (norvégien/sweet spot)", () => {
    function norwegianDoubleThresholdWeek(weekNumber: number): ParsedWeek {
      return makeWeek(weekNumber, [
        { sport: "Course", title: "🔑 Double Seuil #1 — Bas", details: "5x6min seuil bas 30min" },
        { sport: "Course", title: "🔑 Double Seuil #1 — Haut", details: "8x1000m seuil haut 25min" },
        { sport: "Course", title: "EF récupération", details: "40min Z1 récupération" },
        { sport: "Course", title: "🔑 Double Seuil #2 — Bas", details: "4x2000m seuil bas 27min" },
        { sport: "Course", title: "🔑 Double Seuil #2 — Haut", details: "6x1200m seuil haut 23min" },
        { sport: "Repos", title: "Repos", details: "", isRest: true },
      ], "Chantier TTE↑ — Norvégienne", "Chantier");
    }

    it("exempte une semaine explicitement nommée bloc norvégien de Rule 1 (polarisation)", () => {
      const plan = makePlan([norwegianDoubleThresholdWeek(1), norwegianDoubleThresholdWeek(2)]);
      const result = validatePlan(plan);
      const polarizationIssues = result.issues.filter(i => i.rule === "polarization" && i.week === 1);
      expect(polarizationIssues).toHaveLength(0);
    });

    it("continue de flaguer la même distribution si la semaine n'est pas nommée comme un bloc seuil", () => {
      const week = makeWeek(1, [
        { sport: "Course", title: "Seuil #1 — Bas", details: "5x6min seuil bas 30min" },
        { sport: "Course", title: "Seuil #1 — Haut", details: "8x1000m seuil haut 25min" },
        { sport: "Course", title: "EF récupération", details: "40min Z1 récupération" },
        { sport: "Course", title: "Seuil #2 — Bas", details: "4x2000m seuil bas 27min" },
        { sport: "Course", title: "Seuil #2 — Haut", details: "6x1200m seuil haut 23min" },
        { sport: "Repos", title: "Repos", details: "", isRest: true },
      ], "Chantier seuil", "Chantier");
      const result = validatePlan(makePlan([week, week]));
      const polarizationIssues = result.issues.filter(i => i.rule === "polarization" && i.week === 1);
      expect(polarizationIssues.length).toBeGreaterThan(0);
    });
  });

  // Audit méthodologique — Niveau 2 : Issurin (Block Periodization) prévoit un
  // nouveau bloc concentré par limiteur — un plan à 2 limiteurs enchaîne donc
  // légitimement Chantier→Consolidation→Chantier(#2)→Consolidation(#2). Le
  // validateur bannissait jusqu'ici tout recul d'indice de phase, sans
  // distinguer ce cycle voulu d'une vraie régression.
  describe("Niveau 2 — cycle Chantier↔Consolidation toléré (Issurin)", () => {
    function phaseWeek(weekNumber: number, phase: string): ParsedWeek {
      return makeWeek(weekNumber, [
        { sport: "Course", title: "Seuil 2x20min", details: "Séance clé 🔑" },
        { sport: "Course", title: "EF Z2 45min", details: "Endurance" },
        { sport: "Course", title: "EF Z2 50min", details: "Endurance" },
      ], phase, phase);
    }

    it("ne flague pas un second cycle Chantier→Consolidation pour un second limiteur", () => {
      const weeks = [
        phaseWeek(1, "Chantier"),
        phaseWeek(2, "Consolidation"),
        phaseWeek(3, "Chantier 2"),
        phaseWeek(4, "Consolidation"),
        phaseWeek(5, "Race-Specific"),
      ];
      const result = validatePlan(makePlan(weeks));
      const regressionIssues = result.issues.filter(
        i => i.rule === "phase_coherence" && /Régression de phase/i.test(i.message)
      );
      expect(regressionIssues).toHaveLength(0);
    });

    it("flague toujours un vrai retour à Fondation après le Chantier", () => {
      const weeks = [
        phaseWeek(1, "Chantier"),
        phaseWeek(2, "Consolidation"),
        phaseWeek(3, "Fondation"),
      ];
      const result = validatePlan(makePlan(weeks));
      const regressionIssues = result.issues.filter(
        i => i.rule === "phase_coherence" && /Régression de phase/i.test(i.message)
      );
      expect(regressionIssues.length).toBeGreaterThan(0);
    });

    it("flague toujours un recul depuis Race-Specific vers Chantier", () => {
      const weeks = [
        phaseWeek(1, "Chantier"),
        phaseWeek(2, "Race-Specific"),
        phaseWeek(3, "Chantier 2"),
      ];
      const result = validatePlan(makePlan(weeks));
      const regressionIssues = result.issues.filter(
        i => i.rule === "phase_coherence" && /Régression de phase/i.test(i.message)
      );
      expect(regressionIssues.length).toBeGreaterThan(0);
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
      const result = validatePlan(makePlan(weeks), "Trail Ultra");
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
      const result = validatePlan(makePlan(weeks), "Trail Ultra");
      const regressionIssues = result.issues.filter(
        i => i.rule === "phase_coherence" && /Régression de phase/i.test(i.message)
      );
      expect(regressionIssues.length).toBeGreaterThan(0);
    });

    it("flague une phase Peak trop longue pour la fenêtre compressée (1-2 sem, objectif Trail Ultra ≤6 sem)", () => {
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
      const result = validatePlan(plan, "Trail Ultra");
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
      const result = validatePlan(makePlan(weeks), "Trail Ultra");
      const contentIssue = result.issues.find(
        i => i.rule === "phase_coherence" && /inadapté en phase "Peak"/i.test(i.message)
      );
      expect(contentIssue).toBeDefined();
    });

    it("N'applique PAS la signature compressée au 'peak' JSON standard (Race-Specific normal, tout autre objectif)", () => {
      // Audit — régression corrigée : "peak" est la valeur JSON UNIVERSELLE
      // pour Race-Specific (cf. jsonPlanHandler.ts resolvePhaseCatalog), pas
      // seulement le segment compressé Ultra-Trail. Un plan IM avec du
      // contenu race-pace/simulation légitime en phase "peak" ne doit PAS
      // être flagué comme "inadapté" — l'ancienne clé PHASE_ORDER["peak"]=3.5
      // interceptait à tort ce cas pour TOUS les objectifs.
      const weeks = [
        makeWeek(1, [{ sport: "Course", title: "Force max", details: "Fondation" }], "Fondation", "Fondation"),
        makeWeek(2, [
          { sport: "Course", title: "Simulation Ironman", details: "Race-pace + gut training" },
          { sport: "Vélo", title: "Allure course", details: "Simulation bike leg" },
        ], "Peak", "Peak"),
      ];
      const result = validatePlan(makePlan(weeks), "IM");
      const contentIssue = result.issues.find(
        i => i.rule === "phase_coherence" && /inadapté en phase "Peak"/i.test(i.message)
      );
      expect(contentIssue).toBeUndefined();
    });
  });

  // Audit — chemin JSON (défaut prod) : `phase` ∈ {"base","build","peak","taper"}
  // (planSchema.ts), pas les 5 noms français. "base" ne matchait aucune clé
  // PHASE_ORDER, donc le contrôle de contenu Fondation ne s'exécutait jamais
  // sur ce chemin.
  describe("Audit — vocabulaire JSON des phases (base/build/peak/taper)", () => {
    it("ne flague pas de régression pour la séquence JSON base→build→peak→taper", () => {
      const weeks = [
        makeWeek(1, [{ sport: "Course", title: "Force max", details: "" }], "Fondation", "base"),
        makeWeek(2, [{ sport: "Course", title: "Chantier seuil", details: "" }], "Chantier", "build"),
        makeWeek(3, [{ sport: "Course", title: "Simulation course", details: "race-pace" }], "Race-Specific", "peak"),
        makeWeek(4, [{ sport: "Course", title: "Rappel activation", details: "" }], "Affûtage", "taper"),
      ];
      const result = validatePlan(makePlan(weeks));
      const regressionIssues = result.issues.filter(
        i => i.rule === "phase_coherence" && /Régression de phase/i.test(i.message)
      );
      expect(regressionIssues).toHaveLength(0);
    });

    it("applique désormais le contrôle de contenu Fondation à la valeur JSON \"base\" (avant : silencieusement sauté)", () => {
      const weeks = [
        makeWeek(1, [
          { sport: "Course", title: "Simulation Ironman", details: "Race-pace + gut training" },
        ], "Fondation", "base"),
        makeWeek(2, [{ sport: "Course", title: "Chantier seuil", details: "" }], "Chantier", "build"),
      ];
      const result = validatePlan(makePlan(weeks));
      const contentIssue = result.issues.find(
        i => i.rule === "phase_coherence" && /inadapté en phase "base"/i.test(i.message)
      );
      expect(contentIssue).toBeDefined();
    });

    it("\"build\" (Chantier ET Consolidation collapsées en JSON) accepte le contenu des deux sans flaguer à tort", () => {
      const week = makeWeek(1, [
        { sport: "Course", title: "Rappel maintien", details: "Consolidation allure course, durabilité" },
      ], "Consolidation", "build");
      const result = validatePlan(makePlan([week, week]));
      const contentIssue = result.issues.find(
        i => i.rule === "phase_coherence" && /inadapté en phase "build"/i.test(i.message)
      );
      expect(contentIssue).toBeUndefined();
    });

    it("Audit #3 — flague désormais un contenu VO2max/VMA/fractionné/seuil placé en semaine d'affûtage", () => {
      // Avant le fix, le motif interdit de la phase Affûtage/Taper
      // (PHASE_SESSION_SIGNATURES[5].forbidden) ne contenait aucun mot-clé
      // VO2max/VMA/fractionné/seuil — exactement le type de contenu qui n'a
      // rien à faire à quelques jours de la course (charge neuro-métabolique
      // trop élevée).
      const weeks = [
        makeWeek(1, [{ sport: "Course", title: "Chantier seuil", details: "" }], "Chantier", "build"),
        makeWeek(2, [
          { sport: "Course", title: "Rappel VMA", details: "3x3min VMA fractionné" },
        ], "Affûtage", "taper"),
      ];
      const result = validatePlan(makePlan(weeks));
      const contentIssue = result.issues.find(
        i => i.rule === "phase_coherence" && /inadapté en phase "taper"/i.test(i.message)
      );
      expect(contentIssue).toBeDefined();
    });

    it("la regex de durée de phase matche désormais le format \"S1-S6\" (préfixe S sur les deux nombres)", () => {
      // Aucun bloc "Phases" explicite ici (une seule entrée n'aurait pas été
      // utilisée, le code exige ≥2 pour préférer l'explicite à la dérivation)
      // — derivePhasesFromWeeks produit justement le format "S{n}-S{n}" via
      // le champ `phase`, le même format que l'exemple JSON du prompt
      // (systemPromptJSON.ts). Avant le fix, ce format n'était jamais parsé
      // par la regex de durée, quel que soit le chemin (dérivé ou JSON).
      const weeks = [
        // Semaine Fondation isolée pour garantir ≥2 phases distinctes dérivées
        // (sinon phases.length<2 déclenche le repli "structure incertaine" et
        // le contrôle de durée ne s'exécute jamais — un piège séparé, hors
        // scope ici, cf. derivePhasesFromWeeks).
        makeWeek(1, [{ sport: "Course", title: "Force max", details: "" }], "Fondation", "base"),
        makeWeek(2, [{ sport: "Course", title: "Chantier seuil", details: "" }], "Chantier", "build"),
        makeWeek(3, [{ sport: "Course", title: "Chantier seuil", details: "" }], "Chantier", "build"),
        makeWeek(4, [{ sport: "Course", title: "Chantier seuil", details: "" }], "Chantier", "build"),
        makeWeek(5, [{ sport: "Course", title: "Chantier seuil", details: "" }], "Chantier", "build"),
        makeWeek(6, [{ sport: "Course", title: "Chantier seuil", details: "" }], "Chantier", "build"),
        makeWeek(7, [{ sport: "Course", title: "Chantier seuil", details: "" }], "Chantier", "build"),
        makeWeek(8, [{ sport: "Course", title: "Chantier seuil", details: "" }], "Chantier", "build"),
      ];
      const result = validatePlan(makePlan(weeks)); // "build" = 7 sem (S2-S8) > max 6 (PHASE_DURATION_RANGE[2])
      const durationIssue = result.issues.find(
        i => i.rule === "phase_coherence" && /trop longue/i.test(i.message)
      );
      expect(durationIssue).toBeDefined();
    });
  });

  // Audit — RACE_DAY_PATTERNS (remplace l'ancien RACE_PATTERNS trop
  // permissif, qui matchait n'importe quel thème mentionnant l'objectif —
  // "Chantier Marathon", "Ironman Build" — et désexemptait silencieusement
  // anti_repetition/daily_session_floor/session_density sur des semaines
  // normales, pas la vraie semaine de course.
  describe("Audit — exemption 'semaine de course' resserrée (RACE_DAY_PATTERNS)", () => {
    it("un thème mentionnant l'objectif (\"Chantier Marathon\") n'exempte plus anti_repetition à tort", () => {
      const sameSession = { sport: "Course", title: "Seuil 2x20min", details: "Z5 seuil" };
      const weeks = [
        makeWeek(1, [sameSession], "Chantier Marathon", "Chantier"),
        makeWeek(2, [sameSession], "Chantier Marathon", "Chantier"),
      ];
      const result = validatePlan(makePlan(weeks));
      const repetitionIssue = result.issues.find(i => i.rule === "anti_repetition");
      expect(repetitionIssue).toBeDefined();
    });

    it("un thème mentionnant l'objectif (\"Ironman Build\") n'exempte plus daily_session_floor à tort", () => {
      const week = makeWeek(1, [
        { sport: "Course", title: "Footing seul", details: "", dayIndex: 2 },
      ], "Ironman Build", "Chantier");
      const result = validatePlan(makePlan([week]), "IM", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, "elite");
      const issue = result.issues.find(i => i.rule === "daily_session_floor" && i.severity === "error");
      expect(issue).toBeDefined();
    });

    it("la VRAIE semaine de course (marqueur 🏁/\"Jour J\") continue d'exempter anti_repetition", () => {
      const sameSession = { sport: "Course", title: "Rappel allure course", details: "Séance courte" };
      const weeks = [
        makeWeek(1, [sameSession], "Chantier", "Chantier"),
        makeWeek(2, [sameSession, { sport: "Course", title: "🏁 JOUR J", details: "Marathon" }], "Taper", "taper"),
      ];
      const result = validatePlan(makePlan(weeks));
      const repetitionIssue = result.issues.find(i => i.rule === "anti_repetition" && i.week === 2);
      expect(repetitionIssue).toBeUndefined();
    });
  });

  // Audit — strategic_recap : le préfixe "Bloc N" est une convention
  // Markdown legacy, explicitement désactivée en mode JSON
  // (systemPromptJSON.ts) — donc inerte sur le chemin de prod par défaut.
  // Détection complémentaire par nom de phase dupliqué (indépendante du format).
  describe("Audit — strategic_recap : détection de doublon indépendante du format Markdown", () => {
    it("flague un nom de phase dupliqué même sans préfixe \"Bloc N\" (mode JSON)", () => {
      const plan = makePlan([
        makeWeek(1, [{ sport: "Course", title: "Chantier", details: "" }], "Chantier", "build"),
      ]);
      plan.phases = [
        { name: "Fondation", weeks: "S1-S2" },
        { name: "Chantier VLamax", weeks: "S3-S6" },
        { name: "Chantier VLamax", weeks: "S7-S9" },
      ];
      const result = validatePlan(plan);
      const dupIssue = result.issues.find(i => i.rule === "strategic_recap" && i.severity === "error");
      expect(dupIssue).toBeDefined();
      expect(dupIssue?.message).toContain("Chantier VLamax");
    });

    it("ne flague pas des noms de phase tous différents (mode JSON)", () => {
      const plan = makePlan([
        makeWeek(1, [{ sport: "Course", title: "Chantier", details: "" }], "Chantier", "build"),
      ]);
      plan.phases = [
        { name: "Fondation", weeks: "S1-S2" },
        { name: "Chantier VLamax", weeks: "S3-S6" },
        { name: "Consolidation", weeks: "S7-S9" },
      ];
      const result = validatePlan(plan);
      expect(result.issues.filter(i => i.rule === "strategic_recap")).toHaveLength(0);
    });
  });
});

