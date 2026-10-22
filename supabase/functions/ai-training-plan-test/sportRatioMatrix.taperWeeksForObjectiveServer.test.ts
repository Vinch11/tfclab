import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { taperWeeksForObjectiveServer } from "./sportRatioMatrix.ts";

/**
 * Bug réel confirmé (audit "Test_Vince", 703 8 semaines) : cette fonction
 * regroupe désormais l'UNIQUE source de vérité côté edge function pour la
 * durée de taper par objectif — avant ce correctif, jsonPlanHandler.ts
 * (inferPhaseFromWeek) ET promptHelpers.ts (bornes de phase envoyées au LLM)
 * maintenaient chacun leur propre copie, et elles avaient divergé (Semi et
 * Trail générique valaient 2 côté promptHelpers contre 1 ici/côté client ;
 * promptHelpers appliquait en plus un plafond `floor(totalWeeks*0.2)` sans
 * équivalent côté quotas). Ces tests verrouillent les valeurs miroir de
 * TAPER_WEEKS_BY_OBJECTIVE (sessionSizingMatrix.ts, source de vérité client).
 */

Deno.test("taperWeeksForObjectiveServer — valeurs miroir de TAPER_WEEKS_BY_OBJECTIVE (client)", () => {
  assertEquals(taperWeeksForObjectiveServer("Ironman"), 3);
  assertEquals(taperWeeksForObjectiveServer("Ironman 70.3"), 2);
  assertEquals(taperWeeksForObjectiveServer("Marathon"), 2);
  assertEquals(taperWeeksForObjectiveServer("Semi-marathon"), 1);
  assertEquals(taperWeeksForObjectiveServer("Triathlon Sprint"), 1);
  assertEquals(taperWeeksForObjectiveServer("Triathlon Olympique"), 1);
  assertEquals(taperWeeksForObjectiveServer("10K"), 1);
  assertEquals(taperWeeksForObjectiveServer("5K"), 1);
  assertEquals(taperWeeksForObjectiveServer("Start to Run"), 1);
});

Deno.test("taperWeeksForObjectiveServer — trail : ultra=3, montagne=2, court/générique=1", () => {
  assertEquals(taperWeeksForObjectiveServer("Trail Ultra"), 3);
  assertEquals(taperWeeksForObjectiveServer("UTMB"), 3);
  assertEquals(taperWeeksForObjectiveServer("Trail Montagne"), 2);
  assertEquals(taperWeeksForObjectiveServer("CCC"), 2);
  assertEquals(taperWeeksForObjectiveServer("Trail Court"), 1);
  assertEquals(taperWeeksForObjectiveServer("Trail"), 1);
});

Deno.test("taperWeeksForObjectiveServer — objectif absent ou inconnu : repli à 1 (comportement d'origine)", () => {
  assertEquals(taperWeeksForObjectiveServer(null), 1);
  assertEquals(taperWeeksForObjectiveServer(undefined), 1);
  assertEquals(taperWeeksForObjectiveServer("Objectif Inconnu XYZ"), 1);
});

Deno.test("taperWeeksForObjectiveServer — accepte aussi une clé déjà normalisée (idempotent)", () => {
  // buildStructuredDiagnosticBlock (promptHelpers.ts) passe objKey, déjà
  // normalisé via normalizeObjKey — doit donner le même résultat que le
  // libellé brut d'origine.
  assertEquals(taperWeeksForObjectiveServer("703"), 2);
  assertEquals(taperWeeksForObjectiveServer("IM"), 3);
  assertEquals(taperWeeksForObjectiveServer("Semi"), 1);
  assertEquals(taperWeeksForObjectiveServer("TriSprint"), 1);
  assertEquals(taperWeeksForObjectiveServer("TrailMountain"), 2);
});
