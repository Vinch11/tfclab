import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { detectLcwFromConfig, buildLcwSignatureReminder } from "./lcwSignatureReminder.ts";

/**
 * Bug réel signalé par le coach (plan LCW "Vince", régénération complète) :
 * un plan LCW 7 semaines est ressorti SANS AUCUNE occurrence de
 * B_LCW_BIKE_LONG_RACE_SAT / B_LCW_RUN_OFF_LEGS_SUN / B_LCW_BACK_TO_BACK_PEAK,
 * malgré la checklist statique de promptHelpers.ts (identique à chaque
 * chunk, sans awareness de ce qui est déjà placé).
 *
 * Root cause n°2 (creusé après un 2e signalement, PDF réel à l'appui) :
 * sur un plan LCW de 7 semaines, CHUNK_SIZE=5 (hérité du réglage triathlon
 * standard) plaçait TOUTES les semaines Build+Peak (S1-S5) dans un SEUL
 * chunk — aucun checkpoint intermédiaire à l'intérieur de la fenêtre
 * Build/Peak. Le rappel dynamique (chunkIndex=0) affichait alors "il reste
 * du temps" (pas urgent), et le chunk suivant ne couvrait plus que
 * l'affûtage/la course (trop tard pour ces séances). D'où : `isLastChunk`
 * ne doit PAS être "dernier chunk de la génération" mais "dernier chunk
 * contenant encore une semaine Build/Peak" — jsonPlanHandler.ts calcule ce
 * booléen via inferPhaseFromWeek et le passe en `isLastBuildOrPeakChunk`.
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

Deno.test("buildLcwSignatureReminder — chunk 0 (rien encore généré), pas dernier Build/Peak : les 3 signatures manquent, pas d'urgence", () => {
  const block = buildLcwSignatureReminder({
    consumedIdCounts: new Map(),
    chunkIndex: 0,
    totalChunks: 3,
    chunkStartWeek: 1,
    chunkEndWeek: 3,
    isLastBuildOrPeakChunk: false,
  });
  assert(block !== null);
  assertStringIncludes(block!, "B_LCW_BIKE_LONG_RACE_SAT");
  assertStringIncludes(block!, "B_LCW_RUN_OFF_LEGS_SUN");
  assertStringIncludes(block!, "B_LCW_BACK_TO_BACK_PEAK");
  assertStringIncludes(block!, "0/3");
  assertStringIncludes(block!, "0/1");
  assert(!block!.includes("DERNIER BLOC"));
});

Deno.test("buildLcwSignatureReminder — quotas atteints : aucun rappel, même si dernier Build/Peak", () => {
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
    isLastBuildOrPeakChunk: true,
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
    isLastBuildOrPeakChunk: false,
  });
  assert(block !== null);
  assert(!block!.includes("B_LCW_BIKE_LONG_RACE_SAT"), "quota déjà atteint, ne doit plus être rappelé");
  assertStringIncludes(block!, "B_LCW_RUN_OFF_LEGS_SUN");
  assertStringIncludes(block!, "2/3");
  assertStringIncludes(block!, "B_LCW_BACK_TO_BACK_PEAK");
  assertStringIncludes(block!, "0/1");
});

Deno.test("buildLcwSignatureReminder — dernier chunk Build/Peak avec manque persistant : urgence maximale, même si CE N'EST PAS le dernier chunk de la génération (chunks suivants = affûtage/course)", () => {
  // Reproduit exactement le cas réel : plan 7 semaines, chunk 1 (semaines 4-6,
  // couvrant la fin du Build + le Peak) est le DERNIER à contenir une semaine
  // Build/Peak — le chunk 2 (semaine 7) ne couvre que l'affûtage/la course.
  const block = buildLcwSignatureReminder({
    consumedIdCounts: new Map(),
    chunkIndex: 1,
    totalChunks: 3,
    chunkStartWeek: 4,
    chunkEndWeek: 6,
    isLastBuildOrPeakChunk: true,
  });
  assert(block !== null);
  assertStringIncludes(block!, "DERNIER BLOC");
  assertStringIncludes(block!, "4-6");
});
