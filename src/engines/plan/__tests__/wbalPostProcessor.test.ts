/**
 * Tests unitaires — wbalPostProcessor
 *
 * Vérifie :
 *  1. La détection des patterns d'intervalles (5×4min, 8 x 3 min, 6×30s, etc.)
 *  2. La substitution effective du temps de repos via W'bal pour des
 *     athlètes ayant un CP/W' calculable.
 *  3. Le no-op silencieux quand l'athlète manque de données.
 */

import { describe, it, expect } from "vitest";
import {
  detectInterval,
  isCyclingSession,
  applyWbalRecoveryRecalc,
} from "../wbalPostProcessor";
import type { ParsedPlan, ParsedSession, PlanAthleteData } from "../types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Test",
    phase: "build",
    dayName: "Mardi",
    dayIndex: 1,
    sport: "Vélo",
    title: "Intervalles",
    details: "",
    isRest: false,
    ...overrides,
  };
}

function makePlan(sessions: ParsedSession[]): ParsedPlan {
  return {
    weeks: [
      {
        weekNumber: 1,
        theme: "Test",
        phase: "build",
        sessions,
      },
    ],
  } as ParsedPlan;
}

// Athlète bien profilé : CP/W' calculable depuis P30s/P60s/MAP
const ATHLETE_FULL: PlanAthleteData = {
  pmax5s: 1100,
  p30s: 750,
  p60s: 480,
  map5min: 360,
  ftp: 280,
  weightKg: 72,
} as PlanAthleteData;

// Athlète sans données puissance → CP/W' non calculable
const ATHLETE_EMPTY: PlanAthleteData = {
  ftp: 250,
  weightKg: 70,
} as PlanAthleteData;

// ═══════════════════════════════════════════════════════════════════════════
// 1) DÉTECTION DES PATTERNS D'INTERVALLES
// ═══════════════════════════════════════════════════════════════════════════

