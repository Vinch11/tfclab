import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import fixture from "../_shared/fixtures/currentRepairCatalog.json" with { type: "json" };
import { isCompleteRepairWorkoutMetadata, type RepairWorkoutMetadata } from "../_shared/repairSportingEquivalence.ts";
import { applySLFloorEnforcement } from "./jsonPlanHandler.ts";

// Tables produites par serializeCatalogForPrompt (contrat Vitest associé).
// Les anciens tests utilisaient une table sans Intention/Zone-cible et ne
// reproduisaient pas le pool vide observé sur les captures 703.
const entries = fixture.entries.map((entry): RepairWorkoutMetadata => {
  assert(isCompleteRepairWorkoutMetadata(entry), "fixture de métadonnées complètes");
  return entry;
});
const floors = { weekType: "load", longRideWeekly: true, longRunWeekly: false, slLongRideMin: 120 };
function makeChunk() {
  return { weeks: [{ weekNumber: 1, phase: "base", sessions: [{
    day: "samedi", sport: "bike", title: entries[0].title, details: entries[0].structure,
    catalogId: entries[0].id, custom: false, durationMin: 80, zones: ["Z2"],
  }] }] };
}
function dump(format: keyof typeof fixture.tables) {
  return `#### 🚴 Vélo\n${fixture.tables[format]}`;
}
for (const format of ["standard", "trailAvoid"] as const) {
  Deno.test(`catalogue ${format} réel : métadonnées complètes + IDs injectés → SL compatible, pas candidates=0`, () => {
    const chunk = makeChunk();
    const result = applySLFloorEnforcement([chunk] as any, { 1: floors }, [dump(format)], [entries], "703");
    assertEquals(chunk.weeks[0].sessions[0].catalogId, "LONG_BIKE_EASY");
    assertEquals(chunk.weeks[0].sessions[0].durationMin, 120);
    assert(result.repairs.some(r => r.code === "sl_upgraded"));
    assert(!result.repairs.some(r => r.code === "sl_upgrade_unresolved"));
  });
}

for (const mismatch of ["phase", "intensity"] as const) {
  Deno.test(`catalogue réel : le pool restauré ne contourne pas l'équivalence ${mismatch}`, () => {
    const metadata = structuredClone(entries);
    if (mismatch === "phase") metadata[1].phases = ["build", "peak"];
    else {
      metadata[1].intentFamily = "seuil";
      metadata[1].mainZoneMax = 4;
      metadata[1].structure = "Travail au seuil Z4";
      metadata[1].zones = ["Z4"];
    }
    const chunk = makeChunk();
    const result = applySLFloorEnforcement([chunk] as any, { 1: floors }, [dump("standard")], [metadata], "703");
    assertEquals(chunk.weeks[0].sessions[0].catalogId, entries[0].id);
    assert(result.repairs.some(r => r.code === "sl_upgrade_unresolved" && r.severity === "critical"));
  });
}

Deno.test("catalogue réel : une métadonnée hors des IDs injectés ne devient pas un candidat", () => {
  const restricted = dump("standard").split("\n").filter(l => !l.startsWith("| LONG_BIKE_EASY |")).join("\n");
  const chunk = makeChunk();
  const result = applySLFloorEnforcement([chunk] as any, { 1: floors }, [restricted], [entries], "703");
  assertEquals(chunk.weeks[0].sessions[0].catalogId, entries[0].id);
  assert(result.repairs.some(r => r.code === "sl_upgrade_unresolved"));
});

Deno.test("catalogue réel sans métadonnées : aucune réparation depuis le seul texte", () => {
  const chunk = makeChunk();
  const result = applySLFloorEnforcement([chunk] as any, { 1: floors }, [dump("standard")], undefined, "703");
  assertEquals(chunk.weeks[0].sessions[0].catalogId, entries[0].id);
  assert(result.repairs.some(r => r.code === "sl_upgrade_unresolved" && r.severity === "critical"));
});
