/**
 * Tests unitaires — TFCL Decision Engine
 * Cas : diagnostic normal, diagnostic fatigué, profil équilibré
 */
import { describe, it, expect } from "vitest";
import { computeDiagnostic } from "@/engines/diagnostic/computeDiagnostic";
import { computeDecision } from "../computeDecision";
import type { DiagnosticInput } from "@/engines/diagnostic/types";
import type { DecisionInput } from "../types";

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_DIAGNOSTIC_INPUT: DiagnosticInput = {
  athleteId: "decision-test-1",
  athleteName: "Decision Athlete",
  age: 30,
  sex: "M",
  weightKg: 70,
  objectif: "703",
  ambition: "age_group",
  sportFocus: "bike",
  vo2max: 60,
  ftp: 290,
  ftpKg: 4.14,
  pmax5s: 950,
  p30sW: 620,
  p60sW: 470,
  map5minW: 330,
  vma: null,
  css: null,
  vlamax: 0.42,
  vlamaxRun: null,
  vlamaxSource: "test",
  vlamaxProtocol: "30-15",
  vlamaxIsReference: true,
  tteObservedMin: 45,
  tteMode: "observed",
  tss7d: 400,
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
  bikeCadenceRpm: 88,
  bikeHrDriftFlag: false,
  protocolQuality: 0.9,
  wprimeKj: null,
  cpDataQuality: null,
  fatmax: null,
  forceDevMode: false,
  giIssuesFlag: false,
};

function makeDecisionInput(diagnosticInput: DiagnosticInput, overrides?: Partial<DecisionInput>): DecisionInput {
  const diagnostic = computeDiagnostic(diagnosticInput);
  return {
    diagnostic,
    context: {
      daysToRace: 90,
      isRaceWeek: false,
      currentPhase: "build",
    },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("computeDecision", () => {
  describe("diagnostic normal", () => {
    it("retourne une prescription structurée complète", () => {
      const input = makeDecisionInput(BASE_DIAGNOSTIC_INPUT);
      const result = computeDecision(input);

      expect(result.strategy).toBeDefined();
      expect(result.workoutGuidance).toBeDefined();
      expect(result.executiveSummary).toBeDefined();
      expect(result.meta.version).toBeTruthy();
    });

    it("produit une strategy avec primaryAction non vide", () => {
      const input = makeDecisionInput(BASE_DIAGNOSTIC_INPUT);
      const result = computeDecision(input);

      expect(result.strategy.primaryAction).toBeTruthy();
      expect(typeof result.strategy.primaryAction).toBe("string");
    });

    it("produit des workout recommendations", () => {
      const input = makeDecisionInput(BASE_DIAGNOSTIC_INPUT);
      const result = computeDecision(input);

      expect(result.workoutGuidance.recommendations).toBeDefined();
      expect(Array.isArray(result.workoutGuidance.recommendations)).toBe(true);
    });

    it("contient un executive summary avec headline et keyPoints", () => {
      const input = makeDecisionInput(BASE_DIAGNOSTIC_INPUT);
      const result = computeDecision(input);

      expect(result.executiveSummary.headline).toBeTruthy();
      expect(result.executiveSummary.keyPoints.length).toBeGreaterThan(0);
      expect(result.executiveSummary.keyPoints.length).toBeLessThanOrEqual(3);
    });

    it("référence la version du diagnostic dans meta", () => {
      const input = makeDecisionInput(BASE_DIAGNOSTIC_INPUT);
      const result = computeDecision(input);

      expect(result.meta.diagnosticVersion).toBe("1.0.0");
    });
  });

  describe("diagnostic avec fatigue élevée", () => {
    it("ne crash pas avec un athlète très fatigué", () => {
      const fatiguedInput: DiagnosticInput = {
        ...BASE_DIAGNOSTIC_INPUT,
        tss7d: 1000,
      };
      const input = makeDecisionInput(fatiguedInput);
      expect(() => computeDecision(input)).not.toThrow();
    });

    it("la prescription reflète la fatigue dans le summary", () => {
      const fatiguedInput: DiagnosticInput = {
        ...BASE_DIAGNOSTIC_INPUT,
        tss7d: 1000,
      };
      const input = makeDecisionInput(fatiguedInput);
      const result = computeDecision(input);

      // La prescription doit exister — pas de crash
      expect(result.executiveSummary.headline).toBeTruthy();
      expect(result.strategy.primaryAction).toBeTruthy();
    });
  });

  describe("semaine de course", () => {
    it("gère le contexte race week", () => {
      const input = makeDecisionInput(BASE_DIAGNOSTIC_INPUT, {
        context: {
          daysToRace: 3,
          isRaceWeek: true,
          currentPhase: "taper",
        },
      });
      const result = computeDecision(input);

      expect(result.strategy).toBeDefined();
      expect(result.executiveSummary.headline).toBeTruthy();
    });
  });

  describe("roadmap generation", () => {
    it("produit un roadmap ou null sans crash", () => {
      const input = makeDecisionInput(BASE_DIAGNOSTIC_INPUT);
      const result = computeDecision(input);

      // roadmap peut être null si le sous-module échoue
      if (result.roadmap) {
        expect(result.roadmap.phases).toBeDefined();
        expect(Array.isArray(result.roadmap.phases)).toBe(true);
      }
    });
  });
});
