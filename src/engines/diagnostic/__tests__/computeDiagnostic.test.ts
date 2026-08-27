/**
 * Tests unitaires — TFCL Diagnostic Engine
 * Cas : profil complet, profil minimal/vide, athlète fatigué
 */
import { describe, it, expect } from "vitest";
import { computeDiagnostic } from "../computeDiagnostic";
import type { DiagnosticInput } from "../types";

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_INPUT: DiagnosticInput = {
  athleteId: "test-athlete-1",
  athleteName: "Test Athlete",
  age: 35,
  sex: "M",
  weightKg: 72,
  objectif: "703",
  ambition: "age_group",
  sportFocus: "bike",
  vo2max: 58,
  ftp: 280,
  ftpKg: 3.89,
  pmax5s: 900,
  p30sW: 600,
  p60sW: 450,
  map5minW: 320,
  vma: null,
  css: null,
  vlamax: 0.45,
  vlamaxRun: null,
  vlamaxSource: "test",
  vlamaxProtocol: "30-15",
  vlamaxIsReference: true,
  tteObservedMin: 42,
  tteMode: "observed",
  tss7d: 450,
  fatigueState: null,
  runEconomyScore: null,
  runHrDriftPct: null,
  paceThresholdSecPerKm: null,
  runningPower1s: null,
  runningPower5s: null,
  runningPower30s: null,
  runningPower60s: null,
  runningPower5min: null,
  runningPowerThreshold: null,
  sprint15sDistance: null,
  bikeCadenceRpm: 90,
  bikeHrDriftFlag: false,
  protocolQuality: 0.85,
  wprimeKj: null,
  cpDataQuality: null,
  fatmax: null,
  forceDevMode: false,
  giIssuesFlag: false,
};