describe("detectInterval — pattern recognition", () => {
  it("détecte le format compact '5×4min @ 110%FTP, R=3min'", () => {
    const det = detectInterval("5×4min @ 110%FTP, R=3min");
    expect(det).not.toBeNull();
    expect(det!.reps).toBe(5);
    expect(det!.durationSec).toBe(240);
    expect(det!.pctIntensity).toBe(110);
    expect(det!.intensityRef).toBe("FTP");
    expect(det!.originalRestSec).toBe(180);
  });

  it("détecte le format espacé '8 x 3 min à 105% FTP — repos 2min'", () => {
    const det = detectInterval("8 x 3 min à 105% FTP — repos 2min");
    expect(det).not.toBeNull();
    expect(det!.reps).toBe(8);
    expect(det!.durationSec).toBe(180);
    expect(det!.pctIntensity).toBe(105);
    expect(det!.intensityRef).toBe("FTP");
    expect(det!.originalRestSec).toBe(120);
  });

  it("détecte le format court '6×30s @ 130%FTP R=30s'", () => {
    const det = detectInterval("6×30s @ 130%FTP R=30s");
    expect(det).not.toBeNull();
    expect(det!.reps).toBe(6);
    expect(det!.durationSec).toBe(30);
    expect(det!.pctIntensity).toBe(130);
    expect(det!.intensityRef).toBe("FTP");
    expect(det!.originalRestSec).toBe(30);
  });

  it("détecte un format basé sur CP '4×5min @ 108%CP, R=4min'", () => {
    const det = detectInterval("4×5min @ 108%CP, R=4min");
    expect(det).not.toBeNull();
    expect(det!.intensityRef).toBe("CP");
    expect(det!.reps).toBe(4);
    expect(det!.durationSec).toBe(300);
    expect(det!.originalRestSec).toBe(240);
  });

  it("rejette une intensité absurde (300%FTP)", () => {
    const det = detectInterval("5×4min @ 300%FTP, R=3min");
    expect(det).toBeNull();
  });

  it("rejette un nombre de reps invalide (1 rep)", () => {
    const det = detectInterval("1×4min @ 110%FTP, R=3min");
    expect(det).toBeNull();
  });

  it("rejette un texte sans pattern d'intervalle", () => {
    const det = detectInterval("Sortie endurance 90 min Z2");
    expect(det).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2) DÉTECTION DU SPORT VÉLO
// ═══════════════════════════════════════════════════════════════════════════

describe("isCyclingSession", () => {
  it.each([
    ["Vélo"],
    ["velo"],
    ["Bike"],
    ["Cyclisme"],
    ["Cycle"],
  ])("identifie '%s' comme une séance vélo", (sport) => {
    expect(isCyclingSession(makeSession({ sport }))).toBe(true);
  });

  it.each([["Course"], ["Natation"], ["Renforcement"], ["Repos"]])(
    "rejette '%s' comme non-vélo",
    (sport) => {
      expect(isCyclingSession(makeSession({ sport }))).toBe(false);
    }
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// 3) SUBSTITUTION DU REPOS — applyWbalRecoveryRecalc
// ═══════════════════════════════════════════════════════════════════════════

describe("applyWbalRecoveryRecalc — substitution du repos", () => {
  it("réécrit le repos pour un format '5×4min @ 110%FTP, R=3min'", () => {
    const session = makeSession({
      details: "5×4min @ 110%FTP, R=3min",
    });
    const plan = makePlan([session]);

    const stats = applyWbalRecoveryRecalc(plan, ATHLETE_FULL);

    expect(stats.scanned).toBe(1);
    expect(stats.rewritten).toBe(1);
    expect(stats.skipped).toBe(0);
    // L'annotation W'bal est ajoutée
    expect(session.details).toMatch(/\*\[W'bal:.*reps max.*\]\*/);
    // Le pattern de repos a bien été substitué (R=... reste mais avec une valeur recalculée)
    expect(session.details).toMatch(/R\s*=\s*\d+(min|s)/i);
  });

  it("réécrit le repos pour '8 x 3 min à 105% FTP — repos 2min'", () => {
    const session = makeSession({
      details: "8 x 3 min à 105% FTP — repos 2min",
    });
    const plan = makePlan([session]);

    const stats = applyWbalRecoveryRecalc(plan, ATHLETE_FULL);

    expect(stats.rewritten).toBe(1);
    expect(session.details).toMatch(/repos\s*\d+(min|s)/i);
    expect(session.details).toContain("W'bal");
  });

  it("réécrit le repos pour '6×30s @ 130%FTP R=30s'", () => {
    const session = makeSession({
      details: "6×30s @ 130%FTP R=30s",
    });
    const plan = makePlan([session]);

    const stats = applyWbalRecoveryRecalc(plan, ATHLETE_FULL);

    expect(stats.rewritten).toBe(1);
    expect(session.details).toMatch(/R\s*=\s*\d+(min|s)/i);
    expect(session.details).toContain("W'bal");
  });

  it("ignore une séance non-vélo même avec un pattern d'intervalle", () => {
    const session = makeSession({
      sport: "Course",
      details: "5×4min @ 110%FTP, R=3min",
    });
    const plan = makePlan([session]);

    const stats = applyWbalRecoveryRecalc(plan, ATHLETE_FULL);

    expect(stats.scanned).toBe(0);
    expect(stats.rewritten).toBe(0);
    expect(session.details).toBe("5×4min @ 110%FTP, R=3min");
  });

  it("ignore une séance de repos", () => {
    const session = makeSession({
      isRest: true,
      details: "5×4min @ 110%FTP, R=3min",
    });
    const plan = makePlan([session]);

    const stats = applyWbalRecoveryRecalc(plan, ATHLETE_FULL);

    expect(stats.scanned).toBe(0);
    expect(stats.rewritten).toBe(0);
  });

  it("skip un intervalle sub-CP (pas de déplétion W')", () => {
    const session = makeSession({
      details: "5×8min @ 85%FTP, R=2min",
    });
    const plan = makePlan([session]);

    const stats = applyWbalRecoveryRecalc(plan, ATHLETE_FULL);

    expect(stats.scanned).toBe(1);
    expect(stats.skipped).toBe(1);
    expect(stats.rewritten).toBe(0);
    // Aucune annotation W'bal ajoutée
    expect(session.details).not.toContain("W'bal");
  });

  it("no-op silencieux quand l'athlète n'a pas de CP/W' calculable", () => {
    const session = makeSession({
      details: "5×4min @ 110%FTP, R=3min",
    });
    const original = session.details;
    const plan = makePlan([session]);

    const stats = applyWbalRecoveryRecalc(plan, ATHLETE_EMPTY);

    expect(stats.scanned).toBe(0);
    expect(stats.rewritten).toBe(0);
    expect(session.details).toBe(original);
  });

  it("traite plusieurs sessions vélo dans un même plan", () => {
    const sessions = [
      makeSession({ details: "5×4min @ 110%FTP, R=3min" }),
      makeSession({ details: "8 x 3 min à 105% FTP — repos 2min", dayName: "Jeudi", dayIndex: 3 }),
      makeSession({ details: "6×30s @ 130%FTP R=30s", dayName: "Samedi", dayIndex: 5 }),
      makeSession({ sport: "Course", details: "Footing 60min Z2", dayName: "Vendredi", dayIndex: 4 }),
    ];
    const plan = makePlan(sessions);

    const stats = applyWbalRecoveryRecalc(plan, ATHLETE_FULL);

    expect(stats.scanned).toBe(3); // 3 sessions vélo
    expect(stats.rewritten).toBe(3); // toutes supra-CP
    expect(stats.skipped).toBe(0);

    // Toutes les sessions vélo ont l'annotation
    expect(sessions[0].details).toContain("W'bal");
    expect(sessions[1].details).toContain("W'bal");
    expect(sessions[2].details).toContain("W'bal");
    // La séance course n'est pas touchée
    expect(sessions[3].details).toBe("Footing 60min Z2");
  });

  it("produit un repos prescrit > 0 et borné (sanity check physiologique)", () => {
    const session = makeSession({ details: "5×4min @ 110%FTP, R=3min" });
    const plan = makePlan([session]);

    applyWbalRecoveryRecalc(plan, ATHLETE_FULL);

    // Extraction de la valeur de repos prescrite depuis l'annotation W'bal
    const m = session.details.match(/W'bal:\s*(\d+)(min|s)\s*optimal/i);
    expect(m).not.toBeNull();
    const value = parseInt(m![1], 10);
    const unit = m![2].toLowerCase();
    const restSec = unit.startsWith("min") ? value * 60 : value;
    // Repos plausible entre 30s et 15min
    expect(restSec).toBeGreaterThanOrEqual(30);
    expect(restSec).toBeLessThanOrEqual(900);
  });
});
