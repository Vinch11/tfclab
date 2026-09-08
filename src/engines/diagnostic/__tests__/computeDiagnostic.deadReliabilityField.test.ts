/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 3, finding
 * secondaire). computeDiagnostic() déclarait un champ `reliability`
 * (AthleteDiagnostic.reliability) censé porter le Decision Reliability
 * Engine (DRE) — mais il était systématiquement codé en dur à `null`, et
 * aucun des 5 consommateurs de computeDiagnostic() dans l'app (Index.tsx,
 * ExportTools.tsx, DecisionAdvancedMode.tsx, readinessSource.ts,
 * AITrainingPlanPage.tsx) ne le lisait jamais. Le DRE réellement affiché au
 * coach (Dashboard, PDF Race Simulation) est calculé séparément par
 * computeFullDRE avec les vraies confidences du snapshot actif.
 *
 * Supprimé plutôt que "complété" : implémenter un vrai calcul ici aurait
 * dupliqué une fonctionnalité déjà correcte ailleurs, sans qu'aucun
 * consommateur n'en profite.
 */
import { describe, it, expect } from "vitest";
import { computeDiagnostic } from "../computeDiagnostic";
import type { DiagnosticInput } from "../types";

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

describe("computeDiagnostic — suppression du champ mort reliability", () => {
  it("AthleteDiagnostic n'expose plus de champ reliability (toujours null, jamais lu par aucun consommateur)", () => {
    const diagnostic = computeDiagnostic(BASE_INPUT);
    expect("reliability" in diagnostic).toBe(false);
  });

  it("le reste du diagnostic reste bien formé après la suppression", () => {
    const diagnostic = computeDiagnostic(BASE_INPUT);
    expect(diagnostic.effectifs.vlamax).toBeDefined();
    expect(diagnostic.effectifs.tte).toBeDefined();
    expect(diagnostic.limiter).toBeDefined();
    expect(diagnostic.readiness).toBeDefined();
    expect(diagnostic.injuryRisk).toBeDefined();
    expect(diagnostic.synthesis).toBeDefined();
  });
});
