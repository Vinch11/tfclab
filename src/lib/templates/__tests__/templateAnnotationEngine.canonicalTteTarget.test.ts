import { describe, it, expect } from "vitest";
import { generateTemplateAnnotations, type AnnotationParams } from "../templateAnnotationEngine";
import { getTTETarget as getCanonicalTTETarget } from "@/lib/physiologicalTargets";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 1) : ce moteur
 * avait sa propre table de cibles TTE hardcodée (IM=55, 703=50, Marathon=45,
 * Semi=40), divergeant de la source canonique (Marathon divergeait dans le
 * MAUVAIS sens : 45 au lieu de 50), alors que tous les moteurs siblings
 * (annotationEngine.ts, wahooWorkoutInterpreter.ts, wahooSuggestionEngine.ts,
 * workoutRecommendationEngine.ts) aliasent déjà physiologicalTargets.ts.
 *
 * Règle B ("TTE sous la cible") se déclenche si value < target - 5.
 * Ancien hardcode local Marathon = 45 → seuil de déclenchement = 40.
 * Cible canonique Marathon = 50 → seuil de déclenchement = 45.
 * TTE = 42 min distingue les deux : ne déclenche PAS avec l'ancien hardcode
 * (42 ≥ 40) mais DOIT déclencher avec la cible canonique (42 < 45).
 */

function baseParams(overrides: Partial<AnnotationParams> = {}): AnnotationParams {
  return {
    athleteGoal: "Marathon",
    vlamaxEffectif: null,
    tteEffectif: null,
    potentielPhysiologique: null,
    ...overrides,
  };
}

describe("generateTemplateAnnotations — cible TTE alignée sur physiologicalTargets.ts", () => {
  it("la cible canonique Marathon est 50, pas l'ancien hardcode local 45", () => {
    expect(getCanonicalTTETarget("Marathon")).toBe(50);
  });

  it("un TTE = 42 min déclenche la règle avec la cible canonique (45) alors que l'ancien hardcode (40) ne l'aurait pas déclenchée", () => {
    const result = generateTemplateAnnotations(
      baseParams({
        tteEffectif: { value: 42, source: "test_labo", confidence: 0.9 },
      })
    );
    const rule = result.find((a) => a.title === "TTE sous la cible");
    expect(rule).toBeDefined();
    expect(rule!.why).toContain("cible 50 min");
  });
});
