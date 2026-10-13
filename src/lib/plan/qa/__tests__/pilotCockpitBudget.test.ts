import { describe, it, expect, beforeEach } from "vitest";
import {
  checkBudgetBeforeLaunch, computeCumulative, appendRun, readBudgetState,
  resetBudgetState, defaultBudgetState, CREDIT_PER_CHUNK_LOW, CREDIT_PER_CHUNK_HIGH,
  type PilotRunRecord,
} from "../pilotCockpitBudget";

/**
 * Préparation pilote Mode B (consigne coach) — vérifie le calcul de
 * budget AVANT lancement et son stockage localStorage. Consigne explicite
 * à vérifier dans ces tests : le check est une ESTIMATION, jamais un
 * blocage garanti — `checkBudgetBeforeLaunch` ne fait QUE retourner un
 * niveau d'alerte, il n'empêche rien lui-même.
 */
describe("checkBudgetBeforeLaunch", () => {
  it("niveau 'ok' quand la projection reste sous le seuil d'alerte", () => {
    const state = { ...defaultBudgetState(), runs: [] };
    const result = checkBudgetBeforeLaunch(state, 2); // débutant, 2 chunks
    expect(result.level).toBe("ok");
    expect(result.projectedLow).toBeCloseTo(2 * CREDIT_PER_CHUNK_LOW, 5);
    expect(result.projectedHigh).toBeCloseTo(2 * CREDIT_PER_CHUNK_HIGH, 5);
  });

  it("niveau 'warning' quand la projection dépasse le seuil d'alerte (8) sans dépasser le max (10)", () => {
    // Cumul déjà à 7 crédits (runs fictifs), + un profil à 4 chunks (haut: 1.08) → 8.08 > 8
    const runs: PilotRunRecord[] = [
      { profileId: "X", ts: 0, chunks: 10, estimatedCreditsLow: 7, estimatedCreditsHigh: 7 },
    ];
    const state = { ...defaultBudgetState(), runs };
    const result = checkBudgetBeforeLaunch(state, 4); // marathon/ironman, 4 chunks
    expect(result.level).toBe("warning");
  });

  it("niveau 'over' quand la projection haute dépasse le budget maximal (10)", () => {
    const runs: PilotRunRecord[] = [
      { profileId: "X", ts: 0, chunks: 10, estimatedCreditsLow: 9, estimatedCreditsHigh: 9.5 },
    ];
    const state = { ...defaultBudgetState(), runs };
    const result = checkBudgetBeforeLaunch(state, 4);
    expect(result.level).toBe("over");
  });

  it("le message précise explicitement que ce n'est pas un blocage automatique garanti (niveaux warning/over)", () => {
    const runsOverThreshold: PilotRunRecord[] = [
      { profileId: "X", ts: 0, chunks: 10, estimatedCreditsLow: 7, estimatedCreditsHigh: 7 },
    ];
    const warning = checkBudgetBeforeLaunch({ ...defaultBudgetState(), runs: runsOverThreshold }, 4);
    expect(warning.level).toBe("warning");
    expect(warning.message).toMatch(/pas un blocage automatique garanti/);

    const runsOverMax: PilotRunRecord[] = [
      { profileId: "X", ts: 0, chunks: 10, estimatedCreditsLow: 9, estimatedCreditsHigh: 9.5 },
    ];
    const over = checkBudgetBeforeLaunch({ ...defaultBudgetState(), runs: runsOverMax }, 4);
    expect(over.level).toBe("over");
    expect(over.message).toMatch(/pas un blocage automatique garanti/);
  });

  it("reste 'ok' avec 0 run antérieur et un petit profil (débutant, 2 chunks) — jamais un faux avertissement au premier lancement", () => {
    const result = checkBudgetBeforeLaunch(defaultBudgetState(), 2);
    expect(result.level).toBe("ok");
  });
});

describe("computeCumulative", () => {
  it("additionne low/high/tokens réels sur plusieurs runs", () => {
    const runs: PilotRunRecord[] = [
      { profileId: "A", ts: 0, chunks: 2, estimatedCreditsLow: 0.3, estimatedCreditsHigh: 0.54, realTotalTokens: 1000 },
      { profileId: "B", ts: 1, chunks: 3, estimatedCreditsLow: 0.45, estimatedCreditsHigh: 0.81 },
    ];
    const cum = computeCumulative(runs);
    expect(cum.low).toBeCloseTo(0.75, 5);
    expect(cum.high).toBeCloseTo(1.35, 5);
    expect(cum.runsCount).toBe(2);
    expect(cum.realTotalTokens).toBe(1000);
    expect(cum.hasRealUsage).toBe(true);
  });

  it("aucun run → tout à zéro, hasRealUsage=false", () => {
    const cum = computeCumulative([]);
    expect(cum).toEqual({ low: 0, high: 0, runsCount: 0, realTotalTokens: 0, hasRealUsage: false });
  });
});

describe("appendRun / readBudgetState / resetBudgetState (localStorage)", () => {
  beforeEach(() => {
    resetBudgetState();
  });

  it("persiste un run et le relit via readBudgetState", () => {
    appendRun({ profileId: "B-5K-BEGINNER", ts: 123, chunks: 3, estimatedCreditsLow: 0.45, estimatedCreditsHigh: 0.81 });
    const state = readBudgetState();
    expect(state.runs).toHaveLength(1);
    expect(state.runs[0].profileId).toBe("B-5K-BEGINNER");
  });

  it("accumule plusieurs runs dans l'ordre d'ajout", () => {
    appendRun({ profileId: "B-5K-BEGINNER", ts: 1, chunks: 3, estimatedCreditsLow: 0.45, estimatedCreditsHigh: 0.81 });
    appendRun({ profileId: "B-10K", ts: 2, chunks: 3, estimatedCreditsLow: 0.45, estimatedCreditsHigh: 0.81 });
    const state = readBudgetState();
    expect(state.runs.map((r) => r.profileId)).toEqual(["B-5K-BEGINNER", "B-10K"]);
  });

  it("resetBudgetState() vide l'historique", () => {
    appendRun({ profileId: "B-5K-BEGINNER", ts: 1, chunks: 3, estimatedCreditsLow: 0.45, estimatedCreditsHigh: 0.81 });
    resetBudgetState();
    expect(readBudgetState().runs).toHaveLength(0);
  });

  it("readBudgetState() sans historique renvoie les seuils par défaut (10 max / 8 alerte)", () => {
    const state = readBudgetState();
    expect(state.maxCredits).toBe(10);
    expect(state.alertCredits).toBe(8);
    expect(state.runs).toEqual([]);
  });
});
