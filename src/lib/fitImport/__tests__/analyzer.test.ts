import { describe, it, expect } from "vitest";
import { analyzeFitSession, isRunningSession } from "../analyzer";
import type { FitRecord, FitSession } from "../types";

/**
 * Fix : un semi-marathon avec capteur de puissance course (Stryd) était
 * classé "FTP_20MIN" par detectTestType (qui ne regarde que la forme du
 * signal de puissance, jamais le sport) et affichait une "FTP" de
 * plusieurs centaines de watts, aberrante pour du vélo — bug remonté par
 * le coach après un import de semi-marathon réel via la sonde Nolio.
 */

function buildSteadyPowerSession(overrides: Partial<FitSession> & { watts: number; durationMin: number }): FitSession {
  const { watts, durationMin, ...rest } = overrides;
  const totalSec = durationMin * 60;
  const records: FitRecord[] = [];
  const start = new Date("2026-09-01T08:00:00Z");
  for (let i = 0; i <= totalSec; i++) {
    records.push({
      timestamp: new Date(start.getTime() + i * 1000),
      powerW: watts,
      heartRate: 150,
    });
  }
  return {
    startTime: start,
    endTime: records[records.length - 1].timestamp,
    totalTimeSec: totalSec,
    movingTimeSec: totalSec,
    totalDistance: 0,
    records,
    laps: [],
    avgPower: watts,
    maxPower: watts,
    ...rest,
  };
}

describe("isRunningSession", () => {
  it("détecte une séance course via le champ sport", () => {
    expect(isRunningSession({ sport: "running" } as FitSession)).toBe(true);
    expect(isRunningSession({ sport: "Course à pied" } as FitSession)).toBe(false); // français non reconnu (Nolio traduit côté API, pas dans le .fit)
    expect(isRunningSession({ sport: "trail_running" } as FitSession)).toBe(true);
  });

  it("ne détecte pas une séance vélo comme course", () => {
    expect(isRunningSession({ sport: "cycling" } as FitSession)).toBe(false);
    expect(isRunningSession({ sport: undefined } as FitSession)).toBe(false);
  });
});

describe("analyzeFitSession — sport course vs vélo", () => {
  it("ne calcule ni FTP, ni TTE, ni drift pour une séance de course (semi-marathon avec puissance course)", () => {
    const halfMarathon = buildSteadyPowerSession({ sport: "running", watts: 550, durationMin: 100 });
    const result = analyzeFitSession(halfMarathon);

    expect(result.ftpEstimate).toBeUndefined();
    expect(result.tteObservation).toBeUndefined();
    expect(result.driftAnalysis).toBeUndefined();
    expect(result.mapEstimate).toBeUndefined();
    expect(result.testType.type).toBe("UNKNOWN");
    expect(result.testType.reasoning).toMatch(/course/i);

    // Les best-efforts bruts (puissance course) restent calculés — ce sont
    // eux qui alimentent running_power_* côté FitImportDialog, pas ftpEstimate.
    expect(result.bestEfforts.p20min).toBeCloseTo(550, 0);
  });

  it("calcule bien FTP/TTE pour une séance vélo équivalente (même profil de puissance)", () => {
    const bikeTest = buildSteadyPowerSession({ sport: "cycling", watts: 300, durationMin: 30 });
    const result = analyzeFitSession(bikeTest);

    expect(result.testType.type).toBe("FTP_20MIN");
    expect(result.ftpEstimate).toBeDefined();
    expect(result.ftpEstimate?.ftpWatts).toBeGreaterThan(0);
  });

  it("n'applique pas non plus le calcul FTP/TTE à une séance sans champ sport mais taguée course par le testType manuel", () => {
    // Le sport vient du fichier FIT, jamais du type de test choisi par le
    // coach — même avec un override "FTP_20MIN", une séance sport=running
    // ne doit jamais produire de FTP vélo.
    const halfMarathon = buildSteadyPowerSession({ sport: "running", watts: 550, durationMin: 100 });
    const result = analyzeFitSession(halfMarathon, "FTP_20MIN");

    expect(result.ftpEstimate).toBeUndefined();
  });
});
