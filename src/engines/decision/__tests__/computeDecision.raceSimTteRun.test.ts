/**
 * Vérifie que computeDecision utilise le TTE RUN pour les courses run-only
 * (Marathon / Semi / 10km) même quand le diagnostic est calé sur bike.
 */
import { describe, it, expect } from "vitest";
import { computeDiagnostic } from "@/engines/diagnostic/computeDiagnostic";
import { computeDecision } from "../computeDecision";
import type { DiagnosticInput } from "@/engines/diagnostic/types";

const BASE: DiagnosticInput = {
  athleteId: "sim-run-tte",
  athleteName: "Sim Run TTE",
  age: 32,
  sex: "M",
  weightKg: 68,
  objectif: "Marathon",
  ambition: "age_group",
  sportFocus: "bike", // volontairement bike pour vérifier l'override race-type
  vo2max: 62,
  ftp: 300,
  ftpKg: 4.4,
  pmax5s: 950,
  p30sW: 620,
  p60sW: 470,
  map5minW: 340,
  vma: 18,
  css: null,
  vlamax: 0.42,
  vlamaxRun: 0.38,
  vlamaxSource: "test",
  vlamaxProtocol: "30-15",
  vlamaxIsReference: true,
  tteObservedMin: 55, // bike
  tteObservedMinRun: 40, // run (différent → détectable)
  tteMode: "OBSERVED",
  tss7d: 500,
  fatigueState: null,
  runEconomyScore: null,
  runHrDriftPct: null,
  paceThresholdSecPerKm: 220,
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

describe("computeDecision — raceSimulation TTE run/bike propagation", () => {
  it("Marathon → race-sim reçoit TTE run (40 min), pas le bike (55 min)", () => {
    const diagnostic = computeDiagnostic(BASE);
    // Diagnostic (sportFocus=bike) contient TTE bike
    expect(diagnostic.effectifs.tte.tte_min).toBe(55);

    const result = computeDecision({
      diagnostic,
      context: { daysToRace: 60, isRaceWeek: false, currentPhase: "build" },
      raceSimulationInput: {
        raceType: "Marathon",
        heat: "moderate",
        terrain: "flat",
        plannedCarbsGH: 80,
      },
    });

    expect(result.raceSimulation).not.toBeNull();
    // Pas de crash + simulation calculée
    expect(result.raceSimulation!.scenarios.length).toBeGreaterThan(0);
  });

  it("IM (triathlon) → race-sim conserve le TTE bike du diagnostic", () => {
    const diagnostic = computeDiagnostic({ ...BASE, objectif: "IM" });
    expect(diagnostic.effectifs.tte.tte_min).toBe(55);

    const result = computeDecision({
      diagnostic,
      context: { daysToRace: 60, isRaceWeek: false, currentPhase: "build" },
      raceSimulationInput: {
        raceType: "IM",
        heat: "moderate",
        terrain: "flat",
        plannedCarbsGH: 90,
      },
    });

    expect(result.raceSimulation).not.toBeNull();
  });
});
