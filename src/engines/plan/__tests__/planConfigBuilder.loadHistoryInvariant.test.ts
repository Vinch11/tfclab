/**
 * Correction sprint qualité Marathon/Ironman (oct. 2026), #E (demande coach
 * explicite, point 5) : l'historique de charge DÉCLARATIF (`loadHistory`)
 * ne doit JAMAIS influencer `volumeRamp`/`weeklyHours`/`volumeCible` —
 * ces valeurs restent pilotées exclusivement par `weeklyHours`/
 * `trainingLevel`/la CRR mesurée (chargeRecenteReference.ts), inchangés.
 * Vérifié ici en comparant deux builds strictement identiques sauf la
 * présence de `loadHistory`.
 */
import { describe, it, expect } from "vitest";
import { computeDiagnostic } from "@/engines/diagnostic/computeDiagnostic";
import { buildPlanConfigFromDiagnostic } from "../planConfigBuilder";
import type { DiagnosticInput } from "@/engines/diagnostic/types";
import type { PlanFormConfig } from "../planConfigBuilder";

const COMPLETE_INPUT: DiagnosticInput = {
  athleteId: "plan-test-loadhistory",
  athleteName: "Load History Athlete",
  age: 32,
  sex: "M",
  weightKg: 72,
  objectif: "703",
  ambition: "age_group",
  sportFocus: "bike",
  vo2max: 55,
  ftp: 300,
  ftpKg: 4.17,
  pmax5s: 850,
  p30sW: 580,
  p60sW: 430,
  map5minW: 300,
  vma: 17,
  css: 85,
  vlamax: 0.55,
  vlamaxRun: null,
  vlamaxSource: "test",
  vlamaxProtocol: "30-15",
  vlamaxIsReference: true,
  tteObservedMin: 35,
  tteMode: "observed",
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
  bikeCadenceRpm: 85,
  bikeHrDriftFlag: false,
  protocolQuality: 0.85,
  wprimeKj: null,
  cpDataQuality: null,
  fatmax: null,
  forceDevMode: false,
  giIssuesFlag: false,
};

const BASE_FORM_CONFIG: PlanFormConfig = {
  objective: "Ironman 70.3",
  raceName: "Tours 70.3",
  raceDate: "2027-06-06",
  weeksAvailable: 32,
  weeklyHours: 17,
  sessionsPerWeek: 11,
  ambition: "perf",
  trainingLevel: "trained",
};

describe("buildPlanConfigFromDiagnostic — invariant loadHistory (Correction E, point 5)", () => {
  it("volumeRamp et weeklyHours sont STRICTEMENT identiques avec ou sans loadHistory renseigné", () => {
    const diagnostic = computeDiagnostic(COMPLETE_INPUT);

    const withoutHistory = buildPlanConfigFromDiagnostic(diagnostic, BASE_FORM_CONFIG);
    const withHistory = buildPlanConfigFromDiagnostic(diagnostic, {
      ...BASE_FORM_CONFIG,
      loadHistory: { chronicWeeklyHours: 8, recentWeeklyHours: 17, recentWeeksCount: 4 },
    });

    expect(withHistory.weeklyHours).toBe(withoutHistory.weeklyHours);
    expect(withHistory.volumeRamp).toEqual(withoutHistory.volumeRamp);
    expect(withHistory.ambitionMeta).toEqual(withoutHistory.ambitionMeta);
  });

  it("passthrough : loadHistory et maxDoubleDaysPerWeek apparaissent bien, inchangés, dans le PlanConfig résultant", () => {
    const diagnostic = computeDiagnostic(COMPLETE_INPUT);
    const config = buildPlanConfigFromDiagnostic(diagnostic, {
      ...BASE_FORM_CONFIG,
      loadHistory: { chronicWeeklyHours: 8, recentWeeklyHours: 17, recentWeeksCount: 4 },
      maxDoubleDaysPerWeek: 4,
    });

    expect(config.loadHistory).toEqual({ chronicWeeklyHours: 8, recentWeeklyHours: 17, recentWeeksCount: 4 });
    expect(config.maxDoubleDaysPerWeek).toBe(4);
  });

  it("absent par défaut : aucun loadHistory/maxDoubleDaysPerWeek fabriqué si non fourni", () => {
    const diagnostic = computeDiagnostic(COMPLETE_INPUT);
    const config = buildPlanConfigFromDiagnostic(diagnostic, BASE_FORM_CONFIG);
    expect(config.loadHistory).toBeUndefined();
    expect(config.maxDoubleDaysPerWeek).toBeUndefined();
  });
});
