import { describe, it, expect } from "vitest";
import { detectRunTestType } from "../testDetector";
import { calculateRunBestEfforts } from "../runningBestEfforts";
import type { FitRecord, FitSession } from "../types";

/**
 * Fix "câblage Nolio → Semaine Test CAP incomplet" (demande coach) : avant ce
 * module, une séance de course n'avait AUCUNE détection de type de test —
 * isRunningSession désactivait tout (cf. analyzer.ts). Ces tests vérifient
 * que la détection course (allure/vitesse GPS, jamais la puissance vélo)
 * reconnaît bien les 4 tests du protocole CAP.
 */

interface Phase {
  speedMs: number;
  durationSec: number;
  heartRate?: number;
}

function buildRunSession(phases: Phase[], sport: string = "running"): FitSession {
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
    sport,
    totalTimeSec: totalSec,
    movingTimeSec: totalSec,
    totalDistance: phases.reduce((sum, p) => sum + p.speedMs * p.durationSec, 0),
    records,
    laps: [],
  };
}

describe("detectRunTestType — Sprint 15s (CAP D1)", () => {
  it("détecte un sprint 15s (pic de vitesse très au-dessus de la moyenne)", () => {
    const session = buildRunSession([
      { speedMs: 2.5, durationSec: 300 }, // échauffement ~9 km/h
      { speedMs: 8.5, durationSec: 15 },  // sprint ~30.6 km/h
      { speedMs: 2.0, durationSec: 300 }, // récup
    ]);
    const runBestEfforts = calculateRunBestEfforts(session.records);
    const result = detectRunTestType(session, runBestEfforts);

    expect(result.type).toBe("SPRINT_15S");
    expect(result.confidence).toBeGreaterThan(0.5);
  });
});

describe("detectRunTestType — VMA (CAP D3)", () => {
  it("détecte un test VMA (effort 6 min dominant sur une séance courte)", () => {
    const session = buildRunSession([
      { speedMs: 3.0, durationSec: 300 },  // échauffement
      { speedMs: 5.5, durationSec: 360 },  // 6 min à VMA (~19.8 km/h)
      { speedMs: 2.0, durationSec: 300 },  // retour au calme
    ]);
    const runBestEfforts = calculateRunBestEfforts(session.records);
    const result = detectRunTestType(session, runBestEfforts);

    expect(result.type).toBe("VMA_TEST");
  });
});

describe("detectRunTestType — Allure Seuil 30 min (CAP D5)", () => {
  it("détecte un effort soutenu de ~30 min à allure stable", () => {
    const session = buildRunSession([
      { speedMs: 3.2, durationSec: 300 },   // échauffement
      { speedMs: 4.2, durationSec: 1800 },  // 30 min à allure seuil (~15.1 km/h)
      { speedMs: 2.0, durationSec: 300 },   // retour au calme
    ]);
    const runBestEfforts = calculateRunBestEfforts(session.records);
    const result = detectRunTestType(session, runBestEfforts);

    expect(result.type).toBe("THRESHOLD_RUN_30MIN");
  });
});

describe("detectRunTestType — TTE course : jamais proposée sans allure seuil déjà validée", () => {
  it("ne détecte PAS de TTE quand aucune allure seuil existante n'est fournie (même avec un effort long et stable)", () => {
    const session = buildRunSession([
      { speedMs: 3.0, durationSec: 300 },
      { speedMs: 4.2, durationSec: 900 }, // 15 min stable — ressemble à une TTE
      { speedMs: 2.0, durationSec: 300 },
    ]);
    const runBestEfforts = calculateRunBestEfforts(session.records);
    const result = detectRunTestType(session, runBestEfforts); // pas de seuil fourni

    expect(result.type).not.toBe("TTE_THRESHOLD");
  });

  it("détecte une TTE quand une allure seuil déjà validée est fournie et tenue en continu", () => {
    const existingPaceSecPerKm = Math.round(1000 / 4.2); // même allure que ci-dessus
    const session = buildRunSession([
      { speedMs: 3.0, durationSec: 300 },
      { speedMs: 4.2, durationSec: 900 },
      { speedMs: 2.0, durationSec: 300 },
    ]);
    const runBestEfforts = calculateRunBestEfforts(session.records);
    const result = detectRunTestType(session, runBestEfforts, existingPaceSecPerKm);

    expect(result.type).toBe("TTE_THRESHOLD");
  });
});

describe("detectRunTestType — aucune donnée de vitesse", () => {
  it("retourne UNKNOWN quand la séance n'a aucune donnée de vitesse/allure", () => {
    const session: FitSession = {
      startTime: new Date(),
      sport: "running",
      totalTimeSec: 600,
      movingTimeSec: 600,
      totalDistance: 0,
      records: [{ timestamp: new Date(), heartRate: 150 }],
      laps: [],
    };
    const result = detectRunTestType(session, {});
    expect(result.type).toBe("UNKNOWN");
    expect(result.confidence).toBe(0);
  });
});
