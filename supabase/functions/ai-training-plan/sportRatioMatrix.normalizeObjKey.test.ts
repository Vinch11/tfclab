import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizeObjKey } from "./sportRatioMatrix.ts";

/**
 * Bug réel (B-5K-BEGINNER, 2026-10-13) : "5 KM" (avec espace, la façon
 * naturelle de le saisir) ne matchait aucune branche de normalizeObjKey —
 * la ligne "5k" ne couvrait que "5k" (substring) et "5km" (exact), jamais
 * "5 km"/"5 KM" — alors que "10k" juste au-dessus gère bien "10 km".
 * Conséquence : SPORT_RATIO_TARGETS côté client (planValidator.ts) et les
 * tables indexées par clé objectif côté edge retombaient sur une clé
 * absente pour tout objectif "5 KM", désactivant silencieusement le
 * contrôle de ratio par sport. Miroir du correctif client
 * (normalizeObjectiveKey.ts) — cf. normalizeObjectiveKey.test.ts côté client.
 */

Deno.test("normalizeObjKey — reconnaît toutes les variantes d'écriture de 5 km (régression B-5K-BEGINNER)", () => {
  assertEquals(normalizeObjKey("5K"), "5K");
  assertEquals(normalizeObjKey("5k"), "5K");
  assertEquals(normalizeObjKey("5km"), "5K");
  assertEquals(normalizeObjKey("5KM"), "5K");
  assertEquals(normalizeObjKey("5 km"), "5K");
  assertEquals(normalizeObjKey("5 KM"), "5K");
});

Deno.test("normalizeObjKey — reconnaît 5 km dans un objectif plus long", () => {
  assertEquals(normalizeObjKey("Premier 5 km"), "5K");
  assertEquals(normalizeObjKey("Objectif : 5 KM en 12 semaines"), "5K");
});

Deno.test("normalizeObjKey — ne confond pas 10 km et 5 km", () => {
  assertEquals(normalizeObjKey("10 km"), "10K");
  assertEquals(normalizeObjKey("10 KM"), "10K");
  assertEquals(normalizeObjKey("10km"), "10K");
});
