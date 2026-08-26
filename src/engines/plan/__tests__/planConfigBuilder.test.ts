/**
 * Tests unitaires — TFCL Plan Engine (planConfigBuilder)
 * Vérifie l'injection des limiteurs, levers et prohibitions dans le PlanConfig
 */
import { describe, it, expect } from "vitest";
import { computeDiagnostic } from "@/engines/diagnostic/computeDiagnostic";
import { buildPlanConfigFromDiagnostic, buildPlanAthleteDataFromDiagnostic, computeChantierDurationWeeks } from "../planConfigBuilder";
import type { DiagnosticInput } from "@/engines/diagnostic/types";
import type { PlanFormConfig } from "../planConfigBuilder";

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const COMPLETE_INPUT: DiagnosticInput = {
  athleteId: "plan-test-1",
  athleteName: "Plan Athlete",
  age: 32,
  sex: "M",
  weightKg: 72,
  objectif: "703",
  ambition: "age_group",
  sportFocus: "bike",
  vo2max: 55,
  ftp: 260,
  ftpKg: 3.61,
  pmax5s: 850,
  p30sW: 580,
  p60sW: 430,
  map5minW: 300,
  vma: null,
  css: null,
  vlamax: 0.55,
  vlamaxRun: null,
  vlamaxSource: "test",
  vlamaxProtocol: "30-15",
  vlamaxIsReference: true,
  tteObservedMin: 35,
  tteMode: "observed",
  tss7d: 380,
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
  bikeCadenceRpm: 85,
  bikeHrDriftFlag: false,
  protocolQuality: 0.85,
  wprimeKj: null,
  cpDataQuality: null,
  fatmax: null,
  forceDevMode: false,
  giIssuesFlag: false,
};

const FORM_CONFIG: PlanFormConfig = {
  objective: "Ironman 70.3",
  raceName: "Nice 70.3",
  raceDate: "2026-09-15",
  weeksAvailable: 16,
  weeklyHours: 12,
  sessionsPerWeek: 6,
  ambition: "Age Group",
};

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("buildPlanConfigFromDiagnostic", () => {
  describe("injection des limiteurs", () => {
    it("injecte des limiteurs identifiés dans le PlanConfig", () => {
      const diagnostic = computeDiagnostic(COMPLETE_INPUT);
      const config = buildPlanConfigFromDiagnostic(diagnostic, FORM_CONFIG);

      // Avec un profil qui a des gaps, on attend des limiteurs
      if (diagnostic.limiter.gapAnalysis.some(g => g.weightedImpact > 0)) {
        expect(config.identifiedLimiters).toBeDefined();
        expect(config.identifiedLimiters!.length).toBeGreaterThan(0);
      }
    });

    it("inclut le classement et la périodisation dans les limiteurs", () => {
      const diagnostic = computeDiagnostic(COMPLETE_INPUT);
      const config = buildPlanConfigFromDiagnostic(diagnostic, FORM_CONFIG);

      if (config.identifiedLimiters && config.identifiedLimiters.length > 0) {
        const joined = config.identifiedLimiters.join("\n");
        expect(joined).toContain("CLASSEMENT DES LIMITEURS");
        expect(joined).toContain("PÉRIODISATION");
      }
    });

    it("ajoute la synthèse TFCL si limiteur primaire détecté", () => {
      const diagnostic = computeDiagnostic(COMPLETE_INPUT);
      const config = buildPlanConfigFromDiagnostic(diagnostic, FORM_CONFIG);

      if (diagnostic.limiter.primaryLimiter !== "none" && config.identifiedLimiters) {
        const joined = config.identifiedLimiters.join("\n");
        expect(joined).toContain("Synthèse TFCL");
      }
    });
  });

  describe("injection des levers", () => {
    it("injecte au moins un lever actif", () => {
      const diagnostic = computeDiagnostic(COMPLETE_INPUT);
      const config = buildPlanConfigFromDiagnostic(diagnostic, FORM_CONFIG);

      if (diagnostic.limiter.primaryLimiter !== "none") {
        expect(config.activeLevers).toBeDefined();
        expect(config.activeLevers!.length).toBeGreaterThan(0);
      }
    });
  });

  describe("sprint ban / prohibitions", () => {
    it("applique le sprint ban pour VLamax trop haute en longue distance", () => {
      const highVlamaxInput: DiagnosticInput = {
        ...COMPLETE_INPUT,
        vlamax: 0.65,
        objectif: "IM",
      };
      const diagnostic = computeDiagnostic(highVlamaxInput);
      const config = buildPlanConfigFromDiagnostic(diagnostic, {
        ...FORM_CONFIG,
        objective: "Ironman",
      });

      // Si VLamax est limiting pour IM, sprint ban doit être présent
      const vlamaxGap = diagnostic.limiter.gapAnalysis.find(g => g.metric === "VLamax");
      if (vlamaxGap && vlamaxGap.status === "limiting") {
        expect(config.prohibitions).toBeDefined();
        const joined = (config.prohibitions ?? []).join("\n");
        expect(joined).toContain("SPRINT BAN");
      }
    });

    it("autorise les sprints pour objectif courte distance", () => {
      const shortInput: DiagnosticInput = {
        ...COMPLETE_INPUT,
        objectif: "10K",
      };
      const diagnostic = computeDiagnostic(shortInput);
      const config = buildPlanConfigFromDiagnostic(diagnostic, {
        ...FORM_CONFIG,
        objective: "10K",
      });

      if (config.prohibitions && config.prohibitions.length > 0) {
        const joined = config.prohibitions.join("\n");
        expect(joined).toContain("SPRINTS AUTORISÉS");
      }
    });
  });

  describe("form config passthrough", () => {
    it("reporte fidèlement les paramètres du formulaire", () => {
      const diagnostic = computeDiagnostic(COMPLETE_INPUT);
      const config = buildPlanConfigFromDiagnostic(diagnostic, FORM_CONFIG);

      expect(config.objective).toBe("Ironman 70.3");
      expect(config.raceName).toBe("Nice 70.3");
      expect(config.raceDate).toBe("2026-09-15");
      expect(config.weeksAvailable).toBe(16);
      expect(config.weeklyHours).toBe(12);
      expect(config.sessionsPerWeek).toBe(6);
    });
  });
});

