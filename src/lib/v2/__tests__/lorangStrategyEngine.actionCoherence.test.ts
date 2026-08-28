import { describe, it, expect } from "vitest";
import { computeLorangStrategy, type LorangStrategyInput } from "../lorangStrategyEngine";

/**
 * Régression : "Action Principale" affichait parfois "Travail au Seuil"
 * justifié par un excès de VLamax (limiteur glycolytique) — alors que le
 * travail au seuil ne corrige pas la VLamax (c'est Volume Z2 / SFR qui le
 * font). Cas réel : limiteur principal = glycolytique (VLamax 97% au-dessus
 * de la cible), FTP/kg aussi "limiting" mais secondaire.
 *
 * Deux invariants vérifiés :
 * 1. Le levier n°1 (celui qui pilote `mainAction`) doit être un levier
 *    réellement lié au limiteur principal identifié — "Travail au Seuil"
 *    n'obtient la priorité 1 que si FTP/kg/VMA EST le limiteur principal
 *    (motor), pas simplement parce qu'il apparaît "limiting" en plus d'un
 *    autre limiteur plus important.
 * 2. `whyThis` (la justification affichée) doit toujours décrire le levier
 *    n°1 réellement affiché, jamais un levier différent.
 */

function baseInput(overrides: Partial<LorangStrategyInput> = {}): LorangStrategyInput {
  return {
    physiology: {
      vo2max: 55,
      vo2maxTarget: 55,
      ftpKg: 2.8,
      ftpKgTarget: 3.2,
      vlamax: 0.59,
      vlamaxTarget: 0.30,
      tte: 49,
      tteTarget: 54,
      fatmax: 0.5,
      fatmaxTarget: 0.5,
      economy: 70,
    },
    athlete: {
      age: 35,
      discipline: "703",
      ambition: "competitor",
      hasGIIssues: false,
    },
    availability: {
      score: 70,
      level: "moderate",
      hasAlerts: false,
      hrvOutOfRange2Days: false,
    },
    context: {
      daysToRace: 60,
      isRaceWeek: false,
      currentPhase: "build",
    },
    ...overrides,
  };
}

describe("computeLorangStrategy — cohérence Action Principale / levier", () => {
  it("ne propose pas 'Travail au Seuil' comme levier n°1 quand le limiteur principal est glycolytique (VLamax), même si FTP/kg est aussi 'limiting'", () => {
    const input = baseInput({
      unifiedLimiterResult: {
        primaryLimiter: "glycolytic",
        gapAnalysis: [
          { metric: "VLamax", value: 0.59, target: 0.30, gapPercent: 96.7, status: "limiting", weightedImpact: 80 },
          { metric: "FTP/kg", value: 2.8, target: 3.2, gapPercent: -12.5, status: "limiting", weightedImpact: 30 },
          { metric: "TTE", value: 49, target: 54, gapPercent: -9.3, status: "acceptable", weightedImpact: 0 },
        ],
        aerobicWeaknessDetail: "ftp_kg_low",
      },
    });

    const result = computeLorangStrategy(input);

    expect(result.primaryLimiter).toBe("glycolytic");

    const topLever = result.activatedLevers[0];
    expect(topLever?.lever).not.toBe("threshold_work");
    expect(topLever?.lever).toBe("z2_volume");

    // Le levier "Travail au Seuil" reste proposé (FTP/kg est bien limitant),
    // mais en priorité 2, jamais 1, puisqu'il n'est pas le limiteur principal.
    const thresholdLever = result.activatedLevers.find(l => l.lever === "threshold_work");
    expect(thresholdLever?.priority).toBe(2);
  });

  it("whyThis décrit toujours le levier réellement affiché en Action Principale, jamais un autre limiteur", () => {
    const input = baseInput({
      unifiedLimiterResult: {
        primaryLimiter: "glycolytic",
        gapAnalysis: [
          { metric: "VLamax", value: 0.59, target: 0.30, gapPercent: 96.7, status: "limiting", weightedImpact: 80 },
          { metric: "FTP/kg", value: 2.8, target: 3.2, gapPercent: -12.5, status: "limiting", weightedImpact: 30 },
        ],
        aerobicWeaknessDetail: "ftp_kg_low",
      },
    });

    const result = computeLorangStrategy(input);
    const topLever = result.activatedLevers[0];

    expect(topLever).toBeDefined();
    expect(result.summary.whyThis).toBe(topLever!.reason);
    expect(result.summary.mainAction).toBe(`Focus ${topLever!.label}`);
  });

  it("cas aligné : quand FTP/kg EST le limiteur principal (motor), Travail au Seuil obtient bien la priorité 1", () => {
    const input = baseInput({
      physiology: {
        vo2max: 55,
        vo2maxTarget: 55,
        ftpKg: 2.6,
        ftpKgTarget: 3.2,
        vlamax: 0.32,
        vlamaxTarget: 0.30,
        tte: 52,
        tteTarget: 54,
        fatmax: 0.5,
        fatmaxTarget: 0.5,
        economy: 70,
      },
      unifiedLimiterResult: {
        primaryLimiter: "aerobic_engine",
        gapAnalysis: [
          { metric: "FTP/kg", value: 2.6, target: 3.2, gapPercent: -18.75, status: "limiting", weightedImpact: 75 },
        ],
        aerobicWeaknessDetail: "ftp_kg_low",
      },
    });

    const result = computeLorangStrategy(input);
    expect(result.primaryLimiter).toBe("motor");

    const thresholdLever = result.activatedLevers.find(l => l.lever === "threshold_work");
    expect(thresholdLever?.priority).toBe(1);
    expect(result.activatedLevers[0]?.lever).toBe("threshold_work");
    expect(result.summary.whyThis).toBe(thresholdLever!.reason);
  });
});
