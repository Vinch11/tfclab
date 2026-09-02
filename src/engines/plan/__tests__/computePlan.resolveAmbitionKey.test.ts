import { describe, it, expect } from "vitest";
import { resolveAmbitionKey } from "../computePlan";
import type { PlanGenerationConfig } from "../types";

/**
 * `resolveAmbitionKey` évite que `deriveRaceTargets`/`deriveTriathlonZones`
 * (client, computePlan.ts) reçoivent le libellé UI ("Elite") au lieu de la
 * clé canonique ("world_class") — ces fonctions font un lookup exact sur la
 * clé interne historique "elite" (ancien palier, libellé "Qualifiable"
 * depuis le relabeling), qui collisionne avec le libellé actuel "Elite".
 * Priorité : `config.ambitionMeta.effective` (clé déjà résolue par
 * buildPlanConfigFromDiagnostic) si présent, sinon fallback sur
 * normalizeAmbitionLevel(config.ambition).
 */
describe("resolveAmbitionKey", () => {
  it("préfère ambitionMeta.effective (clé canonique) au libellé config.ambition", () => {
    const config = {
      objective: "703",
      weeksAvailable: 10,
      mode: "ai",
      ambition: "Elite", // libellé UI de world_class
      ambitionMeta: { effective: "world_class" },
    } as unknown as PlanGenerationConfig;
    expect(resolveAmbitionKey(config)).toBe("world_class");
  });

  it("fallback sur normalizeAmbitionLevel(config.ambition) si ambitionMeta absent", () => {
    const config: PlanGenerationConfig = {
      objective: "703",
      weeksAvailable: 10,
      mode: "ai",
      ambition: "world_class", // déjà une clé canonique
    };
    expect(resolveAmbitionKey(config)).toBe("world_class");
  });

  it("le libellé 'Elite' SANS ambitionMeta retombe sur l'ancien palier interne 'elite' (défaut prudent) — " +
     "c'est pourquoi tous les appelants réels de resolveAmbitionKey fournissent toujours ambitionMeta " +
     "(spread depuis buildPlanConfigFromDiagnostic) : normalizeAmbitionLevel ne peut pas distinguer sans " +
     "contexte un libellé 'Elite' d'une clé brute 'elite' légitime (ex. athlete.refs.ambition en base)", () => {
    const config: PlanGenerationConfig = {
      objective: "703",
      weeksAvailable: 10,
      mode: "ai",
      ambition: "Elite",
    };
    expect(resolveAmbitionKey(config)).toBe("elite");
  });

  it("'Qualifiable' (ancien palier elite) reste bien elite, jamais promu world_class", () => {
    const config: PlanGenerationConfig = {
      objective: "703",
      weeksAvailable: 10,
      mode: "ai",
      ambition: "Qualifiable",
    };
    expect(resolveAmbitionKey(config)).toBe("elite");
  });
});
