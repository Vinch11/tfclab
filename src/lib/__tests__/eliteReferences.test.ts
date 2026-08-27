import { describe, it, expect } from "vitest";
import { getEliteReference, getEliteCeilingReference } from "../eliteReferences";

/**
 * Batch 2 — "absence silencieuse de carte" dans eliteReferences.ts.
 * ELITE_REFS ne couvre que 5 objectifs (IM/703/Marathon/Semi/10K) × 4
 * ambitions (Elite/Competitor/Age Group/Finisher). Pour tout le reste
 * (5K, StartToRun, Trail, Sprint, Olympic, ambition World Class),
 * getEliteReference/getEliteCeilingReference retournent null — le seul
 * consommateur (AIPlanBenchmark.tsx) faisait alors disparaître toute la
 * carte de benchmark sans explication. Ce test documente précisément la
 * couverture actuelle (pour éviter que le gap ne dérive sans qu'on s'en
 * aperçoive) — pas un bug en soi côté données, mais le contrat que
 * AIPlanBenchmark doit gérer explicitement (cf. son fallback "Comparaison
 * indisponible").
 */
describe("eliteReferences — couverture connue (objectifs/ambitions sans référence)", () => {
  it("couvre IM/703/Marathon/Semi/10K pour Elite/Competitor/Age Group/Finisher", () => {
    for (const objective of ["IM", "703", "Marathon", "Semi", "10K"]) {
      for (const ambition of ["ELITE", "COMPETITOR", "AGE_GROUP", "FINISHER"]) {
        expect(getEliteReference(objective, ambition)).not.toBeNull();
      }
    }
  });

  it("ne couvre pas 5K/StartToRun/Trail/Sprint/Olympic (retourne null, pas une erreur)", () => {
    for (const objective of ["5K", "StartToRun", "Trail", "TrailShort", "TrailMountain", "TrailUltra", "Sprint", "Olympic"]) {
      expect(getEliteReference(objective, "AGE_GROUP")).toBeNull();
      expect(getEliteCeilingReference(objective)).toBeNull();
    }
  });

  it("ne couvre pas l'ambition World Class, même pour un objectif par ailleurs couvert", () => {
    expect(getEliteReference("IM", "WORLD_CLASS")).toBeNull();
    expect(getEliteReference("703", "WORLD_CLASS")).toBeNull();
  });
});
