import { describe, it, expect } from "vitest";
import { computePotentielRun, applyReadinessToDecision, type AvailabilityRun } from "../potentielTypes";

/**
 * Remplace le stub qui retournait toujours readiness_score=70 / GREEN quelle
 * que soit la disponibilité passée, et applyReadinessToDecision qui
 * retournait toujours `{}` (détruisant la décision hebdo réelle en aval —
 * cf. "Invalid Date" sur WeeklyDecisionCard, qui lit decision.week_start_date).
 */

const FRESH: AvailabilityRun = {
  sleep_quality: 5,
  fatigue_level: 1,
  muscle_soreness: 0,
  pain_flag: false,
  mental_stress: 1,
  motivation: 5,
};

const EXHAUSTED: AvailabilityRun = {
  sleep_quality: 1,
  fatigue_level: 5,
  muscle_soreness: 9,
  pain_flag: false,
  mental_stress: 5,
  motivation: 1,
};

const INJURED: AvailabilityRun = {
  sleep_quality: 3,
  fatigue_level: 4,
  muscle_soreness: 6,
  pain_flag: true,
  mental_stress: 3,
  motivation: 2,
};

describe("computePotentielRun", () => {
  it("renvoie GREEN et un score élevé pour une disponibilité fraîche", () => {
    const r = computePotentielRun({ athlete_id: "a1" }, FRESH);
    expect(r.readiness_state).toBe("GREEN");
    expect(r.readiness_score).toBeGreaterThanOrEqual(80);
  });

  it("renvoie RED et un score bas pour une disponibilité épuisée — pas GREEN/70 en dur", () => {
    const r = computePotentielRun({ athlete_id: "a1" }, EXHAUSTED);
    expect(r.readiness_state).toBe("RED");
    expect(r.readiness_score).toBeLessThan(40);
  });

  it("force RED dès que pain_flag est vrai, quel que soit le reste", () => {
    const r = computePotentielRun({ athlete_id: "a1" }, INJURED);
    expect(r.readiness_state).toBe("RED");
    expect(r.limiting_factor).toBe("PAIN");
  });

  it("deux disponibilités différentes produisent des scores différents (pas une constante figée)", () => {
    const fresh = computePotentielRun({ athlete_id: "a1" }, FRESH);
    const exhausted = computePotentielRun({ athlete_id: "a1" }, EXHAUSTED);
    expect(fresh.readiness_score).not.toBe(exhausted.readiness_score);
  });

  it("porte l'athlete_id du profil, pas une chaîne vide", () => {
    const r = computePotentielRun({ athlete_id: "athlete-42" }, FRESH);
    expect(r.athlete_id).toBe("athlete-42");
  });
});

describe("applyReadinessToDecision", () => {
  const baseDecision = {
    week_start_date: "2026-08-24",
    strategy_status: "CONTINUE",
    constraints: {
      intensity_allowed: "HIGH" as const,
      longrun_allowed: true,
      speedwork_allowed: true,
      max_key_sessions: 3,
    },
    watchouts: [] as string[],
  };

  it("ne détruit plus la décision de base — pas d'objet vide", () => {
    const potentiel = computePotentielRun({ athlete_id: "a1" }, FRESH);
    const result = applyReadinessToDecision(baseDecision, potentiel);
    expect(result.week_start_date).toBe("2026-08-24");
    expect(result.strategy_status).toBe("CONTINUE");
  });

  it("resserre les contraintes quand le readiness du jour est RED", () => {
    const potentiel = computePotentielRun({ athlete_id: "a1" }, EXHAUSTED);
    const result = applyReadinessToDecision(baseDecision, potentiel);
    expect(result.constraints.intensity_allowed).toBe("LOW");
    expect(result.constraints.speedwork_allowed).toBe(false);
    expect(result.constraints.max_key_sessions).toBe(0);
  });

  it("laisse la décision de base inchangée quand le readiness du jour est GREEN", () => {
    const potentiel = computePotentielRun({ athlete_id: "a1" }, FRESH);
    const result = applyReadinessToDecision(baseDecision, potentiel);
    expect(result).toEqual(baseDecision);
  });

  it("n'assouplit jamais une décision de base déjà prudente (ADJUST/DELOAD hebdo + readiness ORANGE du jour)", () => {
    const cautiousBase = {
      ...baseDecision,
      constraints: { intensity_allowed: "LOW" as const, longrun_allowed: false, speedwork_allowed: false, max_key_sessions: 0 },
    };
    const orangePotentiel = { ...computePotentielRun({ athlete_id: "a1" }, FRESH), readiness_state: "ORANGE" as const };
    const result = applyReadinessToDecision(cautiousBase, orangePotentiel);
    expect(result.constraints.intensity_allowed).toBe("LOW");
    expect(result.constraints.max_key_sessions).toBe(0);
  });
});
