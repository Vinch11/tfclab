import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { inferPhaseFromWeek } from "./jsonPlanHandler.ts";

/**
 * Bug réel confirmé (audit plan "Vince" 70.3 LCW 8 semaines) : sans
 * awareness de l'objectif, le cutoff `pct > 0.92` fixe ne capturait que la
 * toute dernière semaine sur un plan court — sur un 703 (taper attendu = 2
 * semaines, cf. TAPER_WEEKS_BY_OBJECTIVE côté client), la semaine S-1 avant
 * la course retombait "peak" au lieu de "taper", alors que le moteur de
 * quotas traitait déjà cette même semaine comme taper (volume réduit). Le
 * LLM recevait deux consignes contradictoires (quota=taper vs
 * phase-guidance=peak) et produisait du contenu taper (openers/shakeouts
 * J-1) sous une étiquette de phase "peak" — exactement le symptôme détecté
 * par checkB11 (fuite_mapping) côté client sur les semaines 5/7/8.
 */

Deno.test("inferPhaseFromWeek — 703, plan 8 semaines : S7 et S8 = taper (pas seulement S8)", () => {
  assertEquals(inferPhaseFromWeek(7, 8, "703"), "taper");
  assertEquals(inferPhaseFromWeek(8, 8, "703"), "taper");
  assertEquals(inferPhaseFromWeek(6, 8, "703"), "peak");
});

Deno.test("inferPhaseFromWeek — 'Ironman 70.3' (libellé complet) normalise vers 703, même résultat", () => {
  assertEquals(inferPhaseFromWeek(7, 8, "Ironman 70.3"), "taper");
});

Deno.test("inferPhaseFromWeek — IM, plan 12 semaines : 3 dernières semaines = taper", () => {
  assertEquals(inferPhaseFromWeek(10, 12, "Ironman"), "taper");
  assertEquals(inferPhaseFromWeek(11, 12, "Ironman"), "taper");
  assertEquals(inferPhaseFromWeek(12, 12, "Ironman"), "taper");
  assertEquals(inferPhaseFromWeek(9, 12, "Ironman"), "peak");
});

Deno.test("inferPhaseFromWeek — objectif absent ou inconnu : comportement d'origine préservé (taper = 1 semaine)", () => {
  assertEquals(inferPhaseFromWeek(12, 12, null), "taper");
  assertEquals(inferPhaseFromWeek(11, 12, null), "peak");
  assertEquals(inferPhaseFromWeek(8, 8, undefined), "taper");
  assertEquals(inferPhaseFromWeek(7, 8, undefined), "peak");
});

Deno.test("inferPhaseFromWeek — base/build inchangés (pas de régression sur les seuils 30%/70%)", () => {
  assertEquals(inferPhaseFromWeek(1, 8, "703"), "base");
  assertEquals(inferPhaseFromWeek(3, 8, "703"), "build");
});
