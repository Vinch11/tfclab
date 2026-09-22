import { describe, it, expect } from "vitest";
import {
  estimatePaceThreshold,
  estimateVma,
  calculateRunTteObservation,
  evaluateRunProtocolQuality,
} from "../runningMetricsCalculator";
import { calculateRunBestEfforts } from "../runningBestEfforts";
import type { FitRecord, FitSession } from "../types";

interface Phase {
  speedMs: number;
  durationSec: number;
  heartRate?: number;
}

function buildRunSession(phases: Phase[]): FitSession {
  const records: FitRecord[] = [];
  const start = new Date("2026-09-01T08:00:00Z");
  let elapsedSec = 0;

  for (const phase of phases) {
    for (let i = 0; i < phase.durationSec; i++) {
      records.push({
        timestamp: new Date(start.getTime() + elapsedSec * 1000),
        speed: phase.speedMs,
        heartRate: phase.heartRate ?? 150,
      });
      elapsedSec++;
    }
  }

  const totalSec = elapsedSec;
  return {
    startTime: start,
    endTime: records[records.length - 1].timestamp,
    sport: "running",
    totalTimeSec: totalSec,
    movingTimeSec: totalSec,
    totalDistance: phases.reduce((sum, p) => sum + p.speedMs * p.durationSec, 0),
    records,
    laps: [],
  };
}

describe("estimatePaceThreshold — CAP D5", () => {
  it("retourne l'allure du meilleur effort 30 min, sans coefficient de correction", () => {
    const session = buildRunSession([{ speedMs: 4.0, durationSec: 1800 }]);
    const runBestEfforts = calculateRunBestEfforts(session.records);
    const estimate = estimatePaceThreshold("THRESHOLD_RUN_30MIN", runBestEfforts);

    expect(estimate).toBeDefined();
    expect(estimate!.paceSecPerKm).toBe(Math.round(1000 / 4.0));
    expect(estimate!.confidence).toBeGreaterThan(0.7);
  });

  it("ne retourne rien pour un type de test qui n'est pas l'allure seuil", () => {
    const session = buildRunSession([{ speedMs: 4.0, durationSec: 1800 }]);
    const runBestEfforts = calculateRunBestEfforts(session.records);
    expect(estimatePaceThreshold("VMA_TEST", runBestEfforts)).toBeUndefined();
    expect(estimatePaceThreshold("SPRINT_15S", runBestEfforts)).toBeUndefined();
  });
});

describe("estimateVma — CAP D3", () => {
  it("estime la VMA depuis le meilleur effort 6 min", () => {
    const session = buildRunSession([{ speedMs: 5.5, durationSec: 360 }]);
    const runBestEfforts = calculateRunBestEfforts(session.records);
    const estimate = estimateVma(runBestEfforts);

    expect(estimate).toBeDefined();
    expect(estimate!.vmaKmh).toBeCloseTo(5.5 * 3.6, 1);
  });

  it("ne retourne rien sans effort 6 min disponible (séance trop courte)", () => {
    const session = buildRunSession([{ speedMs: 5.5, durationSec: 30 }]);
    const runBestEfforts = calculateRunBestEfforts(session.records);
    expect(estimateVma(runBestEfforts)).toBeUndefined();
  });
});

/**
 * Miroir du fix bugfix vélo (calculateTteObservation ne détectait jamais
 * aucune séquence continue à cause d'un reset de currentStart à chaque
 * itération). Ces tests vérifient que le même algorithme, porté sur la
 * vitesse, détecte bien une séquence continue.
 */
describe("calculateRunTteObservation — détection de la plus longue séquence continue", () => {
  it("détecte une TTE sur un effort continu tenu à l'allure cible", () => {
    const targetPaceSecPerKm = Math.round(1000 / 4.2);
    const session = buildRunSession([{ speedMs: 4.2, durationSec: 900 }]); // 15 min constant
    const observation = calculateRunTteObservation(session, targetPaceSecPerKm);

    expect(observation).toBeDefined();
    expect(observation!.tteMinutes).toBeGreaterThan(14);
    expect(observation!.targetPaceSecPerKm).toBe(targetPaceSecPerKm);
  });

  it("ne détecte rien sous 1 minute d'effort continu au-dessus du seuil", () => {
    const targetPaceSecPerKm = Math.round(1000 / 4.2);
    const session = buildRunSession([
      { speedMs: 4.2, durationSec: 30 }, // 30s seulement — sous le plancher de 60s
      { speedMs: 2.0, durationSec: 60 },
    ]);
    const observation = calculateRunTteObservation(session, targetPaceSecPerKm);

    expect(observation).toBeUndefined();
  });

  it("interrompt la séquence après une pause GPS de plus de 5s", () => {
    const targetPaceSecPerKm = Math.round(1000 / 4.2);
    const records: FitRecord[] = [];
    const start = new Date("2026-09-01T08:00:00Z");
    // 5 min continues à l'allure cible
    for (let i = 0; i < 300; i++) {
      records.push({ timestamp: new Date(start.getTime() + i * 1000), speed: 4.2, heartRate: 150 });
    }
    // Pause de 10s (perte GPS)
    // 5 min supplémentaires à l'allure cible, après la pause
    for (let i = 0; i < 300; i++) {
      records.push({
        timestamp: new Date(start.getTime() + (310 + i) * 1000),
        speed: 4.2,
        heartRate: 150,
      });
    }
    const session: FitSession = {
      startTime: start,
      sport: "running",
      totalTimeSec: 610,
      movingTimeSec: 600,
      totalDistance: 0,
      records,
      laps: [],
    };
    const observation = calculateRunTteObservation(session, targetPaceSecPerKm);

    // La plus longue séquence continue est ~5 min (300s), pas 10 min —
    // la pause doit bien réinitialiser le compteur (sentinel -1).
    expect(observation).toBeDefined();
    expect(observation!.continuousDurationSec).toBeLessThan(320);
  });
});

describe("evaluateRunProtocolQuality", () => {
  it("note bien une séance avec vitesse stable et FC présente", () => {
    const session = buildRunSession([{ speedMs: 4.0, durationSec: 1800, heartRate: 160 }]);
    const quality = evaluateRunProtocolQuality(session, "THRESHOLD_RUN_30MIN");

    expect(quality.score).toBeGreaterThanOrEqual(3);
    expect(quality.factors.sensorsPresent.heartRate).toBe(true);
    expect(quality.factors.sensorsPresent.power).toBe(false);
  });

  it("ne pénalise pas l'absence de puissance course (bonus, jamais un prérequis)", () => {
    const session = buildRunSession([{ speedMs: 4.0, durationSec: 1800 }]);
    const quality = evaluateRunProtocolQuality(session, "THRESHOLD_RUN_30MIN");
    expect(quality.score).toBeGreaterThanOrEqual(3);
  });
});