describe("buildPlanAthleteDataFromDiagnostic", () => {
  it("extrait les données athlète depuis le diagnostic", () => {
    const diagnostic = computeDiagnostic(COMPLETE_INPUT);
    const data = buildPlanAthleteDataFromDiagnostic(diagnostic);

    expect(data.nom).toBe("Plan Athlete");
    expect(data.ftp).toBe(260);
    expect(data.weightKg).toBe(72);
    expect(data.vo2max).toBe(55);
    expect(data.vlamax).toBeGreaterThan(0);
    expect(data.tte).toBeGreaterThan(0);
  });

  it("gère les données nulles sans crash", () => {
    const emptyInput: DiagnosticInput = {
      ...COMPLETE_INPUT,
      ftp: null,
      weightKg: null,
      vo2max: null,
    };
    const diagnostic = computeDiagnostic(emptyInput);
    expect(() => buildPlanAthleteDataFromDiagnostic(diagnostic)).not.toThrow();
  });
});

describe("computeChantierDurationWeeks", () => {
  it("gap sévère (\"limiting\") sur un plan long → durée la plus longue, dans [2,6]", () => {
    expect(computeChantierDurationWeeks("limiting", 24)).toBe(5);
  });

  it("gap modéré (\"acceptable\") → durée intermédiaire", () => {
    expect(computeChantierDurationWeeks("acceptable", 24)).toBe(4);
  });

  it("gap faible/optimal → repli sur la valeur générique d'origine (3 sem)", () => {
    expect(computeChantierDurationWeeks("optimal", 24)).toBe(3);
  });

  it("statut inconnu/absent → repli identique au cas optimal (3 sem)", () => {
    expect(computeChantierDurationWeeks(undefined, 24)).toBe(3);
    expect(computeChantierDurationWeeks("unknown", 24)).toBe(3);
  });

  it("plan court : plafonne pour ne pas écraser les autres blocs (≤ ~35% du plan)", () => {
    // 10 sem × 35% ≈ 4 → un gap "limiting" (base 5) est ramené à 4
    expect(computeChantierDurationWeeks("limiting", 10)).toBe(4);
    // 6 sem × 35% ≈ 2 → plancher de la plage validée
    expect(computeChantierDurationWeeks("limiting", 6)).toBe(2);
  });

  it("weeksAvailable absent → pas de plafonnement, juste la base par statut", () => {
    expect(computeChantierDurationWeeks("limiting", undefined)).toBe(5);
    expect(computeChantierDurationWeeks("limiting", null)).toBe(5);
  });

  it("reste toujours dans la plage validée par PHASE_DURATION_RANGE.Chantier = [2,6]", () => {
    for (const status of ["limiting", "acceptable", "optimal", "unknown", undefined]) {
      for (const weeks of [4, 8, 12, 16, 20, 24, 30, undefined]) {
        const d = computeChantierDurationWeeks(status, weeks);
        expect(d).toBeGreaterThanOrEqual(2);
        expect(d).toBeLessThanOrEqual(6);
      }
    }
  });
});
