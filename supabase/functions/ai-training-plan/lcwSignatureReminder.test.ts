import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { detectLcwFromConfig, buildLcwSignatureReminder } from "./lcwSignatureReminder.ts";

/**
 * Bug réel signalé par le coach (plan LCW "Vince", régénération complète) :
 * un plan LCW 7 semaines est ressorti SANS AUCUNE occurrence de
 * B_LCW_BIKE_LONG_RACE_SAT / B_LCW_RUN_OFF_LEGS_SUN / B_LCW_BACK_TO_BACK_PEAK,
 * malgré la checklist statique de promptHelpers.ts (identique à chaque
 * chunk, sans awareness de ce qui est déjà placé). Ce module ajoute un
 * rappel dynamique, chiffré, qui varie par chunk.
 */
Deno.test("detectLcwFromConfig — flag explicite raceFormat", () => {
  assertEquals(detectLcwFromConfig({ raceGoals: [{ raceFormat: "lcw_3day" }] }), true);
  assertEquals(detectLcwFromConfig({ raceGoals: [{ raceFormat: "continuous" }] }), false);
});

Deno.test("detectLcwFromConfig — fallback nom de course / objectif", () => {
  assertEquals(detectLcwFromConfig({ raceName: "Long Course Weekend Wales" }), true);
  assertEquals(detectLcwFromConfig({ objective: "70.3 LCW" }), true);
  assertEquals(detectLcwFromConfig({ raceName: "Ironman Nice" }), false);
  assertEquals(detectLcwFromConfig({}), false);
});

Deno.test("buildLcwSignatureReminder — chunk 0 (rien encore généré) : les 3 signatures manquent", () => {
  const block = buildLcwSignatureReminder({
    consumedIdCounts: new Map(),
    chunkIndex: 0,
    totalChunks: 3,
    chunkStartWeek: 1,
    chunkEndWeek: 3,
  });
  assert(block !== null);
  assertStringIncludes(block!, "B_LCW_BIKE_LONG_RACE_SAT");
  assertStringIncludes(block!, "B_LCW_RUN_OFF_LEGS_SUN");
  assertStringIncludes(block!, "B_LCW_BACK_TO_BACK_PEAK");
  assertStringIncludes(block!, "0/3");
  assertStringIncludes(block!, "0/1");
  // Pas le dernier chunk : pas de mention "DERNIER BLOC".
  assert(!block!.includes("DERNIER BLOC"));
});

Deno.test("buildLcwSignatureReminder — quotas atteints : aucun rappel", () => {
  const counts = new Map([
    ["B_LCW_BIKE_LONG_RACE_SAT", 3],
    ["B_LCW_RUN_OFF_LEGS_SUN", 3],
    ["B_LCW_BACK_TO_BACK_PEAK", 1],
  ]);
  const block = buildLcwSignatureReminder({
    consumedIdCounts: counts,
    chunkIndex: 1,
    totalChunks: 3,
    chunkStartWeek: 4,
    chunkEndWeek: 6,
  });
  assertEquals(block, null);
});

Deno.test("buildLcwSignatureReminder — quota partiellement atteint : seuls les manquants sont rappelés", () => {
  const counts = new Map([
    ["B_LCW_BIKE_LONG_RACE_SAT", 3],
    ["B_LCW_RUN_OFF_LEGS_SUN", 2],
    // B_LCW_BACK_TO_BACK_PEAK absent
  ]);
  const block = buildLcwSignatureReminder({
    consumedIdCounts: counts,
    chunkIndex: 1,
    totalChunks: 3,
    chunkStartWeek: 4,
    chunkEndWeek: 6,
  });
  assert(block !== null);
  assert(!block!.includes("B_LCW_BIKE_LONG_RACE_SAT"), "quota déjà atteint, ne doit plus être rappelé");
  assertStringIncludes(block!, "B_LCW_RUN_OFF_LEGS_SUN");
  assertStringIncludes(block!, "2/3");
  assertStringIncludes(block!, "B_LCW_BACK_TO_BACK_PEAK");
  assertStringIncludes(block!, "0/1");
});

Deno.test("buildLcwSignatureReminder — dernier chunk avec manque persistant : urgence maximale", () => {
  const block = buildLcwSignatureReminder({
    consumedIdCounts: new Map(),
    chunkIndex: 2,
    totalChunks: 3,
    chunkStartWeek: 6,
    chunkEndWeek: 7,
  });
  assert(block !== null);
  assertStringIncludes(block!, "DERNIER BLOC");
  assertStringIncludes(block!, "6-7");
});
