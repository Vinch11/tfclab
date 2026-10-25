import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applySLFloorEnforcement } from "./jsonPlanHandler.ts";
import type { PlanChunk } from "./planSchema.ts";
import type { RepairWorkoutMetadata } from "../_shared/repairSportingEquivalence.ts";
import fixture from "../_shared/fixtures/currentRepairCatalog.json" with { type: "json" };

// Synthetic pools of the reported sizes, NOT the unavailable 37/17 historical IDs.
function metadata(id: string): RepairWorkoutMetadata {
  return { ...structuredClone(fixture.entries[0]), id, durationMin: [120, 150] } as unknown as RepairWorkoutMetadata;
}
function run(count: number, missingOriginal = false) {
  const entries = Array.from({ length: count }, (_, i) => metadata(i === 0 ? "ORIGINAL" : `CANDIDATE_${i}`));
  entries[0] = { ...entries[0], intentFamily: "force", durationMin: [60, 80], zones: ["Z3"], mainZoneMax: 3 };
  entries[1].phases = ["build"];
  entries[2].durationMin = [60, 80];
  entries[3].zones = ["Z4"]; entries[3].mainZoneMax = 4;
  const dump = "| ID | Cat | Objectif | Intention | Phases | Durée | Zone | Structure |\n" + entries.map(e => `| ${e.id} | A | Endurance | aerobic | base | 120 | Z2 | Z2 |`).join("\n") + "\n| DECLARED_WITHOUT_METADATA | A | SL | aerobic | base | 120 | Z2 | Z2 |";
  const outside = metadata("NOT_IN_DUMP");
  const session = { day: "samedi", sport: "bike", title: "Force basse cadence", details: "5x5 min Z3", durationMin: 80,
    custom: false, catalogId: missingOriginal ? "ORIGINAL_NOT_IN_POOL" : "ORIGINAL", isKeySession: true, zones: ["Z3"] };
  const chunk = { weeks: [{ weekNumber: 1, phase: "base", theme: "Fondation", sessions: [session] }] } as PlanChunk;
  const before = structuredClone(chunk);
  const result = applySLFloorEnforcement([chunk], { 1: { weekType: "load", longRideWeekly: true, slLongRideMin: 120,
    floors: { slLongRideMin: 120 }, floorAudit: { version: 1, nominal: 120, individualized: 120 } } }, [dump], [[...entries, outside]], "703");
  assertEquals(chunk, before); // guards still refuse an unjustified force -> SL conversion
  return result;
}
Deno.test("37 same-sport entries: every candidate has all its rejection reasons; exact injected pool is observable", () => {
  const r = run(37); const repair = r.repairs[0]; const audit = repair.diagnostics!;
  assertEquals(repair.code, "sl_upgrade_unresolved"); assertEquals(repair.severity, "critical");
  assertEquals(repair.sameSportCandidatesInChunk, 37); assertEquals(repair.totalCandidatesInChunk, 37);
  assertEquals(audit.candidates.filter(c => c.scope === "chunk").length, 37);
  assert(audit.candidates.every(c => c.excludedBy.length > 0));
  assert(audit.localRejections["intent:force->endurance_fondamentale"] > 0);
  assert(audit.localRejections["phase:base"] > 0);
  assert(audit.localRejections["duration_max_below_floor:120"] > 0);
  assert(audit.localRejections["intensity:tempo_threshold"] > 0);
  assertEquals(audit.injectedIdsWithoutCompleteMetadata, ["DECLARED_WITHOUT_METADATA"]);
  assert(!audit.metadataIdsUsed.includes("NOT_IN_DUMP"));
  assert(repair.nearestCandidates!.length > 0); assertEquals(repair.day, "samedi");
  assertEquals(repair.before.details, undefined);
  assert(r.traces.some(t => t.includes('"stage":"server_received"')));
});
Deno.test("17 entries cannot replace a session whose original metadata is missing; reason is explicit, not relaxed", () => {
  const audit = run(17, true).repairs[0].diagnostics!;
  assertEquals(audit.localRejections.original_metadata_incomplete, 17);
  assertEquals(audit.candidates.filter(c => c.scope === "chunk").length, 17);
});
