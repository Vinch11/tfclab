import { describe, it, expect } from "vitest";
import { computeAmbitionEffective } from "@/lib/ambitionDowngrade";

/**
 * Bug réel signalé par le coach (screenshot UI) : configuration "Niveau
 * d'ambition: Elite" + "Verrouiller l'ambition" cochée, mais la carte
 * Benchmark affichait "Ambition visée : Confirmé".
 *
 * Racine : AMBITION_OPTIONS (AITrainingPlanPage.tsx) construisait le label
 * envoyé à `computeAmbitionEffective` en préfixant l'icône emoji
 * (`"👑 Elite"`). `normalizeAmbitionLevel` ne reconnaît pas ce préfixe et
 * retombe silencieusement sur DEFAULT_AMBITION ("age_group" → "Confirmé").
 * Le fix consiste à transmettre la clé canonique brute ("world_class") plutôt
 * que de la reconvertir en label affichable — ces tests figent le
 * comportement attendu à ce niveau (computeAmbitionEffective / normalize),
 * qui est le point d'entrée réellement cassé par le bug.
 */
describe("computeAmbitionEffective — clé canonique brute vs label emoji (régression)", () => {
  it("clé canonique 'world_class' + lock → reste world_class (Elite)", () => {
    const result = computeAmbitionEffective({
      ambitionSaisie: "world_class",
      trainingLevel: "light",
      tss7d: null,
      lockAmbition: true,
    });
    expect(result.ambitionSaisie).toBe("world_class");
    expect(result.ambitionEffective).toBe("world_class");
    expect(result.downgraded).toBe(false);
  });

  it("label emoji '👑 Elite' (bug) retombe sur le défaut age_group — documente pourquoi on ne doit PAS repasser par un label", () => {
    const result = computeAmbitionEffective({
      ambitionSaisie: "👑 Elite",
      trainingLevel: "light",
      tss7d: null,
      lockAmbition: true,
    });
    expect(result.ambitionSaisie).toBe("age_group");
  });

  it("les 5 clés canoniques + lock ne sont jamais déclassées", () => {
    const keys = ["finisher", "age_group", "competitor", "elite", "world_class"] as const;
    for (const key of keys) {
      const result = computeAmbitionEffective({
        ambitionSaisie: key,
        trainingLevel: "untrained",
        tss7d: null,
        lockAmbition: true,
      });
      expect(result.ambitionSaisie).toBe(key);
      expect(result.ambitionEffective).toBe(key);
    }
  });
});
