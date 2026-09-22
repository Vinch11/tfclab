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
    // Séance course sans données de vitesse/allure GPS (puissance Stryd
    // seule) : la détection de test course (allure) ne peut pas s'appliquer
    // — message précis plutôt qu'un simple "course non applicable" générique.
    expect(result.testType.reasoning).toMatch(/vitesse|allure/i);

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

/**
 * Fix "FTP et TTE mélangés" (demande coach, semaine de test TFCL D5 séparée
 * en D5 FTP dédié + D7 TTE dédié) : la TTE ne doit se mesurer QU'au FTP DÉJÀ
 * validé (existingFtp, ex. celui de D5), jamais à un FTP fraîchement estimé
 * dans la même séance — sinon on retombe exactement dans le mélange
 * méthodologique corrigé (pacing soutenable pour un FTP propre vs pacing
 * poussé à l'échec pour une vraie TTE, contradictoires dans un seul effort).
 */
describe("analyzeFitSession — TTE uniquement au FTP déjà validé, jamais à un FTP frais", () => {
  it("ne calcule aucune TTE quand aucun FTP existant n'est fourni, même si un FTP est fraîchement estimé dans cette séance", () => {
    const bikeTest = buildSteadyPowerSession({ sport: "cycling", watts: 300, durationMin: 30 });
    const result = analyzeFitSession(bikeTest); // pas d'existingFtp

    expect(result.ftpEstimate).toBeDefined(); // FTP frais bien calculé (c'est le jour D5)
    expect(result.tteObservation).toBeUndefined(); // mais pas de TTE tirée de ce même effort
  });

  it("calcule bien une TTE quand un FTP déjà validé est fourni (ex. séance D7, testée au FTP mesuré en D5)", () => {
    const existingFtp = 300;
    // Effort tenu 5 min à 285W (95% du FTP existant) — au-dessus du seuil de
    // calculateTteObservation. Durée courte délibérément (pas un vrai 40-60
    // min de TTE) pour éviter le coût O(n²) de findSteadySegment (détection
    // de type de test, non pertinente ici) sur un grand nombre de records.
    const tteSession = buildSteadyPowerSession({ sport: "cycling", watts: 285, durationMin: 5 });
    const result = analyzeFitSession(tteSession, undefined, existingFtp);

    expect(result.tteObservation).toBeDefined();
    expect(result.tteObservation?.targetFtp).toBe(existingFtp);
    expect(result.tteObservation?.tteMinutes).toBeGreaterThan(4);
  });
});

/**
 * Fix "câblage Nolio → Semaine Test CAP incomplet" (demande coach) : avant ce
 * module, isRunningSession désactivait TOUTE détection pour une séance de
 * course (testType toujours UNKNOWN, aucune métrique). Ces tests vérifient
 * le pipeline complet côté course (allure/vitesse GPS), miroir exact des
 * tests vélo ci-dessus, avec la même règle "TTE jamais au seuil frais".
 */
function buildSteadySpeedSession(overrides: {
  sport?: string;
  speedMs: number;
  durationMin: number;
}): FitSession {
  const { sport = "running", speedMs, durationMin } = overrides;
  const totalSec = durationMin * 60;
  const records: FitRecord[] = [];
  const start = new Date("2026-09-01T08:00:00Z");
  for (let i = 0; i <= totalSec; i++) {
    records.push({
      timestamp: new Date(start.getTime() + i * 1000),
      speed: speedMs,
      heartRate: 155,
    });
  }
  return {
    startTime: start,
    endTime: records[records.length - 1].timestamp,
    sport,
    totalTimeSec: totalSec,
    movingTimeSec: totalSec,
    totalDistance: speedMs * totalSec,
    records,
    laps: [],
  };
}

describe("analyzeFitSession — course : détection réelle du type de test (plus de blanket UNKNOWN)", () => {
  it("détecte un test allure seuil 30 min et estime l'allure seuil", () => {
    const session = buildSteadySpeedSession({ speedMs: 4.0, durationMin: 32 });
    const result = analyzeFitSession(session);

    expect(result.testType.type).toBe("THRESHOLD_RUN_30MIN");
    expect(result.paceThresholdEstimate).toBeDefined();
    expect(result.paceThresholdEstimate?.paceSecPerKm).toBeCloseTo(Math.round(1000 / 4.0), 0);
    // Les champs vélo restent bien vides pour une séance de course
    expect(result.ftpEstimate).toBeUndefined();
    expect(result.mapEstimate).toBeUndefined();
  });

  it("n'estime jamais l'allure seuil pour une séance vélo (garde-fou sport croisé)", () => {
    const bikeTest = buildSteadyPowerSession({ sport: "cycling", watts: 300, durationMin: 30 });
    const result = analyzeFitSession(bikeTest);

    expect(result.paceThresholdEstimate).toBeUndefined();
    expect(result.vmaEstimate).toBeUndefined();
    expect(result.runTteObservation).toBeUndefined();
  });
});

describe("analyzeFitSession — TTE course uniquement à l'allure seuil déjà validée, jamais à une allure fraîche", () => {
  it("ne calcule aucune TTE course quand aucune allure seuil existante n'est fournie, même si une allure seuil est fraîchement estimée dans cette séance", () => {
    const session = buildSteadySpeedSession({ speedMs: 4.0, durationMin: 32 });
    const result = analyzeFitSession(session); // pas d'allure seuil existante

    expect(result.paceThresholdEstimate).toBeDefined(); // allure fraîche bien calculée (c'est le jour D5)
    expect(result.runTteObservation).toBeUndefined(); // mais pas de TTE tirée de ce même effort
  });

  it("calcule bien une TTE course quand une allure seuil déjà validée est fournie (ex. séance D6, testée à l'allure mesurée en D5)", () => {
    const existingPaceSecPerKm = Math.round(1000 / 4.2);
    const session = buildSteadySpeedSession({ speedMs: 4.2, durationMin: 12 });
    const result = analyzeFitSession(session, undefined, undefined, existingPaceSecPerKm);

    expect(result.runTteObservation).toBeDefined();
    expect(result.runTteObservation?.targetPaceSecPerKm).toBe(existingPaceSecPerKm);
    expect(result.runTteObservation?.tteMinutes).toBeGreaterThan(10);
  });
});
