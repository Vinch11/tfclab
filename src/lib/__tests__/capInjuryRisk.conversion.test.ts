import { describe, it, expect } from "vitest";
import {
  computeCAPInjuryRiskIndex,
  capRiskToRunInjuryRiskShape,
  capRiskToWahooVocabulary,
  type CAPInjuryRiskResult,
} from "@/lib/capInjuryRisk";

function makeRisk(level: 0 | 1 | 2 | 3, totalScore: number): Pick<CAPInjuryRiskResult, "level" | "totalScore"> {
  return { level, totalScore };
}

describe("capRiskToRunInjuryRiskShape — conversion échelle 0-4 → score 0-100 / vocabulaire ASCII", () => {
  it("le pire cas (level 3, totalScore 4) atteint CRITIQUE et un score proche de 100", () => {
    const shape = capRiskToRunInjuryRiskShape(makeRisk(3, 4));
    expect(shape.level).toBe("CRITIQUE");
    expect(shape.score).toBe(100);
  });

  it("le meilleur cas (level 0, totalScore 0) atteint FAIBLE et un score bas", () => {
    const shape = capRiskToRunInjuryRiskShape(makeRisk(0, 0));
    expect(shape.level).toBe("FAIBLE");
    expect(shape.score).toBe(0);
  });

  it("mapping ordinal croissant sur les 4 paliers (aucune inversion de sévérité)", () => {
    const scores = ([0, 1, 2, 3] as const).map((lvl) => capRiskToRunInjuryRiskShape(makeRisk(lvl, lvl)).score);
    expect(scores[0]).toBeLessThan(scores[1]);
    expect(scores[1]).toBeLessThan(scores[2]);
    expect(scores[2]).toBeLessThan(scores[3]);
  });

  it("Régression : un score converti dépasse désormais le seuil rouge (>60) du badge WeekSelectorTFCL pour un risque réellement élevé", () => {
    // Avant le fix : `totalScore` (max 4) était utilisé tel quel comme score
    // 0-100 → toujours ≤30 → badge TOUJOURS vert, quel que soit le risque
    // réel. Seuils réels du composant : score>60 → rouge (getRiskColor).
    const worstCase = computeCAPInjuryRiskIndex({ vlamaxValue: 0.6, tteValue: 10, objectif: "IM" });
    expect(worstCase.level).toBe(3);
    const shape = capRiskToRunInjuryRiskShape(worstCase);
    expect(shape.score).toBeGreaterThan(60);
  });
});

describe("capRiskToWahooVocabulary — conversion échelle 0-4 → 3 paliers français", () => {
  it("level 3 → élevé (déclenche les garde-fous d'intensité du moteur de suggestions Wahoo)", () => {
    expect(capRiskToWahooVocabulary(makeRisk(3, 4))).toBe("élevé");
  });
  it("level 2 → modéré", () => {
    expect(capRiskToWahooVocabulary(makeRisk(2, 3))).toBe("modéré");
  });
  it("level 0 et 1 → faible", () => {
    expect(capRiskToWahooVocabulary(makeRisk(0, 0))).toBe("faible");
    expect(capRiskToWahooVocabulary(makeRisk(1, 2))).toBe("faible");
  });
});
