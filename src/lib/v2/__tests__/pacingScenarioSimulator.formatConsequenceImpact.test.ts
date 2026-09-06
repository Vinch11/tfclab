import { describe, it, expect } from "vitest";
import { formatConsequenceImpact, type PacingScenario } from "../pacingScenarioSimulator";

/**
 * Bug réel (audit "simulation course/nutrition", passe 3). Le scénario
 * "controlled_negative_split" utilise des valeurs NÉGATIVES pour
 * glycogenImpactPct/performanceLossPct (épargne glycogène / gain de
 * performance, cf. sa définition : glycogenImpactPct: -8 // épargne,
 * performanceLossPct: -2 // gain net). `formatConsequenceImpact`
 * préfixait un "-" en dur, produisant un double signe moins
 * ("Glycogène: --8% | Perf: --2%") pour le seul scénario censé présenter
 * un gain plutôt qu'un coût.
 */
function makeScenario(glycogenImpactPct: number, performanceLossPct: number): PacingScenario {
  return {
    id: "test",
    type: "controlled_negative_split",
    title: "Test",
    condition: { description: "", intensityOverPct: 0, durationMinutes: 0, phase: "start" },
    consequence: { description: "", severity: "low", glycogenImpactPct, performanceLossPct },
  } as PacingScenario;
}

describe("formatConsequenceImpact — signe correct pour les scénarios à impact négatif (gain, pas coût)", () => {
  it("valeurs positives (coût) : préfixées par '-', pas de double signe", () => {
    expect(formatConsequenceImpact(makeScenario(18, 6))).toBe("Glycogène: -18% | Perf: -6%");
  });

  it("valeurs négatives (épargne/gain, cas 'controlled_negative_split') : préfixées par '+', jamais '--'", () => {
    const result = formatConsequenceImpact(makeScenario(-8, -2));
    expect(result).toBe("Glycogène: +8% | Perf: +2%");
    expect(result).not.toContain("--");
  });

  it("zéro : traité comme neutre ('-0%'), pas de comportement surprenant", () => {
    expect(formatConsequenceImpact(makeScenario(0, 0))).toBe("Glycogène: -0% | Perf: -0%");
  });
});
