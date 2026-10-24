import { describe, expect, it } from "vitest";
import fixture from "../../../supabase/functions/_shared/fixtures/currentRepairCatalog.json";
import { serializeCatalogForPrompt } from "../workoutCatalogBuilder";

// La même table est consommée par les tests Deno de réparation. Ne pas
// remplacer ce contrat par une table simplifiée à six colonnes.
describe("catalogue réel → pool de réparation serveur : contrat de sérialisation", () => {
  it.each(["standard", "trailAvoid"] as const)("préserve la table consommée par le serveur : %s", (format) => {
    const entries = fixture.entries.map(m => ({
      id: m.id, cat: "A", sport: m.sport, objectif: m.title, phase: m.phases,
      durationMin: m.durationMin as [number, number], canonicalDurationMin: m.durationMin[0], structure: m.structure,
      ...(format === "trailAvoid" ? { dPlusTargetM: 500, avoid: "Fatigue accumulée" } : {}),
    }));
    const table = serializeCatalogForPrompt(entries).split("\n").filter(l => l.startsWith("|")).join("\n");
    expect(table).toBe(fixture.tables[format]);
  });
});