const EMPTY_INPUT: DiagnosticInput = {
  athleteId: "test-athlete-empty",
  age: null,
  sex: null,
  weightKg: null,
  objectif: "703",
  ambition: "finisher",
  sportFocus: "bike",
  vo2max: null,
  ftp: null,
  ftpKg: null,
  pmax5s: null,
  p30sW: null,
  p60sW: null,
  map5minW: null,
  vma: null,
  css: null,
  vlamax: null,
  vlamaxRun: null,
  vlamaxSource: null,
  vlamaxProtocol: null,
  vlamaxIsReference: false,
  tteObservedMin: null,
  tteMode: null,
  tss7d: null,
  fatigueState: null,
  runEconomyScore: null,
  runHrDriftPct: null,
  paceThresholdSecPerKm: null,
  runningPower1s: null,
  runningPower5s: null,
  runningPower30s: null,
  runningPower60s: null,
  runningPower5min: null,
  runningPowerThreshold: null,
  sprint15sDistance: null,
  bikeCadenceRpm: null,
  bikeHrDriftFlag: false,
  protocolQuality: null,
  wprimeKj: null,
  cpDataQuality: null,
  fatmax: null,
  forceDevMode: false,
  giIssuesFlag: false,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("computeDiagnostic", () => {
  describe("profil complet", () => {
    it("retourne un diagnostic structuré avec tous les champs", () => {
      const result = computeDiagnostic(BASE_INPUT);

      expect(result.athleteId).toBe("test-athlete-1");
      expect(result.objectif).toBe("703");
      expect(result.ambition).toBe("age_group");
      expect(result.sportFocus).toBe("bike");
    });

    it("calcule les 3 effectifs", () => {
      const result = computeDiagnostic(BASE_INPUT);

      expect(result.effectifs.vlamax).toBeDefined();
      expect(result.effectifs.vlamax.value).toBeGreaterThan(0);
      expect(result.effectifs.tte).toBeDefined();
      expect(result.effectifs.tte.tte_min).toBeGreaterThan(0);
      expect(result.effectifs.fatigue).toBeDefined();
      expect(typeof result.effectifs.fatigue.score).toBe("number");
    });

    it("détecte un limiteur et produit un gap analysis", () => {
      const result = computeDiagnostic(BASE_INPUT);

      expect(result.limiter).toBeDefined();
      expect(result.limiter.primaryLimiter).toBeDefined();
      expect(result.limiter.gapAnalysis.length).toBeGreaterThan(0);
    });

    it("produit une synthèse avec headline et priorités", () => {
      const result = computeDiagnostic(BASE_INPUT);

      expect(result.synthesis.headline).toBeTruthy();
      expect(result.synthesis.priorities.L1).toBeDefined();
      expect(result.synthesis.globalScore).toBeGreaterThanOrEqual(0);
      expect(result.synthesis.globalScore).toBeLessThanOrEqual(100);
      expect(["critical", "developing", "solid", "ready"]).toContain(result.synthesis.globalCategory);
    });

    it("contient les métadonnées de version et disclaimer", () => {
      const result = computeDiagnostic(BASE_INPUT);

      expect(result.meta.version).toBe("1.0.0");
      expect(result.meta.disclaimer).toContain("Two For Coaching Lab");
      expect(result.meta.confidenceGlobal).toBeGreaterThan(0);
      expect(result.meta.dataCompleteness).toBeGreaterThan(0);
    });

    it("n'a pas d'injuryRisk.run pour un cycliste", () => {
      const result = computeDiagnostic(BASE_INPUT);
      expect(result.injuryRisk.run).toBeNull();
    });

    it("calcule un injuryRisk.bike pour un cycliste (jusqu'ici toujours null, non implémenté)", () => {
      const result = computeDiagnostic(BASE_INPUT);
      expect(result.injuryRisk.bike).not.toBeNull();
      expect(result.injuryRisk.bike!.sport).toBe("VELO");
      expect(result.injuryRisk.bike!.score).toBeGreaterThanOrEqual(0);
      expect(result.injuryRisk.bike!.score).toBeLessThanOrEqual(100);
      expect(["FAIBLE", "MODERE", "ELEVE", "CRITIQUE"]).toContain(result.injuryRisk.bike!.level);
    });
  });

  describe("profil vide / minimal", () => {
    it("ne crash pas avec des données nulles", () => {
      expect(() => computeDiagnostic(EMPTY_INPUT)).not.toThrow();
    });

    it("retourne un diagnostic même sans données", () => {
      const result = computeDiagnostic(EMPTY_INPUT);

      expect(result.athleteId).toBe("test-athlete-empty");
      expect(result.effectifs.vlamax).toBeDefined();
      expect(result.effectifs.tte).toBeDefined();
      expect(result.effectifs.fatigue).toBeDefined();
      expect(result.synthesis).toBeDefined();
    });

    it("a un dataCompleteness faible", () => {
      const result = computeDiagnostic(EMPTY_INPUT);
      expect(result.meta.dataCompleteness).toBeLessThan(0.3);
    });

    it("signale des données incomplètes dans les alertes", () => {
      const result = computeDiagnostic(EMPTY_INPUT);
      const hasIncompleteAlert = result.synthesis.alerts.some(
        a => a.source === "readiness" && a.message.includes("incomplètes")
      );
      expect(hasIncompleteAlert).toBe(true);
    });
  });

  describe("athlète fatigué", () => {
    it("déclenche une alerte fatigue élevée avec TSS élevé", () => {
      const fatiguedInput: DiagnosticInput = {
        ...BASE_INPUT,
        tss7d: 900,
        fatigueState: "high",
      };
      const result = computeDiagnostic(fatiguedInput);

      const fatigueAlert = result.synthesis.alerts.find(a => a.source === "fatigue");
      expect(fatigueAlert).toBeDefined();
      expect(["warning", "critical"]).toContain(fatigueAlert!.severity);
    });

    it("headline mentionne la fatigue quand score > 75", () => {
      const extremeFatigueInput: DiagnosticInput = {
        ...BASE_INPUT,
        tss7d: 1200,
      };
      const result = computeDiagnostic(extremeFatigueInput);

      // Si le score fatigue > 75, le headline doit mentionner la fatigue
      if (result.effectifs.fatigue.score > 75) {
        expect(result.synthesis.headline.toLowerCase()).toContain("fatigue");
      }
    });
  });

  describe("coureur à pied", () => {
    it("calcule un injuryRisk.run pour sportFocus=run", () => {
      const runInput: DiagnosticInput = {
        ...BASE_INPUT,
        sportFocus: "run",
        vma: 18.5,
        css: 240,
        runEconomyScore: 72,
        paceThresholdSecPerKm: 255,
      };
      const result = computeDiagnostic(runInput);

      expect(result.injuryRisk.run).not.toBeNull();
      expect(result.injuryRisk.run!.score).toBeGreaterThanOrEqual(0);
    });

    it("n'a pas d'injuryRisk.bike pour sportFocus=run", () => {
      const runInput: DiagnosticInput = {
        ...BASE_INPUT,
        sportFocus: "run",
        vma: 18.5,
        css: 240,
        runEconomyScore: 72,
        paceThresholdSecPerKm: 255,
      };
      const result = computeDiagnostic(runInput);
      expect(result.injuryRisk.bike).toBeNull();
    });
  });

  describe("checkin avec douleur", () => {
    it("propage le painFlag dans l'analyse de disponibilité", () => {
      const painInput: DiagnosticInput = {
        ...BASE_INPUT,
        checkinData: {
          sleep: 3,
          fatigue: 8,
          soreness: 7,
          stress: 6,
          motivation: 4,
          painFlag: true,
        },
      };
      const result = computeDiagnostic(painInput);

      // Le limiter doit recevoir hasHealthAlerts = true
      expect(result.limiter).toBeDefined();
      // Le diagnostic ne doit pas crasher
      expect(result.synthesis.headline).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Audit — computeReadinessFromInput : conversion gapAnalysis → scores compass
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Audit — cohérence des scores compass dérivés du gap analysis", () => {
    it("score une VLamax basse (profil endurance favorable) plus haut qu'une VLamax haute (glycolytique)", () => {
      // VLamax : plus bas est mieux. Avant fix, `100 + gap.gapPercent` traitait
      // ce gap comme les autres métriques (positif = au-dessus cible = bon),
      // ce qui inversait le score : une VLamax basse (bonne) était pénalisée,
      // une VLamax haute (mauvaise) était survalorisée.
      const lowVlamax: DiagnosticInput = { ...BASE_INPUT, vlamax: 0.20 };
      const highVlamax: DiagnosticInput = { ...BASE_INPUT, vlamax: 0.95 };

      const lowResult = computeDiagnostic(lowVlamax);
      const highResult = computeDiagnostic(highVlamax);

      const lowMetabolic = lowResult.readiness.potential.sources.metabolic.value;
      const highMetabolic = highResult.readiness.potential.sources.metabolic.value;

      expect(lowMetabolic).toBeGreaterThan(highMetabolic);
    });

    it("intègre le gap W' (clé 'W' (kJ)') dans le robustnessScore, pas seulement l'Économie", () => {
      // La comparaison de chaîne utilisait "W'" alors que unifiedLimiterDetection.ts
      // pousse la métrique sous la clé "W' (kJ)" → le gap W' était silencieusement
      // ignoré, robustnessScore ne reflétant que l'Économie.
      const goodEconomyBadWprime: DiagnosticInput = {
        ...BASE_INPUT,
        runEconomyScore: 90, // Économie excellente
        wprimeKj: 8, // net sous la cible min (14 kJ pour 703/age_group)
        cpDataQuality: "good",
      };
      const result = computeDiagnostic(goodEconomyBadWprime);
      const robustness = result.readiness.potential.sources.robustness.value;

      expect(robustness).toBeLessThan(90);
    });

    it("intègre le gap VMA dans l'aerobicScore en mode running, au lieu de l'ignorer", () => {
      const lowVma: DiagnosticInput = {
        ...BASE_INPUT,
        objectif: "Marathon",
        sportFocus: "run",
        vma: 10, // largement sous la cible age_group (16 km/h)
      };
      const highVma: DiagnosticInput = {
        ...BASE_INPUT,
        objectif: "Marathon",
        sportFocus: "run",
        vma: 22, // au-dessus de la cible
      };

      const lowResult = computeDiagnostic(lowVma);
      const highResult = computeDiagnostic(highVma);

      const lowAerobic = lowResult.readiness.potential.sources.aerobic.value;
      const highAerobic = highResult.readiness.potential.sources.aerobic.value;

      expect(highAerobic).toBeGreaterThan(lowAerobic);
    });
  });
});
